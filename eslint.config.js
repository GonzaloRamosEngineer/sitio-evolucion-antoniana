// eslint.config.js — Flat config (ESLint 8.57+).
// Red de seguridad de lint para el sitio. Objetivo: cazar errores reales
// (variables sin usar, hooks mal usados, imports rotos) sin ahogar en ruido
// estilístico. El formato NO es responsabilidad de ESLint acá.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Nunca lintear artefactos ni código de terceros / generado.
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'supabase/**',
      'coverage/**',
      'tools/**',
      'plugins/**', // andamiaje del editor visual (solo dev, se elimina en 6.5)
    ],
  },

  // Base recomendada de ESLint para todo el JS/JSX.
  js.configs.recommended,

  // Código de la app (browser + React).
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Runtime automático de JSX (el que usa @vitejs/plugin-react): el import de
      // React no es necesario. jsx-runtime apaga react-in-jsx-scope para no exigirlo.
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // Errores reales que queremos que fallen el lint. Ignoramos el binding
      // `React` (lo importan casi todos los archivos por estilo legacy; es
      // inofensivo con el runtime automático) y los prefijos `_` intencionales.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React$)' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Ruido que no aporta en este repo (validado contra el código actual):
      'react/prop-types': 'off', // no usamos PropTypes ni TS
      'react/no-unescaped-entities': 'off', // copy en español con comillas/apóstrofos
      'react/display-name': 'off',
    },
  },

  // Config de build / tooling que corre en Node.
  {
    files: ['*.config.js', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Funciones serverless de Vercel (Node).
  {
    files: ['api/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Tests (Vitest + jsdom): globals de test + browser.
  {
    files: ['**/*.{test,spec}.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
];
