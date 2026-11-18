// (2026-07-13) Set appId to com.ourkeepsake matching google-services.json
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ourkeepsake',
  appName: 'Our Keepsake',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // (2026-07-13) Add Firestore & Firebase endpoints to allowNavigation; was 4 domains
    allowNavigation: [
      'accounts.google.com',
      '*.googleapis.com',
      '*.firebaseapp.com',
      '*.firebaseio.com',
      '*.firebasestorage.app',
      '*.gstatic.com',
    ],
  },
};

export default config;
