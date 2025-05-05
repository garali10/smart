/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: '#3b82f6',
        stroke: '#E2E8F0',
        boxdark: '#24303F',
        'form-strokedark': '#3d4d60',
        'form-input': '#1d2a39',
      },
    },
  },
  plugins: [],
} 