import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state before each test if necessary
    // Note: Zustand store is a singleton, so we might need to manually reset or use a factory
    vi.clearAllMocks()
  })

  it('handles login correctly', () => {
    const { login } = useStore.getState()
    expect(login('admin', 'admin123')).toBe(true)
    expect(useStore.getState().user).toEqual({ username: 'admin', role: 'admin' })
    
    expect(login('wrong', 'wrong')).toBe(false)
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
    const mockRes = { success: true, data: [{ id: 'pen1', ...newPen }] }
    window.api.addPenerimaan = vi.fn().mockResolvedValue(mockRes)

    await useStore.getState().addPenerimaan(newPen)
    expect(useStore.getState().penerimaan[0].id).toBe('pen1')
  })

  it('updates settings correctly', () => {
    const newSettings = { unit_kerja: 'New Unit' }
    useStore.getState().updateSettings(newSettings)
    expect(useStore.getState().settings.unit_kerja).toBe('New Unit')
  })
})
