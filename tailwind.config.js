/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",       // <--- ADDS SUPPORT FOR ROOT FILES
    "./src/**/*.{js,ts,jsx,tsx}", // <--- Adds support for src folder
    "./electron/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        primary: 'var(--col-primary)',
        'primary-hover': 'var(--col-primary-hover)',
        secondary: 'var(--col-secondary)',
        danger: 'var(--col-danger)',
        text: 'var(--text-main)',
        'text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}