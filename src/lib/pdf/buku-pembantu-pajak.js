import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { getMonthName } from './utils'
import { useStore } from '@/store/useStore'

export function exportBukuPembantuPajakPdf(rows, monthIndex, year = new Date().getFullYear(), totalsBulanLalu = { debet: 0, kredit: 0 }, customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings

  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

  // --- HEADER SECTION ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PEMERINTAH PROVINSI JAWA BARAT', 105, 12, { align: 'center' })
  doc.text('BADAN PENDAPATAN DAERAH', 105, 17, { align: 'center' })
  doc.setFontSize(11)
  doc.text('BUKU PEMBANTU PAJAK', 105, 23, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  const startY = 32
  const leftCol = 14
  const midCol = 65
  
  doc.text('SKPD', leftCol, startY)
  doc.text(`: ${settings.unit_kerja || ''}`, midCol, startY)
  
  doc.text('Kuasa Pengguna Anggaran', leftCol, startY + 5)
  doc.text(`: ${settings.kpa_nama || ''}`, midCol, startY + 5)
  
  doc.text('Bendahara Pengeluaran Pembantu', leftCol, startY + 10)
  doc.text(`: ${settings.bpp_nama || ''}`, midCol, startY + 10)

  doc.text('Bulan', leftCol, startY + 15)
  doc.text(`: ${monthName} ${year}`, midCol, startY + 15)

  // --- TABLE SECTION ---
  const head = [
    [
      { content: 'No.', rowSpan: 1 },
      { content: 'Tanggal', rowSpan: 1 },
      { content: 'Uraian', rowSpan: 1 },
      { content: 'Penerimaan', rowSpan: 1 },
      { content: 'Pengeluaran', rowSpan: 1 },
      { content: 'Saldo', rowSpan: 1 }
    ],
    ['1', '2', '3', '4', '5', '6']
  ]

  let runningSaldo = totalsBulanLalu.debet - totalsBulanLalu.kredit
  const tableData = rows.map((r, i) => {
    runningSaldo += (r.debet || 0) - (r.kredit || 0)
    return [
      i + 1,
      formatTanggal(r.tanggal),
      r.uraian || '',
      r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : '-',
      r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : '-',
      runningSaldo > 0 ? formatRupiah(runningSaldo).replace('Rp', '').trim() : '-'
    ]
  })

  const totalDebetIni = rows.reduce((s, r) => s + (r.debet || 0), 0)
  const totalKreditIni = rows.reduce((s, r) => s + (r.kredit || 0), 0)
  
  const totalDebetLalu = totalsBulanLalu.debet || 0
  const totalKreditLalu = totalsBulanLalu.kredit || 0

  const totalDebetSemua = totalDebetIni + totalDebetLalu
  const totalKreditSemua = totalKreditIni + totalKreditLalu

  const saldo = totalDebetSemua - totalKreditSemua

  const foot = [
    [
      { content: 'Jumlah bulan ini', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalDebetIni > 0 ? formatRupiah(totalDebetIni).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalKreditIni > 0 ? formatRupiah(totalKreditIni).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '-', styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Jumlah s/d bulan lalu', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalDebetLalu > 0 ? formatRupiah(totalDebetLalu).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalKreditLalu > 0 ? formatRupiah(totalKreditLalu).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '-', styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: `Jumlah semua s/d Tanggal ${lastDay} ${monthName} ${year}`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalDebetSemua > 0 ? formatRupiah(totalDebetSemua).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalKreditSemua > 0 ? formatRupiah(totalKreditSemua).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: saldo > 0 ? formatRupiah(saldo).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } }
    ]
  ]

  autoTable(doc, {
    startY: startY + 22,
    head: head,
    body: tableData,
    foot: foot,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold' },
    footStyles: { fillColor: [250, 250, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 'auto' },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 }
    }
  })

  // --- SIGNATURES SECTION ---
  let signY = doc.lastAutoTable.finalY + 15
  if (signY > 230) {
    doc.addPage()
    signY = 30
  }

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Mengetahui :', 14, signY)
  doc.text(`Sukaraja, ${lastDay} ${monthName.toLowerCase()} ${year}`, 145, signY)

  doc.text(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN', 14, signY + 5)
  doc.text(settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU', 145, signY + 5)

  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', 14, signY + 25)
  doc.text(settings.bpp_nama || '', 145, signY + 25)

  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, 14, signY + 29)
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 145, signY + 29)

  doc.save(`Buku_Pembantu_Pajak_${monthName}_${year}.pdf`)
}
