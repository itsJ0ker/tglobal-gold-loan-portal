/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#0D261C',
          800: '#14382B', // Primary deep forest
          700: '#1E4D3C',
          600: '#2A6650',
          100: '#E6EFEA',
          50: '#F0F6F2',
        },
        ivory: {
          50: '#FBF9F5',  // Warm ivory background
          100: '#F5EFE6', // Muted card background
          200: '#EAE1D2', // Subtle borders
          300: '#DDD1BD',
        },
        charcoal: {
          950: '#111513',
          900: '#161C18', // Primary heading
          800: '#252F29',
          700: '#3D4C43',
          600: '#526359', // Secondary body
          400: '#8A9990',
          200: '#D5DDD8',
        },
        gold: {
          600: '#9E7B27',
          500: '#C29B38', // Refined financial gold
          400: '#DFB854',
          100: '#F8F1DD',
          50: '#FCF9F0',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'refined': '0 4px 20px -2px rgba(20, 56, 43, 0.06), 0 2px 6px -1px rgba(20, 56, 43, 0.04)',
        'elevated': '0 12px 36px -4px rgba(20, 56, 43, 0.12), 0 4px 12px -2px rgba(20, 56, 43, 0.06)',
      },
    },
  },
  plugins: [],
}
