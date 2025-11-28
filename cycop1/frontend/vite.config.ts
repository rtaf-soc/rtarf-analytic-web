import { defineConfig, loadEnv } from 'vite' 
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiTarget = env.VITE_API_TARGET || "http://127.0.0.1:8000";


  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "defnex-analytic.please-scan.com",
        "ads-analytic.rtarf-prod.its-software-services.com"
      ],
      proxy: {
        "/api": {
          target: apiTarget, // ✅ ใช้ตัวแปรนี้แทนค่า fix
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

//http://127.0.0.1:8000
