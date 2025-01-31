import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __ENV_CHECK__: JSON.stringify({
      hasEnv: process.env.VITE_FIREBASE_PROJECT_ID ? 'yes' : 'no',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    })
  },
  build: {
    rollupOptions: {
      external: [
        'puppeteer',
        'cheerio'
      ]
    }
  }
})
