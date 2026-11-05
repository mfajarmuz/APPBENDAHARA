# Jurnal Pengembangan BendaharaApp

Dokumentasi berkala evolusi sistem, implementasi fitur, perbaikan bug, dan keputusan teknis BendaharaApp.

---

## [2026-09-14] Siklus Pengembangan: Fitur Komponen Belanja (Rincian Objek Belanja)

### 1. Latar Belakang & Kebutuhan Pengguna
Dalam administrasi penganggaran pemerintah daerah (DPA-SKPD), setiap Rekening Belanja (`kode_rekening`) tidak hanya memiliki pagu global, melainkan tersusun atas rincian belanja riil yang disebut **Komponen Belanja** (atau Rincian Komponen / Sub Rincian Objek).
- Pengguna meminta penambahan entitas **Komponen Belanja** yang berkedudukan di bawah **Daftar Rekening Belanja** (`kode_rekening`), sehingga hierarki anggaran menjadi:
  `Program` -> `Kegiatan` -> `Sub Kegiatan` -> `Kode Rekening` (Daftar Rekening Belanja) -> **`Komponen Belanja`** (Rincian Komponen).
- Pengguna dapat merinci barang/jasa apa saja yang membentuk pagu belanja pada rekening tersebut, lengkap dengan spesifikasi, volume, satuan, harga satuan, dan total nilai.
- Pengguna dapat membandingkan akumulasi total rincian komponen dengan pagu rekening dan melakukan sinkronisasi otomatis pagu belanja serta pembagian rata RAK 12 bulan.

### 2. Rincian Perubahan & Implementasi

#### A. Database & Skema
- **File Migrasi**: `migration_add_komponen_belanja.sql`
- **Tabel**: `komponen_belanja`
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `kode_rekening_id`: UUID NOT NULL REFERENCES kode_rekening(id) ON DELETE CASCADE
  - `kode`: VARCHAR(50) (Kode rincian komponen, misal `01`, `001`)
  - `nama`: TEXT NOT NULL (Nama barang/jasa atau uraian rincian)
  - `spesifikasi`: TEXT (Spesifikasi teknis, merk, ukuran)
  - `volume`: NUMERIC(15, 2) NOT NULL DEFAULT 1
  - `satuan`: VARCHAR(50) NOT NULL DEFAULT 'Paket'
  - `harga_satuan`: BIGINT NOT NULL DEFAULT 0
  - `total`: BIGINT NOT NULL DEFAULT 0
  - `keterangan`: TEXT (Catatan dasar kebutuhan / SSH)
  - `created_at`: TIMESTAMPTZ DEFAULT NOW()

#### B. Electron IPC & API Layer
- `electron/main.js`:
  - Query `get-sub-kegiatan` dan `get-kode-rekening` diperbarui memuat relasi bersarang `kode_rekening (*, komponen_belanja (*))` dengan blok `try ... catch` dan fallback otomatis ke `kode_rekening (*)` untuk mencegah crash jika remote DB belum mengeksekusi script SQL migrasi.
  - Ditambahkan IPC handler: `get-komponen-belanja`, `add-komponen-belanja`, `update-komponen-belanja`, `delete-komponen-belanja`.
- `electron/preload.js`:
  - Mengekspos fungsi CRUD komponen belanja ke `window.api`.
- `src/lib/api.js`:
  - Ditambahkan fungsi: `getKomponenBelanja`, `addKomponenBelanja`, `updateKomponenBelanja`, `deleteKomponenBelanja`.

#### C. State Management (`src/store/useStore.js`)
- Menambahkan slice `createKomponenBelanjaSlice` dengan aksi:
  - `addKomponenBelanja(payload)`
  - `updateKomponenBelanja(payload)`
  - `deleteKomponenBelanja(id)`
- Proteksi keamanan: Memeriksa role pengguna (`checkViewer`) agar akun viewer tidak dapat memodifikasi komponen belanja.
- Integrasi ke `copyDpaStructure`: Ketika menyalin struktur DPA dari satu tahun ke tahun baru, seluruh data `komponen_belanja` turut diduplikasi dengan pagu/total di-reset ke 0.

