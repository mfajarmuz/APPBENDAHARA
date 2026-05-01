// src/lib/export-excel.js
import * as XLSX from 'xlsx'
import { formatTanggal } from './format'

function download(wb, filename) {
  XLSX.writeFile(wb, filename)
}

export function exportBKUExcel(rows) {
  const data = rows.map((r, i) => ({
    No: i + 1,
    Tanggal: formatTanggal(r.tanggal),
    'No. Bukti': r.no_bukti,
    Uraian: r.uraian,
    Debet: r.debet,
    Kredit: r.kredit,
  }))
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
