import { describe, it, expect } from 'vitest'
import { formatRupiah, formatTanggal, parseRupiah, persen } from '@/lib/format'

describe('formatRupiah', () => {
  it('formats zero', () => {
    expect(formatRupiah(0)).toMatch(/Rp.?0/)
  })
  it('formats millions', () => {
    expect(formatRupiah(1000000)).toContain('1.000.000')
  })
  it('returns Rp 0 for null', () => {
    expect(formatRupiah(null)).toMatch(/Rp.?0/)
  })
})

describe('parseRupiah', () => {
  it('strips non-digits', () => {
    expect(parseRupiah('Rp 1.500.000')).toBe(1500000)
  })
  it('returns 0 for empty string', () => {
    expect(parseRupiah('')).toBe(0)
  })
  it('handles international decimal separator', () => {
    expect(parseRupiah('Rp 1500.50')).toBe(1500)
    expect(parseRupiah('1,500.25')).toBe(1500)
  })
  it('handles local decimal separator', () => {
    expect(parseRupiah('Rp 1.500.000,50')).toBe(1500000)
    expect(parseRupiah('1.500,00')).toBe(1500)
  })
})

describe('persen', () => {
  it('calculates percentage', () => {
    expect(persen(500000, 1000000)).toBe(50)
  })
  it('caps at 100', () => {
    expect(persen(2000000, 1000000)).toBe(100)
  })
  it('returns 0 when pagu is 0', () => {
    expect(persen(100, 0)).toBe(0)
  })
})

describe('formatTanggal', () => {
  it('returns dash for null', () => {
    expect(formatTanggal(null)).toBe('-')
  })
  it('returns dash for invalid date', () => {
    expect(formatTanggal('Invalid-Date')).toBe('-')
  })
  it('formats date string', () => {
    const result = formatTanggal('2026-01-15')
    expect(result).toContain('2026')
    expect(result).toContain('15')
  })
})
