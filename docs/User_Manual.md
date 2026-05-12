# Panduan Pengoperasian BendaharaApp
**UPTD Bapenda Kab. Tasikmalaya TA 2026**

## 1. Pendahuluan
BendaharaApp adalah solusi manajemen keuangan terpadu yang dirancang khusus untuk mendukung operasional Bendahara di UPTD Bapenda Kabupaten Tasikmalaya pada Tahun Anggaran 2026. Aplikasi ini mengotomatisasi pencatatan anggaran (DPA), transaksi penerimaan, pengeluaran, perhitungan pajak, hingga pembuatan laporan pertanggungjawaban (LPJ).

---

## 2. Mulai Menggunakan

### Login Keamanan
Saat pertama kali membuka aplikasi, Anda akan diminta untuk memasukkan kata sandi akses:
- **Password Default**: `p3dwkabtasikmalaya`

### Pengaturan Profil (Penting!)
Sebelum melakukan transaksi atau mencetak laporan, pastikan profil instansi sudah dikonfigurasi:
1. Klik menu **Settings** di sidebar.
2. Isi Nama Instansi, Nama Bendahara, NIP, Nama Kepala UPTD, dan NIP Kepala.
3. Klik **Simpan**.
*Data ini akan digunakan secara otomatis sebagai header dan tanda tangan pada laporan PDF (NPD, BKU, dll).*

---

## 3. Dashboard
Halaman utama memberikan gambaran cepat (High-Level Summary) tentang kondisi keuangan Anda:
- **Total Pagu**: Anggaran keseluruhan yang dialokasikan dalam DPA.
- **Total Realisasi**: Dana yang sudah dibelanjakan.
- **Sisa Anggaran**: Dana yang masih tersedia.
- **Persentase Serapan**: Grafik visual progres penyerapan anggaran per bulan.

---

## 4. Manajemen Anggaran (DPA)
Menu **Anggaran** digunakan untuk menyusun struktur DPA secara hirarkis:
1. **Program**: Level tertinggi anggaran.
2. **Kegiatan**: Detail dari program.
3. **Sub Kegiatan**: Detail dari kegiatan.
4. **Kode Rekening**: Akun belanja spesifik (misal: Alat Tulis Kantor, Listrik).
5. **Pagu**: Tetapkan nominal anggaran pada level Kode Rekening. Aplikasi akan mencegah pengeluaran yang melebihi pagu ini.

---

## 5. Transaksi Penerimaan
Catat dana yang masuk ke rekening kas UPTD:
1. Buka menu **Penerimaan**.
2. Masukkan tanggal, nomor bukti (LS/Transfer), deskripsi, dan jumlah dana.
3. Dana yang dicatat di sini akan menambah **Saldo Kas** yang tersedia untuk dibelanjakan.

---

## 6. Transaksi Pengeluaran
Menu ini adalah jantung dari aktivitas harian Bendahara.

### Input Harian
1. Pilih **Sub Kegiatan** dan **Kode Rekening** yang relevan.
2. Masukkan deskripsi belanja, jumlah (nilai bruto), dan pilih metode pembayaran.

### Mekanisme Pembayaran (LS vs GU)
- **LS (Langsung)**: Pembayaran yang dibayarkan langsung dari Kas Daerah ke rekanan. Dalam aplikasi, LS akan mengurangi Pagu Anggaran tetapi tidak memengaruhi Saldo Kas tunai Bendahara.
- **GU (Ganti Uang)**: Pembayaran menggunakan uang persediaan yang ada di tangan Bendahara. GU akan mengurangi Pagu Anggaran DAN mengurangi Saldo Kas Bendahara.

### Import Excel
Jika Anda memiliki data transaksi dalam jumlah banyak:
1. Klik tombol **Unduh Template** (mengacu pada `public/template-pengeluaran.xlsx`).
2. Isi data sesuai format di Excel.
3. Klik **Import Excel** dan pilih file tersebut.

### Cetak NPD
Setelah input pengeluaran, Anda dapat mencetak **Nota Permintaan Dana (NPD)** dalam format PDF sebagai dokumen pendukung pengajuan dana.

---

## 7. Kalkulator Pajak (Smart Workflow)
BendaharaApp dilengkapi dengan kalkulator pajak pintar yang memahami aturan perpajakan Indonesia:
1. Saat menginput pengeluaran, klik tombol **Kalkulator Pajak**.
2. Masukkan nilai bruto transaksi.
3. Centang jenis pajak yang berlaku:
   - **PPN 11%**: Untuk belanja barang/jasa dari PKP.
   - **PPh 21**: Untuk honorarium/gaji.
   - **PPh 22**: Untuk belanja barang.
   - **PPh 23**: Untuk jasa.
   - **PPh 4 ayat 2**: Untuk sewa gedung atau jasa konstruksi.
4. **Otomatisasi**: Sistem akan menghitung potongan pajak secara presisi dan mencatatnya sebagai transaksi "Pungut" dan "Setor" di BKU agar saldo kas tetap sinkron.

---

## 8. Laporan (LPJ)
Hasilkan laporan formal dalam hitungan detik di menu **Laporan**:
1. **BKU (Buku Kas Umum)**: Rekapitulasi kronologis semua masuk dan keluar.
2. **Buku Pembantu**: Tersedia Buku Pembantu Kas Tunai, Bank, dan Pajak.
3. **LRA (Laporan Realisasi Anggaran)**: Membandingkan Pagu vs Realisasi per kode rekening.

**Fitur Laporan:**
- **Filter Periode**: Pilih bulan atau rentang tanggal tertentu.
- **Export**: Unduh laporan dalam format **PDF** (untuk arsip fisik) atau **Excel** (untuk pengolahan data lanjut).

---

## 9. Asisten Telegram
Untuk memudahkan pimpinan atau Bendahara memantau data tanpa membuka aplikasi:
1. Hubungkan bot Telegram instansi.
2. Kirim perintah seperti `/status` untuk melihat sisa pagu.
3. Bot ini berfungsi sebagai asisten konsultasi data jarak jauh yang aman (hanya untuk nomor telepon yang terdaftar di whitelist).

---
*BendaharaApp - Menjamin Integritas dan Akurasi Keuangan Negara.*
