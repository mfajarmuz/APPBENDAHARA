# Bendahara App — Design Specification

**Tanggal:** 2026-04-30
**Unit:** UPTD PUSAT PENGELOLAAN PENDAPATAN DAERAH WILAYAH KABUPATEN TASIKMALAYA
**Organisasi:** Badan Pendapatan Daerah, Pemerintahan Provinsi Jawa Barat
**Tahun Anggaran:** 2026

---

## 1. Ringkasan Proyek

Aplikasi desktop untuk **Bendahara Pengeluaran** UPTD BAPENDA Kab. Tasikmalaya. Dana hanya masuk dari pusat (SP2D), dan seluruh transaksi lainnya merupakan pengeluaran. Aplikasi mencatat penerimaan, pengeluaran per kode rekening, dan menghasilkan laporan standar pemerintah (BKU, Buku Pembantu, LRA/SPJ, Rekap Bulanan).

**Pengguna:** 1 bendahara (single-user, tanpa login/autentikasi).

---

## 2. Stack Teknologi

| Layer | Teknologi |
|---|---|
| Desktop shell | Electron |
| Frontend UI | React + Vite |
| State management | Zustand |
| Database | Supabase (PostgreSQL, hosted online) |
| Supabase client | Dijalankan di **Electron main process** (lebih aman) |
| Komunikasi UI ↔ Data | IPC (ipcMain / ipcRenderer) |
| Export PDF | `jsPDF` + `jspdf-autotable` |
| Export Excel | `xlsx` (SheetJS) |
| Styling | Tailwind CSS |
| Routing | React Router v6 |

---

## 3. Desain UI

### Palet Warna

| Token | Hex | Digunakan untuk |
|---|---|---|
| `color-sidebar` | `#12121F` | Background sidebar |
| `color-accent` | `#7C3AED` | Nav aktif, tombol primer, progress bar |
| `color-accent-light` | `#EDE9FE` | Badge, hover, background input aktif |
| `color-bg` | `#F8F8FC` | Background halaman utama |
| `color-surface` | `#FFFFFF` | Background card, form |
| `color-border` | `#F0F0F8` | Border card, divider |
| `color-text-primary` | `#12121F` | Teks utama |
| `color-text-secondary` | `#9090B0` | Label, placeholder, sub-teks |
| `color-success` | `#059669` | Realisasi selesai, nilai positif |
| `color-warning` | `#B45309` | Sisa anggaran sedang |
| `color-danger` | `#DC2626` | Realisasi rendah, nilai kritis |

### Layout Global

- **Sidebar** (lebar 200px, `#12121F`): logo/nama unit, search, navigasi, panel info TA
- **Main area** (`#F8F8FC`): topbar putih + area konten scrollable
- **Border radius card:** 14px
- **Font:** Segoe UI / system-ui

---

## 4. Modul & Halaman

### 4.1 Dashboard
- 3 kartu summary: Total Pagu, Total Realisasi (%), Sisa Anggaran
- Tabel realisasi per sub kegiatan: kode, uraian, pagu, realisasi, progress bar, status pill
- Bar chart: realisasi pengeluaran per bulan (12 bulan)
- Tabel/list pengeluaran terakhir (5 transaksi terbaru)

### 4.2 Penerimaan
- List semua penerimaan dari pusat (SP2D)
- Form input: tanggal, nomor SP2D, jumlah, keterangan
- Tidak ada kode rekening (dana masuk tidak dipetakan ke rekening)

### 4.3 Pengeluaran
- List semua pengeluaran (filter by sub kegiatan, bulan, status)
- Form input:
  - Tanggal transaksi
  - Nomor bukti / SPP
  - Sub Kegiatan (dropdown dari master DPA)
  - Kode Rekening (dropdown filter by sub kegiatan, tampil sisa pagu)
  - Rincian belanja (multi-baris: uraian, volume/satuan, jumlah)
  - Keterangan/catatan
- Panel kanan (real-time saat memilih sub kegiatan): saldo kas, pagu/realisasi/sisa sub kegiatan, kode rekening tersedia

### 4.4 Anggaran / DPA
- List semua sub kegiatan beserta total pagu
- Drill-down: klik sub kegiatan → tampil kode rekening + pagu per rekening
- Data diinput manual dari 13 file DPA PDF yang ada di `res/`
- Form tambah/edit sub kegiatan dan kode rekening

### 4.5 Laporan
Sub-halaman laporan menggunakan filter periode (bulan/rentang tanggal):

