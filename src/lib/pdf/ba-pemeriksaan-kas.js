import { formatRupiah } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName, terbilang } from './utils'
import logoJabar from '@/assets/logo-jabar.png'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
    try {
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.background = '#fff'
      container.innerHTML = html
      document.body.appendChild(container)

      const target = container.querySelector('body > *') ? container : container
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'legal' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/png')

      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`BA_Pemeriksaan_Kas_${bulanNama}_${year}.pdf`)
      document.body.removeChild(container)
    } catch (e) {
      alert('Gagal membuat PDF di browser: ' + e.message)
    }
  }
}
