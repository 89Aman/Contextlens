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
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'framework';
          }
        },
      },
    },
  },
})
