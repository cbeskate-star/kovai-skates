import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        events: resolve(import.meta.dirname, 'events.html'),
        infra: resolve(import.meta.dirname, 'our-infra.html'),
        championship: resolve(import.meta.dirname, '36th-TN-Skating-Championship.html'),
        tnChampionship: resolve(import.meta.dirname, 'tn-championship-2026.html'),
        notFound: resolve(import.meta.dirname, '404.html'),
      },
    },
  },
  plugins: [
    {
      name: 'copy-static-assets',
      closeBundle() {
        if (fs.existsSync('assets')) {
          fs.cpSync('assets', 'dist/assets', { recursive: true });
        }
        if (fs.existsSync('_redirects')) {
          fs.copyFileSync('_redirects', 'dist/_redirects');
        }
      },
    },
  ],
});
