import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { getMonthName, terbilang } from './utils'
import { useStore } from '@/store/useStore'

function drawNPD(doc, item, subKegiatan, pengeluaran, bkuNumber = '-') {
  const settings = useStore.getState().settings
  const subK = item.sub_kegiatan; const rek = item.kode_rekening; const keg = subK?.kegiatan; const prog = keg?.program
  const progKode = prog?.kode || (keg?.kode ? keg.kode.split('.').slice(0, 3).join('.') : '')
  const progNama = prog?.nama || (keg?.nama ? keg.nama.replace(/^(Kegiatan|Sub Kegiatan|SubKegiatan)\s+/i, '').toUpperCase().replace(/^/i, 'PROGRAM ') : '')
  const displayProgram = `${progKode} ${progNama}`.trim() || '-'
  const relatedPengeluaran = pengeluaran.filter(p => p.kode_rekening_id === item.kode_rekening_id).sort((a, b) => { const d = new Date(a.tanggal) - new Date(b.tanggal); return d !== 0 ? d : String(a.id).localeCompare(String(b.id)) })
  const currentIndex = relatedPengeluaran.findIndex(p => p.id === item.id); const pastAndCurrent = currentIndex !== -1 ? relatedPengeluaran.slice(0, currentIndex + 1) : [item]
  const akumulasiBelanja = pastAndCurrent.reduce((s, p) => s + p.jumlah, 0); const belanjaSekarang = item.jumlah; const paguAnggaran = rek?.pagu_anggaran || 0; const sisaAnggaran = paguAnggaran - akumulasiBelanja
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PEMERINTAH PROVINSI JAWA BARAT', 105, 15, { align: 'center' }); doc.text('Badan Pendapatan Daerah', 105, 20, { align: 'center' }); doc.text('Nota Pencairan Dana (NPD)', 105, 25, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); let currentY = 35
  const labels = [['No', `: ${bkuNumber}`], ['Tanggal', `: ${formatTanggal(item.tanggal)}`], ['Jenis NPD', ': Tanpa Panjar'], ['PPTK', `: ${settings.pptk_nama}`], ['Program', `: ${prog?.kode || ''} - ${prog?.nama || ''}`], ['Kegiatan', `: ${keg?.kode || ''} - ${keg?.nama || ''}`], ['Sub Kegiatan', `: ${subK?.kode || ''} - ${subK?.nama || ''}`], ['', ''], ['No. DPA', ': -'], ['Tahun Anggaran', `: ${new Date(item.tanggal).getFullYear()}`], ['Rincian Belanja', ':']]
  labels.forEach(([label, value]) => { if (label) { doc.setFont('helvetica', 'bold'); doc.text(String(label || ''), 14, currentY) } doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(String(value || ''), 150); doc.text(lines, 45, currentY); currentY += (lines.length > 1 ? lines.length * 4.5 : 5) })
  const rincianText = item.pengeluaran_rincian?.length > 0 ? item.pengeluaran_rincian.map(r => r.uraian).join(', ') : item.keterangan || 'Belanja'
  autoTable(doc, {
    startY: currentY + 2, head: [[{ content: 'No' }, { content: 'Kode - Nama Rekening' }, { content: 'Anggaran' }, { content: 'Belanja' }, { content: 'Akumulasi\nBelanja' }, { content: 'Sisa Anggaran' }]], body: [[1, `${rek?.kode || ''} - ${rek?.uraian || ''}`, formatRupiah(paguAnggaran).replace('Rp', '').trim(), formatRupiah(belanjaSekarang).replace('Rp', '').trim(), formatRupiah(akumulasiBelanja).replace('Rp', '').trim(), formatRupiah(sisaAnggaran).replace('Rp', '').trim()]], foot: [[{ content: 'Jumlah', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, { content: formatRupiah(paguAnggaran).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(belanjaSekarang).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(akumulasiBelanja).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(sisaAnggaran).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }]], theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'middle' }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' }, footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }, columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 25, halign: 'right' }, 3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } }
  })
  let signY = doc.lastAutoTable.finalY + 20; if (signY > 230) { doc.addPage(); signY = 30 }
  doc.setFontSize(9); doc.text('Disetujui Oleh,', 50, signY, { align: 'center' }); doc.text('Disetujui Oleh,', 155, signY, { align: 'center' }); doc.setFont('helvetica', 'bold'); doc.text('KUASA PENGGUNA ANGGARAN', 50, signY + 5, { align: 'center' })
  const pptkJabatan = (settings.pptk_jabatan || 'PEJABAT PELAKSANA TEKNIS KEGIATAN').toUpperCase(); const pptkJabatanLines = doc.splitTextToSize(pptkJabatan, 80); doc.text(pptkJabatanLines, 155, signY + 5, { align: 'center' })
  const signOffset = Math.max(1, pptkJabatanLines.length) * 5 + 20; doc.text(settings.kpa_nama || '', 50, signY + signOffset, { align: 'center' }); doc.text(settings.pptk_nama || '', 155, signY + signOffset, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, 50, signY + signOffset + 4, { align: 'center' }); doc.text(`NIP. ${settings.pptk_nip || ''}`, 155, signY + signOffset + 4, { align: 'center' })
}

export function exportNPDPdf(item, subKegiatan, pengeluaran, bkuNumber = '-') {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); drawNPD(doc, item, subKegiatan, pengeluaran, bkuNumber)
  const dateObj = new Date(item.tanggal); const fileMonth = getMonthName(dateObj.getMonth()); const fileYear = dateObj.getFullYear(); doc.save(`${bkuNumber}-NPD-${fileMonth}-${fileYear}.pdf`)
}

export function exportNPDBatchPdf(items, subKegiatan, pengeluaran, bkuRows) {
  if (!items || items.length === 0) return
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const itemsWithBku = items.map(item => { const d = new Date(item.tanggal); const currentMonth = d.getMonth(); const currentYear = d.getFullYear(); const monthlyBku = bkuRows.filter(r => { const rd = new Date(r.tanggal); return rd.getMonth() === currentMonth && rd.getFullYear() === currentYear }); const bkuIdx = monthlyBku.findIndex(r => r.id === item.id && r.type === 'out'); const bkuNumber = bkuIdx !== -1 ? bkuIdx + 1 : 999999; return { item, bkuNumber } }).sort((a, b) => a.bkuNumber - b.bkuNumber)
  itemsWithBku.forEach(({ item, bkuNumber }, index) => { if (index > 0) doc.addPage(); drawNPD(doc, item, subKegiatan, pengeluaran, bkuNumber) })
  const firstItem = itemsWithBku[0].item; const dateObj = new Date(firstItem.tanggal); const fileMonth = getMonthName(dateObj.getMonth()); const fileYear = dateObj.getFullYear(); doc.save(`BATCH-NPD-${fileMonth}-${fileYear}.pdf`)
}
