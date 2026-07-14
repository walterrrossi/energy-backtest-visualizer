/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  safelist: ['bg-positive/5'],
  theme: {
    extend: {
      colors: {
        positive: { DEFAULT: '#14b8a6', light: '#5eead4', dark: '#0d9488' },
        negative: { DEFAULT: '#f43f5e', light: '#fda4af', dark: '#e11d48' },
        surface: { DEFAULT: '#0f172a', light: '#1e293b', lighter: '#334155' },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
