# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sitio web institucional de la **Fundación Evolución Antoniana** (Salta, Argentina): educación, deporte, inclusión y tecnología. SPA en español. Scaffold original de Hostinger Horizons (de ahí los restos en `plugins/visual-editor/`, solo activos en dev).

## Stack

- **Vite 4 + React 18** (JavaScript, sin TypeScript), `react-router-dom` v6 (client-side routing, SPA).
- **Supabase** como backend (auth + Postgres + Storage). La lógica de datos corre en el browser con la **anon key**; la única excepción es la **Edge Function `create-user`** (Deno), que usa la `service_role` para dar de alta usuarios desde el panel admin.
- **Tailwind** + Radix/shadcn (`src/components/ui/`), `framer-motion`, `react-helmet-async`. Validación de forms **híbrida**: `react-hook-form` + `zod` en `EducationForm`, `LoginPage` y `RegisterPage` (patrón a seguir); quedan con `useState` manual `Contact`, `ContactModal` y `ApplyPartnerPage` (a migrar en la Sesión F).
- Deploy en **Vercel**. Funciones serverless en `api/` (OG/share). `vercel.json` proxea `/api/*` a un webhook externo en Render.

## Comandos

```bash
npm ci          # instalar (NO npm install salvo para agregar deps; respeta package-lock)
npm run dev      # dev server (Vite, http://localhost:5173)
npm run build    # build de producción a dist/
npm run preview  # sirve el build de dist/ (build de producción real)
npm run lint     # ESLint (flat config); falla en errores, informa warnings
npm test         # Vitest (tests de humo, una sola pasada)
npm run test:watch  # Vitest en watch
```

- **Node 22** (ver `.nvmrc` = 22.12.0 y `engines`). Vercel buildea con la misma versión.
- **ESLint** (`eslint.config.js`, flat) + **Vitest** (`vitest.config.js`) configurados en la
  Sesión G. `npm run lint` es un gate que falla solo en errores; hoy quedan ~61 warnings
  de backlog (imports sin usar, exhaustive-deps) para limpiar en las Sesiones D/E.

### Supabase (esquema y funciones, en `supabase/`)

El esquema y las Edge Functions están **versionados en el repo** (antes se administraban a mano en la consola). Ver `supabase/README.md`.

```bash
supabase link --project-ref lbtyxnbyetsvngsxczkt
supabase db push                      # aplica migraciones de supabase/migrations/
supabase functions deploy create-user         # despliega la Edge Function de alta de usuarios
supabase functions deploy resend-verification # despliega la Edge Function de verificación de email
```

