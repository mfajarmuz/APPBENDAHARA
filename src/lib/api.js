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

// ─── Sub Kegiatan ─────────────────────────────────────────────────────────────

export const getSubKegiatan = () => {
  if (isElectron) return window.api.getSubKegiatan()
  return wrap(async () => {
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
      .select('*')
      .eq('sub_kegiatan_id', subKegiatanId)
      .order('kode', { ascending: true })
    if (error) throw error
    return data
  })
}

export const addKodeRekening = (payload) => {
  if (isElectron) return window.api.addKodeRekening(payload)
  return wrap(async () => {
    const { data, error } = await supabase.from('kode_rekening').insert([payload]).select()
    if (error) throw error
    return data
  })
}

export const updateKodeRekening = (payload) => {
  if (isElectron) return window.api.updateKodeRekening(payload)
  return wrap(async () => {
    const { id, ...updateData } = payload
    const { data, error } = await supabase.from('kode_rekening').update(updateData).eq('id', id).select()
    if (error) throw error
    return data
  })
}

export const deleteKodeRekening = (id) => {
  if (isElectron) return window.api.deleteKodeRekening(id)
  return wrap(async () => {
    const { error } = await supabase.from('kode_rekening').delete().eq('id', id)
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
    const { error } = await supabase.from('penerimaan').delete().eq('id', id)
    if (error) throw error
    return true
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
    const { error } = await supabase.from('pengeluaran').delete().eq('id', id)
    if (error) throw error
    return true
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

export const downloadTemplate = (filename) => {
  if (isElectron) return window.api.downloadTemplate(filename)
  return Promise.resolve({ success: false, error: 'Fitur ini hanya tersedia di aplikasi desktop.' })
}
