import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'

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
  doc.save(`RPPUA_${new Date().getFullYear()}.pdf`)
}
