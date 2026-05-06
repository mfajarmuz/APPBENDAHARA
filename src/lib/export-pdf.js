// src/lib/export-pdf.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from './format'
import { useStore } from '@/store/useStore'

function getMonthName(monthIndex) {
  const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER']
  return months[monthIndex] || ''
}

function terbilang(angka) {
  const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"]
  if (angka < 12) return huruf[angka]
  if (angka < 20) return terbilang(angka - 10) + " Belas"
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + " Puluh" + (angka % 10 ? " " + terbilang(angka % 10) : "")
  if (angka < 200) return "Seratus" + (angka - 100 ? " " + terbilang(angka - 100) : "")
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + " Ratus" + (angka % 100 ? " " + terbilang(angka % 100) : "")
  if (angka < 2000) return "Seribu" + (angka - 1000 ? " " + terbilang(angka - 1000) : "")
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + " Ribu" + (angka % 1000 ? " " + terbilang(angka % 1000) : "")
  return angka.toString()
}

export function exportBKUPdf(rows, monthIndex, year = 2026, totalsBulanLalu = { debet: 0, kredit: 0 }) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings

  const lastDay = new Date(year, monthIndex + 1, 0).getDate()

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
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
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

  let finalY = doc.lastAutoTable.finalY + 5

  // Closing Statement
  doc.setFontSize(8)
  
  const dayName = new Date(year, monthIndex + 1, 0).toLocaleDateString('id-ID', { weekday: 'long' })
  const closingText = `Pada hari ${dayName} tanggal ${terbilang(lastDay)} bulan ${monthName} tahun ${terbilang(year)}, oleh kami Buku Kas Umum ditutup.`
  
  const wrappedClosing = doc.splitTextToSize(closingText, 180)
  doc.setFont('helvetica', 'normal')
  doc.text(wrappedClosing, 14, finalY + 5)

  let rincianY = finalY + 10 + (wrappedClosing.length * 2)
  
  const saldoTunai = 0
  const saldoBank = saldo
  const jumlahSaldo = saldoTunai + saldoBank

  doc.text('a. Saldo Tunai', 14, rincianY)
  doc.text(': Rp', 45, rincianY)
  doc.text(formatRupiah(saldoTunai).replace('Rp', '').trim(), 75, rincianY, { align: 'right' })
  rincianY += 5
  
  doc.text('b. Saldo Bank', 14, rincianY)
  doc.text(': Rp', 45, rincianY)
  doc.text(formatRupiah(saldoBank).replace('Rp', '').trim(), 75, rincianY, { align: 'right' })
  
  // Underline for addition
  doc.setLineWidth(0.2)
  doc.line(45, rincianY + 1.5, 77, rincianY + 1.5)
  doc.text('+', 79, rincianY + 1.5)
  
  rincianY += 5
  
  doc.text('Jumlah', 14, rincianY)
  doc.text(': Rp', 45, rincianY)
  doc.text(formatRupiah(jumlahSaldo).replace('Rp', '').trim(), 75, rincianY, { align: 'right' })
  rincianY += 5
  
  doc.text('Kelebihan Rp,-.', 14, rincianY)

  // Signatures
  let signY = rincianY + 15
  if (signY > 230) { 
    doc.addPage()
    signY = 20
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  
  doc.text('Mengetahui :', 14, signY)
  const kpaJabatanLines = doc.splitTextToSize(`${settings.kpa_jabatan},`, 80)
  doc.text(kpaJabatanLines, 14, signY + 5)
  
  doc.text(`${settings.lokasi}, ${lastDay} ${monthName.toLowerCase()} ${year}`, 140, signY)
  const bppJabatanLines = doc.splitTextToSize(`${settings.bpp_jabatan},`, 60)
  doc.text(bppJabatanLines, 140, signY + 5)

  const signOffset = Math.max(kpaJabatanLines.length, bppJabatanLines.length) * 5 + 20

  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama, 14, signY + signOffset)
  doc.text(settings.bpp_nama, 140, signY + signOffset)

  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip}`, 14, signY + signOffset + 4)
  doc.text(`NIP. ${settings.bpp_nip}`, 140, signY + signOffset + 4)

  doc.save(`BKU_${monthName}_${year}.pdf`)
}

function drawNPD(doc, item, subKegiatan, pengeluaran, bkuNumber = '-') {
  const settings = useStore.getState().settings
  
  const subK = item.sub_kegiatan
  const rek = item.kode_rekening
  const keg = subK?.kegiatan
  const prog = keg?.program

  // Format Program display (Use database relation if available, fallback to pattern mapping)
  const progKode = prog?.kode || (keg?.kode ? keg.kode.split('.').slice(0, 3).join('.') : '')
  const progNama = prog?.nama || (keg?.nama ? keg.nama.replace(/^(Kegiatan|Sub Kegiatan|SubKegiatan)\s+/i, '').toUpperCase().replace(/^/i, 'PROGRAM ') : '')
  const displayProgram = `${progKode} ${progNama}`.trim() || '-'

  // Calculate Realisasi (Akumulasi Belanja)
  // Total of all expenditures for this specific budget code up to this transaction
  const relatedPengeluaran = pengeluaran
    .filter(p => p.kode_rekening_id === item.kode_rekening_id)
    .sort((a, b) => {
      const d = new Date(a.tanggal) - new Date(b.tanggal)
      if (d !== 0) return d
      return String(a.id).localeCompare(String(b.id))
    })

  const currentIndex = relatedPengeluaran.findIndex(p => p.id === item.id)
  const pastAndCurrent = currentIndex !== -1 ? relatedPengeluaran.slice(0, currentIndex + 1) : [item]
  
  const akumulasiBelanja = pastAndCurrent.reduce((s, p) => s + p.jumlah, 0)
  const belanjaSekarang = item.jumlah
  const paguAnggaran = rek?.pagu_anggaran || 0
  const sisaAnggaran = paguAnggaran - akumulasiBelanja

  // --- HEADER ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PEMERINTAH PROVINSI JAWA BARAT', 105, 15, { align: 'center' })
  doc.text('Badan Pendapatan Daerah', 105, 20, { align: 'center' })
  doc.text('Nota Pencairan Dana (NPD)', 105, 25, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  let currentY = 35
  const labels = [
    ['No', `: ${bkuNumber}`],
    ['Tanggal', `: ${formatTanggal(item.tanggal)}`],
    ['Jenis NPD', ': Tanpa Panjar'],
    ['PPTK', `: ${settings.pptk_nama}`],
    ['Program', `: ${prog?.kode || ''} - ${prog?.nama || ''}`],
    ['Kegiatan', `: ${keg?.kode || ''} - ${keg?.nama || ''}`],
    ['Sub Kegiatan', `: ${subK?.kode || ''} - ${subK?.nama || ''}`],
    ['', ''],
    ['No. DPA', ': -'],
    ['Tahun Anggaran', `: ${new Date(item.tanggal).getFullYear()}`],
    ['Rincian Belanja', ':']
  ]

  labels.forEach(([label, value]) => {
    if (label) {
      doc.setFont('helvetica', 'bold')
      doc.text(String(label || ''), 14, currentY)
    }
    doc.setFont('helvetica', 'normal')
    
    const maxWidth = 150
    const lines = doc.splitTextToSize(String(value || ''), maxWidth)
    doc.text(lines, 45, currentY)
    currentY += (lines.length > 1 ? lines.length * 4.5 : 5)
  })

  // --- TABLE ---
  const head = [
    [
      { content: 'No', styles: { halign: 'center' } },
      { content: 'Kode - Nama Rekening', styles: { halign: 'center' } },
      { content: 'Anggaran', styles: { halign: 'center' } },
      { content: 'Belanja', styles: { halign: 'center' } },
      { content: 'Akumulasi\nBelanja', styles: { halign: 'center' } },
      { content: 'Sisa Anggaran', styles: { halign: 'center' } }
    ]
  ]

  const rincianText = item.pengeluaran_rincian?.length > 0
    ? item.pengeluaran_rincian.map(r => r.uraian).join(', ')
    : item.keterangan || 'Belanja'

  const body = [
    [
      1,
      `${rek?.kode || ''} ${rek?.uraian || ''}\n${rincianText}`,
      formatRupiah(paguAnggaran).replace('Rp', '').trim(),
      formatRupiah(belanjaSekarang).replace('Rp', '').trim(),
      formatRupiah(akumulasiBelanja).replace('Rp', '').trim(),
      formatRupiah(sisaAnggaran).replace('Rp', '').trim()
    ]
  ]

  autoTable(doc, {
    startY: currentY + 2,
    head: head,
    body: body,
    foot: [[
      { content: 'Jumlah', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: formatRupiah(paguAnggaran).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(belanjaSekarang).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(akumulasiBelanja).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(sisaAnggaran).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }
    ]],
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      cellPadding: 2, 
      lineColor: [0, 0, 0], 
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      valign: 'middle'
    },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    }
  })

  // --- SIGNATURES ---
  let signY = doc.lastAutoTable.finalY + 20
  if (signY > 230) {
    doc.addPage()
    signY = 30
  }

  doc.setFontSize(9)
  doc.text('Disetujui Oleh,', 50, signY, { align: 'center' })
  doc.text('Disetujui Oleh,', 155, signY, { align: 'center' })
  
  doc.setFont('helvetica', 'bold')
  doc.text('KUASA PENGGUNA ANGGARAN', 50, signY + 5, { align: 'center' })
  
  const pptkJabatan = (settings.pptk_jabatan || 'PEJABAT PELAKSANA TEKNIS KEGIATAN').toUpperCase()
  const pptkJabatanLines = doc.splitTextToSize(pptkJabatan, 80)
  doc.text(pptkJabatanLines, 155, signY + 5, { align: 'center' })

  const signOffset = Math.max(1, pptkJabatanLines.length) * 5 + 20

  doc.text(settings.kpa_nama || '', 50, signY + signOffset, { align: 'center' })
  doc.text(settings.pptk_nama || '', 155, signY + signOffset, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, 50, signY + signOffset + 4, { align: 'center' })
  doc.text(`NIP. ${settings.pptk_nip || ''}`, 155, signY + signOffset + 4, { align: 'center' })
}

export function exportNPDPdf(item, subKegiatan, pengeluaran, bkuNumber = '-') {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  drawNPD(doc, item, subKegiatan, pengeluaran, bkuNumber)
  
  const dateObj = new Date(item.tanggal)
  const fileMonth = getMonthName(dateObj.getMonth())
  const fileYear = dateObj.getFullYear()
  doc.save(`${bkuNumber}-NPD-${fileMonth}-${fileYear}.pdf`)
}

export function exportNPDBatchPdf(items, subKegiatan, pengeluaran, bkuRows) {
  if (!items || items.length === 0) return
  
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  
  // Pre-calculate BKU numbers and sort items by them
  const itemsWithBku = items.map(item => {
    const d = new Date(item.tanggal)
    const currentMonth = d.getMonth()
    const currentYear = d.getFullYear()
    
    const monthlyBku = bkuRows.filter(r => {
      const rd = new Date(r.tanggal)
      return rd.getMonth() === currentMonth && rd.getFullYear() === currentYear
    })
    const bkuIdx = monthlyBku.findIndex(r => r.id === item.id && r.type === 'out')
    const bkuNumber = bkuIdx !== -1 ? bkuIdx + 1 : 999999 // Fallback to end
    
    return { item, bkuNumber }
  }).sort((a, b) => a.bkuNumber - b.bkuNumber)
  
  itemsWithBku.forEach(({ item, bkuNumber }, index) => {
    if (index > 0) doc.addPage()
    drawNPD(doc, item, subKegiatan, pengeluaran, bkuNumber)
  })
  
  const firstItem = itemsWithBku[0].item
  const dateObj = new Date(firstItem.tanggal)
  const fileMonth = getMonthName(dateObj.getMonth())
  const fileYear = dateObj.getFullYear()
  
  doc.save(`BATCH-NPD-${fileMonth}-${fileYear}.pdf`)
}

export function exportBukuPembantuPdf(groups) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings

  groups.forEach((group, idx) => {
    if (idx > 0) doc.addPage()

    const rek = group.rekening
    const rows = group.rows

    // --- HEADER ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('BUKU PEMBANTU KAS', 105, 15, { align: 'center' })
    doc.text('PER RINCIAN OBJEK BELANJA', 105, 21, { align: 'center' })

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const startY = 30
    doc.text('Unit Kerja', 14, startY)
    doc.text(`: ${settings.unit_kerja || ''}`, 65, startY)
    doc.text('Kode Rekening', 14, startY + 5)
    doc.text(`: ${rek.kode || ''}`, 65, startY + 5)
    doc.text('Uraian Rekening', 14, startY + 10)
    doc.text(`: ${rek.uraian || ''}`, 65, startY + 10)

    // --- TABLE ---
    const head = [
      ['No.', 'Tanggal', 'Uraian', 'Debet', 'Kredit', 'Saldo'],
      ['1', '2', '3', '4', '5', '6']
    ]

    let currentSaldo = rek.pagu_anggaran || 0
    const body = rows.map((r, i) => {
      currentSaldo -= (r.jumlah || 0)
      return [
        i + 1,
        formatTanggal(r.tanggal),
        r.keterangan || 'Belanja',
        '', // Debet (usually 0 for pembantu as it's for expenditures)
        formatRupiah(r.jumlah || 0).replace('Rp', '').trim(),
        formatRupiah(currentSaldo).replace('Rp', '').trim()
      ]
    })

    autoTable(doc, {
      startY: startY + 18,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' }
      }
    })

    // Signatures at the bottom of each group's last page
    const finalY = doc.lastAutoTable.finalY + 15
    let signY = finalY > 230 ? (doc.addPage(), 30) : finalY
    
    doc.setFontSize(9)
    doc.text('Mengetahui :', 14, signY)
    
    const kpaJabatanLines = doc.splitTextToSize(`${settings.kpa_jabatan || 'Kuasa Pengguna Anggaran'},`, 80)
    doc.text(kpaJabatanLines, 14, signY + 5)
    
    doc.text(`${settings.lokasi || ''}, ${new Date().getFullYear()}`, 140, signY)
    
    const bppJabatanLines = doc.splitTextToSize(`${settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu'},`, 60)
    doc.text(bppJabatanLines, 140, signY + 5)

    const signOffset = Math.max(kpaJabatanLines.length, bppJabatanLines.length) * 5 + 20

    doc.setFont('helvetica', 'bold')
    doc.text(settings.kpa_nama || '', 14, signY + signOffset)
    doc.text(settings.bpp_nama || '', 140, signY + signOffset)

    doc.setFont('helvetica', 'normal')
    doc.text(`NIP. ${settings.kpa_nip || ''}`, 14, signY + signOffset + 4)
    doc.text(`NIP. ${settings.bpp_nip || ''}`, 140, signY + signOffset + 4)
  })

  doc.save(`Buku_Pembantu_${new Date().getTime()}.pdf`)
}