#### D. Antarmuka Halaman Anggaran (`src/pages/Anggaran.jsx`)
- Tombol `KOMPONEN ({count})` di baris rekening belanja berdampingan dengan `RAK BELANJA`.
- Panel tabel expandable rincian komponen belanja lengkap dengan:
  - Status bar perbandingan real-time Pagu Rekening vs Total Seluruh Komponen (*✓ Pagu & Komponen Sesuai*, *Belum Dialokasikan*, atau *Komponen Melebihi Pagu*).
  - Tombol otomatisasi `⚡ Terapkan Total ke Pagu`: Mengubah pagu rekening menjadi persis sama dengan jumlah total rincian komponen dan membagi rata alokasi kas ke RAK 12 bulan secara instan.
  - Tabel rincian item dengan kolom Kode, Nama Komponen, Spesifikasi, Volume, Satuan, Harga Satuan, Total, dan Aksi Edit/Hapus.
- Modal Tambah/Edit Komponen Belanja:
  - Perhitungan otomatis `total = volume * harga_satuan`.
  - Tombol cepat pilihan satuan umum (*Paket, Rim, Kotak, Bulan, Orang/Bulan, Kegiatan*).
  - Kartu pratinjau kalkulasi nominal Rupiah yang jelas.
  - Dialog konfirmasi hapus aman (`ConfirmDialog`).

### 3. Hasil Pengujian & Verifikasi
- Dibuat file pengujian unit baru `src/test/komponen-belanja.test.js` (7 test case).
- Seluruh pengujian Vitest (14 test file, 83 test case) **Lulus 100%**:
  - `komponen-belanja.test.js` (7/7 passed)
  - `tahun-anggaran.test.js` (11/11 passed)
  - Seluruh pengujian regresi lainnya 100% lulus.

---

## [2026-09-14] Siklus Pengembangan: Fitur Multi-Tahun Anggaran & Isolasi Data Finansial

### 1. Latar Belakang & Kebutuhan Pengguna
Pengguna membutuhkan fleksibilitas dalam mengelola pembukuan bendahara lintas periode tahun anggaran:
- Mampu berpindah (*switch*) tahun anggaran aktif secara instan kapan saja dari berbagai antarmuka (Topbar, Sidebar, Pengaturan).
- Mampu mendaftarkan tahun anggaran baru (misal: 2027, 2028).
- Mampu menyalin struktur DPA (Program, Kegiatan, Sub Kegiatan, dan Kode Rekening) dari tahun anggaran lama ke tahun anggaran baru dengan nilai pagu anggaran dan alokasi RAK 12 bulan otomatis di-reset ke Rp 0.
- Menjamin isolasi data 100% konsisten di seluruh modul (Dashboard, DPA & RAK, Transaksi Penerimaan, Pengeluaran & SPJ, Laporan BKU/LRA/LPJ, Periode Kunci, dan Asisten AI Co-Pilot).

### 2. Rincian Perubahan & Implementasi

#### A. Database & Skema
- **File Migrasi**: `migration_update_sub_kegiatan_unique_tahun.sql`
- **Tujuan**: Mengganti PostgreSQL unique constraint `sub_kegiatan_kode_key` (`UNIQUE(kode)`) menjadi composite unique `(kode, tahun_anggaran)`. Hal ini memungkinkan kode sub kegiatan yang sama diduplikasi ke tahun anggaran yang berbeda tanpa melanggar constraint database.
- **Client Fallback**: Jika data lama memiliki `tahun_anggaran === null`, aplikasi secara otomatis memperlakukannya sebagai `2026` (`(sk.tahun_anggaran || 2026)`).

#### B. State Management (`src/store/useStore.js`)
- Menambahkan slice `createTahunAnggaranSlice` dengan state:
  - `tahunAnggaran`: Tahun anggaran aktif (default: `2026` atau dibaca dari `localStorage`).
  - `daftarTahunAnggaran`: Array tahun anggaran tersedia (default: `[2024, 2025, 2026, 2027]`).
  - `setTahunAnggaran(tahun)`: Mengubah tahun aktif dan menyimpannya ke `localStorage` (`bendahara_tahun_anggaran`).
  - `addTahunAnggaran(tahun, { copyFromYear })`: Mendaftarkan tahun baru, mengurutkan array, dan secara opsional memanggil fungsi penyalinan struktur DPA.
  - `copyDpaStructure(sourceYear, targetYear)`: Menyalin seluruh sub kegiatan dan rekening dari `sourceYear` ke `targetYear` dengan pagu dan RAK 12 bulan di-reset ke Rp 0.
