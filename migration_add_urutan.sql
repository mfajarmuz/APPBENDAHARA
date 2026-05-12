-- Migration: Add urutan column for Drag & Drop sorting
ALTER TABLE penerimaan ADD COLUMN IF NOT EXISTS urutan integer DEFAULT 0;
ALTER TABLE pengeluaran ADD COLUMN IF NOT EXISTS urutan integer DEFAULT 0;