export function exportRealisasiPdf(subKegiatan, realisasiPerRek) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('LAPORAN REALISASI ANGGARAN', 105, 15, { align: 'center' })
  doc.text(`TAHUN ANGGARAN ${new Date().getFullYear()}`, 105, 21, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Unit Kerja : ${settings.unit_kerja}`, 14, 30)

  const head = [['Kode', 'Uraian / Nama Kegiatan', 'Pagu (Rp)', 'Realisasi (Rp)', 'Sisa (Rp)', '%']]
  const body = []

  subKegiatan.forEach(sk => {
    const skReal = (sk.kode_rekening ?? []).reduce((s, r) => s + (realisasiPerRek[r.id] ?? 0), 0)
    const skPagu = (sk.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0)
    
    body.push([
      { content: sk.kode, styles: { fontStyle: 'bold' } },
      { content: sk.nama, styles: { fontStyle: 'bold' } },
      { content: formatRupiah(skPagu).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatRupiah(skReal).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatRupiah(skPagu - skReal).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `${persen(skReal, skPagu)}%`, styles: { fontStyle: 'bold', halign: 'center' } }
    ])

    ;(sk.kode_rekening ?? []).forEach(rek => {
      const real = realisasiPerRek[rek.id] ?? 0
      body.push([
        `  ${rek.kode}`,
        `  ${rek.uraian}`,
        { content: formatRupiah(rek.pagu_anggaran).replace('Rp', '').trim(), styles: { halign: 'right' } },
        { content: formatRupiah(real).replace('Rp', '').trim(), styles: { halign: 'right' } },
        { content: formatRupiah(rek.pagu_anggaran - real).replace('Rp', '').trim(), styles: { halign: 'right' } },
        { content: `${persen(real, rek.pagu_anggaran)}%`, styles: { halign: 'center' } }
      ])
    })
  })

  autoTable(doc, {
    startY: 38,
    head: head,
    body: body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center' },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 12 } }
  })

  doc.save('Laporan_Realisasi_Anggaran.pdf')
}

export function exportRekapBulananPdf(data) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('REKAPITULASI PENERIMAAN DAN PENGELUARAN', 105, 15, { align: 'center' })
  doc.text(`TAHUN ANGGARAN ${new Date().getFullYear()}`, 105, 21, { align: 'center' })

  autoTable(doc, {
    startY: 35,
    head: [['Bulan', 'Penerimaan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']],
    body: data.map(r => [
      r.bulan,
      formatRupiah(r.penerimaan).replace('Rp', '').trim(),
      formatRupiah(r.pengeluaran).replace('Rp', '').trim(),
      formatRupiah(r.penerimaan - r.pengeluaran).replace('Rp', '').trim()
    ]),
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237], halign: 'center' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } }
  })

  doc.save('Rekap_Bulanan.pdf')
}

export function exportLPJAdministratifPdf(monthIndex, year, subKegiatan, pengeluaran) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [330, 215] })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()

  // --- HEADER ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('LAPORAN PERTANGGUNGJAWABAN BENDAHARA PENGELUARAN PEMBANTU', 165, 15, { align: 'center' })
  doc.setFontSize(11)
  doc.text(`BULAN: ${monthName} ${year}`, 165, 21, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const startY = 30
  doc.text('Unit Kerja', 14, startY)
  doc.text(`: ${settings.unit_kerja || ''}`, 65, startY)
  doc.text('Sub Kegiatan', 14, startY + 5)
  doc.text(`: ${subKegiatan?.kode || ''} ${subKegiatan?.nama || ''}`, 65, startY + 5)
  doc.text('Kuasa Pengguna Anggaran', 14, startY + 10)
  doc.text(`: ${settings.kpa_nama || ''}`, 65, startY + 10)
  doc.text('Bendahara Pengeluaran Pembantu', 14, startY + 15)
  doc.text(`: ${settings.bpp_nama || ''}`, 65, startY + 15)

  // --- DATA AGGREGATION ---
  const body = []
  let globalTotals = {
    lsGaji: { lalu: 0, ini: 0, sd: 0 },
    lsBarjas: { lalu: 0, ini: 0, sd: 0 },
    upGuTu: { lalu: 0, ini: 0, sd: 0 },
    totalSd: 0
  }

  const listRekening = subKegiatan?.kode_rekening || []
  listRekening.forEach((rek, idx) => {
    const rekPengeluaran = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
    
    const filterByTime = (items, isIni) => items.filter(p => {
      const d = new Date(p.tanggal)
      const m = d.getMonth()
      const y = d.getFullYear()
      if (y !== year) return false
      return isIni ? m === monthIndex : m < monthIndex
    })

    const lsBarjasLalu = filterByTime(rekPengeluaran.filter(p => p.jenis === 'LS'), false).reduce((s, p) => s + p.jumlah, 0)
    const lsBarjasIni = filterByTime(rekPengeluaran.filter(p => p.jenis === 'LS'), true).reduce((s, p) => s + p.jumlah, 0)
    const lsBarjasSd = lsBarjasLalu + lsBarjasIni

    const upGuTuLalu = filterByTime(rekPengeluaran.filter(p => p.jenis === 'GU'), false).reduce((s, p) => s + p.jumlah, 0)
    const upGuTuIni = filterByTime(rekPengeluaran.filter(p => p.jenis === 'GU'), true).reduce((s, p) => s + p.jumlah, 0)
    const upGuTuSd = upGuTuLalu + upGuTuIni

    const totalRekSd = lsBarjasSd + upGuTuSd // LS Gaji is 0
    const sisaPagu = (rek.pagu_anggaran || 0) - totalRekSd

    body.push([
      idx + 1,
      rek.kode,
      rek.uraian,
      '-', '-', '-', // LS Gaji
      formatRupiah(lsBarjasLalu).replace('Rp', '').trim(),
      formatRupiah(lsBarjasIni).replace('Rp', '').trim(),
      formatRupiah(lsBarjasSd).replace('Rp', '').trim(),
      formatRupiah(upGuTuLalu).replace('Rp', '').trim(),
      formatRupiah(upGuTuIni).replace('Rp', '').trim(),
      formatRupiah(upGuTuSd).replace('Rp', '').trim(),
      formatRupiah(totalRekSd).replace('Rp', '').trim(),
      formatRupiah(sisaPagu).replace('Rp', '').trim()
    ])

    globalTotals.lsBarjas.lalu += lsBarjasLalu
    globalTotals.lsBarjas.ini += lsBarjasIni
    globalTotals.lsBarjas.sd += lsBarjasSd
    globalTotals.upGuTu.lalu += upGuTuLalu
    globalTotals.upGuTu.ini += upGuTuIni
    globalTotals.upGuTu.sd += upGuTuSd
    globalTotals.totalSd += totalRekSd
  })

  // --- TABLE ---
  const head = [
    [
      { content: 'No', rowSpan: 2 },
      { content: 'Kode Rekening', rowSpan: 2 },
      { content: 'Uraian', rowSpan: 2 },
      { content: 'LS Gaji', colSpan: 3 },
      { content: 'LS Barang & Jasa', colSpan: 3 },
      { content: 'UP/GU/TU', colSpan: 3 },
      { content: 'Jumlah s.d. Bulan Ini', rowSpan: 2 },
      { content: 'Sisa Pagu', rowSpan: 2 }
    ],
    [
      'Lalu', 'Ini', 'S.D',
      'Lalu', 'Ini', 'S.D',
      'Lalu', 'Ini', 'S.D'
    ]
  ]

  const foot = [
    [
      { content: 'JUMLAH', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
      '-', '-', '-',
      formatRupiah(globalTotals.lsBarjas.lalu).replace('Rp', '').trim(),
      formatRupiah(globalTotals.lsBarjas.ini).replace('Rp', '').trim(),
      formatRupiah(globalTotals.lsBarjas.sd).replace('Rp', '').trim(),
      formatRupiah(globalTotals.upGuTu.lalu).replace('Rp', '').trim(),
      formatRupiah(globalTotals.upGuTu.ini).replace('Rp', '').trim(),
      formatRupiah(globalTotals.upGuTu.sd).replace('Rp', '').trim(),
      formatRupiah(globalTotals.totalSd).replace('Rp', '').trim(),
      '' // Sisa Pagu total usually not shown or sum of all sisa
    ]
  ]

  autoTable(doc, {
    startY: startY + 22,
    head: head,
    body: body,
    foot: foot,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
    footStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' },
      10: { cellWidth: 18, halign: 'right' },
      11: { cellWidth: 18, halign: 'right' },
      12: { cellWidth: 20, halign: 'right' },
      13: { cellWidth: 20, halign: 'right' }
    }
  })

  // --- SIGNATURES ---
  let signY = doc.lastAutoTable.finalY + 15
  if (signY > 180) {
    doc.addPage()
    signY = 20
  }

  doc.setFontSize(9)
  doc.text('Mengetahui :', 40, signY)
  const kpaJabatanLines = doc.splitTextToSize(`${settings.kpa_jabatan || 'Kuasa Pengguna Anggaran'},`, 80)
  doc.text(kpaJabatanLines, 40, signY + 5)
  
  doc.text(`${settings.lokasi || ''}, ${lastDay} ${monthName.toLowerCase()} ${year}`, 230, signY)
  const bppJabatanLines = doc.splitTextToSize(`${settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu'},`, 80)
  doc.text(bppJabatanLines, 230, signY + 5)

  const signOffset = Math.max(kpaJabatanLines.length, bppJabatanLines.length) * 5 + 20

  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', 40, signY + signOffset)
  doc.text(settings.bpp_nama || '', 230, signY + signOffset)

  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, 40, signY + signOffset + 4)
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 230, signY + signOffset + 4)

  doc.save(`LPJ_Administratif_${monthName}_${year}.pdf`)
}

function persen(v, total) {
  if (!total) return 0
  return Math.round((v / total) * 100)
}