- Memperbarui `addSubKegiatan` agar otomatis menyertakan `tahun_anggaran: get().tahunAnggaran || 2026`.

#### C. Antarmuka Global (`Topbar.jsx` & `Sidebar.jsx`)
- **Topbar**:
  - Menambahkan pill selector dropdown `TA {tahunAnggaran} ▾` dengan visual aktif yang elegan.
  - Menambahkan modal "Tambah Tahun Anggaran Baru" dengan validasi 4 digit angka, pencegahan duplikasi, dan checkbox opsi "Salin Struktur DPA dari Tahun Ini (Pagu diset Rp 0)".
- **Sidebar**:
  - Footer menampilkan status reaktif `Tahun Anggaran {tahunAnggaran}` dengan indikator status aktif.

#### D. Pengaturan Sistem (`src/pages/Settings.jsx`)
- Menambahkan kartu interaktif "Manajemen Tahun Anggaran" pada Tab 4 (System):
  - Grid pemilihan tahun anggaran aktif dengan visual badge.
  - Form penambahan tahun anggaran baru langsung dari halaman pengaturan.

#### E. Halaman Anggaran (`src/pages/Anggaran.jsx`)
- Menyaring `subKegiatan` per tahun aktif `(sk.tahun_anggaran || 2026) === tahunAnggaran`.
- Struktur hierarki DPA dan realisasi rekening terisolasi ke tahun aktif.
- Empty state informatif jika tahun baru belum memiliki DPA dengan tombol pintas *"Salin Struktur DPA dari TA Lain"* dan *"Tambah Program Baru"*.

#### F. Transaksi Kas (`Pengeluaran.jsx` & `Penerimaan.jsx`)
- Dropdown sub kegiatan hanya menampilkan sub kegiatan dari tahun aktif.
- Transaksi difilter ketat `d.getFullYear() === tahunAnggaran`.
- Form pencatatan transaksi otomatis menetapkan default tanggal ke tahun anggaran aktif.
- Validasi simpan transaksi: Menolak pencatatan transaksi jika tanggal berada di luar tahun anggaran aktif.

#### G. Dashboard (`src/pages/Dashboard.jsx`)
- Seluruh KPI cards, hierarchical drill-down, pajak, BKU index map, monthly recap, dan monitoring RAK menggunakan `currentSubKegiatan`, `currentPengeluaran`, dan `currentPenerimaan`.
- Banner visual penanda tahun anggaran aktif di bagian atas dashboard.

#### H. Laporan Keuangan (`src/pages/Laporan.jsx`)
- Filter tahun tersinkronisasi dua arah dengan `tahunAnggaran` store.
- Penguncian bulan BKU (`PeriodeKunciPanel`) berlaku spesifik per tahun anggaran aktif.

#### I. Asisten AI Co-Pilot (`aiAssistant.js`, `langchainAgent.js`, `langgraphAgent.js`)
- `buildFinancialContext`: Mengisolasi data pagu, realisasi belanja, penerimaan, dan transaksi per tahun anggaran aktif.
- Executive summary dan respons format AI menyertakan label tahun anggaran dinamis.
- LangGraph multi-node audit memeriksa transaksi dan pelampauan pagu pada tahun anggaran aktif.

### 3. Hasil Pengujian & Verifikasi
- Dibuat file pengujian unit baru `src/test/tahun-anggaran.test.js` (11 test case).
- Seluruh pengujian Vitest (13 test file, 76 test case) **Lulus 100%**:
  - `tahun-anggaran.test.js` (11/11 passed)
  - `ai-assistant.test.js` (9/9 passed)
  - `export-pdf.test.js` (10/10 passed)
  - `format.test.js` (13/13 passed)
  - `store.test.js` (5/5 passed)
  - Seluruh pengujian lainnya lulus tanpa kendala.

### 4. Status Rilis
- **Git Branch**: `nyxera/next-feature`
- **Status**: Siap diuji secara visual dan digabungkan (*merge*) ke branch utama sesuai persetujuan pengguna.


