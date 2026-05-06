# Spec: Laporan LPJ Administratif (F4 Landscape)

**Tanggal:** 2026-05-06
**Status:** Approved
**Fitur:** Pembuatan laporan Pertanggungjawaban (LPJ) Administratif dalam format PDF dengan ukuran kertas F4.

## 1. Deskripsi Fitur
Menambahkan fungsi ekspor PDF baru untuk "LPJ Administratif" (sering disebut Realisasi/SPJ) yang mencakup detail pengeluaran per kategori (LS Barjas, UP/GU/TU) dengan perhitungan kumulatif bulanan.

## 2. Spesifikasi Visual
- **Ukuran Kertas:** F4 (330mm x 215mm).
- **Orientasi:** Landscape.
- **Library:** jsPDF + jspdf-autotable.
- **Header:**
  - PROVINSI JAWA BARAT
  - LAPORAN PERTANGGUNGJAWABAN BENDAHARA PENGELUARAN PEMBANTU
  - Unit Kerja (diambil dari settings)
  - Nama KPA & BPP (diambil dari settings)
  - Tahun Anggaran & Bulan Laporan

## 3. Struktur Kolom (Total 14 Kolom)
| No | Kolom | Deskripsi Logika |
|---|---|---|
| 1 | Kode Rekening | Diambil dari `kode_rekening.kode` |
| 2 | Uraian | Diambil dari `kode_rekening.nama` |
| 3 | Anggaran | Pagu Anggaran dari database |
| 4-6 | SPJ - LS Gaji (Lalu, Ini, SD) | Selalu diisi tanda strip (-) |
| 7-9 | SPJ - LS Barjas (Lalu, Ini, SD) | Transaksi jenis 'LS' |
| 10-12 | SPJ - UP/GU/TU (Lalu, Ini, SD) | Transaksi jenis 'GU' |
| 13 | Jumlah Total | Total (7+8) + (10+11) s/d bulan ini |
| 14 | Sisa Anggaran | Anggaran - Jumlah Total |

## 4. Logika Perhitungan (Kumulatif)
- **s/d Bulan Lalu:** Total transaksi dari tanggal 1 Januari s/d H-1 bulan yang dipilih.
- **Bulan Ini:** Total transaksi pada rentang bulan yang dipilih.
- **s/d Bulan Ini:** Penjumlahan (Lalu + Ini).

## 5. Komponen Tanda Tangan
- Lokasi & Tanggal (hari terakhir bulan laporan).
- Nama & NIP Kuasa Pengguna Anggaran (KPA).
- Nama & NIP Bendahara Pengeluaran Pembantu (BPP).

## 6. Lokasi Implementasi
- **Logic:** `src/lib/export-pdf.js` (Fungsi baru: `exportLPJAdministratifPdf`).
- **UI:** `src/pages/Laporan.jsx` (Menambahkan tombol pemicu di tab LRA/SPJ).
