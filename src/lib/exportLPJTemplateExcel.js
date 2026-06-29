import * as XLSX from 'xlsx'

/**
 * [FITUR: EXPORT EXCEL BERBASIS TEMPLATE DINAS]
 * Membaca berkas template Excel asli dari /template-lpj-periode.xlsx, mengisi sel realisasi
 * transaksi secara terarah, dan membiarkan rumus Excel mengkalkulasi total secara dinamis.
 */
export async function exportLPJTemplateExcel(filterBulan, filterTahun, subKegiatan, pengeluaran, penerimaan, customDate, settings) {
  try {
    // 1. Memuat file template dari folder public
    const response = await fetch('/template-lpj-periode.xlsx')
    if (!response.ok) throw new Error('Gagal memuat berkas template Excel')
    const arrayBuffer = await response.arrayBuffer()
    
    // 2. Membaca workbook menggunakan SheetJS
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const worksheet = workbook.Sheets['LPJ 2026']
    if (!worksheet) throw new Error('Sheet "LPJ 2026" tidak ditemukan dalam template')
    
    // 3. Tanggal-tanggal periode laporan
    const startDate = new Date(filterTahun, filterBulan, 1)
    const endDate = customDate ? new Date(customDate) : new Date(filterTahun, filterBulan + 1, 0)
    endDate.setHours(23, 59, 59, 999)
    const lastDay = endDate.getDate()
    
    // 4. Update Header Identitas di template
    const monthNames = ["JANUARI", "PEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOPEMBER", "DESEMBER"]
    const monthName = monthNames[filterBulan] || ''
    
    const setVal = (cellRef, val, type = 's') => {
      if (!worksheet[cellRef]) worksheet[cellRef] = {}
      worksheet[cellRef].t = type
      worksheet[cellRef].v = val
      // Hapus formula lama jika kita ingin menimpa sel tersebut dengan nilai statis
      if (worksheet[cellRef].f) delete worksheet[cellRef].f
    }
    
    setVal('I7', `: ${settings.unit_kerja || ''}`)
    setVal('I8', `: ${settings.kpa_nama || ''}`)
    setVal('I9', `: ${settings.bpp_nama || ''}`)
    setVal('I10', `: ${filterTahun}`)
    setVal('I11', `: ${monthName} ${filterTahun}`)
    
    // 5. Fungsi pembantu kalkulasi realisasi
    const sumJ = (items) => items.reduce((s, p) => s + p.jumlah, 0)
    
    const filterByTime = (items, timeKey) => items.filter(p => {
      const txDate = new Date(p.tanggal)
      if (timeKey === 'lalu') return txDate < startDate
      if (timeKey === 'ini') return txDate >= startDate && txDate <= endDate
      return false
    })
    
    const getAmt = (items, jenisList, timeKey) => {
      const list = items.filter(p => jenisList.includes(p.jenis))
      return sumJ(filterByTime(list, timeKey))
    }
    
    // 6. Dapatkan range koordinat baris Excel
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    
    // Pindai baris-baris excel untuk mengisi nilai realisasi rekening belanja
    let currentSubKegiatanKode = null
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      // Dapatkan kode di kolom A
      const cellA = worksheet[XLSX.utils.encode_cell({ r: R, c: 0 })]
      const kodeA = cellA ? String(cellA.v).trim() : ''
      
      if (!kodeA) continue
      
      // Kasus A: Baris Sub Kegiatan (Panjang kode sub-kegiatan lengkap, e.g., 5.02.01.1.06.01)
      if (kodeA.split('.').length >= 5) {
        currentSubKegiatanKode = kodeA
        // Untuk baris Sub Kegiatan, kita TIDAK menulis nilai ke kolom-kolom total (L, O, R, S, T)
        // karena baris tersebut sudah menggunakan rumus SUM bawaan excel.
      }
      // Kasus B: Baris Rekening Belanja (A=5, B=1, C=02, D=01, E=01, F=0031)
      else if (kodeA === '5' && currentSubKegiatanKode) {
        const cellB = worksheet[XLSX.utils.encode_cell({ r: R, c: 1 })]
        const cellC = worksheet[XLSX.utils.encode_cell({ r: R, c: 2 })]
        const cellD = worksheet[XLSX.utils.encode_cell({ r: R, c: 3 })]
        const cellE = worksheet[XLSX.utils.encode_cell({ r: R, c: 4 })]
        const cellF = worksheet[XLSX.utils.encode_cell({ r: R, c: 5 })]
        
        const b = cellB ? String(cellB.v).trim() : ''
        const c = cellC ? String(cellC.v).trim() : ''
        const d = cellD ? String(cellD.v).trim() : ''
        const e = cellE ? String(cellE.v).trim() : ''
        const f = cellF ? String(cellF.v).trim() : ''
        
        const fullRekKode = `5.${b}.${c}.${d}.${e}.${f}`
        
        // Cari rekening belanja yang ada di bawah sub-kegiatan aktif
        const sk = subKegiatan.find(item => item.kode === currentSubKegiatanKode)
        if (sk) {
          const rek = (sk.kode_rekening || []).find(r => r.kode === fullRekKode)
          if (rek) {
            const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
            
            // 1. LS Gaji (Biasanya NIHIL)
            const lsGajiLalu = getAmt(rp, ['LS_Gaji'], 'lalu')
            const lsGajiIni = getAmt(rp, ['LS_Gaji'], 'ini')
            
            // 2. LS Barang & Jasa
            const lsBjLalu = getAmt(rp, ['LS'], 'lalu')
            const lsBjIni = getAmt(rp, ['LS'], 'ini')
            
            // 3. UP/GU/TU/KKPD
            const guLalu = getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'lalu')
            const guIni = getAmt(rp, ['GU', 'UP', 'TU', 'KKPD'], 'ini')
            
            // Tulis nilai dasar ke koordinat kolom Excel (J, K, M, N, P, Q)
            // J: LS Gaji Lalu, K: LS Gaji Ini
            setVal(XLSX.utils.encode_cell({ r: R, c: 9 }), lsGajiLalu, 'n')
            setVal(XLSX.utils.encode_cell({ r: R, c: 10 }), lsGajiIni, 'n')
            
            // M: LS B&J Lalu, N: LS B&J Ini
            setVal(XLSX.utils.encode_cell({ r: R, c: 12 }), lsBjLalu, 'n')
            setVal(XLSX.utils.encode_cell({ r: R, c: 13 }), lsBjIni, 'n')
            
            // P: UP/GU/TU Lalu, Q: UP/GU/TU Ini
            setVal(XLSX.utils.encode_cell({ r: R, c: 15 }), guLalu, 'n')
            setVal(XLSX.utils.encode_cell({ r: R, c: 16 }), guIni, 'n')
          }
        }
      }
    }
    
    // 7. Hitung Rekapitulasi Penerimaan & Pengeluaran (Baris 81 s/d 112)
    const zero = { lalu: 0, ini: 0, sd: 0 }
    
    const sumP = (items, jenisList, isIni) => sumJ(
      items.filter(p => {
        const d = new Date(p.tanggal); const m = d.getMonth(); const y = d.getFullYear()
        const matchesJenis = jenisList.includes(p.jenis)
        if (isIni) {
          return matchesJenis && (y === filterTahun && m === filterBulan && d <= endDate)
        }
        return matchesJenis && (y < filterTahun || (y === filterTahun && m < filterBulan))
      })
    )
    
    const getSumObj = (items, jenisList) => {
      const lalu = sumP(items, jenisList, false)
      const ini = sumP(items, jenisList, true)
      return { lalu, ini, sd: lalu + ini }
    }
    
    const isTaxFromLS = (p) => (
      p.jenis === 'Pajak LS' || p.jenis === 'LS' || 
      (!!p.no_sp2d && p.no_sp2d !== '-' && !p.no_sp2d.startsWith('BPP-')) || 
      (!!p.nomor_ls && p.nomor_ls !== '-' && !p.nomor_ls.startsWith('BPP-'))
    )
    
    const getTaxAgg = (regex) => {
      const items = penerimaan.filter(p => (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(p.keterangan || ''))
      const lsItems = items.filter(p => isTaxFromLS(p))
      const guItems = items.filter(p => !isTaxFromLS(p))
      return {
        ls: { lalu: sumP(lsItems, ['Pajak', 'Pajak LS'], false), ini: sumP(lsItems, ['Pajak', 'Pajak LS'], true), sd: sumP(lsItems, ['Pajak', 'Pajak LS'], false) + sumP(lsItems, ['Pajak', 'Pajak LS'], true) },
        gu: { lalu: sumP(guItems, ['Pajak', 'Pajak LS'], false), ini: sumP(guItems, ['Pajak', 'Pajak LS'], true), sd: sumP(guItems, ['Pajak', 'Pajak LS'], false) + sumP(guItems, ['Pajak', 'Pajak LS'], true) }
      }
    }
    
    const getTaxSetoranAgg = (regex) => {
      const items = pengeluaran.filter(p => {
        const u = p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || ''
        return (u.startsWith('Setoran') || u.startsWith('Dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(u)
      })
      const lsItems = items.filter(p => isTaxFromLS(p))
      const guItems = items.filter(p => !isTaxFromLS(p))
      const jl = ['GU', 'UP', 'TU', 'KKPD', 'Pajak', 'Pajak LS', 'LS']
      return {
        ls: { lalu: sumP(lsItems, jl, false), ini: sumP(lsItems, jl, true), sd: sumP(lsItems, jl, false) + sumP(lsItems, jl, true) },
        gu: { lalu: sumP(guItems, jl, false), ini: sumP(guItems, jl, true), sd: sumP(guItems, jl, false) + sumP(guItems, jl, true) }
      }
    }
    
    // Hitung aggregat utama
    const penLS = getSumObj(penerimaan, ['LS'])
    const penGU = getSumObj(penerimaan, ['UP', 'GU', 'TU', 'KKPD'])
    
    const writeSumRow = (R, lsAgg, guAgg) => {
      // J: LS Gaji Lalu, K: LS Gaji Ini, L: LS Gaji s/d Ini (Kombinasikan ke LS B&J jika non-gaji)
      // M: LS B&J Lalu, N: LS B&J Ini, O: LS B&J s/d Ini
      // P: UP/GU/TU Lalu, Q: UP/GU/TU Ini, R: UP/GU/TU s/d Ini
      // S: Total
      setVal(XLSX.utils.encode_cell({ r: R, c: 9 }), 0, 'n')
      setVal(XLSX.utils.encode_cell({ r: R, c: 10 }), 0, 'n')
      setVal(XLSX.utils.encode_cell({ r: R, c: 11 }), 0, 'n')
      
      setVal(XLSX.utils.encode_cell({ r: R, c: 12 }), lsAgg.lalu, 'n')
      setVal(XLSX.utils.encode_cell({ r: R, c: 13 }), lsAgg.ini, 'n')
      setVal(XLSX.utils.encode_cell({ r: R, c: 14 }), lsAgg.sd, 'n')
      
      setVal(XLSX.utils.encode_cell({ r: R, c: 15 }), guAgg.lalu, 'n')
      setVal(XLSX.utils.encode_cell({ r: R, c: 16 }), guAgg.ini, 'n')
      setVal(XLSX.utils.encode_cell({ r: R, c: 17 }), guAgg.sd, 'n')
      
      setVal(XLSX.utils.encode_cell({ r: R, c: 18 }), lsAgg.sd + guAgg.sd, 'n')
    }
    
    // --- PENERIMAAN KAS ---
    // Baris 82: SPJ (LS + UP/GU/TU)
    writeSumRow(81, penLS, penGU)
    
    // Baris 83-87: UP, GU, TU, LS, KKPD
    const upAgg = getSumObj(penerimaan, ['UP'])
    const guAgg = getSumObj(penerimaan, ['GU'])
    const tuAgg = getSumObj(penerimaan, ['TU'])
    const kkpdAgg = getSumObj(penerimaan, ['KKPD'])
    
    writeSumRow(82, zero, upAgg)
    writeSumRow(83, zero, guAgg)
    writeSumRow(84, zero, tuAgg)
    writeSumRow(85, penLS, zero)
    writeSumRow(86, zero, kkpdAgg)
    
    // Baris 88: Potongan Pajak
    const taxTypes = [
      { regex: /PPN/i },
      { regex: /PPh\s*21/i },
      { regex: /PPh\s*22/i },
      { regex: /PPh\s*23/i },
      { regex: /PPh\s*(?:Pasal\s*)?4/i }
    ]
    
    const taxPotonganTotal = { ls: { ...zero }, gu: { ...zero } }
    
    // PPN, PPh 21, PPh 22, PPh 23, PPh 4 (Baris 89 s/d 93)
    taxTypes.forEach((tt, idx) => {
      const a = getTaxAgg(tt.regex)
      taxPotonganTotal.ls.lalu += a.ls.lalu; taxPotonganTotal.ls.ini += a.ls.ini; taxPotonganTotal.ls.sd += a.ls.sd
      taxPotonganTotal.gu.lalu += a.gu.lalu; taxPotonganTotal.gu.ini += a.gu.ini; taxPotonganTotal.gu.sd += a.gu.sd
      writeSumRow(88 + idx, a.ls, a.gu)
    })
    
    // Baris 88: Potongan Pajak (Induk)
    writeSumRow(87, taxPotonganTotal.ls, taxPotonganTotal.gu)
    
    // Baris 96: Jumlah Penerimaan
    const totalPenerimaanAgg = {
      ls: { lalu: penLS.lalu + taxPotonganTotal.ls.lalu, ini: penLS.ini + taxPotonganTotal.ls.ini, sd: penLS.sd + taxPotonganTotal.ls.sd },
      gu: { lalu: penGU.lalu + taxPotonganTotal.gu.lalu, ini: penGU.ini + taxPotonganTotal.gu.ini, sd: penGU.sd + taxPotonganTotal.gu.sd }
    }
    writeSumRow(95, totalPenerimaanAgg.ls, totalPenerimaanAgg.gu)
    
    // --- PENGELUARAN KAS ---
    const pengLS = getSumObj(pengeluaran, ['LS'])
    const pengGU = getSumObj(pengeluaran, ['GU', 'UP', 'TU', 'KKPD'])
    
    // Baris 98: SPJ (LS + UP/GU/TU)
    writeSumRow(97, pengLS, pengGU)
    
    // Baris 99-102: UP, GU, TU, LS
    const pengUpAgg = getSumObj(pengeluaran, ['UP'])
    const pengGuAgg = getSumObj(pengeluaran, ['GU'])
    const pengTuAgg = getSumObj(pengeluaran, ['TU'])
    
    writeSumRow(98, zero, pengUpAgg)
    writeSumRow(99, zero, pengGuAgg)
    writeSumRow(100, zero, pengTuAgg)
    writeSumRow(101, pengLS, zero)
    
    // Baris 103-108: Penyetoran Pajak
    const taxSetoranTotal = { ls: { ...zero }, gu: { ...zero } }
    taxTypes.forEach((tt, idx) => {
      const a = getTaxSetoranAgg(tt.regex)
      taxSetoranTotal.ls.lalu += a.ls.lalu; taxSetoranTotal.ls.ini += a.ls.ini; taxSetoranTotal.ls.sd += a.ls.sd
      taxSetoranTotal.gu.lalu += a.gu.lalu; taxSetoranTotal.gu.ini += a.gu.ini; taxSetoranTotal.gu.sd += a.gu.sd
      writeSumRow(103 + idx, a.ls, a.gu)
    })
    
    // Baris 103: Penyetoran Pajak (Induk)
    writeSumRow(102, taxSetoranTotal.ls, taxSetoranTotal.gu)
    
    // Baris 111: Jumlah Pengeluaran
    const totalPengeluaranAgg = {
      ls: { lalu: pengLS.lalu + taxSetoranTotal.ls.lalu, ini: pengLS.ini + taxSetoranTotal.ls.ini, sd: pengLS.sd + taxSetoranTotal.ls.sd },
      gu: { lalu: pengGU.lalu + taxSetoranTotal.gu.lalu, ini: pengGU.ini + taxSetoranTotal.gu.ini, sd: pengGU.sd + taxSetoranTotal.gu.sd }
    }
    writeSumRow(110, totalPengeluaranAgg.ls, totalPengeluaranAgg.gu)
    
    // Baris 112: Saldo Kas (Kolom S / c: 18)
    const saldoKasRiil = (totalPenerimaanAgg.ls.sd + totalPenerimaanAgg.gu.sd) - (totalPengeluaranAgg.ls.sd + totalPengeluaranAgg.gu.sd)
    setVal('S112', saldoKasRiil, 'n')
    
    // --- BLOK TANDA TANGAN (Baris 114 s/d 121) ---
    // Baris 114: R114 (Tanggal Laporan)
    const dateStr = `${settings.lokasi || 'Sukaraja'}, ${lastDay} ${monthName.charAt(0) + monthName.slice(1).toLowerCase()} ${filterTahun}`
    setVal('R114', dateStr, 's')
    
    // Baris 115: Jabatan
    setVal('G115', settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN,')
    setVal('L115', settings.bp_jabatan ? settings.bp_jabatan + ' ,' : 'BENDAHARA PENGELUARAN ,')
    setVal('R115', settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU,')
    
    // Baris 119: Nama Pejabat
    setVal('G119', settings.kpa_nama || '')
    setVal('M119', settings.bp_nama || '')
    setVal('R119', settings.bpp_nama || '')
    
    // Baris 121: NIP
    setVal('G121', settings.kpa_nip ? `NIP. ${settings.kpa_nip}` : '')
    setVal('M121', settings.bp_nip ? `NIP. ${settings.bp_nip}` : '')
    setVal('R121', settings.bpp_nip ? `NIP. ${settings.bpp_nip}` : '')
    
    // 8. Tulis workbook baru dan download
    const filename = `LPJ_Realisasi_Template_${monthName}_${filterTahun}.xlsx`
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    return { success: true }
  } catch (err) {
    console.error('Error exporting template excel:', err)
    alert('Gagal mengekspor template Excel: ' + err.message)
    return { success: false, error: err.message }
  }
}
