import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  root: 'frontend',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./frontend/src', import.meta.url)),
    },
  },
  build: {
    outDir: '../app/static/vue',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: [
        fileURLToPath(new URL('./frontend/src/main.js', import.meta.url)),
        fileURLToPath(new URL('./frontend/src/login.js', import.meta.url)),
      ],
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
