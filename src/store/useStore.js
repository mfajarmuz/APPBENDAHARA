import { create } from 'zustand'

const createSubKegiatanSlice = (set, get) => ({
  subKegiatan: [],
  fetchSubKegiatan: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getSubKegiatan()
      if (res && res.success) set({ subKegiatan: res.data || [] })
      else console.error('getSubKegiatan failed', res && res.error)
    } catch (err) {
      console.error(err)
    } finally {
      set({ isLoading: false })
    }
  },
  addSubKegiatan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addSubKegiatan(payload)
      if (res && res.success) {
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  updateSubKegiatan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.updateSubKegiatan(payload)
      if (res && res.success) {
        // Refetch to ensure all relations (kegiatan, program, kode_rekening) are preserved
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  deleteSubKegiatan: async (id) => {
    set({ isLoading: true })
    try {
      const res = await window.api.deleteSubKegiatan(id)
      if (res && res.success) {
        set((s) => ({ subKegiatan: s.subKegiatan.filter((sk) => sk.id !== id) }))
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },

  // Hierarchical Edits
  updateProgram: async (id, payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.updateProgram(id, payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally { set({ isLoading: false }) }
  },

  updateKegiatan: async (id, payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.updateKegiatan(id, payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally { set({ isLoading: false }) }
  },

  // Kode Rekening
  addKodeRekening: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addKodeRekening(payload)
      if (res && res.success) {
        await get().fetchSubKegiatan() 
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  updateKodeRekening: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.updateKodeRekening(payload)
      if (res && res.success) {
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  deleteKodeRekening: async (id) => {
    set({ isLoading: true })
    try {
      const res = await window.api.deleteKodeRekening(id)
      if (res && res.success) {
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  }
})

const createPenerimaanSlice = (set, get) => ({
  penerimaan: [],
  fetchPenerimaan: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getPenerimaan()
      if (res && res.success) set({ penerimaan: res.data || [] })
      else console.error('getPenerimaan failed', res && res.error)
    } catch (err) {
      console.error(err)
    } finally {
      set({ isLoading: false })
    }
  },
  addPenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addPenerimaan(payload)
      if (res && res.success) {
        // Handle batch insert: res.data is an array of inserted records
        set((s) => ({ penerimaan: [...(res.data || []), ...s.penerimaan] }))
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  updatePenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.updatePenerimaan(payload)
      if (res && res.success) {
        set((s) => ({
          penerimaan: s.penerimaan.map((p) => (p.id === payload.id ? res.data[0] || p : p))
        }))
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  deletePenerimaan: async (id) => {
    set({ isLoading: true })
    try {
      const res = await window.api.deletePenerimaan(id)
      if (res && res.success) {
        set((s) => ({ penerimaan: s.penerimaan.filter((p) => p.id !== id) }))
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  }
})

const createPengeluaranSlice = (set, get) => ({
  pengeluaran: [],
  fetchPengeluaran: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getPengeluaran()
      if (res && res.success) set({ pengeluaran: res.data || [] })
      else console.error('getPengeluaran failed', res && res.error)
    } catch (err) {
      console.error(err)
    } finally {
      set({ isLoading: false })
    }
  },
  addPengeluaran: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addPengeluaran(payload)
      if (res && res.success) {
        await get().fetchPengeluaran() 
      }
      return res
    } catch (err) {
      console.error('addPengeluaran store error:', err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  deletePengeluaran: async (id) => {
    set({ isLoading: true })
    try {
      const res = await window.api.deletePengeluaran(id)
      if (res && res.success) {
        set((s) => ({ pengeluaran: s.pengeluaran.filter((p) => p.id !== id) }))
      }
      return res
    } catch (err) {
      console.error('deletePengeluaran store error:', err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  updatePengeluaran: async (id, { pengeluaran, rincian }) => {
    set({ isLoading: true })
    try {
      const res = await window.api.updatePengeluaran(id, { pengeluaran, rincian })
      if (res && res.success) {
        await get().fetchPengeluaran()
      }
      return res
    } catch (err) {
      console.error('updatePengeluaran store error:', err)
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
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
    localStorage.setItem('app_settings', JSON.stringify(newSettings))
    set({ settings: newSettings })
  },

  resetSettings: () => {
    const defaults = {
      unit_kerja_kode: '5.02.0.00.0.00.02.0016',
      unit_kerja: 'UPTD PUSAT PENGELOLAAN PENDAPATAN DAERAH WILAYAH KABUPATEN TASIKMALAYA',
      kpa_nama: 'ECEP SUGIARTO, SE, M.A.B',
      kpa_nip: '19680406 199703 1 002',
      kpa_jabatan: 'Kuasa Pengguna Anggaran',
      bpp_nama: 'YADIN HERYADIN, SE',
      bpp_nip: '19711128 200801 1 001',
      bpp_jabatan: 'Bendahara Pengeluaran Pembantu',
      pptk_nama: 'Drs. CASMITA, M.Pd',
      pptk_nip: '19680211 199403 1 005',
      pptk_jabatan: 'Pejabat Pelaksana Teknis Kegiatan',
      lokasi: 'Sukaraja'
    }
    localStorage.setItem('app_settings', JSON.stringify(defaults))
    set({ settings: defaults })
  },
  
  login: (username, password) => {
    const cleanUser = String(username || '').trim()
    const cleanPass = String(password || '').trim()
    
    if (cleanUser === 'admin' && cleanPass === 'admin123') {
      const userData = { username: 'admin', role: 'admin' }
      localStorage.setItem('user', JSON.stringify(userData))
      set({ user: userData })
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
