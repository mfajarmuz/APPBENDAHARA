import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'

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

export function exportRPPUPPdf2(data, filterBulan, year = new Date().getFullYear(), customDate = null) {
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
  doc.text(settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu,', 20, signY + 10)
  doc.text('Pemeriksa,', 220, signY + 5)
  doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', 220, signY + 10)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.bpp_nama || '', 20, signY + 35)
  doc.text(settings.kpa_nama || '', 220, signY + 35)
  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 20, signY + 39)
  doc.text(`NIP. ${settings.kpa_nip || ''}`, 220, signY + 39)
  doc.save(`RPPUP_Bulanan_2_${year}.pdf`)
}

