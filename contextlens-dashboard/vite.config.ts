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
    // Generate source maps for production debugging (hidden from browser)
    sourcemap: 'hidden',
    // Warn when a chunk exceeds 500KB (gzip ~150KB)
    chunkSizeWarningLimit: 500,
    // Minification settings
    target: 'es2020',
    cssCodeSplit: true,
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
