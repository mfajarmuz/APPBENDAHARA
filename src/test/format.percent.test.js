import { describe, it, expect } from 'vitest'
import { persen } from '@/lib/format'

describe('persen rounding behavior', () => {
  it('uses floor rounding for partial percentages', () => {
    expect(persen(2, 3)).toBe(66)
    expect(persen(1, 3)).toBe(33)
  })
  it('caps at 100 when realisasi > pagu', () => {
    expect(persen(2000, 1000)).toBe(100)
  })
})
