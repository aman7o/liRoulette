import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['animejs'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    cors: true,
    // HMR uses auto-detected port to avoid 426 Upgrade Required errors
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/graphql': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for subscriptions
      },
    },
  },
})
