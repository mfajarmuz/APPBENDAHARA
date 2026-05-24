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
const mockAddImage = vi.fn()

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
        addImage: mockAddImage,
        getTextWidth: vi.fn().mockReturnValue(10),
        lastAutoTable: { finalY: 100 },
        internal: {
          pageSize: {
            getHeight: () => 297,
            getWidth: () => 210
          }
        }
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

// Mock html2canvas
vi.mock('html2canvas', () => {
  return {
    default: vi.fn().mockResolvedValue({
      width: 800,
      height: 1000,
      toDataURL: () => 'data:image/png;base64,mockImageData'
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
import { exportBKUPdf, exportBKUTriwulanPdf, exportBukuPembantuPdf, exportNPDPdf, exportNPDBatchPdf, exportLPJAdministratifPdf, exportBAPemeriksaanKasPdf } from '../lib/export-pdf'

describe('export-pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exportLPJAdministratifPdf should initialize jsPDF and call save', () => {
    const allSubKegiatan = [{
      kode: '1.01.01',
      nama: 'Test Sub Kegiatan',
      kode_rekening: [
        { id: 1, kode: '5.1.1', uraian: 'Rek 1', pagu_anggaran: 10000000 }
      ]
    }]
    const pengeluaran = [
      { tanggal: '2026-01-05', jumlah: 1000000, kode_rekening_id: 1, jenis: 'LS' },
      { tanggal: '2026-01-15', jumlah: 500000, kode_rekening_id: 1, jenis: 'GU' }
    ]
    const penerimaan = []

    exportLPJAdministratifPdf(0, 2026, allSubKegiatan, pengeluaran, penerimaan)

    expect(jsPDF).toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('LPJ_Administratif_JANUARI_2026.pdf'))
    expect(autoTable).toHaveBeenCalled()
  })

  it('exportBKUPdf should initialize jsPDF and call save', () => {
    const rows = [{ tanggal: '2026-01-01', uraian: 'Test', debet: 1000, kredit: 0 }]
    exportBKUPdf(rows, 0, 2026)
    
    expect(jsPDF).toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('BKU_JANUARI_2026.pdf'))
    expect(autoTable).toHaveBeenCalled()
  })

  it('exportBKUTriwulanPdf should use monthly BKU base and add temporary closing row before totals', () => {
    const rows = [
      { tanggal: '2026-04-01', uraian: 'April', debet: 2000, kredit: 0 },
      { tanggal: '2026-05-01', uraian: 'Mei', debet: 0, kredit: 500 }
    ]

    exportBKUTriwulanPdf(rows, 3, 2026, { debet: 1000, kredit: 0 }, '2026-04-30')

    expect(jsPDF).toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith('BKU_APRIL_2026.pdf')
    expect(autoTable).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      body: expect.arrayContaining([
        expect.arrayContaining(['April']),
        expect.arrayContaining(['Mei']),
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Buku Kas Umum Kami tutup sementara'),
            colSpan: 6
          })
        ])
      ]),
      foot: expect.arrayContaining([
        expect.arrayContaining([
          expect.objectContaining({ content: 'Jumlah bulan ini' }),
          expect.objectContaining({ content: '2.000' }),
          expect.objectContaining({ content: '500' })
        ]),
        expect.arrayContaining([
          expect.objectContaining({ content: 'Jumlah s/d bulan lalu' }),
          expect.objectContaining({ content: '1.000' }),
          expect.objectContaining({ content: '0' })
        ]),
        expect.arrayContaining([
          expect.objectContaining({ content: 'Saldo Buku' }),
          expect.objectContaining({ content: '2.500' })
        ])
      ])
    }))
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

  it('exportBAPemeriksaanKasPdf should render successfully in browser mode with valid date', async () => {
    // Pastikan window.api undefined untuk menguji mode browser
    const originalApi = window.api
    delete window.api

    await exportBAPemeriksaanKasPdf(0, 2026, 15000000, '2026-01-15')

    expect(jsPDF).toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('BA_Pemeriksaan_Kas_JANUARI_2026.pdf'))

    window.api = originalApi
  })

  it('exportBAPemeriksaanKasPdf should fallback to end of month with empty date string without crashing', async () => {
    const originalApi = window.api
    delete window.api

    // Kirim tanggal kosong ""
    await exportBAPemeriksaanKasPdf(0, 2026, 15000000, '')

    expect(jsPDF).toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('BA_Pemeriksaan_Kas_JANUARI_2026.pdf'))

    window.api = originalApi
  })

  it('exportBAPemeriksaanKasPdf should fallback to end of month with invalid date string without crashing', async () => {
    const originalApi = window.api
    delete window.api

    // Kirim tanggal tidak valid
    await exportBAPemeriksaanKasPdf(0, 2026, 15000000, 'invalid-date-string')

    expect(jsPDF).toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith(expect.stringContaining('BA_Pemeriksaan_Kas_JANUARI_2026.pdf'))

    window.api = originalApi
  })

  it('exportBAPemeriksaanKasPdf should use Electron API printToPdf when available', async () => {
    const mockPrintToPdf = vi.fn().mockResolvedValue({ success: true })
    window.api = {
      printToPdf: mockPrintToPdf
    }

    await exportBAPemeriksaanKasPdf(0, 2026, 15000000, '2026-01-20')

    expect(mockPrintToPdf).toHaveBeenCalledWith(expect.objectContaining({
      pageSize: 'Legal',
      defaultPath: 'BA_Pemeriksaan_Kas_JANUARI_2026.pdf'
    }))

    delete window.api
  })
})

