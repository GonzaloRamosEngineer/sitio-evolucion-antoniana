# ROADMAP y estado del proyecto — Sitio Fundación Evolución Antoniana

> **Qué es este documento.** Foto del estado de maduración del proyecto y hoja de ruta
> accionable de deuda técnica, funcionalidad y UI/UX. Nace de una auditoría completa
> del repo (código, backend Supabase, `api/`, config de build, assets).
>
> **Cómo usarlo.** Cada ítem tiene: ubicación en el código (`archivo:línea`), por qué
> importa y un esfuerzo estimado. Marcá `[x]` lo hecho y actualizá la fecha de "Última
> revisión". Cuando cierres un bloque, movelo a la sección "Hecho" al final para no
> perder el historial. Para contexto de arquitectura y modelo de seguridad, ver
> `CLAUDE.md` (este documento no lo reemplaza, lo complementa).
>
> **Última revisión de la auditoría:** 2026-07-18
> **Último commit auditado:** `76cf6d91` (verificación de usuarios + filtro por rol)
> **Último avance registrado:** 2026-08-14, Sesiones F1 y F2 (ver §7 y §8)

---

## 1. Estado de maduración (resumen ejecutivo)

Producto **funcional y en producción**, ~80% maduro. No es un prototipo: 27 páginas,
4 roles con portales propios, pagos reales (MercadoPago), Edge Functions con validación
server-side, historial de git prolijo con pasadas de seguridad/SEO/performance.

| Área | Madurez | Nota |
|------|---------|------|
| Portal Comisión Directiva (kanban + docs versionados) | **Muy maduro** | Único con esquema+RLS versionados, RPC atómico, signed URLs. Estándar a replicar. |
| Actividades (CRUD + registro + confirmaciones) | Maduro | |
| Colaborar / pagos (MercadoPago vía Render) | Maduro | Depende de microservicio externo sin resiliencia (ver 4.3). |
| Preinscripción + panel educación | Maduro | Falta métrica/filtro para estado `inscrito` (ver 3.6). |
| Panel admin general | Maduro | Delega limpio en subcomponentes, no es god-component. |
| Alta de usuarios (Edge Function `create-user`) | Maduro | Valida rol admin leyendo la DB, con rollback. |
| Dashboard de usuario | Maduro c/ bugs | Bug `setUser` (2.1) + copy inflado (2.7). |
| Noticias / Partners / Beneficios | Maduro c/ detalles | Manejo de error inconsistente en mutaciones (4.1). |
| Home / About | Estático | Contenido hardcodeado; Home desincronizada visualmente (5.1). |
| Calidad automatizada (tests, lint, 404, anti-spam) | **Ausente** | Sin red de seguridad. |

---

## 2. Bugs y riesgos concretos (arreglar primero)

- [x] **2.1 — Editar perfil probablemente crashea. HECHO (2026-07-19)**
  `src/pages/Dashboard.jsx:39` desestructura `setUser` de `useAuth`, pero el contexto
  no lo exporta (`src/hooks/useAuth.jsx:219-232`) → `setAuthUser` es `undefined` y al
  guardar el perfil (`Dashboard.jsx:159`) tira "setAuthUser is not a function".
  Además el `EditProfileModal` edita `dni/birth_date/gender` que `useAuth` nunca hidrata
  (`useAuth.jsx:29`), así que arrancan siempre vacíos.
  **Esfuerzo:** ~1-2h. **Prioridad:** alta.

- [x] **2.2 — 3 Edge Functions "fantasma" (invocadas, no versionadas). HECHO (2026-07-19)**
  `send-contact-email` (`Contact.jsx:47`, `ContactModal.jsx:32`),
  `send-activity-confirmation` (`useActivities.jsx:74`),
  `confirm-registration` (`ConfirmAttendancePage.jsx:31`).
  Existen desplegadas a mano en Supabase pero no están en `supabase/functions/` ni
  documentadas. Si se borran o cambian, contacto/confirmaciones se rompen sin que el
  repo lo delate. La confirmación de actividad además **se traga el error**
  (`useActivities.jsx:78-83`).
  **Acción:** exportar el código actual de las 3 funciones a `supabase/functions/` y
  versionarlas. **Esfuerzo:** ~medio día. **Prioridad:** alta.
  _(2026-07-19: bloqueado a la espera de un personal access token `sbp_...` de
  Supabase para `supabase functions download`; la secret key del proyecto no sirve
  para la Management API.)_

- [x] **2.3 — Scaffold de Hostinger Horizons corriendo en PRODUCCIÓN. HECHO (2026-07-19)**
  `vite.config.js:144-198` agrega `addTransformIndexHtml` **siempre** (fuera del guard
  `isDev`). Inyecta en el HTML publicado: monkeypatch global de `window.fetch`
  (`:105`), handlers que reenvían errores por `postMessage(..., '*')` (`:60`) y
  sobrescritura de `console.error` (`:79`). Es telemetría muerta del editor original en
  cada visita real. También `public/.htaccess` (muerto en Vercel) setea
  `X-Powered-By: "Hostinger Horizons"`.
  **Acción:** borrar el bloque Horizons de `vite.config.js` y `public/.htaccess`.
  **Esfuerzo:** ~1h. **Prioridad:** alta (higiene/seguridad, cero riesgo de romper).

- [x] **2.4 — RLS de tablas públicas NO versionado. HECHO (2026-07-19)** —
  `supabase/migrations/20260719120000_baseline_public_schema_rls.sql`.
  Toda escritura sale del browser con la anon key, así que las políticas RLS **son** la
  seguridad real. Las de `projects/tasks/documents/document_versions` y el bucket están
  versionadas; las de `users` (base), `partners`, `benefits`, `news`, `activities`,
  `registrations`, `memberships`, `donations`, `education_preinscriptions`,
  `legal_documents`, `fundacion_metrics` viven solo en la consola de Supabase.
  **Acción:** exportar el esquema + RLS actuales a `supabase/migrations/` (idempotentes).
  **Esfuerzo:** ~1 día. **Prioridad:** alta (mayor punto ciego de auditoría).

- [x] **2.5 — Sin página 404 / catch-all. HECHO (2026-07-19)** — `src/pages/NotFound.jsx` + ruta `*`.
  El `<Routes>` de `src/App.jsx` no tiene ruta `*`. Una URL inexistente renderiza el
  shell (Header/Footer) con `<main>` vacío.
  **Acción:** agregar `<Route path="*" element={<NotFound/>} />`. **Esfuerzo:** ~1-2h.

