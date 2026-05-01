import { create } from 'zustand';

export const useStore = create((set) => ({
  subKegiatan: [],
  penerimaan: [],
  pengeluaran: [],
  isLoading: false,

  // Actions untuk memanggil API Electron (Supabase)
  fetchSubKegiatan: async () => {
    set({ isLoading: true });
    const data = await window.api.getSubKegiatan();
    set({ subKegiatan: data, isLoading: false });
  },

  fetchPenerimaan: async () => {
    set({ isLoading: true });
    const data = await window.api.getPenerimaan();
    set({ penerimaan: data, isLoading: false });
  },

  fetchPengeluaran: async () => {
    set({ isLoading: true });
    const data = await window.api.getPengeluaran();
    set({ pengeluaran: data, isLoading: false });
  }
  
  // Anda bisa menambahkan fungsi add/edit/delete nanti di sini
}));