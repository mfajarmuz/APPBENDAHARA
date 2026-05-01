# BendaharaApp High-Level Design

**Date:** 2026-05-01
**Project:** BendaharaApp (Treasurer Management Application)
**Tech Stack:** React, Electron, Supabase, Tailwind CSS, Zustand, Vitest

## 1. Overview
BendaharaApp is a desktop application designed for treasurers (Bendahara) to manage budgets (Anggaran), receipts (Penerimaan), and expenditures (Pengeluaran). It aims to automate financial reporting and provide real-time budget tracking.

## 2. Architecture & Data Model
### 2.1 State Management
- **Zustand:** Centralized store in `src/store/useStore.js`.
- **Modules:** State should be partitioned by domain:
  - `anggaran`: sub_kegiatan and kode_rekening.
  - `transaksi`: penerimaan and pengeluaran.
  - `ui`: loading states, notifications, modals.

### 2.2 IPC Bridge (Electron)
- `electron/main.js`: Handles Supabase CRUD operations securely.
- `electron/preload.js`: Exposes `window.api` to the React frontend.
- **Pattern:** Every IPC call should return a consistent response format `{ data, error }`.

### 2.3 Data Model (Supabase)
- `sub_kegiatan`: Program line items (kode, nama, total_pagu).
- `kode_rekening`: Child of sub_kegiatan (kode, uraian, pagu_anggaran).
- `penerimaan`: SP2D receipts (tanggal, no_sp2d, jumlah).
- `pengeluaran`: Expenditure header (tanggal, no_bukti, sub_kegiatan_id, kode_rekening_id).
- `pengeluaran_rincian`: Line items for expenditures (uraian, volume, jumlah).

## 3. UI/UX Standards
### 3.1 Design System
- **Framework:** Tailwind CSS.
- **Components:** Reusable UI components in `src/components/ui/`.
- **Style:** Professional, clean, and minimalist using Indigo/Slate color palette.
- **Icons:** Lucide React.

### 3.2 Layout
- `Layout.jsx`: Main wrapper with `Sidebar` and `Topbar`.
- `Sidebar`: Navigation links (Dashboard, Anggaran, Penerimaan, Pengeluaran, Laporan).
- `Topbar`: Current page title, user info (if any), and quick actions.

## 4. Feature Requirements
### 4.1 Dashboard
- KPI Cards: Total Pagu, Total Realisasi, Sisa Anggaran, Total Penerimaan.
- Charts: Monthly expenditure trends, Realization vs Budget per Sub-Kegiatan.

### 4.2 Laporan (Reports)
- **Buku Kas Umum (BKU):** Chronological list of receipts and expenditures.
- **Buku Pembantu:** Filtered by account or activity.
- **Export:** High-quality Excel (.xlsx) and PDF (.pdf) generation.

### 4.3 Transaction Management
- Robust forms for Penerimaan and Pengeluaran with validation.
- Ability to add multiple line items (`rincian`) for each expenditure.

## 5. Development Guidelines
- **TDD:** Write tests in `src/test/` for business logic and components.
- **Code Quality:** Prefer small, functional components and hooks.
- **IPC Safety:** Never expose Supabase keys directly to the frontend.
