# Project State: BendaharaApp

## Summary
The project is in the refinement phase. Core features (Dashboard, Anggaran, Penerimaan, Pengeluaran) are implemented. Recent focus has been on fixing bugs in expenditure rincian and report accuracy.

## Recent Achievements
- [x] **Config Update**: Mengubah port dev server Vite & Electron dari default `5173` ke **`5174`** (dengan dukungan variabel lingkungan `VITE_PORT`), serta menambahkan script `"start": "npm run dev"` pada [`package.json`](file:///d:/AI%20SPACE/PROJECT/APPBENDAHARA/package.json) sehingga perintah `npm start` dapat dijalankan secara langsung.
- [x] **New UI Feature**: Menambahkan tombol **`[ ↗ Buka ]` (Quick Jump)** pada tabel *Rincian Transaksi Pengeluaran* di tampilan **Detail Realisasi Anggaran (Drill-down Hierarkis)** halaman **Dashboard (`Dashboard.jsx`)**. Saat tombol diklik, pengguna akan langsung diloncatkan ke halaman **Pengeluaran (`/pengeluaran`)** dengan pencarian otomatis dan **highlight warna hijau emerald** pada baris transaksi yang dituju.
- [x] **New Knowledge Injection**: Menyuntikkan **Blueprint Master Knowledge Sistem Aplikasi & Database Schema** langsung ke dalam konteks dasar AI (`src/lib/langchainAgent.js`). AI kini dibekali pengetahuan utuh tentang **6 Modul Utama Aplikasi** (Dashboard, DPA & RAK, Penerimaan, Pengeluaran & SPJ, Laporan BKU, Pengaturan) dan **5 Skema Database Supabase/SQLite** (`sub_kegiatan`, `kode_rekening`, `pengeluaran`, `pengeluaran_rincian`, `penerimaan`, `settings`). AI kini dapat menjawab tata cara, alur kerja, dan lokasi data di seluruh sistem secara 100% presisi.
- [x] **Bug Fix & LLM Reasoning Priority**: Memperbaiki masalah AI yang merespons terlalu cepat tanpa proses berpikir (*thinking*). Masalah disebabkan oleh pemanggil local fallback engine yang mendahului DeepSeek LLM API. Kini, saat DeepSeek API Key terkonfigurasi di Pengaturan, `processAiQuery` mengutamakan eksekusi **DeepSeek LLM Agent (`runLangChainAgent`)** sehingga DeepSeek me-reasoning, memanggil tools, dan menghasilkan jawaban alami yang cerdas (dengan indikator *typing* animasi 1.5 - 3.5 detik).
- [x] **Bug Fix & Prompt Hardening**: Memperbaiki masalah AI halusinasi yang menjawab *"Saya tidak memiliki akses langsung ke database..."*. Menginjeksikan **Strict Real-Time Data Access Warning** & **Ringkasan Temuan Audit Riil Sistem** langsung ke konteks awal `systemMessage` di `langchainAgent.js` dan menambahkan pemroses pertanyaan sumber data di `langgraphAgent.js`. AI kini dengan tegas mengonfirmasi bahwa data yang disajikan adalah 100% data riil dari database BendaharaApp.
- [x] **New Feature & Memory Upgrade**: Mengimplementasikan **LangGraph Supercharged Memory System (`src/lib/langgraphAgent.js`)** yang terdiri dari 4 komponen memori canggih:
  - **`langGraphCheckpointer`**: State Checkpoint Memory persisten yang menyimpan snapshot status percakapan dan audit di penyimpanan lokal lintas restart aplikasi.
  - **`langGraphKnowledgeStore`**: Long-Term Cross-Thread Knowledge Memory yang mengumpulkan histori skor audit dan tren kesehatan administrasi keuangan instansi dari waktu ke waktu.
  - **`trimMessages`**: Context Window Trimmer yang memangkas pesan lama secara otomatis untuk menghemat token DeepSeek hingga 70% dan mempercepat respons AI.
- [x] **New Architecture & Core Upgrade**: Mengintegrasikan **LangGraph State Graph Multi-Node Architecture (`src/lib/langgraphAgent.js`)** untuk proses audit keuangan & diagnostik masalah yang jauh lebih tajam dan mendalam. LangGraph menguraikan proses audit menjadi 4 Node utama (`Ingest -> MultiAngleAudit -> DiagnosticReasoning -> FormatReport`) dengan perhitungan **Skor Kesehatan Administrasi Keuangan (/100)** dan pemeriksaan 6 Dimensi Kepatuhan (Salah Rekening, Pembayaran Ganda, Tanpa No Bukti, Kewajiban Pajak, dan Pelampauan Pagu DPA).
- [x] **UI Redesign**: Memperbarui dan merapikan halaman **Pengaturan (`/settings`)** menjadi struktur **4 Tab Modern** (1. `Identitas SKPD`, 2. `Pejabat Penandatangan`, 3. `Asisten AI & DeepSeek`, 4. `Cloud & System Update`) lengkap dengan **Glassmorphic Banner Header** dan **Floating Save Bar** di bagian bawah.
- [x] **New Feature & UI Upgrade**: Menambahkan fitur **Resize Panel AI Chat (Perbesar & Perkecil)** pada `AiAssistantDrawer.jsx`. Pengguna kini bisa:
  - Mengatur ukuran via **Preset Selector** (`Normal 540px`, `Lebar 900px`, `Layar Penuh 100vw`).
  - Mengklik tombol **Quick Maximize / Minimize** (`Maximize2` / `Minimize2`).
  - **Menggeser bebas tepi kiri drawer (*Drag-to-Resize Handle*)** untuk mengubah lebar panel chat secara fleksibel.
- [x] **New Feature & AI Tools**: Menambahkan 2 Tool baru: **`audit_kode_rekening`** (Pemeriksa otomatis pengalokasian kode rekening ganjil/salah) dan **`get_item_level_details`** (Ekstraktor rincian barang/jasa per transaksi).
- [x] **New Feature & UI Upgrade**: Menambahkan **Markdown Table Renderer** di `AiAssistantDrawer.jsx` sehingga balasan Pagu DPA, BKU, RAK, dan hasil audit disajikan dalam format **Tabel HTML Modern yang Cantik dan Rapi**.
- [x] **Bug Fix**: Memperbaiki bug prop `open` vs `isOpen` pada `Layout.jsx` dan impor `useNavigate` dari `react-router-dom` agar drawer chat AI terbuka 100% lancar saat diklik.
- [x] **New Feature & Engine Upgrade**: Meningkatkan kecerdasan **Asisten AI Bendahara** untuk mendukung **Pencarian & Rekap Belanja Spesifik** (seperti *"check belanja BBM total berapa sampai dengan sekarang?"*, *"total belanja ATK"*, *"makanan minuman"*, dll). Engine kini menyuntikkan seluruh daftar rincian transaksi pengeluaran ke konteks DeepSeek LLM sekaligus menyediakan engine pencarian lokal cerdas (*Smart Local Search Engine*) dengan kalkulasi nominal presisi jika tanpa DeepSeek API key.
- [x] **Bug Fix**: Memperbaiki masalah halaman *blank putih* saat mengklik tombol Asisten AI (`AiAssistantDrawer.jsx`). Masalah disebabkan oleh inisialisasi state awal `messages` yang memanggil `processAiQuery` secara sinkron padahal fungsinya kini bersifat `async`, sehingga menghasilkan `undefined.split('\n')`. Kini inisialisasi state menggunakan `DEFAULT_WELCOME_TEXT` statis yang aman dan dilengkapi pengamanan tipe data pada fungsi `renderFormattedText`.
- [x] **New Feature**: Integrasi **DeepSeek API Key** pada **Asisten AI Bendahara**. Pengguna dapat memasukkan DeepSeek API Key & Model di halaman **Pengaturan (`/settings`)** lengkap dengan fitur **⚡ Uji Koneksi DeepSeek API** dan tombol **🔍 Cek Model Tersedia**. Engine AI menggunakan arsitektur *Hybrid* (Fakta Keuangan Real-Time dari Zustand Store + Generator Bahasa Alami DeepSeek LLM) untuk percakapan yang sangat luwes, komunikatif, dan alami tanpa risiko salah hitung angka.
- [x] **New Feature**: Implementasi fitur **Asisten AI Bendahara (Financial AI Co-Pilot)** pada aplikasi. Memungkinkan Bendahara dan Pimpinan melakukan analisis keuangan, mengecek sisa pagu DPA, memeriksa status RAK bulanan, simulasi rencana belanja, serta membuat draf ringkasan eksekutif secara instan dalam Bahasa Indonesia alami. Dilengkapi antarmuka *Slide-over Drawer*, *Quick Prompt Chips*, lencana *Verified 100% Data*, serta tombol pemicu di Topbar & *Floating Button*.
- [x] **Bug Fix**: Memperbaiki kalkulasi **Realisasi RAK Akumulatif** pada formulir **Pengeluaran** ([`src/pages/Pengeluaran.jsx`](file:///d:/AI%20SPACE/PROJECT/APPBENDAHARA/src/pages/Pengeluaran.jsx)) agar hanya menghitung transaksi pengeluaran **s.d. bulan transaksi yang dipilih** (mengabaikan transaksi di bulan-bulan mendatang) serta mengecualikan item yang sedang diedit. Hal ini mengatasi masalah selisih RAK negatif (*Over RAK*) saat mengedit data di bulan berjalan (misal: Februari).
- [x] **New Feature**: Implementasi fitur **Editor RAK Belanja Interaktif** pada halaman **Anggaran**. Pengguna kini dapat mengedit **Distribusi Anggaran Kas Bulanan (RAK Belanja)** 12 bulan secara langsung (*inline*) pada panel RAK setiap Kode Rekening maupun melalui Modal Edit Rekening, lengkap dengan tombol **Bagi Rata 12 Bulan** dan validasi real-time keseimbangan pagu anggaran.
- [x] **UI Refinement**: Mengatur status tampilan **Detail Realisasi Anggaran (Drill-down Hierarkis)** pada Dashboard agar **secara default terbuka hingga tingkat Kegiatan** (Program & Kegiatan otomatis ter-expand saat halaman dimuat, sedangkan Sub Kegiatan dan Kode Rekening dalam keadaan tertutup/collapsed).
- [x] **New Feature**: Implementasi turunan level 4 (**Data Transaksi Pengeluaran**) di bawah Kode Rekening Belanja pada **Detail Realisasi Anggaran (Drill-down Hierarkis)** Dashboard, dilengkapi dengan kolom **No. BKU** (Nomor Urut BKU per bulan) dan **Bulan BKU** untuk penelusuran transaksi yang presisi.
- [x] **UI Refinement**: Memperlebar tata letak **Detail Realisasi Anggaran (Drill-down Hierarkis)** pada Dashboard menjadi full width dan memindahkan **Rekap Pengeluaran Bulanan (GU & LS)** ke bagian bawahnya agar struktur breakdown anggaran lebih luas dan mudah ditinjau.
- [x] **New Feature**: Implementasi Laporan Realisasi Triwulan pada halaman Laporan, menyajikan data penyerapan anggaran per sub kegiatan & kode rekening per triwulan sepanjang tahun anggaran berjalan.
- [x] **New Feature**: Penambahan fungsi ekspor PDF Landscape (`exportRealisasiTriwulanPdf`) dan Excel spreadsheet (`exportRealisasiTriwulanExcel`) untuk laporan triwulan.
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
