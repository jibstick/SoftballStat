import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` produces the normal multi-file dist/ (good for hosting).
// `npm run build:portable` additionally inlines everything into one
// index.html — no server, no separate JS/CSS files — so it can be shared
// as a single file (AirDrop, email, USB) and opened directly in a browser.
const portable = process.env.PORTABLE === '1'

export default defineConfig({
  plugins: [react(), ...(portable ? [viteSingleFile()] : [])],
  base: './',
})
