import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  root: 'C:/Coding/ASP/Project/CarearTrackAI/CareerTrackAI_Frontend',
  plugins: [react(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: 'localhost',
    port: 4174,
    strictPort: true,
  },
})
