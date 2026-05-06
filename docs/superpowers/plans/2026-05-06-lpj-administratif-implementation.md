# Laporan LPJ Administratif (F4 Landscape) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur ekspor laporan LPJ Administratif format PDF ukuran F4 Landscape dengan kategorisasi transaksi otomatis dan perhitungan kumulatif.

**Architecture:** Implementasi fungsi baru `exportLPJAdministratifPdf` di dalam `src/lib/export-pdf.js` yang melakukan agregasi data dari store berdasarkan rentang waktu, lalu merendernya menggunakan `jspdf` dan `jspdf-autotable`.

**Tech Stack:** React, jsPDF, jspdf-autotable, Zustand (Store).

---

### Task 1: Implementasi Fungsi Logika Agregasi dan Ekspor PDF

**Files:**
- Modify: `src/lib/export-pdf.js`

- [ ] **Step 1: Tambahkan fungsi pembantu untuk filter data kumulatif**

```javascript
// Di src/lib/export-pdf.js, tambahkan helper atau logika di dalam fungsi utama
// untuk membedakan transaksi s/d bulan lalu dan bulan ini.
```

- [ ] **Step 2: Implementasi fungsi exportLPJAdministratifPdf**

```javascript
export function exportLPJAdministratifPdf(monthIndex, year, subKegiatan, pengeluaran) {
  // 1. Inisialisasi jsPDF dengan ukuran F4 Landscape (330x215)
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [330, 215] })
  const settings = useStore.getState().settings
  const monthName = getMonthName(monthIndex)

  // 2. Agregasi Data
  const reportData = subKegiatan.flatMap(sk => {
    return (sk.kode_rekening || []).map(rek => {
      // Filter transaksi untuk rekening ini
      const related = pengeluaran.filter(p => p.kode_rekening_id === rek.id && new Date(p.tanggal).getFullYear() === year)
      
      const lalu = related.filter(p => new Date(p.tanggal).getMonth() < monthIndex)
      const ini = related.filter(p => new Date(p.tanggal).getMonth() === monthIndex)

      const lsBarjasLalu = lalu.filter(p => p.jenis === 'LS').reduce((s, p) => s + p.jumlah, 0)
      const lsBarjasIni = ini.filter(p => p.jenis === 'LS').reduce((s, p) => s + p.jumlah, 0)
      
      const guLalu = lalu.filter(p => p.jenis === 'GU').reduce((s, p) => s + p.jumlah, 0)
      const guIni = ini.filter(p => p.jenis === 'GU').reduce((s, p) => s + p.jumlah, 0)

      const totalLalu = lsBarjasLalu + guLalu
      const totalIni = lsBarjasIni + guIni
      const totalSD = totalLalu + totalIni

      return {
        kode: rek.kode,
        nama: rek.nama,
        pagu: rek.pagu_anggaran,
        lsGaji: { lalu: 0, ini: 0, sd: 0 }, // Sesuai permintaan: diisi strip nantinya
        lsBarjas: { lalu: lsBarjasLalu, ini: lsBarjasIni, sd: lsBarjasLalu + lsBarjasIni },
        gu: { lalu: guLalu, ini: guIni, sd: guLalu + guIni },
        total: totalSD,
        sisa: rek.pagu_anggaran - totalSD
      }
    })
  })

  // 3. Render Header (Unit Kerja, KPA, BPP, Periode)
  // ... (Gunakan pola yang sama dengan exportBKUPdf namun sesuaikan teksnya)

  // 4. Render Table (14 Kolom)
  // Gunakan autoTable dengan format head yang diminta (rowSpan/colSpan)
  
  // 5. Render Signatures
  // ... (Gunakan settings.lokasi, kpa_nama, bpp_nama)

  doc.save(`LPJ_Administratif_${monthName}_${year}.pdf`)
}
```

- [ ] **Step 3: Verifikasi sintaks**
Pastikan tidak ada error import atau penulisan.

---

### Task 2: Integrasi Tombol di Halaman Laporan

**Files:**
- Modify: `src/pages/Laporan.jsx`

- [ ] **Step 1: Import fungsi baru**

```javascript
import { ..., exportLPJAdministratifPdf } from '@/lib/export-pdf'
```

- [ ] **Step 2: Tambahkan tombol di Toolbar LRA/SPJ**

```javascript
// Di dalam render Laporan.jsx, pada bagian tab === 'lra'
// Tambahkan button dengan icon Printer/FileDown
<Button 
  variant="secondary" 
  onClick={() => exportLPJAdministratifPdf(filterBulan, 2026, subKegiatan, pengeluaran)}
>
  <Printer className="w-4 h-4 mr-2" />
  Cetak LPJ F4
</Button>
```

- [ ] **Step 3: Jalankan Aplikasi dan Uji Coba**
Buka halaman Laporan -> Tab Realisasi / SPJ -> Klik tombol "Cetak LPJ F4".
Verifikasi file PDF yang dihasilkan:
- Ukuran kertas lebar (F4).
- Kolom LS Gaji berisi strip atau 0.
- Kalkulasi LS Barjas dan GU akurat sesuai data di tabel.

---

### Task 3: Verifikasi Akhir & Dokumentasi

- [ ] **Step 1: Perbarui PROGRESS.md**
Catat penambahan fitur laporan LPJ Administratif F4.
- [ ] **Step 2: Commit perubahan**
```bash
git add src/lib/export-pdf.js src/pages/Laporan.jsx PROGRESS.md
git commit -m "feat: implement LPJ Administratif PDF report with F4 landscape format"
```
