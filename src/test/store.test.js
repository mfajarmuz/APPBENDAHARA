import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'

describe('useStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      user: null,
      subKegiatan: [],
      penerimaan: [],
      pengeluaran: [],
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

  it('updates settings correctly', () => {
    const newSettings = { unit_kerja: 'New Unit' }
    useStore.getState().updateSettings(newSettings)
    expect(useStore.getState().settings.unit_kerja).toBe('New Unit')
  })
})
