const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { autoUpdater } = require('electron-updater')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

// Auto-updater configuration
autoUpdater.autoDownload = false // We want user to click "Update"
autoUpdater.allowPrerelease = false

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Send update messages to renderer
  const sendStatusToWindow = (text, data = null) => {
    win.webContents.send('update-message', { text, data })
  }

  autoUpdater.on('checking-for-update', () => sendStatusToWindow('Mengecek pembaruan...'))
  autoUpdater.on('update-available', (info) => sendStatusToWindow('Pembaruan tersedia.', info))
  autoUpdater.on('update-not-available', (info) => sendStatusToWindow('Aplikasi sudah versi terbaru.'))
  autoUpdater.on('error', (err) => sendStatusToWindow(`Error: ${err}`))
  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('Sedang mengunduh...', progressObj)
  })
  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Pembaruan selesai diunduh. Restart untuk memasang.', info)
  })

  // IPC to trigger update actions
  ipcMain.handle('check-for-update', () => autoUpdater.checkForUpdates())
  ipcMain.handle('download-update', () => autoUpdater.downloadUpdate())
  ipcMain.handle('quit-and-install', () => autoUpdater.quitAndInstall())

  // Use app.isPackaged to check if running in dev or prod
  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Helper to standardize handler responses
async function handleWith(fn) {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (err) {
    console.error('ipc handler error', err)
    return { success: false, error: (err && err.message) || String(err) }
  }
}

// IPC handlers
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

ipcMain.handle('get-kode-rekening', async (event, subKegiatanId) => {
  return handleWith(async () => {
    let query = supabase.from('kode_rekening').select('*').order('kode', { ascending: true })
    if (subKegiatanId) query = query.eq('sub_kegiatan_id', subKegiatanId)
    const { data, error } = await query
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

ipcMain.handle('get-penerimaan', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('penerimaan')
      .select(`
        *,
        sub_kegiatan (*),
        kode_rekening (*)
      `)
      .order('tanggal', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-penerimaan', async (event, payload) => {
  return handleWith(async () => {
    // Deep clone and clean the payload to strip IPC proxies/weirdness
    const cleanPayload = JSON.parse(JSON.stringify(payload))
    let dataToInsert = []
    
    if (Array.isArray(cleanPayload)) {
      dataToInsert = cleanPayload
    } else if (cleanPayload && typeof cleanPayload === 'object' && Object.keys(cleanPayload).every(k => !isNaN(k))) {
      // Handle array-like objects from IPC
      dataToInsert = Object.values(cleanPayload)
    } else {
      dataToInsert = [cleanPayload]
    }
    
    const { data, error } = await supabase.from('penerimaan').insert(dataToInsert).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('get-pengeluaran', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('pengeluaran')
      .select(`
        *, 
        sub_kegiatan (
          *, 
          kegiatan (
            *,
            program (*)
          )
        ), 
        kode_rekening (*), 
        pengeluaran_rincian (*)
      `)
      .order('tanggal', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-pengeluaran', async (event, { pengeluaran, rincian }) => {
  return handleWith(async () => {
    // 1. Server-side Budget Validation (Pagu)
    const { data: rek, error: rekError } = await supabase
      .from('kode_rekening')
      .select('pagu_anggaran, uraian')
      .eq('id', pengeluaran.kode_rekening_id)
      .single()
    if (rekError) throw rekError
    
    const { data: currentSpent, error: spentError } = await supabase
      .from('pengeluaran')
      .select('jumlah')
      .eq('kode_rekening_id', pengeluaran.kode_rekening_id)
    if (spentError) throw spentError
    
    const totalSpent = (currentSpent || []).reduce((s, p) => s + p.jumlah, 0)
    const sisa = rek.pagu_anggaran - totalSpent
    
    if (pengeluaran.jumlah > sisa) {
      throw new Error(`Anggaran untuk "${rek.uraian}" tidak mencukupi. Sisa Pagu: ${sisa}, Diminta: ${pengeluaran.jumlah}`)
    }

    // 1.5 Validation (Consistency)
    if (rincian && rincian.length > 0) {
      const totalRincian = rincian.reduce((s, r) => s + (r.jumlah || 0), 0)
      if (totalRincian !== pengeluaran.jumlah) {
        throw new Error(`Ketidakkonsistenan data: Total rincian (${totalRincian}) tidak sama dengan total pengeluaran (${pengeluaran.jumlah})`)
      }
    }

    // 2. Insert Header
    const { data: pengData, error: pengError } = await supabase.from('pengeluaran').insert([pengeluaran]).select().single()
    if (pengError) throw pengError
    
    // 3. Insert Rincian
    if (rincian && rincian.length > 0) {
      const rincianPayload = rincian.map((r) => ({ ...r, pengeluaran_id: pengData.id }))
      const { error: rinError } = await supabase.from('pengeluaran_rincian').insert(rincianPayload)
      if (rinError) throw rinError
    }
    return pengData
  })
})

ipcMain.handle('update-sub-kegiatan', async (event, { id, ...payload }) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('sub_kegiatan').update(payload).eq('id', id).select()
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

ipcMain.handle('update-kegiatan', async (event, id, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('kegiatan').update(payload).eq('id', id).select()
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

ipcMain.handle('update-kode-rekening', async (event, { id, ...payload }) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('kode_rekening').update(payload).eq('id', id).select()
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

ipcMain.handle('delete-pengeluaran', async (event, id) => {
  return handleWith(async () => {
    const { error } = await supabase.from('pengeluaran').delete().eq('id', id)
    if (error) throw error
    return true
  })
})

ipcMain.handle('update-pengeluaran', async (event, id, { pengeluaran, rincian }) => {
  return handleWith(async () => {
    // 1. Validation (Pagu) if jumlah is changing
    if (pengeluaran.jumlah !== undefined) {
      const { data: currentPeng, error: getError } = await supabase.from('pengeluaran').select('kode_rekening_id').eq('id', id).single()
      if (getError) throw getError
      
      const rekId = pengeluaran.kode_rekening_id || currentPeng.kode_rekening_id
      
      const { data: rek, error: rekError } = await supabase.from('kode_rekening').select('pagu_anggaran, uraian').eq('id', rekId).single()
      if (rekError) throw rekError

      const { data: otherSpent, error: spentError } = await supabase.from('pengeluaran').select('jumlah').eq('kode_rekening_id', rekId).neq('id', id)
      if (spentError) throw spentError
      
      const totalOtherSpent = (otherSpent || []).reduce((s, p) => s + p.jumlah, 0)
      const sisa = rek.pagu_anggaran - totalOtherSpent
      
      if (pengeluaran.jumlah > sisa) {
        throw new Error(`Anggaran untuk "${rek.uraian}" tidak mencukupi. Sisa Pagu: ${sisa}, Diminta: ${pengeluaran.jumlah}`)
      }
    }

    // 2. Update Header
    const { error: pengError } = await supabase
      .from('pengeluaran')
      .update(pengeluaran)
      .eq('id', id)

    if (pengError) {
      console.error('Update Header Error:', pengError)
      throw pengError
    }

    // 2. Refresh Rincian (Delete and Re-insert)
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