- `supabase/migrations/*.sql`: esquema (orden por timestamp, idempotentes).
  ⚠️ **Idempotente no alcanza: tienen que converger desde su propia versión anterior.**
  `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe, así que agregar una
  columna a una migración **ya aplicada en producción** no la agrega en ningún lado y
  revienta más abajo (pasó el 2026-08-30 con `aportes.payment_id`). Todo cambio posterior
  al primer despliegue va **además** como `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` /
  `ALTER COLUMN ... DROP NOT NULL`, y los datos semilla que cambien de valor van con un
  `UPDATE` acotado a la firma del valor viejo. Verificarlo aplicando la versión vieja y
  la nueva encima, en Docker. Se pueden aplicar con `db push` **o** pegándolas en el SQL Editor de Supabase (el dueño suele correrlas a mano ahí).
- `supabase/data/*.sql`: cargas de datos puntuales (no son migraciones), p. ej. el proyecto real de la comisión.
- `supabase/functions/`: Edge Functions (Deno). `create-user` usa `SUPABASE_SERVICE_ROLE_KEY` (inyectada por la plataforma; **nunca** se commitea).
- **Verificación**: hay tests de humo (`npm test`) que cubren utilidades y componentes puros, no el flujo completo. Para verificar cambios, corré `npm run build` + `npm run lint` + `npm test` y, cuando aplique, revisá el render real con `npm run preview` (las páginas dependen de datos de Supabase, así que un dump estático muestra el spinner de carga).

## Variables de entorno

`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (van en `.env.local`, ver `.env.example`). **Son obligatorias: sin ellas la app tira al arrancar y queda en blanco.** En Vercel están configuradas como env vars.

Hasta el 2026-08-16 `src/lib/supabase.js` caía a los valores de producción si faltaban, y el sitio corría igual sin `.env.local`. Se sacó ese fallback a propósito: era el bloqueante #1 del objetivo multi-cliente (ROADMAP §10.6) porque **un deploy mal configurado no fallaba, escribía en la base de la Fundación en silencio**. Ahora falla ruidoso. Los tests reciben valores dummy desde `vitest.config.js` (`test.env`), no desde `.env.local`. Desde el 2026-08-30 hay además una **guarda en `vite.config.js`**: `npm run build` aborta si faltan, así el fallo aparece al compilar y no recién en el navegador.

## La entidad es configuración, no código

`src/config/entidad.js` es el **archivo único que se reemplaza para levantar una entidad nueva**: nombre, tipo jurídico, contacto, ubicación, redes, logo y link de cobro. Los derivados (`mailtoContacto`, `telContacto`, `whatsappUrl`, `redesActivas()`, `tituloPagina()`) salen de ahí para que ningún componente arme esas URLs a mano.

**La regla: lo que varía por entidad va en datos; lo que es igual para todas va en código.** Antes de escribir el nombre de la Fundación, un mail, un teléfono o un dominio en un componente, va en `entidad.js`. Al 2026-08-16 había 42 archivos que nombraban a la Fundación: eso es lo que convierte cada cliente nuevo en un fork que diverge.

Migrados hasta ahora: `Header`, `Footer`, `BottomNavBar`, `resource-state`. **Falta el resto de las páginas y, declarado aparte, `api/share/*`** (previews de OG): no se tocó porque los preview deployments de Vercel dan 401 y el OG solo se valida en producción.

## Arquitectura (big picture)

- **Punto de entrada**: `src/main.jsx` (envuelve en `<HelmetProvider>`) → `src/App.jsx`. `App.jsx` arma el árbol `MotionConfig > AuthProvider > Router` con shell fijo (Header/Footer/BottomNavBar) y define **todas las rutas**. El shell tiene **un solo `<main>`**; las páginas NO deben renderizar su propio `<main>` (usar `<div>`).
- **Animaciones y a11y**: `App.jsx` envuelve todo en `<MotionConfig reducedMotion="user">`, así que framer-motion respeta `prefers-reduced-motion` globalmente. No hace falta manejar `useReducedMotion` por componente; alcanza con usar `motion.*`/`whileInView` normal.
- **Code splitting**: en `App.jsx` las páginas se importan con `React.lazy` y se envuelven en `<Suspense>`. Al agregar una página nueva, seguí ese patrón (lazy import + `<Route>`); el shell y `ProtectedRoute` van eager.
- **Cliente Supabase ÚNICO**: `src/lib/supabase.js` exporta `supabase`. **No crear un segundo cliente** (había dos y causaba pantalla en blanco). Importá siempre de `@/lib/supabase`.
- **Capa de datos — contrato único `{ data, error }`**: `src/lib/storage.js` (partners/benefits/news) y `src/api/*.js` (activities/users/membership/education/projects/documents) envuelven las queries. **Toda** función devuelve `{ data, error }` y **nunca lanza** — el contrato y sus helpers (`listResult`/`rowResult`/`voidResult`/`attempt`) viven en `src/lib/dataResult.js`. Reglas al escribir o consumir la capa:
  - Usá los helpers, no armes el objeto a mano: normalizan `data` y centralizan el log.
  - En un fallo de lista `data` es `[]` (no `null`), así que **se puede iterar siempre**; en fila única es `null`. El error nunca se pierde, va en `error`.
  - Fila única va con `.maybeSingle()`, no `.single()`: "no existe" debe ser `{data: null, error: null}` y no un PGRST116, para que el consumidor distinga "no encontrado" de "falló la consulta".
  - El consumidor **tiene que mirar `error`** (`const { data, error } = await getX()`): no lo envuelvas en `try/catch` esperando que lance, porque no lanza.
  - Para envolver algo que sí lanza (Edge Functions, RPC, `fetch`), usá `attempt`: preserva la instancia de error y sus flags (p. ej. `isColdStart` de `WebhookError`).
  - Los `console.error` de la capa salen solo de `dataResult.js`; no agregues logs en cada función.
- **Caché de estado servidor — TanStack Query** (ROADMAP 4.2): **13 vistas** leen vía `src/hooks/useContentQueries.js` (públicas, detalles, los 3 paneles de admin, ActivityList, EducationAdmin y Dashboard). Siguen con `useEffect` manual `ActivityDetailPage` y los módulos de Comisión. Reglas:
  - El `queryFn` **siempre** envuelve la llamada con `unwrap()` de `src/lib/queryClient.js`: la capa de datos no lanza y TanStack necesita que lance. No conviertas la capa para que lance.
  - Las claves salen de `queryKeys` (mismo archivo), no strings sueltos: de eso depende la invalidación cruzada.
  - Los filtros de negocio van **en el hook**, compuestos con `composeSelect`, no en cada página. Un `select` del consumidor no debe poder saltear el filtro.
  - Si escribís una mutación con el patrón viejo (estado local) sobre una entidad ya migrada, **invalidá su queryKey** (ver `useActivities`), o el híbrido se desincroniza.
  - Al migrar una página, ojo con el `error`: TanStack devuelve un `Error`, no un string. Un `{error}` en el JSX que antes funcionaba ahora intenta renderizar un objeto y rompe la página; usá `error?.message`.
  - Una query con `enabled: false` **queda en `isPending`**. Si calculás un `loading` solo con `isPending`, la pantalla se cuelga en el spinner cuando la query está deshabilitada a propósito (p. ej. Dashboard sin sesión). Combinalo con la condición del `enabled`: `Boolean(userId) && query.isPending`.
  - Para un detalle que se llega desde un listado ya migrado, resolvelo con un `select` sobre el listado cacheado en vez de una query nueva (ver `PartnerDetailPage`): la navegación queda instantánea. Query propia solo si el detalle se puede abrir directo desde un link (ver `useNewsItem`), y anidá la clave bajo la del listado para que una invalidación alcance a los dos.
  - Un componente que use estos hooks necesita `QueryClientProvider` en sus tests (ver `PartnersAdmin.test.jsx`): cliente nuevo por caso y `retry: false`.
- **Auth**: `src/hooks/useAuth.jsx` (`AuthProvider` + `useAuth`) expone `user`, `isAuthenticated`, `isAdmin`, `role`, `isBoardMember`. El perfil/rol sale de la tabla `users`. `src/components/Auth/ProtectedRoute.jsx` soporta `requireAdmin` y `allowedRoles={[...]}`. Tras login, `LoginPage` redirige según rol a su portal (admin→`/admin`, comisión→`/comision`, educación→`/admin/education`, resto→`/dashboard`).
- **Acceso del socio (aporte → acceso, ROADMAP §10)**: la regla es *dos maneras de aportar (cuota o donación), una sola consecuencia (acceso a beneficios)*. Vive **en SQL**: `aportes` es el libro (escritura solo `service_role`, alimentado por los triggers de `memberships`/`donations`), y `tiene_acceso()` / `mi_acceso()` / `mi_antiguedad()` son la única fuente de la regla. Desde el front se consulta por RPC con `src/api/accesoApi.js` + `useMiAcceso()`; las reglas de presentación (bloqueo, estados, formato) están en `src/lib/acceso.js` y **no se duplican en las páginas**. `/carnet` es la credencial del socio. ⚠️ El bloqueo de un beneficio es **UX, no seguridad**: `benefits.codigo` sigue siendo público (ver la limitación en ROADMAP §12.8).
- **Club de beneficios, fase 2 (ROADMAP §12) — EN PRODUCCIÓN y probado de punta a punta el 2026-09-02**: el módulo del canje. Su ABM vive en `/admin → Club de beneficios`; la deuda abierta, en §12.10. **Rompe el patrón del resto del repo a propósito**: `club_canjes` otorga valor económico (del otro lado hay un comercio esperando cobrar), así que **no tiene policy de INSERT/UPDATE/DELETE** y se escribe únicamente desde tres Edge Functions con `service_role` — `club-generar-canje`, `club-confirmar-canje`, `club-anular-canje`. Si alguna vez alguien "arregla" `src/api/clubApi.js` agregando un insert directo con la anon key, el club deja de tener sentido. Las lecturas sí van directas, filtradas por RLS. La pertenencia al comercio **no es un rol de `users`**: es tener fila en `club_comercio_usuarios`, y la responde `is_comercio_member()` / `mis_comercios()`. Rutas: `/club` (catálogo con canje, pública) y `/comercio` (mostrador, requiere sesión). Toda la lógica que **decide** algo vive en `supabase/functions/_shared/club-reglas.ts` (puro, testeable con vitest) y las reglas de presentación en `src/lib/club.js`; el `index.ts` de cada función es pegamento HTTP y no se puede probar localmente.
- **Portales por rol**: además del Panel General admin (`/admin`, `src/pages/AdminPanel.jsx`, rediseñado con sidebar) y el de educación (`/admin/education`), está el **portal de Comisión Directiva** (`/comision`, `src/pages/CommissionPortal.jsx`, rol `comision_directiva`) con dos módulos en `src/components/Comision/`: gestor de **proyectos/tareas** (kanban; tablas `projects`/`tasks`, `src/api/projectsApi.js`) y gestor de **documentación versionada** (tablas `documents`/`document_versions` + Storage privado; `src/api/documentsApi.js`).
- **Primitivas admin compartidas** en `src/components/Admin/shared/` (`SectionHeader`, `SearchBar`, `ListSkeleton`, `EmptyState`, `useSearch`) y `src/components/Comision/FilterChips.jsx` (chips de filtro): reutilizarlas en secciones de listado/CRUD nuevas para mantener consistencia. El portal de comisión es **mobile-first**: el tablero de tareas usa un segmentado por estado en mobile y kanban de 3 columnas en desktop.

## Lenguaje visual (páginas públicas)

- **Tipografía**: Poppins (display, 600–800) + Inter (texto) se cargan en `index.html`
  vía Google Fonts. Estaban declaradas en Tailwind pero **nunca se cargaban** (todo caía
  a la sans del sistema) — no quitar esos `<link>`.
- **Lenguaje editorial** (Home y Contact son la referencia; propagado a TODAS las
  públicas en la Sesión E — páginas nuevas deben nacer con él): eyebrows en versalitas
  con filete dorado (`src/components/ui/eyebrow.jsx`), headings en *sentence case* y
  voseo, filas/bandas con bordes hairline en vez de cards con sombra, `rounded-sm`,
  `brand-gold` como acento puntual (nunca degradados de texto), animaciones con
  `useReducedMotion` + `viewport: once`. Evitar los clichés que se quitaron: pills
  glassmórficos, grids de puntos, blobs desenfocados, todo-centrado.
- **Tokens**: paleta única `brand.*` en `tailwind.config.js` (los tokens shadcn HSL de
  `index.css` derivan de ella). No crear colores/fondos nuevos fuera de `brand.*`.
  CTAs con `<Button variant="action">`; labels de forms `text-brand-dark font-semibold`
  en sentence case; errores de validación `text-sm text-red-600`.
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
- Correr `npm run build` (y, si tocaste código, `npm run lint` + `npm test`) antes de commitear.
- **Tema**: la app es **light-only**. El dark mode se eliminó en la Sesión G (no quedan
  `next-themes`, `ThemeSwitch`, `forcedTheme`, paleta `.dark` ni variantes `dark:`). No
  agregar variantes `dark:`; el token `brand-dark` es un color de marca, no dark mode.
- **Nunca** versionar `node_modules` (está en `.gitignore`; estuvo versionado y rompía entre OS). Si hay binarios raros (ej. esbuild de otro SO, `.bin` sin permisos): `rm -rf node_modules && npm ci`.
- Vercel: los **preview deployments dan 401** (protección); validar OG/social y comportamiento solo en **producción**, no en previews.

## Deuda técnica conocida

Dos archivos, con roles distintos (se partieron el 2026-08-16, cuando el ROADMAP llegó a
1.522 líneas con el 88% de historia y las premisas viejas empezaron a pudrirse sin que
nadie lo notara):

- **`ROADMAP.md`** — **solo lo que falta hacer.** Es el que hay que leer antes de
  trabajar y el que hay que mantener al día. Incluye los dos procedimientos de
  verificación que se aprendieron rompiendo cosas: comprobar el bundle en un navegador
  de verdad, y validar migraciones en Docker.
- **`HISTORIAL.md`** — el trabajo cerrado (sesiones A-I, 83 ítems) **con su
  razonamiento**. Consultá acá antes de deshacer algo que parezca raro: seguido hay un
  motivo documentado.

**La numeración de ítems (`4.1`, `6.2`, …) es estable** y la citan ~35 archivos de código
en comentarios. Mové ítems entre archivos si hace falta, pero no los renumeres.

Estado al 2026-09-02: **2 vulnerabilidades**, la única viva es `react-router-dom@6.30.4`
(open redirect → XSS) y su arreglo es react-router v7, un major. **265 tests** en el sitio
(más 95 en el servicio de pagos, repo aparte); falta cobertura del flujo real, y en
particular **el runtime de las Edge Functions no se puede probar acá** (`supabase start`
falla en esta máquina), así que cada cambio en un `index.ts` se prueba recién en producción.
ESLint deja **53 warnings** de backlog: **la barra es 0 errores**, los warnings se barren de
a poco.

**Leé `ROADMAP.md` § "🚦 Por dónde arrancar" antes de trabajar**: es lo primero del archivo,
se reescribe al cierre de cada jornada y dice qué verificar antes de tocar nada. El cierre
de la última jornada está en **§11.7** (la anterior, en §11.6). Entre las dos suman **nueve
afirmaciones de este repo que resultaron falsas** y tres verificaciones que no verificaban
nada. Leelas: son el mejor resumen de cómo se rompe este proyecto. **La deuda abierta del
club vive toda junta en §12.10.**

**Tres cosas que costaron trabajo real y conviene no volver a aprender:**
- **Antes de escribir una migración, `git fetch` y conectate a la base y mirá.** El
  2026-08-30 se escribieron tres commits contra un esquema que el repo describía mal
  (`HISTORIAL.md`, Sesión J) y sobre una copia local 20 commits atrás.
- **Una verificación tiene que poder fallar.** Poné un control positivo al lado del
  negativo, y en seguridad probá las dos puntas: que lo ilegítimo se rechace **y** que lo
  legítimo pase. "Rechaza lo malo" y "rechaza todo" se ven idénticos desde afuera.
- **En una integración con un tercero, probá el camino de ERROR.** El webhook tomaba el
  cuerpo de error de MercadoPago como si fuera un pago y perdía cobros en silencio; estaba
  así desde el primer día y lo destapó simular una notificación (§10.21).
