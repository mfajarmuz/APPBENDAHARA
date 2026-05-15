import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName } from './utils'

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

/**
 * [FITUR: EXPORT PDF - BUKU PEMBANTU PAJAK]
 */
export function exportBukuPembantuPajakPdf(penerimaan, pengeluaran, monthIndex, year) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('BUKU PEMBANTU PAJAK', 105, 15, { align: 'center' }); doc.text(`BULAN ${monthName} ${year}`, 105, 21, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Unit Kerja', 14, 30); doc.text(`: ${settings.unit_kerja || ''}`, 65, 30); doc.text('Kuasa Pengguna Anggaran', 14, 35); doc.text(`: ${settings.kpa_nama || ''}`, 65, 35); doc.text('Bendahara Pengeluaran Pembantu', 14, 40); doc.text(`: ${settings.bpp_nama || ''}`, 65, 40)

  const pajakPen = penerimaan.filter(p => p.jenis === 'Pajak' || p.jenis === 'Pajak LS').map(p => ({ ...p, type: 'in' }))
  const pajakPeng = pengeluaran.filter(p => { const u = (p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || '').toLowerCase(); return u.startsWith('setoran') || u.startsWith('dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS' }).map(p => ({ ...p, type: 'out' }))
  const allRows = [...pajakPen, ...pajakPeng].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))

  let runningSaldo = 0
  const body = allRows.map((r, i) => { runningSaldo += (r.type === 'in' ? r.jumlah : -r.jumlah); return [i + 1, formatTanggal(r.tanggal), r.keterangan || '', r.type === 'in' ? formatRupiah(r.jumlah).replace('Rp', '').trim() : '', r.type === 'out' ? formatRupiah(r.jumlah).replace('Rp', '').trim() : '', formatRupiah(runningSaldo).replace('Rp', '').trim()] })

  autoTable(doc, { startY: 48, head: [['No.', 'Tanggal', 'Uraian', 'Pemotongan (Rp)', 'Penyetoran (Rp)', 'Saldo (Rp)'], ['1', '2', '3', '4', '5', '6']], body: body, theme: 'grid', styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' }, columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } } })
  doc.save(`Buku_Pembantu_Pajak_${monthName}_${year}.pdf`)
}

/**
 * [FITUR: EXPORT PDF - BUKU SIMPANAN BANK]
 */
export function exportBukuSimpananBankPdf(rows, monthIndex, year) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('BUKU SIMPANAN BANK', 105, 15, { align: 'center' }); doc.text(`BULAN ${monthName} ${year}`, 105, 21, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Unit Kerja', 14, 30); doc.text(`: ${settings.unit_kerja || ''}`, 65, 30); doc.text('Kuasa Pengguna Anggaran', 14, 35); doc.text(`: ${settings.kpa_nama || ''}`, 65, 35); doc.text('Bendahara Pengeluaran Pembantu', 14, 40); doc.text(`: ${settings.bpp_nama || ''}`, 65, 40)

  let runningSaldo = 0
  const body = rows.map((r, i) => { runningSaldo += (r.debet || 0) - (r.kredit || 0); return [i + 1, formatTanggal(r.tanggal), r.uraian || '', r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : '', r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : '', formatRupiah(runningSaldo).replace('Rp', '').trim()] })

  autoTable(doc, { startY: 48, head: [['No.', 'Tanggal', 'Uraian', 'Setoran (Rp)', 'Penarikan (Rp)', 'Saldo (Rp)'], ['1', '2', '3', '4', '5', '6']], body: body, theme: 'grid', styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' }, columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } } })
  doc.save(`Buku_Simpanan_Bank_${monthName}_${year}.pdf`)
}

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

/**
 * [FITUR: EXPORT PDF - REKAP BULANAN]
 */
export function exportRekapBulananPdf(data, year = new Date().getFullYear()) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); const settings = useStore.getState().settings
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('REKAPITULASI PENERIMAAN DAN PENGELUARAN', 105, 15, { align: 'center' }); doc.text(`TAHUN ANGGARAN ${year}`, 105, 21, { align: 'center' })
  autoTable(doc, { startY: 35, head: [['Bulan', 'Penerimaan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']], body: data.map(r => [r.bulan, formatRupiah(r.penerimaan).replace('Rp', '').trim(), formatRupiah(r.pengeluaran).replace('Rp', '').trim(), formatRupiah(r.penerimaan - r.pengeluaran).replace('Rp', '').trim()]), theme: 'striped', headStyles: { fillColor: [124, 58, 237], halign: 'center' }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } } })
  doc.save('Rekap_Bulanan.pdf')
}
