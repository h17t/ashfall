import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { serviceWorker } from './tools/pwa/sw-plugin';
import { FIRST_ART } from './assets/first';


export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker({ firstArt: FIRST_ART })],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  base: './',
  publicDir: 'assets/generated',
  test: {
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    environment: 'node',
  },
} as any);
