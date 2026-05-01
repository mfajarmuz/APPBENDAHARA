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

### 2.4 Financial Concepts
- **Anggaran (Budget Quota):** Represents the legal spending limit (quota) defined in the DPA for each Activity and Account. It does NOT represent liquid money.
- **Uang Kas (Cash on Hand):** Represents actual liquid funds received through **Penerimaan (SP2D)**. This is the money available to be spent.
- **Relationship:**
  - `Penerimaan` (SP2D) increases **Cash on Hand** but does not change the **Budget Quota**.
  - `Pengeluaran` (Expenditure) decreases **Cash on Hand** AND consumes the **Budget Quota** for the specific account.
  - Total `Cash on Hand` should always be sufficient to cover `Pengeluaran`.
  - `Pengeluaran` cannot exceed the remaining `Budget Quota` (Pagu).

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
