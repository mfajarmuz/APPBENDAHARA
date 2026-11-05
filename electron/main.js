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
    const devPort = process.env.VITE_PORT || '5174'
    win.loadURL(`http://localhost:${devPort}`)
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

// Helper Sinkronisasi Paket Transaksi (Transaksi Utama + Pajak Otomatis / LS Langsung Bayar)
async function syncTransactionPackage(supabaseClient, { tipe, id, action, timestamp }) {
  const isPen = tipe === 'Penerimaan'
  const primaryTable = isPen ? 'penerimaan' : 'pengeluaran'
  const oppositeTable = isPen ? 'pengeluaran' : 'penerimaan'

  const { data: targetRow } = await supabaseClient
    .from(primaryTable)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const applyOp = async (table, matchBuilder) => {
    if (action === 'soft-delete') {
      return await matchBuilder(supabaseClient.from(table).update({ deleted_at: timestamp }).is('deleted_at', null))
    } else if (action === 'restore') {
      return await matchBuilder(supabaseClient.from(table).update({ deleted_at: null }).not('deleted_at', 'is', null))
    } else if (action === 'hard-delete') {
      return await matchBuilder(supabaseClient.from(table).delete())
    }
  }

  // Eksekusi pada record utama
  if (action === 'soft-delete') {
    const { error } = await supabaseClient.from(primaryTable).update({ deleted_at: timestamp }).eq('id', id)
    if (error) throw error
  } else if (action === 'restore') {
    const { error } = await supabaseClient.from(primaryTable).update({ deleted_at: null }).eq('id', id)
    if (error) throw error
  } else if (action === 'hard-delete') {
    const { error } = await supabaseClient.from(primaryTable).delete().eq('id', id)
    if (error) throw error
  }

  if (!targetRow) return true

  const refCode = String((isPen ? targetRow.nomor_ls : targetRow.no_bukti) || '').trim()
  const isTaxRow = targetRow.jenis === 'Pajak' || targetRow.jenis === 'Pajak LS'

  try {
    if (!isTaxRow && refCode) {
      // Transaksi Induk (LS / GU / UP / TU): sinkronkan seluruh pajak & pasangan LS yang memiliki nomor referensi & tanggal yang sama
      await applyOp('penerimaan', q => {
        let query = q.eq('nomor_ls', refCode).eq('tanggal', targetRow.tanggal).neq('id', id)
        if (targetRow.kode_rekening_id) query = query.eq('kode_rekening_id', targetRow.kode_rekening_id)
        return query
      })
      await applyOp('pengeluaran', q => {
        let query = q.eq('no_bukti', refCode).eq('tanggal', targetRow.tanggal).neq('id', id)
        if (targetRow.kode_rekening_id) query = query.eq('kode_rekening_id', targetRow.kode_rekening_id)
        return query
      })
    } else if (isTaxRow) {
      // Transaksi Pajak: sinkronkan pasangan Pungut <-> Setor di tabel seberang agar saldo pajak tetap seimbang
      const oppRefCol = oppositeTable === 'penerimaan' ? 'nomor_ls' : 'no_bukti'
      await applyOp(oppositeTable, q => {
        let query = q
          .in('jenis', ['Pajak', 'Pajak LS'])
          .eq('tanggal', targetRow.tanggal)
          .eq('jumlah', targetRow.jumlah)
        if (refCode) {
          query = query.eq(oppRefCol, refCode)
        } else if (targetRow.kode_rekening_id) {
          query = query.eq('kode_rekening_id', targetRow.kode_rekening_id)
        }
        return query
      })
    }
  } catch (syncErr) {
    console.warn('Warning: gagal menyinkronkan sebagian paket transaksi:', syncErr.message)
  }

  return true
}



// Helper Sinkronisasi Otomatis sub_kegiatan.total_pagu dari akumulasi kode_rekening.pagu_anggaran
async function syncSubKegiatanTotalPagu(supabaseClient, subKegiatanId) {
  if (!subKegiatanId) return 0
  try {
    const { data: reks, error } = await supabaseClient
      .from('kode_rekening')
      .select('pagu_anggaran')
      .eq('sub_kegiatan_id', subKegiatanId)
    if (error) throw error
    const sumPagu = (reks || []).reduce((acc, r) => acc + Number(r.pagu_anggaran || 0), 0)
    await supabaseClient
      .from('sub_kegiatan')
      .update({ total_pagu: sumPagu })
      .eq('id', subKegiatanId)
    return sumPagu
  } catch (err) {
    console.warn('Warning: gagal sinkronisasi total_pagu sub_kegiatan:', err.message)
    return 0
  }
}

