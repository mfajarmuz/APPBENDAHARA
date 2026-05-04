# Design Spec: Excel Import for Pengeluaran

## 1. Overview
The goal is to allow users to bulk-upload expenditure data from an Excel file. The system will parse the file, map combined activity/account codes to database IDs, validate financial constraints, and provide a preview before final submission.

## 2. Data Mapping Logic
The Excel template contains a combined code in the "Kode Rekening" column (e.g., `5.02.01.1.09.02.5.1.02.03.02.0036`).

### Smart Splitting
The system will attempt to resolve IDs using the following logic:
1.  **Sub Kegiatan Lookup**: Match the prefix of the Excel code against `sub_kegiatan.kode`. Since formats may vary (e.g., `5.02.01.1.09.02` vs `5.02.01.1.09.0002`), the matcher will normalize codes by removing leading zeros in segments or using partial matching.
2.  **Kode Rekening Lookup**: Match the suffix against `kode_rekening.kode` within the identified `sub_kegiatan`.
3.  **Automatic "Dibayar" Prefix**: If the "Uraian" in Excel doesn't start with "Dibayar", the system will prepend it during import to maintain consistency with existing data.

## 3. Validation Rules
Each row in the Excel file must pass three checks to be marked as "Ready":
1.  **Code Resolution**: Both Sub Kegiatan and Kode Rekening must exist in the database.
2.  **Pagu Check**: `Amount <= (Pagu Anggaran - Existing Realization)`.
3.  **Cash Check**: `Total Import Amount <= Current Real Cash Balance` (Total Penerimaan - Total Pengeluaran).

## 4. UI Components

### Modal Import (`ImportModal.jsx`)
- **File Upload**: Drag-and-drop or file picker for `.xlsx`.
- **Preview Table**:
    - Columns: Status (Icon), Tanggal, Kode (Split), Uraian, Jumlah.
    - Row highlighting: Red for errors, Green for valid.
- **Action Footer**:
    - "Batal": Close modal.
    - "Import [N] Transaksi": Active only if at least one valid row exists. (Option: Import only valid rows, skip invalid).

## 5. Implementation Steps
1.  **Excel Parser Utility**: Create a function to convert `xlsx` rows to internal Transaction objects.
2.  **Matcher Logic**: Implement the fuzzy/normalized code matcher.
3.  **UI Integration**: Add the "Import" button to `Pengeluaran.jsx` and implement the `ImportModal`.
4.  **Bulk Storage**: Update `useStore.js` or create a utility to handle sequential/batch `addPengeluaran` calls.

## 6. Success Criteria
- User can upload the specific template `temlpate-input-pengeuaran.xlsx`.
- System correctly identifies Sub Kegiatan "Penyediaan Jasa Pemeliharaan..." from code `5.02.01.1.09.02...`.
- Transactions are created individually (separate No. Bukti) as requested.
- UI provides clear feedback on why a row might fail (e.g., "Pagu Habis").
