/**
 * api.js - Abstraksi layer akses data
 * 
 * Di Electron: pakai window.api (IPC ke main process)
 * Di Browser: langsung ke Supabase
 */
import { supabase } from './supabase'

const isElectron = typeof window !== 'undefined' && !!window.api

const wrap = async (fn) => {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (err) {
    console.error('[api]', err)
    return { success: false, error: err.message }
  }
}


// Helper Sinkronisasi Paket Transaksi di Mode Web Browser
const syncTransactionPackageWeb = async ({ tipe, id, action, timestamp }) => {
  const isPen = tipe === 'Penerimaan'
  const primaryTable = isPen ? 'penerimaan' : 'pengeluaran'
  const oppositeTable = isPen ? 'pengeluaran' : 'penerimaan'

  const { data: targetRow } = await supabase
    .from(primaryTable)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const applyOp = async (table, matchBuilder) => {
    if (action === 'soft-delete') {
      return await matchBuilder(supabase.from(table).update({ deleted_at: timestamp }).is('deleted_at', null))
    } else if (action === 'restore') {
      return await matchBuilder(supabase.from(table).update({ deleted_at: null }).not('deleted_at', 'is', null))
    } else if (action === 'hard-delete') {
      return await matchBuilder(supabase.from(table).delete())
    }
  }

  if (action === 'soft-delete') {
    const { error } = await supabase.from(primaryTable).update({ deleted_at: timestamp }).eq('id', id)
    if (error) throw error
  } else if (action === 'restore') {
    const { error } = await supabase.from(primaryTable).update({ deleted_at: null }).eq('id', id)
    if (error) throw error
  } else if (action === 'hard-delete') {
    const { error } = await supabase.from(primaryTable).delete().eq('id', id)
    if (error) throw error
  }

  if (!targetRow) return true

  const refCode = String((isPen ? targetRow.nomor_ls : targetRow.no_bukti) || '').trim()
  const isTaxRow = targetRow.jenis === 'Pajak' || targetRow.jenis === 'Pajak LS'

  try {
    if (!isTaxRow && refCode) {
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
  } catch (e) {
    console.warn('[api] syncTransactionPackageWeb warning:', e.message)
  }

  return true
}


// Helper Sinkronisasi Otomatis sub_kegiatan.total_pagu di Mode Web
const syncSubKegiatanTotalPaguWeb = async (subKegiatanId) => {
  if (!subKegiatanId) return 0
  try {
    const { data: reks, error } = await supabase
      .from('kode_rekening')
      .select('pagu_anggaran')
      .eq('sub_kegiatan_id', subKegiatanId)
    if (error) throw error
    const sumPagu = (reks || []).reduce((acc, r) => acc + Number(r.pagu_anggaran || 0), 0)
    await supabase.from('sub_kegiatan').update({ total_pagu: sumPagu }).eq('id', subKegiatanId)
    return sumPagu
  } catch (err) {
    console.warn('[api] syncSubKegiatanTotalPaguWeb warning:', err.message)
    return 0
  }
}

const autoHealSubKegiatanTotalPaguWeb = async (skList) => {
  if (!Array.isArray(skList)) return skList
  for (const sk of skList) {
    const sumRek = (sk.kode_rekening || []).reduce((acc, r) => acc + Number(r.pagu_anggaran || 0), 0)
    if (Number(sk.total_pagu || 0) !== sumRek) {
      sk.total_pagu = sumRek
      supabase.from('sub_kegiatan').update({ total_pagu: sumRek }).eq('id', sk.id).then(() => {}).catch(() => {})
    }
  }
  return skList
}

// ─── Sub Kegiatan ─────────────────────────────────────────────────────────────

export const getSubKegiatan = () => {
  if (isElectron) return window.api.getSubKegiatan()
  return wrap(async () => {
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
      if (!error && data) return await autoHealSubKegiatanTotalPaguWeb(data)
    } catch (e) {
      console.warn('Fallback getSubKegiatan: komponen_belanja belum ada')
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
    return await autoHealSubKegiatanTotalPaguWeb(data)
  })
}

export const getPrograms = () => {
  if (isElectron) return window.api?.getPrograms ? window.api.getPrograms() : Promise.resolve({ success: true, data: [] })
  return wrap(async () => {
    const { data, error } = await supabase.from('program').select('*').order('kode', { ascending: true })
    if (error) throw error
    return data
  })
}

export const deleteProgram = (id) => {
  if (isElectron && window.api?.deleteProgram) return window.api.deleteProgram(id)
  return wrap(async () => {
    const { data: childKeg } = await supabase.from('kegiatan').select('id').eq('program_id', id).limit(1)
    if (childKeg && childKeg.length > 0) {
      throw new Error('Tidak dapat menghapus Program yang masih memiliki Kegiatan aktif. Hapus Kegiatan di dalamnya terlebih dahulu.')
    }
    const { error } = await supabase.from('program').delete().eq('id', id)
    if (error) throw error
    return true
  })
}

export const getKegiatans = () => {
  if (isElectron) return window.api?.getKegiatans ? window.api.getKegiatans() : Promise.resolve({ success: true, data: [] })
  return wrap(async () => {
    const { data, error } = await supabase.from('kegiatan').select('*, program:program_id (id, kode, nama)').order('kode', { ascending: true })
    if (error) throw error
    return data
  })
}

export const deleteKegiatan = (id) => {
  if (isElectron && window.api?.deleteKegiatan) return window.api.deleteKegiatan(id)
  return wrap(async () => {
    const { data: childSk } = await supabase.from('sub_kegiatan').select('id').eq('kegiatan_id', id).limit(1)
    if (childSk && childSk.length > 0) {
      throw new Error('Tidak dapat menghapus Kegiatan yang masih memiliki Sub Kegiatan aktif. Hapus Sub Kegiatan di dalamnya terlebih dahulu.')
    }
    const { error } = await supabase.from('kegiatan').delete().eq('id', id)
    if (error) throw error
    return true
  })
}

export const addProgram = (payload) => {
  if (isElectron) return window.api.addProgram(payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('program').insert([payload]).select()
    if (error) throw error
    return data
  })
}

