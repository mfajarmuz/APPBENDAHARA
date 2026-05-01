const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

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

  if (process.env.NODE_ENV === 'development') {
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

// IPC handlers (wrap Supabase calls with try/catch and consistent return shape)
ipcMain.handle('get-sub-kegiatan', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('sub_kegiatan').select('*').order('kode', { ascending: true })
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
    const { data, error } = await supabase.from('penerimaan').select('*').order('tanggal', { ascending: false })
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
      .select(`*, sub_kegiatan(kode, nama), kode_rekening(kode, uraian), pengeluaran_rincian(*)`)
      .order('tanggal', { ascending: false })
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
