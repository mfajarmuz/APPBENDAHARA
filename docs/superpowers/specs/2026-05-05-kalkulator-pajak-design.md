# Spesifikasi Desain: Kalkulator Pajak Bendahara

**Tanggal:** 2026-05-05  
**Status:** Approved  
**Tujuan:** Menyediakan alat bantu hitung cepat bagi Bendahara untuk melakukan simulasi pemotongan/pemungutan pajak (PPN & PPh) sesuai aturan perpajakan Indonesia terbaru.

---

## 1. Arsitektur & Antarmuka
- **Nama Halaman:** Kalkulator Pajak  
- **Lokasi:** Menu Sidebar baru di bawah 'Laporan'.
- **Metode Input:** Nilai Bruto (Nilai kuitansi yang sudah termasuk PPN).
- **Sifat Data:** Volatile (Hanya untuk simulasi, tidak disimpan ke database).

## 2. Logika Perhitungan (Smart Workflow)

### A. Komponen Dasar
- **DPP (Dasar Pengenaan Pajak)** = `Nilai Bruto / 1.11` (Untuk transaksi kena PPN).
- **PPN (11%)** = `DPP * 0.11`.
- **Faktor Non-NPWP** = Jika rekanan tidak memiliki NPWP, tarif PPh (22 & 23) dikalikan 2 (100% lebih tinggi).

### B. Kategori Transaksi & Tarif
| Kategori | Pajak Terkait | Tarif (Punya NPWP) | Tarif (Tanpa NPWP) | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Belanja Barang** | PPN + PPh 22 | PPN 11%, PPh 1.5% | PPN 11%, PPh 3% | Berlaku untuk toko/vendor barang. |
| **Jasa / Service** | PPN + PPh 23 | PPN 11%, PPh 2% | PPN 11%, PPh 4% | Berlaku untuk CV/PT penyedia jasa. |
| **Honorarium ASN** | PPh 21 Final | Gol IV: 15%, III: 5%, I/II: 0% | - | Berdasarkan Golongan (Final). |
| **Sewa Bangunan** | PPh 4 (2) | 10% | 10% | Final. |
| **Jasa Konstruksi** | PPh 4 (2) | 2% | 4% | Estimasi tarif standar (Pelaksanaan). |

## 3. Komponen UI (React)
- **Input Angka**: Menggunakan format Rupiah real-time.
- **Dropdown Kategori**: Pilih kategori transaksi.
- **Toggle/Switch**: "Memiliki NPWP" (Default: On).
- **Hasil Panel**: Kartu ringkasan yang menampilkan:
    - Nilai Bruto
    - DPP
    - Rincian PPN
    - Rincian PPh
    - **Total Pajak**
    - **Nilai Bersih (Diterima Rekanan)**

## 4. Validasi & Standar
- Presisi menggunakan `BigInt` atau pembulatan `Math.round` untuk menghindari floating point error.
- Menggunakan komponen UI yang sudah ada di proyek (`Input`, `Select`, `Card`).

---
**Catatan Aturan Pajak (Ref: aturan pajak.docx):**
- PPN tetap 11% baik punya NPWP maupun tidak.
- PPh 22 & 23 naik 100% jika tidak punya NPWP.
- PPh 21 Honorarium menggunakan skema Golongan (APBD).
