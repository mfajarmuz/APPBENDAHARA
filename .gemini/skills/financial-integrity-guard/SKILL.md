---
name: financial-integrity-guard
description: Menjamin integritas data keuangan, akurasi perhitungan pajak (PPN/PPh), validasi Pagu anggaran, dan konsistensi saldo kas dalam aplikasi Bendahara.
---

# Financial Integrity Guard

Gunakan skill ini saat membuat atau memodifikasi fitur yang melibatkan angka keuangan, transaksi, atau laporan anggaran.

## Prinsip Utama Integritas Keuangan

1.  **Presisi Integer**: Selalu simpan nilai mata uang sebagai `bigint` (Rupiah murni tanpa sen) di database. Gunakan `parseInt` atau `Math.round` saat konversi dari UI untuk mencegah *floating point error*.
2.  **Validasi Pagu**: Sebelum menyimpan transaksi `pengeluaran`, pastikan `jumlah` tidak melebihi sisa `pagu_anggaran` pada `kode_rekening` terkait.
3.  **Konsistensi Pajak**:
    - `PPN` biasanya 11% dari DPP (Dasar Pengenaan Pajak).
    - `PPh` bervariasi tergantung jenis (21, 22, 23, 4 ayat 2).
    - Rumus: `Total Bayar = DPP + PPN - PPh`.
4.  **Hukum Saldo Kas**: `Saldo Akhir = Saldo Awal + Total Penerimaan - Total Pengeluaran`. Saldo buku tidak boleh negatif kecuali dalam kondisi khusus yang diizinkan sistem.

## Alur Validasi Transaksi

Setiap transaksi baru harus melalui pengecekan berikut:

1.  **Cek Duplikasi**: Verifikasi `no_sp2d` atau `no_bukti` agar tidak terjadi input ganda.
2.  **Cek Ketersediaan Anggaran**:
    ```sql
    SELECT pagu_anggaran - (SELECT COALESCE(SUM(jumlah), 0) FROM pengeluaran WHERE kode_rekening_id = :id) as sisa
    FROM kode_rekening WHERE id = :id;
    ```
3.  **Verifikasi Rincian**: Total `jumlah` pada `pengeluaran_rincian` harus sama dengan `jumlah` pada baris `pengeluaran` induknya.

## Panduan Implementasi Kode

### Di React (UI/Frontend)
- Gunakan `parseRupiah` dari `src/lib/format.js` sebelum mengirim data ke store.
- Tampilkan peringatan jika input melebihi sisa anggaran secara real-time.

### Di Electron (Main/Backend)
- Jalankan kueri validasi ketersediaan dana di dalam transaksi database (Atomic).
- Jangan pernah percaya perhitungan dari frontend; hitung ulang total dan pajak di sisi backend (main process).

## Referensi Skema Keuangan
Lihat `references/financial_schema.md` untuk detail relasi antara Program -> Kegiatan -> Sub Kegiatan -> Kode Rekening.
