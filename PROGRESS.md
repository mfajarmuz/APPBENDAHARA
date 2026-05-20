# Project State: BendaharaApp

## Summary
The project is in the refinement phase. Core features (Dashboard, Anggaran, Penerimaan, Pengeluaran) are implemented. Recent focus has been on fixing bugs in expenditure rincian and report accuracy.

## Recent Achievements
- [x] **Bug Fix**: Memperbaiki kegagalan fungsionalitas tombol **Export PDF** pada tab **Berita Acara Pemeriksaan Kas** (BA Kas) dengan menerapkan pengamanan parsing tanggal (`customDate`) untuk mencegah RangeError serta standardisasi konversi numerik `saldoBuku`.
- [x] **Testing & Verification**: Menambahkan 5 kasus pengujian baru di `src/test/export-pdf.test.js` untuk memverifikasi fungsionalitas ekspor PDF BA Kas pada mode browser (Web Mode) dan mode desktop (Electron) dengan berbagai variasi input tanggal (valid, kosong, tidak valid) — seluruh 44 unit test Vitest kini 100% lulus.
- [x] **Environment Sync**: Sinkronisasi variabel lingkungan Supabase berprefiks `VITE_` (`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`) di file `.env` dan `.env.example` untuk menjamin koneksi database berjalan mulus pada mode browser Web tanpa warning.
- [x] **Bug Fix**: Restorasi dan perbaikan modul PDF ekspor (`npd.js`, `buku-pembantu-pajak.js`, dan `rekap-bulanan.js`) yang hilang dari refaktor modularisasi dengan mengekstrak secara akurat dari riwayat commit git, memperbaiki resolusi parameter default, serta meloloskan 100% (40/40) pengujian unit Vitest.
- [x] **Release v1.1.3**: Rilis versi 1.1.3 dengan perbaikan indexing kolom, penyelarasan breakdown GU pada tabel ringkasan LPJ, dan unifikasi total tabel anggaran dengan breakdown SPJ/Pajak lengkap.
- [x] **Bug Fix**: Menambahkan metode CRUD manajemen anggaran yang hilang pada Zustand store untuk memperbaiki fitur penghapusan anggaran.
- [x] **New Feature**: Implementasi tabel ringkasan LPJ yang detail dengan integrasi struktur kolom anggaran yang sinkron.
- [x] **New Feature**: Implementasi fitur **Drag & Drop Sorting** pada Laporan BKU. Menghapus semua aturan pengurutan otomatis dan memberikan kendali penuh kepada bendahara untuk mengatur urutan transaksi secara manual. Urutan disimpan permanen ke database.
- [x] **Bug Fix**: Optimasi alur paket transaksi (LS/GU) di laporan agar tetap menjadi satu kesatuan saat pengisian data awal.
- [x] **Release v1.1.2**: Rilis versi 1.1.2 dengan penyelesaian masalah sinkronisasi skema database pada Supabase dan pembersihan *fallback mapping* IPC. Skema frontend, backend, dan database jarak jauh kini 100% konsisten menggunakan terminologi `nomor_ls`.
- [x] **New Feature**: Implementasi Laporan LPJ Administratif (Realisasi/SPJ) format F4 Landscape dengan kategorisasi otomatis.
- [x] Refactored Zustand store to partitioned slices.
- [x] Standardized IPC error handling in `main.js`.
- [x] Implemented KPI Cards and Realization charts on Dashboard.
- [x] Added BKU, Buku Pembantu, and LRA reports in Laporan page.
- [x] **Team Capability**: Created specialized sub-agents (`system-architect`, `devops-agent`, `bug-checker`, `frontend-dev`, `backend-dev`) to handle modular development tasks.
- [x] **New Feature**: Added advanced hierarchical filtering (Bulan, Program, Kegiatan, Sub Kegiatan, Kode Rekening) on Pengeluaran page with date sorting.
- [x] **New Feature**: Integrasi Telegram Bot untuk konsultasi proyek asinkron.
    - Implementasi `bot.js`, `bridge.js`, dan `whitelist.js` menggunakan Telegraf.
    - Bot mampu memberikan konteks `GEMINI.md` dan `PROGRESS.md` secara privat.