export const updateProgram = (id, payload) => {
  if (isElectron) return window.api.updateProgram(id, payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('program').update(payload).eq('id', id).select()
    if (error) throw error
    return data
  })
}

export const addKegiatan = (payload) => {
  if (isElectron) return window.api.addKegiatan(payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('kegiatan').insert([payload]).select()
    if (error) throw error
    return data
  })
}

export const updateKegiatan = (id, payload) => {
  if (isElectron) return window.api.updateKegiatan(id, payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('kegiatan').update(payload).eq('id', id).select()
    if (error) throw error
    return data
  })
}

export const addSubKegiatan = (payload) => {
  if (isElectron) return window.api.addSubKegiatan(payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('sub_kegiatan').insert([payload]).select()
    if (error) throw error
    return data
  })
}

export const updateSubKegiatan = (payload) => {
  if (isElectron) return window.api.updateSubKegiatan(payload)
  return wrap(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('sub_kegiatan').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
}

export const deleteSubKegiatan = (id) => {
  if (isElectron) return window.api.deleteSubKegiatan(id)
  return wrap(async () => {
    const { error } = await supabase.from('sub_kegiatan').delete().eq('id', id)
    if (error) throw error
    return true
  })
}

// ─── Kode Rekening ────────────────────────────────────────────────────────────

export const getKodeRekening = (subKegiatanId) => {
  if (isElectron) return window.api.getKodeRekening(subKegiatanId)
  return wrap(async () => {
    const { data, error } = await supabase
      .from('kode_rekening')
      .select('*, komponen_belanja (*)')
      .eq('sub_kegiatan_id', subKegiatanId)
      .order('kode', { ascending: true })
    if (error) {
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
}

export const addKodeRekening = (payload) => {
  if (isElectron) return window.api.addKodeRekening(payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('kode_rekening').insert([payload]).select()
    if (error) throw error
    if (payload?.sub_kegiatan_id) await syncSubKegiatanTotalPaguWeb(payload.sub_kegiatan_id)
    return data
  })
}

export const updateKodeRekening = (payload) => {
  if (isElectron) return window.api.updateKodeRekening(payload)
  return wrap(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('kode_rekening').update(updateData).eq('id', id).select()
    if (error) throw error
    const skId = updateData?.sub_kegiatan_id || (Array.isArray(data) && data[0]?.sub_kegiatan_id)
    if (skId) await syncSubKegiatanTotalPaguWeb(skId)
    return data
  })
}

export const deleteKodeRekening = (id) => {
  if (isElectron) return window.api.deleteKodeRekening(id)
  return wrap(async () => {
    const { data: existing } = await supabase.from('kode_rekening').select('sub_kegiatan_id').eq('id', id).maybeSingle()
    const { error } = await supabase.from('kode_rekening').delete().eq('id', id)
    if (error) throw error
    if (existing?.sub_kegiatan_id) await syncSubKegiatanTotalPaguWeb(existing.sub_kegiatan_id)
    return true
  })
}

// ─── Komponen Belanja (Rincian per Rekening Belanja) ─────────────────────────

export const getKomponenBelanja = (kodeRekeningId) => {
  if (isElectron) return window.api.getKomponenBelanja(kodeRekeningId)
  return wrap(async () => {
    let query = supabase.from('komponen_belanja').select('*').order('created_at', { ascending: true })
    if (kodeRekeningId) query = query.eq('kode_rekening_id', kodeRekeningId)
    const { data, error } = await query
    if (error) throw error
    return data
  })
}

export const addKomponenBelanja = (payload) => {
  if (isElectron) return window.api.addKomponenBelanja(payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('komponen_belanja').insert([payload]).select()
    if (error) throw error
    return data
  })
}

export const updateKomponenBelanja = (payload) => {
  if (isElectron) return window.api.updateKomponenBelanja(payload)
  return wrap(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('komponen_belanja').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
}

export const deleteKomponenBelanja = (id) => {
  if (isElectron) return window.api.deleteKomponenBelanja(id)
  return wrap(async () => {
    const { error } = await supabase.from('komponen_belanja').delete().eq('id', id)
    if (error) throw error
    return true
  })
}

// ─── Penerimaan ───────────────────────────────────────────────────────────────

export const getPenerimaan = () => {
  if (isElectron) return window.api.getPenerimaan()
  return wrap(async () => {
    const { data, error } = await supabase
      .from('penerimaan')
      .select('*, sub_kegiatan(*), kode_rekening(*)')
      .is('deleted_at', null)
      .order('urutan', { ascending: true })
    if (error) throw error
    return data
  })
}

export const addPenerimaan = (payload) => {
  if (isElectron) return window.api.addPenerimaan(payload)
  return wrap(async () => {
    const insertData = Array.isArray(payload) ? payload : [payload]
    const { data, error } = await supabase.from('penerimaan').insert(insertData).select()
    if (error) throw error
    return data
  })
}

export const updatePenerimaan = (payload) => {
  if (isElectron) return window.api.updatePenerimaan(payload)
  return wrap(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('penerimaan').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
}

export const deletePenerimaan = (id) => {
  if (isElectron) return window.api.deletePenerimaan(id)
  return wrap(async () => {
    return await syncTransactionPackageWeb({
      tipe: 'Penerimaan',
      id,
      action: 'soft-delete',
      timestamp: new Date().toISOString()
    })
  })
}

// ─── Pengeluaran ──────────────────────────────────────────────────────────────

export const getPengeluaran = () => {
  if (isElectron) return window.api.getPengeluaran()
  return wrap(async () => {
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
}

export const addPengeluaran = ({ pengeluaran, rincian, pdfLocalPath, customFileName }) => {
  if (isElectron) return window.api.addPengeluaran({ pengeluaran, rincian, pdfLocalPath, customFileName })
  return wrap(async () => {
    const { data: parent, error: pError } = await supabase
      .from('pengeluaran')
      .insert([pengeluaran])
      .select()
      .single()
    if (pError) throw pError

    if (rincian && rincian.length > 0) {
      const rincianPayload = rincian.map(r => ({ ...r, pengeluaran_id: parent.id }))
      const { error: rError } = await supabase.from('pengeluaran_rincian').insert(rincianPayload)
      if (rError) throw rError
    }
    return parent
  })
}

export const updatePengeluaran = (id, { pengeluaran, rincian, pdfLocalPath, customFileName }) => {
  if (isElectron) return window.api.updatePengeluaran(id, { pengeluaran, rincian, pdfLocalPath, customFileName })
  return wrap(async () => {
    const { error: pError } = await supabase.from('pengeluaran').update(pengeluaran).eq('id', id)
    if (pError) throw pError

    const { error: delError } = await supabase.from('pengeluaran_rincian').delete().eq('pengeluaran_id', id)
    if (delError) throw delError

    if (rincian && rincian.length > 0) {
      const rincianPayload = rincian.map(r => ({
        uraian: r.uraian,
        volume: r.volume || null,
        jumlah: r.jumlah,
        pengeluaran_id: id
      }))
      const { error: rinError } = await supabase.from('pengeluaran_rincian').insert(rincianPayload)
      if (rinError) throw rinError
    }
    return true
  })
}

export const deletePengeluaran = (id) => {
  if (isElectron) return window.api.deletePengeluaran(id)
  return wrap(async () => {
    return await syncTransactionPackageWeb({
      tipe: 'Pengeluaran',
      id,
      action: 'soft-delete',
      timestamp: new Date().toISOString()
    })
  })
}

export const updateBkuUrutan = (items) => {
  if (isElectron) return window.api.updateBkuUrutan(items)
  return wrap(async () => {
    const updates = items.map(item => {
      const table = item.type === 'in' ? 'penerimaan' : 'pengeluaran'
      return supabase.from(table).update({ urutan: item.urutan }).eq('id', item.id)
    })
    const results = await Promise.all(updates)
    const err = results.find(r => r.error)
    if (err) throw err.error
    return true
  })
}

export const getPeriodeKunci = () => {
  if (isElectron) return window.api.getPeriodeKunci()
  return wrap(async () => {
    const { data, error } = await supabase
      .from('periode_kunci')
      .select('*')
      .order('tahun', { ascending: false })
      .order('bulan', { ascending: false })
    if (error) throw error
    return data
  })
}

export const kunciPeriode = (payload) => {
  if (isElectron) return window.api.kunciPeriode(payload)
  return wrap(async () => {
    const { data, error } = await supabase
      .from('periode_kunci')
      .insert([payload])
      .select()
      .single()
    if (error) throw error
    return data
  })
}

export const bukaKunciPeriode = (id) => {
  if (isElectron) return window.api.bukaKunciPeriode(id)
  return wrap(async () => {
    const { error } = await supabase
      .from('periode_kunci')
      .delete()
      .eq('id', id)
    if (error) throw error
    return true
  })
}

// ─── Fitur Electron-only (tidak tersedia di web) ──────────────────────────────

export const selectPdfFile = () => {
  if (isElectron) return window.api.selectPdfFile()
  return Promise.resolve(null) // tidak tersedia di browser
}

export const parseRakPdf = (filePath) => {
  if (isElectron) return window.api.parseRakPdf(filePath)
  return Promise.resolve({ success: false, error: 'Fitur ini hanya tersedia di aplikasi desktop.' })
}

export const saveBulkRekening = (payload) => {
  if (isElectron) return window.api.saveBulkRekening(payload)
  return Promise.resolve({ success: false, error: 'Fitur ini hanya tersedia di aplikasi desktop.' })
}

export const loginGoogleDrive = () => {
  if (isElectron) return window.api.loginGoogleDrive()
  return Promise.resolve({ success: false, error: 'Fitur ini hanya tersedia di aplikasi desktop.' })
}

export const testGoogleDrive = () => {
  if (isElectron) return window.api.testGoogleDrive()
  return Promise.resolve({ success: false, error: 'Fitur ini hanya tersedia di aplikasi desktop.' })
}

export const logoutGoogleDrive = () => {
  if (isElectron) return window.api.logoutGoogleDrive()
  return Promise.resolve({ success: false, error: 'Fitur ini hanya tersedia di aplikasi desktop.' })
}

export const downloadTemplate = (filename, defaultFilename) => {
  if (isElectron) return window.api.downloadTemplate(filename, defaultFilename)

  return Promise.resolve({ success: false, error: 'Fitur ini hanya tersedia di aplikasi desktop.' })
}

// Tempat Sampah (Soft Delete)
export const getDeletedRecords = () => {
  if (isElectron) {
    if (!window.api?.getDeletedRecords) {
      console.warn('window.api.getDeletedRecords is not defined. Please restart Electron app.')
      return Promise.resolve({ success: false, error: 'Aplikasi Electron perlu dijalankan ulang (restart).' })
    }
    return window.api.getDeletedRecords()
  }
  return wrap(async () => {
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
}

export const restoreRecord = (tipe, id) => {
  if (isElectron) {
    if (!window.api?.restoreRecord) {
      return Promise.resolve({ success: false, error: 'Aplikasi Electron perlu dijalankan ulang (restart).' })
    }
    return window.api.restoreRecord({ tipe, id })
  }
  return wrap(async () => {
    return await syncTransactionPackageWeb({ tipe, id, action: 'restore' })
  })
}

export const hardDeleteRecord = (tipe, id) => {
  if (isElectron) {
    if (!window.api?.hardDeleteRecord) {
      return Promise.resolve({ success: false, error: 'Aplikasi Electron perlu dijalankan ulang (restart).' })
    }
    return window.api.hardDeleteRecord({ tipe, id })
  }
  return wrap(async () => {
    return await syncTransactionPackageWeb({ tipe, id, action: 'hard-delete' })
  })
}

// ─── Pengaturan Instansi & Sistem ────────────────────────────────────────────

export const getSettings = () => {
  if (isElectron && window.api?.getSettings) {
    return window.api.getSettings()
  }
  return wrap(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'global')
        .maybeSingle()
      if (!error && data && data.data) return data.data
    } catch (e) {}
    const local = typeof window !== 'undefined' ? localStorage.getItem('app_settings') : null
    return local ? JSON.parse(local) : {}
  })
}

export const saveSettings = (payload) => {
  if (isElectron && window.api?.saveSettings) {
    return window.api.saveSettings(payload)
  }
  return wrap(async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_settings', JSON.stringify(payload || {}))
    }
    try {
      await supabase
        .from('settings')
        .upsert([{ id: 'global', data: payload || {}, updated_at: new Date().toISOString() }])
    } catch (e) {}
    return payload
  })
}


// ─── Backup & Restore Database ───────────────────────────────────────────────

const BACKUP_TABLES_LIST = [
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

export const backupDatabase = (options = {}) => {
  if (isElectron && window.api?.backupDatabase) {
    return window.api.backupDatabase(options)
  }
  return wrap(async () => {
    const now = new Date()
    const backupPayload = {
      metadata: {
        app: 'BendaharaApp',
        version: '1.2.3',
        backup_at: now.toISOString(),
        table_counts: {}
      },
      tables: {}
    }

    for (const table of BACKUP_TABLES_LIST) {
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
    }

    return {
      backupDir: 'Browser Downloads',
      files: {},
      metadata: backupPayload.metadata,
      payload: backupPayload
    }
  })
}

export const restoreDatabase = (backupPayload) => {
  if (isElectron && window.api?.restoreDatabase) {
    return window.api.restoreDatabase(backupPayload)
  }
  return wrap(async () => {
    if (!backupPayload || !backupPayload.tables || typeof backupPayload.tables !== 'object') {
      throw new Error('Format file backup tidak valid: objek tables tidak ditemukan.')
    }
    const restoredCounts = {}
    let totalRestored = 0

    for (const table of BACKUP_TABLES_LIST) {
      const rows = backupPayload.tables[table]
      if (!Array.isArray(rows) || rows.length === 0) {
        restoredCounts[table] = 0
        continue
      }
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
}
