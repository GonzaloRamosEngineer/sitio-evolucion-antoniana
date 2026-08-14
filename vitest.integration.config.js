// Config de los tests de INTEGRACIÓN (contra la Supabase local de Docker).
//
// Separada de `vitest.config.js` a propósito: estos tests necesitan el stack
// levantado, tardan más y escriben en una base real, así que no deben correr en
// el gate normal (`npm test`). Se lanzan con `npm run test:integration`, que
// inyecta las credenciales locales vía `tools/run-integration-tests.mjs`.
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    // `node`, no jsdom: acá no se renderiza nada, se habla con Postgres.
    environment: 'node',
    include: ['src/**/*.integration.test.{js,jsx}'],
    // El stack local puede tardar en responder la primera query.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
