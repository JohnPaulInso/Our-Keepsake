// (2026-07-13) Dynamic base for GitHub Actions vs relative for local APK
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubActions ? '/Our-Keepsake/' : './',
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
