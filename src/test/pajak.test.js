import { describe, it, expect } from 'vitest'

// Helper sederhana untuk mensimulasikan logika yang akan ada di komponen
function hitungPajak(bruto, kategori, hasNpwp = true, golongan = 'III') {
  const isPpnKategori = ['barang', 'jasa', 'konstruksi'].includes(kategori)
  
  let dpp = bruto
  let ppn = 0
  
  if (isPpnKategori) {
    dpp = Math.round(bruto / 1.11)
    ppn = Math.round(dpp * 0.11)
  }

  let pph = 0
  let jenisPph = '-'

  switch (kategori) {
    case 'barang':
      jenisPph = 'PPh 22'
      const tarif22 = hasNpwp ? 0.015 : 0.03
      pph = Math.round(dpp * tarif22)
      break
    case 'jasa':
      jenisPph = 'PPh 23'
      const tarif23 = hasNpwp ? 0.02 : 0.04
      pph = Math.round(dpp * tarif23)
      break
    case 'honor':
      jenisPph = 'PPh 21 Final'
      const tarif21 = golongan === 'IV' ? 0.15 : golongan === 'III' ? 0.05 : 0
      pph = Math.round(bruto * tarif21)
      break
    case 'sewa':
      jenisPph = 'PPh 4(2)'
      pph = Math.round(dpp * 0.1)
      break
    case 'konstruksi':
      jenisPph = 'PPh 4(2)'
      const tarifKonst = hasNpwp ? 0.02 : 0.04
      pph = Math.round(dpp * tarifKonst)
      break
  }

  return { dpp, ppn, pph, jenisPph, netto: bruto - ppn - pph }
}

describe('Logika Kalkulator Pajak Indonesia', () => {
  it('harus menghitung PPN & PPh 22 dengan benar (NPWP)', () => {
    // Bruto 1.110.000 -> DPP 1.000.000, PPN 110.000, PPh 22 (1.5%) 15.000
    const res = hitungPajak(1110000, 'barang', true)
    expect(res.dpp).toBe(1000000)
    expect(res.ppn).toBe(110000)
    expect(res.pph).toBe(15000)
    expect(res.netto).toBe(985000)
  })

  it('harus menghitung PPh 23 dengan tarif 100% lebih tinggi jika Non-NPWP', () => {
    // Bruto 1.110.000 -> DPP 1.000.000, PPh 23 (4% instead of 2%)
    const res = hitungPajak(1110000, 'jasa', false)
    expect(res.pph).toBe(40000)
  })

  it('harus menghitung PPh 21 Final berdasarkan Golongan', () => {
    // Honor 1.000.000 Gol IV (15%)
    const resIV = hitungPajak(1000000, 'honor', true, 'IV')
    expect(resIV.pph).toBe(150000)
    
    // Honor 1.000.000 Gol III (5%)
    const resIII = hitungPajak(1000000, 'honor', true, 'III')
    expect(resIII.pph).toBe(50000)
  })

  it('harus menghitung PPh Pasal 4 ayat 2 Sewa Bangunan (10%)', () => {
    const res = hitungPajak(1000000, 'sewa')
    expect(res.pph).toBe(100000)
  })
})
