import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock jsPDF
const mockSave = vi.fn()
const mockAddPage = vi.fn()
const mockSetFont = vi.fn().mockReturnThis()
const mockSetFontSize = vi.fn().mockReturnThis()
const mockText = vi.fn().mockReturnThis()
const mockLine = vi.fn().mockReturnThis()
const mockSetLineWidth = vi.fn().mockReturnThis()
const mockSplitTextToSize = vi.fn().mockImplementation((text) => [text])

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return {
        setFont: mockSetFont,
        setFontSize: mockSetFontSize,
        text: mockText,
        save: mockSave,
        addPage: mockAddPage,
        line: mockLine,
        setLineWidth: mockSetLineWidth,
        splitTextToSize: mockSplitTextToSize,
        getTextWidth: vi.fn().mockReturnValue(10),
        lastAutoTable: { finalY: 100 }
      }
    })
  }
})

// Mock jspdf-autotable
vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn((doc) => {
      doc.lastAutoTable = { finalY: 100 }
    })
  }
})

// Mock useStore
vi.mock('@/store/useStore', () => {
  return {
    useStore: {
      getState: () => ({
        settings: {
          unit_kerja: 'Test Unit',
          kpa_nama: 'Test KPA',
          kpa_nip: '123',
          kpa_jabatan: 'KPA Jab',
          bpp_nama: 'Test BPP',
          bpp_nip: '456',
          bpp_jabatan: 'BPP Jab',
          lokasi: 'Test Loc'
        }
      })
    }
  }
})

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { exportBKUPdf, exportBukuPembantuPdf, exportNPDPdf, exportNPDBatchPdf } from '../lib/export-pdf'

describe('export-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exportBKUPdf should initialize jsPDF and call save', () => {
    const rows = [{ tanggal: '2026-01-01', uraian: 'Test', debet: 1000, kredit: 0 }]
    exportBKUPdf(rows, 0, 2026)
    
    expect(jsPDF).toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('BKU_JANUARI_2026.pdf'))
    expect(autoTable).toHaveBeenCalled()
  })

  it('exportNPDPdf should use correct filename format', () => {
    const item = { 
      tanggal: '2026-05-03', 
      jumlah: 5000, 
      kode_rekening_id: 1,
      sub_kegiatan: { kegiatan: { program: { kode: '1', nama: 'Prog' } } }
    }
    const pengeluaran = [item]
    
    exportNPDPdf(item, {}, pengeluaran, '10')
    
    expect(mockSave).toHaveBeenCalledWith('10-NPD-MEI-2026.pdf')
  })

  it('exportNPDBatchPdf should handle multiple items and add pages', () => {
    const items = [
      { id: 1, tanggal: '2026-01-01', jumlah: 1000, kode_rekening_id: 1, type: 'out' },
      { id: 2, tanggal: '2026-01-02', jumlah: 2000, kode_rekening_id: 1, type: 'out' }
    ]
    const pengeluaran = items
    const bkuRows = items.map(i => ({ ...i, type: 'out' }))
    
    exportNPDBatchPdf(items, {}, pengeluaran, bkuRows)
    
    expect(jsPDF).toHaveBeenCalled()
    expect(mockAddPage).toHaveBeenCalledTimes(1)
    expect(mockSave).toHaveBeenCalledWith('BATCH-NPD-JANUARI-2026.pdf')
  })

  it('exportBukuPembantuPdf should handle multiple groups', () => {
    const groups = [
      { 
        rekening: { kode: '1.1', uraian: 'Rek 1', pagu_anggaran: 5000 },
        rows: [{ tanggal: '2026-01-01', jumlah: 1000 }]
      },
      { 
        rekening: { kode: '1.2', uraian: 'Rek 2', pagu_anggaran: 3000 },
        rows: [{ tanggal: '2026-01-02', jumlah: 500 }]
      }
    ]
    
    exportBukuPembantuPdf(groups)
    
    expect(jsPDF).toHaveBeenCalled()
    expect(mockAddPage).toHaveBeenCalledTimes(1) // Second group adds a page
    expect(mockSave).toHaveBeenCalled()
    expect(autoTable).toHaveBeenCalledTimes(2)
  })
})

