const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

// Initialize Supabase in main process
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

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
    const { data, error } = await supabase.from('penerimaan').select('*').order('tanggal', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-penerimaan', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('penerimaan').insert([payload]).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('get-pengeluaran', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('pengeluaran')
      .select(`*, sub_kegiatan(*), kode_rekening(*), pengeluaran_rincian(*)`)
      .order('tanggal', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-pengeluaran', async (event, { pengeluaran, rincian }) => {
  return handleWith(async () => {
    const { data: pengData, error: pengError } = await supabase.from('pengeluaran').insert([pengeluaran]).select().single()
    if (pengError) throw pengError
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

ipcMain.handle('update-penerimaan', async (event, { id, ...payload }) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('penerimaan').update(payload).eq('id', id).select()
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
    // 1. Update Header
    const { error: pengError } = await supabase.from('pengeluaran').update(pengeluaran).eq('id', id)
    if (pengError) throw pengError

    // 2. Refresh Rincian (Delete and Re-insert)
    const { error: delError } = await supabase.from('pengeluaran_rincian').delete().eq('pengeluaran_id', id)
    if (delError) throw delError

    if (rincian && rincian.length > 0) {
      const rincianPayload = rincian.map((r) => ({ ...r, pengeluaran_id: id }))
      const { error: rinError } = await supabase.from('pengeluaran_rincian').insert(rincianPayload)
      if (rinError) throw rinError
    }
    return true
  })
})
