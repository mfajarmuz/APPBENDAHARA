-- Tabel periode_kunci
CREATE TABLE IF NOT EXISTS periode_kunci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan integer NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  tahun integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bulan, tahun)
);
