# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sitio web institucional de la **Fundación Evolución Antoniana** (Salta, Argentina): educación, deporte, inclusión y tecnología. SPA en español. Scaffold original de Hostinger Horizons (de ahí los restos en `plugins/visual-editor/`, solo activos en dev).

## Stack

- **Vite 4 + React 18** (JavaScript, sin TypeScript), `react-router-dom` v6 (client-side routing, SPA).
- **Supabase** como backend (auth + Postgres + Storage). La lógica de datos corre en el browser con la **anon key**; la única excepción es la **Edge Function `create-user`** (Deno), que usa la `service_role` para dar de alta usuarios desde el panel admin.
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

### Supabase (esquema y funciones, en `supabase/`)

El esquema y las Edge Functions están **versionados en el repo** (antes se administraban a mano en la consola). Ver `supabase/README.md`.

```bash
supabase link --project-ref lbtyxnbyetsvngsxczkt
supabase db push                      # aplica migraciones de supabase/migrations/
supabase functions deploy create-user         # despliega la Edge Function de alta de usuarios
supabase functions deploy resend-verification # despliega la Edge Function de verificación de email
```

- `supabase/migrations/*.sql`: esquema (orden por timestamp, idempotentes). Se pueden aplicar con `db push` **o** pegándolas en el SQL Editor de Supabase (el dueño suele correrlas a mano ahí).
- `supabase/data/*.sql`: cargas de datos puntuales (no son migraciones), p. ej. el proyecto real de la comisión.
- `supabase/functions/`: Edge Functions (Deno). `create-user` usa `SUPABASE_SERVICE_ROLE_KEY` (inyectada por la plataforma; **nunca** se commitea).
- **Verificación**: este proyecto no tiene tests. Para verificar cambios, corré `npm run build` y, cuando aplique, revisá el render real con `npm run preview` (las páginas dependen de datos de Supabase, así que un dump estático muestra el spinner de carga).

## Variables de entorno

