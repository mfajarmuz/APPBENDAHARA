import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah } from '../format'
import { useStore } from '@/store/useStore'

/**
 * [FITUR: EXPORT PDF - LAPORAN REALISASI]
 */
export function exportRealisasiPdf(subKegiatan, realisasiPerRek, year = new Date().getFullYear()) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); const settings = useStore.getState().settings
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('LAPORAN REALISASI ANGGARAN', 105, 15, { align: 'center' }); doc.text(`TAHUN ANGGARAN ${year}`, 105, 21, { align: 'center' }); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(`Unit Kerja : ${settings.unit_kerja}`, 14, 30)
  const head = [['Kode', 'Uraian / Nama Kegiatan', 'Pagu (Rp)', 'Realisasi (Rp)', 'Sisa (Rp)', '%']]; const body = []
  const persen = (val, total) => total > 0 ? ((val / total) * 100).toFixed(2) : '0.00'
  subKegiatan.forEach(sk => { const skReal = (sk.kode_rekening ?? []).reduce((s, r) => s + (realisasiPerRek[r.id] ?? 0), 0); const skPagu = (sk.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0); body.push([{ content: sk.kode, styles: { fontStyle: 'bold' } }, { content: sk.nama, styles: { fontStyle: 'bold' } }, { content: formatRupiah(skPagu).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatRupiah(skReal).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatRupiah(skPagu - skReal).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: `${persen(skReal, skPagu)}%`, styles: { fontStyle: 'bold', halign: 'center' } }]); (sk.kode_rekening ?? []).forEach(rek => { const real = realisasiPerRek[rek.id] ?? 0; body.push([`  ${rek.kode}`, `  ${rek.uraian}`, { content: formatRupiah(rek.pagu_anggaran).replace('Rp', '').trim(), styles: { halign: 'right' } }, { content: formatRupiah(real).replace('Rp', '').trim(), styles: { halign: 'right' } }, { content: formatRupiah(rek.pagu_anggaran - real).replace('Rp', '').trim(), styles: { halign: 'right' } }, { content: `${persen(real, rek.pagu_anggaran)}%`, styles: { halign: 'center' } }]) }) })
  autoTable(doc, { startY: 38, head: head, body: body, theme: 'grid', styles: { fontSize: 7, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1 }, headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center' }, columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 12 } } })
  doc.save('Laporan_Realisasi_Anggaran.pdf')
}
