// (2026-07-13) Set relative base path for GitHub Pages; was unconfigured
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 7777,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 7777,
    strictPort: true,
    host: true,
  },
});
