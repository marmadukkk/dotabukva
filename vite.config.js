import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiUrl = env.VITE_API_URL || '';
    const isElectron = mode === 'electron' || env.ELECTRON === '1';
    // Only use proxy in development if no explicit API URL is set
    const useProxy = mode === 'development' && !apiUrl;
    return {
        // Relative base is required for Electron file:// loading
        base: isElectron ? './' : '/',
        plugins: [react()],
        server: {
            port: 5173,
            strictPort: true,
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
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            // Large video/audio assets are expected
            chunkSizeWarningLimit: 5000,
        },
        define: {
            'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
            'import.meta.env.VITE_IS_ELECTRON': JSON.stringify(isElectron),
        }
    };
});
