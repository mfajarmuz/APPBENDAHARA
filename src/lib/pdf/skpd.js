import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName } from './utils'

/**
 * [FITUR: EXPORT PDF - REGISTER PENUTUPAN KAS]
 */
export function exportRegisterKasPdf(data, cashUnits, monthIndex, year, customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings
  const monthName = getMonthName(monthIndex)
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()
  const fullDate = `${lastDay} ${monthName.charAt(0) + monthName.slice(1).toLowerCase()} ${year}`
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('BADAN PENDAPATAN DAERAH PROVINSI JAWA BARAT', 105, 15, { align: 'center' })
  doc.text('REGISTER PENUTUPAN KAS', 105, 20, { align: 'center' })
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  let curY = 32
  const col1 = 20
  const col2 = 75
  const col3 = 150
  
  doc.text('Tanggal Penutupan Kas', col1, curY); doc.text(`:  ${fullDate}`, col2, curY); curY += 4
  doc.text('Nama Penutup Kas', col1, curY); doc.text(`:  ${settings.bpp_nama || ''}`, col2, curY); curY += 4
  doc.text('Tanggal Penutupan Kas yang lalu', col1, curY); doc.text(':  -', col2, curY); curY += 4
  doc.text('Jumlah Transaksi s/d bulan', col1, curY); doc.text(`:  ${fullDate}`, col2, curY); curY += 4
  
  const startD = data.startDateText || `01 Januari ${year}`
  const labelPen = `Jumlah Penerimaan mulai dari ${startD} s.d ${fullDate}`
  const labelPeng = `Jumlah Pengeluaran mulai dari ${startD} s.d ${fullDate}`
  
  doc.text(labelPen, col1, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.totalDebetSemua).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  doc.text(labelPeng, col1, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.totalKreditSemua).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  
  doc.line(col3, curY - 3, 190, curY - 3)
  
  doc.text('Saldo Buku ..............', col3 - 35, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  doc.text('Saldo Kas ................', col3 - 35, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 7
  
  doc.setFont('helvetica', 'bolditalic'); doc.text('Terdiri atas :', col1, curY); curY += 5; doc.setFont('helvetica', 'normal')
  
  const drawList = (num, items, labelTotal) => {
    doc.text(`${num}`, col1, curY)
    let totalVal = 0
    items.forEach(it => {
      const val = it.qty * it.denom
      totalVal += val
      doc.text(it.label, col1 + 4, curY)
      doc.text('=', col1 + 65, curY)
      doc.text(it.qty > 0 ? String(it.qty) : '-', col1 + 71, curY, { align: 'right' })
      doc.text(it.unit, col1 + 73, curY)
      doc.text('Rp.', col3, curY)
      doc.text(val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
      curY += 4
    })
    doc.setFont('helvetica', 'bold')
    doc.text(labelTotal, col1 + 65, curY)
    doc.text('Rp.', col3, curY)
    doc.text(totalVal > 0 ? formatRupiah(totalVal).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
    doc.line(col3, curY - 3, 190, curY - 3)
    curY += 5
    doc.setFont('helvetica', 'normal')
    return totalVal
  }

  const paperDenoms = [
    { d: 100000, k: 'kertas_100k' }, { d: 50000, k: 'kertas_50k' }, { d: 20000, k: 'kertas_20k' }, 
    { d: 10000, k: 'kertas_10k' }, { d: 5000, k: 'kertas_5k' }, { d: 2000, k: 'kertas_2k' }, 
    { d: 1000, k: 'kertas_1k' }, { d: 500, k: 'kertas_500' }
  ]
  const paperItems = paperDenoms.map(x => ({
    label: `Lembar Uang Kertas    Rp.       ${x.d.toLocaleString('id-ID')}`,
    denom: x.d,
    qty: cashUnits[x.k] || 0,
    unit: 'Lembar'
  }))
  
  const total1 = drawList(1, paperItems, 'JUMLAH (1)............................')

  const coinDenoms = [
    { d: 1000, k: 'logam_1000' }, { d: 500, k: 'logam_500' }, { d: 200, k: 'logam_200' }, 
    { d: 100, k: 'logam_100' }, { d: 50, k: 'logam_50' }, { d: 25, k: 'logam_25' }
  ]
  const coinItems = coinDenoms.map(x => ({
    label: `Kepingan Uang Logam Rp.        ${x.d.toLocaleString('id-ID')}`,
    denom: x.d,
    qty: cashUnits[x.k] || 0,
    unit: 'Keping'
  }))
  
  const total2 = drawList(2, coinItems, 'JUMLAH (2)............................')
  
  doc.setFont('helvetica', 'bold')
  doc.text('JUMLAH (1 + 2)........................', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  const sumCash = total1 + total2
  doc.text(sumCash > 0 ? formatRupiah(sumCash).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
  curY += 6
  doc.setFont('helvetica', 'normal')

  doc.text('3', col1, curY)
  const wrapped3 = doc.splitTextToSize('Kertas Berharga dan Bagian Hak yang diizinkan Ordonansi / SP2D, Wesel, Cek, Saldo Bank, Materai, dan sebagainya ............................................................', 128)
  doc.text(wrapped3, col1 + 4, curY)
  const item3Value = data.saldo - sumCash
  doc.text('Rp.', col3, curY + ((wrapped3.length - 1) * 4))
  doc.text(formatRupiah(item3Value).replace('Rp', '').trim(), 190, curY + ((wrapped3.length - 1) * 4), { align: 'right' })
  doc.line(col3, curY + ((wrapped3.length - 1) * 4) + 1, 190, curY + ((wrapped3.length - 1) * 4) + 1)
  curY += (wrapped3.length * 4) + 2

  doc.setFont('helvetica', 'bold')
  doc.text('JUMLAH SELURUHNYA', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' })
  doc.line(col3, curY + 1, 190, curY + 1)
  curY += 4
  
  doc.text('Perbedaan Positif', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  doc.text('-', 190, curY, { align: 'right' })
  doc.line(col3, curY + 1, 190, curY + 1)
  curY += 8
  
  doc.setFont('helvetica', 'normal')
  doc.text('4', col1, curY)
  doc.text('Penjelasan Perbedaan Positif              :', col1 + 4, curY)
  doc.text('-', col1 + 68, curY)
  curY += 15
  
  if (curY > 240) { doc.addPage(); curY = 20 }
  doc.text(`${settings.lokasi || ''}, ${fullDate}`, 145, curY); curY += 10
  doc.text('Mengetahui :', col1, curY)
  doc.text('BENDAHARA PENGELUARAN PEMBANTU,', 145, curY); curY += 4
  doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', col1, curY); curY += 25
  
  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', col1, curY)
  doc.text(settings.bpp_nama || '', 145, curY)
  curY += 4
  
  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, col1, curY)
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 145, curY)

  doc.save(`Register_Penutupan_Kas_${monthName}_${year}.pdf`)
}

/**
 * [FITUR: EXPORT PDF - RPPUA]
 */
export function exportRPPUAPdf(data, filterBulan, year = new Date().getFullYear(), customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings
  const displayDate = formatTanggal(customDate || new Date(year, filterBulan + 1, 0))

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('DAFTAR : REKAPITULASI PENERIMAAN DAN PENGELUARAN UANG ANGGARAN', 105, 15, { align: 'center' })
  doc.text((settings.unit_kerja || '').toUpperCase(), 105, 20, { align: 'center' })
  doc.setFontSize(9); doc.text(`MENURUT BUKU KAS UMUM S.D TANGGAL ${displayDate}`, 105, 26, { align: 'center' })

  const head = [[{ content: 'NO', styles: { halign: 'center' } }, { content: 'BULAN', styles: { halign: 'center' } }, { content: 'PENERIMAAN', styles: { halign: 'center' } }, { content: 'PENGELUARAN', styles: { halign: 'center' } }, { content: 'SALDO', styles: { halign: 'center' } }, { content: 'KETERANGAN', styles: { halign: 'center' } }]]
  let runningSaldo = 0; let totalPen = 0; let totalPeng = 0
  const tableBody = data.map((item, index) => {
    const isAfter = index > filterBulan
    if (!isAfter) { runningSaldo += (item.penerimaan || 0) - (item.pengeluaran || 0); totalPen += (item.penerimaan || 0); totalPeng += (item.pengeluaran || 0) }
    return [index + 1, item.bulan.toUpperCase(), (!isAfter && item.penerimaan > 0) ? formatRupiah(item.penerimaan).replace('Rp', '').trim() : '-', (!isAfter && item.pengeluaran > 0) ? formatRupiah(item.pengeluaran).replace('Rp', '').trim() : '-', (!isAfter) ? (runningSaldo >= 0 ? formatRupiah(runningSaldo).replace('Rp', '').trim() : `(${formatRupiah(Math.abs(runningSaldo)).replace('Rp', '').trim()})`) : '-', '']
  })
  const foot = [[{ content: 'JUMLAH', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, { content: formatRupiah(totalPen).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(totalPeng).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(runningSaldo).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: '', styles: { fontStyle: 'bold' } }]]

  autoTable(doc, { startY: 35, head: head, body: tableBody, foot: foot, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', textColor: [0, 0, 0] }, footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }, columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 30 }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' }, 4: { cellWidth: 35, halign: 'right' } } })
  
  let signY = doc.lastAutoTable.finalY + 15; if (signY > 230) { doc.addPage(); signY = 20 }
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`${settings.lokasi || ''}, ${displayDate}`, 140, signY)
  doc.text('Mengetahui :', 14, signY + 5); doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', 14, signY + 10); doc.text(settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu,', 140, signY + 10)
  doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama || '', 14, signY + 35); doc.text(settings.bpp_nama || '', 140, signY + 35)
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, 14, signY + 39); doc.text(`NIP. ${settings.bpp_nip || ''}`, 140, signY + 39)
  doc.save(`RPPUA_${year}.pdf`)
}

/**
 * [FITUR: EXPORT PDF - RPPUP]
 */
export function exportRPPUPPdf(data, filterBulan, year = new Date().getFullYear(), customDate = null) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings
  const displayDate = formatTanggal(customDate || new Date(year, filterBulan + 1, 0))

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('REKAPITULASI PENERIMAAN DAN PENYETORAN UANG POTONGAN', 148.5, 15, { align: 'center' })
  doc.text((settings.unit_kerja || '').toUpperCase(), 148.5, 20, { align: 'center' }); doc.setFontSize(9); doc.text(`S.D TANGGAL ${displayDate}`, 148.5, 25, { align: 'center' })

  const head = [[{ content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'BULAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'PENERIMAAN', colSpan: 6, styles: { halign: 'center' } }, { content: 'PENYETORAN', colSpan: 2, styles: { halign: 'center' } }, { content: 'SISA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }], [{ content: 'PPH PASAL 21', styles: { halign: 'center' } }, { content: 'PPH PASAL 22', styles: { halign: 'center' } }, { content: 'PPH PASAL 23', styles: { halign: 'center' } }, { content: 'PPN', styles: { halign: 'center' } }, { content: 'PPh PASAL 4 AYAT 2', styles: { halign: 'center' } }, { content: 'JUMLAH', styles: { halign: 'center' } }, { content: 'TANGGAL', styles: { halign: 'center' } }, { content: 'JUMLAH', styles: { halign: 'center' } }]]
  let runningSaldo = 0; let totalPen = 0; let totalPaid = 0; let s21 = 0, s22 = 0, s23 = 0, sPPN = 0, s4 = 0
  const tableBody = data.map((item, index) => {
    const isAfter = index > filterBulan
    if (!isAfter) { runningSaldo += (item.totalPen || 0) - (item.penyetoran || 0); totalPen += (item.totalPen || 0); totalPaid += (item.penyetoran || 0); s21 += (item.pph21 || 0); s22 += (item.pph22 || 0); s23 += (item.pph23 || 0); sPPN += (item.ppn || 0); s4 += (item.pph4 || 0) }
    const f = (val) => !isAfter && val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-'
    return [index + 1, item.bulan.toUpperCase(), f(item.pph21), f(item.pph22), f(item.pph23), f(item.ppn), f(item.pph4), f(item.totalPen), '-', f(item.penyetoran), !isAfter ? (runningSaldo > 0 ? formatRupiah(runningSaldo).replace('Rp', '').trim() : '-') : '-']
  })
  const foot = [[{ content: 'JUMLAH', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, { content: formatRupiah(s21).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(s22).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(s23).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(sPPN).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(s4).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(totalPen).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: '-', styles: { halign: 'center', fontStyle: 'bold' } }, { content: formatRupiah(totalPaid).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(runningSaldo).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }]]

  autoTable(doc, { startY: 35, head: head, body: tableBody, foot: foot, theme: 'grid', styles: { fontSize: 7, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', textColor: [0, 0, 0] }, columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 25 }, 8: { cellWidth: 20, halign: 'center' } } })
  
  let signY = doc.lastAutoTable.finalY + 15; if (signY > 160) { doc.addPage(); signY = 20 }
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`${settings.lokasi || ''}, ${displayDate}`, 220, signY)
  doc.text('Mengetahui :', 20, signY + 5); doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', 20, signY + 10); doc.text(settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu,', 220, signY + 10)
  doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama || '', 20, signY + 35); doc.text(settings.bpp_nama || '', 220, signY + 35)
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, 20, signY + 39); doc.text(`NIP. ${settings.bpp_nip || ''}`, 220, signY + 39)
  doc.save(`RPPUP_${year}.pdf`)
}
