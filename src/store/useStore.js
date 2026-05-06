import { create } from 'zustand'

const createSubKegiatanSlice = (set, get) => ({
  subKegiatan: [],
  fetchSubKegiatan: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getSubKegiatan()
      if (res && res.success) {
        set({ subKegiatan: res.data || [] })
      } else if (res) {
        console.error('getSubKegiatan failed', res.error)
      }
    } catch (err) { console.error('getSubKegiatan failed', err.message) }
    finally { set({ isLoading: false }) }
  },
})

const createPenerimaanSlice = (set, get) => ({
  penerimaan: [],
  fetchPenerimaan: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getPenerimaan()
      if (res && res.success) set({ penerimaan: res.data || [] })
    } catch (err) { console.error(err) }
    finally { set({ isLoading: false }) }
  },
  addPenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addPenerimaan(payload)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updatePenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.updatePenerimaan(payload)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deletePenerimaan: async (id) => {
    set({ isLoading: true })
    try {
      const res = await window.api.deletePenerimaan(id)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  }
})

const createPengeluaranSlice = (set, get) => ({
  pengeluaran: [],
  fetchPengeluaran: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getPengeluaran()
      if (res && res.success) set({ pengeluaran: res.data || [] })
    } catch (err) { console.error(err) }
    finally { set({ isLoading: false }) }
  },
  addPengeluaran: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addPengeluaran(payload)
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
      const res = await window.api.updatePengeluaran(id, payload)
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
      const res = await window.api.deletePengeluaran(id)
      if (res && res.success) {
        await get().fetchPengeluaran()
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
})

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
    // Simulasi login sederhana (bisa diganti dengan IPC call ke backend jika diperlukan)
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
  ...createPenerimaanSlice(set, get),
  ...createPengeluaranSlice(set, get),
}))