`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (van en `.env.local`, ver `.env.example`). **No son estrictamente obligatorias en local**: `src/lib/supabase.js` lee del env con *fallback* a los valores de producción, así que el sitio corre igual sin `.env.local`. En Vercel están configuradas como env vars.

## Arquitectura (big picture)

- **Punto de entrada**: `src/main.jsx` → `src/App.jsx`. `App.jsx` arma el árbol `ThemeProvider > AuthProvider > Router` con shell fijo (Header/Footer/BottomNavBar) y define **todas las rutas**.
- **Code splitting**: en `App.jsx` las páginas se importan con `React.lazy` y se envuelven en `<Suspense>`. Al agregar una página nueva, seguí ese patrón (lazy import + `<Route>`); el shell y `ProtectedRoute` van eager.
- **Cliente Supabase ÚNICO**: `src/lib/supabase.js` exporta `supabase`. **No crear un segundo cliente** (había dos y causaba pantalla en blanco). Importá siempre de `@/lib/supabase`.
- **Capa de datos**: `src/lib/storage.js` (partners/benefits/news) y `src/api/*.js` (activities/users/membership/education) envuelven las queries. Los getters de listado (`getNews`/`getPartners`/`getBenefits`) **lanzan** en error (no devuelven `[]`); el caller debe manejar loading/error/empty.
- **Auth**: `src/hooks/useAuth.jsx` (`AuthProvider` + `useAuth`) expone `user`, `isAuthenticated`, `isAdmin`, `role`, `isBoardMember`. El perfil/rol sale de la tabla `users`. `src/components/Auth/ProtectedRoute.jsx` soporta `requireAdmin` y `allowedRoles={[...]}`. Tras login, `LoginPage` redirige según rol a su portal (admin→`/admin`, comisión→`/comision`, educación→`/admin/education`, resto→`/dashboard`).
- **Portales por rol**: además del Panel General admin (`/admin`, `src/pages/AdminPanel.jsx`, rediseñado con sidebar) y el de educación (`/admin/education`), está el **portal de Comisión Directiva** (`/comision`, `src/pages/CommissionPortal.jsx`, rol `comision_directiva`) con dos módulos en `src/components/Comision/`: gestor de **proyectos/tareas** (kanban; tablas `projects`/`tasks`, `src/api/projectsApi.js`) y gestor de **documentación versionada** (tablas `documents`/`document_versions` + Storage privado; `src/api/documentsApi.js`).
- **Primitivas admin compartidas** en `src/components/Admin/shared/` (`SectionHeader`, `SearchBar`, `ListSkeleton`, `EmptyState`, `useSearch`) y `src/components/Comision/FilterChips.jsx` (chips de filtro): reutilizarlas en secciones de listado/CRUD nuevas para mantener consistencia. El portal de comisión es **mobile-first**: el tablero de tareas usa un segmentado por estado en mobile y kanban de 3 columnas en desktop.

## Lenguaje visual (páginas públicas)

- **Tipografía**: Poppins (display, 600–800) + Inter (texto) se cargan en `index.html`
  vía Google Fonts. Estaban declaradas en Tailwind pero **nunca se cargaban** (todo caía
  a la sans del sistema) — no quitar esos `<link>`.
- **Lenguaje editorial** (Home y Contact son la referencia; propagarlo al resto):
  eyebrows en versalitas con filete dorado (`src/components/ui/eyebrow.jsx`), headings
  en *sentence case* y voseo, filas/bandas con bordes hairline en vez de cards con
  sombra, `rounded-sm`, `brand-gold` como acento puntual (nunca degradados de texto),
  animaciones con `useReducedMotion` + `viewport: once`. Evitar los clichés que se
  quitaron: pills glassmórficos, grids de puntos, blobs desenfocados, todo-centrado.
- **Logos de partners**: la Home usa versiones normalizadas (recorte de aire + masa
  visual pareja) generadas por `tools/normalize-partner-logos.mjs` →
  `public/img/partners/` + `src/data/partnerLogoOverrides.json` (fallback al `logo_url`
  crudo de la DB). Re-correr el script al aprobar partners nuevos.

## Modelo de seguridad (CRÍTICO)

La autorización del frontend (`ProtectedRoute`, `isAdmin`) es **solo UX, no una frontera de seguridad**. La seguridad real son las **políticas RLS de Supabase**: toda escritura sale del browser con la anon key (pública), así que cada tabla DEBE tener RLS bien configurado. Detalles ya implementados (no romper):
- **Roles** en `users.role` (CHECK constraint): `admin`, `user`, `educacion_manager`, `comision_directiva`. `users` tiene un trigger `prevent_privilege_escalation` que impide a no-admins cambiar `role`/`is_verified` (los admin sí pueden).
- **`is_board_member()`** (función SQL `SECURITY DEFINER`): true para `admin`+`comision_directiva`. Es la base de las RLS de `projects`/`tasks`/`documents`/`document_versions` y de las policies del bucket de Storage. Reusala para datos nuevos del portal de comisión.
- **Alta de usuarios**: la Edge Function `create-user` valida que el invocador sea admin **leyendo su rol de la DB** (no del JWT) antes de crear la cuenta con `service_role`. No confiar en el rol del body.
- **Verificación de email**: la Edge Function `resend-verification` genera un magic link y lo envía por email vía Resend (`RESEND_API_KEY` y `RESEND_FROM_EMAIL` seteados como secrets en Supabase). El trigger `on_auth_user_email_confirmed` en `auth.users` sincroniza `email_confirmed_at → public.users.is_verified` automáticamente al hacer clic en el link. El trigger de tabla `trg_prevent_privilege_escalation` bloquea updates directos a `is_verified` desde SQL (para backfills usar `DISABLE TRIGGER trg_prevent_privilege_escalation` + `ENABLE TRIGGER`).
- **Storage**: bucket **privado** `comision-docs` (documentación interna de la comisión), con policies sobre `storage.objects` restringidas a `is_board_member()`; los archivos se sirven con **signed URLs** o se bajan como blob (no se pueden embeber por iframe directo). Es **independiente** de `legal_documents` (tabla pública del sitio): no mezclarlos.
- `partners`: el insert público/anon NO puede setear `estado='aprobado'` (anti auto-publicación).
- Contenido HTML de la BD (`news.body_md`, `partners.colaboracion_detalle`) se renderiza con **DOMPurify** antes de `dangerouslySetInnerHTML`. Mantené ese sanitizado.

## SEO

Cada página define su meta con `<Helmet>` (title + description; `canonical` en públicas, `<meta name="robots" content="noindex">` en privadas/auth). **No** volver a poner un `<meta robots>` estático en `index.html` (entra en conflicto con Helmet).

## Convenciones de trabajo

- **Branch / deploy**: el historial commitea directo a `master` y el push dispara deploy en Vercel. Confirmar antes de pushear.
- Correr `npm run build` antes de commitear cambios de código.
- **Tema**: la app está forzada a claro (`forcedTheme="light"` en `App.jsx`). El dark mode es solo un esbozo y está deshabilitado a propósito (la paleta y los fondos son light-only); no agregar variantes `dark:` salvo que se reactive el tema.
- **Nunca** versionar `node_modules` (está en `.gitignore`; estuvo versionado y rompía entre OS). Si hay binarios raros (ej. esbuild de otro SO, `.bin` sin permisos): `rm -rf node_modules && npm ci`.
- Vercel: los **preview deployments dan 401** (protección); validar OG/social y comportamiento solo en **producción**, no en previews.

## Deuda técnica conocida

- **Ver `ROADMAP.md`** (raíz del repo): auditoría completa + hoja de ruta accionable de
  bugs, deuda técnica y UI/UX, con `archivo:línea` y esfuerzo estimado. Mantener ese
  documento al día en vez de re-auditar. Corrige 4 puntos desactualizados de este CLAUDE.md
  (ver su última sección).
- 3 vulns npm que requieren bumps breaking (`vite@8`, `uuid@14`) — migración aparte.
- Sin tests ni lint configurados.
