-- Tabel program
CREATE TABLE program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabel kegiatan
CREATE TABLE kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES program(id) ON DELETE CASCADE,
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabel sub_kegiatan
CREATE TABLE sub_kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kegiatan_id uuid REFERENCES kegiatan(id) ON DELETE CASCADE,
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  total_pagu bigint NOT NULL,
  sumber_dana text DEFAULT 'PAD',
  tahun_anggaran integer DEFAULT 2026,
  created_at timestamptz DEFAULT now()
);

-- Tabel kode_rekening
CREATE TABLE kode_rekening (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_kegiatan_id uuid REFERENCES sub_kegiatan(id) ON DELETE CASCADE,
  kode text NOT NULL,
  uraian text NOT NULL,
  pagu_anggaran bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabel penerimaan
CREATE TABLE penerimaan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis text NOT NULL DEFAULT 'SP2D',
  tanggal date NOT NULL,
  no_sp2d text,
  jumlah bigint NOT NULL,
  keterangan text,
  created_at timestamptz DEFAULT now()
);

-- Tabel pengeluaran
CREATE TABLE pengeluaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  no_bukti text,
  sub_kegiatan_id uuid REFERENCES sub_kegiatan(id),
  kode_rekening_id uuid REFERENCES kode_rekening(id),
  jumlah bigint NOT NULL,
  keterangan text,
  created_at timestamptz DEFAULT now()
);

-- Tabel pengeluaran_rincian
CREATE TABLE pengeluaran_rincian (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pengeluaran_id uuid REFERENCES pengeluaran(id) ON DELETE CASCADE,
  uraian text NOT NULL,
  volume text,
  jumlah bigint NOT NULL
);