- [x] **Release v1.1.1**: Rilis versi 1.1.1 dengan migrasi total terminologi `no_sp2d` ke `nomor_ls` di seluruh aplikasi dan integrasi resmi skill Memory Agent.
- [x] **Bug Fix**: Sinkronisasi field `nomor_ls` pada frontend (`Penerimaan.jsx`) dan logic laporan (`bku.js`) agar sesuai dengan skema database terbaru.
- [x] **Terminology Update**: Renamed "SP2D" to "LS" across UI, reports, and validation logic. Migrasi total field database `no_sp2d` menjadi `nomor_ls` untuk konsistensi sistem.
- [x] **Stability**: Memperbarui instruksi standar pengembang di `GEMINI.md` untuk mewajibkan penggunaan Memory Agent.
- [x] **Release v1.1.0**: Rilis resmi versi 1.1.0 dengan fitur Kalkulator Pajak Indonesia terpadu, perbaikan distribusi file `.env` di mode produksi, dan optimasi build metadata.
- [x] **New Feature**: Menambahkan fitur Kalkulator Pajak Indonesia (Smart Workflow) untuk simulasi perhitungan PPN 11% dan berbagai jenis PPh (21, 22, 23, 4 ayat 2) secara instan berdasarkan nilai bruto.
- [x] **Bug Fix**: Memperbaiki fitur unduh template yang gagal pada aplikasi yang terinstal dengan mengimplementasikan IPC `download-template` dan `dialog.showSaveDialog`.
- [x] **Testing**: Menambah cakupan pengujian untuk penanganan error IPC di `src/test/ipc-error.test.js`.
- [x] **Testing**: Verified all fixes with new unit tests in `bug_repro.test.js`, `export-pdf.test.js`, and `ipc-error.test.js`.
- [x] **Agent Development**: Completed implementation and perfection of the Global Frontend Professional Agent.
    - Fixed PATH issue using `frontend-pro.cmd` wrapper.
    - Integrated `rich` for professional CLI UI.
    - Added `list_directory` tool and `read_file` truncation.
    - Implemented automatic retry logic with `tenacity` for handling 429 errors.
    - Updated README.md and installation instructions.
- [x] **Collaboration**: Menambahkan skill `agent-collaboration` dan file `.gemini/AGENT_HANDOFF.md` untuk memfasilitasi komunikasi asinkron antar sub-agen (architect, frontend, backend, dll.). Semua definisi agen telah diperbarui untuk mengikuti protokol serah terima (handoff) ini.
- [x] **Team Expansion**: Menambahkan 6 sub-agen spesialis baru:
    - **Manager Agent**: Orchestrator tingkat lanjut untuk delegasi dan QC.
    - **Research & Documentation Agent**: Spesialis manual pengguna dan riset teknis.
    - **Security & Compliance Agent**: Penjaga keamanan siber dan integritas finansial.
    - **Database Schema Architect Agent**: Arsitek khusus struktur data PostgreSQL.
    - **Deployment & Cloud Ops Agent**: Spesialis infrastruktur Cloud dan otomatisasi build.
    - **Memory Agent**: Pengelola memori proyek jangka panjang (ADR & PARA).

## Known Issues / Bugs
- [ ] Manual verification: Need final walk-through of the packaged application.

## Architecture Decisions
- **Source of Truth**: Database calculations (Pagu) must be derived from `kode_rekening` to ensure consistency.
- **IPC Response**: All handlers return `{ success: true, data }` or `{ success: false, error }`.
- **Responsive Strategy**: Tables use horizontal scrolling on mobile to maintain data integrity; forms use single-column stacking.

## Pending Tasks
- [x] Conduct a final manual walk-through of the packaged application.
- [x] Prepare documentation for user operation.


## Contextual Notes
- Always check `electron/main.js` when modifying database logic.
- The `useStore.js` is partitioned into slices; update the corresponding slice for new features.
