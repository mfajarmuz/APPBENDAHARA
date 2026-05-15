// src/lib/export-pdf.js
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatRupiah, formatTanggal } from './format'
import { useStore } from '@/store/useStore'
import logoJabar from '@/assets/logo-jabar.png'

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

export function exportBKUSubKegPdf(rows, monthIndex, year, totalsBulanLalu = { debet: 0, kredit: 0 }, subKegiatanList = [], customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

  // 1. Beri nomor BKU global pada setiap row
  const numberedRows = rows.map((r, i) => ({ ...r, bkuNo: i + 1 }))

  // 2. Kelompokkan berdasarkan sub kegiatan
  // Ambil kode sub kegiatan dari kode_rekening (prefix sebelum kode rek belanja)
  // Format kode_rekening di BKU: "<kode_sub_kegiatan>.<kode_rek>" atau "Pajak"
  const groups = new Map()

  numberedRows.forEach(r => {
    let skKey = 'Pajak'
    let skLabel = 'Pajak / Penerimaan Umum'

    if (r.kode_rekening && r.kode_rekening !== 'Pajak') {
      // Cari sub kegiatan yang kodenya menjadi prefix dari kode_rekening BKU
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

  // 3. Urutkan groups: Sub Kegiatan di depan, Pajak di belakang
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

  // Tanda tangan di halaman terakhir
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
export async function exportBAPemeriksaanKasPdf(monthIndex, year, saldoBuku, customDate = null) {
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

  const fmt = (val) => val > 0 ? formatRupiah(val).replace('Rp', '').trim() : 'Nihil'

  const dateObj = customDate ? new Date(customDate) : new Date(year, monthIndex + 1, 0)
  const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' })
  const tglTerbilang = terbilang(lastDay)
  const bulanNama = getMonthName(monthIndex)
  const tahunTerbilang = terbilang(year)

  const getBase64 = async (url) => {
    return new Promise((resolve) => {
      let isResolved = false
      const timeout = setTimeout(() => {
        if (!isResolved) { isResolved = true; resolve('') }
      }, 1500) // Timeout 1.5 detik agar tidak hang

      const img = new Image()
      img.onload = () => {
        if (isResolved) return
        isResolved = true
        clearTimeout(timeout)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch (error) {
          resolve('')
        }
      }
      img.onerror = () => {
        if (isResolved) return
        isResolved = true
        clearTimeout(timeout)
        resolve('')
      }
      img.src = url
    })
  }

  // DEBUG ALERTS
  // alert('1. Mulai Export BA Kas')
  const logoBase64 = await getBase64(logoJabar)
  // alert('2. Logo Base64: ' + (logoBase64 ? 'Tersedia' : 'Gagal/Kosong'))

  const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 215mm 330mm;
          margin: 0.5cm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          width: 210mm; /* A4 width as fallback */
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.35;
          color: black;
          margin: 0;
          padding: 0;
        }
        .kop-surat {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 3px solid black;
          padding-bottom: 6px;
          position: relative;
        }
        .kop-surat::after {
          content: "";
          position: absolute;
          bottom: -3px;
          left: 0;
          right: 0;
          border-bottom: 1px solid black;
        }
        .kop-logo {
          width: 90px;
          height: auto;
          margin-right: 20px;
        }
        .kop-text {
          flex: 1;
          text-align: center;
          font-family: Arial, sans-serif;
        }
        .kop-text p {
          margin: 0;
          line-height: 1.15;
        }
        .judul {
          text-align: center;
          margin-top: 8px;
          margin-bottom: 10px;
          font-family: Arial, sans-serif;
        }
        .judul h3 {
          margin: 0;
          font-size: 11pt;
          text-decoration: underline;
        }
        .judul p {
          margin: 0;
          font-size: 10pt;
          font-weight: bold;
          margin-top: 2px;
        }
        .content-text {
          text-align: justify;
          margin-bottom: 6px;
        }
        .identitas-table {
          margin-left: 30px;
          margin-bottom: 6px;
          border: none;
          width: 100%;
        }
        .identitas-table td {
          vertical-align: top;
          padding-bottom: 2px;
        }
        .col-label { width: 100px; padding-right: 10px; }
        .col-sep { width: 20px; text-align: center; }
        .col-val { font-weight: bold; }
        .col-val-normal { font-weight: normal; }

        .money-row { 
          display: flex; 
          align-items: baseline; 
          margin-bottom: 4px;
        }
        .money-label { flex: 0 0 auto; }
        .money-dots { 
          flex: 1 1 auto; 
          border-bottom: 1px dotted #000; 
          margin: 0 4px; 
          height: 1em; 
          transform: translateY(-4px); 
        }
        .money-currency { flex: 0 0 40px; text-align: left; padding-left: 10px; }
        .money-value { 
          flex: 0 0 120px; 
          text-align: right; 
          font-variant-numeric: tabular-nums;
        }
        .tanda-tangan {
          margin-top: 15px;
          width: 100%;
        }
        .tanda-tangan td {
          width: 50%;
          text-align: center;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="kop-surat">
        <img src="${logoBase64}" class="kop-logo" />
        <div class="kop-text">
          <p style="font-size: 14pt;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
          <p style="font-size: 16pt; font-weight: bold;">BADAN PENDAPATAN DAERAH</p>
          <p style="font-size: 16pt; font-weight: bold;">PUSAT PENGELOLAAN PENDAPATAN DAERAH</p>
          <p style="font-size: 16pt; font-weight: bold;">WILAYAH ${(settings.lokasi_wilayah || 'KABUPATEN TASIKMALAYA').toUpperCase()}</p>
          <p style="font-size: 10pt; margin-top: 4px;">${settings.alamat_kantor || 'Jalan Raya Cikatomas Sukaraja Telepon (0265) 565149'}</p>
          <p style="font-size: 10pt;">${settings.fax_email || 'Faksimil : (0265) 566917 E-mail : p3dwkabtsm@gmail.com'}</p>
          <p style="font-size: 10pt;">${settings.kode_pos_line || 'Kabupaten Tasikmalaya – 46183'}</p>
        </div>
      </div>

      <div style="padding: 0 1.5cm;">
        <div class="judul">
          <h3>BERITA ACARA PEMERIKSAAN KAS</h3>
          <p>BULAN ${bulanNama.toUpperCase()} ${year}</p>
          <p>NOMOR : ${settings.ba_nomor || '___/___'}</p>
        </div>

        <p class="content-text">
          Pada hari ini <strong>${dayName}</strong> tanggal <strong>${tglTerbilang}</strong> Bulan <strong>${bulanNama}</strong> Tahun <strong>${tahunTerbilang}</strong> yang bertanda dibawah ini :
        </p>

        <table class="identitas-table">
          <tr><td class="col-label" style="letter-spacing: 0.3em;">Nama</td><td class="col-sep">:</td><td class="col-val">${settings.kpa_nama || ''}</td></tr>
          <tr><td class="col-label">NIP</td><td class="col-sep">:</td><td class="col-val-normal">${settings.kpa_nip || ''}</td></tr>
          <tr><td class="col-label">Jabatan</td><td class="col-sep">:</td><td class="col-val">${settings.kpa_jabatan || 'Kuasa Pengguna Anggaran'}</td></tr>
        </table>

        <p class="content-text">
          Sesuai dengan Peraturan Menteri Dalam Negeri Republik Indonesia Nomor : 77 Tahun 2020 Surat Keputusan Gubernur Provinsi Jawa Barat Nomor ${settings.ba_sk_gubernur || '126/KU.12.01.01/Kep.BPKAD/2023'} Tanggal ${settings.ba_sk_tanggal || '29 Desember 2023'}, Kami Melakukan Pemeriksaan setempat pada :
        </p>

        <table class="identitas-table">
          <tr><td class="col-label" style="letter-spacing: 0.3em;">Nama</td><td class="col-sep">:</td><td class="col-val">${settings.bpp_nama || ''}</td></tr>
          <tr><td class="col-label">NIP</td><td class="col-sep">:</td><td class="col-val-normal">${settings.bpp_nip || ''}</td></tr>
          <tr><td class="col-label">Jabatan</td><td class="col-sep">:</td><td class="col-val">Bendahara Pengeluaran Pembantu</td></tr>
        </table>

        <p class="content-text">
          Yang dengan Surat Keputusan Gubernur Provinsi Jawa Barat Nomor : ${settings.ba_sk_bpp || '89/KU.12.01.01/Kep.BPKAD/2024'} ditugaskan menjadi <strong>Bendahara Pengeluaran Pembantu Pusat Pengelolaan Pendapatan Daerah Wilayah ${(settings.lokasi_wilayah || 'Kabupaten Tasikmalaya').replace(/\b\w/g, l => l.toUpperCase())}</strong>
        </p>

        <p class="content-text">
          Berdasarkan hasil pemeriksaan kas serta bukti-bukti yang berada dalam pengurusan itu / pengelolaan ini, kami menemui kenyataan sebagai berikut :
        </p>
        
        <p class="content-text" style="margin-bottom: 6px;">Jumlah uang yang kami hitung dihadapan pejabat tersebut adalah :</p>

        <div style="margin-left: 20px; line-height: 1.35;">
          <div class="money-row">
            <div class="money-label">a. Uang Kertas</div><div class="money-dots"></div><div class="money-currency">Rp.</div><div class="money-value">Nihil</div>
          </div>
          <div class="money-row">
            <div class="money-label">b. Uang Logam</div><div class="money-dots"></div><div class="money-currency">Rp.</div><div class="money-value">Nihil</div>
          </div>
          <div class="money-row">
            <div class="money-label">c. SP2D dan alat pembayaran lainnya yang belum dicairkan</div><div class="money-dots"></div><div class="money-currency">Rp.</div><div class="money-value">Nihil</div>
          </div>
          <div class="money-row">
            <div class="money-label">d. Saldo Bank</div><div class="money-dots"></div><div class="money-currency">Rp.</div><div class="money-value">${fmt(saldoBuku)}</div>
          </div>
          <div class="money-row">
            <div class="money-label">e. Surat / barang benda yang diijinkan</div><div class="money-dots"></div><div class="money-currency">Rp.</div><div class="money-value">Nihil</div>
          </div>
          
          <div class="money-row" style="font-weight: bold; border-top: 1px solid black; margin-top: 4px; padding-top: 4px;">
            <div class="money-label" style="margin-left: 15px;">J U M L A H</div><div class="money-dots"></div><div class="money-currency">Rp.</div><div class="money-value">${fmt(saldoBuku)}</div>
          </div>
        </div>

        <div style="margin-top: 15px; line-height: 1.35;">
          <div class="money-row">
            <div class="money-label">Saldo uang menurut Buku Kas Umum, Register dan lain sebagainya berjumlah</div><div class="money-dots"></div><div class="money-currency" style="font-weight: bold;">Rp.</div><div class="money-value" style="font-weight: bold;">${fmt(saldoBuku)}</div>
          </div>
          <div class="money-row">
            <div class="money-label">Perbedaan positif/negatif antara saldo kas dan saldo buku</div><div class="money-dots"></div><div class="money-currency" style="font-weight: bold;">Rp.</div><div class="money-value" style="font-weight: bold;">Nihil</div>
          </div>
        </div>

        <p class="content-text" style="margin-top: 10px;">Penjelasan perbedaan positif/negatif.<br>Keterangan :  -</p>

        <table class="tanda-tangan">
          <tr>
            <td></td>
            <td>${settings.lokasi || 'Sukaraja'}, ${lastDay} ${bulanNama} ${year}<br>Pemeriksa,</td>
          </tr>
          <tr>
            <td style="padding-top: 10px;">${settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU,'}</td>
            <td style="padding-top: 10px;">${settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN,'}</td>
          </tr>
          <tr>
            <td style="padding-top: 50px; font-weight: bold;"><u>${settings.bpp_nama || ''}</u></td>
            <td style="padding-top: 50px; font-weight: bold;"><u>${settings.kpa_nama || ''}</u></td>
          </tr>
          <tr>
            <td>${settings.bpp_pangkat || 'Penata Tingkat I'}<br>NIP. ${settings.bpp_nip || ''}</td>
            <td>${settings.kpa_pangkat || 'Pembina'}<br>NIP. ${settings.kpa_nip || ''}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `

  if (window.api && window.api.printToPdf) {
    try {
      const res = await window.api.printToPdf({ 
        html, 
        defaultPath: `BA_Pemeriksaan_Kas_${bulanNama}_${year}.pdf`,
        pageSize: 'Legal'
      })
      if (res && res.success) {
        // Berhasil disimpan, log atau tampilkan notifikasi jika perlu
      } else if (res && res.error) {
        alert('Gagal mencetak PDF: ' + res.error)
      }
    } catch (e) {
      alert('Error saat memanggil fungsi cetak: ' + e.message)
    }
  } else {
    alert('Fungsi print PDF native tidak tersedia. Pastikan Anda menjalankan aplikasi ini melalui Electron.')
  }
}

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

export function exportRealisasiPdf(subKegiatan, realisasiPerRek) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); const settings = useStore.getState().settings
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('LAPORAN REALISASI ANGGARAN', 105, 15, { align: 'center' }); doc.text(`TAHUN ANGGARAN ${new Date().getFullYear()}`, 105, 21, { align: 'center' }); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(`Unit Kerja : ${settings.unit_kerja}`, 14, 30)
  const head = [['Kode', 'Uraian / Nama Kegiatan', 'Pagu (Rp)', 'Realisasi (Rp)', 'Sisa (Rp)', '%']]; const body = []
  subKegiatan.forEach(sk => { const skReal = (sk.kode_rekening ?? []).reduce((s, r) => s + (realisasiPerRek[r.id] ?? 0), 0); const skPagu = (sk.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0); body.push([{ content: sk.kode, styles: { fontStyle: 'bold' } }, { content: sk.nama, styles: { fontStyle: 'bold' } }, { content: formatRupiah(skPagu).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatRupiah(skReal).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatRupiah(skPagu - skReal).replace('Rp', '').trim(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: `${persen(skReal, skPagu)}%`, styles: { fontStyle: 'bold', halign: 'center' } }]); (sk.kode_rekening ?? []).forEach(rek => { const real = realisasiPerRek[rek.id] ?? 0; body.push([`  ${rek.kode}`, `  ${rek.uraian}`, { content: formatRupiah(rek.pagu_anggaran).replace('Rp', '').trim(), styles: { halign: 'right' } }, { content: formatRupiah(real).replace('Rp', '').trim(), styles: { halign: 'right' } }, { content: formatRupiah(rek.pagu_anggaran - real).replace('Rp', '').trim(), styles: { halign: 'right' } }, { content: `${persen(real, rek.pagu_anggaran)}%`, styles: { halign: 'center' } }]) }) })
  autoTable(doc, { startY: 38, head: head, body: body, theme: 'grid', styles: { fontSize: 7, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1 }, headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center' }, columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 12 } } })
  doc.save('Laporan_Realisasi_Anggaran.pdf')
}

export function exportRekapBulananPdf(data) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); const settings = useStore.getState().settings
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('REKAPITULASI PENERIMAAN DAN PENGELUARAN', 105, 15, { align: 'center' }); doc.text(`TAHUN ANGGARAN ${new Date().getFullYear()}`, 105, 21, { align: 'center' })
  autoTable(doc, { startY: 35, head: [['Bulan', 'Penerimaan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)']], body: data.map(r => [r.bulan, formatRupiah(r.penerimaan).replace('Rp', '').trim(), formatRupiah(r.pengeluaran).replace('Rp', '').trim(), formatRupiah(r.penerimaan - r.pengeluaran).replace('Rp', '').trim()]), theme: 'striped', headStyles: { fillColor: [124, 58, 237], halign: 'center' }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } } })
  doc.save('Rekap_Bulanan.pdf')
}

export function exportLPJAdministratifPdf(monthIndex, year, allSubKegiatan, pengeluaran, penerimaan, customDate = null) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [330, 215] })
  const monthName = getMonthName(monthIndex); const settings = useStore.getState().settings
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

  // --- HEADER ---
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PROVINSI JAWA BARAT', 165, 10, { align: 'center' })
  doc.setFontSize(11); doc.text('LAPORAN PERTANGGUNGJAWABAN BENDAHARA PENGELUARAN PEMBANTU', 165, 15, { align: 'center' })
  doc.setFontSize(10); doc.text('(Administratif)', 165, 20, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); const startY = 30
  doc.text('SKPD', 14, startY); doc.text(`: ${settings.unit_kerja || ''}`, 75, startY)
  doc.text('KUASA PENGGUNA ANGGARAN', 14, startY + 5); doc.text(`: ${settings.kpa_nama || ''}`, 75, startY + 5)
  doc.text('BENDAHARA PENGELUARAN PEMBANTU', 14, startY + 10); doc.text(`: ${settings.bpp_nama || ''}`, 75, startY + 10)
  doc.text('TAHUN ANGGARAN', 14, startY + 15); doc.text(`: ${year}`, 75, startY + 15)
  doc.text('BULAN', 14, startY + 20); doc.text(`: ${monthName} ${year}`, 75, startY + 20)

  // --- LOGIC & CALCULATIONS ---
  const filterByJenisTime = (items, jenisList, isIni) => items.filter(p => {
    const d = new Date(p.tanggal); const m = d.getMonth(); const y = d.getFullYear()
    const matchesJenis = jenisList.includes(p.jenis)
    return matchesJenis && (isIni ? (y === year && m === monthIndex) : (y < year || (y === year && m < monthIndex)))
  })
  const sumJ = (items) => items.reduce((s, p) => s + p.jumlah, 0)
  const sumT = (items, field) => items.reduce((s, p) => s + (p[field] || 0), 0)
  const sumP = (items, jenisList, isIni) => sumJ(filterByJenisTime(items, jenisList, isIni))

  const body = []
  let globalTotals = { pagu: 0, ls: { lalu: 0, ini: 0, sd: 0 }, gu: { lalu: 0, ini: 0, sd: 0 }, totalSd: 0 }

  allSubKegiatan.forEach((sk) => {
    let skTotals = { pagu: 0, ls: { lalu: 0, ini: 0, sd: 0 }, gu: { lalu: 0, ini: 0, sd: 0 }, totalSd: 0 }
    const subBody = []
    ;(sk.kode_rekening || []).forEach((rek) => {
      const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
      const lsL = sumJ(filterByJenisTime(rp, ['LS'], false)); const lsI = sumJ(filterByJenisTime(rp, ['LS'], true)); const lsS = lsL + lsI
      const guL = sumJ(filterByJenisTime(rp, ['GU', 'UP', 'TU', 'KKPD'], false)); const guI = sumJ(filterByJenisTime(rp, ['GU', 'UP', 'TU', 'KKPD'], true)); const guS = guL + guI
      const tS = lsS + guS
      const cp = (rek.kode || '').split('.'); while (cp.length < 6) cp.push('')
      subBody.push([...cp.map(p => ({ content: p, styles: { halign: 'center' } })), { content: rek.uraian, styles: { overflow: 'linebreak' } }, formatRupiah(rek.pagu_anggaran).replace('Rp', '').trim(), '-', '-', '-', lsL > 0 ? formatRupiah(lsL).replace('Rp', '').trim() : '-', lsI > 0 ? formatRupiah(lsI).replace('Rp', '').trim() : '-', lsS > 0 ? formatRupiah(lsS).replace('Rp', '').trim() : '-', guL > 0 ? formatRupiah(guL).replace('Rp', '').trim() : '-', guI > 0 ? formatRupiah(guI).replace('Rp', '').trim() : '-', guS > 0 ? formatRupiah(guS).replace('Rp', '').trim() : '-', tS > 0 ? formatRupiah(tS).replace('Rp', '').trim() : '-', formatRupiah(rek.pagu_anggaran - tS).replace('Rp', '').trim()])
      skTotals.pagu += (rek.pagu_anggaran || 0); skTotals.ls.lalu += lsL; skTotals.ls.ini += lsI; skTotals.ls.sd += lsS; skTotals.gu.lalu += guL; skTotals.gu.ini += guI; skTotals.gu.sd += guS; skTotals.totalSd += tS
    })
    body.push([
      { content: sk.kode, colSpan: 6, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 240, 240] } },
      { content: sk.nama, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: skTotals.pagu > 0 ? formatRupiah(skTotals.pagu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: '-', styles: { fillColor: [240, 240, 240], halign: 'center' } },
      { content: '-', styles: { fillColor: [240, 240, 240], halign: 'center' } },
      { content: '-', styles: { fillColor: [240, 240, 240], halign: 'center' } },
      { content: skTotals.ls.lalu > 0 ? formatRupiah(skTotals.ls.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.ls.ini > 0 ? formatRupiah(skTotals.ls.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.ls.sd > 0 ? formatRupiah(skTotals.ls.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.gu.lalu > 0 ? formatRupiah(skTotals.gu.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.gu.ini > 0 ? formatRupiah(skTotals.gu.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.gu.sd > 0 ? formatRupiah(skTotals.gu.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: skTotals.totalSd > 0 ? formatRupiah(skTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } },
      { content: (skTotals.pagu - skTotals.totalSd) > 0 ? formatRupiah(skTotals.pagu - skTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 240, 240] } }
    ])
    body.push(...subBody)
    globalTotals.pagu += skTotals.pagu; globalTotals.ls.lalu += skTotals.ls.lalu; globalTotals.ls.ini += skTotals.ls.ini; globalTotals.ls.sd += skTotals.ls.sd; globalTotals.gu.lalu += skTotals.gu.lalu; globalTotals.gu.ini += skTotals.gu.ini; globalTotals.gu.sd += skTotals.gu.sd; globalTotals.totalSd += skTotals.totalSd
  })

  // 1. JUMLAH Row
  body.push([
    { content: 'JUMLAH', colSpan: 7, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: globalTotals.pagu > 0 ? formatRupiah(globalTotals.pagu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: '-', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: '-', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: '-', styles: { fontStyle: 'bold', halign: 'center' } },
    { content: globalTotals.ls.lalu > 0 ? formatRupiah(globalTotals.ls.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.ls.ini > 0 ? formatRupiah(globalTotals.ls.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.ls.sd > 0 ? formatRupiah(globalTotals.ls.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.gu.lalu > 0 ? formatRupiah(globalTotals.gu.lalu).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.gu.ini > 0 ? formatRupiah(globalTotals.gu.ini).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.gu.sd > 0 ? formatRupiah(globalTotals.gu.sd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: globalTotals.totalSd > 0 ? formatRupiah(globalTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } },
    { content: (globalTotals.pagu - globalTotals.totalSd) > 0 ? formatRupiah(globalTotals.pagu - globalTotals.totalSd).replace('Rp', '').trim() : '-', styles: { fontStyle: 'bold', halign: 'right' } }
  ])

  const makeSumRow = (label, lsAgg, guAgg, isBold = false) => {
    // With colSpan: 7 for label, row array needs 13 elements for 19 columns total
    // Index 0: Label (Cell 1-7)
    // Index 1: Anggaran (Cell 8)
    // Index 2-4: LS Gaji (Cell 9-11)
    // Index 5-7: LS Barjas (Cell 12-14)
    // Index 8-10: UP/GU/TU (Cell 15-17)
    // Index 11: Total SD (Cell 18)
    // Index 12: Sisa (Cell 19)
    const r = new Array(13).fill('-')
    r[0] = { content: label, colSpan: 7, styles: { fontStyle: isBold ? 'bold' : 'normal' } }
    
    // LS Barjas (Indices 5, 6, 7)
    r[5] = lsAgg.lalu > 0 ? formatRupiah(lsAgg.lalu).replace('Rp', '').trim() : '-'
    r[6] = lsAgg.ini > 0 ? formatRupiah(lsAgg.ini).replace('Rp', '').trim() : '-'
    r[7] = lsAgg.sd > 0 ? formatRupiah(lsAgg.sd).replace('Rp', '').trim() : '-'
    
    // UP/GU/TU (Indices 8, 9, 10)
    r[8] = guAgg.lalu > 0 ? formatRupiah(guAgg.lalu).replace('Rp', '').trim() : '-'
    r[9] = guAgg.ini > 0 ? formatRupiah(guAgg.ini).replace('Rp', '').trim() : '-'
    r[10] = guAgg.sd > 0 ? formatRupiah(guAgg.sd).replace('Rp', '').trim() : '-'
    
    // Total SD (Index 11)
    const tSd = lsAgg.sd + guAgg.sd
    r[11] = tSd > 0 ? formatRupiah(tSd).replace('Rp', '').trim() : '-'
    return r
  }
  
  const zero = { lalu: 0, ini: 0, sd: 0 }
  
  const isTaxFromLS = (p) => {
    if (p.jenis === 'Pajak') return false
    if (p.jenis === 'Pajak LS' || p.jenis === 'LS') return true
    if (p.no_sp2d || p.nomor_ls) return true
    return false
  }

  const getTaxAgg = (regex) => {
    const items = penerimaan.filter(p => (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(p.keterangan || ''))
    const lsItems = items.filter(p => isTaxFromLS(p))
    const guItems = items.filter(p => !isTaxFromLS(p))
    
    return {
      ls: {
        lalu: sumJ(filterByJenisTime(lsItems, ['Pajak', 'Pajak LS'], false)), 
        ini: sumJ(filterByJenisTime(lsItems, ['Pajak', 'Pajak LS'], true)), 
        sd: sumJ(filterByJenisTime(lsItems, ['Pajak', 'Pajak LS'], false)) + sumJ(filterByJenisTime(lsItems, ['Pajak', 'Pajak LS'], true))
      },
      gu: { 
        lalu: sumJ(filterByJenisTime(guItems, ['Pajak', 'Pajak LS'], false)), 
        ini: sumJ(filterByJenisTime(guItems, ['Pajak', 'Pajak LS'], true)), 
        sd: sumJ(filterByJenisTime(guItems, ['Pajak', 'Pajak LS'], false)) + sumJ(filterByJenisTime(guItems, ['Pajak', 'Pajak LS'], true)) 
      }
    }
  }
  
  const getTaxSetoranAgg = (regex) => {
    const items = pengeluaran.filter(p => {
      const u = p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || ''
      return (u.startsWith('Setoran') || u.startsWith('Dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(u)
    })
    const lsItems = items.filter(p => isTaxFromLS(p))
    const guItems = items.filter(p => !isTaxFromLS(p))

    return {
      ls: {
        lalu: sumJ(filterByJenisTime(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], false)), 
        ini: sumJ(filterByJenisTime(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], true)), 
        sd: sumJ(filterByJenisTime(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], false)) + sumJ(filterByJenisTime(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], true))
      },
      gu: { 
        lalu: sumJ(filterByJenisTime(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], false)), 
        ini: sumJ(filterByJenisTime(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], true)), 
        sd: sumJ(filterByJenisTime(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], false)) + sumJ(filterByJenisTime(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], true)) 
      }
    }
  }

  const taxTypes = [
    { label: '    a. PPN', regex: /PPN/i },
    { label: '    b. PPh.- 21', regex: /PPh\s*21/i },
    { label: '    c. PPh.- 22', regex: /PPh\s*22/i },
    { label: '    d. PPh.- 23', regex: /PPh\s*23/i },
    { label: '    e. PPh. Psl 4 (Ayat 2)', regex: /PPh\s*(?:Pasal\s*)?4/i },
  ]

  // 2. Penerimaan
  body.push([{ content: 'Penerimaan', colSpan: 19, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }])
  
  const penLS = { 
    lalu: sumP(penerimaan, ['LS'], false), 
    ini: sumP(penerimaan, ['LS'], true), 
    sd: sumP(penerimaan, ['LS'], false) + sumP(penerimaan, ['LS'], true) 
  }
  const penGU = { 
    lalu: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], false), 
    ini: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], true), 
    sd: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], false) + sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], true) 
  }
  
  body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', penLS, penGU, true))

  const jTs = [['    a. UP', ['UP']], ['    b. GU', ['GU']], ['    c. TU', ['TU']], ['    d. LS', ['LS']], ['    e. KKPD', ['KKPD']]]
  jTs.forEach(jt => {
    const isLS = jt[1][0] === 'LS'
    const a = { 
      lalu: sumP(penerimaan, jt[1], false), 
      ini: sumP(penerimaan, jt[1], true), 
      sd: sumP(penerimaan, jt[1], false) + sumP(penerimaan, jt[1], true) 
    }
    body.push(makeSumRow(jt[0], isLS ? a : zero, isLS ? zero : a))
  })

  const taxPotonganTotal = { ls: { ...zero }, gu: { ...zero } }
  const taxPotonganRows = taxTypes.map(tt => {
    const a = getTaxAgg(tt.regex)
    taxPotonganTotal.ls.lalu += a.ls.lalu; taxPotonganTotal.ls.ini += a.ls.ini; taxPotonganTotal.ls.sd += a.ls.sd
    taxPotonganTotal.gu.lalu += a.gu.lalu; taxPotonganTotal.gu.ini += a.gu.ini; taxPotonganTotal.gu.sd += a.gu.sd
    return makeSumRow(tt.label, a.ls, a.gu)
  })
  
  body.push(makeSumRow(' - Potongan Pajak', taxPotonganTotal.ls, taxPotonganTotal.gu, true))
  body.push(...taxPotonganRows)
  
  const totalPenerimaanAgg = { 
    ls: { 
      lalu: penLS.lalu + taxPotonganTotal.ls.lalu, 
      ini: penLS.ini + taxPotonganTotal.ls.ini, 
      sd: penLS.sd + taxPotonganTotal.ls.sd 
    },
    gu: { 
      lalu: penGU.lalu + taxPotonganTotal.gu.lalu, 
      ini: penGU.ini + taxPotonganTotal.gu.ini, 
      sd: penGU.sd + taxPotonganTotal.gu.sd 
    }
  }
  body.push(makeSumRow('Jumlah Penerimaan', totalPenerimaanAgg.ls, totalPenerimaanAgg.gu, true))

  // 3. Pengeluaran
  body.push([{ content: 'Pengeluaran', colSpan: 19, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } }])
  body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', globalTotals.ls, globalTotals.gu, true))
  jTs.forEach(jt => {
    const isL = jt[1][0] === 'LS'
    const a = { 
      lalu: sumJ(filterByJenisTime(pengeluaran, jt[1], false)), 
      ini: sumJ(filterByJenisTime(pengeluaran, jt[1], true)), 
      sd: sumJ(filterByJenisTime(pengeluaran, jt[1], false)) + sumJ(filterByJenisTime(pengeluaran, jt[1], true)) 
    }
    body.push(makeSumRow(jt[0], isL ? a : zero, isL ? zero : a))
  })
  
  const taxSetoranTotal = { ls: { ...zero }, gu: { ...zero } }
  const taxSetoranRows = taxTypes.map(tt => {
    const a = getTaxSetoranAgg(tt.regex)
    taxSetoranTotal.ls.lalu += a.ls.lalu; taxSetoranTotal.ls.ini += a.ls.ini; taxSetoranTotal.ls.sd += a.ls.sd
    taxSetoranTotal.gu.lalu += a.gu.lalu; taxSetoranTotal.gu.ini += a.gu.ini; taxSetoranTotal.gu.sd += a.gu.sd
    return makeSumRow(tt.label, a.ls, a.gu)
  })

  body.push(makeSumRow(' - Penyetoran Pajak', taxSetoranTotal.ls, taxSetoranTotal.gu, true))
  body.push(...taxSetoranRows)
  
  const totalPengeluaranAgg = {
    ls: { 
      lalu: globalTotals.ls.lalu + taxSetoranTotal.ls.lalu, 
      ini: globalTotals.ls.ini + taxSetoranTotal.ls.ini, 
      sd: globalTotals.ls.sd + taxSetoranTotal.ls.sd 
    },
    gu: { 
      lalu: globalTotals.gu.lalu + taxSetoranTotal.gu.lalu, 
      ini: globalTotals.gu.ini + taxSetoranTotal.gu.ini, 
      sd: globalTotals.gu.sd + taxSetoranTotal.gu.sd 
    }
  }
  body.push(makeSumRow('Jumlah Pengeluaran', totalPengeluaranAgg.ls, totalPengeluaranAgg.gu, true))
  
  // 4. Saldo Kas
  // Saldo Kas Riil di tangan BPP hanya mencakup selisih di kategori GU (UP/GU/TU/KKPD)
  const saldoKasRiil = totalPenerimaanAgg.gu.sd - totalPengeluaranAgg.gu.sd
  
  const sR = new Array(3).fill('-')
  sR[0] = { content: 'Saldo Kas', colSpan: 17, styles: { fontStyle: 'bold', halign: 'right' } }
  sR[1] = formatRupiah(saldoKasRiil).replace('Rp', '').trim()
  body.push(sR)

  // --- SINGLE TABLE RENDER ---
  const head = [[{ content: 'Kode Rekening', rowSpan: 2, colSpan: 6 }, { content: 'Uraian', rowSpan: 2 }, { content: 'JUMLAH ANGGARAN', rowSpan: 2 }, { content: 'SPJ - LS GAJI', colSpan: 3 }, { content: 'SPJ - LS BARANG & JASA', colSpan: 3 }, { content: 'SPJ - UP / GU / TU', colSpan: 3 }, { content: 'Jumlah (LS/UP/GU/TU) s/d Bulan ini', rowSpan: 2 }, { content: 'Sisa Anggaran', rowSpan: 2 }], ['s/d Bulan Lalu', 'Bulan ini', 's/d Bulan Ini', 's/d Bulan Lalu', 'Bulan ini', 's/d Bulan Ini', 's/d Bulan Lalu', 'Bulan ini', 's/d Bulan Ini'], ['1', '2', '3', '4', '5', '6', '7', '8', '9=(7+8)', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']]

  autoTable(doc, {
    startY: startY + 25, head: head, body: body, theme: 'grid',
    styles: { fontSize: 6, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
    columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 6 }, 2: { cellWidth: 8 }, 3: { cellWidth: 8 }, 4: { cellWidth: 8 }, 5: { cellWidth: 10 }, 6: { cellWidth: 'auto' }, 7: { cellWidth: 18, halign: 'right' }, 11: { halign: 'right', cellWidth: 15 }, 12: { halign: 'right', cellWidth: 15 }, 13: { halign: 'right', cellWidth: 15 }, 14: { halign: 'right', cellWidth: 15 }, 15: { halign: 'right', cellWidth: 15 }, 16: { halign: 'right', cellWidth: 15 }, 17: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }, 18: { halign: 'right', cellWidth: 20 } }
  })

  // --- SIGNATURES (3 COLUMNS) ---
  let signY = doc.lastAutoTable.finalY + 10
  if (signY > 180) { doc.addPage(); signY = 20 }
  doc.setFontSize(8); doc.text('Mengetahui / Menyetujui :', 14, signY); doc.text(`${settings.lokasi || ''}, ${lastDay} ${monthName.toLowerCase()} ${year}`, 250, signY)
  const col1X = 14; const col2X = 120; const col3X = 250
  doc.text(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN', col1X, signY + 5); doc.text(settings.bp_jabatan || 'BENDAHARA PENGELUARAN,', col2X, signY + 5); doc.text(settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU', col3X, signY + 5)
  doc.setFont('helvetica', 'bold'); doc.text(settings.kpa_nama || '', col1X, signY + 25); doc.text(settings.bp_nama || '', col2X, signY + 25); doc.text(settings.bpp_nama || '', col3X, signY + 25)
  doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${settings.kpa_nip || ''}`, col1X, signY + 29); doc.text(`NIP. ${settings.bp_nip || ''}`, col2X, signY + 29); doc.text(`NIP. ${settings.bpp_nip || ''}`, col3X, signY + 29)
  doc.save(`LPJ_Administratif_${monthName}_${year}.pdf`)
}

export function exportLPJPeriodePdf(monthIndex, year, allSubKegiatan, pengeluaran, penerimaan, cutoffDate) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [330, 215] })
  const monthName = getMonthName(monthIndex); const settings = useStore.getState().settings
  
  const startDate = new Date(year, monthIndex, 1)
  const cutoff = new Date(cutoffDate)
  cutoff.setHours(23, 59, 59, 999)
  const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
  
  const customD = cutoffDate ? new Date(cutoffDate) : endDate
  const sigDay = customD.getDate()
  const sigMonthName = getMonthName(customD.getMonth())
  const sigYear = customD.getFullYear()

  // --- HEADER ---
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PROVINSI JAWA BARAT', 165, 10, { align: 'center' })
  doc.setFontSize(11); doc.text('LAPORAN PER PERIODE BENDAHARA PENGELUARAN PEMBANTU', 165, 15, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); const startY = 25
  doc.text('SKPD', 14, startY); doc.text(`: ${settings.unit_kerja || ''}`, 75, startY)
  doc.text('KUASA PENGGUNA ANGGARAN', 14, startY + 5); doc.text(`: ${settings.kpa_nama || ''}`, 75, startY + 5)
  doc.text('BENDAHARA PENGELUARAN PEMBANTU', 14, startY + 10); doc.text(`: ${settings.bpp_nama || ''}`, 75, startY + 10)
  doc.text('TAHUN ANGGARAN', 14, startY + 15); doc.text(`: ${year}`, 75, startY + 15)
  doc.text('BULAN', 14, startY + 20); doc.text(`: ${monthName} ${year}`, 75, startY + 20)

  // PARENT DICTIONARY FOR REKENING CODES
  const PARENT_REK_DICT = {
    '5': 'BELANJA DAERAH',
    '5.1': 'BELANJA OPERASI',
    '5.1.02': 'Belanja Barang dan Jasa',
    '5.1.02.01': 'Belanja Barang',
    '5.1.02.01.001': 'Belanja Barang Pakai Habis',
    '5.1.02.02': 'Belanja Jasa',
    '5.1.02.02.001': 'Belanja Jasa Kantor',
    '5.1.02.02.004': 'Belanja Jasa Iklan/Reklame, Film, dan Pemotretan',
    '5.1.02.02.005': 'Belanja Jasa Konsultansi',
    '5.1.02.02.008': 'Belanja Jasa Konsultansi Konstruksi',
    '5.1.02.03': 'Belanja Pemeliharaan',
    '5.1.02.03.002': 'Belanja Pemeliharaan Peralatan dan Mesin',
    '5.1.02.03.003': 'Belanja Pemeliharaan Gedung dan Bangunan',
    '5.1.02.04': 'Belanja Perjalanan Dinas',
    '5.1.02.04.001': 'Belanja Perjalanan Dinas Dalam Negeri',
    '5.2': 'BELANJA MODAL',
    '5.2.02': 'Belanja Modal Peralatan dan Mesin',
    '5.2.02.05': 'Belanja Modal Alat Kantor dan Rumah Tangga',
    '5.2.02.05.002': 'Belanja Modal Alat Rumah Tangga',
  }

  // Utility helpers
  const sumJ = (items) => items.reduce((s, p) => s + p.jumlah, 0)
  
  const filterByTime = (items, timeKey) => items.filter(p => {
    const txDate = new Date(p.tanggal)
    if (timeKey === 'lalu') return txDate < startDate
    if (timeKey === 'p1') return txDate >= startDate && txDate <= cutoff
    if (timeKey === 'p2') return txDate > cutoff && txDate <= endDate
    return false
  })

  const getAmt = (items, jenisList, timeKey) => {
    const list = items.filter(p => jenisList.includes(p.jenis))
    return sumJ(filterByTime(list, timeKey))
  }

  // -- DATA AGGREGATION --
  const root = { pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }
  const tree = new Map()
  const globalRekMap = {}

  const ensureGlobalChain = (leafKode, leafUraian, leafPagu, leafLs, leafGu) => {
    const parts = leafKode.split('.')
    for (let i = 1; i <= parts.length; i++) {
      const currentKode = parts.slice(0, i).join('.')
      const isLeaf = (i === parts.length)
      
      if (!globalRekMap[currentKode]) {
        globalRekMap[currentKode] = {
          kode: currentKode,
          uraian: isLeaf ? leafUraian : (PARENT_REK_DICT[currentKode] || ''),
          pagu: 0,
          ls: { lalu: 0, p1: 0, p2: 0, sd: 0 },
          gu: { lalu: 0, p1: 0, p2: 0, sd: 0 },
        }
      }
      const entry = globalRekMap[currentKode]
      entry.pagu += leafPagu
      entry.ls.lalu += leafLs.lalu
      entry.ls.p1 += leafLs.p1
      entry.ls.p2 += leafLs.p2
      entry.ls.sd += leafLs.sd
      entry.gu.lalu += leafGu.lalu
      entry.gu.p1 += leafGu.p1
      entry.gu.p2 += leafGu.p2
      entry.gu.sd += leafGu.sd
    }
  }

  // 1. Setup Program > Kegiatan > Sub Kegiatan map
  allSubKegiatan.forEach(sk => {
    const prog = sk.kegiatan?.program || { id: 'no-prog', kode: '?', nama: 'Tanpa Program' }
    const keg = sk.kegiatan || { id: 'no-keg', kode: '?', nama: 'Tanpa Kegiatan' }
    
    if (!tree.has(prog.id)) {
      tree.set(prog.id, {
        id: prog.id, kode: prog.kode, nama: prog.nama,
        pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 },
        kegiatans: new Map()
      })
    }
    const progObj = tree.get(prog.id)
    
    if (!progObj.kegiatans.has(keg.id)) {
      progObj.kegiatans.set(keg.id, {
        id: keg.id, kode: keg.kode, nama: keg.nama,
        pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 },
        subKegiatans: new Map()
      })
    }
    const kegObj = progObj.kegiatans.get(keg.id)
    
    if (!kegObj.subKegiatans.has(sk.id)) {
      kegObj.subKegiatans.set(sk.id, {
        id: sk.id, kode: sk.kode, nama: sk.nama,
        pagu: 0, ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 },
        rekenings: []
      })
    }
  })

  // 2. Aggregate leaf rekenings and propagate to parents
  allSubKegiatan.forEach(sk => {
    const prog = sk.kegiatan?.program || { id: 'no-prog' }
    const keg = sk.kegiatan || { id: 'no-keg' }
    
    const progObj = tree.get(prog.id)
    const kegObj = progObj.kegiatans.get(keg.id)
    const skObj = kegObj.subKegiatans.get(sk.id)
    
    const localRekMap = {}
    
    const ensureParentChain = (leafKode, leafUraian, leafPagu, leafLs, leafGu) => {
      const parts = leafKode.split('.')
      for (let i = 1; i <= parts.length; i++) {
        const currentKode = parts.slice(0, i).join('.')
        const isLeaf = (i === parts.length)
        
        if (!localRekMap[currentKode]) {
          localRekMap[currentKode] = {
            kode: currentKode,
            uraian: isLeaf ? leafUraian : (PARENT_REK_DICT[currentKode] || ''),
            pagu: 0,
            ls: { lalu: 0, p1: 0, p2: 0, sd: 0 },
            gu: { lalu: 0, p1: 0, p2: 0, sd: 0 },
          }
        }
        
        const entry = localRekMap[currentKode]
        entry.pagu += leafPagu
        entry.ls.lalu += leafLs.lalu
        entry.ls.p1 += leafLs.p1
        entry.ls.p2 += leafLs.p2
        entry.ls.sd += leafLs.sd
        entry.gu.lalu += leafGu.lalu
        entry.gu.p1 += leafGu.p1
        entry.gu.p2 += leafGu.p2
        entry.gu.sd += leafGu.sd
      }
    }

    ;(sk.kode_rekening || []).forEach(rek => {
      const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
      
      const leafLs = {
        lalu: getAmt(rp, ['LS'], 'lalu'),
        p1: getAmt(rp, ['LS'], 'p1'),
        p2: getAmt(rp, ['LS'], 'p2'),
        sd: 0
      }
      leafLs.sd = leafLs.lalu + leafLs.p1 + leafLs.p2
      
      const leafGu = {
        lalu: getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'lalu'),
        p1: getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p1'),
        p2: getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p2'),
        sd: 0
      }
      leafGu.sd = leafGu.lalu + leafGu.p1 + leafGu.p2
      
      const finalPagu = rek.pagu_anggaran || 0
      ensureParentChain(rek.kode, rek.uraian, finalPagu, leafLs, leafGu)
      ensureGlobalChain(rek.kode, rek.uraian, finalPagu, leafLs, leafGu)
    })

    skObj.rekenings = Object.values(localRekMap).sort((a,b) => a.kode.localeCompare(b.kode))

    // Sum top parents for Sub Kegiatan totals
    ;(sk.kode_rekening || []).forEach(rek => {
      const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
      const leafLs = getAmt(rp, ['LS'], 'lalu') + getAmt(rp, ['LS'], 'p1') + getAmt(rp, ['LS'], 'p2')
      const leafGu = getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'lalu') + getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p1') + getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p2')
      
      skObj.pagu += (rek.pagu_anggaran || 0)
      skObj.ls.lalu += getAmt(rp, ['LS'], 'lalu')
      skObj.ls.p1 += getAmt(rp, ['LS'], 'p1')
      skObj.ls.p2 += getAmt(rp, ['LS'], 'p2')
      skObj.ls.sd += leafLs
      
      skObj.gu.lalu += getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'lalu')
      skObj.gu.p1 += getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p1')
      skObj.gu.p2 += getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'p2')
      skObj.gu.sd += leafGu
    })

    kegObj.pagu += skObj.pagu
    kegObj.ls.lalu += skObj.ls.lalu
    kegObj.ls.p1 += skObj.ls.p1
    kegObj.ls.p2 += skObj.ls.p2
    kegObj.ls.sd += skObj.ls.sd
    kegObj.gu.lalu += skObj.gu.lalu
    kegObj.gu.p1 += skObj.gu.p1
    kegObj.gu.p2 += skObj.gu.p2
    kegObj.gu.sd += skObj.gu.sd
  })

  tree.forEach(progObj => {
    progObj.kegiatans.forEach(kegObj => {
      progObj.pagu += kegObj.pagu
      progObj.ls.lalu += kegObj.ls.lalu
      progObj.ls.p1 += kegObj.ls.p1
      progObj.ls.p2 += kegObj.ls.p2
      progObj.ls.sd += kegObj.ls.sd
      progObj.gu.lalu += kegObj.gu.lalu
      progObj.gu.p1 += kegObj.gu.p1
      progObj.gu.p2 += kegObj.gu.p2
      progObj.gu.sd += kegObj.gu.sd
    })

    root.pagu += progObj.pagu
    root.ls.lalu += progObj.ls.lalu
    root.ls.p1 += progObj.ls.p1
    root.ls.p2 += progObj.ls.p2
    root.ls.sd += progObj.ls.sd
    root.gu.lalu += progObj.gu.lalu
    root.gu.p1 += progObj.gu.p1
    root.gu.p2 += progObj.gu.p2
    root.gu.sd += progObj.gu.sd
  })

  // Formatting helpers
  const fmt = (val) => val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-'

  const makeRow = (no, kode, uraian, pagu, ls, gu, isBold = false, color = null) => {
    const tS = ls.sd + gu.sd
    const sisa = pagu - tS
    const rowStyle = { fontStyle: isBold ? 'bold' : 'normal' }
    if (color) rowStyle.fillColor = color
    
    return [
      { content: no, styles: rowStyle },
      { content: kode, styles: rowStyle },
      { content: uraian, styles: rowStyle },
      { content: fmt(pagu), styles: { ...rowStyle, halign: 'right' } },
      // LS
      { content: fmt(ls.lalu), styles: { ...rowStyle, halign: 'right' } },
      { content: fmt(ls.p1), styles: { ...rowStyle, halign: 'right' } },
      { content: fmt(ls.p2), styles: { ...rowStyle, halign: 'right' } },
      { content: fmt(ls.sd), styles: { ...rowStyle, halign: 'right' } },
      // GU
      { content: fmt(gu.lalu), styles: { ...rowStyle, halign: 'right' } },
      { content: fmt(gu.p1), styles: { ...rowStyle, halign: 'right' } },
      { content: fmt(gu.p2), styles: { ...rowStyle, halign: 'right' } },
      { content: fmt(gu.sd), styles: { ...rowStyle, halign: 'right' } },
      
      { content: fmt(tS), styles: { ...rowStyle, halign: 'right', fontStyle: 'bold' } },
      { content: fmt(sisa), styles: { ...rowStyle, halign: 'right' } }
    ]
  }

  const body = []

  // A. Render Top Global Parents!
  const topKeys = Object.keys(globalRekMap).filter(k => k === '5' || k === '5.1' || k === '5.2').sort()
  topKeys.forEach(k => {
    const entry = globalRekMap[k]
    body.push(makeRow('', entry.kode + '.', entry.uraian.toUpperCase(), entry.pagu, entry.ls, entry.gu, true, [240, 240, 240]))
  })

  // B. Render Main Tree!
  let progIdx = 1
  const romanize = (num) => {
    const lookup = { M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1 }
    let roman = '', i
    for ( i in lookup ) {
      while ( num >= lookup[i] ) {
        roman += i
        num -= lookup[i]
      }
    }
    return roman
  }

  tree.forEach(progObj => {
    const progRoman = romanize(progIdx++)
    body.push(makeRow(progRoman, progObj.kode, progObj.nama.toUpperCase(), progObj.pagu, progObj.ls, progObj.gu, true, [235, 245, 255]))
    
    let kegIdx = 1
    progObj.kegiatans.forEach(kegObj => {
      const kegNo = `${progRoman}.${kegIdx++}`
      body.push(makeRow(kegNo, kegObj.kode, kegObj.nama.toUpperCase(), kegObj.pagu, kegObj.ls, kegObj.gu, true, [248, 248, 248]))
      
      let skIdx = 1
      kegObj.subKegiatans.forEach(skObj => {
        const skNo = `${kegNo}.${skIdx++}`
        body.push(makeRow(skNo, skObj.kode, skObj.nama.toUpperCase(), skObj.pagu, skObj.ls, skObj.gu, true))
        
        skObj.rekenings.forEach(rek => {
          body.push(makeRow('', rek.kode, rek.uraian, rek.pagu, rek.ls, rek.gu, false))
        })
      })
    })
  })

  // C. Render JUMLAH Row!
  body.push(makeRow('JUMLAH', '', '', root.pagu, root.ls, root.gu, true, [220, 220, 220]))

  // D. TAIL LOGIC (Penerimaan & Pengeluaran Summary)
  const makeSumRow = (label, lsAgg, guAgg, isBold = false) => {
    const r = new Array(12).fill('-')
    r[0] = { content: label, colSpan: 3, styles: { fontStyle: isBold ? 'bold' : 'normal', halign: 'left' } }
    r[1] = '-' // Jumlah Anggaran
    
    r[2] = fmt(lsAgg.lalu)
    r[3] = fmt(lsAgg.p1)
    r[4] = fmt(lsAgg.p2)
    r[5] = fmt(lsAgg.sd)
    
    r[6] = fmt(guAgg.lalu)
    r[7] = fmt(guAgg.p1)
    r[8] = fmt(guAgg.p2)
    r[9] = fmt(guAgg.sd)
    
    const tSd = lsAgg.sd + guAgg.sd
    r[10] = fmt(tSd)
    r[11] = '-' // Sisa
    return r
  }

  const sumP = (items, jenisList, timeKey) => {
    const list = items.filter(p => jenisList.includes(p.jenis))
    const filtered = list.filter(p => {
      const txDate = new Date(p.tanggal)
      if (timeKey === 'lalu') return txDate < startDate
      if (timeKey === 'p1') return txDate >= startDate && txDate <= cutoff
      if (timeKey === 'p2') return txDate > cutoff && txDate <= endDate
      return false
    })
    return sumJ(filtered)
  }

  const getSumObj = (items, jenisList) => {
    const lalu = sumP(items, jenisList, 'lalu')
    const p1 = sumP(items, jenisList, 'p1')
    const p2 = sumP(items, jenisList, 'p2')
    return { lalu, p1, p2, sd: lalu + p1 + p2 }
  }

  const isTaxFromLS = (p) => {
    if (p.jenis === 'Pajak') return false
    if (p.jenis === 'Pajak LS' || p.jenis === 'LS') return true
    if (p.no_sp2d || p.nomor_ls) return true
    return false
  }

  const getTaxAgg = (regex) => {
    const items = penerimaan.filter(p => (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(p.keterangan || ''))
    const lsItems = items.filter(p => isTaxFromLS(p))
    const guItems = items.filter(p => !isTaxFromLS(p))
    
    return {
      ls: {
        lalu: sumP(lsItems, ['Pajak', 'Pajak LS'], 'lalu'),
        p1: sumP(lsItems, ['Pajak', 'Pajak LS'], 'p1'),
        p2: sumP(lsItems, ['Pajak', 'Pajak LS'], 'p2'),
        sd: sumP(lsItems, ['Pajak', 'Pajak LS'], 'lalu') + sumP(lsItems, ['Pajak', 'Pajak LS'], 'p1') + sumP(lsItems, ['Pajak', 'Pajak LS'], 'p2')
      },
      gu: {
        lalu: sumP(guItems, ['Pajak', 'Pajak LS'], 'lalu'),
        p1: sumP(guItems, ['Pajak', 'Pajak LS'], 'p1'),
        p2: sumP(guItems, ['Pajak', 'Pajak LS'], 'p2'),
        sd: sumP(guItems, ['Pajak', 'Pajak LS'], 'lalu') + sumP(guItems, ['Pajak', 'Pajak LS'], 'p1') + sumP(guItems, ['Pajak', 'Pajak LS'], 'p2')
      }
    }
  }

  const getTaxSetoranAgg = (regex) => {
    const items = pengeluaran.filter(p => {
      const u = p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || ''
      return (u.startsWith('Setoran') || u.startsWith('Dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(u)
    })
    const lsItems = items.filter(p => isTaxFromLS(p))
    const guItems = items.filter(p => !isTaxFromLS(p))

    return {
      ls: {
        lalu: sumP(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'lalu'),
        p1: sumP(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p1'),
        p2: sumP(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p2'),
        sd: sumP(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'lalu') + sumP(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p1') + sumP(lsItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p2')
      },
      gu: {
        lalu: sumP(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'lalu'),
        p1: sumP(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p1'),
        p2: sumP(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p2'),
        sd: sumP(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'lalu') + sumP(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p1') + sumP(guItems, ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS'], 'p2')
      }
    }
  }

  body.push([{ content: '', colSpan: 14 }]) // empty separator
  body.push([{ content: 'Penerimaan', colSpan: 14, styles: { fontStyle: 'bold', fillColor: [250, 250, 250], halign: 'left' } }])
  
  const penLS = getSumObj(penerimaan, ['LS'])
  const penGU = getSumObj(penerimaan, ['UP', 'GU', 'TU', 'KKPD'])
  body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', penLS, penGU, true))

  const jTs = [['    a. UP', ['UP']], ['    b. GU', ['GU']], ['    c. TU', ['TU']], ['    d. LS', ['LS']], ['    e. KKPD', ['KKPD']]]
  jTs.forEach(jt => {
    const isLS = jt[1][0] === 'LS'
    const agg = getSumObj(penerimaan, jt[1])
    body.push(makeSumRow(jt[0], isLS ? agg : { lalu: 0, p1: 0, p2: 0, sd: 0 }, isLS ? { lalu: 0, p1: 0, p2: 0, sd: 0 } : agg))
  })

  const taxTypes = [
    { label: '    a. PPN', regex: /PPN/i },
    { label: '    c. PPh.- 21', regex: /PPh\s*21/i },
    { label: '    d. PPh.- 22', regex: /PPh\s*22/i },
    { label: '    e. PPh.- 23', regex: /PPh\s*23/i },
    { label: '    b. PPh. Psl 4 (Ayat 2)', regex: /PPh\s*(?:Pasal\s*)?4/i },
  ]

  const taxPenerimaanTotal = { ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }
  const taxPenerimaanRows = taxTypes.map(tt => {
    const agg = getTaxAgg(tt.regex)
    taxPenerimaanTotal.ls.lalu += agg.ls.lalu; taxPenerimaanTotal.ls.p1 += agg.ls.p1; taxPenerimaanTotal.ls.p2 += agg.ls.p2; taxPenerimaanTotal.ls.sd += agg.ls.sd
    taxPenerimaanTotal.gu.lalu += agg.gu.lalu; taxPenerimaanTotal.gu.p1 += agg.gu.p1; taxPenerimaanTotal.gu.p2 += agg.gu.p2; taxPenerimaanTotal.gu.sd += agg.gu.sd
    return makeSumRow(tt.label, agg.ls, agg.gu)
  })

  body.push(makeSumRow(' - Potongan Pajak', taxPenerimaanTotal.ls, taxPenerimaanTotal.gu, true))
  body.push(...taxPenerimaanRows)
  
  const totalPenerimaanAgg = {
    ls: { lalu: penLS.lalu + taxPenerimaanTotal.ls.lalu, p1: penLS.p1 + taxPenerimaanTotal.ls.p1, p2: penLS.p2 + taxPenerimaanTotal.ls.p2, sd: penLS.sd + taxPenerimaanTotal.ls.sd },
    gu: { lalu: penGU.lalu + taxPenerimaanTotal.gu.lalu, p1: penGU.p1 + taxPenerimaanTotal.gu.p1, p2: penGU.p2 + taxPenerimaanTotal.gu.p2, sd: penGU.sd + taxPenerimaanTotal.gu.sd }
  }
  body.push(makeSumRow('Jumlah Penerimaan', totalPenerimaanAgg.ls, totalPenerimaanAgg.gu, true))

  body.push([{ content: '', colSpan: 14 }]) // empty separator
  body.push([{ content: 'Pengeluaran', colSpan: 14, styles: { fontStyle: 'bold', fillColor: [250, 250, 250], halign: 'left' } }])

  const pengLS = getSumObj(pengeluaran, ['LS'])
  const pengGU = getSumObj(pengeluaran, ['GU', 'UP', 'TU', 'KKPD'])
  body.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', pengLS, pengGU, true))

  jTs.forEach(jt => {
    const isLS = jt[1][0] === 'LS'
    const agg = getSumObj(pengeluaran, jt[1])
    body.push(makeSumRow(jt[0], isLS ? agg : { lalu: 0, p1: 0, p2: 0, sd: 0 }, isLS ? { lalu: 0, p1: 0, p2: 0, sd: 0 } : agg))
  })

  const taxPengeluaranTotal = { ls: { lalu: 0, p1: 0, p2: 0, sd: 0 }, gu: { lalu: 0, p1: 0, p2: 0, sd: 0 } }
  const taxPengeluaranRows = taxTypes.map(tt => {
    const agg = getTaxSetoranAgg(tt.regex)
    taxPengeluaranTotal.ls.lalu += agg.ls.lalu; taxPengeluaranTotal.ls.p1 += agg.ls.p1; taxPengeluaranTotal.ls.p2 += agg.ls.p2; taxPengeluaranTotal.ls.sd += agg.ls.sd
    taxPengeluaranTotal.gu.lalu += agg.gu.lalu; taxPengeluaranTotal.gu.p1 += agg.gu.p1; taxPengeluaranTotal.gu.p2 += agg.gu.p2; taxPengeluaranTotal.gu.sd += agg.gu.sd
    return makeSumRow(tt.label, agg.ls, agg.gu)
  })

  body.push(makeSumRow(' - Penyetoran Pajak', taxPengeluaranTotal.ls, taxPengeluaranTotal.gu, true))
  body.push(...taxPengeluaranRows)

  const totalPengeluaranAgg = {
    ls: { lalu: pengLS.lalu + taxPengeluaranTotal.ls.lalu, p1: pengLS.p1 + taxPengeluaranTotal.ls.p1, p2: pengLS.p2 + taxPengeluaranTotal.ls.p2, sd: pengLS.sd + taxPengeluaranTotal.ls.sd },
    gu: { lalu: pengGU.lalu + taxPengeluaranTotal.gu.lalu, p1: pengGU.p1 + taxPengeluaranTotal.gu.p1, p2: pengGU.p2 + taxPengeluaranTotal.gu.p2, sd: pengGU.sd + taxPengeluaranTotal.gu.sd }
  }
  body.push(makeSumRow('Jumlah Pengeluaran', totalPengeluaranAgg.ls, totalPengeluaranAgg.gu, true))

  const saldoKasRiil = totalPenerimaanAgg.gu.sd - totalPengeluaranAgg.gu.sd
  const sR = new Array(3).fill('-')
  sR[0] = { content: 'Saldo Kas', colSpan: 12, styles: { fontStyle: 'bold', halign: 'right' } }
  sR[1] = { content: fmt(saldoKasRiil), styles: { fontStyle: 'bold', halign: 'right' } }
  sR[2] = '-'
  body.push(sR)

  // --- HEADER GENERATION ---
  const head = [
    [
      { content: 'NO', rowSpan: 2 },
      { content: 'Kode Rekening', rowSpan: 2 },
      { content: 'Uraian', rowSpan: 2 },
      { content: 'Jumlah Anggaran', rowSpan: 2 },
      { content: 'SPJ - LS Barang & Jasa', colSpan: 4 },
      { content: 'SPJ - UP/GU/TU', colSpan: 4 },
      { content: 'Jumlah SPJ (LS+UP/GU/TU) s/d Bulan ini', rowSpan: 2 },
      { content: 'SISA PAGU ANGGARAN', rowSpan: 2 }
    ],
    [
      's.d. Bulan lalu', 'Periode ke 1', 'Periode ke 2', 's.d. Bulan ini',
      's.d. Bulan lalu', 'Periode ke 1', 'Periode ke 2', 's.d. Bulan ini'
    ],
    [
      '1', '2', '3', '4', '5', '6', '7', '8=5+6+7', '9', '10', '11', '12=9+10+11', '13=8+12', '14=4-13'
    ]
  ]

  autoTable(doc, {
    startY: startY + 25, head: head, body: body, theme: 'grid',
    styles: { fontSize: 5.5, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 17, halign: 'right' },
      5: { cellWidth: 17, halign: 'right' },
      6: { cellWidth: 17, halign: 'right' },
      7: { cellWidth: 17, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 17, halign: 'right' },
      9: { cellWidth: 17, halign: 'right' },
      10: { cellWidth: 17, halign: 'right' },
      11: { cellWidth: 17, halign: 'right', fontStyle: 'bold' },
      12: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      13: { cellWidth: 20, halign: 'right' }
    }
  })

  let signY = doc.lastAutoTable.finalY + 10
  if (signY > 180) { doc.addPage(); signY = 20 }
  
  doc.setFontSize(8); 
  doc.text('Mengetahui :', 14, signY); 
  doc.text(`${settings.lokasi || 'Tasikmalaya'}, ${sigDay} ${sigMonthName.toLowerCase()} ${sigYear}`, 250, signY)
  
  const col1X = 14; const col3X = 250
  doc.text(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN,', col1X, signY + 5); 
  doc.text(settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU,', col3X, signY + 5)
  
  doc.setFont('helvetica', 'bold'); 
  doc.text(settings.kpa_nama || '', col1X, signY + 25); 
  doc.text(settings.bpp_nama || '', col3X, signY + 25)
  
  doc.setFont('helvetica', 'normal'); 
  doc.text(`NIP. ${settings.kpa_nip || ''}`, col1X, signY + 29); 
  doc.text(`NIP. ${settings.bpp_nip || ''}`, col3X, signY + 29)
  
  doc.save(`LPJ_Periode_${monthName}_${year}.pdf`)
}

function persen(v, total) {
  if (!total) return 0
  return Math.round((v / total) * 100)
}

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

export function exportBukuSimpananBankPdf(rows, monthIndex, year = new Date().getFullYear(), totalsBulanLalu = { debet: 0, kredit: 0 }, customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const monthName = getMonthName(monthIndex)
  const settings = useStore.getState().settings

  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()

  // --- HEADER SECTION ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PEMERINTAH PROVINSI JAWA BARAT', 105, 12, { align: 'center' })
  doc.text('BADAN PENDAPATAN DAERAH', 105, 17, { align: 'center' })
  
  const unitName = (settings.unit_kerja || '').replace(/^UPTD\s+/i, '').toUpperCase()
  doc.text(unitName, 105, 22, { align: 'center' })
  
  doc.setFontSize(11)
  doc.text('BUKU SIMPANAN / BANK', 105, 28, { align: 'center' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  const startY = 38
  const leftCol = 14
  const midCol = 65
  
  doc.text('S K P D', leftCol, startY)
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
      { content: 'NO', rowSpan: 1 },
      { content: 'TANGGAL', rowSpan: 1 },
      { content: 'U R A I A N', rowSpan: 1 },
      { content: 'PENERIMAAN', rowSpan: 1 },
      { content: 'PENGELUARAN', rowSpan: 1 },
      { content: 'SALDO', rowSpan: 1 }
    ],
    ['', '', '', 'Rp.', 'Rp.', 'Rp.']
  ]

  let initialSaldo = totalsBulanLalu.debet - totalsBulanLalu.kredit
  let runningSaldo = initialSaldo
  
  const tableData = [
    // Add the requested top row for initial balance from previous month
    [
      '',
      '',
      '',
      '',
      '',
      initialSaldo > 0 ? formatRupiah(initialSaldo).replace('Rp', '').trim() : '-'
    ],
    ...rows.map((r, i) => {
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
  ]

  const totalDebetIni = rows.reduce((s, r) => s + (r.debet || 0), 0)
  const totalKreditIni = rows.reduce((s, r) => s + (r.kredit || 0), 0)
  
  const totalDebetLalu = totalsBulanLalu.debet || 0
  const totalKreditLalu = totalsBulanLalu.kredit || 0

  const totalDebetSemua = totalDebetIni + totalDebetLalu
  const totalKreditSemua = totalKreditIni + totalKreditLalu

  const saldo = totalDebetSemua - totalKreditSemua

  const foot = [
    [
      { content: 'Jumlah Bulan Ini', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: totalDebetIni > 0 ? formatRupiah(totalDebetIni).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalKreditIni > 0 ? formatRupiah(totalKreditIni).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '-', styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Jumlah bulan lalu', colSpan: 3, styles: { fontStyle: 'bold' } },
      { content: totalDebetLalu > 0 ? formatRupiah(totalDebetLalu).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalKreditLalu > 0 ? formatRupiah(totalKreditLalu).replace('Rp', '').trim() : '-', styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '-', styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Jumlah s/d bulan ini', colSpan: 3, styles: { fontStyle: 'bold' } },
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
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold' },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 'auto' },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 }
    }
  })

  let signY = doc.lastAutoTable.finalY + 15
  if (signY > 230) { doc.addPage(); signY = 30 }

  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text('Mengetahui :', 14, signY)
  doc.text(`${settings.lokasi}, ${lastDay} ${monthName.toLowerCase()} ${year}`, 145, signY)

  doc.text(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN', 14, signY + 5)
  doc.text(settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu', 145, signY + 5)

  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', 14, signY + 25)
  doc.text(settings.bpp_nama || '', 145, signY + 25)

  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, 14, signY + 29)
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 145, signY + 29)


  doc.save(`Buku_Simpanan_Bank_${monthName}_${year}.pdf`)
}

export function exportRegisterKasPdf(data, cashUnits, monthIndex, year, customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings
  const monthName = getMonthName(monthIndex)
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()
  const fullDate = `${lastDay} ${monthName.charAt(0) + monthName.slice(1).toLowerCase()} ${year}`
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('BADAN PENDAPATAN DAERAH PROVINSI JAWA BARAT', 105, 15, { align: 'center' })
  doc.text('REGISTER PENUTUPAN KAS', 105, 20, { align: 'center' })
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  let curY = 32
  const col1 = 20
  const col2 = 75
  const col3 = 150
  
  doc.text('Tanggal Penutupan Kas', col1, curY); doc.text(`:  ${fullDate}`, col2, curY); curY += 4
  doc.text('Nama Penutup Kas', col1, curY); doc.text(`:  ${settings.bpp_nama || ''}`, col2, curY); curY += 4
  doc.text('Tanggal Penutupan Kas yang lalu', col1, curY); doc.text(':  -', col2, curY); curY += 4
  doc.text('Jumlah Transaksi s/d bulan', col1, curY); doc.text(`:  ${fullDate}`, col2, curY); curY += 4
  
  const startD = data.startDateText || `01 Januari ${year}`
  const labelPen = `Jumlah Penerimaan mulai dari ${startD} s.d ${fullDate}`
  const labelPeng = `Jumlah Pengeluaran mulai dari ${startD} s.d ${fullDate}`
  
  doc.text(labelPen, col1, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.totalDebetSemua).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  doc.text(labelPeng, col1, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.totalKreditSemua).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  
  doc.line(col3, curY - 3, 190, curY - 3)
  
  doc.text('Saldo Buku ..............', col3 - 35, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  doc.text('Saldo Kas ................', col3 - 35, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 7
  
  doc.setFont('helvetica', 'bolditalic'); doc.text('Terdiri atas :', col1, curY); curY += 5; doc.setFont('helvetica', 'normal')
  
  const drawList = (num, items, labelTotal) => {
    doc.text(`${num}`, col1, curY)
    let totalVal = 0
    items.forEach(it => {
      const val = it.qty * it.denom
      totalVal += val
      doc.text(it.label, col1 + 4, curY)
      doc.text('=', col1 + 65, curY)
      doc.text(it.qty > 0 ? String(it.qty) : '-', col1 + 71, curY, { align: 'right' })
      doc.text(it.unit, col1 + 73, curY)
      doc.text('Rp.', col3, curY)
      doc.text(val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
      curY += 4
    })
    doc.setFont('helvetica', 'bold')
    doc.text(labelTotal, col1 + 65, curY)
    doc.text('Rp.', col3, curY)
    doc.text(totalVal > 0 ? formatRupiah(totalVal).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
    doc.line(col3, curY - 3, 190, curY - 3)
    curY += 5
    doc.setFont('helvetica', 'normal')
    return totalVal
  }

  const paperDenoms = [
    { d: 100000, k: 'kertas_100k' }, { d: 50000, k: 'kertas_50k' }, { d: 20000, k: 'kertas_20k' }, 
    { d: 10000, k: 'kertas_10k' }, { d: 5000, k: 'kertas_5k' }, { d: 2000, k: 'kertas_2k' }, 
    { d: 1000, k: 'kertas_1k' }, { d: 500, k: 'kertas_500' }
  ]
  const paperItems = paperDenoms.map(x => ({
    label: `Lembar Uang Kertas    Rp.       ${x.d.toLocaleString('id-ID')}`,
    denom: x.d,
    qty: cashUnits[x.k] || 0,
    unit: 'Lembar'
  }))
  
  const total1 = drawList(1, paperItems, 'JUMLAH (1)............................')

  const coinDenoms = [
    { d: 1000, k: 'logam_1000' }, { d: 500, k: 'logam_500' }, { d: 200, k: 'logam_200' }, 
    { d: 100, k: 'logam_100' }, { d: 50, k: 'logam_50' }, { d: 25, k: 'logam_25' }
  ]
  const coinItems = coinDenoms.map(x => ({
    label: `Kepingan Uang Logam Rp.        ${x.d.toLocaleString('id-ID')}`,
    denom: x.d,
    qty: cashUnits[x.k] || 0,
    unit: 'Keping'
  }))
  
  const total2 = drawList(2, coinItems, 'JUMLAH (2)............................')
  
  doc.setFont('helvetica', 'bold')
  doc.text('JUMLAH (1 + 2)........................', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  const sumCash = total1 + total2
  doc.text(sumCash > 0 ? formatRupiah(sumCash).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
  curY += 6
  doc.setFont('helvetica', 'normal')

  doc.text('3', col1, curY)
  const wrapped3 = doc.splitTextToSize('Kertas Berharga dan Bagian Hak yang diizinkan Ordonansi / SP2D, Wesel, Cek, Saldo Bank, Materai, dan sebagainya ............................................................', 128)
  doc.text(wrapped3, col1 + 4, curY)
  const item3Value = data.saldo - sumCash
  doc.text('Rp.', col3, curY + ((wrapped3.length - 1) * 4))
  doc.text(formatRupiah(item3Value).replace('Rp', '').trim(), 190, curY + ((wrapped3.length - 1) * 4), { align: 'right' })
  doc.line(col3, curY + ((wrapped3.length - 1) * 4) + 1, 190, curY + ((wrapped3.length - 1) * 4) + 1)
  curY += (wrapped3.length * 4) + 2

  doc.setFont('helvetica', 'bold')
  doc.text('JUMLAH SELURUHNYA', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' })
  doc.line(col3, curY + 1, 190, curY + 1)
  curY += 4
  
  doc.text('Perbedaan Positif', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  doc.text('-', 190, curY, { align: 'right' })
  doc.line(col3, curY + 1, 190, curY + 1)
  curY += 8
  
  doc.setFont('helvetica', 'normal')
  doc.text('4', col1, curY)
  doc.text('Penjelasan Perbedaan Positif              :', col1 + 4, curY)
  doc.text('-', col1 + 68, curY)
  curY += 15
  
  if (curY > 240) { doc.addPage(); curY = 20 }
  doc.text(`${settings.lokasi || ''}, ${fullDate}`, 145, curY); curY += 10
  doc.text('Mengetahui :', col1, curY)
  doc.text('BENDAHARA PENGELUARAN PEMBANTU,', 145, curY); curY += 4
  doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', col1, curY); curY += 25
  
  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', col1, curY)
  doc.text(settings.bpp_nama || '', 145, curY)
  curY += 4
  
  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, col1, curY)
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 145, curY)

  doc.save(`Register_Penutupan_Kas_${monthName}_${year}.pdf`)
}

export function exportRPPUAPdf(data, filterBulan, year = new Date().getFullYear(), customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings

  const displayDate = formatTanggal(customDate || new Date(year, filterBulan + 1, 0))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('DAFTAR : REKAPITULASI PENERIMAAN DAN PENGELUARAN UANG ANGGARAN', 105, 15, { align: 'center' })
  
  const unitUpperCase = (settings.unit_kerja || '').toUpperCase()
  doc.text(unitUpperCase, 105, 20, { align: 'center' })
  
  doc.setFontSize(9)
  doc.text(`MENURUT BUKU KAS UMUM S.D TANGGAL ${displayDate}`, 105, 26, { align: 'center' })

  const head = [
    [
      { content: 'NO', styles: { halign: 'center' } },
      { content: 'BULAN', styles: { halign: 'center' } },
      { content: 'PENERIMAAN', styles: { halign: 'center' } },
      { content: 'PENGELUARAN', styles: { halign: 'center' } },
      { content: 'SALDO', styles: { halign: 'center' } },
      { content: 'KETERANGAN', styles: { halign: 'center' } }
    ]
  ]

  let runningSaldo = 0
  let totalPen = 0
  let totalPeng = 0

  const tableBody = data.map((item, index) => {
    const isAfterCurrent = index > filterBulan
    
    if (!isAfterCurrent) {
      runningSaldo += (item.penerimaan || 0) - (item.pengeluaran || 0)
      totalPen += (item.penerimaan || 0)
      totalPeng += (item.pengeluaran || 0)
    }
    
    return [
      index + 1,
      item.bulan.toUpperCase(),
      (!isAfterCurrent && item.penerimaan > 0) ? formatRupiah(item.penerimaan).replace('Rp', '').trim() : '-',
      (!isAfterCurrent && item.pengeluaran > 0) ? formatRupiah(item.pengeluaran).replace('Rp', '').trim() : '-',
      (!isAfterCurrent) ? (runningSaldo >= 0 ? formatRupiah(runningSaldo).replace('Rp', '').trim() : `(${formatRupiah(Math.abs(runningSaldo)).replace('Rp', '').trim()})`) : '-',
      ''
    ]
  })

  const foot = [
    [
      { content: 'JUMLAH', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: formatRupiah(totalPen).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(totalPeng).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatRupiah(runningSaldo).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '', styles: { fontStyle: 'bold' } }
    ]
  ]

  autoTable(doc, {
    startY: 35,
    head: head,
    body: tableBody,
    foot: foot,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', textColor: [0, 0, 0] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 'auto' }
    }
  })

  let signY = doc.lastAutoTable.finalY + 15
  if (signY > 230) { doc.addPage(); signY = 20 }

  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  const locationDate = `${settings.lokasi || ''}, ${displayDate}`
  doc.text(locationDate, 140, signY)

  doc.text('Mengetahui :', 14, signY + 5)
  doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', 14, signY + 10)
  doc.text(settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu,', 140, signY + 10)

  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', 14, signY + 35)
  doc.text(settings.bpp_nama || '', 140, signY + 35)

  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, 14, signY + 39)
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 140, signY + 39)

  doc.save(`RPPUA_${year}.pdf`)
}

export function exportRPPUPPdf(data, filterBulan, year = new Date().getFullYear(), customDate = null) {
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings
  
  const displayDate = formatTanggal(customDate || new Date(year, filterBulan + 1, 0))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('REKAPITULASI PENERIMAAN DAN PENYETORAN UANG POTONGAN', 148.5, 15, { align: 'center' })
  const unitName = (settings.unit_kerja || '').toUpperCase()
  doc.text(unitName, 148.5, 20, { align: 'center' })
  doc.setFontSize(9)
  doc.text(`S.D TANGGAL ${displayDate}`, 148.5, 25, { align: 'center' })

  const head = [
    [
      { content: 'NO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'BULAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'PENERIMAAN', colSpan: 6, styles: { halign: 'center' } },
      { content: 'PENYETORAN', colSpan: 2, styles: { halign: 'center' } },
      { content: 'SISA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ],
    [
      { content: 'PPH PASAL 21', styles: { halign: 'center' } },
      { content: 'PPH PASAL 22', styles: { halign: 'center' } },
      { content: 'PPH PASAL 23', styles: { halign: 'center' } },
      { content: 'PPN', styles: { halign: 'center' } },
      { content: 'PPh PASAL 4 AYAT 2', styles: { halign: 'center' } },
      { content: 'JUMLAH', styles: { halign: 'center' } },
      { content: 'TANGGAL', styles: { halign: 'center' } },
      { content: 'JUMLAH', styles: { halign: 'center' } }
    ]
  ]

  let runningSaldo = 0
  let totalPen = 0
  let totalPaid = 0
  let sumPPh21 = 0, sumPPh22 = 0, sumPPh23 = 0, sumPPN = 0, sumPPh4 = 0

  const tableBody = data.map((item, index) => {
    const isAfter = index > filterBulan
    if (!isAfter) {
      runningSaldo += (item.totalPen || 0) - (item.penyetoran || 0)
      totalPen += (item.totalPen || 0)
      totalPaid += (item.penyetoran || 0)
      sumPPh21 += (item.pph21 || 0)
      sumPPh22 += (item.pph22 || 0)
      sumPPh23 += (item.pph23 || 0)
      sumPPN += (item.ppn || 0)
      sumPPh4 += (item.pph4 || 0)
    }

    const fmt = (val) => !isAfter && val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-'

    return [
      index + 1,
      item.bulan.toUpperCase(),
      fmt(item.pph21),
      fmt(item.pph22),
      fmt(item.pph23),
      fmt(item.ppn),
      fmt(item.pph4),
      fmt(item.totalPen),
      '-', 
      fmt(item.penyetoran),
      !isAfter ? (runningSaldo > 0 ? formatRupiah(runningSaldo).replace('Rp', '').trim() : '-') : '-'
    ]
  })

  const foot = [[
    { content: 'JUMLAH', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: formatRupiah(sumPPh21).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatRupiah(sumPPh22).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatRupiah(sumPPh23).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatRupiah(sumPPN).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatRupiah(sumPPh4).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatRupiah(totalPen).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: '-', styles: { halign: 'center', fontStyle: 'bold' } },
    { content: formatRupiah(totalPaid).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatRupiah(runningSaldo).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }
  ]]

  autoTable(doc, {
    startY: 35, head: head, body: tableBody, foot: foot, theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', textColor: [0, 0, 0] },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
      8: { cellWidth: 20, halign: 'center' },
      9: { halign: 'right' },
      10: { halign: 'right' }
    }
  })

  let signY = doc.lastAutoTable.finalY + 15
  if (signY > 160) { doc.addPage(); signY = 20 }
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`${settings.lokasi || ''}, ${displayDate}`, 220, signY)
  doc.text('Mengetahui :', 20, signY + 5)
  doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', 20, signY + 10)
  doc.text(settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu,', 220, signY + 10)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', 20, signY + 35); doc.text(settings.bpp_nama || '', 220, signY + 35)
  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, 20, signY + 39); doc.text(`NIP. ${settings.bpp_nip || ''}`, 220, signY + 39)
  
  doc.save(`RPPUP_${year}.pdf`)
}

export const exportBAPenutupanKasPdf = async (data, settings) => {
  const getBase64 = async (url) => {
    return new Promise((resolve) => {
      let isResolved = false
      const timeout = setTimeout(() => {
        if (!isResolved) { isResolved = true; resolve('') }
      }, 2000)
      const img = new Image()
      img.onload = () => {
        if (isResolved) return
        isResolved = true
        clearTimeout(timeout)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch (error) { resolve('') }
      }
      img.onerror = () => {
        if (isResolved) return
        isResolved = true
        clearTimeout(timeout)
        resolve('')
      }
      img.src = url
    })
  }

  const logoBase64 = await getBase64(logoJabar)
  const now = new Date()
  const year = now.getFullYear()
  const monthIndex = now.getMonth()
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const monthName = months[monthIndex]
  const fullDate = `${now.getDate()} ${monthName} ${year}`
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()

  const fmt = (val) => {
    if (!val || val === 0) return '0,00'
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(val)
  }

  const saldoAwal = (data.saldo || 0) - (data.totalDebetIni || 0) + (data.totalKreditIni || 0)
  const totalCash = data.tunai || 0
  const saldoBank = data.bank || 0

  const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 215mm 330mm;
          margin: 0.5cm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          width: 210mm;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #000;
          margin: 0;
          padding: 0;
          background: #fff;
        }
        .kop-table {
          width: 100%;
          border-bottom: 3px solid #000;
          margin-bottom: 2px;
          padding-bottom: 8px;
        }
        .kop-line-2 {
          border-bottom: 1px solid #000;
          margin-bottom: 20px;
        }
        .kop-logo {
          width: 80px;
          vertical-align: middle;
        }
        .kop-text {
          text-align: center;
          vertical-align: middle;
        }
        .kop-text p {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
        }
        .judul {
          text-align: center;
          margin: 25px 0;
        }
        .judul h3 {
          margin: 0;
          font-size: 13pt;
          text-decoration: underline;
          font-weight: bold;
        }
        .data-tbl {
          width: 100%;
          margin-bottom: 15px;
          border-collapse: collapse;
        }
        .data-tbl td {
          vertical-align: top;
          padding: 3px 0;
        }
        .col-num { width: 30px; }
        .col-label { width: 340px; }
        .col-sep { width: 20px; text-align: center; }
        .col-curr { width: 40px; }
        .col-val { width: 140px; text-align: right; font-weight: bold; }
        
        .tanda-tangan {
          margin-top: 40px;
          width: 100%;
        }
        .tanda-tangan td {
          width: 50%;
          text-align: center;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <table class="kop-table">
        <tr>
          <td width="90">
            ${logoBase64 ? `<img src="${logoBase64}" class="kop-logo" />` : ''}
          </td>
          <td class="kop-text">
            <p style="font-size: 14pt;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
            <p style="font-size: 16pt; font-weight: bold;">BADAN PENDAPATAN DAERAH</p>
            <p style="font-size: 15pt; font-weight: bold;">PUSAT PENGELOLAAN PENDAPATAN DAERAH</p>
            <p style="font-size: 15pt; font-weight: bold;">WILAYAH ${(settings.lokasi_wilayah || 'KABUPATEN TASIKMALAYA').toUpperCase()}</p>
            <p style="font-size: 10pt; margin-top: 5px; font-weight: normal;">${settings.alamat_kantor || ''}</p>
          </td>
        </tr>
      </table>
      <div class="kop-line-2"></div>

      <div style="margin-bottom: 25px;">
        Kepada Yth,<br>
        Bapak Kepala Pusat Pengelolaan Pendapatan Daerah<br>
        Wilayah ${settings.lokasi_wilayah || 'Kabupaten Tasikmalaya'}<br>
        di - <br>
        <span style="padding-left: 25px;">${(settings.lokasi || 'Sukaraja').toUpperCase()}</span>
      </div>

      <div class="judul">
        <h3>BERITA ACARA LAPORAN PENUTUPAN KAS</h3>
      </div>

      <p style="text-align: justify; margin-bottom: 15px;">
        Dengan memperhatikan Peraturan Gubernur Jawa Barat Nomor 5 Tahun 2017 tentang Sistem dan Prosedur Pengelolaan Keuangan Daerah, dengan ini kami sampaikan Laporan Penutupan Kas per tanggal ${fullDate} sebagai berikut :
      </p>

      <div style="margin-bottom: 15px;">
        <strong style="text-decoration: underline;">A. Kas di Bendahara Pengeluaran</strong>
        <table class="data-tbl">
          <tr><td class="col-num">1.</td><td class="col-label">Saldo awal bulan</td><td class="col-sep">:</td><td class="col-curr">Rp.</td><td class="col-val">Nihil</td></tr>
          <tr><td>2.</td><td>Jumlah Penerimaan s.d ${lastDay} ${monthName}</td><td>:</td><td>Rp.</td><td class="col-val">Nihil</td></tr>
          <tr><td>3.</td><td>Jumlah Pengeluaran s.d ${lastDay} ${monthName}</td><td>:</td><td>Rp.</td><td class="col-val">Nihil</td></tr>
          <tr><td>4.</td><td>Saldo akhir bulan</td><td>:</td><td>Rp.</td><td class="col-val">Nihil</td></tr>
        </table>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="text-decoration: underline;">B. Kas di Bendahara Pengeluaran Pembantu</strong>
        <table class="data-tbl">
          <tr><td class="col-num">1.</td><td class="col-label">Saldo awal bulan ${monthName} ${year}</td><td class="col-sep">:</td><td class="col-curr">Rp.</td><td class="col-val">${fmt(saldoAwal)}</td></tr>
          <tr><td>2.</td><td>Jumlah Penerimaan s.d ${lastDay} ${monthName} ${year}</td><td>:</td><td>Rp.</td><td class="col-val">${fmt(data.totalDebetIni)}</td></tr>
          <tr><td>3.</td><td>Jumlah Pengeluaran s.d ${lastDay} ${monthName} ${year}</td><td>:</td><td>Rp.</td><td class="col-val">${fmt(data.totalKreditIni)}</td></tr>
          <tr><td>4.</td><td>Saldo akhir bulan ${monthName} ${year}</td><td>:</td><td>Rp.</td><td class="col-val">${fmt(data.saldo)}</td></tr>
        </table>
        <p style="margin-left: 30px; font-style: italic; font-size: 10pt;">Keterangan : Terdiri dari saldo kas tunai Rp. ${fmt(totalCash)} dan saldo bank Rp. ${fmt(saldoBank)}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="text-decoration: underline;">C. Rekapitulasi Posisi Kas</strong>
        <table class="data-tbl">
          <tr><td class="col-num">1.</td><td class="col-label">Saldo Kas di Bendahara Pengeluaran</td><td class="col-sep">:</td><td class="col-curr">Rp.</td><td class="col-val">Nihil</td></tr>
          <tr><td>2.</td><td>Saldo Kas di Bendahara Pengeluaran Pembantu</td><td>:</td><td>Rp.</td><td class="col-val">${fmt(data.saldo)}</td></tr>
          <tr><td>3.</td><td>Saldo Kas s/d Tanggal ${fullDate}</td><td>:</td><td>Rp.</td><td class="col-val">${fmt(data.saldo)}</td></tr>
        </table>
      </div>

      <p style="margin-top: 15px;">
        Demikian Berita Acara Laporan Penutupan Kas ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      <table class="tanda-tangan">
        <tr>
          <td></td>
          <td>${settings.lokasi || 'Sukaraja'}, ${fullDate}<br>Yang membuat laporan,</td>
        </tr>
        <tr>
          <td style="padding-top: 15px;">Mengetahui,<br>${settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN,'}</td>
          <td style="padding-top: 15px;"><br>${settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU,'}</td>
        </tr>
        <tr>
          <td style="padding-top: 60px;"><strong><u>${settings.kpa_nama || ''}</u></strong></td>
          <td style="padding-top: 60px;"><strong><u>${settings.bpp_nama || ''}</u></strong></td>
        </tr>
        <tr>
          <td>${settings.kpa_pangkat || ''}<br>NIP. ${settings.kpa_nip || ''}</td>
          <td>${settings.bpp_pangkat || ''}<br>NIP. ${settings.bpp_nip || ''}</td>
        </tr>
      </table>
    </body>
    </html>
  `

  if (window.api && window.api.printToPdf) {
    try {
      const res = await window.api.printToPdf({ 
        html, 
        defaultPath: `BA_Penutupan_Kas_${monthName}_${year}.pdf`,
        pageSize: 'Legal'
      })
      if (res && !res.success) {
        alert('Gagal mencetak: ' + (res.error || 'Unknown error'))
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }
}
