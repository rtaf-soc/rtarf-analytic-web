import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,       // ฟังทุก IP
    port: 5173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "defnex-analytic.please-scan.com",
      "ads-analytic.rtarf-prod.its-software-services.com"
    ],
    proxy: {
      // forward ทุก request /api ไป backend
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
