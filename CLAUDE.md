# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sitio web institucional de la **Fundación Evolución Antoniana** (Salta, Argentina): educación, deporte, inclusión y tecnología. SPA en español. Scaffold original de Hostinger Horizons (de ahí los restos en `plugins/visual-editor/`, solo activos en dev).

## Stack

- **Vite 4 + React 18** (JavaScript, sin TypeScript), `react-router-dom` v6 (client-side routing, SPA).
- **Supabase** como backend (auth + Postgres + storage). Toda la lógica de datos corre en el browser con la **anon key**.
- **Tailwind** + Radix/shadcn (`src/components/ui/`), `framer-motion`, `react-hook-form` + `zod`, `react-helmet`.
- Deploy en **Vercel**. Funciones serverless en `api/` (OG/share). `vercel.json` proxea `/api/*` a un webhook externo en Render.

## Comandos

```bash
npm ci          # instalar (NO npm install salvo para agregar deps; respeta package-lock)
npm run dev      # dev server (Vite, http://localhost:5173)
npm run build    # build de producción a dist/
npm run preview  # sirve el build de dist/ (build de producción real)
```

- **Node 22** (ver `.nvmrc` = 22.12.0 y `engines`). Vercel buildea con la misma versión.
- No hay scripts de test/lint/typecheck (ESLint está instalado pero sin configurar).
- **Verificación**: este proyecto no tiene tests. Para verificar cambios, corré `npm run build` y, cuando aplique, revisá el render real con `npm run preview` (las páginas dependen de datos de Supabase, así que un dump estático muestra el spinner de carga).

## Variables de entorno

`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (van en `.env.local`, ver `.env.example`). **No son estrictamente obligatorias en local**: `src/lib/supabase.js` lee del env con *fallback* a los valores de producción, así que el sitio corre igual sin `.env.local`. En Vercel están configuradas como env vars.

## Arquitectura (big picture)

- **Punto de entrada**: `src/main.jsx` → `src/App.jsx`. `App.jsx` arma el árbol `ThemeProvider > AuthProvider > Router` con shell fijo (Header/Footer/BottomNavBar) y define **todas las rutas**.
- **Code splitting**: en `App.jsx` las páginas se importan con `React.lazy` y se envuelven en `<Suspense>`. Al agregar una página nueva, seguí ese patrón (lazy import + `<Route>`); el shell y `ProtectedRoute` van eager.
- **Cliente Supabase ÚNICO**: `src/lib/supabase.js` exporta `supabase`. **No crear un segundo cliente** (había dos y causaba pantalla en blanco). Importá siempre de `@/lib/supabase`.
- **Capa de datos**: `src/lib/storage.js` (partners/benefits/news) y `src/api/*.js` (activities/users/membership/education) envuelven las queries. Los getters de listado (`getNews`/`getPartners`/`getBenefits`) **lanzan** en error (no devuelven `[]`); el caller debe manejar loading/error/empty.
- **Auth**: `src/hooks/useAuth.jsx` (`AuthProvider` + `useAuth`) expone `user`, `isAuthenticated`, `isAdmin`, `role`. El perfil/rol sale de la tabla `users`. `src/components/Auth/ProtectedRoute.jsx` soporta `requireAdmin` y `allowedRoles={[...]}`.

## Modelo de seguridad (CRÍTICO)

La autorización del frontend (`ProtectedRoute`, `isAdmin`) es **solo UX, no una frontera de seguridad**. La seguridad real son las **políticas RLS de Supabase**: toda escritura sale del browser con la anon key (pública), así que cada tabla DEBE tener RLS bien configurado. Detalles ya implementados (no romper):
- RLS activado en todas las tablas; `users` tiene un trigger `prevent_privilege_escalation` que impide a no-admins cambiar `role`/`is_verified`.
- `partners`: el insert público/anon NO puede setear `estado='aprobado'` (anti auto-publicación).
- Contenido HTML de la BD (`news.body_md`, `partners.colaboracion_detalle`) se renderiza con **DOMPurify** antes de `dangerouslySetInnerHTML`. Mantené ese sanitizado.

## SEO

Cada página define su meta con `<Helmet>` (title + description; `canonical` en públicas, `<meta name="robots" content="noindex">` en privadas/auth). **No** volver a poner un `<meta robots>` estático en `index.html` (entra en conflicto con Helmet).

## Convenciones de trabajo

- **Branch / deploy**: el historial commitea directo a `master` y el push dispara deploy en Vercel. Confirmar antes de pushear.
- Correr `npm run build` antes de commitear cambios de código.
- **Nunca** versionar `node_modules` (está en `.gitignore`; estuvo versionado y rompía entre OS). Si hay binarios raros (ej. esbuild de otro SO, `.bin` sin permisos): `rm -rf node_modules && npm ci`.
- Vercel: los **preview deployments dan 401** (protección); validar OG/social y comportamiento solo en **producción**, no en previews.

## Deuda técnica conocida

- 3 vulns npm que requieren bumps breaking (`vite@8`, `uuid@14`) — migración aparte.
- Sin tests ni lint configurados.
