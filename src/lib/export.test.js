import { vi } from 'vitest'

vi.mock('xlsx', () => {
  return {
    writeFile: vi.fn(),
    utils: {
      json_to_sheet: (data) => ({}),
      aoa_to_sheet: (data) => ({ '!ref': 'A1:A1' }),
      decode_range: (ref) => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }),
      encode_cell: (cell) => 'A1',
      book_new: () => ({}),
      book_append_sheet: () => {},
    },
  }
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as XLSX from 'xlsx'
import { exportBKUExcel, exportLPJExcel } from '@/lib/export-excel'

describe('exportBKUExcel', () => {
  beforeEach(() => {})
  afterEach(() => { vi.resetAllMocks() })

  it('writes file and returns filename', () => {
    const res = exportBKUExcel([{ tanggal: '2026-01-01', uraian: 'u', debet: 1000, kredit: 0 }])
    expect(XLSX.writeFile).toHaveBeenCalled()
    expect(res).toBe('BKU.xlsx')
  })
})

describe('exportLPJExcel', () => {
  beforeEach(() => {})
  afterEach(() => { vi.resetAllMocks() })

  it('calls XLSX.writeFile with correct parameters', () => {
    const res = exportLPJExcel(
      3,
      2026,
      [{ kode: '5.01', nama: 'Sub', kode_rekening: [{ id: '1', kode: '5.1', uraian: 'U', pagu_anggaran: 100000 }] }],
      [{ kode_rekening_id: '1', jenis: 'LS', jumlah: 50000, tanggal: '2026-04-10' }],
      [],
      '2026-04-30',
      { unit_kerja: 'SKPD Test' }
    )
    expect(XLSX.writeFile).toHaveBeenCalled()
    expect(res).toBe('LPJ_Administratif_April_2026.xlsx')
  })
})
