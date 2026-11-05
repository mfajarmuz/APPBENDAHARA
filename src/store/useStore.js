import { create } from 'zustand'
import * as api from '../lib/api'

const checkViewer = (get) => {
  if (get().user?.role === 'viewer') {
    throw new Error('Akses ditolak: Akun Pemeriksa tidak diizinkan mengubah data.')
  }
}

/**
 * [FITUR: MASTER DATA - SUB KEGIATAN & PROGRAM]
 * Mengelola struktur program, kegiatan, dan sub kegiatan termasuk sinkronisasi anggaran.
 */
const createSubKegiatanSlice = (set, get) => ({
  subKegiatan: [],
  programs: [],
  kegiatans: [],
  fetchSubKegiatan: async () => {
    set({ isLoading: true })
    try {
      const res = await api.getSubKegiatan()
      if (res && res.success) {
        set({ subKegiatan: res.data || [] })
      } else {
        console.error('getSubKegiatan failed', res?.error || 'Unknown error')
      }
      try {
        if (api.getPrograms) {
          const progRes = await api.getPrograms()
          if (progRes && progRes.success) set({ programs: progRes.data || [] })
        }
        if (api.getKegiatans) {
          const kegRes = await api.getKegiatans()
          if (kegRes && kegRes.success) set({ kegiatans: kegRes.data || [] })
        }
      } catch (e) {}
    } catch (err) { console.error('getSubKegiatan failed', err.message) }
    finally { set({ isLoading: false }) }
  },
  addProgram: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.addProgram(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updateProgram: async (id, payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.updateProgram(id, payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deleteProgram: async (id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.deleteProgram(id)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  addKegiatan: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.addKegiatan(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updateKegiatan: async (id, payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.updateKegiatan(id, payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deleteKegiatan: async (id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.deleteKegiatan(id)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  addSubKegiatan: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const dataWithYear = {
        tahun_anggaran: get().tahunAnggaran || 2026,
        ...payload
      }
      const res = await api.addSubKegiatan(dataWithYear)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updateSubKegiatan: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.updateSubKegiatan(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deleteSubKegiatan: async (id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.deleteSubKegiatan(id)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  }
})

/**
 * [FITUR: MASTER DATA - KODE REKENING]
 * Mengelola daftar kode rekening untuk klasifikasi transaksi.
 */
const createKodeRekeningSlice = (set, get) => ({
  addKodeRekening: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.addKodeRekening(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updateKodeRekening: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.updateKodeRekening(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deleteKodeRekening: async (id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.deleteKodeRekening(id)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  parseRakPdf: async (filePath) => {
    try {
      checkViewer(get)
      return await api.parseRakPdf(filePath)
    } catch (err) { return { success: false, error: err.message } }
  },
  saveBulkRekening: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.saveBulkRekening(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  }
})

/**
 * [FITUR: MASTER DATA - KOMPONEN BELANJA]
 * Mengelola rincian komponen belanja di bawah Kode Rekening Belanja.
 */
const createKomponenBelanjaSlice = (set, get) => ({
  addKomponenBelanja: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.addKomponenBelanja(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updateKomponenBelanja: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.updateKomponenBelanja(payload)
      if (res && res.success) await get().fetchSubKegiatan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deleteKomponenBelanja: async (id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.deleteKomponenBelanja(id)
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
      checkViewer(get)
      const res = await api.addPenerimaan(payload)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updatePenerimaan: async (payload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.updatePenerimaan(payload)
      if (res && res.success) await get().fetchPenerimaan()
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  deletePenerimaan: async (id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.deletePenerimaan(id)
      if (res && res.success) {
        await get().fetchPenerimaan()
        await get().fetchPengeluaran()
        await get().fetchSubKegiatan()
      }
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
      checkViewer(get)
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
      checkViewer(get)
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
      checkViewer(get)
      const res = await api.deletePengeluaran(id)
      if (res && res.success) {
        await get().fetchPengeluaran()
        await get().fetchPenerimaan()
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) { return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  updateBkuUrutan: async (items) => {
    try {
      checkViewer(get)
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
 * [FITUR: PERIODE KUNCI]
 * Mengelola penguncian transaksi berdasarkan periode bulan/tahun.
 */
const createPeriodeKunciSlice = (set, get) => ({
  periodeKunci: [],
  fetchPeriodeKunci: async () => {
    set({ isLoading: true })
    try {
      const res = await api.getPeriodeKunci()
      if (res && res.success) {
        set({ periodeKunci: res.data || [] })
      }
    } catch (err) {
      console.error('fetchPeriodeKunci failed', err.message)
    } finally {
      set({ isLoading: false })
    }
  },
  kunciPeriode: async (bulan, tahun) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.kunciPeriode({ bulan, tahun })
      if (res && res.success) {
        await get().fetchPeriodeKunci()
      }
      return res
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  bukaKunciPeriode: async (id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.bukaKunciPeriode(id)
      if (res && res.success) {
        await get().fetchPeriodeKunci()
      }
      return res
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  }
})

/**
 * [FITUR: TEMPAT SAMPAH / SOFT DELETE]
 * Mengelola pemulihan dan penghapusan permanen transaksi.
 */
const createSoftDeleteSlice = (set, get) => ({
  deletedRecords: [],
  fetchDeletedRecords: async () => {
    set({ isLoading: true })
    try {
      const res = await api.getDeletedRecords()
      if (res && res.success) set({ deletedRecords: res.data || [] })
    } catch (err) {
      console.error(err)
    } finally {
      set({ isLoading: false })
    }
  },
  restoreRecord: async (tipe, id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.restoreRecord(tipe, id)
      if (res && res.success) {
        await get().fetchDeletedRecords()
        await get().fetchPenerimaan()
        await get().fetchPengeluaran()
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },
  hardDeleteRecord: async (tipe, id) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.hardDeleteRecord(tipe, id)
      if (res && res.success) {
        await get().fetchDeletedRecords()
        await get().fetchPenerimaan()
        await get().fetchPengeluaran()
        await get().fetchSubKegiatan()
      }
      return res
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  }
})

/**
 * [FITUR: MANAJEMEN TAHUN ANGGARAN]
 * Mengelola tahun anggaran aktif dan daftar tahun anggaran terdaftar.
 */
const createTahunAnggaranSlice = (set, get) => {
  const defaultYears = [2024, 2025, 2026, 2027]
  let savedYears = defaultYears
  let savedYear = 2026

  try {
    const localYears = typeof window !== 'undefined' ? localStorage.getItem('bendahara_daftar_tahun') : null
    if (localYears) savedYears = JSON.parse(localYears)
    const localYear = typeof window !== 'undefined' ? localStorage.getItem('bendahara_tahun_anggaran') : null
    if (localYear) savedYear = parseInt(localYear, 10)
  } catch (e) {
    console.error('Failed reading tahun anggaran from localStorage', e)
  }

  return {
    tahunAnggaran: savedYear,
    daftarTahunAnggaran: Array.isArray(savedYears) && savedYears.length > 0 ? savedYears : defaultYears,

    setTahunAnggaran: (tahun) => {
      const t = parseInt(tahun, 10)
      if (!t || isNaN(t)) return
      try {
        if (typeof window !== 'undefined') localStorage.setItem('bendahara_tahun_anggaran', String(t))
      } catch (e) {}
      
      const list = get().daftarTahunAnggaran || []
      let updatedList = list
      if (!list.includes(t)) {
        updatedList = [...list, t].sort((a, b) => a - b)
        try {
          if (typeof window !== 'undefined') localStorage.setItem('bendahara_daftar_tahun', JSON.stringify(updatedList))
        } catch (e) {}
      }
      set({ tahunAnggaran: t, daftarTahunAnggaran: updatedList })
      if (api.saveSettings) { api.saveSettings({ ...get().settings, daftar_tahun_anggaran: updatedList }).catch(() => {}) }
    },

    addTahunAnggaran: async (tahun, { copyFromYear = null } = {}) => {
      const t = parseInt(tahun, 10)
      if (!t || isNaN(t) || t < 2000 || t > 2100) {
        return { success: false, error: 'Tahun anggaran harus berupa 4 digit angka valid (antara 2000 - 2100)' }
      }
      const list = get().daftarTahunAnggaran || []
      if (list.includes(t)) {
        return { success: false, error: `Tahun anggaran ${t} sudah ada dalam sistem.` }
      }
      const updatedList = [...list, t].sort((a, b) => a - b)
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('bendahara_daftar_tahun', JSON.stringify(updatedList))
          localStorage.setItem('bendahara_tahun_anggaran', String(t))
        }
      } catch (e) {}

      set({ tahunAnggaran: t, daftarTahunAnggaran: updatedList })

      if (copyFromYear) {
        return await get().copyDpaStructure(copyFromYear, t)
      }

      return { success: true, data: t }
    },

    copyDpaStructure: async (sourceYear, targetYear) => {
      set({ isLoading: true })
      try {
        checkViewer(get)
        const allSk = get().subKegiatan || []
        const sYear = parseInt(sourceYear, 10)
        const tYear = parseInt(targetYear, 10)
        const sourceSkList = allSk.filter(sk => (sk.tahun_anggaran || 2026) === sYear)

        if (sourceSkList.length === 0) {
          return { success: false, error: `Tidak ada data DPA pada Tahun Anggaran ${sourceYear} untuk disalin.` }
        }

        let copiedCount = 0
        for (const sk of sourceSkList) {
          const res = await api.addSubKegiatan({
            kegiatan_id: sk.kegiatan_id,
            kode: sk.kode,
            nama: sk.nama,
            total_pagu: 0,
            sumber_dana: sk.sumber_dana || 'PAD',
            tahun_anggaran: tYear
          })

          if (res && res.success) {
            copiedCount++
            const createdSk = Array.isArray(res.data) ? res.data[0] : res.data
            if (createdSk && sk.kode_rekening && sk.kode_rekening.length > 0) {
              for (const rek of sk.kode_rekening) {
                const resRek = await api.addKodeRekening({
                  sub_kegiatan_id: createdSk.id,
                  kode: rek.kode,
                  uraian: rek.uraian,
                  pagu_anggaran: 0,
                  rak_jan: 0, rak_feb: 0, rak_mar: 0, rak_apr: 0, rak_mei: 0, rak_jun: 0,
                  rak_jul: 0, rak_agu: 0, rak_sep: 0, rak_okt: 0, rak_nov: 0, rak_des: 0
                })

                const createdRek = Array.isArray(resRek?.data) ? resRek.data[0] : resRek?.data
                if (createdRek && rek.komponen_belanja && rek.komponen_belanja.length > 0) {
                  for (const komp of rek.komponen_belanja) {
                    await api.addKomponenBelanja({
                      kode_rekening_id: createdRek.id,
                      kode: komp.kode || '',
                      nama: komp.nama,
                      spesifikasi: komp.spesifikasi || '',
                      volume: komp.volume || 1,
                      satuan: komp.satuan || 'Paket',
                      harga_satuan: komp.harga_satuan || 0,
                      total: 0,
                      keterangan: komp.keterangan || ''
                    })
                  }
                }
              }
            }
          }
        }

        await get().fetchSubKegiatan()
        return { 
          success: true, 
          message: `Berhasil menyalin ${copiedCount} struktur Sub Kegiatan ke Tahun Anggaran ${tYear} (Pagu diset Rp 0).` 
        }
      } catch (err) {
        console.error('copyDpaStructure error', err)
        return { success: false, error: err.message }
      } finally {
        set({ isLoading: false })
      }
    }
  }
}

/**
 * [MAIN STORE: useStore]
 * Store utama aplikasi yang menggabungkan seluruh modul fungsional.
 * Menyimpan state global seperti User, Settings, dan IsLoading.
 */
export const DEFAULT_SETTINGS = {
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
  deepseek_api_key: '',
  deepseek_model: 'deepseek-chat',
}

export const useStore = create((set, get) => ({
  isLoading: false,
  error: null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user')) || null : null,
  settings: {
    ...DEFAULT_SETTINGS,
    ...(typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('app_settings')) || {} : {})
  },

  fetchSettings: async () => {
    try {
      if (!api.getSettings) return
      const res = await api.getSettings()
      if (res && res.success && res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
        const merged = { ...DEFAULT_SETTINGS, ...get().settings, ...res.data }
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_settings', JSON.stringify(merged))
        }
        const stateUpdates = { settings: merged }
        if (Array.isArray(res.data.daftar_tahun_anggaran) && res.data.daftar_tahun_anggaran.length > 0) {
          const mergedYears = Array.from(new Set([...(get().daftarTahunAnggaran || []), ...res.data.daftar_tahun_anggaran])).sort((a, b) => a - b)
          stateUpdates.daftarTahunAnggaran = mergedYears
          if (typeof window !== 'undefined') {
            localStorage.setItem('bendahara_daftar_tahun', JSON.stringify(mergedYears))
          }
        }
        set(stateUpdates)
      }
    } catch (err) {
      console.warn('fetchSettings fallback to localStorage:', err.message)
    }
  },
  
  updateSettings: (newSettings) => {
    if (get().user?.role === 'viewer') return
    const updated = { ...get().settings, ...newSettings }
    if (typeof window !== 'undefined') localStorage.setItem('app_settings', JSON.stringify(updated))
    set({ settings: updated })
    if (api.saveSettings) {
      api.saveSettings({
        ...updated,
        daftar_tahun_anggaran: get().daftarTahunAnggaran
      }).catch(() => {})
    }
  },

  resetSettings: () => {
    if (get().user?.role === 'viewer') return
    const defaults = { ...DEFAULT_SETTINGS }
    if (typeof window !== 'undefined') localStorage.setItem('app_settings', JSON.stringify(defaults))
    set({ settings: defaults })
    if (api.saveSettings) {
      api.saveSettings({
        ...defaults,
        daftar_tahun_anggaran: get().daftarTahunAnggaran
      }).catch(() => {})
    }
  },

  login: async (username, password) => {
    if (username === 'p3dwkabtasikmalaya' && password === 'Sukaraj4') {
      const user = { username: 'p3dwkabtasikmalaya', role: 'admin' }
      if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user))
      set({ user })
      return true
    } else if (username === 'pemeriksa' && password === 'Pemeriks4') {
      const user = { username: 'pemeriksa', role: 'viewer' }
      if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user))
      set({ user })
      return true
    }
    return false
  },
  
  backupDatabase: async (options = {}) => {
    try {
      return await api.backupDatabase(options)
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  restoreDatabase: async (backupPayload) => {
    set({ isLoading: true })
    try {
      checkViewer(get)
      const res = await api.restoreDatabase(backupPayload)
      if (res && res.success) {
        await get().fetchSubKegiatan()
        await get().fetchPenerimaan()
        await get().fetchPengeluaran()
        if (get().fetchPeriodeKunci) await get().fetchPeriodeKunci()
        if (get().fetchSettings) await get().fetchSettings()
      }
      return res
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('user')
    set({ user: null })
  },

  ...createSubKegiatanSlice(set, get),
  ...createKodeRekeningSlice(set, get),
  ...createKomponenBelanjaSlice(set, get),
  ...createPenerimaanSlice(set, get),
  ...createPengeluaranSlice(set, get),
  ...createPeriodeKunciSlice(set, get),
  ...createSoftDeleteSlice(set, get),
  ...createTahunAnggaranSlice(set, get),
}))
