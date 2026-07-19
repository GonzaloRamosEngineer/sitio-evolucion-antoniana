// vitest.config.js — config aislada de tests.
// No reusa vite.config.js a propósito: ese archivo carga los plugins del editor
// visual (Hostinger Horizons) cuando NODE_ENV !== 'production', y bajo Vitest
// (NODE_ENV='test') se activarían sin necesidad. Acá solo el plugin de React,
// el alias '@' y el entorno jsdom para los tests de humo.
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
});
