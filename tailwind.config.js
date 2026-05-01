/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#12121F',
        accent: {
          DEFAULT: '#7C3AED',
          light: '#EDE9FE',
        },
        bg: '#F8F8FC',
        surface: '#FFFFFF',
        border: '#F0F0F8',
        text: {
          primary: '#12121F',
          secondary: '#9090B0',
        },
        success: '#059669',
        warning: '#B45309',
        danger: '#DC2626',
      },
    },
  },
  plugins: [],
}