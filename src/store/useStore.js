import { create } from 'zustand'
import * as api from '../lib/api'

/**
 * [FITUR: MASTER DATA - SUB KEGIATAN & PROGRAM]
 * Mengelola struktur program, kegiatan, dan sub kegiatan termasuk sinkronisasi anggaran.
 */
const createSubKegiatanSlice = (set, get) => ({
  subKegiatan: [],
  fetchSubKegiatan: async () => {
    set({ isLoading: true })
    try {
      const res = await api.getSubKegiatan()
      if (res && res.success) {
        set({ subKegiatan: res.data || [] })
      } else if (res) {
        console.error('getSubKegiatan failed', res.error)
      }
    } catch (err) { console.error('getSubKegiatan failed', err.message) }
    finally { set({ isLoading: false }) }
  },
  addProgram: async (payload) => {
    try {
      const res = await api.addProgram(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  updateProgram: async (id, payload) => {
    try {
      const res = await api.updateProgram(id, payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  addKegiatan: async (payload) => {
    try {
      const res = await api.addKegiatan(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  updateKegiatan: async (id, payload) => {
    try {
      const res = await api.updateKegiatan(id, payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  addSubKegiatan: async (payload) => {
    try {
      const res = await api.addSubKegiatan(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  updateSubKegiatan: async (payload) => {
    try {
      const res = await api.updateSubKegiatan(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  deleteSubKegiatan: async (id) => {
    try {
      const res = await api.deleteSubKegiatan(id)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  }
})

/**
 * [FITUR: MASTER DATA - KODE REKENING]
 * Mengelola daftar kode rekening untuk klasifikasi transaksi.
 */
const createKodeRekeningSlice = (set, get) => ({
  addKodeRekening: async (payload) => {
    try {
      const res = await api.addKodeRekening(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  updateKodeRekening: async (payload) => {
    try {
      const res = await api.updateKodeRekening(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  deleteKodeRekening: async (id) => {
    try {
      const res = await api.deleteKodeRekening(id)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
  },
  parseRakPdf: async (filePath) => {
    try {
      return await api.parseRakPdf(filePath)
    } catch (err) { return { success: false, error: err.message } }
  },
  saveBulkRekening: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await api.saveBulkRekening(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  }
})

/**
 * [FITUR: TRANSAKSI - PENERIMAAN KAS]
 * Mencatat semua uang masuk ke Buku Kas Umum (BKU).
 */
const createPenerimaanSlice = (set, get) => ({
  penerimaan: [],
  fetchPenerimaan: async () => {
    set({ isLoading: true })
    try {
      const res = await api.getPenerimaan()
      if (res && res.success) set({ penerimaan: res.data || [] })
    } catch (err) { console.error(err) }
    finally { set({ isLoading: false }) }
  },
  addPenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await api.addPenerimaan(payload)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updatePenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await api.updatePenerimaan(payload)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deletePenerimaan: async (id) => {
    set({ isLoading: true })
    try {
      const res = await api.deletePenerimaan(id)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  }
})

/**
 * [FITUR: TRANSAKSI - PENGELUARAN KAS]
 * Mencatat pengeluaran, SPJ, dan sinkronisasi dengan sisa anggaran.
 */
const createPengeluaranSlice = (set, get) => ({
  pengeluaran: [],
  fetchPengeluaran: async () => {
    set({ isLoading: true })
    try {
      const res = await api.getPengeluaran()
      if (res && res.success) set({ pengeluaran: res.data || [] })
    } catch (err) { console.error(err) }
    finally { set({ isLoading: false }) }
  },
  addPengeluaran: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await api.addPengeluaran(payload)
      if (res && res.success) {
        await get().fetchPengeluaran()
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updatePengeluaran: async (id, payload) => {
    set({ isLoading: true })
    try {
      const res = await api.updatePengeluaran(id, payload)
      if (res && res.success) {
        await get().fetchPengeluaran()
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deletePengeluaran: async (id) => {
    set({ isLoading: true })
    try {
      const res = await api.deletePengeluaran(id)
      if (res && res.success) {
        await get().fetchPengeluaran()
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updateBkuUrutan: async (items) => {
    try {
      const res = await api.updateBkuUrutan(items)
      if (res && res.success) {
        await get().fetchPenerimaan()
        await get().fetchPengeluaran()
      }
      return res
    } catch (err) { return { success: false, error: err.message } }
  }
})

/**
 * [MAIN STORE: useStore]
 * Store utama aplikasi yang menggabungkan seluruh modul fungsional.
 * Menyimpan state global seperti User, Settings, dan IsLoading.
 */
export const useStore = create((set, get) => ({
  isLoading: false,
  error: null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  settings: {
    unit_kerja_kode: '5.02.0.00.0.00.02.0016',
    unit_kerja: 'UPTD PUSAT PENGELOLAAN PENDAPATAN DAERAH WILAYAH KABUPATEN TASIKMALAYA',
    kpa_nama: 'ECEP SUGIARTO, SE, M.A.B',
    kpa_nip: '19680406 199703 1 002',
    kpa_jabatan: 'Kuasa Pengguna Anggaran',
    bp_nama: 'JUNAEDI SUKARYADI, S.E., M.M',
    bp_nip: '19770728 200604 1 004',
    bp_jabatan: 'Bendahara Pengeluaran',
    bpp_nama: 'YADIN HERYADIN, SE',
    bpp_nip: '19711128 200801 1 001',
    bpp_jabatan: 'Bendahara Pengeluaran Pembantu',
    pptk_nama: 'Drs. CASMITA, M.Pd',
    pptk_nip: '19680211 199403 1 005',
    pptk_jabatan: 'Pejabat Pelaksana Teknis Kegiatan',
    lokasi: 'Sukaraja',
    lokasi_wilayah: 'KABUPATEN TASIKMALAYA',
    alamat_kantor: 'Jalan Raya Cikatomas Sukaraja Telepon (0265) 565149',
    fax_email: 'Faksimil : (0265) 566917 E-mail : p3dwkabtsm@gmail.com',
    kode_pos_line: 'Kabupaten Tasikmalaya – 46183',
    ...(JSON.parse(localStorage.getItem('app_settings')) || {})
  },
  
  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings }
    localStorage.setItem('app_settings', JSON.stringify(updated))
    set({ settings: updated })
  },

  resetSettings: () => {
    const defaults = {
      unit_kerja_kode: '5.02.0.00.0.00.02.0016',
      unit_kerja: 'UPTD PUSAT PENGELOLAAN PENDAPATAN DAERAH WILAYAH KABUPATEN TASIKMALAYA',
      kpa_nama: 'ECEP SUGIARTO, SE, M.A.B',
      kpa_nip: '19680406 199703 1 002',
      kpa_jabatan: 'Kuasa Pengguna Anggaran',
      bp_nama: 'JUNAEDI SUKARYADI, S.E., M.M',
      bp_nip: '19770728 200604 1 004',
      bp_jabatan: 'Bendahara Pengeluaran',
      bpp_nama: 'YADIN HERYADIN, SE',
      bpp_nip: '19711128 200801 1 001',
      bpp_jabatan: 'Bendahara Pengeluaran Pembantu',
      pptk_nama: 'Drs. CASMITA, M.Pd',
      pptk_nip: '19680211 199403 1 005',
      pptk_jabatan: 'Pejabat Pelaksana Teknis Kegiatan',
      lokasi: 'Sukaraja',
    }
    localStorage.setItem('app_settings', JSON.stringify(defaults))
    set({ settings: defaults })
  },

  login: async (username, password) => {
    if (username === 'p3dwkabtasikmalaya' && password === 'Sukaraj4') {
      const user = { username: 'p3dwkabtasikmalaya', role: 'admin' }
      localStorage.setItem('user', JSON.stringify(user))
      set({ user })
      return true
    }
    return false
  },
  
  logout: () => {
    localStorage.removeItem('user')
    set({ user: null })
  },

  ...createSubKegiatanSlice(set, get),
  ...createKodeRekeningSlice(set, get),
  ...createPenerimaanSlice(set, get),
  ...createPengeluaranSlice(set, get),
}))
