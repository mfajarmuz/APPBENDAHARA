import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah } from '../format'
import { getMonthName } from './utils'
import { useStore } from '@/store/useStore'

export function exportRekapBulananPdf(data, year = new Date().getFullYear()) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); const settings = useStore.getState().settings
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('REKAPITULASI PENERIMAAN DAN PENGELUARAN', 105, 15, { align: 'center' }); doc.text(`TAHUN ANGGARAN ${year}`, 105, 21, { align: 'center' })
  autoTable(doc, { startY: 35, head: [['Bulan', 'Penerimaan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']], body: data.map(r => [r.bulan, formatRupiah(r.penerimaan).replace('Rp', '').trim(), formatRupiah(r.pengeluaran).replace('Rp', '').trim(), formatRupiah(r.penerimaan - r.pengeluaran).replace('Rp', '').trim()]), theme: 'striped', headStyles: { fillColor: [124, 58, 237], halign: 'center' }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } } })
  doc.save('Rekap_Bulanan.pdf')
}
