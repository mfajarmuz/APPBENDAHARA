# APPBENDAHARA Desktop Development Workflow

Tujuan: APPBENDAHARA tetap berbasis desktop Electron, tetapi bisa dilihat dan didebug dulu tanpa membuat installer/build Windows.

## Mode kerja utama

### 1. Desktop Dev Mode — utama untuk pengembangan

Gunakan:

```bash
npm run dev
```

Script ini menjalankan dua proses:

```bash
npm run dev:vite      # Vite dev server di http://localhost:5174
npm run dev:electron  # Electron membuka UI dari Vite dev server
```

Di mode ini:

- aplikasi tampil sebagai desktop window Electron;
- DevTools otomatis terbuka dari `electron/main.js`;
- tidak perlu `electron-builder`;
- tidak perlu membuat installer `.exe`/`.AppImage`;
- cocok untuk debugging UI, state, IPC, Supabase, PDF/Excel export, dan logic bisnis.

### 2. Web Preview Mode — cepat untuk cek UI

Gunakan:

```bash
npm run dev:vite
```

Lalu buka:

```text
http://localhost:5174
```

Mode ini cepat untuk melihat UI React, tapi fitur yang bergantung pada Electron IPC bisa berbeda/terbatas.

### 3. Production Web Build Preview — cek hasil bundle frontend

Gunakan:

```bash
npx vite build
npm run preview
```

Catatan: untuk baseline build frontend, gunakan `npx vite build`, bukan `npm run build`.

## Jangan gunakan `npm run build` untuk preview harian

Saat ini `package.json` berisi:

```json
"build": "npm version patch && vite build && electron-builder"
```

Artinya `npm run build` akan:

1. menaikkan versi package,
2. mencoba commit/tag via git,
3. build frontend,
4. menjalankan Electron Builder.

Ini cocok untuk release, bukan untuk debugging harian. Untuk preview harian gunakan `npm run dev` atau `npx vite build`.

## Environment lokal

File `.env` harus ada di root project/worktree dan tidak boleh di-commit.

Wajib tersedia:

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Electron main process membaca:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

React/Vite renderer membaca:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Workflow setiap task

1. Masuk worktree:

```bash
cd /home/fajar/projects/APPBENDAHARA/.worktrees/nyxera-setup
```

2. Pastikan branch benar:

```bash
git branch --show-current
```

Expected:

```text
nyxera/project-setup
```

3. Jalankan baseline test:

```bash
npm test
```

4. Jalankan desktop dev mode:

```bash
npm run dev
```

5. Debug lewat:

- Electron DevTools Console;
- terminal log dari Electron main process;
- Network tab untuk request Supabase;
- Vitest untuk logic/unit test.

6. Sebelum commit:

```bash
npm test
npx vite build
```

7. Commit kecil per perubahan:

```bash
git status
git add <files>
git commit -m "type: short description"
```

8. Push setelah disetujui:

```bash
git push -u origin nyxera/project-setup
```

## Debug Windows tanpa build

Bisa, dengan syarat dijalankan di Windows/laptop Windows:

```bash
npm ci
copy .env.example .env
# isi .env
npm run dev
```

Ini membuka Electron window di Windows tanpa build installer.

Yang bisa didebug tanpa build:

- UI React;
- Supabase call;
- Zustand store;
- IPC main/preload;
- PDF/Excel export;
- sebagian besar desktop behavior.

Yang tetap perlu build/Windows packaging:

- installer NSIS;
- auto updater;
- file path/perizinan spesifik installer;
- bug yang hanya muncul pada packaged app;
- code signing/release.

## Rekomendasi perbaikan script berikutnya

Pisahkan script development, packaging, dan release:

```json
{
  "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
  "dev:vite": "vite",
  "dev:electron": "wait-on http://localhost:5174 && electron .",
  "build:web": "vite build",
  "build:desktop": "vite build && electron-builder",
  "release:patch": "npm version patch && npm run build:desktop"
}
```

Dengan ini, `build:web` dan `build:desktop` tidak diam-diam menaikkan versi.
