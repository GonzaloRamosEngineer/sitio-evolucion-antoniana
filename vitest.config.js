// vitest.config.js — config aislada de tests.
//
// No reusa vite.config.js. El motivo original ya no existe: ese archivo cargaba
// los plugins del editor visual de Hostinger Horizons cuando
// NODE_ENV !== 'production', y bajo Vitest se activaban sin necesidad. Esos
// plugins se borraron en la Sesión H.
//
// Se mantiene separado igual, por otra razón: vite.config.js define el
// `manualChunks` de producción, que no aporta nada a los tests y sí acopla la
// suite a decisiones de bundling. Acá solo el plugin de React, el alias '@' y
// jsdom.
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
    // Credenciales ficticias: desde 2026-08-30 `src/lib/supabase.js` lanza si
    // faltan (ROADMAP 11.7). Hoy todos los tests que lo tocan lo mockean, así
    // que el módulo real nunca se ejecuta acá — esto es para que un test futuro
    // que NO lo mockee falle por lo que está probando y no por el entorno.
    // No apuntan a ningún proyecto real: la suite no debe hablar con la red.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'anon-key-de-test',
    },
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Los `*.integration.test.js` necesitan la Supabase local de Docker; corren
    // aparte con `npm run test:integration` (ver vitest.integration.config.js).
    exclude: ['**/node_modules/**', '**/dist/**', 'src/**/*.integration.test.{js,jsx}'],
  },
});
