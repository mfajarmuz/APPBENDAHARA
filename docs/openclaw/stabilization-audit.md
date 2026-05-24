# APPBENDAHARA Stabilization Sprint 1 Audit

Tanggal: 2026-05-24
Branch kerja: `nyxera/app-stabilization`
Worktree: `/home/fajar/projects/APPBENDAHARA/.worktrees/app-stabilization`

## Tujuan

Membuat baseline kerja yang aman sebelum fitur baru: dependency terpasang, test jalan, build aman, Supabase tersambung, dan desktop dev workflow jelas.

## Hasil baseline

| Area | Command | Status | Catatan |
| --- | --- | --- | --- |
| Install dependency | `npm ci` | PASS | 814 packages installed. Ada deprecated package warnings. |
| Unit/integration tests | `npm test` | PASS | 10 test files / 44 tests passed. |
| Frontend build | `npm run build` | PASS | Vite build sukses. Large chunk warning masih ada. |
| Supabase connectivity | custom Node script | PASS | Semua tabel utama bisa di-query limit 1. |
| Dependency security | `npm audit --audit-level=low` | ATTENTION | 18 vulnerabilities: 1 low, 4 moderate, 12 high, 1 critical. |
| Electron headless smoke | `xvfb-run ... npm run dev` | BLOCKED | `xvfb-run` belum tersedia di server. Butuh install `xvfb` atau gunakan display fisik/kiosk. |

## Supabase tables verified

Query `select('*').limit(1)` berhasil untuk:

- `program`
- `kegiatan`
- `sub_kegiatan`
- `kode_rekening`
- `penerimaan`
- `pengeluaran`
- `pengeluaran_rincian`

## Known warnings / risks

### 1. Security vulnerabilities

`npm audit` melaporkan:

- 1 low
- 4 moderate
- 12 high
- 1 critical

High/critical package paths yang perlu diprioritaskan:

- `jspdf` — critical
- `jspdf-autotable` — high via `jspdf`
- `xlsx` — high
- `electron` — high
- `electron-builder` / `app-builder-lib` / `dmg-builder` / `electron-builder-squirrel-windows` — high
- `tar`, `node-gyp`, `cacache`, `make-fetch-happen`, `@electron/rebuild` — high transitive/build chain

Jangan gunakan `npm audit fix --force` tanpa review karena bisa memecahkan Electron/export PDF/Excel.

### 2. Vite large chunk warning

Build menghasilkan chunk utama sekitar 1.88 MB setelah minification. Ini belum fatal, tapi nanti sebaiknya dipecah dengan dynamic import atau manual chunks.

### 3. Electron smoke test di server

Server belum punya `xvfb-run`, jadi smoke test Electron headless belum bisa dilakukan. Opsi:

1. install `xvfb` dengan sudo, lalu jalankan smoke test headless;
2. gunakan display fisik/kiosk;
3. jalankan `npm run dev` di laptop Windows untuk smoke test Windows tanpa build.

## Rekomendasi sprint berikutnya

1. Buat script smoke test desktop yang tidak tergantung manual klik.
2. Tambahkan Playwright/Electron smoke test minimal jika feasible.
3. Review upgrade `jspdf`, `jspdf-autotable`, dan `xlsx` secara bertahap dengan test export PDF/Excel.
4. Buat manual walkthrough checklist untuk fitur bendahara utama.
5. Jika ingin debug di server secara headless, install `xvfb`.