| Laporan | Isi |
|---|---|
| **Buku Kas Umum (BKU)** | Semua transaksi masuk (penerimaan) & keluar (pengeluaran) berurut tanggal, saldo berjalan |
| **Buku Pembantu** | Pengeluaran dikelompokkan per kode rekening, saldo per rekening |
| **Realisasi / SPJ** | Pagu vs realisasi per sub kegiatan dan kode rekening, persentase serapan |
| **Rekap Bulanan** | Ringkasan penerimaan dan pengeluaran per bulan dalam satu tahun |

Setiap laporan memiliki tombol **Export PDF** dan **Export Excel**.

---

## 5. Skema Database (Supabase / PostgreSQL)

### Tabel `sub_kegiatan`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
kode          text UNIQUE NOT NULL   -- contoh: 5.02.01.1.06.0005
nama          text NOT NULL
total_pagu    bigint NOT NULL
sumber_dana   text DEFAULT 'PAD'
tahun_anggaran integer DEFAULT 2026
created_at    timestamptz DEFAULT now()
```

### Tabel `kode_rekening`
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
sub_kegiatan_id   uuid REFERENCES sub_kegiatan(id) ON DELETE CASCADE
kode              text NOT NULL     -- contoh: 5.1.02.01.001.00024
uraian            text NOT NULL
pagu_anggaran     bigint NOT NULL
created_at        timestamptz DEFAULT now()
```

### Tabel `penerimaan`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
tanggal       date NOT NULL
no_sp2d       text
jumlah        bigint NOT NULL
keterangan    text
created_at    timestamptz DEFAULT now()
```

### Tabel `pengeluaran`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
tanggal             date NOT NULL
no_bukti            text NOT NULL
sub_kegiatan_id     uuid REFERENCES sub_kegiatan(id)
kode_rekening_id    uuid REFERENCES kode_rekening(id)
jumlah              bigint NOT NULL
keterangan          text
created_at          timestamptz DEFAULT now()
```

### Tabel `pengeluaran_rincian`
```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
pengeluaran_id    uuid REFERENCES pengeluaran(id) ON DELETE CASCADE
uraian            text NOT NULL
volume            text          -- contoh: "1000 Lembar"
jumlah            bigint NOT NULL
```

---

## 6. Alur Data

```
DPA PDF (res/) → Input Manual → sub_kegiatan + kode_rekening (Supabase)
SP2D dari pusat → Form Penerimaan → penerimaan (Supabase)
Belanja → Form Pengeluaran → pengeluaran + pengeluaran_rincian (Supabase)

Laporan:
  BKU         ← JOIN penerimaan + pengeluaran ORDER BY tanggal
  Buku Pembantu ← pengeluaran GROUP BY kode_rekening
  LRA/SPJ     ← sub_kegiatan LEFT JOIN SUM(pengeluaran)
  Rekap Bulanan ← penerimaan + pengeluaran GROUP BY MONTH
```

---

## 7. Arsitektur Electron

```
main.js (Electron main process)
  ├── Supabase client (credentials via .env, tidak exposed ke renderer)
  ├── ipcMain handlers: CRUD sub_kegiatan, kode_rekening, penerimaan, pengeluaran
  ├── ipcMain handler: generate laporan (query aggregasi)
  └── ipcMain handler: export PDF / Excel (file system access)

renderer/ (React app)
  ├── Zustand store (state lokal: form, filter, cache data)
  ├── ipcRenderer invoke (memanggil main untuk semua operasi data)
  └── Pages: Dashboard, Penerimaan, Pengeluaran, DPA, Laporan
```

---

## 8. Data Awal (Seeding DPA)

13 file DPA PDF tersimpan di `res/`. Data sub kegiatan dan kode rekening diinput manual sekali di halaman **Anggaran / DPA** saat pertama kali aplikasi dipakai. Struktur kode mengikuti format Permendagri (kode sub kegiatan 6 segmen, kode rekening 5 segmen).

---

## 9. Batasan & Asumsi

- Single-user, tidak ada autentikasi/login
- Sumber dana tunggal: PAD (Pendapatan Asli Daerah)
- Penerimaan **hanya** dari pusat (tidak ada penerimaan lain)
- Angka dalam satuan **rupiah penuh** (integer, bukan desimal)
- Tahun anggaran default 2026, bisa dikonfigurasi untuk tahun berikutnya
- Koneksi internet diperlukan untuk sinkronisasi Supabase
- Laporan mengikuti format standar pemerintah (tidak ada format kustom)
