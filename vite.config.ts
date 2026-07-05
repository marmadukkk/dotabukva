import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiUrl = env.VITE_API_URL || ''

  // Only use proxy in development if no explicit API URL is set
  const useProxy = mode === 'development' && !apiUrl

  return {
    plugins: [react()],
    server: {
      port: 5173,
      ...(useProxy && {
        proxy: {
          '/api': 'http://localhost:3001',
          '/ws': {
            target: 'ws://localhost:3001',
            ws: true,
          },
          '/data': 'http://localhost:3001'
        }
      })
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || '')
    }
  }
})
