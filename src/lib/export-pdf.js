// src/lib/export-pdf.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from './format'

const UNIT = 'UPTD BAPENDA KAB. TASIKMALAYA'
const TA = 'Tahun Anggaran 2026'

function makeDoc() {
  return new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
}

function addHeader(doc, title) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 148, 14, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(UNIT, 148, 20, { align: 'center' })
  doc.text(TA, 148, 26, { align: 'center' })
}

export function exportBKUPdf(rows) {
  const doc = makeDoc()
  addHeader(doc, 'BUKU KAS UMUM (BKU)')

  let saldo = 0
  const body = rows.map((row, i) => {
    saldo += (row.debet ?? 0) - (row.kredit ?? 0)
    return [
      i + 1,
      formatTanggal(row.tanggal),
      row.no_bukti ?? '-',
      row.uraian,
      row.debet ? formatRupiah(row.debet) : '',
      row.kredit ? formatRupiah(row.kredit) : '',
      formatRupiah(saldo),
    ]
  })

  autoTable(doc, {
    startY: 32,
    head: [['No', 'Tanggal', 'No. Bukti', 'Uraian', 'Debet', 'Kredit', 'Saldo']],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  })

  doc.save('BKU.pdf')
}

export function exportBukuPembantuPdf(groups) {
  const doc = makeDoc()
  addHeader(doc, 'BUKU PEMBANTU KAS')

  let startY = 32
  groups.forEach(({ rekening, rows }) => {
    const realisasi = rows.reduce((s, r) => s + r.jumlah, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${rekening.kode} — ${rekening.uraian}`, 14, startY)
    doc.setFont('helvetica', 'normal')

    const body = rows.map((r, i) => [
      i + 1,
      formatTanggal(r.tanggal),
      r.no_bukti,
      r.keterangan ?? '-',
      formatRupiah(r.jumlah),
    ])

    body.push(['', '', '', 'Total Realisasi', formatRupiah(realisasi)])
    body.push(['', '', '', 'Sisa', formatRupiah(rekening.pagu_anggaran - realisasi)])

    autoTable(doc, {
      startY: startY + 4,
      head: [['No', 'Tanggal', 'No. Bukti', 'Keterangan', 'Jumlah']],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [124, 58, 237], textColor: 255 },
      columnStyles: { 4: { halign: 'right' } },
    })

    startY = doc.lastAutoTable.finalY + 10
    if (startY > 180) { doc.addPage(); startY = 14 }
  })

  doc.save('BukuPembantu.pdf')
}

export function exportRealisasiPdf(subKegiatan, realisasiPerRek) {
  const doc = makeDoc()
  addHeader(doc, 'LAPORAN REALISASI ANGGARAN (SPJ)')

  const body = []
  subKegiatan.forEach(sk => {
    const skReal = (sk.kode_rekening ?? []).reduce((s, r) => s + (realisasiPerRek[r.id] ?? 0), 0)
    body.push([
      { content: sk.kode, styles: { fontStyle: 'bold' } },
      { content: sk.nama, styles: { fontStyle: 'bold' } },
      { content: formatRupiah(sk.total_pagu), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatRupiah(skReal), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `${Math.min(100, Math.round(skReal / sk.total_pagu * 100)) || 0}%`, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatRupiah(sk.total_pagu - skReal), styles: { fontStyle: 'bold', halign: 'right' } },
    ])
    ;(sk.kode_rekening ?? []).forEach(r => {
      const real = realisasiPerRek[r.id] ?? 0
      body.push([
        `  ${r.kode}`,
        `  ${r.uraian}`,
        { content: formatRupiah(r.pagu_anggaran), styles: { halign: 'right' } },
        { content: formatRupiah(real), styles: { halign: 'right' } },
        { content: `${Math.min(100, Math.round(real / r.pagu_anggaran * 100)) || 0}%`, styles: { halign: 'right' } },
        { content: formatRupiah(r.pagu_anggaran - real), styles: { halign: 'right' } },
      ])
    })
  })

  autoTable(doc, {
    startY: 32,
    head: [['Kode', 'Uraian', 'Pagu', 'Realisasi', '%', 'Sisa']],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255 },
  })

  doc.save('Realisasi-SPJ.pdf')
}

export function exportRekapBulananPdf(data) {
  const doc = makeDoc()
  addHeader(doc, 'REKAP BULANAN PENERIMAAN DAN PENGELUARAN')

  let saldo = 0
  const body = data.map(row => {
    saldo += row.penerimaan - row.pengeluaran
    return [
      row.bulan,
      formatRupiah(row.penerimaan),
      formatRupiah(row.pengeluaran),
      formatRupiah(saldo),
    ]
  })

  autoTable(doc, {
    startY: 32,
    head: [['Bulan', 'Penerimaan', 'Pengeluaran', 'Saldo Kumulatif']],
    body,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  })

  doc.save('RekapBulanan.pdf')
}
