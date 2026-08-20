# APPBENDAHARA Live Preview Workflow

Keputusan kerja:

- Live revision cepat memakai **web live preview** dari server.
- Final desktop verification memakai **Electron desktop** dari laptop/Windows dengan cara pull repo lalu `npm run dev`.

## 1. Live preview dari laptop, app jalan di server

Di server, jalankan:

```bash
cd /home/fajar/projects/APPBENDAHARA/.worktrees/app-stabilization
npm run dev:vite
```

Vite berjalan di:

```text
http://127.0.0.1:5174/
```

Di laptop, buat SSH tunnel ke server-ai:

```bash
ssh -L 5174:127.0.0.1:5174 fajar@100.76.252.9
```

Biarkan terminal SSH tunnel tetap terbuka, lalu buka browser laptop:

```text
http://localhost:5174
```

Saat Nyxera mengedit file React/CSS di server, browser laptop akan hot reload.

## 2. Yang bisa direvisi live lewat web preview

- UI React
- CSS/Tailwind
- layout halaman
- validasi form frontend
- tabel/filter/search
- flow data Supabase dari renderer
- logic frontend/Zustand
- sebagian export yang punya fallback web/browser mode

## 3. Yang perlu Electron desktop final check

- Electron IPC
- preload bridge
- file dialog native
- save/open file desktop
- print/export via Electron API
- auto updater
- packaged-app behavior
- bug khusus Windows

## 4. Final desktop verification di laptop Windows

Di laptop Windows:

```bash
git clone https://github.com/mfajarmuz/APPBENDAHARA.git
cd APPBENDAHARA
npm ci
```

Buat `.env` lokal dengan Supabase URL dan anon key yang sama:

```env
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Lalu jalankan:

```bash
npm run dev
```

Ini membuka Electron desktop window tanpa membuat installer/build.

## 5. Alur kerja harian

1. Nyxera membuat branch/worktree task.
2. Nyxera menjalankan `npm run dev:vite` di server.
3. Tuan membuka `http://localhost:5174` via SSH tunnel.
4. Nyxera revisi live sampai UI/flow disetujui.
5. Nyxera menjalankan:

```bash
npm test
npm run build
```

6. Commit + push branch.
7. Tuan pull branch/main di laptop Windows.
8. Tuan jalankan:

```bash
npm run dev
```

9. Final desktop behavior dicek di Electron Windows.