- [x] **2.6 — Formulario de educación falla en silencio. HECHO (2026-07-19)**
  El schema zod valida email, WhatsApp y 5 selects (`EducationForm.jsx:16-28`), pero
  solo se renderizan errores de `full_name/dni/age` (`:95,102,107`). Email (`:114-116`),
  WhatsApp (`:118-120`) y todos los selects (`:132-155,187-244`) no muestran feedback.
  Si falta una localidad, el envío no pasa y el usuario no ve por qué.
  **Acción:** agregar bloques `{errors.x && ...}` a los campos faltantes.
  **Esfuerzo:** ~1-2h.

- [x] **2.7 — Copy que compromete credibilidad. HECHO (2026-07-19)** — pendiente de validación del copy final por la Fundación.
  Dashboard afirma "PCI DSS", "cifrado SSL 256 bits", "sincronización cada 15 min con el
  servidor central" (`Dashboard.jsx:410,418`) — no respaldado por la arquitectura.
  About lista reconocimientos aspiracionales (`About.jsx:375`). En una fundación que
  publica transparencia, revisar/ajustar. **Esfuerzo:** ~1h (decisión + edición de copy).

- [x] **2.8 — Formularios públicos sin anti-spam. HECHO (2026-07-19)** — honeypot
  compartido (`src/components/Forms/Honeypot.jsx`) en Contacto, modal de Colaborar,
  Postular Partner y Preinscripción.
  Contacto, Postular Partner y Preinscripción escriben directo a BD/función con anon key,
  sin honeypot ni captcha. **Acción:** honeypot mínimo o rate-limit en la Edge Function.
  **Esfuerzo:** ~medio día.

---

## 3. Funcionalidad — inconsistencias e incompletitudes

- [ ] **3.1 — Orden/duplicación de rutas admin de actividades.**
  `/admin/*` (`App.jsx:145`) se declara antes que `/admin/activities/new|edit`
  (`:152-167`); en React Router v6 matchea por especificidad, pero conviven con la
  sección de actividades del `AdminPanel`. Revisar para evitar fragilidad.

- [x] **3.2 — Perfil de usuario parcial.** (Ver 2.1.) **HECHO (2026-07-19)**

- [x] **3.3 — Comentario obsoleto "Fase 1 placeholders"** en `CommissionPortal.jsx:16-19`. **HECHO (2026-07-19)**

- [ ] **3.4 — Datos institucionales hardcodeados.** Métricas de Home
  (`Home.jsx:51-72`), reconocimientos/autoridades de About (`:60-85`). Evaluar moverlos
  a BD (`fundacion_metrics` ya existe) para que no queden desactualizados.

- [x] **3.5 — Componentes de auth muertos en el repo. HECHO (2026-07-19, Sesión E).**
  `LoginForm.jsx` y `RegisterForm.jsx` borrados (verificado: sin imports).
  El login/registro real vive en `LoginPage`/`RegisterPage`.

- [x] **3.6 — Estado `inscrito` de educación sin métrica ni filtro. HECHO (2026-08-14, Sesión F1).**
  `EducationAdmin.jsx`: `stats.inscrito` + quinta `MetricCard` "Inscritos" (grid a
  `lg:grid-cols-5`) + `TabsTrigger value="inscrito"`. De paso los colores de las tarjetas
  se alinearon con `StatusBadge` (pending=ámbar, contacted=azul, inscrito=verde,
  rejected=rojo; total pasó a `brand`) y la tarjeta de contactados se renombró
  "Gestión Exitosa" → "Contactados", porque con `inscrito` visible había dos tarjetas
  que se leían como el estado final exitoso. El export CSV ya usaba el status crudo,
  así que `inscrito` sale bien sin cambios.

---

## 4. Deuda técnica — arquitectura

- [x] **4.1 — Capa de datos con 3 contratos de retorno distintos. HECHO (2026-08-14, Sesión F2).**
  Era: getters que **lanzan**, `addPartner` que devuelve `null` en error, `deletePartner`
  que **devuelve el error como valor de retorno**, `activitiesApi`/`membershipApi` que
  **silencian** con `[]`, `educationApi` que re-lanza, y `projectsApi`/`documentsApi` que
  ya devolvían `{data, error}`.
  **Ahora:** contrato único documentado en `src/lib/dataResult.js` — **toda** función de
  la capa devuelve `{ data, error }` y **nunca lanza**. Cuatro helpers
  (`listResult`/`rowResult`/`voidResult`/`attempt`) normalizan cada forma de query.
  Decisiones de diseño:
  - En el fallo de una lista, `data` es `[]` y no `null`, para que un consumidor que
    renderiza antes de mirar `error` muestre vacío en vez de romperse. El error no se
    oculta: viaja entero en `error`.
  - Los getters de fila única pasaron de `.single()` a `.maybeSingle()`: "no existe" es
    `{data: null, error: null}`, no un PGRST116. Antes el consumidor no podía distinguir
    "no encontrado" de "se cayó la consulta".
  - `attempt` preserva la instancia de error original, así el flag `isColdStart` de
    `WebhookError` (4.3) sigue llegando al consumidor.
  - Los `console.error` de la capa quedaron centralizados en `dataResult.js`: cuando se
    haga 6.4 (logger con no-op) hay **un** lugar que tocar en vez de repartidos.
  Migrados 4 módulos de la capa (`storage.js`, `activitiesApi`, `educationApi`,
  `membershipApi`) y sus **16 archivos consumidores**. `userApi`, `projectsApi` y
  `documentsApi` ya cumplían y no se tocaron. **Cubierto por 21 tests nuevos**
  (`dataResult.test.js`, `storage.test.js` con Supabase mockeado, y `membershipApi.test.js`
  actualizado al contrato).

- [ ] **4.2 — Sin caché de estado servidor (no react-query/SWR).**
  Cada página hace fetch manual con `useEffect` (18 páginas). `Activities.jsx:43-51` usa
  `sessionStorage('activities_loaded')` como caché casera frágil. No hay N+1 (los joins
  usan embedding de Supabase, correcto; `useAdminStats.js:37-97` usa `Promise.all`).
  **Acción:** migrar a TanStack Query incrementalmente; elimina cientos de líneas de
  loading/error boilerplate. **Esfuerzo:** ~3-4 días. **Prioridad:** importante.

- [x] **4.3 — Proxy a Render frágil (pagos). HECHO (2026-08-14, Sesión F1).**
  `vercel.json:6` reescribe `/api/*` → microservicio Render. `membershipApi.js:59-78`
  (`callWebhook`) hace `fetch` **sin timeout, sin retry, sin manejo de cold-start**.
  El free-tier de Render duerme; el usuario ve "Error en la operación" (`:74`) sin
  distinguir cold-start de fallo real. ~~Además naming inconsistente en share de
  partners~~ **HECHO (2026-07-19, Sesión E — previews):** se eliminó el rewrite roto de
  partners (el archivo es `[slug].js`, ruta dinámica; el rewrite apuntaba a un `slug`
  inexistente) y se unificó el sistema de share (ver §8 "Previews de compartir").
  **HECHO (2026-08-14, Sesión F1):** `callWebhook` con timeout por `AbortController`
  (10s el primer intento para cortar rápido si Render duerme, 25s los reintentos para
  darle tiempo a despertar), 3 intentos con backoff 800ms/2500ms, y clase `WebhookError`
  con flags `isColdStart`/`status`. Los 4xx **no** se reintentan (son errores reales del
  negocio) y conservan el mensaje del servidor; los 5xx y los fallos de red sí, y al
  agotarse devuelven `COLD_START_MESSAGE` explícito. `Dashboard.performAction` dejó de
  tragarse el mensaje (era el síntoma que reportaba este ítem) y `Collaborate` titula
  distinto el cold-start. Cubierto por `src/api/membershipApi.test.js` (6 casos).

