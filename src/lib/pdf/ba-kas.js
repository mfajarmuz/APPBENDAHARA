import { formatRupiah, formatTanggal } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName, terbilang } from './utils'
import logoJabar from '@/assets/logo-jabar.png'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * [FITUR: EXPORT PDF - BERITA ACARA PEMERIKSAAN KAS]
 * Menghasilkan PDF Berita Acara Pemeriksaan Kas (BA Kas).
 * Mendukung rendering HTML-to-PDF melalui Electron printToPDF untuk hasil presisi tinggi.
 */
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
          resolve(canvas.toDataURL('image/png', 0.8)) // Compressing as well
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

  const logoBase64 = await getBase64(logoJabar)

  const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 215mm 330mm;
          margin: 0.3cm 0.5cm 0.5cm 0.5cm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          width: 210mm;
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.35;
          color: black;
          margin: 0;
          padding: 0;
        }
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

      <div style="padding: 0 1.5cm;">
        <div class="judul">
          <h3>BERITA ACARA PEMERIKSAAN KAS</h3>
          <p>BULAN ${bulanNama.toUpperCase()} ${year}</p>
          <p>NOMOR : ${settings.ba_nomor || '_____/KU.03.01-TU'}</p>
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
          Yang dengan Surat Keputusan Gubernur Provinsi Jawa Barat Nomor : ${settings.ba_sk_bpp || '89/KU.12.01.01/Kep.BPKAD/2024'} ditugaskan menjadi <strong>Bendahara Pengeluaran Pembantu Pusat Pengelolaan Pendapatan Daerah Wilayah ${(settings.lokasi_wilayah || 'Kabupaten Tasikmalaya').replace(/bw/g, l => l.toUpperCase())}</strong>
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

        <table class="tanda-tangan" style="margin-top: 30px;">
          <tr>
            <td style="text-align: left; padding-left: 50px;"></td>
            <td style="text-align: center;">${settings.lokasi || 'Sukaraja'}, ${lastDay} ${bulanNama} ${year}<br>Pemeriksa,</td>
          </tr>
          <tr>
            <td style="padding-top: 5px; font-weight: bold; text-align: center;">${(settings.bpp_jabatan || 'BENDAHARA PENGELUARAN PEMBANTU').toUpperCase()},</td>
            <td style="padding-top: 5px; font-weight: bold; text-align: center;">${(settings.kpa_jabatan || 'KUASA PENGGUNA ANGGARAN').toUpperCase()},</td>
          </tr>
          <tr>
            <td style="padding-top: 60px; font-weight: bold; text-align: center;"><u>${(settings.bpp_nama || '').toUpperCase()}</u></td>
            <td style="padding-top: 60px; font-weight: bold; text-align: center;"><u>${(settings.kpa_nama || '').toUpperCase()}</u></td>
          </tr>
          <tr>
            <td style="text-align: center;">${settings.bpp_pangkat || 'Penata Tingkat I'}<br>NIP. ${settings.bpp_nip || ''}</td>
            <td style="text-align: center;">${settings.kpa_pangkat || 'Pembina'}<br>NIP. ${settings.kpa_nip || ''}</td>
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
        // Berhasil disimpan
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

