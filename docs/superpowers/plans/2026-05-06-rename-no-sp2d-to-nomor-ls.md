# Rename no_sp2d to nomor_ls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename database field `no_sp2d` to `nomor_ls` for terminology accuracy and update all references in the codebase.

**Architecture:** Database schema update (PostgreSQL) followed by frontend code refactoring. IPC handlers in `main.js` remain unchanged as they use generic payloads.

**Tech Stack:** SQL, React (Zustand), Node.js (Electron).

---

### Task 1: Update Database Schema

**Files:**
- Modify: `01_schema.sql`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Rename field in 01_schema.sql**
- [ ] **Step 2: Rename field in supabase/schema.sql**
- [ ] **Step 3: Commit changes**

### Task 2: Refactor Frontend Code

**Files:**
- Modify: `src/pages/Penerimaan.jsx`
- Modify: `src/pages/Pengeluaran.jsx`
- Modify: `src/lib/bku.js`

- [ ] **Step 1: Replace all occurrences of `no_sp2d` with `nomor_ls` in `src/pages/Penerimaan.jsx`**
- [ ] **Step 2: Replace all occurrences of `no_sp2d` with `nomor_ls` in `src/pages/Pengeluaran.jsx`**
- [ ] **Step 3: Replace all occurrences of `no_sp2d` with `nomor_ls` in `src/lib/bku.js`**
- [ ] **Step 4: Commit changes**

### Task 3: Update Shared Memory and Documentation

**Files:**
- Create: `.gemini/memory/shared/db-schema.yaml`
- Modify: `PROGRESS.md`
- Modify: `.gemini/AGENT_HANDOFF.md`
- Modify: `.gemini/skills/financial-integrity-guard/SKILL.md`

- [ ] **Step 1: Create `db-schema.yaml` with the new schema**
- [ ] **Step 2: Update `PROGRESS.md` to reflect the change**
- [ ] **Step 3: Update `AGENT_HANDOFF.md` to notify other agents**
- [ ] **Step 4: Update `financial-integrity-guard/SKILL.md`**
- [ ] **Step 5: Commit changes**
