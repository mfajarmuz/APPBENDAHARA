---
name: documentation-sync
description: Otomatisasi sinkronisasi antara kode sumber, skema database, dan dokumentasi pengguna (User Manual) atau teknis (API/Internal Docs).
---

# Documentation Sync

Gunakan skill ini setelah menyelesaikan fitur baru, mengubah skema database, atau memperbaiki bug besar untuk memastikan dokumentasi tetap mutakhir.

## Alur Kerja Sinkronisasi

1.  **Analisis Perubahan**: Periksa `git diff` untuk melihat file mana yang berubah (UI, Database, atau Logic).
2.  **Update Progress**: Perbarui `PROGRESS.md` di bagian `Recent Achievements`.
3.  **Update Manual Pengguna**: Jika ada perubahan UI atau alur kerja baru, perbarui file dokumentasi di folder `docs/`.
4.  **Update Teknis**: Jika ada handler IPC baru di `electron/main.js`, pastikan didokumentasikan.

## Standar Penulisan Dokumentasi

- **Bahasa**: Gunakan bahasa Indonesia yang formal namun mudah dipahami untuk User Manual. Gunakan bahasa Inggris/Indonesia teknis untuk dokumentasi kode.
- **Konsistensi Nama**: Pastikan nama menu di aplikasi sama persis dengan yang tertulis di dokumen (misal: "Penerimaan" bukan "Input Pendapatan").
- **Screenshot**: Jika memungkinkan, tandai area yang membutuhkan pembaruan screenshot.

## File Utama yang Disinkronkan
- `PROGRESS.md`: Log pencapaian sesi.
- `docs/user-manual.md`: Panduan operasional untuk bendahara.
- `electron/main.js`: Daftar handler API/IPC yang tersedia.
- `src/store/useStore.js`: Dokumentasi state global.
