-- Jalankan perintah SQL ini di SQL Editor Supabase Anda
-- Dashboard Supabase -> Project Anda -> SQL Editor -> New Query -> Run

ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS file_pdf_id text;
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS file_pdf_name text;
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS file_pdf_link text;
