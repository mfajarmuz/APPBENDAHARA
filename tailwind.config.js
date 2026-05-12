/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        sidebar: '#0F172A',
        accent: {
          DEFAULT: '#6366F1', // Indigo 500
          light: '#EEF2FF', // Indigo 50
        },
        bg: '#F8FAFC', // Slate 50
        surface: '#FFFFFF',
        border: '#E2E8F0', // Slate 200
        text: {
          primary: '#0F172A', // Slate 900
          secondary: '#64748B', // Slate 500
        },
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        danger: '#EF4444', // Red 500
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.2)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      borderRadius: {
        'card': '1rem',
        'xl': '1rem',
        '2xl': '1.25rem',
      }
    },
  },
  plugins: [],
}