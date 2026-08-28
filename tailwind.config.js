/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        infield: '#c98a4b',
        grass: '#3f7d3f',
      },
    },
  },
  plugins: [],
}
