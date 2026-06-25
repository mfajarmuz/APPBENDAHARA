import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName } from './utils'

/**
 * [FITUR: EXPORT PDF - BUKU SIMPANAN BANK (MODERN HTML LAYOUT)]
 * Menghasilkan laporan Buku Simpanan Bank yang presisi sesuai contoh (F4).
 */
export async function exportBukuSimpananBankPdf(rows, monthIndex, year, totalsBulanLalu = { debet: 0, kredit: 0 }, customDate = null) {
  const settings = useStore.getState().settings
  const monthName = getMonthName(monthIndex).toUpperCase()
  let displayDate = new Date(year, monthIndex + 1, 0)
  if (customDate) {
    const parsed = new Date(customDate)
    if (!isNaN(parsed.getTime())) {
      displayDate = parsed
    }
  }
  const fullDisplayDate = displayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  
  // Hitung Totals
  const totalDebetIni = rows.reduce((s, r) => s + (r.debet || 0), 0)
  const totalKreditIni = rows.reduce((s, r) => s + (r.kredit || 0), 0)
  
  const totalDebetLalu = totalsBulanLalu.debet || 0
  const totalKreditLalu = totalsBulanLalu.kredit || 0
  
  const totalDebetSemua = totalDebetIni + totalDebetLalu
  const totalKreditSemua = totalKreditIni + totalKreditLalu
  const saldoAkhir = totalDebetSemua - totalKreditSemua

  let runningSaldo = totalDebetLalu - totalKreditLalu

  // Generate Table Rows
  const tableRows = rows.map((r, i) => {
    runningSaldo += (r.debet || 0) - (r.kredit || 0)
    return `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center">${formatTanggal(r.tanggal)}</td>
        <td class="text-left uraian">${r.uraian || ''}</td>
        <td class="text-right">${r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : ''}</td>
        <td class="text-right">${r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : ''}</td>
        <td class="text-right">${formatRupiah(runningSaldo).replace('Rp', '').trim()}</td>
      </tr>
    `
  }).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @page { size: 215mm 330mm; margin: 10mm 15mm; }
        body { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; margin: 0; padding: 0; line-height: 1.3; }
        .header { text-align: center; margin-bottom: 20px; }
        .header p { margin: 0; font-weight: bold; }
        .header .prov { font-size: 12px; }
        .header .dept { font-size: 13px; }
        .header .title { font-size: 14px; text-decoration: underline; margin-top: 10px; }

        .metadata { margin-bottom: 15px; width: 100%; }
        .metadata td { padding: 1px 0; }
        .metadata .label { width: 180px; }
        .metadata .colon { width: 10px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 4px 6px; word-wrap: break-word; }
        th { font-weight: bold; text-align: center; background-color: #f2f2f2; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .uraian { font-size: 9px; }

        .footer-summary { width: 100%; margin-top: -1px; }
        .footer-summary td { border: 1px solid #000; font-weight: bold; }
        
        .signatures { margin-top: 30px; width: 100%; font-size: 13px; }
        .signatures td { border: none; text-align: center; vertical-align: top; padding-top: 20px; }
        .sign-box { height: 60px; }
        .name { font-weight: bold; text-decoration: underline; text-transform: uppercase; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="header">
        <p class="prov">PEMERINTAH PROVINSI JAWA BARAT</p>
        <p class="dept">BADAN PENDAPATAN DAERAH</p>
        <p class="dept">${(settings.unit_kerja || 'Pusat Pengelolaan Pendapatan Daerah Wilayah Kabupaten Tasikmalaya').toUpperCase()}</p>
        <p class="title">BUKU SIMPANAN / BANK</p>
      </div>

      <table class="metadata" style="border: none;">
        <tr style="border: none;">
          <td class="label" style="border: none;">S K P D</td>
          <td class="colon" style="border: none;">:</td>
          <td style="border: none;">${settings.lokasi_wilayah || 'P3DW KAB TASIKMALAYA'}</td>
        </tr>
        <tr style="border: none;">
          <td class="label" style="border: none;">Kuasa Pengguna Anggaran</td>
          <td class="colon" style="border: none;">:</td>
          <td style="border: none;">${settings.kpa_nama || '-'}</td>
        </tr>
        <tr style="border: none;">
          <td class="label" style="border: none;">Bendahara Pengeluaran Pembantu</td>
          <td class="colon" style="border: none;">:</td>
          <td style="border: none;">${settings.bpp_nama || '-'}</td>
        </tr>
        <tr style="border: none;">
          <td class="label" style="border: none;">Bulan</td>
          <td class="colon" style="border: none;">:</td>
          <td style="border: none;">${monthName} ${year}</td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">NO</th>
            <th style="width: 80px;">TANGGAL</th>
            <th>URAIAN</th>
            <th style="width: 100px;">PENERIMAAN<br>Rp.</th>
            <th style="width: 100px;">PENGELUARAN<br>Rp.</th>
            <th style="width: 110px;">SALDO<br>Rp.</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="5" class="text-right">Saldo Pindahan Bulan Lalu</td>
            <td class="text-right">${formatRupiah(totalDebetLalu - totalKreditLalu).replace('Rp', '').trim()}</td>
          </tr>
          ${tableRows}
          <tr>
            <td colspan="3" class="text-right" style="font-weight: bold;">Jumlah Bulan Ini</td>
            <td class="text-right" style="font-weight: bold;">${formatRupiah(totalDebetIni).replace('Rp', '').trim()}</td>
            <td class="text-right" style="font-weight: bold;">${formatRupiah(totalKreditIni).replace('Rp', '').trim()}</td>
            <td class="text-right"></td>
          </tr>
          <tr>
            <td colspan="3" class="text-right" style="font-weight: bold;">Jumlah bulan lalu</td>
            <td class="text-right" style="font-weight: bold;">${formatRupiah(totalDebetLalu).replace('Rp', '').trim()}</td>
            <td class="text-right" style="font-weight: bold;">${formatRupiah(totalKreditLalu).replace('Rp', '').trim()}</td>
            <td class="text-right"></td>
          </tr>
          <tr>
            <td colspan="3" class="text-right" style="font-weight: bold;">Jumlah s/d bulan ini</td>
            <td class="text-right" style="font-weight: bold;">${formatRupiah(totalDebetSemua).replace('Rp', '').trim()}</td>
            <td class="text-right" style="font-weight: bold;">${formatRupiah(totalKreditSemua).replace('Rp', '').trim()}</td>
            <td class="text-right" style="font-weight: bold; background-color: #f2f2f2;">${formatRupiah(saldoAkhir).replace('Rp', '').trim()}</td>
          </tr>
        </tbody>
      </table>

      <table class="signatures">
        <tr>
          <td style="width: 50%;">
            Mengetahui :<br>
            ${(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN').toUpperCase()}
            <div class="sign-box"></div>
            <p class="name" style="margin-bottom: 0;">${settings.kpa_nama || '-'}</p>
            ${settings.kpa_pangkat || 'Pembina'}<br>
            NIP. ${settings.kpa_nip || '-'}
          </td>
          <td>
            ${settings.lokasi || 'Sukaraja'}, ${fullDisplayDate}<br>
            ${(settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu').toUpperCase()}
            <div class="sign-box"></div>
            <p class="name" style="margin-bottom: 0;">${settings.bpp_nama || '-'}</p>
            ${settings.bpp_pangkat || 'Penata Tingkat I'}<br>
            NIP. ${settings.bpp_nip || '-'}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  if (window.api && window.api.printToPdf) {
    try {
      await window.api.printToPdf({
        html,
        defaultPath: `Buku_Simpanan_Bank_${monthName}_${year}.pdf`,
        pageSize: 'Legal',
        printBackground: true
      })
    } catch (e) {
      alert('Error saat mencetak PDF: ' + e.message)
    }
  } else {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Popup diblokir browser. Izinkan popup untuk preview/cetak PDF.')
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
}
