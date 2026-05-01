-- BendaharaApp — Database Schema
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

-- Sub Kegiatan (program line items from DPA)
create table if not exists sub_kegiatan (
  id              uuid primary key default gen_random_uuid(),
  kode            text unique not null,
  nama            text not null,
  total_pagu      bigint not null,
  sumber_dana     text default 'PAD',
  tahun_anggaran  integer default 2026,
  created_at      timestamptz default now()
);

-- Kode Rekening (budget account codes, child of sub_kegiatan)
create table if not exists kode_rekening (
  id                uuid primary key default gen_random_uuid(),
  sub_kegiatan_id   uuid references sub_kegiatan(id) on delete cascade,
  kode              text not null,
  uraian            text not null,
  pagu_anggaran     bigint not null,
  created_at        timestamptz default now()
);

-- Penerimaan (SP2D receipts from central government)
create table if not exists penerimaan (
  id          uuid primary key default gen_random_uuid(),
  tanggal     date not null,
  no_sp2d     text,
  jumlah      bigint not null,
  keterangan  text,
  created_at  timestamptz default now()
);

-- Pengeluaran (expenditure header)
create table if not exists pengeluaran (
  id                  uuid primary key default gen_random_uuid(),
  tanggal             date not null,
  no_bukti            text not null,
  sub_kegiatan_id     uuid references sub_kegiatan(id),
  kode_rekening_id    uuid references kode_rekening(id),
  jumlah              bigint not null,
  keterangan          text,
  created_at          timestamptz default now()
);

-- Pengeluaran Rincian (line items for each expenditure)
create table if not exists pengeluaran_rincian (
  id                uuid primary key default gen_random_uuid(),
  pengeluaran_id    uuid references pengeluaran(id) on delete cascade,
  uraian            text not null,
  volume            text,
  jumlah            bigint not null
);

-- Row Level Security (open policy — single user app, no auth)
alter table sub_kegiatan enable row level security;
alter table kode_rekening enable row level security;
alter table penerimaan enable row level security;
alter table pengeluaran enable row level security;
alter table pengeluaran_rincian enable row level security;

create policy "allow all" on sub_kegiatan for all using (true) with check (true);
create policy "allow all" on kode_rekening for all using (true) with check (true);
create policy "allow all" on penerimaan for all using (true) with check (true);
create policy "allow all" on pengeluaran for all using (true) with check (true);
create policy "allow all" on pengeluaran_rincian for all using (true) with check (true);
