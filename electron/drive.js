const { google } = require('googleapis')
const path = require('path')
const fs = require('fs')
const { app, shell } = require('electron')
const http = require('http')
const url = require('url')

let driveInstance = null
let oauth2Client = null

// Lokasi penyimpanan token akses setelah login (aman di folder UserData OS)
const TOKEN_PATH = path.join(app.getPath('userData'), 'gdrive_oauth_token.json')

/**
 * Membaca kredensial klien OAuth dari oauth-credentials.json di root folder
 */
function getOAuthCredentialsPath() {
  const isDev = !app.isPackaged
  return isDev
    ? path.join(__dirname, '../oauth-credentials.json')
    : path.join(process.resourcesPath, 'oauth-credentials.json')
}

/**
 * Menginisialisasi OAuth2 Client
 */
function initOAuth2Client() {
  if (oauth2Client) return oauth2Client

  const credentialsPath = getOAuthCredentialsPath()

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Berkas 'oauth-credentials.json' tidak ditemukan. Silakan unduh dari Google Cloud Console dan letakkan di direktori aplikasi.`)
  }

  try {
    const content = fs.readFileSync(credentialsPath, 'utf8')
    const credentials = JSON.parse(content)
    const webOrInstalled = credentials.installed || credentials.web
    
    if (!webOrInstalled) {
      throw new Error("Format berkas oauth-credentials.json tidak valid. Pastikan itu bertipe 'Desktop Application' atau 'Web Application'.")
    }

    const { client_secret, client_id, redirect_uris } = webOrInstalled
    
    // Desktop app mendukung http://localhost
    const redirectUri = 'http://localhost:5024' 

    oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri)
    return oauth2Client
  } catch (error) {
    console.error('Gagal memuat OAuth2 Client:', error.message)
    throw error
  }
}

/**
 * Menginisialisasi Drive Instance dengan memuat token tersimpan
 */
async function initDrive() {
  const client = initOAuth2Client()

  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
      client.setCredentials(token)
      driveInstance = google.drive({ version: 'v3', auth: client })
      return driveInstance
    } catch (e) {
      console.error('Token kedaluwarsa atau rusak:', e.message)
    }
  }
  
  throw new Error('Google Drive belum terhubung. Silakan login melalui menu Pengaturan.')
}

/**
 * Memulai proses autentikasi OAuth2 dengan membuka tab browser pribadi pengguna
 */
async function startAuthFlow() {
  const client = initOAuth2Client()
  
  const authUrl = client.generateAuthUrl({
    access_type: 'offline', // Penting untuk mendapatkan Refresh Token
    prompt: 'consent',      // Selalu tanyakan perizinan agar refresh token terbit
    scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly']
  })

  console.log('Membuka browser untuk login Google Drive...')
  shell.openExternal(authUrl)

  // Membuka server HTTP mini sementara di port 5024 untuk menerima kode callback redirect
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/?code=') > -1 || req.url.indexOf('&code=') > -1) {
          const parsedUrl = new url.URL(req.url, 'http://localhost:5024')
          const code = parsedUrl.searchParams.get('code')

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <div style="font-family: sans-serif; text-align: center; padding-top: 100px;">
              <h1 style="color: #10b981;">✔️ Koneksi Berhasil!</h1>
              <p>Aplikasi Bendahara telah sukses terhubung ke Google Drive Anda.</p>
              <p style="color: #6b7280;">Anda bisa menutup tab browser ini sekarang dan kembali ke aplikasi.</p>
            </div>
          `)
          
          // Tutup server mini
          server.close()

          // Tukar kode otorisasi dengan token permanen
          const { tokens } = await client.getToken(code)
          
          // Simpan token secara permanen di UserData lokal
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens))
          client.setCredentials(tokens)
          driveInstance = google.drive({ version: 'v3', auth: client })

          resolve({ success: true, message: 'Login Berhasil!' })
        } else {
          res.writeHead(400)
          res.end('Terjadi kesalahan atau kode tidak valid.')
        }
      } catch (err) {
        server.close()
        reject(err)
      }
    }).listen(5024, (err) => {
      if (err) {
        reject(new Error('Gagal membuka server lokal di port 5024. Pastikan port tersebut kosong.'))
      }
    })

    // Timeout perlindungan jika user tidak login dalam waktu 5 menit
    setTimeout(() => {
      try { server.close() } catch(e){}
    }, 300000)
  })
}