- [x] **4.4 — Dark mode = código muerto. HECHO (2026-07-19, Sesión G).**
  **Decisión del usuario: eliminarlo** (completar dark mode real era un trabajo de diseño
  de 60+ archivos fuera del alcance de la sesión de calidad). Eliminados: dependencia
  `next-themes`, `src/providers/ThemeProvider.jsx`, `src/components/ThemeSwitch.jsx`
  (y su import comentado en Header), `forcedTheme`/wrapper en `App.jsx`, `darkMode: ["class"]`
  en `tailwind.config.js`, la paleta `.dark` de `index.css` y las 3 variantes `dark:`
  sueltas (App, checkbox). `grep dark:` → 0 en `src/`. (El token `brand-dark #0F294A`
  NO es dark mode: es un color de marca, se conserva.)

- [x] **4.5 — `react-helmet` sin mantenimiento (28 archivos). HECHO (2026-07-19, Sesión G).**
  Migrado a `react-helmet-async`: reemplazados los 28 imports (`Helmet`), `main.jsx`
  ahora envuelve la app en `<HelmetProvider>`, y `react-helmet` salió de `package.json`.
  La API de `<Helmet>` es idéntica, así que no cambió el markup de las páginas.
  Build OK.

- [x] **4.6 — RHF+zod. DECIDIDO híbrido (Sesión G); superficie pública COMPLETA (2026-08-14, Sesión F1).**
  `react-hook-form`, `zod`, `@hookform/resolvers` se usan **solo** en `EducationForm.jsx`;
  el resto valida con `useState` manual. **Decisión del usuario:** dejar RHF+zod en
  `EducationForm` (es el patrón superior y ya funciona) y **estandarizar gradualmente**
  el resto de los forms al tocarlos en las Sesiones E/F, en vez de un refactor big-bang
  ahora. No se elimina la dependencia. Queda como deuda declarada e intencional, no como
  inconsistencia accidental. **Avance (Sesión E, 2026-07-19):** `LoginPage` y
  `RegisterPage` migradas a RHF+zod al rediseñarlas (schemas con mensajes en voseo,
  errores por campo, `.refine()` para confirmación de contraseña).
  **HECHO (2026-08-14, Sesión F1):** migrados los 3 que quedaban de la lista —
  `Contact.jsx`, `ContactModal.jsx` y `ApplyPartnerPage.jsx`. Cada uno con schema zod
  en voseo, error por campo (`text-sm text-red-600`), `noValidate`, `isSubmitting` de
  RHF en lugar de estado manual y `reset()` en vez de limpiar campo por campo. El
  honeypot queda **fuera** del form de RHF a propósito (no se valida ni se envía).
  **Deuda declarada que sigue abierta (intencional, no accidental):**
  `GuestRegistrationForm`, `RequestPasswordResetForm` y `UpdatePasswordForm` son los
  últimos formularios públicos con validación manual; los internos (Admin/*, Comision/*)
  se estandarizan solo al tocarlos.

- [x] **4.7 — Sin ESLint configurado ni tests. HECHO (2026-07-19, Sesión G).**
  - **ESLint flat config** (`eslint.config.js`) + script `npm run lint`. Base
    `js.recommended` + `eslint-plugin-react` (jsx-runtime, coherente con el runtime
    automático de Vite) + `react-hooks` + `react-refresh`. Reglas calibradas contra el
    código real: `no-unused-vars` como warning (ignora `React` y prefijo `_`),
    `prop-types`/`no-unescaped-entities` off (no usamos PropTypes; copy en español).
    Reemplaza a `eslint-config-react-app` (eslintrc, removido). El gate **falla en
    errores** e informa 61 warnings preexistentes (imports sin usar, 2 exhaustive-deps)
    como backlog para D/E — no bloquean. Estado inicial: **0 errores**.
    De paso, el lint cazó y se arreglaron 4 errores reales: 2 `catch {}` vacíos
    (`api/share/news/slug.js`, `membershipApi.js`), 1 escape inútil en regex
    (`documentsApi.js`) y `fetchpriority`→`fetchPriority` en `Home.jsx` (React 18 solo
    emite el atributo con el nombre camelCase).
  - **Vitest + Testing Library + jsdom**: `vitest.config.js` aislado (no reusa
    `vite.config.js` para no cargar los plugins del editor visual), `src/test/setup.js`
    (jest-dom), scripts `npm test` / `npm run test:watch`. 3 tests de humo, 7 casos:
    `cn()` (utils), `Honeypot` (anti-spam de 2.8) y `Eyebrow` (lenguaje visual). Todos verdes.
  - Versiones fijadas por compatibilidad con `vite@4` (EOL, upgrade diferido en 6.7):
    `vitest@0.34`, `jsdom@24`.

---

## 5. UI/UX

### Fortalezas reales (no tocar / usar de referencia)
- Header sólido: hover-intent, cierre en cambio de ruta/scroll/click-fuera, estados
  activos con `layoutId`, acordeón mobile (`Header.jsx`).
- `Activities.jsx` es la página mejor resuelta: loading/error/empty diferenciados,
  badges semánticos, CTA contextual por estado/cupo.
- **Admin y Comisión comparten un mismo lenguaje visual** (mismo hero, cards, fondo) —
  no parecen productos distintos. El temor de fragmentación es infundado.
- Tablas admin en `overflow-x-auto`; casi todas las `<img>` con `alt`.

### Problemas (path:línea)

- [x] **5.1 — CUATRO paletas superpuestas / 3 azules de marca / 3 fondos "blancos". HECHO (2026-07-19, Sesión E).**
  Paleta única `brand.*`: eliminados de `tailwind.config.js` los tokens legacy
  (`blanco-fundacion`, `marron-legado`, `celeste-complementario`, `azul-profundo`,
  `primary.antoniano`) y sus CSS vars muertas de `index.css`. Los tokens shadcn (HSL)
  ahora derivan de brand: `--primary` = brand-primary `#163A68`, `--background` =
  brand-sand `#F9F7F5`, `--foreground` = brand-dark `#0F294A`. Migrados todos los usos
  legacy (Auth forms, `GuestRegistrationForm`, `ProtectedRoute`, `App.jsx`) y los
  fondos arbitrarios (`bg-[#F8FAFC]` en Preinscripcion/EducationAdmin, `bg-[#FDFDFD]`
  en Dashboard) → `bg-brand-sand`. `grep` de tokens legacy en `src/` → 0.

- [x] **5.2 — Errores de validación no renderizados en EducationForm.** (= 2.6) **HECHO (2026-07-19)**

- [x] **5.3 — Contraste insuficiente en labels/ayuda. HECHO (2026-07-19, Sesión D).**
  `text-gray-400` (#9CA3AF, ≈2.85:1) → `text-gray-600` (#4B5563, ≈7:1, pasa AA) en el
  texto de labels/descripciones/ayuda sobre fondo claro: LoginPage y RegisterPage
  (labels, CardDescription, links de pie), EducationForm (13 labels + nota de pie),
  Collaborate (subtítulos de opciones), Preinscripcion (aviso de privacidad).
  **Criterio:** solo se tocaron instancias de **texto sobre fondo claro**; se dejaron a
  propósito los iconos decorativos (`text-gray-400`/`text-gray-300` en lucide dentro de
  inputs) y las instancias sobre fondo oscuro (donde el gris claro sí contrasta).
  **Pendiente (barrido fino en E/5.7/5.12):** revisar caso por caso el resto de
  `text-gray-*` verificando el fondo antes de cambiar.

- [x] **5.4 — `prefers-reduced-motion` + animación global de cards. HECHO (2026-07-19, Sesión D).**
  Solución global en vez de tocar 6 archivos: `App.jsx` envuelve todo en
  `<MotionConfig reducedMotion="user">`. framer-motion respeta ahora el ajuste del SO en
  **todo** el árbol (card.jsx + los 14 `whileInView` + demás): desactiva animaciones de
  transform/layout y conserva las de opacidad, así el contenido igual aparece (no queda
  invisible). Cumple WCAG 2.3.3. El `useReducedMotion` manual de Home queda redundante
  pero inofensivo.

- [x] **5.5 — `<main>` anidados/duplicados en 9 páginas. HECHO (2026-07-19, Sesión D).**
  El `<main>` del shell (`App.jsx`) es ahora el único; los `<main>` de NewsPage,
  AdminPanel, ApplyPartnerPage, BenefitsPage, BenefitDetailPage, PartnersPage,
  NewsDetailPage, TermsOfUse y PrivacyPolicy pasaron a `<div>` (misma clase). `grep <main`
  en `src/pages` → 0. HTML válido y un solo landmark `main` por documento.

- [x] **5.6 — Auth: labels con `htmlFor/id`, toggles con `aria-label`, `<h1>`. HECHO (2026-07-19, Sesión D).**
  LoginPage: 2 pares `htmlFor`/`id` (`login-email`, `login-password`), toggle de
  contraseña con `aria-label` dinámico, `<h1 class="sr-only">Iniciar sesión</h1>`.
  RegisterPage: 5 pares `htmlFor`/`id` (`reg-name/phone/email/password/confirm`), 2
  toggles con `aria-label`, `<h1 class="sr-only">Crear una cuenta</h1>`. El `<h1>` es
  `sr-only` para no alterar el diseño (el título visible sigue siendo el `CardTitle`).

- [~] **5.7 — Tipografía micro + valores arbitrarios. HECHO en superficie pública (2026-07-19, Sesión E).**
  ~~Logos de alianzas en Home a `text-[7px]` — ilegible.~~ **HECHO (2026-07):** alianzas
  refactorizadas a `<ul>` semántica con `text-lg`/`text-[11px]`.
  **HECHO (Sesión E):** errores de validación `text-[9px]` → `text-sm text-red-600`
  (EducationForm, auth); labels `text-[10px] uppercase` → patrón unificado (ver 5.12);
  micro-copy de forms/páginas públicas llevado a mínimos `text-xs`.
  **Backlog opcional:** los paneles internos (Dashboard, EducationAdmin, Admin/*,
  Comision/*) conservan micro-badges `text-[9-10px]` intencionales de su lenguaje de
  tablas/badges; barrer solo si molesta en uso real.

- [x] **5.8 — Variantes de botón sin usar; CTA hardcodeado. HECHO (2026-07-19, Sesión E).**
  `button.jsx`: variantes muertas `antoniano`/`marron` eliminadas; creada
  `variant="action"` (granate `bg-brand-action`, hover `red-800`, font-bold, sombra).
  Convertidos ~25 CTAs que hardcodeaban esas clases en páginas públicas, Header,
  Admin/* y Comision/* (los `<span>` badge con bg-brand-action se conservan; los
  botones outline-action de reintentar también, son otro patrón).

- [x] **5.9 — `ApplyPartnerPage` sin estado loading → doble submit. HECHO (2026-07-19)**
  — `isSubmitting` + spinner + manejo del `null` que devuelve `addPartner` en error.

- [x] **5.10 — `BottomNavBar` tapa 16px de contenido. HECHO (2026-07)**
  `App.jsx:192` ahora reserva `pb-20`.

- [x] **5.11 — Offsets sticky inconsistentes. HECHO (2026-07-19, Sesión D).**
  `AdminPanel.jsx` (sticky móvil + aside) pasó de `top-24` a `top-20`, alineado con el
  header real `h-20` y con `CommissionPortal.jsx` (que ya usaba `top-20`).

- [x] **5.12 — Formularios con 3 estilos de label distintos. HECHO (2026-07-19, Sesión E).**
  Patrón único `text-brand-dark font-semibold` + sentence case aplicado a: LoginPage,
  RegisterPage, EducationForm (13 labels + separadores de sección), Preinscripcion,
  GuestRegistrationForm, RequestPasswordResetForm y UpdatePasswordForm. Inputs de forms
  públicos con el estilo de Contact (`bg-brand-sand/70 border-brand-dark/15 rounded-sm`).
  **HECHO (2026-08-14, Sesión F1):** `ContactModal` migrado al patrón al pasarlo a
  RHF+zod (inputs `bg-brand-sand/70 border-brand-dark/15 rounded-sm`, botón
  `variant="action"`, labels en sentence case, copy en voseo).

- [x] **5.13 — Propagar el lenguaje editorial de Home/Contact al resto. HECHO (2026-07-19, Sesión E).**
  Hero editorial (patrón de Contact: `bg-brand-primary` + `border-t-2 border-brand-gold`
  + `bg-hero-glow` + `Eyebrow light` + h1 sentence case alineado a la izquierda)
  aplicado a: About (rediseño completo de secciones), Activities, NewsPage,
  PartnersPage, BenefitsPage, Collaborate, LegalDocuments (+ listado en filas hairline),
  Login/Register (card sobria `rounded-sm`) y Preinscripcion. Eliminados los clichés:
  grids de puntos (radial-gradient inline), pills glassmórficos, degradados de texto en
  h1 y placeholders falsos de logos (chips MINISTERIO/FUNDACIÓN).

---

## 6. Nice-to-have / limpieza

- [ ] **6.1 — Imágenes sin optimizar: ~7,1 MB de PNGs crudos.**
  **Parcial (2026-07):** `donativo_cancha.png` 2,82 MB → `donativo_cancha.webp` 86 KB
  (1280px, q82, con `width/height` + `fetchpriority="high"`); PNG eliminado. Faltan:
  `mercadolibre_solidario.png` 1,57 MB, `fondo_blanco_logo.png` 891 KB,
  `hogar_abuelos.png` 611 KB, `og-default.png` 527 KB. Convertir a WebP/AVIF +
  redimensionar (~-80%). **La mejora de performance más barata.** ~2-3h.
- [ ] **6.2 — Sin `manualChunks` de vendor** (`vite.config.js`). `framer-motion` (eager en
  `App.jsx:14`, usado en 59 archivos) va al chunk inicial. ~2h.
- [x] **6.3 — Ruta local del dev filtrada** en comentario línea 1 de 7 archivos. **HECHO (2026-07-19)**
- [ ] **6.4 — 63 `console.*` sin gate** en `src/` van al bundle de prod. Logger con no-op. ~2h.
- [ ] **6.5 — Restos muertos:** `plugins/visual-editor/` (810 líneas, solo dev),
  `public/.htaccess` (Apache, muerto en Vercel), `public/s/novedades/test.html`
  (prueba en prod), `tools/generate-llms.js` (verificar uso). ~2-3h.
- [ ] **6.6 — Duplicación listado/detalle:** `PartnersPage/PartnerDetailPage`,
  `BenefitsPage/BenefitDetailPage`, `NewsPage/NewsDetailPage` repiten esqueleto. Extraer
  hook `useResourceBySlug` + componente `<SanitizedHtml>`. ~1-2 días.
- [ ] **6.7 — Upgrades de deps (incremental):** `vite@4` (EOL, bloquea vuln), `eslint@8`
  (EOL, v9 flat config), `tailwindcss@3`→v4, `framer-motion@10`→`motion` (costoso, 59 usos),
  `date-fns@3`→v4 (3 archivos), `uuid@9` (1 solo uso; `documentsApi.js:36` ya usa
  `crypto.randomUUID()` nativo — se puede eliminar la dep). React Router ya tiene
  `future` flags v7 (`App.jsx:185`). Las 3 vulns npm conocidas requieren vite@8/uuid@14.

---

## 7. Plan de sesiones de trabajo (acordado 2026-07-19)

Los ítems pendientes se agrupan en sesiones que se potencian entre sí (mismo archivo,
mismo tema, mismo riesgo). Orden acordado: **A → B → C → G → D → E → F → H**
(F se partió en F1/F2/F3 el 2026-08-14, ver tabla).
La lógica: primero bugs y lo barato (A, B), cerrar seguridad (C), luego la red de
seguridad de lint/tests (G) *antes* de los refactors grandes (D, E, F), y performance
al final. Al iniciar una sesión de trabajo nueva, retomar desde acá.

| Sesión | Tema | Ítems | Dedicación | Estado |
|--------|------|-------|-----------|--------|
| A | Barrida rápida | 2.3, 2.5, 2.6/5.2, 3.3, 6.3, 2.7 | ~medio día | ✅ 2026-07-19 |
| B | Perfil de usuario | 2.1, 3.2 | ~medio día | ✅ 2026-07-19 |
| C | Seguridad y auditoría | 2.4, 2.2, 2.8 (+5.9) | ~1,5 días | ✅ 2026-07-19 |
| G | Infra de calidad | 4.7 (ESLint flat + Vitest humo), 4.5 (react-helmet-async), 4.4 (dark mode: eliminado), 4.6 (RHF+zod: híbrido) | ~1-2 días | ✅ 2026-07-19 |
| D | Accesibilidad | 5.3, 5.4, 5.5, 5.6, 5.11 | ~1 día | ✅ 2026-07-19 |
| E | Identidad visual | 5.1, 5.7, 5.12, 5.8, 5.13, 3.5 (+4.6 auth) | ~2-3 días (partible) | ✅ 2026-07-19 |
| F1 | Robustez de datos — lo barato | 4.3, 3.6, 4.6 (Contact/ContactModal/ApplyPartner) + 5.12 (ContactModal) | ~1 día | ✅ 2026-08-14 |
| F2 | Contrato único de la capa de datos | 4.1 | ~2-3 días | ✅ 2026-08-14 |
| **F3** | **Caché de estado servidor (SIGUIENTE)** | 4.2 (TanStack Query) — F2 ya está hecho, el terreno está parejo | ~3-4 días (partible) | ⬜ |
| H | Performance y limpieza | 6.1, 6.2, 6.4, 6.5 | ~1 día | ⬜ |

Sueltos para intercalar: 3.1 (rutas admin), 3.4 (datos institucionales a BD — requiere
decisión de la Fundación), 6.6 (dedup listado/detalle), 6.7 (upgrades de deps, al final).

Notas de las sesiones:
- **G (hecha 2026-07-19):** decisiones tomadas — dark mode **eliminado** (4.4); RHF+zod
  **híbrido** (4.6, se estandariza gradualmente en E/F). Ya hay red de lint/tests.
- **E (hecha 2026-07-19):** ver §8. Deja para F: RHF+zod en Contact/ContactModal/
  ApplyPartnerPage y la unificación de estilos del form de `ContactModal`.
- **F1 (hecha 2026-08-14):** ver §8. Cerró 4.3, 3.6, 4.6 y el pendiente de 5.12.
- **F2 (hecha 2026-08-14):** ver §8. Contrato único `{data, error}` en toda la capa.
  Fue antes que F3 a propósito: migrar a TanStack Query sobre los 3 contratos viejos
  habría obligado a tocar las mismas 18 páginas dos veces.
- **F3:** ahora que la capa devuelve siempre `{data, error}` y nunca lanza, los
  `queryFn` de TanStack Query son envoltorios de una línea
  (`const {data, error} = await getX(); if (error) throw error; return data;`).
  Ojo: TanStack **espera que el queryFn lance** para marcar la query como fallida, o sea
  que la conversión inversa se hace ahí, en el borde, y no en la capa.
  Empezar por las páginas públicas de listado (Activities, NewsPage, PartnersPage,
  BenefitsPage), que son las que más se benefician del caché, y de paso sacar el
  `sessionStorage('activities_loaded')` casero de `Activities.jsx`.

---

## 8. Hecho

<!-- Al cerrar un ítem, movelo acá con fecha y commit. Ej:
- [x] 2.3 — Scaffold Horizons fuera de prod. (2026-07-20, commit abc1234)
-->

**Sesión A — barrida rápida (2026-07-19):**
- [x] 2.3 — Scaffold Horizons fuera de prod: eliminado `addTransformIndexHtml` + 4 scripts
  inyectados de `vite.config.js`; borrado `public/.htaccess`. Verificado en `dist/index.html`.
- [x] 2.5 — Página 404 (`src/pages/NotFound.jsx`, estilo editorial con `Eyebrow`) + ruta
  catch-all `*` en `App.jsx`.
- [x] 2.6 / 5.2 — EducationForm ahora muestra errores en email, WhatsApp y los 5 selects
  obligatorios (mismo patrón que full_name/dni/age).
- [x] 2.7 — Copy: Dashboard ya no afirma PCI DSS/SSL 256/sync 15 min (ahora describe la
  arquitectura real: Mercado Pago procesa, HTTPS, datos al ingresar); About cambia
  "Reconocimientos" aspiracionales por "Nuestros compromisos". **Copy sujeto a validación.**
- [x] 3.3 — Comentario "Fase 1 placeholders" limpiado en `CommissionPortal.jsx`.
- [x] 6.3 — Comentarios `// C:\Users\gandr\Downloads\...` eliminados de los 6 archivos restantes.

**Sesión B — perfil de usuario (2026-07-19):**
- [x] 2.1 / 3.2 — Editar perfil ya no crashea: `useAuth` exporta `setUser` e hidrata
  `dni/birth_date/gender`; `updateUserProfile` devuelve la fila actualizada
  (`.select().single()`, la policy permite leer la fila propia); `EditProfileModal`
  normaliza opcionales vacíos a `null` (Postgres rechazaba `''` en `birth_date`).

**Sesión D — accesibilidad (2026-07-19):**
- [x] 5.5 — Un solo `<main>`: los 9 `<main>` anidados de páginas pasaron a `<div>`; queda
  solo el del shell (`App.jsx`).
- [x] 5.11 — Sticky offsets unificados a `top-20` (AdminPanel, alineado con el header `h-20`).
- [x] 5.6 — A11y de Login/Register: `htmlFor`/`id` en todos los inputs, `aria-label` en
  los toggles de contraseña, `<h1 class="sr-only">` por página.
- [x] 5.3 — Contraste de labels/ayuda sobre fondo claro: `text-gray-400` → `text-gray-600`
  en auth, EducationForm, Collaborate y Preinscripcion (solo texto sobre fondo claro; se
  respetaron iconos decorativos y grises sobre fondo oscuro).
- [x] 5.4 — `prefers-reduced-motion`: `<MotionConfig reducedMotion="user">` global en
  `App.jsx` (cubre card.jsx + los 14 `whileInView`). WCAG 2.3.3.

**Sesión G — infra de calidad (2026-07-19):**
- [x] 4.7 — ESLint flat config (`eslint.config.js`) + `npm run lint` (0 errores, 61
  warnings de backlog); reemplaza `eslint-config-react-app`. Vitest + Testing Library +
  jsdom (`vitest.config.js` aislado, `src/test/setup.js`, `npm test`/`test:watch`), 3
  tests de humo (7 casos: `cn`, `Honeypot`, `Eyebrow`), todos verdes. El lint cazó y se
  arreglaron 4 errores reales (2 `catch {}` vacíos, 1 escape inútil de regex,
  `fetchpriority`→`fetchPriority` en Home).
- [x] 4.5 — `react-helmet` → `react-helmet-async`: 28 imports migrados + `<HelmetProvider>`
  en `main.jsx`; `react-helmet` fuera de `package.json`. API idéntica, build OK.
- [x] 4.4 — Dark mode eliminado (decisión del usuario): fuera `next-themes`,
  `ThemeProvider`, `ThemeSwitch`, `forcedTheme`, `darkMode` de Tailwind, paleta `.dark`
  de `index.css` y las variantes `dark:`. `brand-dark` (color de marca) se conserva.
- [~] 4.6 — Decisión del usuario: mantener RHF+zod **híbrido** (solo `EducationForm` hoy;
  estandarizar gradualmente en E/F). Documentado; sin cambio de código.

**Sesión E — identidad visual (2026-07-19):**
- [x] 5.1 — Paleta única `brand.*`: tokens legacy y `primary.antoniano` eliminados de
  `tailwind.config.js`; CSS vars muertas fuera de `index.css`; tokens shadcn (HSL)
  derivados de brand (`--primary` #163A68, `--background` = brand-sand, `--foreground`
  = brand-dark); todos los usos legacy y fondos arbitrarios migrados. `grep` → 0.
- [x] 5.8 — `variant="action"` en `button.jsx` (variantes muertas `antoniano`/`marron`
  eliminadas); ~25 CTAs convertidos en públicas + Header + Admin/* + Comision/*.
- [x] 5.13 — Lenguaje editorial (hero de Contact, Eyebrow, sentence case, voseo, filas
  hairline, rounded-sm) propagado a About (rediseño completo), Activities,
  ActivityDetailPage, NewsPage, PartnersPage, BenefitsPage, Collaborate, LegalDocuments,
  Login/Register y Preinscripcion. Fuera: grids de puntos, pills glassmórficos,
  degradados de texto, placeholders de logos. **Seguimiento (mismo día):** las 4
  páginas de detalle (ActivityDetail, BenefitDetail, NewsDetail, PartnerDetail), que
  no estaban en la lista original, recibieron el pulido editorial conservador
  (rounded-sm, bordes hairline, sin blobs/overlays decorativos, copy en sentence case).
- [x] 5.12 / 5.7 — Labels unificados (`text-brand-dark font-semibold`, sentence case) e
  inputs al estilo Contact en todos los forms públicos; errores de validación a
  `text-sm text-red-600`. Micro-tipografía pública a mínimos `text-xs` (paneles
  internos conservan sus micro-badges intencionales).
- [x] 3.5 — `LoginForm.jsx`/`RegisterForm.jsx` muertos eliminados.
- [~] 4.6 (avance) — `LoginPage`/`RegisterPage` migradas a react-hook-form + zod al
  rediseñarlas; quedan Contact/ContactModal/ApplyPartnerPage para F.
- Verificación: `npm run build` OK, `npm run lint` 0 errores (55 warnings de backlog,
  antes 61), `npm test` 7/7 verdes.
- Nota: la sesión se ejecutó con agentes en paralelo y un corte por límite de sesión a
  mitad de camino; se auditó el estado real archivo por archivo y se completó a mano lo
  que quedó a medias (BenefitsPage, RegisterPage, EducationForm, CTA de Collaborate y
  un import de `ShieldCheck` roto).

**Previews de compartir (OG dinámico) — Sesión E, seguimiento (2026-07-19):**
Objetivo: que al compartir una URL normal (novedades/beneficios/partners) por WhatsApp,
Facebook, etc., se arme una preview con título/imagen/descripción reales, sin exponer
URLs feas `/api/share/...`.
- [x] **Rewrites condicionales por User-Agent** en `vercel.json`: cuando un bot de red
  social (facebookexternalhit, WhatsApp, Twitterbot, LinkedInBot, Telegram, Discord,
  Slack, etc.) pide `/novedades/:slug`, `/beneficios/:slug` o `/partners/:slug`, se le
  sirve la función OG correspondiente; los humanos reciben la SPA normal. Patrón estándar
  para SPAs (el navegador nunca ve la URL `/api/share/`).
- [x] **Nueva función OG de beneficios** (`api/share/benefits/slug.js`), clon del patrón
  de novedades adaptado a la tabla `benefits` (título + descuento, `imagen_url`,
  descripción). Verificada contra producción con un slug real.
- [x] **Novedades**: `og:url`/canonical ahora apuntan a la URL limpia `/novedades/:slug`
  (antes `/api/share/news/...`); el botón de compartir de `NewsDetailPage` copia la URL
  limpia. Función verificada contra producción.
- [x] **Partners**: eliminado el rewrite roto (apuntaba a un archivo `slug` inexistente;
  la ruta real es la dinámica `[slug].js`); agregado fallback de env vars `VITE_*`,
  dimensiones de imagen OG y copy en voseo.
- [x] Endpoints legacy `/api/share/news|benefits/(.*)` conservados (backward compat de
  links ya compartidos) y con headers no-cache.
- **Validación:** las funciones se probaron localmente contra la Supabase de producción
  (OG correcto). El rewrite por User-Agent **solo se puede validar en producción real**
  (los preview deployments de Vercel dan 401). Post-deploy: probar con
  https://developers.facebook.com/tools/debug/ y compartiendo por WhatsApp (cachea la
  preview, variar la URL para re-testear).

**Previews de compartir — Fase 2: slugs de actividades (2026-07-19):**
Antes las actividades se compartían con UUID (`/activities/<uuid>`); ahora tienen slug.
- [x] **Migración** `supabase/migrations/20260719130000_activities_slug.sql`: columna
  `slug` + trigger `generate_activity_slug` (deriva del título, quita el prefijo de ciclo
  `[Ciclo X · …] —`, translitera acentos, unicidad con sufijo md5; slug **estable** ante
  ediciones de título, como news/benefits) + backfill de las filas existentes + índice
  único + grants. **Idempotente.** Validada la lógica de slugify en JS contra los 12
  títulos reales de producción: 12/12 slugs únicos, legibles, sin colisiones.
- [x] **`getActivityById`** (useActivities) resuelve por UUID **o** slug (detecta el
  formato). Los links viejos `/activities/<uuid>` siguen funcionando; la ruta
  `/activities/:id` no cambió (el mismo param sirve para ambos).
- [x] **Links** de listado (Activities), Home y Dashboard usan `activity.slug ||
  activity.id`.
- [x] **Función OG** `api/share/activities/slug.js` + rewrite por User-Agent en
  `vercel.json` (completa el sistema de previews para actividades). Verificada contra
  producción.
- **Resiliencia de orden deploy/migración:** los puntos que dependen de la columna
  (`Home`, join de registros del Dashboard, función OG) usan `select('*')` en vez de
  pedir `slug` explícito, así **no se rompen si el código se deploya antes de correr la
  migración** (el link cae al UUID hasta que exista la columna; el feature se auto-activa
  al aplicarla). Aun así, lo ideal es **correr la migración primero**.
- **IMPORTANTE:** la migración la corre el dueño (SQL Editor de Supabase o
  `supabase db push`); recién ahí aparecen los slugs. Ver `supabase/README.md`.

**Sesión C — seguridad y auditoría (2026-07-19, parcial):**
- [x] 2.4 — Baseline completo del esquema público + RLS versionado en
  `supabase/migrations/20260719120000_baseline_public_schema_rls.sql` (15 tablas,
  34 políticas, 17 funciones, triggers incl. los de `auth.users`, vistas, grants).
  Origen: `supabase db dump` contra producción (vía pooler `aws-0-us-east-1`),
  transformado a idempotente y validado ejecutándolo entero contra la base real
  dentro de `BEGIN...ROLLBACK` sin errores. Las 4 políticas de storage
  (`comision-docs`) ya estaban versionadas en la migración de fase 3.
- [x] 2.8 — Honeypot anti-bots en los 4 formularios públicos (Contacto, modal de
  Colaborar, Postular Partner, Preinscripción): campo `website` invisible; si viene
  con valor se simula éxito sin escribir en la base.
- [x] 5.9 — `ApplyPartnerPage`: `isSubmitting` + spinner (anti doble submit) y
  manejo de error de `addPartner` (antes mostraba éxito aunque fallara el insert).
- [x] 2.2 — Las 3 Edge Functions fantasma descargadas y versionadas en
  `supabase/functions/` (`send-contact-email`, `send-activity-confirmation`,
  `confirm-registration`; sin secretos hardcodeados, usan `Deno.env`). Además el
  error del envío de confirmación ya no se traga: `useActivities` devuelve
  `email_sent` y Activities/ActivityDetailPage avisan si el correo no salió.
  Hallazgo: existe una Edge Function desplegada `crear-preferencia-mercadopago`
  que el frontend NO invoca (los pagos van al microservicio de Render) — candidata
  a legacy; revisar antes de borrar.

**Sesión F1 — robustez de datos, primera tanda (2026-08-14):**
- [x] 4.3 — Resiliencia del proxy a Render en `src/api/membershipApi.js`: `callWebhook`
  con timeout por `AbortController` (10s el primer intento, 25s los reintentos), 3
  intentos con backoff 800ms/2500ms, y `WebhookError` con `isColdStart`/`status`
  exportado junto a `COLD_START_MESSAGE`. Los 4xx no se reintentan y conservan el
  mensaje del servidor (string u objeto serializado); los 5xx y los fallos de red sí.
  Peor caso ≈63s antes de rendirse. `Dashboard.performAction` y los 2 handlers de
  `Collaborate` ahora distinguen cold-start de fallo real en el toast.
- [x] 3.6 — `EducationAdmin`: métrica + tab del estado `inscrito`, colores de las
  `MetricCard` alineados con `StatusBadge`, "Gestión Exitosa" → "Contactados".
- [x] 4.6 (cierre de la lista declarada) — `Contact.jsx`, `ContactModal.jsx` y
  `ApplyPartnerPage.jsx` migrados a react-hook-form + zod: schemas en voseo, error por
  campo, `noValidate`, `isSubmitting` de RHF, `reset()`. En `ApplyPartnerPage` las URLs
  opcionales (sitio web, logo) validan formato solo si vienen con valor, y un estado
  `isRedirecting` mantiene el botón bloqueado durante los 2s previos al redirect (antes
  `isSubmitting` se apagaba y el botón quedaba clickeable). El honeypot de 2.8 queda
  fuera del form de RHF a propósito, sin cambio de comportamiento.
- [x] 5.12 (pendiente menor) — `ContactModal` al patrón visual de Contact.
- [x] **A11y de los tabs de `EducationAdmin` (miss de la Sesión D, encontrado en F1).**
  El `TabsTrigger` base deja `data-[state=active]:text-foreground` (brand-dark) y los
  tabs solo sobrescribían el **fondo**: el tab activo quedaba navy oscuro sobre relleno
  saturado, con contraste insuficiente para texto de 10px bold (ámbar pasaba, azul y
  rojo no). D no lo cazó porque 5.3 barrió `text-gray-*` sobre fondo claro, no texto de
  marca sobre fondos de color. Ahora cada tab fija su color de texto explícito (blanco
  sobre azul/verde/rojo, brand-dark sobre ámbar) y el verde pasó a `green-700` para que
  el blanco contraste bien. Las clases repetidas se extrajeron a `tabTriggerStyles`.
  **Nota:** el realineado de colores de 3.6 había empeorado el tab de contactados
  (verde → azul) sin revisar el texto; esto lo corrige.
- **Extra (encontrado al tocar el código):** los mails de Contact y ContactModal
  interpolaban la entrada del usuario en `html_content` **sin escapar**, así que
  cualquiera podía inyectar markup o un enlace disfrazado en el mail que recibe la
  Fundación. Agregados `escapeHtml`/`escapeHtmlMultiline` en `src/lib/utils.js` y
  aplicados en ambos. `ContactModal` además ahora manda `reply_to` (Contact ya lo hacía).
- **Tests:** nuevo `src/api/membershipApi.test.js` (6 casos: éxito, retry de 503, retry
  de red → cold-start, 4xx sin retry, abort por timeout, error no-string) y 6 casos más
  de `escapeHtml`/`escapeHtmlMultiline` en `utils.test.js`. Total 4 archivos, 19 casos.
- **Verificación:** `npm run lint` 0 errores (54 warnings de backlog, antes 61),
  `npm test` 19/19 verdes, `npm run build` OK.
- **Detectado, NO hecho (queda para una pasada de E):** `ApplyPartnerPage` conserva el
  lenguaje visual viejo que 5.13 eliminó del resto — pill glassmórfico, grid de puntos
  por `radial-gradient` inline, card `rounded-3xl shadow-2xl`, inputs `rounded-xl`. Se
  migró la lógica del form pero **no** el estilo: meter inputs `rounded-sm` dentro de
  esa card quedaría peor que dejarla coherente consigo misma. Necesita el hero editorial
  completo, que es trabajo de identidad visual, no de robustez de datos.

**Sesión F2 — contrato único de la capa de datos (2026-08-14):**
- [x] 4.1 — Ver el detalle de diseño en §4. Nuevo `src/lib/dataResult.js` con el contrato
  y sus 4 helpers; migrados `src/lib/storage.js`, `src/api/activitiesApi.js`,
  `src/api/educationApi.js` y las lecturas de `src/api/membershipApi.js`, más los 16
  archivos consumidores.
- **Bugs reales que el contrato viejo escondía y quedaron arreglados de paso:**
  - `PartnersAdmin.handleSubmit` envolvía la mutación en `try/catch`, pero la capa
    devolvía `null` en error en vez de lanzar: **el catch no corría nunca** y el panel
    mostraba "Partner creado ✅" aunque el insert hubiera fallado. Mismo patrón en
    `BenefitsAdmin` y `NewsAdmin`.
  - `handleApprove`, `handleReject` y `handleDelete` (partners), y los `handleDelete` de
    beneficios y noticias, **no miraban el resultado**: si la RLS rechazaba la operación,
    el admin veía el toast de éxito igual.
  - `useAdminStats` dependía de que `getPartners`/`getBenefits` lanzaran para setear su
    estado de error; ahora chequea `error` explícito, para que un fallo no se vea como un
    tablero de ceros que parece real.
  - `createPreinscription` llamaba a `supabase.auth.getSession()` sin protección: un token
    corrupto en `localStorage` habría hecho fallar la preinscripción entera. Ahora, si
    falla, sigue como anónimo (la preinscripción vale igual, solo queda sin vincular).
- **Limpieza:** `membershipApi.getUserMembership` era **código muerto** (verificado por
  grep: `useMembership.jsx` define su propia versión y consulta Supabase directo) y se
  eliminó en vez de migrarlo. `getPartnerBySlug` **también está sin consumidores** pero se
  migró y se conserva, por simetría con `getNewsBySlug` — candidato para 6.5.
  También salió el `{ returning: 'minimal' }` de `addPartner`, herencia de supabase-js v1
  que en v2 no hace nada.
- **Tests:** `src/lib/dataResult.test.js` (13 casos: contrato de los 4 helpers + que el
  logging pase una sola vez y no loguee en éxito) y `src/lib/storage.test.js` (8 casos
  contra un Supabase mockeado, para probar que la capa *usa* bien los helpers, no solo que
  los helpers funcionen). `membershipApi.test.js` actualizado al contrato, con un caso
  explícito de "nunca lanza".
- **Verificación:** `npm run lint` 0 errores (54 warnings de backlog), `npm test` 41/41
  verdes (antes 19), `npm run build` OK. Barrido con grep de los ~25 nombres exportados
  para confirmar que no quedó ningún call site con el contrato viejo.
- **Pendiente de validar en prod (no lo cubren los tests):** el alta/edición/borrado en
  los 3 paneles de admin y el alta de preinscripción, que son los caminos donde cambió el
  manejo de error.

---

## Correcciones aplicadas a `CLAUDE.md` durante la auditoría

Puntos donde la doc previa estaba desactualizada (verificado en código):
1. Los componentes `src/components/ui/` **no** son dead code: los 17 tienen ≥1 uso.
2. El scaffold Horizons **no** se limita a `plugins/visual-editor`: la parte que corre en
   **producción** está en `vite.config.js` (`addTransformIndexHtml`) y `public/.htaccess`.
3. El sanitizado DOMPurify está **completo**: los 2 únicos `dangerouslySetInnerHTML`
   (`NewsDetailPage.jsx:233`, `PartnerDetailPage.jsx:221`) lo usan. Sin XSS por ese vector.
4. `AdminPanel.jsx` (275 líneas) **no** es god-component: delega vía `renderSection()`.
   Los archivos realmente grandes son `Activities.jsx` (661) y `EducationAdmin.jsx` (605).
