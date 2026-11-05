-- Migrasi: Menambahkan tabel settings untuk sinkronisasi Pengaturan Instansi & Tahun Anggaran lintas perangkat
CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY DEFAULT 'global',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
