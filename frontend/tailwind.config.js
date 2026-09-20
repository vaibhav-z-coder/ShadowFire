/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#111827',
        surfaceHover: '#1f293d',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb'
        },
        risk: {
          safe: '#10b981',
          medium: '#f59e0b',
          high: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
