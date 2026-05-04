# Excel Import for Pengeluaran Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a bulk upload feature for expenditures using the provided Excel template.

**Architecture:** A client-side parser reads Excel data, matches combined codes to database IDs using a normalized matcher, and provides a preview UI for validation and batch submission.

**Tech Stack:** React, xlsx (SheetJS), Zustand (Store), Lucide Icons, Tailwind CSS.

---

### Task 1: Create Excel Matcher Utility

**Files:**
- Create: `src/lib/excel-matcher.js`
- Test: `src/test/excel-matcher.test.js`

- [ ] **Step 1: Write tests for code matching**
```javascript
import { describe, it, expect } from 'vitest'
import { matchCodes } from '../lib/excel-matcher'

describe('excel-matcher', () => {
  const subKegiatan = [{ id: 'sk1', kode: '5.02.01.1.06.0005' }]
  const kodeRekening = [{ id: 'kr1', sub_kegiatan_id: 'sk1', kode: '5.1.02.02.01.0001' }]

  it('should match combined code with varying zero padding', () => {
    const excelCode = '5.02.01.1.06.05.5.1.02.02.01.0001'
    const result = matchCodes(excelCode, subKegiatan, kodeRekening)
    expect(result.subKegiatanId).toBe('sk1')
    expect(result.kodeRekeningId).toBe('kr1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/test/excel-matcher.test.js`

- [ ] **Step 3: Implement normalized matching logic**
```javascript
export function normalize(code) {
  return code.split('.').map(s => parseInt(s, 10).toString()).join('.')
}

export function matchCodes(combinedCode, allSk, allKr) {
  const parts = combinedCode.split('.')
  // Try to find the split point where prefix matches SK and suffix matches KR
  for (let i = 1; i < parts.length; i++) {
    const prefix = parts.slice(0, i).join('.')
    const suffix = parts.slice(i).join('.')
    
    const sk = allSk.find(s => normalize(s.kode) === normalize(prefix))
    if (sk) {
      const kr = allKr.find(r => r.sub_kegiatan_id === sk.id && normalize(r.kode) === normalize(suffix))
      if (kr) return { subKegiatanId: sk.id, kodeRekeningId: kr.id, sk, kr }
    }
  }
  return { error: 'Kode tidak ditemukan' }
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/test/excel-matcher.test.js`

- [ ] **Step 5: Commit**
`git add src/lib/excel-matcher.js src/test/excel-matcher.test.js && git commit -m "feat: add excel code matcher utility"`

---

### Task 2: Implement Import Modal Component

**Files:**
- Create: `src/components/ui/ImportModal.jsx`
- Modify: `src/components/ui/Modal.jsx` (if needed for scrollable content)

- [ ] **Step 1: Create the basic UI structure for the modal**
Implement a modal that accepts a file, uses `xlsx` to parse it, and shows a preview table with status icons.

- [ ] **Step 2: Implement validation logic in preview**
For each row, check: `matchCodes`, sisa pagu (using store data), and total cash balance.

- [ ] **Step 3: Add "Process Import" action**
Loop through valid rows and call `addPengeluaran` from the store.

---

### Task 3: Integrate into Pengeluaran Page

**Files:**
- Modify: `src/pages/Pengeluaran.jsx`

- [ ] **Step 1: Add the "Import Excel" button**
Add it next to "Tambah Pengeluaran Baru".

- [ ] **Step 2: Connect state for Modal visibility**
Handle `importModalOpen` state.

---

### Task 4: Final Verification

- [ ] **Step 1: Manual test with the template**
Upload `res/temlpate-input-pengeuaran.xlsx` and verify it correctly parses and validates.

- [ ] **Step 2: Check database persistence**
Verify records are created in `pengeluaran` and `pengeluaran_rincian` tables.
