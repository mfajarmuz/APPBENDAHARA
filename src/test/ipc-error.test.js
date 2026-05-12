import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'

// Mock window.api
const mockApi = {
  getSubKegiatan: vi.fn(),
  addPenerimaan: vi.fn(),
  addPengeluaran: vi.fn(),
}
global.window = { api: mockApi }

describe('IPC Error Propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state if needed, but since it's a global store in vitest, 
    // we just care about the behavior of the methods
  })

  it('should handle getSubKegiatan failure gracefully', async () => {
    mockApi.getSubKegiatan.mockResolvedValue({ success: false, error: 'Database connection failed' })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    await useStore.getState().fetchSubKegiatan()
    
    expect(spy).toHaveBeenCalledWith('getSubKegiatan failed', 'Database connection failed')
    expect(useStore.getState().isLoading).toBe(false)
    spy.mockRestore()
  })

  it('should handle addPenerimaan exception', async () => {
    mockApi.addPenerimaan.mockRejectedValue(new Error('IPC Timeout'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const result = await useStore.getState().addPenerimaan({ test: 1 })
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('IPC Timeout')
    expect(useStore.getState().isLoading).toBe(false)
    spy.mockRestore()
  })

  it('should handle addPengeluaran validation error from main process', async () => {
    const validationError = 'Anggaran untuk "Test" tidak mencukupi'
    mockApi.addPengeluaran.mockResolvedValue({ success: false, error: validationError })
    
    const result = await useStore.getState().addPengeluaran({ pengeluaran: {}, rincian: [] })
    
    expect(result.success).toBe(false)
    expect(result.error).toBe(validationError)
  })
})
