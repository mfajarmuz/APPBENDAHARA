import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName } from './utils'

/**
 * [FITUR: EXPORT PDF - LPJ ADMINISTRATIF]
 */
export function exportLPJAdministratifPdf(monthIndex, year, allSubKegiatan, pengeluaran, penerimaan, customDate = null) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [330, 215] })
  const monthName = getMonthName(monthIndex); const settings = useStore.getState().settings
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

  // --- HEADER ---
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PROVINSI JAWA BARAT', 165, 10, { align: 'center' })
  doc.setFontSize(11); doc.text('LAPORAN PERTANGGUNGJAWABAN BENDAHARA PENGELUARAN PEMBANTU', 165, 15, { align: 'center' })
  doc.setFontSize(10); doc.text('(Administratif)', 165, 20, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); const startY = 30
  doc.text('SKPD', 14, startY); doc.text(`: ${settings.unit_kerja || ''}`, 75, startY)
  doc.text('KUASA PENGGUNA ANGGARAN', 14, startY + 5); doc.text(`: ${settings.kpa_nama || ''}`, 75, startY + 5)
  doc.text('BENDAHARA PENGELUARAN PEMBANTU', 14, startY + 10); doc.text(`: ${settings.bpp_nama || ''}`, 75, startY + 10)
  doc.text('TAHUN ANGGARAN', 14, startY + 15); doc.text(`: ${year}`, 75, startY + 15)
  doc.text('BULAN', 14, startY + 20); doc.text(`: ${monthName} ${year}`, 75, startY + 20)

  // --- LOGIC & CALCULATIONS ---
  const filterByJenisTime = (items, jenisList, isIni) => items.filter(p => {
    const d = new Date(p.tanggal); const m = d.getMonth(); const y = d.getFullYear()
    const matchesJenis = jenisList.includes(p.jenis)
    if (isIni) {
      const cutoff = customDate ? new Date(customDate) : new Date(year, monthIndex + 1, 0)
      cutoff.setHours(23, 59, 59, 999)
      return matchesJenis && (y === year && m === monthIndex && d <= cutoff)
    }
    return matchesJenis && (y < year || (y === year && m < monthIndex))
  })
  const sumJ = (items) => items.reduce((s, p) => s + p.jumlah, 0)
  const sumP = (items, jenisList, isIni) => sumJ(filterByJenisTime(items, jenisList, isIni))

  const body = []
  let globalTotals = { pagu: 0, ls: { lalu: 0, ini: 0, sd: 0 }, gu: { lalu: 0, ini: 0, sd: 0 }, totalSd: 0 }

  allSubKegiatan.forEach((sk) => {
    let skTotals = { pagu: 0, ls: { lalu: 0, ini: 0, sd: 0 }, gu: { lalu: 0, ini: 0, sd: 0 }, totalSd: 0 }
    const subBody = []
    ;(sk.kode_rekening || []).forEach((rek) => {
      const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
      const lsL = sumJ(filterByJenisTime(rp, ['LS'], false)); const lsI = sumJ(filterByJenisTime(rp, ['LS'], true)); const lsS = lsL + lsI
      const guL = sumJ(filterByJenisTime(rp, ['GU', 'UP', 'TU', 'KKPD'], false)); const guI = sumJ(filterByJenisTime(rp, ['GU', 'UP', 'TU', 'KKPD'], true)); const guS = guL + guI
      const tS = lsS + guS
      const cp = (rek.kode || '').split('.'); while (cp.length < 6) cp.push('')
      subBody.push([...cp.map(p => ({ content: p, styles: { halign: 'center' } })), { content: rek.uraian, styles: { overflow: 'linebreak' } }, formatRupiah(rek.pagu_anggaran).replace('Rp', '').trim(), '-', '-', '-', lsL > 0 ? formatRupiah(lsL).replace('Rp', '').trim() : '-', lsI > 0 ? formatRupiah(lsI).replace('Rp', '').trim() : '-', lsS > 0 ? formatRupiah(lsS).replace('Rp', '').trim() : '-', guL > 0 ? formatRupiah(guL).replace('Rp', '').trim() : '-', guI > 0 ? formatRupiah(guI).replace('Rp', '').trim() : '-', guS > 0 ? formatRupiah(guS).replace('Rp', '').trim() : '-', tS > 0 ? formatRupiah(tS).replace('Rp', '').trim() : '-', formatRupiah(rek.pagu_anggaran - tS).replace('Rp', '').trim()])
      skTotals.pagu += (rek.pagu_anggaran || 0); skTotals.ls.lalu += lsL; skTotals.ls.ini += lsI; skTotals.ls.sd += lsS; skTotals.gu.lalu += guL; skTotals.gu.ini += guI; skTotals.gu.sd += guS; skTotals.totalSd += tS
    })
    body.push([
      { content: sk.kode, colSpan: 6, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: sk.nama, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: skTotals.pagu > 0 ? formatRupiah(skTotals.pagu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: '-', styles: { fillColor: [240, 240, 240], halign: 'center' } },
      { content: '-', styles: { fillColor: [240, 240, 240], halign: 'center' } },
      { content: '-', styles: { fillColor: [240, 240, 240], halign: 'center' } },
      { content: skTotals.ls.lalu > 0 ? formatRupiah(skTotals.ls.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.ls.ini > 0 ? formatRupiah(skTotals.ls.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.ls.sd > 0 ? formatRupiah(skTotals.ls.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.gu.lalu > 0 ? formatRupiah(skTotals.gu.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.gu.ini > 0 ? formatRupiah(skTotals.gu.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.gu.sd > 0 ? formatRupiah(skTotals.gu.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.totalSd > 0 ? formatRupiah(skTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: (skTotals.pagu - skTotals.totalSd) > 0 ? formatRupiah(skTotals.pagu - skTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }
    ])
    body.push(...subBody)
    globalTotals.pagu += skTotals.pagu; globalTotals.ls.lalu += skTotals.ls.lalu; globalTotals.ls.ini += skTotals.ls.ini; globalTotals.ls.sd += skTotals.ls.sd; globalTotals.gu.lalu += skTotals.gu.lalu; globalTotals.gu.ini += skTotals.gu.ini; globalTotals.gu.sd += skTotals.gu.sd; globalTotals.totalSd += skTotals.totalSd
  })

  // 1. JUMLAH Row
  body.push([
    { content: 'JUMLAH', colSpan: 7, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: globalTotals.pagu > 0 ? formatRupiah(globalTotals.pagu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: '-', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: '-', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: '-', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: globalTotals.ls.lalu > 0 ? formatRupiah(globalTotals.ls.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.ls.ini > 0 ? formatRupiah(globalTotals.ls.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.ls.sd > 0 ? formatRupiah(globalTotals.ls.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.gu.lalu > 0 ? formatRupiah(globalTotals.gu.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.gu.ini > 0 ? formatRupiah(globalTotals.gu.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.gu.sd > 0 ? formatRupiah(globalTotals.gu.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.totalSd > 0 ? formatRupiah(globalTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: (globalTotals.pagu - globalTotals.totalSd) > 0 ? formatRupiah(globalTotals.pagu - globalTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } }
  ])

  const makeSumRow = (label, lsAgg, guAgg, isBold = false) => {
    const r = new Array(13).fill('-')
    r[0] = { content: label, colSpan: 7, styles: { fontStyle: isBold ? 'bold' : 'normal' } }
    r[5] = lsAgg.lalu > 0 ? formatRupiah(lsAgg.lalu).replace('Rp', '').trim() : '-'
    r[6] = lsAgg.ini > 0 ? formatRupiah(lsAgg.ini).replace('Rp', '').trim() : '-'
    r[7] = lsAgg.sd > 0 ? formatRupiah(lsAgg.sd).replace('Rp', '').trim() : '-'
    r[8] = guAgg.lalu > 0 ? formatRupiah(guAgg.lalu).replace('Rp', '').trim() : '-'
    r[9] = guAgg.ini > 0 ? formatRupiah(guAgg.ini).replace('Rp', '').trim() : '-'
    r[10] = guAgg.sd > 0 ? formatRupiah(guAgg.sd).replace('Rp', '').trim() : '-'
    const tSd = lsAgg.sd + guAgg.sd
    r[11] = tSd > 0 ? formatRupiah(tSd).replace('Rp', '').trim() : '-'
    return r
  }
  
  const zero = { lalu: 0, ini: 0, sd: 0 }
  const isTaxFromLS = (p) => (p.jenis === 'Pajak LS' || p.jenis === 'LS' || !!p.no_sp2d || !!p.nomor_ls)

  const getTaxAgg = (regex) => {
    const items = penerimaan.filter(p => (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(p.keterangan || ''))
    const lsItems = items.filter(p => isTaxFromLS(p)); const guItems = items.filter(p => !isTaxFromLS(p))
    return {
      ls: { lalu: sumP(lsItems, ['Pajak', 'Pajak LS'], false), ini: sumP(lsItems, ['Pajak', 'Pajak LS'], true), sd: sumP(lsItems, ['Pajak', 'Pajak LS'], false) + sumP(lsItems, ['Pajak', 'Pajak LS'], true) },
      gu: { lalu: sumP(guItems, ['Pajak', 'Pajak LS'], false), ini: sumP(guItems, ['Pajak', 'Pajak LS'], true), sd: sumP(guItems, ['Pajak', 'Pajak LS'], false) + sumP(guItems, ['Pajak', 'Pajak LS'], true) }
    }
  }
  
  const getTaxSetoranAgg = (regex) => {
    const items = pengeluaran.filter(p => { const u = p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || ''; return (u.startsWith('Setoran') || u.startsWith('Dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(u) })
    const lsItems = items.filter(p => isTaxFromLS(p)); const guItems = items.filter(p => !isTaxFromLS(p))
    const jl = ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS']
    return {
      ls: { lalu: sumP(lsItems, jl, false), ini: sumP(lsItems, jl, true), sd: sumP(lsItems, jl, false) + sumP(lsItems, jl, true) },
      gu: { lalu: sumP(guItems, jl, false), ini: sumP(guItems, jl, true), sd: sumP(guItems, jl, false) + sumP(guItems, jl, true) }
    }
  }

  const taxTypes = [{ label: '    a. PPN', regex: /PPN/i }, { label: '    b. PPh.- 21', regex: /PPh\s*21/i }, { label: '    c. PPh.- 22', regex: /PPh\s*22/i }, { label: '    d. PPh.- 23', regex: /PPh\s*23/i }, { label: '    e. PPh. Psl 4 (Ayat 2)', regex: /PPh\s*(?:Pasal\s*)?4/i }]
  body.push([{ content: 'Penerimaan', colSpan: 19, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }])
  const penLS = { lalu: sumP(penerimaan, ['LS'], false), ini: sumP(penerimaan, ['LS'], true), sd: sumP(penerimaan, ['LS'], false) + sumP(penerimaan, ['LS'], true) }
  const penGU = { lalu: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], false), ini: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], true), sd: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], false) + sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], true) }
  body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', penLS, penGU, true))
  const jTs = [['    a. UP', ['UP']], ['    b. GU', ['GU']], ['    c. TU', ['TU']], ['    d. LS', ['LS']], ['    e. KKPD', ['KKPD']]]
  jTs.forEach(jt => { const isLS = jt[1][0] === 'LS'; const a = { lalu: sumP(penerimaan, jt[1], false), ini: sumP(penerimaan, jt[1], true), sd: sumP(penerimaan, jt[1], false) + sumP(penerimaan, jt[1], true) }; body.push(makeSumRow(jt[0], isLS ? a : zero, isLS ? zero : a)) })
  const taxPotonganTotal = { ls: { ...zero }, gu: { ...zero } }
  const taxPotonganRows = taxTypes.map(tt => { const a = getTaxAgg(tt.regex); taxPotonganTotal.ls.lalu += a.ls.lalu; taxPotonganTotal.ls.ini += a.ls.ini; taxPotonganTotal.ls.sd += a.ls.sd; taxPotonganTotal.gu.lalu += a.gu.lalu; taxPotonganTotal.gu.ini += a.gu.ini; taxPotonganTotal.gu.sd += a.gu.sd; return makeSumRow(tt.label, a.ls, a.gu) })
  body.push(makeSumRow(' - Potongan Pajak', taxPotonganTotal.ls, taxPotonganTotal.gu, true)); body.push(...taxPotonganRows)
  const totalPenerimaanAgg = { ls: { lalu: penLS.lalu + taxPotonganTotal.ls.lalu, ini: penLS.ini + taxPotonganTotal.ls.ini, sd: penLS.sd + taxPotonganTotal.ls.sd }, gu: { lalu: penGU.lalu + taxPotonganTotal.gu.lalu, ini: penGU.ini + taxPotonganTotal.gu.ini, sd: penGU.sd + taxPotonganTotal.gu.sd } }
  body.push(makeSumRow('Jumlah Penerimaan', totalPenerimaanAgg.ls, totalPenerimaanAgg.gu, true))
  body.push([{ content: 'Pengeluaran', colSpan: 19, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }])
  body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', globalTotals.ls, globalTotals.gu, true))
  jTs.forEach(jt => { const isL = jt[1][0] === 'LS'; const a = { lalu: sumJ(filterByJenisTime(pengeluaran, jt[1], false)), ini: sumJ(filterByJenisTime(pengeluaran, jt[1], true)), sd: sumJ(filterByJenisTime(pengeluaran, jt[1], false)) + sumJ(filterByJenisTime(pengeluaran, jt[1], true)) }; body.push(makeSumRow(jt[0], isL ? a : zero, isL ? zero : a)) })
  const taxSetoranTotal = { ls: { ...zero }, gu: { ...zero } }
  const taxSetoranRows = taxTypes.map(tt => { const a = getTaxSetoranAgg(tt.regex); taxSetoranTotal.ls.lalu += a.ls.lalu; taxSetoranTotal.ls.ini += a.ls.ini; taxSetoranTotal.ls.sd += a.ls.sd; taxSetoranTotal.gu.lalu += a.gu.lalu; taxSetoranTotal.gu.ini += a.gu.ini; taxSetoranTotal.gu.sd += a.gu.sd; return makeSumRow(tt.label, a.ls, a.gu) })
  body.push(makeSumRow(' - Penyetoran Pajak', taxSetoranTotal.ls, taxSetoranTotal.gu, true)); body.push(...taxSetoranRows)
  const totalPengeluaranAgg = { ls: { lalu: globalTotals.ls.lalu + taxSetoranTotal.ls.lalu, ini: globalTotals.ls.ini + taxSetoranTotal.ls.ini, sd: globalTotals.ls.sd + taxSetoranTotal.ls.sd }, gu: { lalu: globalTotals.gu.lalu + taxSetoranTotal.gu.lalu, ini: globalTotals.gu.ini + taxSetoranTotal.gu.ini, sd: globalTotals.gu.sd + taxSetoranTotal.gu.sd } }
  body.push(makeSumRow('Jumlah Pengeluaran', totalPengeluaranAgg.ls, totalPengeluaranAgg.gu, true))
  const saldoKasRiil = (totalPenerimaanAgg.ls.sd + totalPenerimaanAgg.gu.sd) - (totalPengeluaranAgg.ls.sd + totalPengeluaranAgg.gu.sd)
  const sR = new Array(3).fill('-'); sR[0] = { content: 'Saldo Kas', colSpan: 17, styles: { fontStyle: 'bold', halign: 'right' } }; sR[1] = formatRupiah(saldoKasRiil).replace('Rp', '').trim(); body.push(sR)
  const head = [[{ content: 'Kode Rekening', rowSpan: 2, colSpan: 6 }, { content: 'Uraian', rowSpan: 2 }, { content: 'JUMLAH ANGGARAN', rowSpan: 2 }, { content: 'SPJ - LS GAJI', colSpan: 3 }, { content: 'SPJ - LS BARANG & JASA', colSpan: 3 }, { content: 'SPJ - UP / GU / TU', colSpan: 3 }, { content: 'Jumlah (LS/UP/GU/TU) s/d Bulan ini', rowSpan: 2 }, { content: 'Sisa Anggaran', rowSpan: 2 }], ['s/d Bulan Lalu', 'Bulan ini', 's/d Bulan Ini', 's/d Bulan Lalu', 'Bulan ini', 's/d Bulan Ini', 's/d Bulan Lalu', 'Bulan ini', 's/d Bulan Ini'], ['1', '2', '3', '4', '5', '6', '7', '8', '9=(7+8)', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']]
  autoTable(doc, { startY: startY + 25, head: head, body: body, theme: 'grid', styles: { fontSize: 6, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' }, columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 6 }, 2: { cellWidth: 8 }, 3: { cellWidth: 8 }, 4: { cellWidth: 8 }, 5: { cellWidth: 10 }, 6: { cellWidth: 'auto' }, 7: { cellWidth: 18, halign: 'right' }, 11: { halign: 'right', cellWidth: 15 }, 12: { halign: 'right', cellWidth: 15 }, 13: { halign: 'right', cellWidth: 15 }, 14: { halign: 'right', cellWidth: 15 }, 15: { halign: 'right', cellWidth: 15 }, 16: { halign: 'right', cellWidth: 15 }, 17: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }, 18: { halign: 'right', cellWidth: 20 } } })
  let signY = doc.lastAutoTable.finalY + 10; if (signY > 180) { doc.addPage(); signY = 20 }
  doc.setFontSize(8); doc.text('Mengetahui / Menyetujui :', 14, signY); doc.text(`${settings.lokasi || ''}, ${lastDay} ${monthName.toLowerCase()} ${year}`, 250, signY)
  const col1X = 14; const col2X = 120; const col3X = 250
  doc.text(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN', col1X, signY + 5); doc.text(settings.bp_jabatan || 'BENDAHARA PENGELUARAN,', col2X, signY + 5); doc.text(settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU', col3X, signY + 5)
  doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama || '', col1X, signY + 25); doc.text(settings.bp_nama || '', col2X, signY + 25); doc.text(settings.bpp_nama || '', col3X, signY + 25)
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, col1X, signY + 29); doc.text(`NIP. ${settings.bp_nip || ''}`, col2X, signY + 29); doc.text(`NIP. ${settings.bpp_nip || ''}`, col3X, signY + 29)
  doc.save(`LPJ_Administratif_${monthName}_${year}.pdf`)
}

/**
 * [FITUR: EXPORT PDF - LPJ PERIODE]
 */
export function exportLPJPeriodePdf(monthIndex, year, allSubKegiatan, pengeluaran, penerimaan, midDate, endDateSelected) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [330, 215] })
  const monthName = getMonthName(monthIndex); const settings = useStore.getState().settings
  const startDate = new Date(year, monthIndex, 1); 
  const cutoff = new Date(midDate); cutoff.setHours(23, 59, 59, 999); 
  const endDate = new Date(endDateSelected); endDate.setHours(23, 59, 59, 999)
  const sigDay = endDate.getDate(); const sigMonthName = getMonthName(endDate.getMonth()); const sigYear = endDate.getFullYear()
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PROVINSI JAWA BARAT', 165, 10, { align: 'center' }); doc.setFontSize(11); doc.text('LAPORAN PER PERIODE BENDAHARA PENGELUARAN PEMBANTU', 165, 15, { align: 'center' }); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); const startY = 25
  doc.text('SKPD', 14, startY); doc.text(`: ${settings.unit_kerja || ''}`, 75, startY); doc.text('KUASA PENGGUNA ANGGARAN', 14, startY + 5); doc.text(`: ${settings.kpa_nama || ''}`, 75, startY + 5); doc.text('BENDAHARA PENGELUARAN PEMBANTU', 14, startY + 10); doc.text(`: ${settings.bpp_nama || ''}`, 75, startY + 10); doc.text('TAHUN ANGGARAN', 14, startY + 15); doc.text(`: ${year}`, 75, startY + 15); doc.text('BULAN', 14, startY + 20); doc.text(`: ${monthName} ${year}`, 75, startY + 20)
  const PARENT_REK_DICT = { '5': 'BELANJA DAERAH', '5.1': 'BELANJA OPERASI', '5.1.02': 'Belanja Barang dan Jasa', '5.1.02.01': 'Belanja Barang', '5.1.02.01.001': 'Belanja Barang Pakai Habis', '5.1.02.02': 'Belanja Jasa', '5.1.02.02.001': 'Belanja Jasa Kantor', '5.1.02.02.004': 'Belanja Jasa Iklan/Reklame, Film, dan Pemotretan', '5.1.02.02.005': 'Belanja Jasa Konsultansi', '5.1.02.02.008': 'Belanja Jasa Konsultansi Konstruksi', '5.1.02.03': 'Belanja Pemeliharaan', '5.1.02.03.002': 'Belanja Pemeliharaan Peralatan dan Mesin', '5.1.02.03.003': 'Belanja Pemeliharaan Gedung dan Bangunan', '5.1.02.04': 'Belanja Perjalanan Dinas', '5.1.02.04.001': 'Belanja Perjalanan Dinas Dalam Negeri', '5.2': 'BELANJA MODAL', '5.2.02': 'Belanja Modal Peralatan dan Mesin', '5.2.02.05': 'Belanja Modal Alat Kantor dan Rumah Tangga', '5.2.02.05.002': 'Belanja Modal Alat Rumah Tangga' }
  const sumJ = (items) => items.reduce((s, p) => s + p.jumlah, 0)
  const filterByTime = (items, timeKey) => items.filter(p => { const txDate = new Date(p.tanggal); if (timeKey === 'lalu') return txDate < startDate; if (timeKey === 'p1') return txDate >= startDate && txDate <= cutoff; if (timeKey === 'p2') return txDate > cutoff && txDate <= endDate; return false })
  const getAmt = (items, jenisList, timeKey) => { const list = items.filter(p => jenisList.includes(p.jenis)); return sumJ(filterByTime(list, timeKey)) }
  const root = { pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }; const tree = new Map(); const globalRekMap = {}
  const ensureGlobalChain = (leafKode, leafUraian, leafPagu, leafLs, leafGu) => { const parts = leafKode.split('.'); for (let i = 1; i <= parts.length; i++) { const currentKode = parts.slice(0, i).join('.'); const isLeaf = (i === parts.length); if (!globalRekMap[currentKode]) globalRekMap[currentKode] = { kode: currentKode, uraian: isLeaf ? leafUraian : (PARENT_REK_DICT[currentKode] || ''), pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }; const entry = globalRekMap[currentKode]; entry.pagu += leafPagu; entry.ls.lalu += leafLs.lalu; entry.ls.p1 += leafLs.p1; entry.ls.p2 += leafLs.p2; entry.ls.sd += leafLs.sd; entry.gu.lalu += leafGu.lalu; entry.gu.p1 += leafGu.p1; entry.gu.p2 += leafGu.p2; entry.gu.sd += leafGu.sd } }
  allSubKegiatan.forEach(sk => { const prog = sk.kegiatan?.program || { id: 'no-prog', kode: '?', nama: 'Tanpa Program' }; const keg = sk.kegiatan || { id: 'no-keg', kode: '?', nama: 'Tanpa Kegiatan' }; if (!tree.has(prog.id)) tree.set(prog.id, { id: prog.id, kode: prog.kode, nama: prog.nama, pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 }, kegiatans: new Map() }); const progObj = tree.get(prog.id); if (!progObj.kegiatans.has(keg.id)) progObj.kegiatans.set(keg.id, { id: keg.id, kode: keg.kode, nama: keg.nama, pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 }, subKegiatans: new Map() }); const kegObj = progObj.kegiatans.get(keg.id); if (!kegObj.subKegiatans.has(sk.id)) kegObj.subKegiatans.set(sk.id, { id: sk.id, kode: sk.kode, nama: sk.nama, pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 }, rekenings: [] }) })
  allSubKegiatan.forEach(sk => {
    const prog = sk.kegiatan?.program || { id: 'no-prog' }; const keg = sk.kegiatan || { id: 'no-keg' }; const progObj = tree.get(prog.id); const kegObj = progObj.kegiatans.get(keg.id); const skObj = kegObj.subKegiatans.get(sk.id); const localRekMap = {}
    const ensureParentChain = (leafKode, leafUraian, leafPagu, leafLs, leafGu) => { const parts = leafKode.split('.'); for (let i = 1; i <= parts.length; i++) { const currentKode = parts.slice(0, i).join('.'); const isLeaf = (i === parts.length); if (!localRekMap[currentKode]) localRekMap[currentKode] = { kode: currentKode, uraian: isLeaf ? leafUraian : (PARENT_REK_DICT[currentKode] || ''), pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }; const entry = localRekMap[currentKode]; entry.pagu += leafPagu; entry.ls.lalu += leafLs.lalu; entry.ls.p1 += leafLs.p1; entry.ls.p2 += leafLs.p2; entry.ls.sd += leafLs.sd; entry.gu.lalu += leafGu.lalu; entry.gu.p1 += leafGu.p1; entry.gu.p2 += leafGu.p2; entry.gu.sd += leafGu.sd } }
    ;(sk.kode_rekening || []).forEach(rek => { const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id); const leafLs = { lalu: getAmt(rp, ['LS'], 'lalu'), p1: getAmt(rp, ['LS'], 'p1'), p2: getAmt(rp, ['LS'], 'p2'), sd: 0 }; leafLs.sd = leafLs.lalu + leafLs.p1 + leafLs.p2; const leafGu = { lalu: getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'lalu'), p1: getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p1'), p2: getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p2'), sd: 0 }; leafGu.sd = leafGu.lalu + leafGu.p1 + leafGu.p2; const finalPagu = rek.pagu_anggaran || 0; ensureParentChain(rek.kode, rek.uraian, finalPagu, leafLs, leafGu); ensureGlobalChain(rek.kode, rek.uraian, finalPagu, leafLs, leafGu) })
    skObj.rekenings = Object.values(localRekMap).sort((a,b) => a.kode.localeCompare(b.kode))
    ;(sk.kode_rekening || []).forEach(rek => { const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id); const leafLs = getAmt(rp, ['LS'], 'lalu') + getAmt(rp, ['LS'], 'p1') + getAmt(rp, ['LS'], 'p2'); const leafGu = getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'lalu') + getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p1') + getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p2'); skObj.pagu += (rek.pagu_anggaran || 0); skObj.ls.lalu += getAmt(rp, ['LS'], 'lalu'); skObj.ls.p1 += getAmt(rp, ['LS'], 'p1'); skObj.ls.p2 += getAmt(rp, ['LS'], 'p2'); skObj.ls.sd += leafLs; skObj.gu.lalu += getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'lalu'); skObj.gu.p1 += getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p1'); skObj.gu.p2 += getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p2'); skObj.gu.sd += leafGu })
    kegObj.pagu += skObj.pagu; kegObj.ls.lalu += skObj.ls.lalu; kegObj.ls.p1 += skObj.ls.p1; kegObj.ls.p2 += skObj.ls.p2; kegObj.ls.sd += skObj.ls.sd; kegObj.gu.lalu += skObj.gu.lalu; kegObj.gu.p1 += skObj.gu.p1; kegObj.gu.p2 += skObj.gu.p2; kegObj.gu.sd += skObj.gu.sd
  })
  tree.forEach(progObj => { progObj.kegiatans.forEach(kegObj => { progObj.pagu += kegObj.pagu; progObj.ls.lalu += kegObj.ls.lalu; progObj.ls.p1 += kegObj.ls.p1; progObj.ls.p2 += kegObj.ls.p2; progObj.ls.sd += kegObj.ls.sd; progObj.gu.lalu += kegObj.gu.lalu; progObj.gu.p1 += kegObj.gu.p1; progObj.gu.p2 += kegObj.gu.p2; progObj.gu.sd += kegObj.gu.sd }); root.pagu += progObj.pagu; root.ls.lalu += progObj.ls.lalu; root.ls.p1 += progObj.ls.p1; root.ls.p2 += progObj.ls.p2; root.ls.sd += progObj.ls.sd; root.gu.lalu += progObj.gu.lalu; root.gu.p1 += progObj.gu.p1; root.gu.p2 += progObj.gu.p2; root.gu.sd += progObj.gu.sd })
  const fmt = (val) => val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-'
  const makeRow = (no, kode, uraian, pagu, ls, gu, isBold = false, color = null) => { const tS = ls.sd + gu.sd; const sisa = pagu - tS; const rowStyle = { fontStyle: isBold ? 'bold' : 'normal' }; if (color) rowStyle.fillColor = color; return [ { content: no, styles: rowStyle }, { content: kode, styles: rowStyle }, { content: uraian, styles: rowStyle }, { content: fmt(pagu), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(ls.lalu), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(ls.p1), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(ls.p2), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(ls.sd), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(gu.lalu), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(gu.p1), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(gu.p2), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(gu.sd), styles: { ...rowStyle, halign: 'right' } }, { content: fmt(tS), styles: { ...rowStyle, halign: 'right', fontStyle: 'bold' } }, { content: fmt(sisa), styles: { ...rowStyle, halign: 'right' } } ] }
  const body = []; const topKeys = Object.keys(globalRekMap).filter(k => k === '5' || k === '5.1' || k === '5.2').sort(); topKeys.forEach(k => { const entry = globalRekMap[k]; body.push(makeRow('', entry.kode + '.', entry.uraian.toUpperCase(), entry.pagu, entry.ls, entry.gu, true, [240, 240, 240])) });
  let progIdx = 1; const romanize = (num) => { const lookup = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 }; let roman = '', i; for ( i in lookup ) { while ( num >= lookup[i] ) { roman += i; num -= lookup[i] } } return roman }
  tree.forEach(progObj => { const progRoman = romanize(progIdx++); body.push(makeRow(progRoman, progObj.kode, progObj.nama.toUpperCase(), progObj.pagu, progObj.ls, progObj.gu, true, [235, 245, 255])); let kegIdx = 1; progObj.kegiatans.forEach(kegObj => { const kegNo = `${progRoman}.${kegIdx++}`; body.push(makeRow(kegNo, kegObj.kode, kegObj.nama.toUpperCase(), kegObj.pagu, kegObj.ls, kegObj.gu, true, [248, 248, 248])); let skIdx = 1; kegObj.subKegiatans.forEach(skObj => { const skNo = `${kegNo}.${skIdx++}`; body.push(makeRow(skNo, skObj.kode, skObj.nama.toUpperCase(), skObj.pagu, skObj.ls, skObj.gu, true)); skObj.rekenings.forEach(rek => { body.push(makeRow('', rek.kode, rek.uraian, rek.pagu, rek.ls, rek.gu, false)) }) }) }) })
  body.push(makeRow('JUMLAH', '', '', root.pagu, root.ls, root.gu, true, [220, 220, 220]))
  const makeSumRow = (label, lsAgg, guAgg, isBold = false) => { const r = new Array(12).fill('-'); r[0] = { content: label, colSpan: 3, styles: { fontStyle: isBold ? 'bold' : 'normal', halign: 'left' } }; r[1] = '-'; r[2] = fmt(lsAgg.lalu); r[3] = fmt(lsAgg.p1); r[4] = fmt(lsAgg.p2); r[5] = fmt(lsAgg.sd); r[6] = fmt(guAgg.lalu); r[7] = fmt(guAgg.p1); r[8] = fmt(guAgg.p2); r[9] = fmt(guAgg.sd); const tSd = lsAgg.sd + guAgg.sd; r[10] = fmt(tSd); r[11] = '-'; return r }
  const sumP = (items, jenisList, timeKey) => { const list = items.filter(p => jenisList.includes(p.jenis)); const filtered = list.filter(p => { const txDate = new Date(p.tanggal); if (timeKey === 'lalu') return txDate < startDate; if (timeKey === 'p1') return txDate >= startDate && txDate <= cutoff; if (timeKey === 'p2') return txDate > cutoff && txDate <= endDate; return false }); return sumJ(filtered) }
  const getSumObj = (items, jenisList) => { const lalu = sumP(items, jenisList, 'lalu'); const p1 = sumP(items, jenisList, 'p1'); const p2 = sumP(items, jenisList, 'p2'); return { lalu, p1, p2, sd: lalu + p1 + p2 } }
  const isTaxFromLS = (p) => (p.jenis === 'Pajak LS' || p.jenis === 'LS' || !!p.no_sp2d || !!p.nomor_ls)
  const getTaxAgg = (regex) => { const items = penerimaan.filter(p => (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(p.keterangan || '')); const lsItems = items.filter(p => isTaxFromLS(p)); const guItems = items.filter(p => !isTaxFromLS(p)); return { ls: { lalu: sumP(lsItems, ['Pajak', 'Pajak LS'], 'lalu'), p1: sumP(lsItems, ['Pajak', 'Pajak LS'], 'p1'), p2: sumP(lsItems, ['Pajak', 'Pajak LS'], 'p2'), sd: sumP(lsItems, ['Pajak', 'Pajak LS'], 'lalu') + sumP(lsItems, ['Pajak', 'Pajak LS'], 'p1') + sumP(lsItems, ['Pajak', 'Pajak LS'], 'p2') }, gu: { lalu: sumP(guItems, ['Pajak', 'Pajak LS'], 'lalu'), p1: sumP(guItems, ['Pajak', 'Pajak LS'], 'p1'), p2: sumP(guItems, ['Pajak', 'Pajak LS'], 'p2'), sd: sumP(guItems, ['Pajak', 'Pajak LS'], 'lalu') + sumP(guItems, ['Pajak', 'Pajak LS'], 'p1') + sumP(guItems, ['Pajak', 'Pajak LS'], 'p2') } } }
  const getTaxSetoranAgg = (regex) => { const items = pengeluaran.filter(p => { const u = p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || ''; return (u.startsWith('Setoran') || u.startsWith('Dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(u) }); const lsItems = items.filter(p => isTaxFromLS(p)); const guItems = items.filter(p => !isTaxFromLS(p)); const jl = ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS']; return { ls: { lalu: sumP(lsItems, jl, 'lalu'), p1: sumP(lsItems, jl, 'p1'), p2: sumP(lsItems, jl, 'p2'), sd: sumP(lsItems, jl, 'lalu') + sumP(lsItems, jl, 'p1') + sumP(lsItems, jl, 'p2') }, gu: { lalu: sumP(guItems, jl, 'lalu'), p1: sumP(guItems, jl, 'p1'), p2: sumP(guItems, jl, 'p2'), sd: sumP(guItems, jl, 'lalu') + sumP(guItems, jl, 'p1') + sumP(guItems, jl, 'p2') } } }
  const taxTypes = [ { label: '    a. PPN', regex: /PPN/i }, { label: '    c. PPh.- 21', regex: /PPh\s*21/i }, { label: '    d. PPh.- 22', regex: /PPh\s*22/i }, { label: '    e. PPh.- 23', regex: /PPh\s*23/i }, { label: '    b. PPh. Psl 4 (Ayat 2)', regex: /PPh\s*(?:Pasal\s*)?4/i } ]
  body.push([{ content: '', colSpan: 14 }]); body.push([{ content: 'Penerimaan', colSpan: 14, styles: { fontStyle: 'bold', fillColor: [250, 250, 250], halign: 'left' } }]); const penLS = getSumObj(penerimaan, ['LS']); const penGU = getSumObj(penerimaan, ['UP', 'GU', 'TU', 'KKPD']); body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', penLS, penGU, true)); const jTs = [['    a. UP', ['UP']], ['    b. GU', ['GU']], ['    c. TU', ['TU']], ['    d. LS', ['LS']], ['    e. KKPD', ['KKPD']]]; jTs.forEach(jt => { const isLS = jt[1][0] === 'LS'; const agg = getSumObj(penerimaan, jt[1]); body.push(makeSumRow(jt[0], isLS ? agg : { lalu: 0, p1: 0, p2: 0, sd: 0 }, isLS ? { lalu: 0, p1: 0, p2: 0, sd: 0 } : agg)) }); const taxPenerimaanTotal = { ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }; const taxPenerimaanRows = taxTypes.map(tt => { const agg = getTaxAgg(tt.regex); taxPenerimaanTotal.ls.lalu += agg.ls.lalu; taxPenerimaanTotal.ls.p1 += agg.ls.p1; taxPenerimaanTotal.ls.p2 += agg.ls.p2; taxPenerimaanTotal.ls.sd += agg.ls.sd; taxPenerimaanTotal.gu.lalu += agg.gu.lalu; taxPenerimaanTotal.gu.p1 += agg.gu.p1; taxPenerimaanTotal.gu.p2 += agg.gu.p2; taxPenerimaanTotal.gu.sd += agg.gu.sd; return makeSumRow(tt.label, agg.ls, agg.gu) }); body.push(makeSumRow(' - Potongan Pajak', taxPenerimaanTotal.ls, taxPenerimaanTotal.gu, true)); body.push(...taxPenerimaanRows); const totalPenerimaanAgg = { ls: { lalu: penLS.lalu + taxPenerimaanTotal.ls.lalu, p1: penLS.p1 + taxPenerimaanTotal.ls.p1, p2: penLS.p2 + taxPenerimaanTotal.ls.p2, sd: penLS.sd + taxPenerimaanTotal.ls.sd }, gu: { lalu: penGU.lalu + taxPenerimaanTotal.gu.lalu, p1: penGU.p1 + taxPenerimaanTotal.gu.p1, p2: penGU.p2 + taxPenerimaanTotal.gu.p2, sd: penGU.sd + taxPenerimaanTotal.gu.sd } }; body.push(makeSumRow('Jumlah Penerimaan', totalPenerimaanAgg.ls, totalPenerimaanAgg.gu, true)); body.push([{ content: '', colSpan: 14 }]); body.push([{ content: 'Pengeluaran', colSpan: 14, styles: { fontStyle: 'bold', fillColor: [250, 250, 250], halign: 'left' } }]); const pengLS = getSumObj(pengeluaran, ['LS']); const pengGU = getSumObj(pengeluaran, ['GU', 'UP', 'TU', 'KKPD']); body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', pengLS, pengGU, true)); jTs.forEach(jt => { const isLS = jt[1][0] === 'LS'; const agg = getSumObj(pengeluaran, jt[1]); body.push(makeSumRow(jt[0], isLS ? agg : { lalu: 0, p1: 0, p2: 0, sd: 0 }, isLS ? { lalu: 0, p1: 0, p2: 0, sd: 0 } : agg)) }); const taxPengeluaranTotal = { ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }; const taxPengeluaranRows = taxTypes.map(tt => { const agg = getTaxSetoranAgg(tt.regex); taxPengeluaranTotal.ls.lalu += agg.ls.lalu; taxPengeluaranTotal.ls.p1 += agg.ls.p1; taxPengeluaranTotal.ls.p2 += agg.ls.p2; taxPengeluaranTotal.ls.sd += agg.ls.sd; taxPengeluaranTotal.gu.lalu += agg.gu.lalu; taxPengeluaranTotal.gu.p1 += agg.gu.p1; taxPengeluaranTotal.gu.p2 += agg.gu.p2; taxPengeluaranTotal.gu.sd += agg.gu.sd; return makeSumRow(tt.label, agg.ls, agg.gu) }); body.push(makeSumRow(' - Penyetoran Pajak', taxPengeluaranTotal.ls, taxPengeluaranTotal.gu, true)); body.push(...taxPengeluaranRows); const totalPengeluaranAgg = { ls: { lalu: pengLS.lalu + taxPengeluaranTotal.ls.lalu, p1: pengLS.p1 + taxPengeluaranTotal.ls.p1, p2: pengLS.p2 + taxPengeluaranTotal.ls.p2, sd: pengLS.sd + taxPengeluaranTotal.ls.sd }, gu: { lalu: pengGU.lalu + taxPengeluaranTotal.gu.lalu, p1: pengGU.p1 + taxPengeluaranTotal.gu.p1, p2: pengGU.p2 + taxPengeluaranTotal.gu.p2, sd: pengGU.sd + taxPengeluaranTotal.gu.sd } }; body.push(makeSumRow('Jumlah Pengeluaran', totalPengeluaranAgg.ls, totalPengeluaranAgg.gu, true))
  const saldoKasRiil = (totalPenerimaanAgg.ls.sd + totalPenerimaanAgg.gu.sd) - (totalPengeluaranAgg.ls.sd + totalPengeluaranAgg.gu.sd); const sR = new Array(3).fill('-'); sR[0] = { content: 'Saldo Kas', colSpan: 12, styles: { fontStyle: 'bold', halign: 'right' } }; sR[1] = { content: fmt(saldoKasRiil), styles: { fontStyle: 'bold', halign: 'right' } }; sR[2] = '-'; body.push(sR)
  const head = [[{ content: 'NO', rowSpan: 2 }, { content: 'Kode Rekening', rowSpan: 2 }, { content: 'Uraian', rowSpan: 2 }, { content: 'Jumlah Anggaran', rowSpan: 2 }, { content: 'SPJ - LS Barang & Jasa', colSpan: 4 }, { content: 'SPJ - UP/GU/TU', colSpan: 4 }, { content: 'Jumlah SPJ (LS+UP/GU/TU) s/d Bulan ini', rowSpan: 2 }, { content: 'SISA PAGU ANGGARAN', rowSpan: 2 }], ['s.d. Bulan lalu', 'Periode ke 1', 'Periode ke 2', 's.d. Bulan ini', 's.d. Bulan lalu', 'Periode ke 1', 'Periode ke 2', 's.d. Bulan ini'], ['1', '2', '3', '4', '5', '6', '7', '8=5+6+7', '9', '10', '11', '12=9+10+11', '13=8+12', '14=4-13']]
  autoTable(doc, { startY: startY + 25, head: head, body: body, theme: 'grid', styles: { fontSize: 5.5, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' }, columnStyles: { 0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 20, halign: 'right' }, 4: { cellWidth: 17, halign: 'right' }, 5: { cellWidth: 17, halign: 'right' }, 6: { cellWidth: 17, halign: 'right' }, 7: { cellWidth: 17, halign: 'right', fontStyle: 'bold' }, 8: { cellWidth: 17, halign: 'right' }, 9: { cellWidth: 17, halign: 'right' }, 10: { cellWidth: 17, halign: 'right' }, 11: { cellWidth: 17, halign: 'right', fontStyle: 'bold' }, 12: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }, 13: { cellWidth: 20, halign: 'right' } } })
  let signY = doc.lastAutoTable.finalY + 10; if (signY > 180) { doc.addPage(); signY = 20 }
  doc.setFontSize(8); doc.text('Mengetahui :', 14, signY); doc.text(`${settings.lokasi || 'Tasikmalaya'}, ${sigDay} ${sigMonthName.toLowerCase()} ${sigYear}`, 250, signY)
  const col1X = 14; const col3X = 250; doc.text(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN,', col1X, signY + 5); doc.text(settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU,', col3X, signY + 5)
  doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama || '', col1X, signY + 25); doc.text(settings.bpp_nama || '', col3X, signY + 25)
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, col1X, signY + 29); doc.text(`NIP. ${settings.bpp_nip || ''}`, col3X, signY + 29)
  doc.save(`LPJ_Periode_${monthName}_${year}.pdf`)
}