async function autoHealSubKegiatanTotalPagu(supabaseClient, skList) {
  if (!Array.isArray(skList)) return skList
  for (const sk of skList) {
    const sumRek = (sk.kode_rekening || []).reduce((acc, r) => acc + Number(r.pagu_anggaran || 0), 0)
    if (Number(sk.total_pagu || 0) !== sumRek) {
      sk.total_pagu = sumRek
      supabaseClient
        .from('sub_kegiatan')
        .update({ total_pagu: sumRek })
        .eq('id', sk.id)
        .then(() => {})
        .catch(() => {})
    }
  }
  return skList
}

// Program
ipcMain.handle('get-programs', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('program').select('*').order('kode', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('delete-program', async (event, id) => {
  return handleWith(async () => {
    const { data: childKeg } = await supabase.from('kegiatan').select('id').eq('program_id', id).limit(1)
    if (childKeg && childKeg.length > 0) {
      throw new Error('Tidak dapat menghapus Program yang masih memiliki Kegiatan aktif. Hapus Kegiatan di dalamnya terlebih dahulu.')
    }
    const { error } = await supabase.from('program').delete().eq('id', id)
    if (error) throw error
    return true
  })
})

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
ipcMain.handle('get-kegiatans', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('kegiatan').select('*, program:program_id (id, kode, nama)').order('kode', { ascending: true })
    if (error) throw error
    return data
  })
})

ipcMain.handle('delete-kegiatan', async (event, id) => {
  return handleWith(async () => {
    const { data: childSk } = await supabase.from('sub_kegiatan').select('id').eq('kegiatan_id', id).limit(1)
    if (childSk && childSk.length > 0) {
      throw new Error('Tidak dapat menghapus Kegiatan yang masih memiliki Sub Kegiatan aktif. Hapus Sub Kegiatan di dalamnya terlebih dahulu.')
    }
    const { error } = await supabase.from('kegiatan').delete().eq('id', id)
    if (error) throw error
    return true
  })
})

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
    try {
      const { data, error } = await supabase
        .from('sub_kegiatan')
        .select(`
          *,
          kegiatan:kegiatan_id (
            id, kode, nama,
            program:program_id (id, kode, nama)
          ),
          kode_rekening (
            *,
            komponen_belanja (*)
          )
        `)
        .order('kode', { ascending: true })
      if (!error && data) return await autoHealSubKegiatanTotalPagu(supabase, data)
    } catch (e) {
      console.warn('Fallback: komponen_belanja belum ada, mengambil kode_rekening biasa')
    }

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
    return await autoHealSubKegiatanTotalPagu(supabase, data)
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
      .select(`
        *,
        komponen_belanja (*)
      `)
      .eq('sub_kegiatan_id', subKegiatanId)
      .order('kode', { ascending: true })
    if (error) {
      // Fallback jika belum ada relasi komponen_belanja
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('kode_rekening')
        .select('*')
        .eq('sub_kegiatan_id', subKegiatanId)
        .order('kode', { ascending: true })
      if (fallbackError) throw fallbackError
      return fallbackData
    }
    return data
  })
})

ipcMain.handle('add-kode-rekening', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('kode_rekening').insert([payload]).select()
    if (error) throw error
    if (payload?.sub_kegiatan_id) await syncSubKegiatanTotalPagu(supabase, payload.sub_kegiatan_id)
    return data
  })
})

ipcMain.handle('update-kode-rekening', async (event, payload) => {
  return handleWith(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('kode_rekening').update(updateData).eq('id', id).select()
    if (error) throw error
    const skId = updateData?.sub_kegiatan_id || (Array.isArray(data) && data[0]?.sub_kegiatan_id)
    if (skId) await syncSubKegiatanTotalPagu(supabase, skId)
    return data
  })
})

ipcMain.handle('delete-kode-rekening', async (event, id) => {
  return handleWith(async () => {
    const { data: existing } = await supabase.from('kode_rekening').select('sub_kegiatan_id').eq('id', id).maybeSingle()
    const { error } = await supabase.from('kode_rekening').delete().eq('id', id)
    if (error) throw error
    if (existing?.sub_kegiatan_id) await syncSubKegiatanTotalPagu(supabase, existing.sub_kegiatan_id)
    return true
  })
})

