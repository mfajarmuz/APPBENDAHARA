# Implementasi Kalkulator Pajak Indonesia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan fitur kalkulator pajak terpadu untuk simulasi PPN & PPh sesuai aturan terbaru.

**Architecture:** Implementasi komponen React tunggal dengan state lokal (volatile) untuk perhitungan pajak otomatis berdasarkan kategori transaksi.

**Tech Stack:** React, Tailwind CSS, Lucide Icons, Format Utils.

---

### Task 1: Scaffolding Halaman Baru

**Files:**
- Create: `src/pages/KalkulatorPajak.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: Buat komponen halaman dasar**
```jsx
import React, { useState } from 'react'
import Layout from '../components/Layout'

const KalkulatorPajak = () => {
  return (
    <Layout title="Kalkulator Pajak">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Fitur Segera Datang</h1>
      </div>
    </Layout>
  )
}
export default KalkulatorPajak
```
- [ ] **Step 2: Daftarkan rute di App.jsx**
- [ ] **Step 3: Tambahkan menu di Sidebar.jsx**
- [ ] **Step 4: Commit**

### Task 2: Implementasi Logika Perhitungan (Core)

**Files:**
- Modify: `src/pages/KalkulatorPajak.jsx`
- Test: `src/test/pajak.test.js`

- [ ] **Step 1: Tulis unit test untuk verifikasi tarif**
- [ ] **Step 2: Implementasikan fungsi hitungPajak(bruto, kategori, hasNpwp)**
- [ ] **Step 3: Pastikan pembulatan DPP (Bruto / 1.11) menggunakan Math.round**
- [ ] **Step 4: Verifikasi hasil hitung dengan unit test**
- [ ] **Step 5: Commit**

### Task 3: Pembangunan UI & Visual

**Files:**
- Modify: `src/pages/KalkulatorPajak.jsx`

- [ ] **Step 1: Buat Form Input (Nilai Bruto, Kategori Dropdown, Toggle NPWP)**
- [ ] **Step 2: Buat Result Panel (Kartu Ringkasan dengan Rincian Pajak)**
- [ ] **Step 3: Terapkan styling Tailwind untuk keterbacaan tinggi**
- [ ] **Step 4: Tambahkan tombol "Reset" untuk membersihkan input**
- [ ] **Step 5: Commit**

### Task 4: Finalisasi & Verifikasi

- [ ] **Step 1: Jalankan npm run build untuk memastikan tidak ada error**
- [ ] **Step 2: Lakukan walk-through simulasi berbagai skenario pajak**
- [ ] **Step 3: Update PROGRESS.md**
- [ ] **Step 4: Commit**
