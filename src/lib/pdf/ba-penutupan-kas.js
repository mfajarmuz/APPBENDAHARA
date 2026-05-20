import { useStore } from '@/store/useStore'
import logoJabar from '@/assets/logo-jabar.png'
import { formatRupiah } from '../format'

/**
 * [FITUR: EXPORT PDF - BERITA ACARA PENUTUPAN KAS]
 */
export const exportBAPenutupanKasPdf = async (data, settings, customDate = null) => {
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
          const MAX_WIDTH = 300
          const scale = MAX_WIDTH / img.width
          canvas.width = MAX_WIDTH
          canvas.height = img.height * scale

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/png', 0.8))
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
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const monthName = months[data.month - 1]
  const year = data.year
  
  const dateObj = customDate ? new Date(customDate) : (settings.ba_tanggal ? new Date(settings.ba_tanggal) : new Date(year, data.month, 0))
  const fullDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`

  const fmt = (val) => {
    if (!val || val === 0) return '-'
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(val)
  }
  const saldoAwal = (data.saldo || 0) - (data.totalDebetIni || 0) + (data.totalKreditIni || 0)
  
  const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 215mm 330mm;
          margin: 0.3cm 1.5cm 1cm 1.5cm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.3;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 0;
        }
        p { margin: 0; padding: 0; }
        .kop-table {
          width: 100%;
          border-bottom: 3.5px solid #000;
          margin-bottom: 1.5px;
          padding-bottom: 3px;
        }
        .kop-line-2 {
          border-bottom: 1px solid #000;
          margin-bottom: 15px;
        }
        .kop-logo {
          width: 104px;
          vertical-align: middle;
        }
        .kop-text {
          text-align: center;
          vertical-align: middle;
        }
        .kop-text p {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        .judul {
          text-align: center;
          margin-bottom: 25px;
        }
        .judul h3 {
          margin: 0;
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .judul p {
          margin: 0;
          font-weight: bold;
          font-size: 11pt;
        }
        .address-block {
          margin-bottom: 25px;
        }
        .opening-text {
          text-align: justify;
          margin-bottom: 20px;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 5px;
          display: block;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
          margin-left: 25px;
        }
        .data-table td {
          padding: 1px 0;
          vertical-align: top;
        }
        .col-num { width: 45px; }
        .col-label { width: 320px; }
        .col-curr { width: 40px; text-align: left; }
        .col-val, .col-val-line {
          width: 155px;
          text-align: right;
          white-space: nowrap;
        }
        .col-val-line { border-bottom: 1px solid #000; }
        
        .keterangan-detail {
          margin-left: 25px;
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .signature-table {
          width: 100%;
          margin-top: 40px;
        }
        .signature-table td {
          width: 50%;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <table class="kop-table">
        <tr>
          <td width="117" style="padding-left: 2cm;">
            ${logoBase64 ? `<img src="${logoBase64}" class="kop-logo" />` : ''}
          </td>
          <td class="kop-text">
            <p style="font-size: 14pt;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
            <p style="font-size: 16pt; font-weight: bold;">BADAN PENDAPATAN DAERAH</p>
            <p style="font-size: 15pt; font-weight: bold;">PUSAT PENGELOLAAN PENDAPATAN DAERAH</p>
            <p style="font-size: 15pt; font-weight: bold;">WILAYAH ${(settings.lokasi_wilayah || 'KABUPATEN TASIKMALAYA').toUpperCase()}</p>
            <p style="font-size: 11pt; margin-top: 3px; font-weight: normal;">${settings.alamat_kantor || 'Jalan Raya Cikatomas Sukaraja Telepon (0265) 565149'}</p>
            <p style="font-size: 11pt; font-weight: normal;">${settings.fax_email || 'Faksimil : (0265) 566917 E-mail : p3dwkabtsm@gmail.com'}</p>
            <p style="font-size: 11pt; font-weight: normal;">${settings.kode_pos_line || 'Kabupaten Tasikmalaya – 46183'}</p>
          </td>
        </tr>
      </table>
      <div class="kop-line-2"></div>

      <div class="judul" style="margin-top: 10px; margin-bottom: 25px;">
        <h3 style="text-transform: uppercase; margin: 0;">BERITA ACARA LAPORAN PENUTUPAN KAS</h3>
        <div style="font-weight: bold; font-size: 11pt;">Bulan : ${monthName} ${year}</div>
      </div>

      <div class="address-block">
        Kepada Yth.<br>
        Kepala Pusat Pengelolaan Pendapatan Daerah Wilayah ${settings.lokasi_wilayah || 'Kabupaten Tasikmalaya'}<br>
        Selaku <br>
        Kuasa Pengguna Anggaran<br>
        Di Tempat
      </div>

      <p class="opening-text">
        Dengan memperhatikan Perturan Gubernur Jawa Barat Nomor 5 Tahun 2017 tentang Perubahan Atas Peraturan Gubernur Jawa Barat Nomor 3 Tahun 2016 Tentang Sistem dan Prosedur Pengelolaan keuangan Daerah Provinsi Jawa Barat. Bersama ini kami sampaikan Laporan Penutupan Kas Bulanan yang terdapat di Bendahara Pengeluaran Badan Pendapatan Daerah adalah sejumlah ${fmt(data.saldo)} dengan perincian sebagai berikut :
      </p>

      <div>
        <span class="section-title">A. &nbsp;&nbsp;&nbsp; Kas di Bendahara Pengeluaran</span>
        <table class="data-table">
          <tr><td class="col-num">A.1</td><td class="col-label">Saldo awal bulan tanggal 01 ${monthName} ${year}</td><td class="col-curr">Rp</td><td class="col-val">-</td></tr>
          <tr><td>A.2</td><td>Jumlah Penerimaan</td><td class="col-curr">Rp</td><td class="col-val">-</td></tr>
          <tr><td>A.3</td><td>Jumlah Pengeluaran</td><td class="col-curr">Rp</td><td class="col-val-line">-</td></tr>
          <tr><td style="font-weight: bold;">A.4</td><td style="font-weight: bold;">Saldo akhir bulan tanggal ${fullDate}</td><td style="font-weight: bold;" class="col-curr">Rp</td><td style="font-weight: bold;" class="col-val">-</td></tr>
        </table>
        <div class="keterangan-detail">
          Saldo akhir bulan tanggal ${fullDate} Terdiri dari saldo di kas tunai sebesar Rp. 0,00 dan saldo bank Sebesar Rp. 0,00
        </div>
      </div>

      <div>
        <span class="section-title">B. &nbsp;&nbsp;&nbsp; Kas di Bendahara Pengeluaran Pembantu</span>
        <table class="data-table">
          <tr><td class="col-num">B.1</td><td class="col-label">Saldo awal bulan tanggal 01 ${monthName} ${year}</td><td class="col-curr">Rp</td><td class="col-val">${fmt(saldoAwal)}</td></tr>
          <tr><td>B.2</td><td>Jumlah Penerimaan</td><td class="col-curr">Rp</td><td class="col-val">${fmt(data.totalDebetIni)}</td></tr>
          <tr><td>B.3</td><td>Jumlah Pengeluaran</td><td class="col-curr">Rp</td><td class="col-val-line">${fmt(data.totalKreditIni)}</td></tr>
          <tr><td style="font-weight: bold;">B.4</td><td style="font-weight: bold;">Saldo akhir bulan tanggal ${fullDate}</td><td style="font-weight: bold;" class="col-curr">Rp</td><td style="font-weight: bold;" class="col-val">${fmt(data.saldo)}</td></tr>
        </table>
        <div class="keterangan-detail">
          Saldo akhir tanggal bulan : ${fullDate} Terdiri dari saldo di kas tunai sebesar Rp. 0,00 dan saldo bank Sebesar Rp. ${fmt(data.saldo)}
        </div>
      </div>

      <div>
        <span class="section-title">C. &nbsp;&nbsp;&nbsp; Rekapitulasi Posisi Kas di Bendahara Pengeluaran</span>
        <table class="data-table">
          <tr><td class="col-num">C.1</td><td class="col-label">Saldo Kas Tunai</td><td class="col-curr">Rp</td><td class="col-val">-</td></tr>
          <tr><td>C.2</td><td>Saldo Bank</td><td class="col-curr">Rp</td><td class="col-val-line">-</td></tr>
          <tr><td style="font-weight: bold;">C.3</td><td style="font-weight: bold;">Saldo Total</td><td style="font-weight: bold;" class="col-curr">Rp</td><td style="font-weight: bold;" class="col-val">-</td></tr>
        </table>
      </div>

      <table class="signature-table">
        <tr>
          <td width="50%"></td>
          <td>
            <br>
            Bendahara Pengeluaran Pembantu
            <br><br><br><br><br>
            <strong><u>${settings.bpp_nama || ''}</u></strong><br>
            NIP. ${settings.bpp_nip || ''}
          </td>
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
