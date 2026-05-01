import { vi } from 'vitest'

vi.mock('xlsx', () => {
  return {
    writeFile: vi.fn(),
    utils: {
      json_to_sheet: (data) => ({}),
      book_new: () => ({}),
      book_append_sheet: () => {},
    },
  }
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as XLSX from 'xlsx'
import { exportBKUExcel } from '@/lib/export-excel'

describe('exportBKUExcel', () => {
  beforeEach(() => {})
  afterEach(() => { vi.resetAllMocks() })

  it('writes file and returns filename', () => {
    const res = exportBKUExcel([{ tanggal: '2026-01-01', uraian: 'u', debet: 1000, kredit: 0 }])
    expect(XLSX.writeFile).toHaveBeenCalled()
    expect(res).toBe('BKU.xlsx')
  })
})
