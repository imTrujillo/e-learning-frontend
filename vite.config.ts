import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * learning-students (auth, dashboard…): `VITE_PROXY_TARGET`, por defecto :8083.
 * learning-engine (catálogo, inscripciones): proxy `/engine-api` → `VITE_ENGINE_PROXY_TARGET`, por defecto :8081.
 */
const API_TARGET = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8083'
/** Catálogo, inscripciones y estudiantes del motor (learning-engine, puerto típico 8081). */
const ENGINE_TARGET = process.env.VITE_ENGINE_PROXY_TARGET ?? 'http://localhost:8081'

// https://vite.dev/config/
export default defineConfig({
  define: {
    // sockjs-client/browser-crypto espera `global` (Node); en el navegador no existe.
    global: 'globalThis',
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
      '/ws': { target: API_TARGET, ws: true, changeOrigin: true },
      '/engine-api': {
        target: ENGINE_TARGET,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/engine-api/, '/api'),
      },
    },
  },
  optimizeDeps: {
    include: ['sockjs-client', '@stomp/stompjs'],
  },
})
