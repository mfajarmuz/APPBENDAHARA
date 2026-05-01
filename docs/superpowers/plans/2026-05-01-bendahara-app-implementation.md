# BendaharaApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the BendaharaApp by standardizing the architecture and implementing the Dashboard and Reports features.

**Architecture:** Modular Hybrid approach focusing on architectural standardization while building new features. Uses Electron IPC for Supabase interactions and Zustand for state management.

**Tech Stack:** React, Electron, Supabase, Tailwind CSS, Zustand, Recharts, jsPDF, XLSX.

---

### Task 1: Architectural Standardization

**Files:**
- Modify: `src/store/useStore.js`
- Modify: `electron/main.js`
- Modify: `electron/preload.js`

- [x] **Step 1: Refactor Zustand Store**
  Refactor `useStore.js` to use partitioned state (slices) for better organization.
- [x] **Step 2: Standardize IPC Error Handling**
  Ensure all IPC handlers in `main.js` wrap Supabase calls in try-catch and return consistent objects.
- [x] **Step 3: Update Preload API**
  Verify all necessary methods are exposed in `preload.js` with clear naming.

  - Completed: commit 5572fc1 (Task 1 implemented by automated subagent)

### Task 2: UI Component Standardization

**Files:**
- Create/Modify: `src/components/ui/`
- Modify: `src/index.css`

- [x] **Step 1: Audit & Refine UI Components**
  Ensure components like `Button`, `Modal`, and `Input` are using consistent Tailwind styles and props.
- [x] **Step 2: Global Layout Polish**
  Update `Layout.jsx`, `Sidebar.jsx`, and `Topbar.jsx` for a cohesive "Office/Finance" look.

  - Completed: commit 100bb05 (Task 2 implemented by automated subagent)

### Task 3: Dashboard Implementation

**Files:**
- Modify: `src/pages/Dashboard.jsx`
- Create: `src/components/DashboardCharts.jsx`

- [x] **Step 1: Implement KPI Cards**
  Calculate and display Total Pagu, Realization, and Remaining Budget.
- [x] **Step 2: Add Expenditure Trends Chart**
  Use Recharts to show monthly spending patterns.
- [x] **Step 3: Realization vs Budget Chart**
  Visual comparison per `sub_kegiatan`.

  - Completed: commit (implemented by automated agent)

### Task 4: Laporan (Reports) Module

**Files:**
- Modify: `src/pages/Laporan.jsx`
- Modify: `src/lib/export-pdf.js`
- Modify: `src/lib/export-excel.js`

- [x] **Step 1: BKU (Buku Kas Umum) View**
  Implement the main chronological view of all transactions.
- [x] **Step 2: PDF Export (jsPDF)**
  Create templates for official BKU and Buku Pembantu PDF reports.
- [x] **Step 3: Excel Export (xlsx)**
  Implement data export to formatted Excel sheets.

  - Completed: commit (implemented by automated agent)

### Task 5: Testing & Finalization

**Files:**
- Create: `src/test/store.test.js`
- Create: `src/test/components.test.js`

- [x] **Step 1: Store Logic Tests**
  Verify state updates and API interactions.
- [x] **Step 2: Component Snapshot/Unit Tests**
  Ensure UI components render correctly.
- [x] **Step 3: Final Build Check**
  Run `npm run build` to ensure the Electron app packages correctly.

  - Completed: All tests passed and architecture standardized.
