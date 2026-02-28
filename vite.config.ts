
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load environment variables from current directory
    const env = loadEnv(mode, '.', '');
    // Support both naming conventions for the API key
    const apiKey = env.GEMINI_API_KEY || env.API_KEY || '';

    return {
      // Use absolute root path as requested by the user
      base: '/',
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
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
        }
      },
      plugins: [react(), tailwindcss()],
      define: {
        // Injects environment variables into the build
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
