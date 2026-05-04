# Project State: BendaharaApp

## Summary
The project is in the refinement phase. Core features (Dashboard, Anggaran, Penerimaan, Pengeluaran) are implemented. Recent focus has been on fixing bugs in expenditure rincian and report accuracy.

## Recent Achievements
- [x] Refactored Zustand store to partitioned slices.
- [x] Standardized IPC error handling in `main.js`.
- [x] Implemented KPI Cards and Realization charts on Dashboard.
- [x] Added BKU, Buku Pembantu, and LRA reports in Laporan page.
- [x] **Team Capability**: Created specialized sub-agents (`system-architect`, `devops-agent`, `bug-checker`, `frontend-dev`, `backend-dev`) to handle modular development tasks.
- [x] **New Feature**: Added advanced hierarchical filtering (Bulan, Program, Kegiatan, Sub Kegiatan, Kode Rekening) on Pengeluaran page with date sorting.
- [x] **Terminology Update**: Renamed "SP2D" to "LS" across UI, reports, and validation logic (maintaining `no_sp2d` database column for compatibility).
- [x] **New Feature**: Added tax mechanism choice ("Pungut & Setor" vs "Hanya Setor") in Expenditure form to allow flexible tax recording.
- [x] **New Feature**: Implemented dynamic Sorting for Pengeluaran table (Sort by Date, Budget Code, Description, and Amount) with visual indicators.
- [x] **New Feature**: Full App Responsiveness (Mobile, Tablet, Desktop).
    - Refactored Modal system to use dynamic sizing.
    - Implemented horizontal scrolling for all data-heavy tables.
    - Optimized form grids and layout padding for smaller screens.
- [x] **New Feature**: Implemented user settings for `unit_kerja`, `jabatan`, and `NIP/Nama` for KPA/BPP with "Reset to Default" functionality.
- [x] **UI/UX Fix**: Fixed Dashboard layout issues (text truncation, overlapping transactions, and improved status badge logic).
- [x] **Business Logic**: Implemented mandatory Budget Code (Kode Rekening) for SP2D receipts in Penerimaan page.
- [x] **UX Optimization**: Enabled direct copy-paste from Excel for Date (DD-MM-YYYY) and Currency (Rp) formats in Penerimaan/Pengeluaran forms.
- [x] **UX Optimization**: Implemented Searchable Dropdowns (Type-to-search) for Sub Kegiatan and Budget Codes in both Penerimaan and Pengeluaran pages.
- [x] **New Feature**: Added advanced real-time Filtering and Text Search for both Penerimaan and Pengeluaran pages (Filter by Month, Type, Reference No, and Description/Uraian).
- [x] **New Feature**: Integrated Tax (PPN/PPh) input for both SP2D Receipts and Expenditure. A single form submission now automatically creates separate, sequential records in reports, keeping taxes grouped under their parent transaction.
- [x] **New Feature**: Connected application settings to official PDF report signatures (BKU, Buku Pembantu).
- [x] **Bug Fix**: Fixed `parseRupiah` logic to correctly handle negative signs after currency prefix and handle Indonesian decimal formats.
- [x] **Stability**: Implemented server-side Pagu (Budget) validation and Rincian consistency checks in `main.js` IPC handlers.
- [x] **New Feature**: Added Budget Year (Tahun Anggaran) selection and filtering in Laporan page to support multi-year data.
- [x] **New Feature**: Menambahkan nomor urut BKU pada kolom 'No' di header NPD (sinkron dengan laporan BKU yang mencakup gabungan Penerimaan & Pengeluaran) dan memperbaiki pemetaan field Program agar tampil lengkap (Kode & Nama) sesuai relasi database.
- [x] **Bug Fix**: Memperbaiki error "Invalid arguments passed to jsPDF.rect" pada cetak NPD dengan cara menggabungkan baris jumlah ke dalam footer tabel utama (mencegah kalkulasi lebar kolom NaN pada colSpan).
- [x] **Bug Fix**: Memperbaiki fungsi cetak PDF untuk dokumen NPD yang sebelumnya gagal akibat kesalahan referensi properti `settings.pptk_jabatan` pada `localStorage` lama yang tidak memiliki field tersebut. Perbaikan mencakup merge default settings secara otomatis dan handling fallback property di modul `export-pdf.js`.
- [x] **Bug Fix**: Improved NPD PDF realisasi calculation to ensure correct accumulation for multiple transactions on the same day.
- [x] **Bug Fix**: Memperbaiki ketidaksinkronan nomor urut BKU pada laporan NPD dengan memusatkan logika perhitungan BKU ke dalam fungsi utilitas `getBkuRows`. Perbaikan mencakup sinkronisasi `priority` map dan penambahan kriteria sorting stabil menggunakan `id` dan `type` sebagai fallback terakhir untuk mencegah pergeseran nomor pada transaksi yang terjadi di hari yang sama.
- [x] **New Feature**: Menambahkan fitur unduh batch NPD untuk satu bulan penuh. Refaktorisasi logika ekspor PDF untuk mendukung penggabungan beberapa dokumen ke dalam satu file PDF dan menambahkan tombol "Cetak Batch NPD" yang muncul secara dinamis saat filter bulan aktif di halaman Pengeluaran.
- [x] **Testing**: Verified all fixes with new unit tests in `bug_repro.test.js` and `export-pdf.test.js`.

## Known Issues / Bugs
- [ ] Testing: Need more coverage for edge cases in IPC error propagation.

## Architecture Decisions
- **Source of Truth**: Database calculations (Pagu) must be derived from `kode_rekening` to ensure consistency.
- **IPC Response**: All handlers return `{ success: true, data }` or `{ success: false, error }`.
- **Responsive Strategy**: Tables use horizontal scrolling on mobile to maintain data integrity; forms use single-column stacking.

## Pending Tasks
- [ ] Conduct a final manual walk-through of the packaged application.
- [ ] Prepare documentation for user operation.

- [ ] Prepare documentation for user operation.


## Contextual Notes
- Always check `electron/main.js` when modifying database logic.
- The `useStore.js` is partitioned into slices; update the corresponding slice for new features.
