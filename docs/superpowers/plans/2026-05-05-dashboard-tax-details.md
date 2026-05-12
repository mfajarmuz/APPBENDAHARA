# Blueprint: Rincian Pajak Dashboard

## Overview
Menambahkan card atau detail khusus pada Dashboard untuk menampilkan rincian jenis pajak (PPN, PPh 21, PPh 22, PPh 23, PPh 4 ayat 2) yang telah dipungut dan disetor.

## Data Mapping
Pajak diidentifikasi dari:
- **Penerimaan**: `jenis === 'Pajak'` (Pajak yang dipungut/diterima).
- **Pengeluaran**: `uraian` atau `keterangan` yang dimulai dengan "Setoran PP" (Pajak yang disetor).

### Jenis Pajak (Regex Search):
- **PPN**: `/PPN/i`
- **PPh 21**: `/PPh\s*21/i`
- **PPh 22**: `/PPh\s*22/i`
- **PPh 23**: `/PPh\s*23/i`
- **PPh 4 ayat 2**: `/PPh\s*4\s*(ayat|at)\s*2/i`

## UI Changes
1. **New KPI Card**: "Rincian Pajak (Pungut & Setor)"
2. **Visual**: Menggunakan `InteractiveKPICard` dengan detail per jenis pajak.
3. **Warna**: Indigo/Violet untuk membedakan dari penerimaan/pengeluaran umum.

## Implementation Steps
1. **Analyst**: Buat fungsi `useMemo` baru di `Dashboard.jsx` untuk menghitung akumulasi per jenis pajak.
2. **Developer**: Render `InteractiveKPICard` baru di grid KPI.
3. **Tester**: Pastikan total pajak di dashboard sesuai dengan laporan BKU.
