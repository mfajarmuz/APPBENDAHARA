const { google } = require('googleapis')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let driveInstance = null

/**
 * Menginisialisasi modul Google Drive menggunakan Service Account.
 */
function initDrive() {
  try {
    const isDev = !app.isPackaged
    // Mencari berkas service-account.json di root folder
    const credentialsPath = isDev
      ? path.join(__dirname, '../service-account.json')
      : path.join(process.resourcesPath, 'service-account.json')

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Berkas kredensial 'service-account.json' tidak ditemukan. Pastikan berkas diletakkan di direktori aplikasi. Path dicari: ${credentialsPath}`)
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    })

    driveInstance = google.drive({ version: 'v3', auth })
    return driveInstance
  } catch (error) {
    console.error('Google Drive Init Error:', error.message)
    throw error
  }
}

/**
 * Melakukan tes koneksi ke Google Drive untuk memvalidasi otorisasi.
 */
async function testConnection() {
  try {
    const drive = driveInstance || initDrive()
    
    // Lakukan query daftar file sederhana untuk memastikan token aktif
    const response = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    })
    
    return {
      success: true,
      authorized: true,
      message: 'Koneksi Google Drive API Berhasil Terhubung!',
      filesCount: response.data.files ? response.data.files.length : 0
    }
  } catch (error) {
    console.error('Google Drive Connection Test Failed:', error.message)
    return {
      success: false,
      authorized: false,
      error: error.message
    }
  }
}

/**
 * Mendapatkan ID Folder berdasarkan nama, atau membuatnya jika belum ada.
 */
async function getOrCreateFolder(folderName, parentId = null) {
  const drive = driveInstance || initDrive()
  
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
    // Folder sudah ada, gunakan yang pertama ditemukan
    return list.data.files[0].id
  }

  // Folder tidak ditemukan, buat folder baru
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
 * Mengunggah berkas PDF lokal ke Google Drive di struktur folder: Keuangan > CMS
 */
async function uploadFileToCMSFolder(localFilePath) {
  try {
    const drive = driveInstance || initDrive()

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Berkas lokal tidak ditemukan: ${localFilePath}`)
    }

    // 1. Dapatkan atau buat folder "Keuangan" di root Drive
    const keuanganFolderId = await getOrCreateFolder('Keuangan')

    // 2. Dapatkan atau buat folder "Bukti Bayar-Transfer" di dalam "Keuangan"
    const cmsFolderId = await getOrCreateFolder('Bukti Bayar-Transfer', keuanganFolderId)

    // 3. Persiapkan metadata dan unggah file
    const fileName = path.basename(localFilePath)
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [cmsFolderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: fs.createReadStream(localFilePath),
      },
      fields: 'id, name, webViewLink',
    })

    // 4. Atur perizinan file agar bisa dibaca oleh siapa saja yang memiliki link (opsional namun membantu untuk preview)
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
  testConnection,
  uploadFileToCMSFolder
}
