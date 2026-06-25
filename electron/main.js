const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { autoUpdater } = require('electron-updater')
const { testConnection, uploadFileToCMSFolder, startAuthFlow, disconnectDrive } = require('./drive')
const { parseRakPdf } = require('./pdfParser')

// Handle error wrapping for IPC
const handleWith = async (fn) => {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (err) {
    console.error('IPC Error:', err)
    return { success: false, error: err.message }
  }
}

// Check for .env file location
const isDev = !app.isPackaged
const envPath = isDev 
  ? path.join(__dirname, '../.env') 
  : path.join(process.resourcesPath, '.env')

require('dotenv').config({ path: envPath })

console.log('Environment loaded from:', envPath)
console.log('Supabase URL exists:', !!process.env.SUPABASE_URL)

// Initialize Supabase in main process
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase credentials missing in .env')
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Bendahara App",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function sendUpdateMessage(payload) {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('update-message', payload)
  }
}

app.whenReady().then(() => {
  createWindow()

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion()
})

// Auto-updater Handlers
autoUpdater.autoDownload = false

autoUpdater.on('checking-for-update', () => {
  sendUpdateMessage({ type: 'checking', text: 'Sedang memeriksa pembaruan...' })
})

autoUpdater.on('update-available', (info) => {
  sendUpdateMessage({ type: 'available', text: 'Pembaruan tersedia.', data: info })
})

autoUpdater.on('update-not-available', (info) => {
  sendUpdateMessage({ type: 'not-available', text: 'Aplikasi sudah versi terbaru.', data: info })
})

autoUpdater.on('download-progress', (progressObj) => {
  sendUpdateMessage({ type: 'download-progress', text: 'Sedang mengunduh...', data: progressObj })
})

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateMessage({ type: 'downloaded', text: 'Pembaruan selesai diunduh. Restart untuk memasang.', data: info })
})

autoUpdater.on('error', (error) => {
  sendUpdateMessage({ type: 'error', text: `Error update: ${error == null ? 'unknown' : error.message}` })
})

