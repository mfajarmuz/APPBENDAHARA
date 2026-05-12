const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Telegraf } = require('telegraf');
const { getProjectContext } = require('./bridge');

/**
 * Main Telegram Bot Implementation for BendaharaApp
 * Auth: Password-based session
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const password = process.env.TELEGRAM_BOT_PASSWORD || 'bendahara123'; // Default password jika belum di set

if (!token) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is not defined in .env file');
    process.exit(1);
}

const bot = new Telegraf(token);

// In-memory set to store authorized user IDs for the current session
const authorizedUsers = new Set();

// Middleware for Logging & Auth
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const text = ctx.message?.text;

    if (!userId) return;

    // Jika sudah terautorisasi, lanjut ke proses berikutnya
    if (authorizedUsers.has(userId)) {
        return next();
    }

    // Cek apakah pesan adalah password
    if (text === password) {
        authorizedUsers.add(userId);
        console.log(`✅ User ${userId} (${ctx.from.username || 'unknown'}) authorized with password.`);
        return ctx.reply('✅ Password Benar! Anda sekarang memiliki akses ke Asisten BendaharaApp.\n\nKirim pesan apa saja untuk mendapatkan konteks proyek.');
    }

    // Jika belum terautorisasi dan bukan password
    if (ctx.chat?.type === 'private') {
        console.warn(`🔒 Unauthorized access attempt by ID: ${userId}`);
        return ctx.reply('🔒 Akses Terkunci. Silakan masukkan password untuk membuka akses bot ini.');
    }
});

// Command /start
bot.start(async (ctx) => {
    const welcomeMessage = 
        `Halo ${ctx.from.first_name}! 👋\n\n` +
        `Selamat datang di Bot BendaharaApp Integration.\n` +
        `Bot ini digunakan untuk memantau progres proyek dan mendapatkan konteks pengembangan.\n\n` +
        `Kirim pesan apa saja untuk mendapatkan status proyek terbaru.`;
    
    await ctx.reply(welcomeMessage);
});

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ... existing code (middleware auth) ...

// Generic text handler to bridge with Gemini CLI
bot.on('text', async (ctx) => {
    const userId = ctx.from?.id;
    if (!authorizedUsers.has(userId)) return; // Auth handled by middleware, but safe to check

    const userMessage = ctx.message.text;
    
    try {
        await ctx.reply('⌛ Sedang berkonsultasi dengan Gemini CLI...');
        console.log(`🤖 Executing gemini -p for user ${userId}: "${userMessage}"`);

        // Execute Gemini CLI in headless mode
        // Note: Using --skip-trust to avoid interactive prompts in headless mode
        const { stdout, stderr } = await execPromise(`gemini --skip-trust -p "${userMessage.replace(/"/g, '\\"')}"`);

        const response = stdout || stderr || 'Tidak ada respons dari Gemini CLI.';
        
        // Telegram character limit is 4096. Split if necessary.
        if (response.length > 4000) {
            const chunks = response.match(/[\s\S]{1,4000}/g) || [];
            for (const chunk of chunks) {
                await ctx.reply(chunk);
            }
        } else {
            await ctx.reply(response);
        }
    } catch (error) {
        console.error('❌ Error executing Gemini CLI:', error);
        let errorMsg = 'Terjadi kesalahan saat memanggil Gemini CLI: ' + error.message;
        if (error.stdout) errorMsg += '\n\nOutput: ' + error.stdout;
        await ctx.reply(errorMsg.substring(0, 4000));
    }
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Launch bot
bot.launch()
    .then(() => {
        console.log('🚀 Telegram Bot for BendaharaApp is running...');
    })
    .catch((err) => {
        console.error('Failed to launch Telegram Bot:', err);
    });

module.exports = bot;
