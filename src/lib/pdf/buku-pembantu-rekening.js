import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'

/**
 * [FITUR: EXPORT PDF - BUKU PEMBANTU PER REKENING]
 */
export function exportBukuPembantuPdf(groups) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); const settings = useStore.getState().settings
  groups.forEach((group, idx) => { if (idx > 0) doc.addPage(); const rek = group.rekening; const rows = group.rows; doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('BUKU PEMBANTU KAS', 105, 15, { align: 'center' }); doc.text('PER RINCIAN OBJEK BELANJA', 105, 21, { align: 'center' }); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); const startY = 30; doc.text('Unit Kerja', 14, startY); doc.text(`: ${settings.unit_kerja || ''}`, 65, startY); doc.text('Kode Rekening', 14, startY + 5); doc.text(`: ${rek.kode || ''}`, 65, startY + 5); doc.text('Uraian Rekening', 14, startY + 10); doc.text(`: ${rek.uraian || ''}`, 65, startY + 10)
    let currentSaldo = rek.pagu_anggaran || 0; const body = rows.map((r, i) => { currentSaldo -= (r.jumlah || 0); return [i + 1, formatTanggal(r.tanggal), r.keterangan || 'Belanja', '', formatRupiah(r.jumlah || 0).replace('Rp', '').trim(), formatRupiah(currentSaldo).replace('Rp', '').trim()] })
    autoTable(doc, { startY: startY + 18, head: [['No.', 'Tanggal', 'Uraian', 'Debet', 'Kredit', 'Saldo'], ['1', '2', '3', '4', '5', '6']], body: body, theme: 'grid', styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' }, columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } } })
    const finalY = doc.lastAutoTable.finalY + 15; let signY = finalY > 230 ? (doc.addPage(), 30) : finalY
    doc.setFontSize(9); doc.text('Mengetahui :', 14, signY); const kpaJabatanLines = doc.splitTextToSize(`${settings.kpa_jabatan || 'Kuasa Pengguna Anggaran'},`, 80); doc.text(kpaJabatanLines, 14, signY + 5); doc.text(`${settings.lokasi || ''}, ${new Date().getFullYear()}`, 140, signY); const bppJabatanLines = doc.splitTextToSize(`${settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu'},`, 60); doc.text(bppJabatanLines, 140, signY + 5); const signOffset = Math.max(kpaJabatanLines.length, bppJabatanLines.length) * 5 + 20; doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama || '', 14, signY + signOffset); doc.text(settings.bpp_nama || '', 140, signY + signOffset); doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, 14, signY + signOffset + 4); doc.text(`NIP. ${settings.bpp_nip || ''}`, 140, signY + signOffset + 4)
  })
  doc.save(`Buku_Pembantu_${new Date().getTime()}.pdf`)
}
