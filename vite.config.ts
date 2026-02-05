
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiKey = env.GEMINI_API_KEY || '';

    return {
      // Use '' for absolute relative paths, works best for file:// protocols in Electron/WebViews
      base: '', 
      appType: 'spa',
      server: {
        port: 3000,
        host: '0.0.0.0',
        historyApiFallback: true,
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        assetsDir: 'assets',
        sourcemap: mode === 'development',
        minify: 'esbuild',
        rollupOptions: {
          output: {
            // Ensure single entry point for easier desktop integration
            manualChunks: undefined,
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name].[ext]`
          }
        }
      },
      plugins: [react()],
      define: {
        // Essential shims for desktop environments
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        'process.env.NODE_ENV': JSON.stringify(mode),
        'global': 'window',
        'process.platform': JSON.stringify('browser'),
        'process.version': JSON.stringify(''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