---

## Sesi 2026-11-05: Audit Sistem Menyeluruh, Sinkronisasi Paket Transaksi, Komponen Belanja, & Backup/Restore Database

### 1. Perbaikan Bug & Konsistensi Logika Keuangan
- **Dashboard (`src/pages/Dashboard.jsx`)**:
  - Memperbaiki perhitungan kartu Pajak (`penerimaanPajak`, `pengeluaranPajak`, `pajakDetails`) agar menyertakan transaksi `Pajak LS` serta keterangan setoran berformat `"Disetor PPN"` / `"Disetor PPh ..."`.
  - Mengecualikan baris transaksi pajak dari rekapitulasi belanja bulanan (`monthlyRecap.totalAll`) dan grafik monitoring RAK (`rakMonitoringData`).
- **Penerimaan (`src/pages/Penerimaan.jsx`)**:
  - Menyinkronkan total penerimaan di header dengan data yang terfilter (`filtered`) per tahun anggaran aktif dan memisahkan subtotal pajak.
  - Menyertakan item `pengeluaran_rincian` otomatis saat membuat setoran pajak pada fitur *Langsung Bayar (LS)*.
- **Laporan BKU (`src/pages/Laporan.jsx`) & Helper BKU (`src/lib/bku.js`)**:
  - Mengisolasi akumulasi *Jumlah s/d Bulan Lalu* (`totalsBulanLalu`, `registerKasData`, `bankTotalsBulanLalu`) ke tahun anggaran yang dipilih (`d.getFullYear() === filterTahun`).
  - Memperbarui deteksi uraian pajak pada `bku.js` agar mengenali format `"Disetor PP..."`.

### 2. Sinkronisasi Pengaturan Instansi, Paket Transaksi, & Tempat Sampah
- **Pengaturan Instansi Cloud & Lokal (`electron/main.js`, `src/lib/api.js`, `src/store/useStore.js`, `migration_add_settings.sql`)**:
  - Menambahkan persistensi 3 lapis (tabel `settings` di Supabase + file lokal `bendahara_settings.json` + `localStorage`) serta melengkapi `DEFAULT_SETTINGS` pada `resetSettings()`.
- **Sinkronisasi Penghapusan & Pemulihan Paket Transaksi (`syncTransactionPackage`)**:
  - Menghapus sementara (*soft-delete*), memulihkan (*restore*), atau menghapus permanen (*hard-delete*) transaksi induk atau pajak kini menyinkronkan seluruh pasangan transaksi di tabel `penerimaan` dan `pengeluaran`.
- **Halaman Tempat Sampah (`src/pages/Trash.jsx`)**:
  - Dilengkapi filter Tahun Anggaran (`TA {tahunAnggaran}` / `Semua Tahun`), filter Tipe, pencarian cepat, badge `🔗 Paket`, serta tombol aksi massal **Pulihkan Semua** dan **Kosongkan Tempat Sampah**.

### 3. Fitur Baru: Backup & Restore Database UI, Auto-Sync Pagu, & Hapus Program/Kegiatan Kosong
- **Backup & Restore Database Lokal (`src/pages/Settings.jsx`, `electron/main.js`, `src/lib/api.js`, `src/store/useStore.js`)**:
  - Menambahkan panel **"Backup & Restore Database Lokal (Full Snapshot)"** di halaman Pengaturan untuk mencadangkan 10 tabel ke folder `backups/` (`.json`, `.xlsx`, `.sql`) atau mengunduh langsung, serta memulihkan (*restore*) dari file `.json`.
- **Sinkronisasi Otomatis `sub_kegiatan.total_pagu`**:
  - Menambahkan `syncSubKegiatanTotalPagu` & `autoHealSubKegiatanTotalPagu` agar `sub_kegiatan.total_pagu` selalu sinkron dengan `SUM(kode_rekening.pagu_anggaran)`.
- **Hapus Program & Kegiatan Kosong (`src/pages/Anggaran.jsx`)**:
  - Menampilkan Program dan Kegiatan kosong pada hierarki halaman Anggaran beserta tombol hapus (`Trash2`) dengan proteksi relasi bertingkat dan dialog konfirmasi.
