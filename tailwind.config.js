/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#06101e',
        panel: '#0a1626',
        line: '#233246',
        muted: '#8996aa',
        cobalt: '#1769ff',
      },
      fontFamily: {
        sans: ['Loficore', 'Pixelify Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