ipcMain.handle('check-for-update', async () => {
  if (!app.isPackaged) {
    return { success: false, error: 'Pembaruan aplikasi hanya tersedia pada versi desktop yang sudah dibuild.' }
  }
  try {
    const result = await autoUpdater.checkForUpdates()
    return { success: true, data: result?.updateInfo || null }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('quit-and-install', async () => {
  try {
    autoUpdater.quitAndInstall()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// --- DATABASE IPC HANDLERS ---

// Program
ipcMain.handle('add-program', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('program').insert([payload]).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('update-program', async (event, id, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('program').update(payload).eq('id', id).select()
    if (error) throw error
    return data
  })
})

// Kegiatan
ipcMain.handle('add-kegiatan', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('kegiatan').insert([payload]).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('update-kegiatan', async (event, id, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('kegiatan').update(payload).eq('id', id).select()
    if (error) throw error
    return data
  })
})

// Sub Kegiatan
ipcMain.handle('get-sub-kegiatan', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('sub_kegiatan')
      .select(`
        *,
        kegiatan:kegiatan_id (
          id, kode, nama,
          program:program_id (id, kode, nama)
        ),
        kode_rekening (*)
      `)
      .order('kode', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-sub-kegiatan', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('sub_kegiatan').insert([payload]).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('update-sub-kegiatan', async (event, payload) => {
  return handleWith(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('sub_kegiatan').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('delete-sub-kegiatan', async (event, id) => {
  return handleWith(async () => {
    const { error } = await supabase.from('sub_kegiatan').delete().eq('id', id)
    if (error) throw error
    return true
  })
})

// Kode Rekening
ipcMain.handle('get-kode-rekening', async (event, subKegiatanId) => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('kode_rekening')
      .select('*')
      .eq('sub_kegiatan_id', subKegiatanId)
      .order('kode', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-kode-rekening', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('kode_rekening').insert([payload]).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('update-kode-rekening', async (event, payload) => {
  return handleWith(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('kode_rekening').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('delete-kode-rekening', async (event, id) => {
  return handleWith(async () => {
    const { error } = await supabase.from('kode_rekening').delete().eq('id', id)
    if (error) throw error
    return true
  })
})

// RAK & PDF Parsing IPC Handlers
ipcMain.handle('parse-rak-pdf', async (event, filePath) => {
  return handleWith(async () => {
    return await parseRakPdf(filePath)
  })
})

ipcMain.handle('save-bulk-rekening', async (event, { header, rekening }) => {
  console.log('IPC [save-bulk-rekening] dipanggil dengan:', {
    header,
    totalRekening: rekening ? rekening.length : 0
  });
  if (rekening && rekening.length > 0) {
    console.log('Contoh data rekening pertama yang akan disimpan:', {
      kode: rekening[0].kode,
      uraian: rekening[0].uraian,
      pagu_anggaran: rekening[0].pagu_anggaran,
      rak_jan: rekening[0].rak_jan,
      rak_feb: rekening[0].rak_feb,
      rak_des: rekening[0].rak_des
    });
  }
  return handleWith(async () => {
    // 1. Ambil atau buat Program
    let { data: prog, error: pErr } = await supabase
      .from('program')
      .select('id')
      .eq('kode', header.programKode)
      .maybeSingle()
    if (pErr) throw pErr
    if (!prog) {
      const { data: newP, error: newPErr } = await supabase
        .from('program')
        .insert([{ kode: header.programKode, nama: header.programNama }])
        .select('id')
        .single()
      if (newPErr) throw newPErr
      prog = newP
    }

    // 2. Ambil atau buat Kegiatan
    let { data: keg, error: kErr } = await supabase
      .from('kegiatan')
      .select('id')
      .eq('kode', header.kegiatanKode)
      .maybeSingle()
    if (kErr) throw kErr
    if (!keg) {
      const { data: newK, error: newKErr } = await supabase
        .from('kegiatan')
        .insert([{ kode: header.kegiatanKode, nama: header.kegiatanNama, program_id: prog.id }])
        .select('id')
        .single()
      if (newKErr) throw newKErr
      keg = newK
    }

    // 3. Ambil atau buat Sub Kegiatan
    let { data: sk, error: skErr } = await supabase
      .from('sub_kegiatan')
      .select('id')
      .eq('kode', header.subKegiatanKode)
      .maybeSingle()
    if (skErr) throw skErr
    if (!sk) {
      const { data: newSk, error: newSkErr } = await supabase
        .from('sub_kegiatan')
        .insert([{
          kode: header.subKegiatanKode,
          nama: header.subKegiatanNama,
          kegiatan_id: keg.id,
          sumber_dana: 'PAD',
          tahun_anggaran: 2026
        }])
        .select('id')
        .single()
      if (newSkErr) throw newSkErr
      sk = newSk
    }

    const subKegiatanId = sk.id

    // 4. Upsert Kode Rekening secara sekuensial aman
    for (const r of rekening) {
      const { data: existingRek, error: rFetchErr } = await supabase
        .from('kode_rekening')
        .select('id')
        .eq('sub_kegiatan_id', subKegiatanId)
        .eq('kode', r.kode)
        .maybeSingle()
      
      if (rFetchErr) throw rFetchErr

      const payload = {
        sub_kegiatan_id: subKegiatanId,
        kode: r.kode,
        uraian: r.uraian,
        pagu_anggaran: r.pagu_anggaran,
        rak_jan: r.rak_jan,
        rak_feb: r.rak_feb,
        rak_mar: r.rak_mar,
        rak_apr: r.rak_apr,
        rak_mei: r.rak_mei,
        rak_jun: r.rak_jun,
        rak_jul: r.rak_jul,
        rak_agu: r.rak_agu,
        rak_sep: r.rak_sep,
        rak_okt: r.rak_okt,
        rak_nov: r.rak_nov,
        rak_des: r.rak_des
      }

      if (existingRek) {
        const { error: updErr } = await supabase
          .from('kode_rekening')
          .update(payload)
          .eq('id', existingRek.id)
        if (updErr) throw updErr
      } else {
        const { error: insErr } = await supabase
          .from('kode_rekening')
          .insert([payload])
        if (insErr) throw insErr
      }
    }

    return true
  })
})

// Penerimaan
ipcMain.handle('get-penerimaan', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('penerimaan')
      .select('*, sub_kegiatan(*), kode_rekening(*)')
      .order('urutan', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-penerimaan', async (event, payload) => {
  return handleWith(async () => {
    // Jika payload bukan array, bungkus dalam array untuk mendukung bulk insert
    const insertData = Array.isArray(payload) ? payload : [payload]
    const { data, error } = await supabase.from('penerimaan').insert(insertData).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('update-penerimaan', async (event, payload) => {
  return handleWith(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('penerimaan').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('delete-penerimaan', async (event, id) => {
  return handleWith(async () => {
    const { error } = await supabase.from('penerimaan').delete().eq('id', id)
    if (error) throw error
    return true
  })
})

// Pengeluaran
ipcMain.handle('get-pengeluaran', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('pengeluaran')
      .select(`
        *,
        sub_kegiatan (*, kegiatan(*, program(*))),
        kode_rekening (*),
        pengeluaran_rincian (*)
      `)
      .order('urutan', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-pengeluaran', async (event, { pengeluaran, rincian, pdfLocalPath, customFileName }) => {
  return handleWith(async () => {
    let finalPengeluaran = { ...pengeluaran }

    // Jika ada berkas PDF lokal dipilih, unggah dulu ke Google Drive
    if (pdfLocalPath) {
      try {
        const uploadRes = await uploadFileToCMSFolder(pdfLocalPath, customFileName)
        if (uploadRes && uploadRes.success) {
          finalPengeluaran.file_pdf_id = uploadRes.fileId
          finalPengeluaran.file_pdf_name = uploadRes.fileName
          finalPengeluaran.file_pdf_link = uploadRes.viewLink
        }
      } catch (upErr) {
        throw new Error(`Gagal mengunggah berkas ke Google Drive: ${upErr.message}`)
      }
    }

    // 1. Insert Pengeluaran Header
    const { data: parent, error: pError } = await supabase
      .from('pengeluaran')
      .insert([finalPengeluaran])
      .select()
      .single()
    
    if (pError) throw pError

    // 2. Insert Rincian if exists
    if (rincian && rincian.length > 0) {
      const rincianPayload = rincian.map(r => ({ ...r, pengeluaran_id: parent.id }))
      const { error: rError } = await supabase.from('pengeluaran_rincian').insert(rincianPayload)
      if (rError) throw rError
    }

    return parent
  })
})

ipcMain.handle('update-pengeluaran', async (event, id, { pengeluaran, rincian, pdfLocalPath, customFileName }) => {
  return handleWith(async () => {
    let finalPengeluaran = { ...pengeluaran }

    // Jika ada berkas PDF lokal baru diunggah
    if (pdfLocalPath) {
      try {
        const uploadRes = await uploadFileToCMSFolder(pdfLocalPath, customFileName)
        if (uploadRes && uploadRes.success) {
          finalPengeluaran.file_pdf_id = uploadRes.fileId
          finalPengeluaran.file_pdf_name = uploadRes.fileName
          finalPengeluaran.file_pdf_link = uploadRes.viewLink
        }
      } catch (upErr) {
        throw new Error(`Gagal mengunggah berkas ke Google Drive: ${upErr.message}`)
      }
    }

    // Update Header
    const { error: pError } = await supabase.from('pengeluaran').update(finalPengeluaran).eq('id', id)
    if (pError) throw pError

    // Delete existing rincian and re-insert
    const { error: delError } = await supabase.from('pengeluaran_rincian').delete().eq('pengeluaran_id', id)
    if (delError) {
      console.error('Delete Rincian Error:', delError)
      throw delError
    }
    
    if (rincian && rincian.length > 0) {
      const rincianPayload = rincian.map((r) => ({ 
        uraian: r.uraian, 
        volume: r.volume || null,
        jumlah: r.jumlah, 
        pengeluaran_id: id 
      }))
      const { error: rinError } = await supabase.from('pengeluaran_rincian').insert(rincianPayload)
      if (rinError) {
        console.error('Insert Rincian Error:', rinError)
        throw rinError
      }
    }
    return true
  })
})

ipcMain.handle('delete-pengeluaran', async (event, id) => {
  return handleWith(async () => {
    const { error } = await supabase.from('pengeluaran').delete().eq('id', id)
    if (error) throw error
    return true
  })
})

// Bulk Update Urutan BKU
ipcMain.handle('update-bku-urutan', async (event, items) => {
  return handleWith(async () => {
    // items: [{ id, urutan, type: 'in' | 'out' }]
    const updates = items.map(item => {
      const table = item.type === 'in' ? 'penerimaan' : 'pengeluaran'
      return supabase.from(table).update({ urutan: item.urutan }).eq('id', item.id)
    })
    const results = await Promise.all(updates)
    const error = results.find(res => res.error)
    if (error) throw error.error
    return true
  })
})

// Get Periode Kunci
ipcMain.handle('get-periode-kunci', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('periode_kunci')
      .select('*')
      .order('tahun', { ascending: false })
      .order('bulan', { ascending: false })
    if (error) throw error
    return data
  })
})

// Kunci Periode
ipcMain.handle('kunci-periode', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('periode_kunci')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return data
  })
})

// Buka Kunci Periode
ipcMain.handle('buka-kunci-periode', async (event, id) => {
  return handleWith(async () => {
    const { error } = await supabase
      .from('periode_kunci')
      .delete()
      .eq('id', id)
    if (error) throw error
    return true
  })
})

ipcMain.handle('download-template', async (event, filename, defaultFilename) => {
  return handleWith(async () => {
    const sourcePath = app.isPackaged
      ? path.join(__dirname, '../dist', filename)
      : path.join(__dirname, '../public', filename)

    const { filePath } = await dialog.showSaveDialog({
      title: 'Simpan Template',
      defaultPath: defaultFilename || filename,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    })

    if (filePath) {
      fs.copyFileSync(sourcePath, filePath)
      return { success: true }
    }
    return { success: false }
  })
})

// Google Drive IPC
ipcMain.handle('test-google-drive', async () => {
  return await testConnection()
})

ipcMain.handle('login-google-drive', async () => {
  return await startAuthFlow()
})

ipcMain.handle('logout-google-drive', async () => {
  return await disconnectDrive()
})

ipcMain.handle('select-pdf-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Pilih Berkas PDF Bukti Bayar/Transfer',
    properties: ['openFile'],
    filters: [{ name: 'Berkas PDF', extensions: ['pdf'] }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  const filePath = result.filePaths[0]
  return {
    path: filePath,
    name: path.basename(filePath)
  }
})

ipcMain.handle('print-to-pdf', async (event, { html, defaultPath, pageSize }) => {
  const os = require('os')
  const path = require('path')
  const fs = require('fs')
  const url = require('url')

  const tempPath = path.join(os.tmpdir(), `print_${Date.now()}.html`)
  fs.writeFileSync(tempPath, html, 'utf-8')

  const win = new BrowserWindow({ 
    show: false, 
    width: 1200, 
    height: 1600,
    webPreferences: { nodeIntegration: true, contextIsolation: false } 
  })
  
  try {
    await win.loadURL(url.pathToFileURL(tempPath).href)
    
    // Tunggu lebih lama untuk memastikan gambar/layout termuat sempurna
    await new Promise(resolve => setTimeout(resolve, 3000))

    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: pageSize || 'A4',
      margins: { marginType: 'none' }
    })
    
    const { filePath } = await dialog.showSaveDialog({
      title: 'Simpan PDF',
      defaultPath: defaultPath || 'Laporan.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    
    if (filePath) {
      fs.writeFileSync(filePath, pdfData)
      return { success: true, filePath }
    }
  } catch (error) {
    console.error('Error in print-to-pdf:', error)
    return { success: false, error: error.message }
  } finally {
    try { fs.unlinkSync(tempPath) } catch (e) {}
    if (!win.isDestroyed()) win.close()
  }

  return { success: false, canceled: true }
})
