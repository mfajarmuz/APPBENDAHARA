// src/lib/export-excel.js
import * as XLSX from 'xlsx'
import { formatTanggal } from './format'

function download(wb, filename) {
  XLSX.writeFile(wb, filename)
}

export function exportBKUExcel(rows) {
  const data = rows.map((r, i) => {
    const no = i + 1
    const suffix = `[${no}]. P3DW Kabupaten Tasikmalaya.`
    const finalUraian = r.uraian ? `${r.uraian} ${suffix}` : suffix

    return {
      'NO': no,
      'TANGGAL': formatTanggal(r.tanggal),
      'KODE REKENING': r.kode_rekening || '',
      'URAIAN': finalUraian,
      'PENERIMAAN': r.debet || 0,
      'PENGELUARAN': r.kredit || 0,
    }
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'BKU')
  download(wb, 'BKU.xlsx')
  return 'BKU.xlsx'
}

export function exportRealisasiExcel(subKegiatan, realisasiPerRek) {
  const data = []
  subKegiatan.forEach(sk => {
    const skReal = (sk.kode_rekening ?? []).reduce((s, r) => s + (realisasiPerRek[r.id] ?? 0), 0)
    data.push({
      Kode: sk.kode,
      Uraian: sk.nama,
      Pagu: sk.total_pagu,
      Realisasi: skReal,
      Sisa: sk.total_pagu - skReal,
    })
    ;(sk.kode_rekening ?? []).forEach(r => {
      const real = realisasiPerRek[r.id] ?? 0
      data.push({
        Kode: `  ${r.kode}`,
        Uraian: `  ${r.uraian}`,
        Pagu: r.pagu_anggaran,
        Realisasi: real,
        Sisa: r.pagu_anggaran - real,
      })
    })
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Realisasi')
  download(wb, 'Realisasi.xlsx')
}

export function exportTemplatePengeluaran(pengeluaranList, targetMonth = 3, targetYear = 2026) {
  // targetMonth: 3 (April secara 0-indexed)
  
  // Saring data belanja ril (bukan Pajak / Pajak LS) untuk bulan & tahun target
  const filteredData = pengeluaranList.filter(p => {
    const d = new Date(p.tanggal)
    const isTargetMonth = d.getMonth() === targetMonth && d.getFullYear() === targetYear
    const isBelanja = p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS'
    return isTargetMonth && isBelanja
  })

  // Format baris-baris data Excel sesuai format template
  const rows = filteredData.map(p => {
    const d = new Date(p.tanggal)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const tglFormatted = `${day}-${month}-${year}`

    const combinedCode = p.sub_kegiatan && p.kode_rekening
      ? `${p.sub_kegiatan.kode}.${p.kode_rekening.kode}`
      : ''

    const uraian = p.pengeluaran_rincian?.length > 0
      ? p.pengeluaran_rincian.map(r => r.uraian).join(', ')
      : p.keterangan || ''

    return [
      tglFormatted,
      combinedCode,
      uraian,
      p.jumlah
    ]
  })

  // Format array-of-arrays dengan baris header pertama
  const sheetData = [
    ["Tanggal", "Kode Rekening", "Uraian", "Pengeluaran"],
    ...rows
  ]

  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  
  // Berikan sedikit styling lebar kolom default agar tidak terpotong
  ws['!cols'] = [
    { wch: 12 }, // Tanggal
    { wch: 40 }, // Kode Rekening
    { wch: 70 }, // Uraian
    { wch: 15 }  // Pengeluaran
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template Pengeluaran')
  
  const today = new Date().toISOString().split('T')[0]
  const filename = `template-pengeluaran_April_${today}.xlsx`
  
  download(wb, filename)
  return filename
}

export function exportLPJExcel(monthIndex, year, allSubKegiatan, pengeluaran, penerimaan, customDate = null, settings = {}) {
  const getMonthName = (idx) => {
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    return BULAN[idx] || ''
  }

  const monthName = getMonthName(monthIndex)
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()
  const startDate = new Date(year, monthIndex, 1)

  // --- LOGIC & CALCULATIONS ---
  const filterByJenisTime = (items, jenisList, isIni) => items.filter(p => {
    const d = new Date(p.tanggal); const m = d.getMonth(); const y = d.getFullYear()
    const matchesJenis = jenisList.includes(p.jenis)
    if (isIni) {
      const cutoff = customDate ? new Date(customDate) : new Date(year, monthIndex + 1, 0)
      cutoff.setHours(23, 59, 59, 999)
      return matchesJenis && (y === year && m === monthIndex && d <= cutoff)
    }
    return matchesJenis && (y < year || (y === year && m < monthIndex))
  })
  const sumJ = (items) => items.reduce((s, p) => s + p.jumlah, 0)
  const sumP = (items, jenisList, isIni) => sumJ(filterByJenisTime(items, jenisList, isIni))

  const sheetData = [
    ["PROVINSI JAWA BARAT"],
    ["LAPORAN PERTANGGUNGJAWABAN BENDAHARA PENGELUARAN PEMBANTU"],
    ["(Administratif)"],
    [],
    ["SKPD", "", `: ${settings.unit_kerja || ''}`],
    ["KUASA PENGGUNA ANGGARAN", "", `: ${settings.kpa_nama || ''}`],
    ["BENDAHARA PENGELUARAN PEMBANTU", "", `: ${settings.bpp_nama || ''}`],
    ["TAHUN ANGGARAN", "", `: ${year}`],
    ["BULAN", "", `: ${monthName} ${year}`],
    [],
    [
      "Kode Rekening",
      "Uraian",
      "Jumlah Anggaran (Pagu)",
      "SPJ - LS GAJI", "", "",
      "SPJ - LS BARANG & JASA", "", "",
      "SPJ - UP / GU / TU", "", "",
      "Jumlah s/d Bulan Ini",
      "Sisa Anggaran"
    ],
    [
      "", "", "",
      "s/d Bln Lalu", "Bulan Ini", "s/d Bulan Ini",
      "s/d Bln Lalu", "Bulan Ini", "s/d Bulan Ini",
      "s/d Bln Lalu", "Bulan Ini", "s/d Bulan Ini",
      "", ""
    ],
    [
      "1", "2", "3", "4", "5", "6", "7", "8", "9=(7+8)", "10", "11", "12", "13=6+9+12", "14=3-13"
    ]
  ]

  let globalTotals = { pagu: 0, ls: { lalu: 0, ini: 0, sd: 0 }, gu: { lalu: 0, ini: 0, sd: 0 }, totalSd: 0 }

  allSubKegiatan.forEach((sk) => {
    let skTotals = { pagu: 0, ls: { lalu: 0, ini: 0, sd: 0 }, gu: { lalu: 0, ini: 0, sd: 0 }, totalSd: 0 }
    const subRows = []
    
    ;(sk.kode_rekening || []).forEach((rek) => {
      const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
      const lsL = sumJ(filterByJenisTime(rp, ['LS'], false)); const lsI = sumJ(filterByJenisTime(rp, ['LS'], true)); const lsS = lsL + lsI
      const guL = sumJ(filterByJenisTime(rp, ['GU', 'UP', 'TU', 'KKPD'], false)); const guI = sumJ(filterByJenisTime(rp, ['GU', 'UP', 'TU', 'KKPD'], true)); const guS = guL + guI
      const tS = lsS + guS
      
      subRows.push([
        rek.kode,
        rek.uraian,
        rek.pagu_anggaran,
        0, 0, 0, // LS Gaji
        lsL, lsI, lsS,
        guL, guI, guS,
        tS,
        rek.pagu_anggaran - tS
      ])
      
      skTotals.pagu += (rek.pagu_anggaran || 0); skTotals.ls.lalu += lsL; skTotals.ls.ini += lsI; skTotals.ls.sd += lsS; skTotals.gu.lalu += guL; skTotals.gu.ini += guI; skTotals.gu.sd += guS; skTotals.totalSd += tS
    })

    sheetData.push([
      sk.kode,
      sk.nama,
      skTotals.pagu,
      0, 0, 0,
      skTotals.ls.lalu, skTotals.ls.ini, skTotals.ls.sd,
      skTotals.gu.lalu, skTotals.gu.ini, skTotals.gu.sd,
      skTotals.totalSd,
      skTotals.pagu - skTotals.totalSd
    ])
    
    sheetData.push(...subRows)
    
    globalTotals.pagu += skTotals.pagu; globalTotals.ls.lalu += skTotals.ls.lalu; globalTotals.ls.ini += skTotals.ls.ini; globalTotals.ls.sd += skTotals.ls.sd; globalTotals.gu.lalu += skTotals.gu.lalu; globalTotals.gu.ini += skTotals.gu.ini; globalTotals.gu.sd += skTotals.gu.sd; globalTotals.totalSd += skTotals.totalSd
  })

  // 1. JUMLAH Row
  sheetData.push([
    "JUMLAH",
    "",
    globalTotals.pagu,
    0, 0, 0,
    globalTotals.ls.lalu, globalTotals.ls.ini, globalTotals.ls.sd,
    globalTotals.gu.lalu, globalTotals.gu.ini, globalTotals.gu.sd,
    globalTotals.totalSd,
    globalTotals.pagu - globalTotals.totalSd
  ])

  const makeSumRow = (label, lsAgg, guAgg) => {
    return [
      label,
      "",
      "",
      0, 0, 0,
      lsAgg.lalu, lsAgg.ini, lsAgg.sd,
      guAgg.lalu, guAgg.ini, guAgg.sd,
      lsAgg.sd + guAgg.sd,
      ""
    ]
  }

  const zero = { lalu: 0, ini: 0, sd: 0 }
  const isTaxFromLS = (p) => (p.jenis === 'Pajak LS' || p.jenis === 'LS' || (!!p.no_sp2d && p.no_sp2d !== '-' && !p.no_sp2d.startsWith('BPP-')) || (!!p.nomor_ls && p.nomor_ls !== '-' && !p.nomor_ls.startsWith('BPP-')))

  const getTaxAgg = (regex) => {
    const items = penerimaan.filter(p => (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(p.keterangan || ''))
    const lsItems = items.filter(p => isTaxFromLS(p)); const guItems = items.filter(p => !isTaxFromLS(p))
    return {
      ls: { lalu: sumP(lsItems, ['Pajak', 'Pajak LS'], false), ini: sumP(lsItems, ['Pajak', 'Pajak LS'], true), sd: sumP(lsItems, ['Pajak', 'Pajak LS'], false) + sumP(lsItems, ['Pajak', 'Pajak LS'], true) },
      gu: { lalu: sumP(guItems, ['Pajak', 'Pajak LS'], false), ini: sumP(guItems, ['Pajak', 'Pajak LS'], true), sd: sumP(guItems, ['Pajak', 'Pajak LS'], false) + sumP(guItems, ['Pajak', 'Pajak LS'], true) }
    }
  }

  const getTaxSetoranAgg = (regex) => {
    const items = pengeluaran.filter(p => { const u = p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || ''; return (u.startsWith('Setoran') || u.startsWith('Dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(u) })
    const lsItems = items.filter(p => isTaxFromLS(p)); const guItems = items.filter(p => !isTaxFromLS(p))
    const jl = ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS']
    return {
      ls: { lalu: sumP(lsItems, jl, false), ini: sumP(lsItems, jl, true), sd: sumP(lsItems, jl, false) + sumP(lsItems, jl, true) },
      gu: { lalu: sumP(guItems, jl, false), ini: sumP(guItems, jl, true), sd: sumP(guItems, jl, false) + sumP(guItems, jl, true) }
    }
  }

  const taxTypes = [{ label: '    a. PPN', regex: /PPN/i }, { label: '    b. PPh.- 21', regex: /PPh\s*21/i }, { label: '    c. PPh.- 22', regex: /PPh\s*22/i }, { label: '    d. PPh.- 23', regex: /PPh\s*23/i }, { label: '    e. PPh. Psl 4 (Ayat 2)', regex: /PPh\s*(?:Pasal\s*)?4/i }]
  
  // --- PENERIMAAN SECTION ---
  sheetData.push([])
  sheetData.push(["Penerimaan"])
  
  const penLS = { lalu: sumP(penerimaan, ['LS'], false), ini: sumP(penerimaan, ['LS'], true), sd: sumP(penerimaan, ['LS'], false) + sumP(penerimaan, ['LS'], true) }
  const penGU = { lalu: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], false), ini: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], true), sd: sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], false) + sumP(penerimaan, ['UP', 'GU', 'TU', 'KKPD'], true) }
  sheetData.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', penLS, penGU))
  
  const jTs = [['    a. UP', ['UP']], ['    b. GU', ['GU']], ['    c. TU', ['TU']], ['    d. LS', ['LS']], ['    e. KKPD', ['KKPD']]]
  jTs.forEach(jt => { 
    const isLS = jt[1][0] === 'LS'; 
    const a = { lalu: sumP(penerimaan, jt[1], false), ini: sumP(penerimaan, jt[1], true), sd: sumP(penerimaan, jt[1], false) + sumP(penerimaan, jt[1], true) }; 
    sheetData.push(makeSumRow(jt[0], isLS ? a : zero, isLS ? zero : a)) 
  })
  
  const taxPotonganTotal = { ls: { ...zero }, gu: { ...zero } }
  const taxPotonganRows = taxTypes.map(tt => { 
    const a = getTaxAgg(tt.regex); 
    taxPotonganTotal.ls.lalu += a.ls.lalu; taxPotonganTotal.ls.ini += a.ls.ini; taxPotonganTotal.ls.sd += a.ls.sd; 
    taxPotonganTotal.gu.lalu += a.gu.lalu; taxPotonganTotal.gu.ini += a.gu.ini; taxPotonganTotal.gu.sd += a.gu.sd; 
    return makeSumRow(tt.label, a.ls, a.gu) 
  })
  sheetData.push(makeSumRow(' - Potongan Pajak', taxPotonganTotal.ls, taxPotonganTotal.gu))
  sheetData.push(...taxPotonganRows)
  
  const totalPenerimaanAgg = { 
    ls: { lalu: penLS.lalu + taxPotonganTotal.ls.lalu, ini: penLS.ini + taxPotonganTotal.ls.ini, sd: penLS.sd + taxPotonganTotal.ls.sd }, 
    gu: { lalu: penGU.lalu + taxPotonganTotal.gu.lalu, ini: penGU.ini + taxPotonganTotal.gu.ini, sd: penGU.sd + taxPotonganTotal.gu.sd } 
  }
  sheetData.push(makeSumRow('Jumlah Penerimaan', totalPenerimaanAgg.ls, totalPenerimaanAgg.gu))

  // --- PENGELUARAN SECTION ---
  sheetData.push([])
  sheetData.push(["Pengeluaran"])
  
  sheetData.push(makeSumRow(' - SPJ - (LS+UP/GU/TU)', globalTotals.ls, globalTotals.gu))
  jTs.forEach(jt => { 
    const isL = jt[1][0] === 'LS'; 
    const a = { lalu: sumJ(filterByJenisTime(pengeluaran, jt[1], false)), ini: sumJ(filterByJenisTime(pengeluaran, jt[1], true)), sd: sumJ(filterByJenisTime(pengeluaran, jt[1], false)) + sumJ(filterByJenisTime(pengeluaran, jt[1], true)) }; 
    sheetData.push(makeSumRow(jt[0], isL ? a : zero, isL ? zero : a)) 
  })
  
  const taxSetoranTotal = { ls: { ...zero }, gu: { ...zero } }
  const taxSetoranRows = taxTypes.map(tt => { 
    const a = getTaxSetoranAgg(tt.regex); 
    taxSetoranTotal.ls.lalu += a.ls.lalu; taxSetoranTotal.ls.ini += a.ls.ini; taxSetoranTotal.ls.sd += a.ls.sd; 
    taxSetoranTotal.gu.lalu += a.gu.lalu; taxSetoranTotal.gu.ini += a.gu.ini; taxSetoranTotal.gu.sd += a.gu.sd; 
    return makeSumRow(tt.label, a.ls, a.gu) 
  })
  sheetData.push(makeSumRow(' - Penyetoran Pajak', taxSetoranTotal.ls, taxSetoranTotal.gu))
  sheetData.push(...taxSetoranRows)
  
  const totalPengeluaranAgg = { 
    ls: { lalu: globalTotals.ls.lalu + taxSetoranTotal.ls.lalu, ini: globalTotals.ls.ini + taxSetoranTotal.ls.ini, sd: globalTotals.ls.sd + taxSetoranTotal.ls.sd }, 
    gu: { lalu: globalTotals.gu.lalu + taxSetoranTotal.gu.lalu, ini: globalTotals.gu.ini + taxSetoranTotal.gu.ini, sd: globalTotals.gu.sd + taxSetoranTotal.gu.sd } 
  }
  sheetData.push(makeSumRow('Jumlah Pengeluaran', totalPengeluaranAgg.ls, totalPengeluaranAgg.gu))

  // --- SALDO KAS ---
  sheetData.push([])
  const saldoKasRiil = (totalPenerimaanAgg.ls.sd + totalPenerimaanAgg.gu.sd) - (totalPengeluaranAgg.ls.sd + totalPengeluaranAgg.gu.sd)
  sheetData.push([
    "Saldo Kas",
    "", "", "", "", "", "", "", "", "", "", "",
    saldoKasRiil,
    ""
  ])

  // --- SIGNATURES ---
  sheetData.push([])
  sheetData.push([])
  const dateStr = `${settings.lokasi || ''}, ${lastDay} ${monthName.toLowerCase()} ${year}`
  sheetData.push([
    "Mengetahui / Menyetujui :", "", "", "", "", "", "", "", "", "",
    dateStr
  ])
  sheetData.push([
    settings.kpa_jabatan || "KUASA PENGGUNA ANGGARAN", "", "", "",
    settings.bp_jabatan || "BENDAHARA PENGELUARAN", "", "", "",
    settings.bpp_jabatan || "BENDAHARA PENGELUARAN PEMBANTU"
  ])
  sheetData.push([])
  sheetData.push([])
  sheetData.push([])
  sheetData.push([
    settings.kpa_nama || "", "", "", "",
    settings.bp_nama || "", "", "", "",
    settings.bpp_nama || ""
  ])
  sheetData.push([
    `NIP. ${settings.kpa_nip || ''}`, "", "", "",
    `NIP. ${settings.bp_nip || ''}`, "", "", "",
    `NIP. ${settings.bpp_nip || ''}`
  ])

  const ws = XLSX.utils.aoa_to_sheet(sheetData)

  // Format cell values to numeric formats with thousand separators
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_ref = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[cell_ref]
      if (!cell) continue

      // Skip title rows and headings
      if (R < 10) continue

      // Format number cells to IDR style without symbol
      if (cell.t === 'n' && cell.v !== 0) {
        cell.z = '#,##0'
      }
    }
  }

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Kode Rekening
    { wch: 50 }, // Uraian
    { wch: 18 }, // Pagu
    { wch: 15 }, // LS Gaji - Lalu
    { wch: 15 }, // LS Gaji - Ini
    { wch: 15 }, // LS Gaji - s.d. Ini
    { wch: 15 }, // LS B&J - Lalu
    { wch: 15 }, // LS B&J - Ini
    { wch: 15 }, // LS B&J - s.d. Ini
    { wch: 15 }, // UP/GU/TU - Lalu
    { wch: 15 }, // UP/GU/TU - Ini
    { wch: 15 }, // UP/GU/TU - s.d. Ini
    { wch: 20 }, // Jumlah Realisasi
    { wch: 20 }  // Sisa Anggaran
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'LPJ Administratif')
  
  const filename = `LPJ_Administratif_${monthName}_${year}.xlsx`
  download(wb, filename)
  return filename
}

