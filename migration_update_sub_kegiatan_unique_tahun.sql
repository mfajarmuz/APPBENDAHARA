-- ============================================================
-- Migration: Update sub_kegiatan unique constraint for Multi-Tahun Anggaran
-- ============================================================
-- Memungkinkan kode sub kegiatan yang sama digunakan kembali pada
-- tahun anggaran yang berbeda (misal: 2026, 2027, dst.)
-- ============================================================

-- 1. Hapus unique constraint lama pada kolom 'kode' saja
ALTER TABLE sub_kegiatan DROP CONSTRAINT IF EXISTS sub_kegiatan_kode_key;

-- 2. Pastikan kolom tahun_anggaran ada dan default 2026
ALTER TABLE sub_kegiatan ADD COLUMN IF NOT EXISTS tahun_anggaran integer DEFAULT 2026;

-- 3. Tambahkan unique constraint gabungan (kode, tahun_anggaran)
ALTER TABLE sub_kegiatan ADD CONSTRAINT sub_kegiatan_kode_tahun_unique UNIQUE (kode, tahun_anggaran);
