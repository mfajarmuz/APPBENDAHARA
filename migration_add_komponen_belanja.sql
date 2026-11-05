-- ==============================================================================
-- Migration: Tambah Tabel komponen_belanja (Rincian Komponen Belanja per Rekening)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS komponen_belanja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_rekening_id uuid NOT NULL REFERENCES kode_rekening(id) ON DELETE CASCADE,
  kode text,
  nama text NOT NULL,
  spesifikasi text,
  volume numeric DEFAULT 1,
  satuan text DEFAULT 'Paket',
  harga_satuan bigint DEFAULT 0,
  total bigint NOT NULL DEFAULT 0,
  keterangan text,
  created_at timestamptz DEFAULT now()
);

-- Index untuk performa join kode_rekening
CREATE INDEX IF NOT EXISTS idx_komponen_belanja_rek_id ON komponen_belanja(kode_rekening_id);
