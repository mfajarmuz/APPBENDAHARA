import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  subKegiatan: [],
  penerimaan: [],
  pengeluaran: [],
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  fetchSubKegiatan: async () => {
    set({ loading: true, error: null })
    try {
      const data = await window.api.getSubKegiatan()
      set({ subKegiatan: data || [], loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  createSubKegiatan: async (payload) => {
    try {
      const data = await window.api.addSubKegiatan(payload)
      await get().fetchSubKegiatan()
      return data
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  updateSubKegiatan: async (payload) => {
    try {
      const data = await window.api.updateSubKegiatan(payload)
      await get().fetchSubKegiatan()
      return data
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  deleteSubKegiatan: async (id) => {
    try {
      await window.api.deleteSubKegiatan(id)
      await get().fetchSubKegiatan()
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  createRekening: async (payload) => {
    try {
      const data = await window.api.addKodeRekening(payload)
      await get().fetchSubKegiatan()
      return data
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  updateRekening: async (payload) => {
    try {
      const data = await window.api.updateKodeRekening(payload)
      await get().fetchSubKegiatan()
      return data
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  deleteRekening: async (id) => {
    try {
      await window.api.deleteKodeRekening(id)
      await get().fetchSubKegiatan()
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  fetchPenerimaan: async () => {
    set({ loading: true, error: null })
    try {
      const data = await window.api.getPenerimaan()
      set({ penerimaan: data || [], loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  createPenerimaan: async (payload) => {
    try {
      const data = await window.api.addPenerimaan(payload)
      await get().fetchPenerimaan()
      return data
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  updatePenerimaan: async (payload) => {
    try {
      const data = await window.api.updatePenerimaan(payload)
      await get().fetchPenerimaan()
      return data
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  deletePenerimaan: async (id) => {
    try {
      await window.api.deletePenerimaan(id)
      await get().fetchPenerimaan()
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  fetchPengeluaran: async () => {
    set({ loading: true, error: null })
    try {
      const data = await window.api.getPengeluaran()
      set({ pengeluaran: data || [], loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  createPengeluaran: async (payload) => {
    try {
      const data = await window.api.addPengeluaran(payload)
      await get().fetchPengeluaran()
      return data
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },

  deletePengeluaran: async (id) => {
    try {
      await window.api.deletePengeluaran(id)
      await get().fetchPengeluaran()
    } catch (e) {
      set({ error: e.message })
      throw e
    }
  },
}))
