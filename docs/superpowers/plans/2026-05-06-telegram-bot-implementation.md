# Telegram Bot Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun bot Telegram privat untuk konsultasi asinkron dengan asisten AI yang memiliki konteks proyek BendaharaApp.

**Architecture:** Node.js script menggunakan `Telegraf` yang berjalan di mesin lokal. Bot menggunakan mekanisme Long Polling dan dilengkapi dengan Whitelist User ID untuk keamanan.

**Tech Stack:** Node.js, Telegraf, dotenv.

---

### Task 1: Environment & Dependencies Setup

**Files:**
- Modify: `package.json`
- Modify: `.env` (User action required)

- [ ] **Step 1: Install Telegraf**
Run: `npm install telegraf`

- [ ] **Step 2: Tambahkan variabel lingkungan di .env**
Buka file `.env` dan tambahkan (Anda harus mendapatkan token dari @BotFather):
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_USER_ID=your_id_here
```

---

### Task 2: Implement Whitelist Guard Middleware

**Files:**
- Create: `telegram/whitelist.js`
- Create: `telegram/test-whitelist.js`

- [ ] **Step 1: Write the failing test**
Create `telegram/test-whitelist.js`:
```javascript
const { isAuthorized } = require('./whitelist');
const assert = require('assert');

// Test unauthorized
assert.strictEqual(isAuthorized('999'), false, 'Should reject unauthorized ID');
console.log('Test unauthorized passed');
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node telegram/test-whitelist.js`
Expected: FAIL with "isAuthorized is not a function"

- [ ] **Step 3: Implement minimal whitelist logic**
Create `telegram/whitelist.js`:
```javascript
require('dotenv').config();

const isAuthorized = (userId) => {
  const allowedId = process.env.TELEGRAM_USER_ID;
  return String(userId) === String(allowedId);
};

module.exports = { isAuthorized };
```

- [ ] **Step 4: Run test to verify it passes**
Run: `node telegram/test-whitelist.js`
Expected: PASS

---

### Task 3: Implement Context Bridge

**Files:**
- Create: `telegram/bridge.js`

- [ ] **Step 1: Implement context reader**
Bot perlu membaca `GEMINI.md` dan `PROGRESS.md` agar "pintar".
Create `telegram/bridge.js`:
```javascript
const fs = require('fs');
const path = require('path');

const getProjectContext = () => {
  const gemini = fs.readFileSync(path.join(__dirname, '../GEMINI.md'), 'utf-8');
  const progress = fs.readFileSync(path.join(__dirname, '../PROGRESS.md'), 'utf-8');
  return `Context Proyek:\n${gemini}\n\nStatus Terkini:\n${progress}`;
};

module.exports = { getProjectContext };
```

---

### Task 4: Main Bot Implementation

**Files:**
- Create: `telegram/bot.js`

- [ ] **Step 1: Implement Telegraf bot core**
Create `telegram/bot.js`:
```javascript
const { Telegraf } = require('telegraf');
const { isAuthorized } = require('./whitelist');
const { getProjectContext } = require('./bridge');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  if (!isAuthorized(ctx.from.id)) {
    return ctx.reply(`Maaf, Anda tidak terdaftar. ID Anda: ${ctx.from.id}`);
  }
  ctx.reply('Selamat datang di Asisten BendaharaApp! Saya siap membantu konsultasi proyek.');
});

bot.on('text', async (ctx) => {
  if (!isAuthorized(ctx.from.id)) return;

  const userMessage = ctx.message.text;
  const context = getProjectContext();

  // Untuk tahap awal, bot akan mengonfirmasi penerimaan pesan dengan konteks
  ctx.reply(`Menerima pesan: "${userMessage}". Sedang memproses dengan konteks proyek...`);
  
  // Catatan: Integrasi penuh dengan Gemini API akan menyusul setelah token diverifikasi
  ctx.reply('Fitur konsultasi aktif. Silakan tanya apa saja tentang BendaharaApp.');
});

bot.launch().then(() => console.log('Bot Telegram aktif!'));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

---

### Task 5: Final Verification

- [ ] **Step 1: Jalankan bot**
Run: `node telegram/bot.js`
Expected: Log "Bot Telegram aktif!" muncul di terminal.

- [ ] **Step 2: Test via Telegram**
Kirim pesan `/start` ke bot Anda. Pastikan bot merespons dan mengenali ID Anda.
