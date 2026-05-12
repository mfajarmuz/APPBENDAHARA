export const getBkuRows = (penerimaan, pengeluaran) => {
  const combined = [
    ...penerimaan.map(p => {
      const subK = p.sub_kegiatan
      const rek = p.kode_rekening
      let fullCode = subK && rek ? `${subK.kode}.${rek.kode}` : ''
      const sortRek = fullCode
      
      if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') {
        fullCode = 'Pajak'
      }

      return {
        id: p.id,
        tanggal: p.tanggal,
        jenis: p.jenis,
        uraian: p.keterangan || '',
        no_bukti: p.nomor_ls || '',
        debet: p.jumlah,
        kredit: 0,
        kode_rekening: fullCode,
        sort_rekening: sortRek,
        urutan: p.urutan || 0,
        type: 'in'
      }
    }),
    ...pengeluaran.map(p => {
      const subK = p.sub_kegiatan
      const rek = p.kode_rekening
      let fullCode = subK && rek ? `${subK.kode}.${rek.kode}` : ''
      const sortRek = fullCode

      const rincianText = p.pengeluaran_rincian?.length > 0
        ? p.pengeluaran_rincian.map(r => `${r.uraian}${r.volume ? ` (${r.volume})` : ''}`).join(', ')
        : p.keterangan || 'Belanja'
      
      const isSetoranPajak = rincianText.startsWith('Setoran PP') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS' || rincianText.toLowerCase().includes('dibayar pp')

      if (isSetoranPajak) {
        fullCode = 'Pajak'
      }

      return {
        id: p.id,
        tanggal: p.tanggal,
        jenis: isSetoranPajak ? 'Setoran Pajak' : 'Pengeluaran',
        uraian: rincianText.trim(),
        no_bukti: p.no_bukti || '',
        debet: 0,
        kredit: p.jumlah,
        kode_rekening: fullCode,
        sort_rekening: sortRek,
        urutan: p.urutan || 0,
        type: 'out'
      }
    })
  ]

  return combined.sort((a, b) => {
    // 1. Tanggal (Prioritas Utama)
    const dateDiff = new Date(a.tanggal) - new Date(b.tanggal)
    if (dateDiff !== 0) return dateDiff
    
    // 2. Urutan Manual (Jika sudah diatur via Drag & Drop)
    if (a.urutan !== b.urutan) {
      return (a.urutan || 0) - (b.urutan || 0)
    }

    // 3. Kode Rekening (Dasar Pengurutan / Fallback)
    const rekA = a.sort_rekening || ''
    const rekB = b.sort_rekening || ''
    return rekA.localeCompare(rekB)
  })
}