// Komponen Belanja (Rincian per Rekening Belanja)
ipcMain.handle('get-komponen-belanja', async (event, kodeRekeningId) => {
  return handleWith(async () => {
    let query = supabase.from('komponen_belanja').select('*').order('created_at', { ascending: true })
    if (kodeRekeningId) query = query.eq('kode_rekening_id', kodeRekeningId)
    const { data, error } = await query
    if (error) throw error
    return data
  })
})

ipcMain.handle('add-komponen-belanja', async (event, payload) => {
  return handleWith(async () => {
    const { data, error } = await supabase.from('komponen_belanja').insert([payload]).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('update-komponen-belanja', async (event, payload) => {
  return handleWith(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('komponen_belanja').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
})

ipcMain.handle('delete-komponen-belanja', async (event, id) => {
  return handleWith(async () => {
    const { error } = await supabase.from('komponen_belanja').delete().eq('id', id)
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

    // 3. Ambil atau buat Sub Kegiatan (berdasarkan kode & tahun_anggaran)
    const targetTahun = Number(header?.tahunAnggaran) || 2026
    let { data: sk, error: skErr } = await supabase
      .from('sub_kegiatan')
      .select('id')
      .eq('kode', header.subKegiatanKode)
      .eq('tahun_anggaran', targetTahun)
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
          tahun_anggaran: targetTahun
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

    await syncSubKegiatanTotalPagu(supabase, subKegiatanId)
    return true
  })
})

// Penerimaan
ipcMain.handle('get-penerimaan', async () => {
  return handleWith(async () => {
    const { data, error } = await supabase
      .from('penerimaan')
      .select('*, sub_kegiatan(*), kode_rekening(*)')
      .is('deleted_at', null)
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
    return await syncTransactionPackage(supabase, {
      tipe: 'Penerimaan',
      id,
      action: 'soft-delete',
      timestamp: new Date().toISOString()
    })
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
      .is('deleted_at', null)
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
    return await syncTransactionPackage(supabase, {
      tipe: 'Pengeluaran',
      id,
      action: 'soft-delete',
      timestamp: new Date().toISOString()
    })
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

// Tempat Sampah (Soft Delete)
ipcMain.handle('get-deleted-records', async () => {
  return handleWith(async () => {
    const { data: pen, error: penErr } = await supabase
      .from('penerimaan')
      .select('*, sub_kegiatan(*), kode_rekening(*)')
      .not('deleted_at', 'is', null)
    if (penErr) throw penErr

    const { data: peng, error: pengErr } = await supabase
      .from('pengeluaran')
      .select('*, sub_kegiatan(*), kode_rekening(*)')
      .not('deleted_at', 'is', null)
    if (pengErr) throw pengErr

    const formattedPen = (pen || []).map(item => ({ ...item, tipe: 'Penerimaan' }))
    const formattedPeng = (peng || []).map(item => ({ ...item, tipe: 'Pengeluaran' }))

    return [...formattedPen, ...formattedPeng].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
  })
})

ipcMain.handle('restore-record', async (event, { tipe, id }) => {
  return handleWith(async () => {
    return await syncTransactionPackage(supabase, {
      tipe,
      id,
      action: 'restore'
    })
  })
})

ipcMain.handle('hard-delete-record', async (event, { tipe, id }) => {
  return handleWith(async () => {
    return await syncTransactionPackage(supabase, {
      tipe,
      id,
      action: 'hard-delete'
    })
  })
})

// Pengaturan Instansi & Sistem (Cloud Supabase + Local File Persistence)
const getLocalSettingsPath = () => {
  try {
    return path.join(app.getPath('userData'), 'bendahara_settings.json')
  } catch (e) {
    return path.join(__dirname, '../backups/bendahara_settings.json')
  }
}

ipcMain.handle('get-settings', async () => {
  return handleWith(async () => {
    let localData = {}
    const filePath = getLocalSettingsPath()
    if (fs.existsSync(filePath)) {
      try {
        localData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      } catch (e) {}
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'global')
        .maybeSingle()
      if (!error && data && data.data) {
        const merged = { ...localData, ...data.data }
        try { fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8') } catch (e) {}
        return merged
      }
    } catch (e) {
      // Fallback ke file lokal jika tabel settings belum ada di Supabase
    }
    return localData
  })
})

ipcMain.handle('save-settings', async (event, payload) => {
  return handleWith(async () => {
    const filePath = getLocalSettingsPath()
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, JSON.stringify(payload || {}, null, 2), 'utf-8')
    } catch (e) {
      console.warn('Warning: gagal menyimpan settings ke file lokal:', e.message)
    }

    try {
      await supabase
        .from('settings')
        .upsert([{ id: 'global', data: payload || {}, updated_at: new Date().toISOString() }])
    } catch (e) {
      // Abaikan jika tabel settings belum dimigrasikan di Supabase
    }
    return payload
  })
})


// --- BACKUP & RESTORE DATABASE LOKAL ---
const BACKUP_TABLES = [
  'program',
  'kegiatan',
  'sub_kegiatan',
  'kode_rekening',
  'komponen_belanja',
  'penerimaan',
  'pengeluaran',
  'pengeluaran_rincian',
  'periode_kunci'
]

function escapeSqlLiteral(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'"
  return "'" + String(val).replace(/'/g, "''") + "'"
}

ipcMain.handle('backup-database', async (event, options = {}) => {
  return handleWith(async () => {
    const XLSX = require('xlsx')
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const dateStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`

    const backupDir = isDev
      ? path.join(__dirname, '../backups')
      : path.join(app.getPath('documents'), 'BendaharaApp_Backups')

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const backupPayload = {
      metadata: {
        app: 'BendaharaApp',
        version: app.getVersion(),
        backup_at: now.toISOString(),
        table_counts: {}
      },
      tables: {}
    }

    let sqlDump = `-- Backup Database BendaharaApp\n-- Waktu Backup: ${now.toISOString()}\n\n`
    const workbook = XLSX.utils.book_new()

    for (const table of BACKUP_TABLES) {
      let allRows = []
      let from = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1)
        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205' || (error.message && error.message.includes('does not exist'))) {
            break
          }
          throw error
        }
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < pageSize) break
        from += pageSize
      }

      backupPayload.tables[table] = allRows
      backupPayload.metadata.table_counts[table] = allRows.length

      if (allRows.length > 0) {
        sqlDump += `-- Tabel: ${table} (${allRows.length} baris)\n`
        for (const row of allRows) {
          const cols = Object.keys(row)
          const vals = cols.map(c => escapeSqlLiteral(row[c]))
          sqlDump += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`
        }
        sqlDump += '\n'
      }

      const sheetData = allRows.length > 0 ? allRows : [{ info: 'Tidak ada data (0 baris)' }]
      const worksheet = XLSX.utils.json_to_sheet(sheetData)
      XLSX.utils.book_append_sheet(workbook, worksheet, table.slice(0, 31))
    }

    const jsonPath = path.join(backupDir, `backup_bendahara_${dateStamp}.json`)
    const latestJsonPath = path.join(backupDir, 'backup_bendahara_latest.json')
    const sqlPath = path.join(backupDir, `backup_bendahara_${dateStamp}.sql`)
    const xlsxPath = path.join(backupDir, `backup_bendahara_${dateStamp}.xlsx`)

    fs.writeFileSync(jsonPath, JSON.stringify(backupPayload, null, 2), 'utf-8')
    fs.writeFileSync(latestJsonPath, JSON.stringify(backupPayload, null, 2), 'utf-8')
    fs.writeFileSync(sqlPath, sqlDump, 'utf-8')
    XLSX.writeFile(workbook, xlsxPath)

    return {
      backupDir,
      files: { jsonPath, sqlPath, xlsxPath },
      metadata: backupPayload.metadata,
      payload: backupPayload
    }
  })
})

ipcMain.handle('restore-database', async (event, backupPayload) => {
  return handleWith(async () => {
    if (!backupPayload || !backupPayload.tables || typeof backupPayload.tables !== 'object') {
      throw new Error('Format file backup tidak valid: objek tables tidak ditemukan.')
    }

    const restoredCounts = {}
    let totalRestored = 0

    for (const table of BACKUP_TABLES) {
      const rows = backupPayload.tables[table]
      if (!Array.isArray(rows) || rows.length === 0) {
        restoredCounts[table] = 0
        continue
      }

      // Bersihkan properti relasi nested jika ada
      const cleanRows = rows.map(r => {
        const copy = { ...r }
        delete copy.program
        delete copy.kegiatan
        delete copy.sub_kegiatan
        delete copy.kode_rekening
        delete copy.komponen_belanja
        delete copy.pengeluaran_rincian
        return copy
      })

      const { error } = await supabase.from(table).upsert(cleanRows, { onConflict: 'id' })
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          restoredCounts[table] = 0
          continue
        }
        throw new Error(`Gagal memulihkan tabel ${table}: ${error.message}`)
      }
      restoredCounts[table] = cleanRows.length
      totalRestored += cleanRows.length
    }

    return {
      restoredCounts,
      totalRestored,
      restoredAt: new Date().toISOString()
    }
  })
})