export { exportLPJTemplateExcel } from './exportLPJTemplateExcel'

export function exportRealisasiTriwulanExcel(realisasiTriwulan, grandTotalsTriwulan) {
  const data = []
  realisasiTriwulan.forEach(sk => {
    data.push({
      'Kode': sk.kode,
      'Uraian / Nama Kegiatan': sk.nama,
      'Pagu (Rp)': sk.pagu,
      'Triwulan I (Rp)': sk.t1,
      'Triwulan II (Rp)': sk.t2,
      'Triwulan III (Rp)': sk.t3,
      'Triwulan IV (Rp)': sk.t4,
      'Total Realisasi (Rp)': sk.totalReal,
      'Sisa Anggaran (Rp)': sk.sisa,
    })
    ;(sk.rekenings ?? []).forEach(rek => {
      data.push({
        'Kode': `  ${rek.kode}`,
        'Uraian / Nama Kegiatan': `  ${rek.uraian}`,
        'Pagu (Rp)': rek.pagu_anggaran,
        'Triwulan I (Rp)': rek.t1,
        'Triwulan II (Rp)': rek.t2,
        'Triwulan III (Rp)': rek.t3,
        'Triwulan IV (Rp)': rek.t4,
        'Total Realisasi (Rp)': rek.totalReal,
        'Sisa Anggaran (Rp)': rek.sisa,
      })
    })
  })

  // Tambahkan TOTAL keseluruhan
  data.push({
    'Kode': 'TOTAL',
    'Uraian / Nama Kegiatan': '',
    'Pagu (Rp)': grandTotalsTriwulan.pagu,
    'Triwulan I (Rp)': grandTotalsTriwulan.t1,
    'Triwulan II (Rp)': grandTotalsTriwulan.t2,
    'Triwulan III (Rp)': grandTotalsTriwulan.t3,
    'Triwulan IV (Rp)': grandTotalsTriwulan.t4,
    'Total Realisasi (Rp)': grandTotalsTriwulan.totalReal,
    'Sisa Anggaran (Rp)': grandTotalsTriwulan.sisa,
  })

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Realisasi Triwulan')
  download(wb, 'Laporan_Realisasi_Anggaran_Triwulan.xlsx')
}



