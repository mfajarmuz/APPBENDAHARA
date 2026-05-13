const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const { autoUpdater } = require('electron-updater')
const { testConnection, uploadFileToCMSFolder } = require('./drive')

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

app.whenReady().then(() => {
  createWindow()
  
  autoUpdater.checkForUpdatesAndNotify()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Auto-updater Handlers
ipcMain.handle('check-for-update', () => autoUpdater.checkForUpdates())
ipcMain.handle('download-update', () => autoUpdater.downloadUpdate())
ipcMain.handle('quit-and-install', () => autoUpdater.quitAndInstall())

autoUpdater.on('message', (text) => {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('update-message', text)
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

// Penerimaan
ipcMain.handle('get-penerimaan', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('penerimaan')
      .select('*, sub_kegiatan(*), kode_rekening(*)')
      .order('tanggal', { ascending: true })
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
      .order('tanggal', { ascending: true })
      .order('urutan', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-pengeluaran', async (event, { pengeluaran, rincian, pdfLocalPath }) => {
  return handleWith(async () => {
    let finalPengeluaran = { ...pengeluaran }

    // Jika ada berkas PDF lokal dipilih, unggah dulu ke Google Drive
    if (pdfLocalPath) {
      try {
        const uploadRes = await uploadFileToCMSFolder(pdfLocalPath)
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

ipcMain.handle('update-pengeluaran', async (event, id, { pengeluaran, rincian, pdfLocalPath }) => {
  return handleWith(async () => {
    let finalPengeluaran = { ...pengeluaran }

    // Jika ada berkas PDF lokal baru diunggah
    if (pdfLocalPath) {
      try {
        const uploadRes = await uploadFileToCMSFolder(pdfLocalPath)
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
    await supabase.from('pengeluaran_rincian').delete().eq('pengeluaran_id', id)
    
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

ipcMain.handle('download-template', async (event, filename) => {
  return handleWith(async () => {
    const sourcePath = app.isPackaged
      ? path.join(__dirname, '../dist', filename)
      : path.join(__dirname, '../public', filename)

    const { filePath } = await dialog.showSaveDialog({
      title: 'Simpan Template',
      defaultPath: filename,
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

