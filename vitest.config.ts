import { defineConfig } from 'vitest/config';
import path from 'path';

// Config propia en vez de añadir `test` a vite.config.ts: mantiene la
// configuración de build intacta. El alias se replica porque Vitest no fusiona
// ambos archivos cuando este existe.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Las funciones bajo test son puras: no hace falta jsdom.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