/**
 * [FITUR: EXPORT PDF - BERITA ACARA PENUTUPAN KAS]
 */
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
  
  const dateObj = settings.ba_tanggal ? new Date(settings.ba_tanggal) : new Date(year, data.month, 0)
  const fullDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`

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
          margin: 0.3cm 0.5cm 0.5cm 0.5cm;
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
          <tr><td>2.</td><td>Jumlah Penerimaan s.d ${data.lastDay || 31} ${monthName}</td><td>:</td><td>Rp.</td><td class="col-val">Nihil</td></tr>
          <tr><td>3.</td><td>Jumlah Pengeluaran s.d ${data.lastDay || 31} ${monthName}</td><td>:</td><td>Rp.</td><td class="col-val">Nihil</td></tr>
          <tr><td>4.</td><td>Saldo akhir bulan</td><td>:</td><td>Rp.</td><td class="col-val">Nihil</td></tr>
        </table>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="text-decoration: underline;">B. Kas di Bendahara Pengeluaran Pembantu</strong>
        <table class="data-tbl">
          <tr><td class="col-num">1.</td><td class="col-label">Saldo awal bulan ${monthName} ${year}</td><td class="col-sep">:</td><td class="col-curr">Rp.</td><td class="col-val">${fmt(saldoAwal)}</td></tr>
          <tr><td>2.</td><td>Jumlah Penerimaan s.d ${data.lastDay || 31} ${monthName} ${year}</td><td>:</td><td>Rp.</td><td class="col-val">${fmt(data.totalDebetIni)}</td></tr>
          <tr><td>3.</td><td>Jumlah Pengeluaran s.d ${data.lastDay || 31} ${monthName} ${year}</td><td>:</td><td>Rp.</td><td class="col-val">${fmt(data.totalKreditIni)}</td></tr>
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

function drawNPD(doc, item, subKegiatan, pengeluaran, bkuNumber = '-') {
  const settings = useStore.getState().settings
  const subK = item.sub_kegiatan; const rek = item.kode_rekening; const keg = subK?.kegiatan; const prog = keg?.program
  const progKode = prog?.kode || (keg?.kode ? keg.kode.split('.').slice(0, 3).join('.') : '')
  const progNama = prog?.nama || (keg?.nama ? keg.nama.replace(/^(Kegiatan|Sub Kegiatan|SubKegiatan)\s+/i, '').toUpperCase().replace(/^/i, 'PROGRAM ') : '')
  const relatedPengeluaran = pengeluaran.filter(p => p.kode_rekening_id === item.kode_rekening_id).sort((a, b) => { const d = new Date(a.tanggal) - new Date(b.tanggal); return d !== 0 ? d : String(a.id).localeCompare(String(b.id)) })
  const currentIndex = relatedPengeluaran.findIndex(p => p.id === item.id); const pastAndCurrent = currentIndex !== -1 ? relatedPengeluaran.slice(0, currentIndex + 1) : [item]
  const akumulasiBelanja = pastAndCurrent.reduce((s, p) => s + p.jumlah, 0); const belanjaSekarang = item.jumlah; const paguAnggaran = rek?.pagu_anggaran || 0; const sisaAnggaran = paguAnggaran - akumulasiBelanja
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PEMERINTAH PROVINSI JAWA BARAT', 105, 15, { align: 'center' }); doc.text('Badan Pendapatan Daerah', 105, 20, { align: 'center' }); doc.text('Nota Pencairan Dana (NPD)', 105, 25, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); let currentY = 35
  const labels = [['No', `: ${bkuNumber}`], ['Tanggal', `: ${formatTanggal(item.tanggal)}`], ['Jenis NPD', ': Tanpa Panjar'], ['PPTK', `: ${settings.pptk_nama}`], ['Program', `: ${prog?.kode || ''} - ${prog?.nama || ''}`], ['Kegiatan', `: ${keg?.kode || ''} - ${keg?.nama || ''}`], ['Sub Kegiatan', `: ${subK?.kode || ''} - ${subK?.nama || ''}`], ['', ''], ['No. DPA', ': -'], ['Tahun Anggaran', `: ${new Date(item.tanggal).getFullYear()}`], ['Rincian Belanja', ':']]
  labels.forEach(([label, value]) => { if (label) { doc.setFont('helvetica', 'bold'); doc.text(String(label || ''), 14, currentY) } doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(String(value || ''), 150); doc.text(lines, 45, currentY); currentY += (lines.length > 1 ? lines.length * 4.5 : 5) })
  autoTable(doc, {
    startY: currentY + 2, head: [[{ content: 'No' }, { content: 'Kode - Nama Rekening' }, { content: 'Anggaran' }, { content: 'Belanja' }, { content: 'AkumulasinBelanja' }, { content: 'Sisa Anggaran' }]], body: [[1, `${rek?.kode || ''} - ${rek?.uraian || ''}`, formatRupiah(paguAnggaran).replace('Rp', '').trim(), formatRupiah(belanjaSekarang).replace('Rp', '').trim(), formatRupiah(akumulasiBelanja).replace('Rp', '').trim(), formatRupiah(sisaAnggaran).replace('Rp', '').trim()]], foot: [[{ content: 'Jumlah', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, { content: formatRupiah(paguAnggaran).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(belanjaSekarang).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(akumulasiBelanja).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatRupiah(sisaAnggaran).replace('Rp', '').trim(), styles: { halign: 'right', fontStyle: 'bold' } }]], theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'middle' }, headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold' }, footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }, columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 25, halign: 'right' }, 3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } }
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
