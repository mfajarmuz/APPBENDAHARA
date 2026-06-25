-- Tambah kolom deleted_at di tabel penerimaan
ALTER TABLE penerimaan ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- Tambah kolom deleted_at di tabel pengeluaran
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
