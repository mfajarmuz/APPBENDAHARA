export const getBkuRows = (penerimaan, pengeluaran) => {
  const combined = [
    ...penerimaan.map(p => {
      let prefix = 'Diterima Penerimaan LS'
      if (p.jenis === 'UP') prefix = 'Diterima Penerimaan UP'
      if (p.jenis === 'GU') prefix = 'Diterima Penerimaan GU'
      
      const subK = p.sub_kegiatan
      const rek = p.kode_rekening
      const fullCode = subK && rek ? `${subK.kode}.${rek.kode}` : ''

      return {
        id: p.id,
        tanggal: p.tanggal,
        jenis: p.jenis,
        uraian: p.jenis === 'Pajak' 
          ? p.keterangan 
          : `${prefix} ${p.no_sp2d || ''} ${p.keterangan || ''}`.trim(),
        no_bukti: p.no_sp2d,
        debet: p.jumlah,
        kredit: 0,
        kode_rekening: fullCode,
        type: 'in'
      }
    }),
    ...pengeluaran.map(p => {
      const subK = p.sub_kegiatan
      const rek = p.kode_rekening
      const fullCode = subK && rek ? `${subK.kode}.${rek.kode}` : ''

      const rincianText = p.pengeluaran_rincian?.length > 0
        ? p.pengeluaran_rincian.map(r => `${r.uraian}${r.volume ? ` (${r.volume})` : ''}`).join(', ')
        : p.keterangan || 'Belanja'
      
      const isSetoranPajak = rincianText.startsWith('Setoran PP')

      return {
        id: p.id,
        tanggal: p.tanggal,
        jenis: isSetoranPajak ? 'Setoran Pajak' : 'Pengeluaran',
        uraian: rincianText.trim(),
        no_bukti: p.no_bukti,
        debet: 0,
        kredit: p.jumlah,
        kode_rekening: fullCode,
        type: 'out'
      }
    })
  ].sort((a, b) => {
    // 1. Tanggal
    const dateDiff = new Date(a.tanggal) - new Date(b.tanggal)
    if (dateDiff !== 0) return dateDiff
    
    // 2. No Bukti (handling null/undefined as empty string)
    const noA = a.no_bukti || ''
    const noB = b.no_bukti || ''
    
    // 3. Priority (LS -> Pengeluaran -> Pajak -> Setoran Pajak)
    // We explicitly match the logic in Laporan.jsx but add UP/GU to the map
    if (noA === noB) {
      const priority = { 'UP': 0, 'GU': 0, 'LS': 1, 'Pengeluaran': 2, 'Pajak': 3, 'Setoran Pajak': 4 }
      const pA = priority[a.jenis] || 5
      const pB = priority[b.jenis] || 5
      if (pA !== pB) return pA - pB
    }
    
    const noDiff = noA.localeCompare(noB)
    if (noDiff !== 0) return noDiff

    // 4. Stable Fallback: ID and Type
    // If everything else is identical, sort by ID to ensure stable ordering across components
    if (a.id !== b.id) return String(a.id).localeCompare(String(b.id))
    return a.type.localeCompare(b.type)
  })

  return combined
}
