import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName, terbilang } from './utils'

/**
 * [FITUR: EXPORT PDF - BUKU KAS UMUM]
 * Menghasilkan file PDF untuk laporan Buku Kas Umum bulanan.
 * Menggunakan jsPDF-AutoTable untuk layout tabel.
 */
export function exportBKUPdf(rows, monthIndex, year = new Date().getFullYear(), totalsBulanLalu = { debet: 0, kredit: 0 }, customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings

  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

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
  doc.text(`: ${settings.unit_kerja || ''}`, midCol, startY)
  
  doc.text('Kuasa Pengguna Anggaran', leftCol, startY + 5)
  doc.text(`: ${settings.kpa_nama || ''}`, midCol, startY + 5)
  
  doc.text('Bendahara Pengeluaran Pembantu', leftCol, startY + 10)
  doc.text(`: ${settings.bpp_nama || ''}`, midCol, startY + 10)

  // --- TABLE SECTION ---
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

  const totalDebetIni = rows.reduce((s, r) => s + (r.debet || 0), 0)
  const totalKreditIni = rows.reduce((s, r) => s + (r.kredit || 0), 0)
  
  const totalDebetLalu = totalsBulanLalu.debet || 0
  const totalKreditLalu = totalsBulanLalu.kredit || 0

  const totalDebetSemua = totalDebetIni + totalDebetLalu
  const totalKreditSemua = totalKreditIni + totalKreditLalu

  const saldo = totalDebetSemua - totalKreditSemua

  const foot = [
    [
      { content: 'Jumlah bulan ini', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalDebetIni).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalKreditIni).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Jumlah s/d bulan lalu', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalDebetLalu).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalKreditLalu).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: `Jumlah Semua s/d Tanggal ${lastDay} ${monthName} ${year}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalDebetSemua).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalKreditSemua).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Saldo Buku', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(saldo).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }
    ]
  ]

  autoTable(doc, {
    startY: startY + 18,
    head: head,
    body: tableData,
    foot: foot,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, fontStyle: 'bold' },
      3: { cellWidth: 'auto', overflow: 'linebreak' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    }
  })

  let finalY = doc.lastAutoTable.finalY + 8

  // Hitung total tinggi blok closing + rincian + tanda tangan (~85mm)
  const totalBlockHeight = 85
  const pageHeight = doc.internal.pageSize.getHeight()
  if (finalY + totalBlockHeight > pageHeight - 10) {
    doc.addPage()
    finalY = 20
  }

  doc.setFontSize(8)
  const dayName = customDate ? new Date(customDate).toLocaleDateString('id-ID', { weekday: 'long' }) : new Date(year, monthIndex + 1, 0).toLocaleDateString('id-ID', { weekday: 'long' })
  const closingText = `Pada hari ${dayName} tanggal ${terbilang(lastDay)} bulan ${monthName} tahun ${terbilang(year)}, oleh kami Buku Kas Umum ditutup.`
  const wrappedClosing = doc.splitTextToSize(closingText, 180)
  doc.setFont('helvetica', 'normal')
  doc.text(wrappedClosing, 14, finalY)
  let rincianY = finalY + 5 + (wrappedClosing.length * 3.5)
  // [CATATAN]: Saldo tunai sementara di-hardcode 0 karena aplikasi belum memisahkan arus kas tunai/bank.
  // Jika di masa depan ada input saldo tunai, ambil dari store.
  const saldoTunai = 0; const saldoBank = saldo; const jumlahSaldo = saldoTunai + saldoBank
  doc.text('a. Saldo Tunai', 14, rincianY); doc.text(': Rp', 45, rincianY); doc.text(formatRupiah(saldoTunai).replace('Rp', '').trim(), 75, rincianY, { align: 'right' }); rincianY += 5
  doc.text('b. Saldo Bank', 14, rincianY); doc.text(': Rp', 45, rincianY); doc.text(formatRupiah(saldoBank).replace('Rp', '').trim(), 75, rincianY, { align: 'right' })
  doc.setLineWidth(0.2); doc.line(45, rincianY + 1.5, 77, rincianY + 1.5); doc.text('+', 79, rincianY + 1.5); rincianY += 5
  doc.text('Jumlah', 14, rincianY); doc.text(': Rp', 45, rincianY); doc.text(formatRupiah(jumlahSaldo).replace('Rp', '').trim(), 75, rincianY, { align: 'right' }); rincianY += 5
  doc.text('Kelebihan Rp,-.', 14, rincianY)
  let signY = rincianY + 15
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Mengetahui :', 14, signY)
  const kpaJabatanLines = doc.splitTextToSize(`${settings.kpa_jabatan},`, 80); doc.text(kpaJabatanLines, 14, signY + 5)
  doc.text(`${settings.lokasi}, ${lastDay} ${monthName.toLowerCase()} ${year}`, 140, signY)
  const bppJabatanLines = doc.splitTextToSize(`${settings.bpp_jabatan},`, 60); doc.text(bppJabatanLines, 140, signY + 5)
  const signOffset = Math.max(kpaJabatanLines.length, bppJabatanLines.length) * 5 + 20
  doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama, 14, signY + signOffset); doc.text(settings.bpp_nama, 140, signY + signOffset)
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip}`, 14, signY + signOffset + 4); doc.text(`NIP. ${settings.bpp_nip}`, 140, signY + signOffset + 4)
  doc.save(`BKU_${monthName}_${year}.pdf`)
}

/**
 * [FITUR: EXPORT PDF - BKU PER SUB KEGIATAN]
 */
export function exportBKUSubKegPdf(rows, monthIndex, year, totalsBulanLalu = { debet: 0, kredit: 0 }, subKegiatanList = [], customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

  // 1. Beri nomor BKU global pada setiap row
  const numberedRows = rows.map((r, i) => ({ ...r, bkuNo: i + 1 }))

  // 2. Kelompokkan berdasarkan sub kegiatan
  const groups = new Map()

  numberedRows.forEach(r => {
    let skKey = 'Pajak'
    let skLabel = 'Pajak / Penerimaan Umum'

    if (r.kode_rekening && r.kode_rekening !== 'Pajak') {
      const matched = subKegiatanList.find(sk => r.kode_rekening.startsWith(sk.kode + '.'))
      if (matched) {
        skKey = matched.kode
        skLabel = `${matched.kode} — ${matched.nama}`
      } else {
        skKey = r.kode_rekening
        skLabel = r.kode_rekening
      }
    }

    if (!groups.has(skKey)) {
      groups.set(skKey, { label: skLabel, rows: [] })
    }
    groups.get(skKey).rows.push(r)
  })

  // 3. Urutkan groups
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === 'Pajak') return 1
    if (b === 'Pajak') return -1
    return a.localeCompare(b)
  })

  let isFirstPage = true

  sortedKeys.forEach(skKey => {
    const group = groups.get(skKey)
    const gRows = group.rows

    if (!isFirstPage) doc.addPage()
    isFirstPage = false

    // --- HEADER ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('BUKU KAS UMUM - PER SUB KEGIATAN', 105, 13, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`BULAN ${monthName} ${year}`, 105, 19, { align: 'center' })

    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    const startY = 27
    const leftCol = 14; const midCol = 65
    doc.text('Unit Kerja', leftCol, startY); doc.text(`: ${settings.unit_kerja || ''}`, midCol, startY)
    doc.text('Kuasa Pengguna Anggaran', leftCol, startY + 4); doc.text(`: ${settings.kpa_nama || ''}`, midCol, startY + 4)
    doc.text('Bendahara Pengeluaran Pembantu', leftCol, startY + 8); doc.text(`: ${settings.bpp_nama || ''}`, midCol, startY + 8)

    // Sub Kegiatan Label
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
    doc.text('Sub Kegiatan', leftCol, startY + 14)
    doc.setFont('helvetica', 'normal')
    const skLabelLines = doc.splitTextToSize(`: ${group.label}`, 120)
    doc.text(skLabelLines, midCol, startY + 14)

    const tableStartY = startY + 16 + (skLabelLines.length * 3.5)

    // --- TABLE ---
    const head = [
      [
        { content: 'No. BKU', rowSpan: 1 },
        { content: 'Tanggal', rowSpan: 1 },
        { content: 'Kode Rekening', rowSpan: 1 },
        { content: 'Uraian', rowSpan: 1 },
        { content: 'Penerimaan', rowSpan: 1 },
        { content: 'Pengeluaran', rowSpan: 1 }
      ],
      ['1', '2', '3', '4', '5', '6']
    ]

    const tableData = gRows.map(r => [
      r.bkuNo,
      formatTanggal(r.tanggal),
      r.kode_rekening || '',
      r.uraian || '',
      r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : '',
      r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : ''
    ])

    const totalDebet = gRows.reduce((s, r) => s + (r.debet || 0), 0)
    const totalKredit = gRows.reduce((s, r) => s + (r.kredit || 0), 0)

    const foot = [
      [
        { content: 'Jumlah', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totalDebet > 0 ? formatRupiah(totalDebet).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totalKredit > 0 ? formatRupiah(totalKredit).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } }
      ]
    ]

    autoTable(doc, {
      startY: tableStartY,
      head: head, body: tableData, foot: foot,
      showFoot: 'lastPage',
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 'auto', overflow: 'linebreak' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      }
    })
  })

  // Tanda tangan
  let signY = doc.lastAutoTable.finalY + 15
  const pageHeight = doc.internal.pageSize.getHeight()
  if (signY + 45 > pageHeight - 10) { doc.addPage(); signY = 20 }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text('Mengetahui :', 14, signY)
  const kpaJabatanLines = doc.splitTextToSize(`${settings.kpa_jabatan},`, 80); doc.text(kpaJabatanLines, 14, signY + 5)
  doc.text(`${settings.lokasi}, ${lastDay} ${monthName.toLowerCase()} ${year}`, 140, signY)
  const bppJabatanLines = doc.splitTextToSize(`${settings.bpp_jabatan},`, 60); doc.text(bppJabatanLines, 140, signY + 5)
  const signOffset = Math.max(kpaJabatanLines.length, bppJabatanLines.length) * 5 + 20
  doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama || '', 14, signY + signOffset); doc.text(settings.bpp_nama || '', 140, signY + signOffset)
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, 14, signY + signOffset + 4); doc.text(`NIP. ${settings.bpp_nip || ''}`, 140, signY + signOffset + 4)
  doc.save(`BKU_SubKeg_${monthName}_${year}.pdf`)
}
