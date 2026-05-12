const fs = require('fs');
const path = require('path');

/**
 * Membaca konteks proyek dari GEMINI.md dan PROGRESS.md di root directory.
 * @returns {Promise<string>} String gabungan konteks proyek.
 */
async function getProjectContext() {
    try {
        const rootPath = path.resolve(__dirname, '..');
        const geminiPath = path.join(rootPath, 'GEMINI.md');
        const progressPath = path.join(rootPath, 'PROGRESS.md');

        let context = "=== PROJECT CONTEXT (GEMINI.md) ===\n";
        if (fs.existsSync(geminiPath)) {
            context += fs.readFileSync(geminiPath, 'utf8');
        } else {
            context += "[GEMINI.md not found]\n";
        }

        context += "\n\n=== PROJECT PROGRESS (PROGRESS.md) ===\n";
        if (fs.existsSync(progressPath)) {
            context += fs.readFileSync(progressPath, 'utf8');
        } else {
            context += "[PROGRESS.md not found]\n";
        }

        return context;
    } catch (error) {
        console.error('Error reading project context:', error);
        return `Error reading project context: ${error.message}`;
    }
}

module.exports = {
    getProjectContext
};
