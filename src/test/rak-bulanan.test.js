import { describe, it, expect } from 'vitest'

// Helper untuk disimulasikan dari logic Pengeluaran.jsx
function parseBulan(tanggalStr) {
  const d = new Date(tanggalStr)
  return d.getMonth() // 0 = Jan, 11 = Des
}

function hitungRAKAccumulated(rek, bulanIndex) {
  const rakMonths = [
    rek.rak_jan || 0,
    rek.rak_feb || 0,
    rek.rak_mar || 0,
    rek.rak_apr || 0,
    rek.rak_mei || 0,
    rek.rak_jun || 0,
    rek.rak_jul || 0,
    rek.rak_agu || 0,
    rek.rak_sep || 0,
    rek.rak_okt || 0,
    rek.rak_nov || 0,
    rek.rak_des || 0
  ]
  let sum = 0
  for (let i = 0; i <= bulanIndex; i++) {
    sum += rakMonths[i]
  }
  return sum
}

function validasiRAKBelanja(amount, jenis, rek, tanggalStr, realisasiSebelumnya) {
  // Transaksi pajak dikecualikan dari batasan RAK
  if (jenis === 'Pajak' || jenis === 'Pajak LS') {
    return { success: true }
  }

  const bulanIdx = parseBulan(tanggalStr)
  const limitAkumulatif = hitungRAKAccumulated(rek, bulanIdx)
  const sisaTersedia = limitAkumulatif - realisasiSebelumnya

  if (amount > sisaTersedia) {
    return { 
      success: false, 
      error: `Jumlah pengeluaran melebihi sisa alokasi RAK s.d bulan berjalan. Sisa RAK tersedia: ${sisaTersedia}`
    }
  }

  return { success: true, sisaTersedia: sisaTersedia - amount }
}

function autoSplitRAK(pagu) {
  const base = Math.floor(pagu / 12)
  const rem = pagu % 12
  return [
    base, base, base, base, base, base,
    base, base, base, base, base, base + rem
  ]
}

describe('Sistem Rencana Anggaran Kas (RAK) Belanja Bulanan', () => {
  const dummyRekening = {
    kode: '5.1.02.01.001.00043',
    uraian: 'Belanja Natura dan Pakan-Natura',
    pagu_anggaran: 12000000,
    rak_jan: 1000000,
    rak_feb: 1000000,
    rak_mar: 1000000,
    rak_apr: 1000000,
    rak_mei: 1000000,
    rak_jun: 1000000,
    rak_jul: 1000000,
    rak_agu: 1000000,
    rak_sep: 1000000,
    rak_okt: 1000000,
    rak_nov: 1000000,
    rak_des: 1000000
  }

  it('harus mem-parsing bulan dari string tanggal dengan benar', () => {
    expect(parseBulan('2026-01-15')).toBe(0) // Januari
    expect(parseBulan('2026-06-30')).toBe(5) // Juni
    expect(parseBulan('2026-12-25')).toBe(11) // Desember
  })

  it('harus menghitung batas anggaran kas akumulatif bulanan dengan benar', () => {
    // Q1 s.d Maret (Jan+Feb+Mar = 1M + 1M + 1M)
    expect(hitungRAKAccumulated(dummyRekening, 2)).toBe(3000000)
    
    // Q2 s.d Juni (Jan s.d Jun = 6M)
    expect(hitungRAKAccumulated(dummyRekening, 5)).toBe(6000000)
    
    // Q4 s.d Desember (Jan s.d Des = 12M)
    expect(hitungRAKAccumulated(dummyRekening, 11)).toBe(12000000)
  })

  it('harus meloloskan transaksi yang valid di bawah batas RAK', () => {
    // Transaksi Maret sebesar 1.500.000, realisasi sebelumnya 1.000.000 (Batas Jan+Feb+Mar = 3M, sisa = 2M)
    const result = validasiRAKBelanja(1500000, 'GU', dummyRekening, '2026-03-10', 1000000)
    expect(result.success).toBe(true)
    expect(result.sisaTersedia).toBe(500000)
  })

  it('harus menolak transaksi yang melebihi batas RAK bulanan', () => {
    // Transaksi Maret sebesar 2.500.000, realisasi sebelumnya 1.000.000 (Batas Jan+Feb+Mar = 3M, sisa = 2M) -> Over
    const result = validasiRAKBelanja(2500000, 'GU', dummyRekening, '2026-03-10', 1000000)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Jumlah pengeluaran melebihi sisa alokasi RAK')
  })

  it('harus mengecualikan transaksi Pajak dari validasi batas RAK', () => {
    // Transaksi Pajak maret sebesar 5.000.000 (Batas sisa RAK tersisa 2M) -> Harus tetap Lolos
    const result = validasiRAKBelanja(5000000, 'Pajak', dummyRekening, '2026-03-10', 1000000)
    expect(result.success).toBe(true)
  })

  it('harus mendistribusikan anggaran kas rata per bulan menggunakan algoritma Auto-Split', () => {
    const paguTotal = 10000004
    const alokasi = autoSplitRAK(paguTotal)
    
    // 10.000.004 / 12 = 833.333 sisa 8.
    // 11 Bulan pertama: 833.333
    // Bulan ke-12 (Desember): 833.333 + 8 = 833.341
    expect(alokasi[0]).toBe(833333)
    expect(alokasi[11]).toBe(833341)
    
    const sum = alokasi.reduce((a, b) => a + b, 0)
    expect(sum).toBe(paguTotal)
  })

  it('harus hanya mengabaikan transaksi di bulan-bulan mendatang saat menghitung realisasi akumulatif', () => {
    const listPengeluaran = [
      { id: '1', kode_rekening_id: 'rek-1', tanggal: '2026-01-10', jumlah: 5000000, jenis: 'GU' },
      { id: '2', kode_rekening_id: 'rek-1', tanggal: '2026-02-15', jumlah: 2000000, jenis: 'GU' },
      { id: '3', kode_rekening_id: 'rek-1', tanggal: '2026-05-20', jumlah: 50000000, jenis: 'GU' } // Masa depan (Mei)
    ]

    // Saat mengedit/menginput transaksi di Februari (target: 2026-02-15, bulan index 1)
    const targetMonth = 1
    const targetYear = 2026

    const realisasiSdBulanFeb = listPengeluaran
      .filter(p => {
        const parts = p.tanggal.split('-')
        const pYear = parseInt(parts[0], 10)
        const pMonth = parseInt(parts[1], 10) - 1
        return pYear === targetYear && pMonth <= targetMonth
      })
      .reduce((sum, p) => sum + p.jumlah, 0)

    // Harus 5.000.000 (Jan) + 2.000.000 (Feb) = 7.000.000, transaksi Mei (50M) diabaikan
    expect(realisasiSdBulanFeb).toBe(7000000)
  })
})
