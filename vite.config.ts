// (2026-07-13) Configure Vite server on port 7777 vs unconfigured state
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
