import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Firebase into its own chunk (~250KB gzip)
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Split React + Router into a framework chunk
          framework: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
