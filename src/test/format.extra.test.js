import { describe, it, expect } from 'vitest'
import { parseRupiah } from '@/lib/format'

describe('parseRupiah negative amounts', () => {
  it('parses negative amounts with leading -', () => {
    expect(parseRupiah('-Rp 1.000')).toBe(-1000)
  })
})
