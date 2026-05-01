// src/lib/export-pdf.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from './format'
import { useStore } from '@/store/useStore'

function getMonthName(monthIndex) {
  const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER']
  return months[monthIndex] || ''
}

export function exportBKUPdf(rows, monthIndex, year = 2026) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings

  // --- HEADER SECTION ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('BUKU KAS UMUM', 105, 15, { align: 'center' })
  doc.text(`BULAN ${monthName} ${year}`, 105, 21, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  const startY = 30
  const leftCol = 14
  const midCol = 65
  
  doc.text('Unit Kerja', leftCol, startY)
  doc.text(`: ${settings.unit_kerja}`, midCol, startY)
  
  doc.text('Kuasa Pengguna Anggaran', leftCol, startY + 5)
  doc.text(`: ${settings.kpa_nama}`, midCol, startY + 5)
  
  doc.text('Bendahara Pengeluaran Pembantu', leftCol, startY + 10)
  doc.text(`: ${settings.bpp_nama}`, midCol, startY + 10)

  // --- TABLE SECTION ---
  // Header names with column indices (per user sample)
  const head = [
    [
      { content: 'No.', rowSpan: 1 },
      { content: 'Tanggal', rowSpan: 1 },
      { content: 'Kode Rekening', rowSpan: 1 },
      { content: 'Uraian', rowSpan: 1 },
      { content: 'Penerimaan', rowSpan: 1 },
      { content: 'Pengeluaran', rowSpan: 1 }
    ],
    ['1', '2', '3', '4', '5', '6']
  ]

  const tableData = rows.map((r, i) => [
    i + 1,
    formatTanggal(r.tanggal),
    r.kode_rekening || '',
    r.uraian || '',
    r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : '',
    r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : ''
  ])

  const totalDebet = rows.reduce((s, r) => s + (r.debet || 0), 0)
  const totalKredit = rows.reduce((s, r) => s + (r.kredit || 0), 0)
  const saldo = totalDebet - totalKredit

  autoTable(doc, {
    startY: startY + 18,
    head: head,
    body: tableData,
    theme: 'grid',
    styles: { 
      fontSize: 7.5, 
      cellPadding: 1.5, 
      lineColor: [0, 0, 0], 
      lineWidth: 0.1,
      textColor: [0, 0, 0]
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      fontStyle: 'bold', 
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, fontStyle: 'bold' },
      3: { cellWidth: 'auto', overflow: 'linebreak' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    },
    didDrawPage: (data) => {
      doc.setFontSize(7)
      doc.text(`Halaman : ${data.pageNumber}`, 180, 25)
    }
  })

  let finalY = doc.lastAutoTable.finalY + 8
  if (finalY > 230) { doc.addPage(); finalY = 20 }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  
  // Totals Row
  doc.text('Jumlah bulan ini', 130, finalY)
  doc.text(formatRupiah(totalDebet).replace('Rp', '').trim(), 175, finalY, { align: 'right' })
  doc.text(formatRupiah(totalKredit).replace('Rp', '').trim(), 200, finalY, { align: 'right' })

  doc.text('Saldo Buku', 130, finalY + 5)
  doc.text(formatRupiah(saldo).replace('Rp', '').trim(), 200, finalY + 5, { align: 'right' })

  // Closing Statement
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  const closingText = `Buku Kas Umum ditutup pada akhir bulan ${monthName.toLowerCase()} ${year} dengan saldo sebesar ${formatRupiah(saldo)}.`
  doc.text(closingText, 14, finalY + 15)

  // Signatures
  const signY = finalY + 30
  if (signY > 260) { doc.addPage(); } // Extra safety check

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  
  doc.text('Mengetahui :', 14, signY)
  doc.text('Kuasa Pengguna Anggaran,', 14, signY + 5)
  
  doc.text(`${settings.lokasi}, 30 ${monthName.toLowerCase()} ${year}`, 140, signY)
  doc.text('Bendahara Pengeluaran Pembantu,', 140, signY + 5)

  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama, 14, signY + 30)
  doc.text(settings.bpp_nama, 140, signY + 30)

  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip}`, 14, signY + 34)
  doc.text(`NIP. ${settings.bpp_nip}`, 140, signY + 34)

  doc.save(`BKU_${monthName}_${year}.pdf`)
}

export function exportBukuPembantuPdf(groups) {}
export function exportRealisasiPdf(subKegiatan, realisasiPerRek) {}
export function exportRekapBulananPdf(data) {}