/**
 * Menghapus koneksi / Logout
 */
async function disconnectDrive() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH)
  }
  driveInstance = null
  if (oauth2Client) {
    oauth2Client.setCredentials(null)
  }
  return { success: true, message: 'Koneksi Google Drive berhasil diputus.' }
}

/**
 * Tes Koneksi
 */
async function testConnection() {
  try {
    const drive = driveInstance || await initDrive()
    const list = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    })
    
    return {
      success: true,
      authorized: true,
      message: 'Koneksi Sukses Terhubung!',
      filesCount: list.data.files ? list.data.files.length : 0
    }
  } catch (error) {
    return {
      success: false,
      authorized: false,
      error: error.message
    }
  }
}

/**
 * Mendapatkan ID Folder berdasarkan nama, atau membuatnya jika belum ada.
 * Karena ini Akun Pribadi (OAuth), kita bisa membuat root folder Keuangan secara bebas!
 */
async function getOrCreateFolder(folderName, parentId = null) {
  const drive = driveInstance || await initDrive()
  
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
  if (parentId) {
    query += ` and '${parentId}' in parents`
  } else {
    query += ` and 'root' in parents`
  }

  const list = await drive.files.list({
    q: query,
    spaces: 'drive',
    fields: 'files(id, name)',
  })

  if (list.data.files && list.data.files.length > 0) {
    return list.data.files[0].id
  }

  // Buat folder baru (100% aman karena ini kuota pribadi 15GB milik user)
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) {
    fileMetadata.parents = [parentId]
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  })

  return folder.data.id
}

/**
 * Mengunggah berkas PDF lokal ke Google Drive di struktur folder: Keuangan > Bukti Bayar-Transfer
 */
async function uploadFileToCMSFolder(localFilePath, customFileName = null) {
  try {
    const drive = driveInstance || await initDrive()

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Berkas lokal tidak ditemukan: ${localFilePath}`)
    }

    // 1. Dapatkan atau buat folder "Keuangan" di root Drive
    const keuanganFolderId = await getOrCreateFolder('Keuangan')

    // 2. Dapatkan atau buat folder "Bukti Bayar-Transfer" di dalam "Keuangan"
    const cmsFolderId = await getOrCreateFolder('Bukti Bayar-Transfer', keuanganFolderId)

    // 3. Persiapkan metadata dan unggah file
    const ext = path.extname(localFilePath) || '.pdf'
    const finalName = customFileName 
      ? (customFileName.toLowerCase().endsWith('.pdf') ? customFileName : `${customFileName}${ext}`)
      : path.basename(localFilePath)

    const response = await drive.files.create({
      requestBody: {
        name: finalName,
        parents: [cmsFolderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: fs.createReadStream(localFilePath),
      },
      fields: 'id, name, webViewLink',
    })

    // 4. Atur perizinan file agar bisa dibaca oleh siapa saja yang memiliki link
    try {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      })
    } catch (permErr) {
      console.warn('Peringatan: Gagal mengatur hak akses file publik:', permErr.message)
    }

    return {
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      viewLink: response.data.webViewLink,
    }
  } catch (error) {
    console.error('Google Drive Upload Error:', error.message)
    throw error
  }
}

module.exports = {
  initDrive,
  startAuthFlow,
  disconnectDrive,
  testConnection,
  uploadFileToCMSFolder
}
