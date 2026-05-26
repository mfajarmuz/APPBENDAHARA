-- =========================================================================
-- MIGRATION: Rencana Anggaran Kas (RAK) Belanja Bulanan
-- =========================================================================
-- Jalankan perintah SQL ini di SQL Editor Supabase Anda:
-- Dashboard Supabase -> Proyek Anda -> SQL Editor -> New Query -> Run
-- =========================================================================

ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_jan bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_feb bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_mar bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_apr bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_mei bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_jun bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_jul bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_agu bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_sep bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_okt bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_nov bigint NOT NULL DEFAULT 0;
ALTER TABLE kode_rekening ADD COLUMN IF NOT EXISTS rak_des bigint NOT NULL DEFAULT 0;
