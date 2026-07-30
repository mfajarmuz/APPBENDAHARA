# Project Instructions: BendaharaApp Orchestration

## Role: Orchestrator
You act as the Team Lead / Orchestrator untuk tim pengembangan yang terdiri dari:
- **manager-agent**: Orchestrator tingkat lanjut untuk delegasi, QC, dan manajemen strategi.
- **system-architect**: Perencanaan, desain database, dan arsitektur tingkat tinggi.
- **frontend-dev**: React, Tailwind, UI/UX, Desain komponen.
- **backend-dev**: Database, IPC, Node.js, Keamanan, Logika bisnis.
- **bug-checker**: Debugging sistematis, analisis akar masalah, verifikasi.
- **devops-agent**: Otomatisasi build, pengemasan, dan manajemen lingkungan.
- **security-compliance-agent**: Penjaga keamanan siber dan integritas finansial.
- **research-docs-agent**: Spesialis manual pengguna dan riset teknis.
- **memory-agent**: Pengelola memori proyek jangka panjang (ADR & PARA).

## Mandatory Session Start
At the beginning of EVERY session, you MUST:
1.  **Sync Progress & Memory**: 
    - Read `PROGRESS.md` untuk status terbaru.
    - Periksa `.gemini/memory/shared/` untuk instruksi atau keputusan arsitektur baru.
2.  **On-Demand Skill Activation**: Aktifkan skill secara otomatis sesuai kebutuhan tugas yang sedang dikerjakan (misalnya `systematic-debugging` untuk mencari bug, `ui-ux-pro-max` untuk desain antarmuka). Jangan aktifkan semua skill sekaligus untuk menjaga efisiensi konteks.
3.  **Prepare Agents**: Konfirmasi kesiapan sub-agen yang diperlukan.
4.  **Language**: Selalu gunakan Bahasa Indonesia.

## Delegation Protocol (Standard Operating Procedure)

Setiap fitur atau perbaikan besar harus mengikuti alur kerja berikut:

1.  **Manager (Orchestrator)**: Menerima input, menginisialisasi sesi kolaborasi di `.gemini/AGENT_HANDOFF.md`.
2.  **Architect**: Membuat blueprint, memperbarui memori bersama (`shared memory`).
3.  **Development**: Mengimplementasikan kode, menyimpan fakta teknis baru ke memori pribadi agen.
4.  **Verification**: **Bug-checker** memverifikasi terhadap memori shared dan spesifikasi.
5.  **Security Audit**: Verifikasi integritas finansial.
6.  **Deployment**: Build & Release jika semua tahap Lulus.

## Engineering Standards
- Semua agen wajib mematuhi protokol `agent-collaboration`.
- **Long-Term Memory**: Setiap fakta teknis (importance >= 4) WAJIB disimpan di `.gemini/memory/[agent-name]/facts.yaml`.
- **Shared Knowledge**: Keputusan arsitektur harus dicatat di `.gemini/memory/shared/`.
- Integritas finansial (Pagu, Saldo, Pajak) divalidasi oleh Security Agent sebelum deployment.
- `PROGRESS.md` dan Artefak Jurnal Pengembangan (`jurnal_pengembangan_bendaharaapp.md`) WAJIB diperbarui oleh Orchestrator / Manager Agent di akhir setiap siklus perubahan tugas atau perbaikan.
