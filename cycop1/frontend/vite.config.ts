import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    host: true,       // ฟังทุก IP
    port: 5173,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "defnex-analytic.please-scan.com", // ใส่โดเมนของคุณ
      "ads-analytic.rtarf-prod.its-software-services.com"
    ],
  },
})
