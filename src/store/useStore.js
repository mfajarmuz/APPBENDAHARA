import { create } from 'zustand'

const createSubKegiatanSlice = (set, get) => ({
  subKegiatan: [],
  fetchSubKegiatan: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getSubKegiatan()
      if (res && res.success) set({ subKegiatan: res.data })
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
      if (res && res.success) set((s) => ({ subKegiatan: [...s.subKegiatan, ...res.data] }))
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
        set((s) => ({ subKegiatan: s.subKegiatan.map((sk) => (sk.id === payload.id ? res.data[0] || sk : sk)) }))
      }
      return res
    } catch (err) {
      console.error(err)
      return { success: false, error: err.message }
    } finally { set({ isLoading: false }) }
  },
  deleteSubKegiatan: async (id) => {
    set({ isLoading: true })
    try {
      const res = await window.api.deleteSubKegiatan(id)
      if (res && res.success) set((s) => ({ subKegiatan: s.subKegiatan.filter((sk) => sk.id !== id) }))
      return res
    } catch (err) { console.error(err); return { success: false, error: err.message } } finally { set({ isLoading: false }) }
  }
})

const createPenerimaanSlice = (set, get) => ({
  penerimaan: [],
  fetchPenerimaan: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getPenerimaan()
      if (res && res.success) set({ penerimaan: res.data })
      else console.error('getPenerimaan failed', res && res.error)
    } catch (err) { console.error(err) } finally { set({ isLoading: false }) }
  },
  addPenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addPenerimaan(payload)
      if (res && res.success) set((s) => ({ penerimaan: [...s.penerimaan, ...res.data] }))
      return res
    } catch (err) { console.error(err); return { success: false, error: err.message } } finally { set({ isLoading: false }) }
  }
})

const createPengeluaranSlice = (set, get) => ({
  pengeluaran: [],
  fetchPengeluaran: async () => {
    set({ isLoading: true })
    try {
      const res = await window.api.getPengeluaran()
      if (res && res.success) set({ pengeluaran: res.data })
      else console.error('getPengeluaran failed', res && res.error)
    } catch (err) { console.error(err) } finally { set({ isLoading: false }) }
  },
  addPengeluaran: async (payload) => {
    set({ isLoading: true })
    try {
      const res = await window.api.addPengeluaran(payload)
      if (res && res.success) set((s) => ({ pengeluaran: [...s.pengeluaran, res.data] }))
      return res
    } catch (err) { console.error(err); return { success: false, error: err.message } } finally { set({ isLoading: false }) }
  }
})

export const useStore = create((set, get) => ({
  isLoading: false,
  error: null,
  ...createSubKegiatanSlice(set, get),
  ...createPenerimaanSlice(set, get),
  ...createPengeluaranSlice(set, get),
}))
