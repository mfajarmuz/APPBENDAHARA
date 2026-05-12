# Design Spec: Telegram Bot Integration for Gemini CLI

**Date:** 2026-05-06
**Status:** Draft
**Goal:** Enable private consultation with Gemini CLI via Telegram.

## 1. Overview
Bot ini akan bertindak sebagai jembatan (bridge) antara Telegram API dan sistem Gemini CLI. Pengguna dapat mengirim pesan ke Telegram Bot, yang kemudian akan diproses oleh Gemini CLI dengan konteks proyek BendaharaApp yang sedang aktif.

## 2. Architecture
- **Tech Stack**: Node.js, Telegraf.js (Telegram Bot Framework).
- **Communication**: Long Polling (cocok untuk local host tanpa IP publik).
- **Security**: Whitelist berdasarkan `TELEGRAM_USER_ID`. Hanya pengguna terdaftar yang bisa mendapatkan respons.

## 3. Data Flow
1. User mengirim pesan ke Bot.
2. Bot menerima pesan -> Verifikasi ID Pengguna.
3. Bot meneruskan pesan ke modul pemrosesan (CLI Bridge).
4. CLI Bridge mengirimkan prompt ke Gemini API dengan menyertakan instruksi proyek (`GEMINI.md` & `PROGRESS.md`).
5. Respons dikirim kembali ke Telegram User.

## 4. Components
- `telegram-bot.js`: Entry point untuk koneksi Telegram.
- `whitelist-guard.js`: Middleware untuk pengecekan ID pengguna.
- `context-provider.js`: Modul untuk membaca file proyek agar bot memiliki ingatan tentang progres terbaru.

## 5. Security & Privacy
- Token bot disimpan di `.env`.
- File `.env` tidak boleh di-commit (sudah ada di `.gitignore`).
- Akses dibatasi ketat hanya untuk satu ID Telegram yang dikonfigurasi.

## 6. Setup Requirements
- Bot Token dari `@BotFather`.
- Telegram User ID (akan didapatkan saat inisialisasi).
- Koneksi internet di mesin lokal.

---
*Self-Review: Desain mencakup aspek keamanan, teknologi yang disepakati, dan alur data yang jelas. Tidak ada placeholder "TBD".*
