import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore, DEFAULT_SETTINGS } from '../store/useStore'

describe('useStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      user: null,
      subKegiatan: [],
      programs: [],
      kegiatans: [],
      penerimaan: [],
      pengeluaran: [],
      deletedRecords: [],
      isLoading: false
    })
  })

  it('handles login correctly', async () => {
    const { login } = useStore.getState()
    expect(await login('p3dwkabtasikmalaya', 'Sukaraj4')).toBe(true)
    expect(useStore.getState().user).toEqual({ username: 'p3dwkabtasikmalaya', role: 'admin' })

    expect(await login('wrong', 'pass')).toBe(false)
  })

  it('handles logout correctly', () => {
    const { logout } = useStore.getState()
    logout()
    expect(useStore.getState().user).toBe(null)
  })

  it('fetches sub_kegiatan from API', async () => {
    const mockData = [{ id: '1', nama: 'Test SK' }]
    window.api.getSubKegiatan = vi.fn().mockResolvedValue({ success: true, data: mockData })

    await useStore.getState().fetchSubKegiatan()
    expect(useStore.getState().subKegiatan).toEqual(mockData)
  })

  it('adds penerimaan correctly', async () => {
    const newPen = { tanggal: '2026-05-01', jumlah: 1000000 }
    const mockRes = { success: true, data: { id: 'pen1', ...newPen } }
    window.api.addPenerimaan = vi.fn().mockResolvedValue(mockRes)
    window.api.getPenerimaan = vi.fn().mockResolvedValue({ success: true, data: [{ id: 'pen1', ...newPen }] })

    await useStore.getState().addPenerimaan(newPen)
    expect(useStore.getState().penerimaan[0].id).toBe('pen1')
  })

  it('updates and resets settings completely including address & region fields', () => {
    const newSettings = { unit_kerja: 'New Unit', lokasi_wilayah: 'KOTA BANDUNG' }
    useStore.getState().updateSettings(newSettings)
    expect(useStore.getState().settings.unit_kerja).toBe('New Unit')
    expect(useStore.getState().settings.lokasi_wilayah).toBe('KOTA BANDUNG')

    useStore.getState().resetSettings()
    expect(useStore.getState().settings.unit_kerja).toBe(DEFAULT_SETTINGS.unit_kerja)
    expect(useStore.getState().settings.lokasi_wilayah).toBe(DEFAULT_SETTINGS.lokasi_wilayah)
    expect(useStore.getState().settings.alamat_kantor).toBe(DEFAULT_SETTINGS.alamat_kantor)
    expect(useStore.getState().settings.fax_email).toBe(DEFAULT_SETTINGS.fax_email)
    expect(useStore.getState().settings.kode_pos_line).toBe(DEFAULT_SETTINGS.kode_pos_line)
  })

  it('fetches remote settings and syncs daftar_tahun_anggaran', async () => {
    window.api.getSettings = vi.fn().mockResolvedValue({
      success: true,
      data: {
        kpa_nama: 'PEJABAT BARU, S.E.',
        daftar_tahun_anggaran: [2024, 2025, 2026, 2027, 2029]
      }
    })

    await useStore.getState().fetchSettings()
    expect(useStore.getState().settings.kpa_nama).toBe('PEJABAT BARU, S.E.')
    expect(useStore.getState().daftarTahunAnggaran).toContain(2029)
  })

  it('synchronizes both penerimaan and pengeluaran when deleting or restoring a transaction package', async () => {
    window.api.deletePengeluaran = vi.fn().mockResolvedValue({ success: true })
    window.api.getPengeluaran = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getPenerimaan = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getSubKegiatan = vi.fn().mockResolvedValue({ success: true, data: [] })

    await useStore.getState().deletePengeluaran('peng-1')
    expect(window.api.deletePengeluaran).toHaveBeenCalledWith('peng-1')
    expect(window.api.getPengeluaran).toHaveBeenCalled()
    expect(window.api.getPenerimaan).toHaveBeenCalled()

    window.api.restoreRecord = vi.fn().mockResolvedValue({ success: true })
    window.api.getDeletedRecords = vi.fn().mockResolvedValue({ success: true, data: [] })

    await useStore.getState().restoreRecord('Pengeluaran', 'peng-1')
    expect(window.api.restoreRecord).toHaveBeenCalledWith({ tipe: 'Pengeluaran', id: 'peng-1' })
    expect(window.api.getPenerimaan).toHaveBeenCalledTimes(2)
    expect(window.api.getPengeluaran).toHaveBeenCalledTimes(2)
  })

  it('handles deleteProgram and deleteKegiatan and refreshes hierarchy', async () => {
    window.api.deleteProgram = vi.fn().mockResolvedValue({ success: true })
    window.api.deleteKegiatan = vi.fn().mockResolvedValue({ success: true })
    window.api.getSubKegiatan = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getPrograms = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getKegiatans = vi.fn().mockResolvedValue({ success: true, data: [] })

    const resProg = await useStore.getState().deleteProgram('prog-1')
    expect(resProg.success).toBe(true)
    expect(window.api.deleteProgram).toHaveBeenCalledWith('prog-1')

    const resKeg = await useStore.getState().deleteKegiatan('keg-1')
    expect(resKeg.success).toBe(true)
    expect(window.api.deleteKegiatan).toHaveBeenCalledWith('keg-1')
  })

  it('handles backupDatabase and restoreDatabase', async () => {
    window.api.backupDatabase = vi.fn().mockResolvedValue({
      success: true,
      counts: { program: 2, kegiatan: 5 },
      files: { json: 'backup.json', xlsx: 'backup.xlsx', sql: 'backup.sql' }
    })
    window.api.restoreDatabase = vi.fn().mockResolvedValue({
      success: true,
      restoredCounts: { program: 2, kegiatan: 5 }
    })
    window.api.getSubKegiatan = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getKodeRekening = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getPenerimaan = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getPengeluaran = vi.fn().mockResolvedValue({ success: true, data: [] })
    window.api.getLockedPeriods = vi.fn().mockResolvedValue({ success: true, data: [] })

    const backupRes = await useStore.getState().backupDatabase()
    expect(backupRes.success).toBe(true)
    expect(backupRes.counts.program).toBe(2)

    const restoreRes = await useStore.getState().restoreDatabase({ tables: { program: [] } })
    expect(restoreRes.success).toBe(true)
    expect(window.api.restoreDatabase).toHaveBeenCalled()
  })
})
