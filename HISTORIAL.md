# Historial — Sitio Fundación Evolución Antoniana

Archivo de trabajo **ya cerrado**. Se separó de `ROADMAP.md` el 2026-08-16, cuando ese
documento llegó a 1.522 líneas con 83 ítems cerrados contra 11 abiertos: el 88% era
pasado, y lo que quedaba por hacer estaba enterrado.

**No es un descarte.** El *por qué* de cada decisión sigue siendo la parte más cara de
reconstruir, y varias veces resultó decisivo — que el baseline supersede las migraciones
de junio, que los logs se centralizaron a propósito en `dataResult.js`, que
`og-default.png` se dejó sin optimizar por una razón. Eso vive acá.

**La numeración de los ítems se conserva igual** (`4.1`, `6.2`, …): hay **85 archivos** de código con
comentarios que la citan (remedido el 2026-09-02; decía 35).

**Para saber qué falta hacer, ver `ROADMAP.md`.** Este archivo no se actualiza salvo para
agregarle trabajo terminado.

**Segunda incorporación, 2026-09-02.** El ROADMAP volvió a acumular pasado y se le sacaron
~1.760 líneas: `§C`, `§10.10`–`§10.21`, `§11` completa y `§12.1`. Están al final, con su
numeración intacta y el criterio del corte explicado. **La regla que salió de ahí: el cierre
de jornada se escribe acá, no en el ROADMAP** — escribirlo en el archivo de lo pendiente es
lo que lo llenó de pasado las dos veces.

---

## Auditoría original (2026-07-18) — secciones 1 a 7

Foto del proyecto al momento de la auditoría. Casi todo está cerrado; los pocos
ítems que siguen abiertos se movieron a `ROADMAP.md` conservando su número.

- **Última revisión de la auditoría:** 2026-07-18
- **Último commit auditado:** `76cf6d91` (verificación de usuarios + filtro por rol)
- **Alcance:** código, backend Supabase, `api/`, config de build y assets.
- Cada ítem trae ubicación en el código (`archivo:línea`), por qué importa y esfuerzo
  estimado. Para arquitectura y modelo de seguridad, ver `CLAUDE.md`: este documento no
  lo reemplaza, lo complementa.

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

- [x] **3.1 — Orden/duplicación de rutas admin de actividades. HECHO (2026-08-16).**
  Ver el análisis completo más abajo, en «Análisis cerrados de la ex-sección 9».
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

- [x] **4.2 — Caché de estado servidor. HECHO (2026-08-14, Sesión F3, tandas 1 y 2).**
  `@tanstack/react-query@5` con `QueryClientProvider` en `main.jsx`, contrato y claves en
  `src/lib/queryClient.js` y los hooks de lectura en `src/hooks/useContentQueries.js`.
  **Migradas 13 vistas:** Home, Activities, NewsPage, PartnersPage, BenefitsPage,
  NewsDetailPage, PartnerDetailPage, BenefitDetailPage, PartnersAdmin, BenefitsAdmin,
  NewsAdmin, ActivityList, EducationAdmin y Dashboard.
  **Eliminadas las dos cachés caseras** de `sessionStorage` (`activities_loaded` y
  `admin_activities_loaded`) y el barrido de claves del `logout`, que quedó muerto.
  **Sin migrar (queda como deuda declarada):** `ActivityDetailPage` y los módulos del
  portal de Comisión (`ProjectBoard`, `DocumentsManager`), que tienen su propio estado
  local y bastante lógica de mutación; se migran al tocarlos. Detalle de diseño en §8.
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

- [x] **6.1 — Imágenes sin optimizar. HECHO (2026-08-15, Sesión H).**
  Cuatro imágenes de contenido a WebP redimensionadas al ancho de render real:
  **2551 KB → 76 KB (-97%)**. `fondo_blanco_logo.png` (871 KB) resultó **sin ninguna
  referencia en el repo** y se eliminó. Todas con `width`/`height` (evita saltos de
  layout) y `loading="lazy"` salvo el logo de auth, que está sobre el pliegue.
  Herramienta repetible en `tools/optimize-images.mjs`.
  **`og-default.png` queda intencionalmente sin tocar:** la piden los scrapers de redes,
  nunca un visitante, así que comprimirla no le ahorra un byte a nadie real, y a cambio
  arriesga las previews de compartir (que solo se validan en producción) más el banding
  que la cuantización a paleta puede meter en una imagen de marca.
- [x] **6.2 — `manualChunks` de vendor. HECHO (2026-08-15, Sesión H).**
  El chunk inicial pasó de **603 KB a 193 KB** y desapareció el warning de tamaño de
  Vite. Cinco chunks de vendor (react, motion, supabase, query, forms) y mejor cacheo
  entre deploys: tocar código de la app ya no invalida el chunk de React ni el de
  Supabase.
  **⚠️ El primer intento rompió la producción — leer antes de tocar esto.** Clasificaba
  con una función `(id) => ...` por substring del path. `react` y `react-dom`
  matcheaban, pero **`scheduler`** — del que depende `react-dom` — no matcheaba ningún
  patrón y caía en el chunk principal. Eso arma un ciclo entre chunks
  (`index → vendor-radix → vendor-react → index`) y Radix ejecutaba su
  `React.forwardRef` de nivel de módulo antes de que React existiera:
  `Cannot read properties of undefined (reading 'forwardRef')`, sitio en blanco.
  **La forma de objeto no tiene ese problema**: se declaran los paquetes de entrada y
  Rollup arrastra solo las dependencias transitivas al chunk correcto, sin listas
  mantenidas a mano que se desactualizan en silencio.
  **Lo grave no fue el bug sino que se deployó:** `npm run build`, `lint` y los 72 tests
  pasaban los tres en verde con el sitio roto. Ninguno carga la página. Procedimiento
  obligatorio al tocar el bundle, en §9.
- [x] **6.3 — Ruta local del dev filtrada** en comentario línea 1 de 7 archivos. **HECHO (2026-07-19)**
- [x] **6.4 — Logging con gate. HECHO (2026-08-15, Sesión H).**
  **La premisa del ítem había cambiado:** no eran 63 sino **40**, y **todos eran `error`
  o `warn`** — ni un `console.log` de depuración (F2 ya había centralizado los de la capa
  de datos). Con eso, un no-op total habría sido contraproducente: sin servicio de
  tracking, esos errores son la única herramienta de soporte que hay.
  `src/lib/logger.js`: `debug`/`info` se anulan en producción (para que nadie meta una
  traza y termine en el bundle), `warn`/`error` pasan siempre. El valor real es tener
  **un solo lugar** donde enchufar Sentry el día que haga falta. 21 archivos migrados.
- [x] **6.5 — Restos muertos. HECHO (2026-08-15, Sesión H).**
  Eliminados `plugins/visual-editor/` (810 líneas del scaffold de Hostinger Horizons),
  `public/s/novedades/test.html` y `public/img/fondo_blanco_logo.png` (871 KB sin
  referencias). `public/.htaccess` ya no existía desde la Sesión A.
  Al sacar el editor visual también salió el `rollupOptions.external` con los paquetes
  de Babel de `vite.config.js`: **existía solo porque esos plugins parseaban JSX**,
  verificado con grep (cero usos de `@babel/*` en `src/`, `api/` y `tools/`).
  **`tools/generate-llms.js` se conserva:** no está referenciado en scripts ni CI y no
  se le ve output en el repo, pero es una herramienta manual inofensiva; borrarla sin
  saber si el dueño la corre a mano sería una pérdida neta.
- [x] **6.6 — Duplicación listado/detalle. HECHO (2026-08-16).** Premisa revisada antes
  de hacerlo; ver el análisis en «Análisis cerrados de la ex-sección 9».
  ~~Extraer hook `useResourceBySlug`~~ — F3 ya se llevó la duplicación de *carga*: las
  tres páginas de detalle resuelven desde la caché con un `select`, así que ese hook ya
  no tiene sentido. Lo que **sigue** duplicado es la presentación: bloque de loading,
  bloque de "no encontrado" y el patrón de `DOMPurify` (en 2 de las 3).
  **Acción revisada:** extraer `<ResourceState>` + `<SanitizedHtml>`. ~medio día.
  **Ver el análisis completo y la recomendación en §9.**
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
| F3 | Caché de estado servidor | 4.2 (TanStack Query), 13 vistas migradas | ~3-4 días | ✅ 2026-08-14 |
| H | Performance y limpieza | 6.1, 6.2, 6.4, 6.5 | ~1 día | ✅ 2026-08-15 |

**Todas las sesiones planificadas están cerradas.** Lo que queda son los sueltos
(3.1, 3.4, 6.6, 6.7) y la deuda declarada que se fue anotando en §8.

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
- **Validado contra un Postgres real (Docker, 2026-08-14).** Se levantó la imagen
  `supabase/postgres:17.6.1.158` pelada, se aplicó el baseline de 2.4 y se probaron las
  políticas con `SET LOCAL ROLE anon` / `authenticated`. Resultados:
  - ✅ `partners`: el anon **solo ve los aprobados**; INSERT con `estado='pendiente'`
    permitido; INSERT con `estado='aprobado'` **rechazado con SQLSTATE 42501**.
  - ✅ **Un anon NO puede leer de vuelta la fila que acaba de insertar** (0 filas
    visibles). Esto **prueba** que la decisión de F2 de no ponerle `.select()` a
    `addPartner` era la correcta: con `.select()` el formulario público de postulación
    habría fallado en producción, y ningún test con mocks lo habría detectado.
  - ✅ `benefits`: el anon solo ve `estado='activo'` (la RLS ya filtra, así que el filtro
    en `BenefitsPage` es redundante pero inofensivo). `news`: lectura pública total.
    El anon **no** puede insertar en `news` (42501).
  - ⚠️ **Un DELETE sin policy no da error: borra 0 filas y devuelve OK.** O sea que
    `error === null` NO alcanza para afirmar "se borró". No es algo que F2 haya
    introducido ni que el contrato pueda detectar (Postgres no lo reporta como error);
    en la práctica solo afecta a un caller sin permiso, que no llega al panel. Queda
    documentado: si algún día importa, hay que mirar la cantidad de filas afectadas.
  - ⚠️ **`trg_prevent_privilege_escalation` revierte `role` en silencio**: el UPDATE
    reporta 1 fila y sin error, pero el rol queda igual. Mismo caveat que el anterior,
    para `users`.
  - Hallazgo extra: `handle_new_user()` inserta `raw_user_meta_data->>'name'` en una
    columna NOT NULL, así que crear un usuario de auth **sin `name` en la metadata falla**.
- **Hallazgo de auditoría sobre 2.4 (migraciones):** las 5 migraciones de junio
  **fallan en una base desde cero** (`relation "public.users" does not exist`), porque
  preceden al baseline que crea esa tabla. Como `supabase db push`/`supabase start`
  aplican en orden de timestamp, **el set de migraciones no puede reconstruir la base
  desde cero**, al contrario de lo que dice el header del baseline. El baseline **solo**
  sí aplica limpio, y 3 de las 5 de junio funcionan si va primero. Las otras 2 necesitan
  el servicio de Storage (`storage.buckets`) y permisos de `supabase_auth_admin`, así que
  no se pueden juzgar con Postgres pelado. **Acción sugerida:** marcar las 5 previas como
  superadas por el baseline (o squashearlas), para que el orden por timestamp funcione.
- **Pendiente de validar en prod (lo que ni los tests ni Docker cubren):** el
  alta/edición/borrado en los 3 paneles de admin y el alta de preinscripción **a través
  de la UI** — la lógica de error ya está cubierta por `PartnersAdmin.test.jsx` y las RLS
  por lo de arriba, así que lo que falta es solo el recorrido visual.
- **Nota sobre `npx supabase start`:** en esta máquina falla con
  `LegacyDbSetupError: error running container: exit 255` en "Initialising schema", con
  Docker sano (la misma imagen corre bien a mano) y config completa. Por eso la validación
  se hizo con Postgres pelado + psql. Los `*.integration.test.js` quedan listos para
  cuando el stack levante.

**Sesión F3 — caché de estado servidor, tanda 1 (2026-08-14):**
- [x] 4.2 (tanda 1) — `@tanstack/react-query@5` (peer React 18 ✓, compatible con vite@4).
- **`unwrap`, la pieza clave** (`src/lib/queryClient.js`): la capa de datos **nunca
  lanza** (F2), pero TanStack necesita que el `queryFn` **lance** para marcar la query
  como fallida. La conversión inversa se hace ahí, en el borde, y **nunca en la capa** —
  si la capa volviera a lanzar perderíamos todo lo ganado en F2. Sin esto un fallo se
  vería como `data: []` con `isSuccess: true` y la página mostraría su estado vacío en
  lugar del de error (hay un test que fija exactamente eso).
- **Defaults del cliente:** `staleTime` 5 min (contenido institucional que cambia poco),
  `refetchOnWindowFocus: false` (en un sitio institucional molesta más de lo que aporta y
  multiplica las llamadas a Supabase), `retry: 1` (los errores que llegan acá suelen ser
  de RLS, no transitorios).
- **Migradas:** Home, Activities, NewsPage, PartnersPage, BenefitsPage. **Eliminada la
  caché casera** `sessionStorage('activities_loaded')` y sus dos `useEffect`: era frágil
  (la marca sobrevivía a datos vacíos y se desincronizaba del estado real) y la reemplaza
  el `staleTime`. En Home se fueron 3 `useState(null)` + el `useEffect` con flag
  `cancelled`; en BenefitsPage, el `useEffect` que escribía `filteredBenefits` pasó a un
  `useMemo` (era estado derivado duplicado, con un render extra por tecla).
- **Coherencia del híbrido:** el panel admin sigue usando `useActivities` con estado
  local, así que sus mutaciones ahora **invalidan la queryKey compartida**. Sin eso, un
  alta desde el panel no se veía en la página pública hasta que venciera el `staleTime`.
- **Logout:** además de la caché casera, `logout()` ahora hace `queryClient.clear()`. Si
  no, lo que vio un usuario (por ejemplo los partners no aprobados que ve un admin)
  quedaba cacheado para quien se logueara después en el mismo tab.
- **Trampa del primer diseño, encontrada y corregida:** como las opciones del caller se
  esparcen al final, un `select` del consumidor **reemplazaba el filtro del hook en
  silencio** — la Home pidiendo `.slice(0, 10)` habría mostrado **partners sin aprobar en
  la portada**. Ahora los filtros se componen con `composeSelect` y no se pueden perder.
  Verificado revirtiendo el diseño viejo: el test falla mostrando `Pendiente B`.
- **Cambio de tipo a tener en cuenta al migrar el resto:** el `error` de TanStack es un
  `Error`, no el string que devolvía `useActivities`. En `Activities.jsx` había un
  `{activitiesError}` que habría intentado renderizar un objeto y roto la página; ahora
  lee `.message`. Revisar ese patrón en cada página que se migre.
- **Tests:** `queryClient.test.js` (6 casos del puente y de las claves) y
  `useContentQueries.test.jsx` (7 casos: filtros, que el `select` del caller no los
  saltee, propagación de errores y que dos hooks sobre la misma entidad hagan **una
  sola** llamada).
- **Verificación:** lint 0 errores, `npm test` 61/61 (antes 48), build OK.

**Sesión F3 — tanda 2: paneles, dashboard y detalles (2026-08-14):**
- [x] 4.2 (cierre) — Migradas 8 vistas más: los 3 paneles de Admin (partners, beneficios,
  noticias), `ActivityList`, `EducationAdmin`, `Dashboard`, `NewsDetailPage`,
  `PartnerDetailPage` y `BenefitDetailPage`.
- **Los detalles reusan la caché del listado.** `PartnerDetailPage` y `BenefitDetailPage`
  resuelven el slug con un `select` sobre el listado cacheado: navegar del listado al
  detalle **no dispara ninguna consulta nueva**. `BenefitDetailPage` de paso dejó de
  hacer un `getPartnerById` suelto por visita: el partner sale de la misma caché de
  partners que usa el resto del sitio. `NewsDetailPage` sí tiene query propia
  (`useNewsItem`), porque un detalle se puede abrir directo desde un link compartido sin
  pasar por el listado; su clave va anidada bajo `['news']` para que invalidar el listado
  alcance también a los detalles.
- **`EducationAdmin`: el optimistic update pasó a la caché.** Antes hacía `setList` sobre
  estado local y guardaba una copia para el rollback; ahora usa
  `queryClient.setQueryData` y toma el snapshot **de la caché**, así el rollback revierte
  al estado real y no a una copia que pudo quedar desactualizada.
- **`Dashboard`:** sus cuatro fuentes (inscripciones, membresías, donaciones y métricas)
  pasaron de un `Promise.all` con seis `useState` a cuatro queries. Las de usuario llevan
  `enabled: Boolean(userId)`.
  **Sutileza que costó un guard:** una query deshabilitada **queda en `isPending`**, así
  que calcular `pageLoading` solo con `isPending` dejaba a un visitante sin sesión con el
  spinner colgado para siempre. De ahí el `Boolean(userId) && ...`. Hay un test que fija
  ese comportamiento (`fetchStatus === 'idle'` con `isPending === true`).
- **Limpieza que destapó la migración:** el `logout` barría claves de `sessionStorage`
  (`dashboard_loaded_*`, `activities_loaded`) que **ya nadie escribía** — verificado con
  grep: cero `sessionStorage.setItem` en `src/`. Quedó solo `queryClient.clear()`.
- **Los tests de `PartnersAdmin` hubo que adaptarlos**, porque el componente ahora
  necesita un `QueryClientProvider`: cliente nuevo por test, sin caché compartida entre
  casos y con `retry: false`. Los 7 casos de regresión del "éxito falso" siguen verdes.
- **Tests nuevos** (7, total 14 en `useContentQueries.test.jsx`): que `useNewsItem`
  elija por UUID vs slug, que no consulte sin parámetro de ruta, el guard `enabled` de
  las queries por usuario, y que el detalle se resuelva desde la caché del listado con
  **una sola** llamada.
- **Verificación:** lint 0 errores (53 warnings de backlog, antes 54), `npm test` 68/68
  (antes 61), build OK.
- **Para validar en pantalla (una migración de caché falla de formas que los tests no
  ven):** navegar listado → detalle → volver (no debería haber spinner la segunda vez),
  que la portada no muestre partners sin aprobar, que un alta desde el panel admin
  aparezca en la página pública, y cerrar sesión y entrar con otro usuario para
  confirmar que no queda nada cacheado del anterior.

**Sesión H — performance y limpieza (2026-08-15):**
- [x] 6.1, 6.2, 6.4, 6.5 — ver el detalle de cada uno en §6.
- **Números:** las imágenes de contenido bajaron **2551 KB → 76 KB (-97%)** y el chunk
  inicial de JS **603 KB → 103 KB**. Sumado al PNG muerto de 871 KB, son ~3,3 MB menos
  de descarga en la primera visita.
- **Dos premisas del ROADMAP habían caducado** y conviene saberlo para no repetir el
  error de trabajar sobre datos viejos:
  - 6.4 hablaba de "63 `console.*`". Eran **40**, y todos `error`/`warn`: F2 ya había
    centralizado los de la capa de datos. Un no-op total habría sido peor que no hacer
    nada (ver §6).
  - 6.1 listaba `fondo_blanco_logo.png` para convertir; en realidad **no la usa nadie**,
    así que se borró en vez de optimizarse.
- **Corregida una instrucción falsa del repo:** `normalize-partner-logos.mjs` documentaba
  `npm exec --yes --package=sharp -- node tools/...`, que **no funciona** — npm exec deja
  el paquete en un temp que un script ESM del proyecto no resuelve. Lo que sí funciona
  (`npm i -D sharp && node tools/... && npm un -D sharp`) quedó documentado en
  `optimize-images.mjs`. `sharp` no quedó como dependencia.
- **Test del logger, y por qué importa:** su comportamiento depende de
  `import.meta.env.PROD`, que se resuelve en build. El primer intento usaba
  `vi.stubEnv`, que **convierte el valor a string** — y como `"false"` es truthy, los
  casos de dev y de prod daban los dos "producción" y el suite pasaba por el motivo
  equivocado. Se asigna el booleano directo.
- **Verificación:** lint 0 errores, `npm test` 72/72 (antes 68), build OK y **sin el
  warning de chunk grande** que aparecía en todos los builds anteriores.
- **Para validar en pantalla:** que se vean las imágenes de Colaborar (logo de Mercado
  Pago), Nosotros (foto y retrato del fundador) y el logo de Login/Registro — son las
  cuatro que cambiaron de archivo. Y que el sitio siga cargando bien en general, porque
  el reparto de chunks toca cómo arranca la app.

---

---

## Análisis cerrados de la ex-sección 9

### ✅ Sesión I — Seguridad de dependencias (2026-08-16)

No estaba en el plan original y hoy es **lo más urgente que queda**. `npm audit`
reporta **9 vulnerabilidades (5 high, 4 moderate)** más una crítica en `vitest`.
Tres de ellas se resuelven casi gratis:

- [x] **I.a — `@babel/*` eran dependencias muertas. HECHO (2026-08-16).**
  `@babel/generator`, `parser`, `traverse` y `types` estaban en `package.json`, pero
  **sus únicos consumidores eran los plugins del editor visual borrados en H**.
  Eliminadas las 4 declaraciones. Siguen en el árbol como dependencia **transitiva** de
  `@vitejs/plugin-react` — que legítimamente usa Babel para el fast refresh — y eso está
  bien: lo que sobraba era declararlas nosotros.
  **Corrección a la estimación original:** se dijo que esto bajaría las vulns directas.
  Es falso, **los `@babel/*` no tenían ninguna**. Elimina 4 declaraciones muertas, que
  es valor real pero distinto del que se le atribuyó.

- [x] **I.b — `uuid` fuera, `crypto.randomUUID()` en su lugar. HECHO (2026-08-16).**
  Tenía una vulnerabilidad moderada y **un solo uso** (`useActivities.jsx`, el token de
  confirmación de inscripción), mientras `documentsApi.js:36` ya usaba el nativo para lo
  mismo. Se reemplazó y se sacó la dependencia, sin pasar a `uuid@14`, que es breaking.
  Verificado que el token no se valida por formato en ningún lado: se guarda, viaja en la
  URL y se busca con `.eq()` en la Edge Function `confirm-registration`. Ambos
  generadores producen UUID v4 idéntico en formato.
  **Efecto medido:** vulnerabilidades de producción **9 → 8**, dependencias directas
  **-5**, y el lockfile solo perdió la entrada de `uuid` (sin cambios de versión
  colaterales, verificado con `git diff`).

- [x] **I.c — `vite@4` (EOL) → `vite@7`. HECHO (2026-08-16).**
  Con `@vitejs/plugin-react@5` (declara soporte hasta vite 8) y `vitest@0.34 → 4`.
  **Se eligió v7 y no v8 a propósito:** resuelve el EOL y las vulns igual, y es una
  versión madura en vez de una de semanas.
  `.nvmrc` fija 22.12.0 y `engines` pide `>=22`, que satisface el requisito de vite 7
  (`^20.19.0 || >=22.12.0`) — verificado **antes** de instalar nada, porque el Node del
  build de Vercel es lo que decide si esto rompe el deploy.
  El salto de 4 majors de Vitest **no requirió tocar un solo test**: 72/72 en verde.

- [x] **I.d — Vulnerabilidades no-breaking aplicadas. HECHO (2026-08-16).**
  `npm audit fix` (sin `--force`): `dompurify@3.4.9 → 3.4.13`, `postcss → 8.5.26`,
  `react-router-dom → 6.30.4`. La de `dompurify` importaba más que las otras: son
  **bypasses de XSS en el sanitizador**, o sea en el camino de defensa, no en el
  tooling. Como no hay tests que cubran la sanitización, se verificó en navegador que
  una novedad real siga renderizando su HTML enriquecido.

**Resultado de la Sesión I: 13 vulnerabilidades → 2.**

| | Antes | Después |
|---|---|---|
| Vulnerabilidades totales | 13 (1 low, 4 mod, 7 high, 1 crit) | **2 (moderate)** |
| En producción | 9 | **2** |
| Directas | 6 | **1** |
| Dependencias directas declaradas | — | **-5** (4 babel + uuid) |

**Lo que queda y por qué se deja:** `react-router-dom@6.30.4` tiene un open redirect →
XSS (moderate). **No existe 6.30.5**: 6.30.4 es la última v6 y el arreglo es react-router
v7, un major. Se dejó fuera a propósito — meter un major del router en el mismo cambio
que un major de Vite, un día después de un incidente en producción por un cambio de
build, es acumular riesgo sin necesidad. **Es la próxima decisión** (ver 6.7).

---

### ✅ 3.1 — Orden de las rutas admin (HECHO 2026-08-16)

**Estado real:** en `App.jsx`, `/admin/*` (línea 145) se declara **antes** que
`/admin/activities/new` (153) y `/admin/activities/edit/:id` (161). React Router v6
resuelve por especificidad, no por orden, así que **hoy funciona bien**. El ítem es de
fragilidad, no de bug: el orden sugiere una precedencia que no existe, y alguien que
agregue una ruta asumiendo "gana la primera" se va a equivocar.

**Alternativas:**
- **(a) Reordenar** para que el orden del archivo refleje la especificidad real.
- **(b) Anidar** las rutas de actividades dentro de `/admin/*`.
- **(c) Dejarlo y comentar** por qué el orden no importa.

→ **Hecha la (a) + comentario.** Las rutas de admin quedan de la más específica a la
más general y el comentario deja dicho que el orden **no** es lo que decide, para que
nadie lo lea como precedencia. `/admin/education` se dejó arriba con `/comision`: se
agrupa por rol (`educacion_manager`), no por prefijo.
**Cambio de comportamiento: ninguno**, y eso es lo esperado — mover líneas no altera un
router que rankea por especificidad. Verificado en navegador que las 4 rutas de admin
siguen existiendo y protegidas, y que una ruta inventada sigue cayendo en el 404.
*Límite de esa verificación:* sin sesión, todas redirigen a login antes de renderizar,
así que confirma que la ruta existe, no qué componente monta.

### ✅ 6.6 — Duplicación listado/detalle (HECHO 2026-08-16)

**Estado real (revisado post-F3, la premisa cambió):** F3 ya se llevó la duplicación de
*carga de datos* — las tres páginas de detalle ahora resuelven desde la caché con un
`select`. Lo que **queda** duplicado es la **estructura de presentación**: las tres
tienen su propio bloque de loading, su propio "no encontrado" y dos de ellas repiten el
patrón de `DOMPurify` (`NewsDetailPage`, `PartnerDetailPage`; `BenefitDetailPage` no
usa HTML enriquecido). Tamaños: detalles 229-336 líneas, listados 141-161.

**Alternativas:**
- **(a) Extraer `<ResourceState>`** (loading / no encontrado / error) y `<SanitizedHtml>`.
  Ataca lo que de verdad se repite. ~medio día.
- **(b) El plan original completo** (`useResourceBySlug` + componente compartido).
  **Ya no aplica:** ese hook lo reemplazó el `select` de TanStack en F3.
- **(c) No hacer nada.** Tres copias de un bloque de 15 líneas es tolerable.

→ **Hecha la (a).** `<ResourceLoading>` + `<ResourceNotFound>` en
`src/components/ui/resource-state.jsx` y `<SanitizedHtml>` en
`src/components/ui/sanitized-html.jsx`.

**Resultó menos cosmético de lo que parecía, por dos motivos:**

1. **No era sólo código repetido, eran tres experiencias distintas.** El loading de
   novedades era un punto de 4px con texto y los otros dos un círculo de 64px; el "no
   encontrado" de alianzas tenía tarjeta e ícono y los otros no. El mismo hecho —el
   recurso no existe— se veía de tres formas según por dónde entrara el visitante.
   Al unificar se tomó de cada uno lo mejor: el esqueleto de 64px (2 de 3) y la tarjeta
   con ícono de alianzas (la que sigue el lenguaje de la Sesión E). De paso el estado de
   carga ganó `role="status"` + `aria-live` (antes un lector de pantalla no anunciaba
   nada) y el "no encontrado" un `noindex`, que es un callejón sin salida.
2. **`<SanitizedHtml>` es un punto de control de seguridad, no un DRY.** Eran tres
   llamadas sueltas a `DOMPurify.sanitize()`. El mismo día que se hizo esto hubo que
   subir `dompurify` por tres bypasses de XSS (Sesión I): con las llamadas sueltas,
   cualquier mitigación hay que aplicarla N veces y alcanza olvidarse de una.
   **Y la sanitización pasó de 0 tests a 6**, incluidos `<script>`, `onerror`/`onclick`
   y `javascript:`. Se confirmó que detectan el fallo desactivando la sanitización: 3 de
   los 6 se ponen en rojo.

---

### ✅ Las migraciones ya reconstruyen la base desde cero (HECHO 2026-08-16)

Hallazgo de la validación con Docker (ver §8, Sesión F2). Las 5 migraciones de junio
fallan en una base nueva con `relation "public.users" does not exist`, porque preceden
al baseline que crea esa tabla. Como `supabase db push` aplica por timestamp, **hoy no
se puede reconstruir la base desde el repo** — que es justo lo que el ítem 2.4 buscaba
garantizar.

**Alternativas:**
- **(a) Squashear** las 5 previas dentro del baseline. Historia más limpia, se pierde
  el detalle de cómo se llegó.
- **(b) Renombrarlas** con un timestamp posterior al baseline. Feo pero conserva todo.
- **(c) Documentar el orden correcto** y no tocar los archivos. Cero riesgo, pero el
  comando estándar sigue fallando.

→ **Hecha la (a), pero con una corrección importante sobre lo que decía este ítem.**

**La recomendación original —"squashear las 5 dentro del baseline"— habría roto algo.**
Al comparar objeto por objeto lo que crean las 5 migraciones contra el baseline, 26 de
30 estaban cubiertos. Los 4 que faltaban eran las **policies del bucket
`comision-docs`**, que viven en el esquema `storage` y por eso el
`supabase db dump --schema public` nunca las capturó. Borrar las migraciones sin más
habría dejado el módulo de documentos de la Comisión **sin permisos** en cualquier base
reconstruida — y como RLS deniega por defecto, inaccesible. Lo mismo con el bucket, que
también se crea ahí.

**Qué se hizo:**
1. `20260719140000_comision_docs_storage.sql` — nueva, posterior al baseline, con el
   bucket y las 4 policies. **Va guardada** con `to_regclass('storage.buckets')` porque
   `storage.buckets`/`storage.objects` las crea el servicio storage-api, no la imagen de
   Postgres: sin la guarda rompería la validación de RLS en Postgres pelado. El salto
   avisa con `RAISE NOTICE` — es normal al validar RLS y sería grave en un proyecto real,
   así que no puede pasar en silencio.
2. Eliminadas las 5 de junio. Su contenido de esquema `public` está íntegro en el
   baseline; el detalle histórico, en git.
3. Cabecera del baseline y `supabase/checks/README.md` actualizados: ya no hace falta
   el workaround de "aplicar solo el baseline".

**Verificación (Docker, sin tocar producción):**
- **Reproducido el fallo primero**, para saber que la prueba medía algo: las 5 de junio
  fallaban con `relation "public.users" does not exist`.
- Base nueva + las 3 migraciones en orden estándar → **aplican limpio**. 15 tablas, 18
  funciones, 32 policies, RLS en las 15 tablas, 2 triggers sobre `auth.users`, y
  presentes todos los objetos que aportaban las de junio.
- **Probadas las dos ramas de la guarda.** La del salto y la real (provisionando
  `storage` a mano): crea el bucket con sus atributos y las 4 policies con la misma
  forma de cláusulas que el original (select `using`, insert `with check`, update ambas,
  delete `using`). Idempotente: segunda corrida, 0 errores y siguen siendo 4.
- **`rls-check.sql` da salida idéntica antes y después** del cambio, normalizando
  timestamps. Los 2 `ERROR` que aparecen ya estaban: uno es el resultado *esperado* de
  T3 y el otro un artefacto del propio script.

**Un detalle que costó tiempo y conviene saber:** el baseline llegó a fallar con
`could not open relation with OID 16674` por aplicarlo mientras el contenedor todavía
inicializaba. `pg_isready` da OK antes de que terminen los scripts de setup de la imagen.
Señal confiable: el **segundo** `database system is ready to accept connections`.

**Comprobado con `supabase migration list` (2026-08-16):**

```
   Local          | Remote | Time (UTC)
  ----------------|--------|---------------------
   20260719120000 |        | 2026-07-19 12:00:00
   20260719130000 |        | 2026-07-19 13:00:00
   20260719140000 |        | 2026-07-19 14:00:00
```

**El historial remoto está vacío.** No hay discrepancia y no hace falta
`migration repair`: el esquema de producción se aplicó pegando SQL en el editor web
(Opción A del README de `supabase/`), así que nunca se registró nada en
`supabase_migrations.schema_migrations`. Borrar las 5 de junio no dejó ningún huérfano.

⚠️ **Pero cambia el significado de correr `supabase db push` contra producción:** al ver
el historial vacío, el CLI intentaría aplicar **las tres** migraciones. En principio
convergen sin cambios —el baseline está construido para eso y las otras dos son
idempotentes—, y cada migración corre en su propia transacción, así que un
`DROP POLICY` + `CREATE POLICY` no deja ventana sin RLS. Aun así **no es una operación
de rutina**: son ~1.100 líneas de DDL contra la base viva. Si se hace, con backup
reciente y fuera de horario.

⚠️ **Producción corre PostgreSQL 15; la validación de esta fase se hizo sobre la imagen
17.6.1** (la que documenta `supabase/checks/`). El CLI lo advierte al linkear
(`major_version = 15`). El DDL usado es estándar y no toca nada específico de 16/17, así
que el riesgo es bajo, pero **la validación no se hizo sobre la misma major que
producción**. Para cerrarlo del todo habría que repetirla con una imagen 15.x.

---

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


---

## ✅ Sesión J — la capa de acceso y la fase 1 del club (2026-08-30)

La jornada del 16 dejó el libro de aportes y la rendición andando. Esta agregó **la mitad
que faltaba: que un aporte habilite algo**, y la primera fase del club de beneficios.
Todo aplicado en producción.

### Lo que se construyó

- `20260830110000_capa_acceso.sql` — `reglas_acceso`, las funciones de acceso y
  antigüedad, `benefits.requiere_acceso`, `destinos.otorga_acceso`, `aportes.equivale_a`.
- `20260830140000_triggers_otorgan_acceso.sql` — el cálculo del período dentro de
  `aporte_desde_donacion()` **conservando su cuerpo**, y `aporte_desde_membresia()`, que
  no existía: hasta ese día solo las donaciones entraban al libro.
- Front: `src/lib/acceso.js` (reglas de presentación, con tests), `src/api/accesoApi.js`,
  `useMiAcceso()`/`useMiAntiguedad()`, `/carnet`, y el bloqueo de beneficios exclusivos en
  catálogo y detalle.
- `supabase/checks/acceso-check.sql`, 14 comprobaciones.
- El diseño completo del club de beneficios —canjes, el comercio como actor, niveles— en
  el §12 del ROADMAP.

El detalle de las reglas y del bloqueante que destapó está en el §10.17 del ROADMAP.

### La lección cara: `git fetch` antes de la primera migración

Se trabajaron **tres commits sobre una copia local 20 commits atrasada**. Consecuencias,
todas evitables con una consulta al principio:

- Se "descubrió" como no documentado el módulo de `aportes`/`destinos`/`gastos`, que
  estaba commiteado, versionado y pusheado desde el 16.
- Se lo **re-baselinó al pedo**, generando una migración que duplicaba cuatro existentes.
- Se describió como *peso muerto* la vista `user_support_history`, que en realidad se
  había borrado **como fix de seguridad** (§C: puenteaba las RLS y filtraba datos
  financieros).
- Se rehizo el arreglo del fallback de `src/lib/supabase.js`, ya resuelto el 16.
- Se escribió un §11 "Club de beneficios" que **chocaba de número** con el §11 existente;
  hubo que renumerarlo a §12.

Nada llegó a producción con daño —el trabajo útil se escribió leyendo el esquema **de la
base**, no del repo viejo— pero se perdió media jornada y el `git push` fue lo que lo
delató. **Antes de escribir la primera migración: `git fetch` y mirar la base.**

Corolario: **`tools/db.sh` es el camino** para tocar la base. Acota el permiso, se audita
en el repo y la contraseña no queda en el historial del shell. En esta sesión se usó un
connection string armado a mano; no repetirlo.

### Dos lecciones técnicas que sí se ganaron rompiendo cosas

**1. Idempotente no alcanza: una migración tiene que converger desde su propia versión
anterior.** `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe, así que agregar
una columna a una migración ya aplicada no la agrega en ningún lado y revienta más abajo.
Falló en producción con `column "payment_id" does not exist`. Y lo invisible era peor que
lo visible: la fila semilla se quedaba con el placeholder `cuota=1000, piso=0`, o sea una
regla que acepta donaciones de $1 como si fueran una cuota. **Fallar ruidoso fue el mejor
de los dos escenarios.** La convención quedó en `CLAUDE.md`.

**2. Un diff de esquema que no compara privilegios está incompleto.** Comparar tablas,
columnas, funciones, índices, policies, triggers y constraints puede dar 0 diferencias y
aun así dejar los `GRANT` distintos — `pg_dump --no-privileges` no los trae. En una tabla
que otorga privilegios, eso es la diferencia entre `anon` sin permisos y `anon` con
INSERT/UPDATE/DELETE.

### Las decisiones de la Fundación (un cliente distinto las va a cambiar)

1. **Conversión donación → meses:** proporcional. Un plazo fijo canibaliza la cuota.
2. **Piso = el precio de la cuota**, modelado como `piso_monto = NULL` ("usar la cuota") y
   no como el número copiado, para que no puedan desincronizarse.
3. **Gracia de 30 días, solo para cuotas.** Un cobro recurrente falla por tarjeta vencida;
   una donación puntual no falla, se terminó.
4. **Antigüedad: tres números, no uno.** `socio_desde` no se reinicia nunca (la identidad,
   el carnet), `meses_aportados` es lo que **otorga derechos**, `racha_meses` premia la
   continuidad. Con `range_agg`, así un doble pago no cuenta doble. Quien se fue un año y
   volvió conserva su historia pero no cobra por el año que no pagó.
5. **Aporte manual:** la comisión elige al cargarlo si equivale a cuota o a donación.
6. **Destinos:** todos otorgan acceso por defecto; las excepciones se marcan.
7. **El donante** accede al mismo catálogo que el socio, pero el socio conserva antigüedad,
   número, carnet, prioridad de cupo y voz en asamblea.

### Tres decisiones de implementación que conviene no deshacer

- **`tiene_acceso` quedó en dos versiones.** Con una sola con parámetro y `SECURITY
  DEFINER`, cualquier usuario logueado podía averiguar si otra persona paga la cuota. La
  sin parámetro (`auth.uid()`) es para usuarios y policies RLS; la que recibe un uuid es
  solo para `service_role` — el contrato que van a consumir las Edge Functions del club.
- **El carnet no lleva QR**, a propósito. En la fase 1 el comercio *mira* la credencial,
  no la escanea: un QR que nadie lee no aporta y suma una dependencia. Lleva reloj en
  vivo, que es lo único que distingue la pantalla real de una captura vieja.
- **`benefits.codigo` sigue siendo público**, y el bloqueo de un beneficio exclusivo es
  UX, no seguridad. **No se arregla con RLS**: proteger la columna con GRANTs a nivel
  columna rompería el panel admin (mismo rol `authenticated`), y partir el código a otra
  tabla es un refactor que la fase 2 del club tira igual. Hasta entonces, no marcar como
  exclusivo un beneficio cuyo código valga dinero.


---

## Secciones trasladadas desde `ROADMAP.md` el 2026-09-02

El ROADMAP volvió a acumular pasado: de 3.185 líneas, ~1.760 eran crónica de trabajo
ya terminado y verificado. Es exactamente lo que motivó la partición del 2026-08-16, y
la razón por la que se repitió es la misma de siempre: **cada jornada cerró escribiendo
su cierre en el archivo de lo pendiente.**

**El criterio del traslado —y conviene no perderlo—** es que el ROADMAP tiene *tres*
clases de contenido, no dos:

| Clase | Ejemplo | Dónde va |
|---|---|---|
| **Pendiente** | §12.10, §10.4, §A | ROADMAP |
| **Especificación vigente** que hace falta para construir lo pendiente, y que el código cita | §10.9, §12.5, §12.6 | ROADMAP |
| **Crónica** de lo ya construido y verificado | esto | acá |

Lo de abajo se validó contra producción antes de moverlo (base, `/health`, tests y
`npm audit`), no se movió por lo que decía el propio texto.

**La numeración se conserva**: `§10.17`, `§11.4`, `§12.1` siguen llamándose igual porque
85 archivos las citan. Si el código dice §11.6.3, está acá.

## C. El fix de seguridad — APLICADO a producción el 2026-08-16

> **Estado: cerrado.** La migración `20260816120000_fix_view_rls_bypass_and_anon_grants.sql`
> se aplicó a producción el 2026-08-16 y la fuga está cerrada, verificado vía PostgREST:
> `user_support_history` devuelve **404** y `fundacion_metrics` **401**. El Dashboard
> siguió funcionando (`total_donado = 7141`), que era lo que esta migración podía romper.
> El check T8 de `supabase/checks/rls-check.sql` devuelve 0 vistas sin `security_invoker`,
> así que la regresión ahora la detecta la verificación y no depende de que alguien mire.
>
> **Lo que sigue abajo se conserva como procedimiento**, porque es el que hay que repetir
> ante cualquier fix de seguridad futuro, y porque la lección del final es la que importa.

La migración `20260816120000_fix_view_rls_bypass_and_anon_grants.sql` estaba validada en
Docker y sin aplicar. Mientras tanto, la fuga estuvo abierta.

**Qué arregla.** Dos vistas (`user_support_history`, `fundacion_metrics`) eran
`OWNER TO postgres` sin `security_invoker`, así que corrían con permisos del dueño y
**puenteaban las RLS**. Verificado contra producción pidiendo solo conteos:

| Como `anon` | Tipo | Filas |
|---|---|---|
| `donations`, `memberships`, `users`, `registrations` | tabla | 0 — RLS funciona |
| `user_support_history` | vista | **20 — fuga** |
| `fundacion_metrics` | vista | **1 — fuga** |

Los *mismos* datos, negados por la tabla y entregados por la vista. Se exponía
`amount`, `status`, `payment_id`, `preapproval_id` y `plan` por persona.

**Cómo aplicarla:**

```bash
# 1. Backup reciente de la base (no es opcional).
# 2. Revalidar en Docker — el procedimiento completo en supabase/checks/README.md.
#    Los checks T8/T9/T10 de rls-check.sql cubren esta regresión.
# 3. Aplicar. Como el historial remoto está vacío (ver §B), conviene pegar el SQL
#    en el editor web en vez de `supabase db push`, que intentaría correr las
#    cuatro migraciones.
```

**Después de aplicar, confirmar que la fuga cerró** (debe dar `permission denied` y `404`):

```bash
URL=https://<proyecto>.supabase.co; KEY=<anon key>
curl -s -o /dev/null -w "%{http_code}
" "$URL/rest/v1/user_support_history?limit=0"   -H "apikey: $KEY" -H "Authorization: Bearer $KEY"   # esperado: 404
curl -s -o /dev/null -w "%{http_code}
" "$URL/rest/v1/fundacion_metrics?limit=0"   -H "apikey: $KEY" -H "Authorization: Bearer $KEY"   # esperado: 401/403
```

**Y confirmar que el Dashboard sigue funcionando**, que es lo que esta migración podía
romper: entrar con una sesión iniciada y verificar que "total donado" y "suscripciones
activas" no quedaron en cero. En Docker se verificó que `authenticated` sigue viendo los
valores, pero conviene mirarlo en la app real.

**Lección que deja, y es la que importa.** El razonamiento de §10.1.g —"no es un agujero
hoy porque RLS está habilitado en las 15 tablas"— es correcto **para tablas**. Las vistas
no son tablas, y eran justo los dos objetos donde el argumento no aplicaba. No fue un
descuido sino un punto ciego lógico: **la afirmación de seguridad se escribió sobre una
categoría de objeto y el esquema tenía otra.** Por eso T8 ahora falla si alguien crea
cualquier vista sin `security_invoker`: la verificación tiene que ser automática, no
depender de que alguien mire en el momento justo.

---


### 10.10 — Evidencia de producción: el canal recurrente nunca funcionó (2026-08-16)

Contrastando el panel de MercadoPago contra la base. **Confirma tres ítems de 10.1 que
estaban planteados como hipótesis y agrega uno nuevo.**

Estado en MercadoPago: **7 suscripciones, ninguna activa.** Cinco `Cancelada`, dos
`Vencida`. La única de $5.000 figura **"Sin cobro"**: nunca cobró un peso.

#### a) El webhook no sincroniza el estado de vuelta ← lo más grave

| | Base | MercadoPago |
|---|---|---|
| Suscripción $5.000 | `pending` | **Cancelada** |
| Suscripción $5.000 | `pending` | no aparece |

La base dice `pending` desde noviembre de 2025 para algo que MercadoPago da por cancelado.
**El estado de `memberships` no es confiable**: refleja el momento en que se creó la
suscripción, no lo que pasó después. Todo lo que se construya sobre ese campo —acceso,
padrinazgo, rendición— hereda el problema.

El webhook vive fuera del repo (`mp-supabase-webhook.onrender.com`), sin tests y con
arranque en frío. Es el punto único de falla sobre el flujo que genera la plata.

#### b) `Vencida` no existe en el esquema

El CHECK de `memberships` admite `pending|active|paused|cancelled`. MercadoPago tiene
además **`Vencida`** (falló el cobro repetidamente), y hay dos así. **No hay dónde
guardarlo**: ni con el webhook arreglado se podría registrar ese estado. Falta un valor en
el CHECK, y falta decidir si "vencida" corta el acceso o entra en el período de gracia de
10.4.3.

#### c) 10.1.f ya pasó — no era teórico

**Cuatro suscripciones idénticas**, mismo email, mismo monto, el mismo día (18/oct/2025).
Es exactamente "un socio puede acumular varias membresías activas, sin restricción de
unicidad". Salió gratis porque eran de $50 y se cancelaron todas; **si se hubieran
activado, a esa persona se le cobraba cuatro veces por mes.**

→ **Subir 10.1.f de la fase 5 ("higiene") a la fase 1.** Un índice único parcial sobre
`(user_id) where status in ('active','pending')` cuesta una línea y evita un cobro
múltiple a una persona real.

#### d) 10.1.c confirmado: tres emails, una persona

La misma persona aparece como `gonzaramosmp@gmail.com` y `gonramo4200@gmail.com` en
MercadoPago, y con un registro asociado a la cuenta `info@evolucionantoniana.com` en la
base. `payer_email` es el mail de MercadoPago y puede no ser el de la cuenta: sin
reconciliación, el sistema ve tres personas.

#### La buena noticia, y no es menor

Las 7 suscripciones tienen pinta de pruebas: montos de $50, la misma persona repetida,
cuatro clics el mismo día. **No hay ni un padrino real.** O sea que el canal recurrente
no está *roto*: **nunca llegó a funcionar.**

Eso cambia el riesgo de todo el §10 y conviene aprovecharlo:

- **No hay que migrar suscriptores vivos.** Ni backfill delicado, ni riesgo de cobrar de
  más, ni corte de servicio a nadie.
- **Se puede rediseñar el modelo de cobro sin costo de transición.**
- **Este es el momento más barato que va a haber para cambiarlo.** Cada padrino real que
  entre a partir de ahora encarece la migración.

⚠️ **Corolario para el negocio:** el canal recurrente está **sin estrenar, no degradado**.
Antes de promocionarlo hay que arreglar (a) y (c), o el primer padrino de verdad entra a
un circuito que no sabe informar si su suscripción sigue viva.

---

### 10.11 — Fase 1 aplicada: qué quedó funcionando y qué no (2026-08-16)

Las dos migraciones de fase 1 están **en producción**. Esta sección existe para que
nadie tenga que deducir del esquema qué parte del circuito ya cierra y cuál no.

#### Lo que está vivo

| Migración | Qué dejó | Verificado en producción |
|---|---|---|
| `20260816130000` | `expired` en el CHECK, reaper de `pending` fósiles, índice duplicado borrado | Marcó **exactamente 5** filas, igual que el conteo previo |
| `20260816140000` | `destinos`, `aportes`, `memberships.destino_id`, índice único, trigger de contadores, RLS | `destinos` → HTTP 200 como `anon`; `aportes` → **401** |

Estado de `memberships` después del reaper: `cancelled 6 · expired 5 · paused 2 · pending 3`.
Los 3 `pending` que quedan son de menos de 30 días, así que el reaper no los tocó; según
MercadoPago tampoco son reales. **No se amplió la ventana a propósito:** son síntoma del
webhook, no de los datos, y bajar el umbral para taparlos sería tratar el síntoma.

El panel `/admin → Destinos` permite crear, editar y cerrar destinos. Un destino con
aportes no ofrece el botón de borrar, porque la FK es `ON DELETE RESTRICT` y un libro
contable no se borra.

#### El eslabón que falta, y es uno solo

`Colaborar` ya deja elegir destino, y la elección viaja a MercadoPago en
`external_reference` (`destino:<uuid>`) — el único campo que MercadoPago devuelve intacto
en el webhook. Pero **el microservicio de Render no lee ese campo y tampoco escribe en
`aportes`**: hoy escribe `donations` y `memberships` y nada más.

O sea, hasta que se toque Render:

- ✅ El aportante elige destino y lo ve en el checkout de MercadoPago (va en `reason` /
  `description`).
- ✅ La elección llega al microservicio.
- ❌ No aterriza en `aportes`, así que **no suma al progreso del destino**.

Se manda igual porque el día que se toque Render el dato ya va a estar llegando, y
porque el costo de mandarlo es cero: sin destino el payload queda idéntico al de antes
(hay un test que lo fija, `SIN destino no agrega ninguna clave al payload`).

**Lo que Render tiene que hacer**, en una línea: al confirmarse un pago, insertar en
`aportes` con `origen` (`donacion` | `membresia`), `destino_id` parseado de
`external_reference` —con caída al destino `institucional` si no viene—, y
`referencia_externa` = el `payment_id` de MercadoPago. Ese último campo es `UNIQUE`
justamente porque **los webhooks de pago reintentan**: sin él, un mismo cobro entra dos
veces al libro y la rendición queda mal para siempre.

#### El camino que SÍ cierra hoy: la carga manual ✅ implementado

`/admin → Libro de aportes` permite registrar efectivo, transferencias y cheques contra
un destino. Eso no es un parche mientras se arregla Render: **una entidad recibe plata
por fuera de cualquier pasarela**, y esa plata tiene que entrar al mismo libro que la
digital o la rendición no cuadra. Es el único circuito que hoy funciona de punta a punta.

Dos invariantes de esa pantalla, que son del modelo y no de la UI:

- **Ninguna fila ofrece borrar.** `aportes` no tiene policy de DELETE: un libro contable
  no se borra, se corrige y queda el rastro.
- **Solo se editan los aportes manuales.** Corregir a mano lo que informó una pasarela
  haría que el libro diverja de lo que MercadoPago dice que pasó, que es justo el
  problema de §10.10.

**Verificado contra producción** con transacciones que revierten (checks T14-T16 de
`supabase/checks/rls-check.sql`, permanentes desde ahora):

| Check | Qué prueba | Resultado |
|---|---|---|
| T14 | Un usuario común **no** puede cargar un aporte | `violates row-level security policy` |
| T15 | La comisión sí, y el trigger actualiza el destino | `0 → 40.000 / 2`, y al corregir un aporte de 15.000 a 5.000 → **30.000 / 2** |
| T16 | La comisión **no** puede declarar `origen = 'donacion'` a mano | `violates row-level security policy` |

T15 es el que importa más de lo que parece: el contador **recalcula**, no vuelve a sumar.
Ese es el bug clásico de un contador por trigger, y habría inflado la recaudación
publicada cada vez que alguien corrigiera un monto.

⚠️ **Lo que falta para que esto sea rendición de verdad**: los egresos (`gastos`, fase 2).
Hoy hay un libro de lo que entra y a dónde va. Rendir es mostrar también **en qué se
gastó**, con comprobante. Sin eso hay recaudación con destino declarado, no rendición.

#### Inconsistencia de copy pendiente (decisión de la entidad, no técnica)

La tarjeta de donación única tiene el subtítulo *"Campaña: Experiencias educativas"* y
tres viñetas escritas a mano, de cuando había una sola campaña implícita. Ahora que el
destino se elige abajo, ese texto puede contradecir lo elegido. **No se tocó a propósito:
es contenido de la entidad, no del sistema.** Se resuelve moviendo esa copy a la
`descripcion` de cada destino, que es donde ahora corresponde vivir.

### 10.12 — Fase 2 aplicada: la rendición (2026-08-16)

Migración `20260816150000_gastos_y_rendicion.sql`, **en producción**. Cierra lo que §10.11
dejó declarado: hasta acá había recaudación con destino; ahora hay rendición.

```
saldo(destino) = monto_recaudado − monto_rendido
```

#### Qué se construyó

| Pieza | Dónde |
|---|---|
| Tabla `gastos` con comprobante | migración `20260816150000` |
| `destinos.monto_rendido` + `cantidad_gastos_rendidos`, por trigger | ídem |
| Panel de carga, publicación y comprobantes | `/admin → Gastos y rendición` |
| **Rendición pública** | `/rendicion`, enlazada desde Colaborar y el footer |

#### Las cuatro decisiones que definen el modelo

1. **"Rendido" no es "gastado".** `monto_rendido` suma **solo los gastos publicados**. Si
   sumara todos, el público vería un total que no coincide con la lista que puede ver, y
   un total que no cierra se lee como que algo se esconde — justo lo contrario de lo que
   esta tabla existe para lograr. La comisión ve los dos números por separado en el panel.

2. **Publicar un gasto lo publica entero**, notas incluidas. No hay publicación por
   columna: las RLS filtran filas, no columnas, y fingir lo contrario con grants por
   columna produce un modelo que nadie puede razonar. La regla que se sigue de eso es
   simple y verificable: **lo que no pueda ser público no se escribe en un gasto**, y la
   UI lo advierte donde se escriben las notas.

3. **El comprobante no se publica nunca**, ni siquiera con el gasto publicado: una factura
   trae CUIT, domicilio y a veces la firma de un tercero que no consintió. Vive en el
   bucket privado `comision-docs` bajo el prefijo `gastos/`, reusando sus cuatro policies
   —cero policies de storage nuevas—. Lo que sí ve el público es `tiene_comprobante`.

4. **Publicar NO exige comprobante, y los gastos sin comprobante se muestran marcados.**
   Se evaluó exigirlo y se descartó: hay gastos legítimos sin respaldo (un pago chico en
   efectivo), y obligar empujaría a no publicarlos. **Mostrar el hueco es más transparente
   que esconder la fila**, y es lo que hace creíble al resto.

#### Verificado contra producción (checks T17-T20, permanentes)

| Check | Resultado |
|---|---|
| T17 | `anon` ve **solo** gastos publicados de destinos activos — ni los internos, ni los de un destino en borrador |
| T18 | Publicar mueve la rendición y despublicar la devuelve: `10.000/1 → 0/0 → 10.000/1`. **Recalcula**, no suma deltas |
| T19a/b | Un usuario común no puede cargar (`ERROR` de RLS) **ni** publicar (0 filas alcanzadas) |
| T20 | **Nadie** borra un gasto, ni la comisión: `permission denied` |

T19 nació roto y se arregló en el acto: estaba en un solo savepoint, y como el `ERROR` de
la primera mitad aborta la transacción, la segunda devolvía *"current transaction is
aborted"* en vez de ejecutarse. **Un check que no corre se lee igual que uno que pasa.**

#### Lo que falta para que la rendición sirva de verdad

Nada de esto es técnico: **hay que cargar datos.** Con 0 aportes y 0 gastos, `/rendicion`
muestra correctamente "todavía no se publicaron gastos" — que es cierto, y también inútil.
La página se vuelve valiosa recién cuando la entidad carga sus destinos reales, sus
aportes y sus gastos.

Y sigue abierto el eslabón de §10.11: **Render no escribe en `aportes`**, así que el lado
de los ingresos solo se llena con la carga manual.

### 10.13 — El servicio de pagos: diagnóstico y plan (2026-08-16)

Relevado contra producción, no supuesto. Corrige la afirmación de §10.11, que decía
"el webhook no escribe en `aportes`" — cierto pero impreciso, y la precisión cambia el
plan.

#### Qué hace hoy, medido

| Hecho | Evidencia |
|---|---|
| El servicio **está vivo, pero duerme** | Responde `404` (no "conexión rechazada") tras **21,7 s** de cold start. Free tier de Render |
| Las **donaciones únicas funcionan** de punta a punta | 4 aprobadas con `payment_id` real de MercadoPago, $7.141 |
| Las **suscripciones son la mitad rota** | 16 filas con `preapproval_id` y `external_reference`, pero **0** con `last_payment_id` y **0** con `payer_email` |
| El servicio **arma su propio `external_reference`** | En los datos: `anon:suscripcion`, `user:<uuid>:suscripcion` |

**El diagnóstico correcto no es "el webhook no anda":** crea bien las preferencias y las
suscripciones, y escribe de vuelta para donaciones únicas. Lo que falta es el write-back
del lado de las suscripciones, y escribir en `aportes` en cualquiera de los dos casos.

⚠️ **Un dato que no tiene explicación todavía:** las 4 donaciones tienen `updated_at`
exactamente **10 días** después de `created_at`. Las cuatro. Eso no parece un webhook
—que actualiza en segundos— sino un proceso por lotes. Nadie documentó qué es. Antes de
migrar nada conviene saberlo, porque puede haber un cron que no está en ningún lado.

#### Un error propio, corregido el mismo día

Al implementar el checkout (§10.11) el front mandaba `external_reference: "destino:<uuid>"`.
Como el microservicio **ya arma el suyo** y el webhook lo parsea para saber de quién es el
pago, si el microservicio hubiera priorizado el del front **se habría perdido la
identificación del usuario en cada suscripción**: entra la plata y no se sabe de quién es.

No hubo daño porque no hay ninguna suscripción real, pero quedaba armado para la primera.
Ahora se manda solo `destino_id` —el dato crudo— y que el microservicio lo codifique con
su propio esquema (`user:<uuid>:suscripcion:destino:<uuid>`). Hay un test que lo fija.

**La lección, que es general:** antes de agregar un campo a un contrato que no controlás,
mirá qué valores tiene hoy en producción. El esquema estaba a una consulta de distancia.

#### El plan, en tres pasos

**1. ✅ Hecho — las donaciones entran solas al libro** (migración `20260816160000`).

Trigger sobre `donations`: cuando una donación queda `approved`, se crea su `aporte` con
`referencia_externa = payment_id`, que es `UNIQUE` — **idempotente por construcción**, que
es justo lo que hace falta con webhooks que reintentan. Incluye backfill de las 4
donaciones reales. El libro pasó de $0 a **$7.141**, cuadrando exacto con `donations` y
con `fundacion_metrics`.

**La regla de oro de esa función:** nunca puede hacer fallar el registro de una donación.
Si se propagara el error se perdería el cobro entero y MercadoPago reintentaría para
siempre. Un libro incompleto se repara —el propio backfill sirve de pase de reparación—;
una donación que nunca se registró, no. Verificado en T23.

Lo que **no** resuelve: el destino elegido sigue sin llegar (todo cae al institucional), y
las suscripciones siguen afuera porque sin `last_payment_id` no existe el hecho "se cobró
un mes". Un trigger sobre la creación de la suscripción registraría una intención, no un
cobro, y eso ensucia el libro con plata que nunca entró.

**2. Decidido — mover el servicio de pagos a Vercel, en este mismo repo.**

| | A favor | En contra |
|---|---|---|
| **Vercel, mismo repo** ← elegido | La infra **ya existe y está probada**: el repo deploya `api/share/*`. Un repo, un deploy, sin los 22 s de cold start, y el código de pagos al lado del esquema, las migraciones y los checks | Migrar credenciales de MP; reescribir ~4 endpoints |
| Arreglar Render | Cambio mínimo | 22 s de cold start; código fuera del repo, sin tests ni CI; para multi-cliente es un servicio misterioso **por cliente** |
| Supabase Edge Functions | `service_role` nativo, al lado de la base | Suma un runtime nuevo (Deno) a un stack que ya tiene funciones en Vercel |

⚠️ **La trampa de la migración:** `vercel.json` tiene
`{ "source": "/api/(.*)", "destination": "https://mp-supabase-webhook.onrender.com/api/$1" }`.
Las funciones `api/share/*` sobreviven **solo porque sus rewrites están antes**. Al agregar
funciones de pago hay que ponerles su rewrite antes del catch-all, o sacar el catch-all —
si no, Vercel manda todo a Render y las funciones nuevas nunca se ejecutan, sin ningún
error visible.

**3. Pendiente — reconciliación contra la API de MercadoPago.**

Independiente de dónde viva el servicio. Los webhooks se pierden, y §10.10 ya documentó una
desincronización real (16 membresías vs 7 suscripciones). Un pase periódico que pregunte
"¿qué pagos hubo desde X?" y escriba con la misma `referencia_externa` es lo que vuelve
confiable al libro — y por el `UNIQUE` es seguro correrlo cuantas veces se quiera.

### 10.14 — Catálogo de destinos de la Fundación (2026-08-16)

Cargado en `supabase/data/seed_destinos_fundacion.sql`. **No es una migración**: las
migraciones son el esquema, que se comparte entre clientes; los destinos son datos de
esta entidad. Meterlos en una migración le cargaría las campañas de la Fundación a un
refugio de animales el día que se levante el segundo cliente.

**Los 10 entran en `borrador`.** Un borrador no se muestra en el sitio: las RLS solo le
dan a `anon` los `activo`. Verificado en producción — el público sigue viendo un solo
destino. La comisión revisa, ajusta y publica lo que quiera desde el panel.

#### El catálogo

| # | Tipo | Destino | Origen |
|---|---|---|---|
| 10 | campaña | Equipamiento deportivo | Relevado (§10.8) |
| 20 | campaña | Kit del jugador | Nuevo |
| 30 | campaña | Traslados a entrenamientos y partidos | Nuevo |
| 40 | campaña | Merienda después del entrenamiento | Nuevo |
| 50 | campaña | Acompañamiento profesional | Relevado (§10.8) |
| 60 | campaña | Vuelta a clases | Nuevo |
| 70 | campaña | Seguros y aptos médicos | Nuevo |
| 80 | campaña | Formación de entrenadores | Nuevo |
| 90 | padrinable | Beca formativa | Relevado (§10.8) |
| 100 | padrinable | **Apadriná una categoría** | Nuevo — ver abajo |

#### "Apadriná una categoría": la idea que resuelve la tensión de fondo

El apadrinamiento tiene un conflicto de raíz. Funciona emocionalmente **porque es
concreto** —"apadriná a alguien"— y es exactamente por eso que empuja a exponer a un
menor. §10.8 resolvió el lado legal (se apadrina un cupo, nunca un chico identificado),
pero un cupo es abstracto y pierde justo lo que hacía funcionar la mecánica.

Apadrinar una **categoría** recupera lo concreto sin exponer a nadie:

- El padrino tiene un vínculo real y seguible: *"la 2014 es mía"*.
- No hay ningún individuo expuesto, ni siquiera anonimizado.
- Se puede contar todo lo que pasa —cuántos entrenaron, qué torneos jugaron, cómo les
  fue— **sin un solo dato personal**.
- Escala: una categoría admite varios padrinos sin sentirse repartida, cosa que un cupo
  individual no permite.

#### Dos decisiones de redacción que no son cosméticas

**"Acompañamiento profesional" no enumera las especialidades.** El relevamiento
mencionaba nutricionista, psicólogo, preparador físico y acompañamiento docente. La
descripción pública habla de *horas de acompañamiento* y no de "chicos que necesitan
tratamiento". En una entidad chica, decir públicamente "financiamos al psicólogo" con un
grupo identificable **estigmatiza aunque ningún nombre aparezca**. Lo que se financia es
la disponibilidad del profesional.

**Y el corolario técnico, que ya estaba en §10.8 y conviene repetir acá:** los resultados
clínicos —mediciones, diagnósticos, informes— **no entran a este sistema bajo ninguna
forma**. Son datos sensibles de salud de menores (Ley 25.326) y acá no hay dónde
guardarlos con las garantías que exigen. El sistema financia el servicio; el profesional
guarda su historia clínica donde corresponde.

#### Lo que falta, y solo puede hacerlo la entidad

`meta_monto` y `cupos_totales` quedaron en **NULL** a propósito. Dependen de precios
reales —cuánto sale un kit, cuánto una cuota, cuántos chicos hay por categoría— y poner
números plausibles sería fabricar objetivos financieros de una organización real. Además
el primer donante que compare vería que no cierran.

La forma de completarlos es por unidad, no por intuición:

```
meta = (costo de una unidad) × (cuántas unidades) 
```

Un kit, una hora de profesional, un mes de pasajes, una cuota. Esa cuenta además da la
copy: *"cada $X = un kit"* convierte un monto en una decisión.

#### Recomendación de arranque

**Publicar 3, no 10.** Diez campañas activas dispersan al donante y ninguna llega a la
meta. Sugerido:

1. **Equipamiento deportivo** — la más fácil de cerrar el circuito completo: se compra,
   se sube la factura, se publica. Estrena la rendición en una semana.
2. **Beca formativa** o **Apadriná una categoría** — una de las dos, para estrenar el
   canal recurrente. Cuál depende de si hay categorías bien definidas.
3. **Sostenimiento institucional** — ya activa, y es donde caen hoy las donaciones que
   entran por MercadoPago (§10.13).

El resto queda en borrador, listo para publicar cuando toque —"Vuelta a clases" en
febrero, "Seguros y aptos" antes del inicio del torneo—. **Una campaña con temporada
propia rinde más que un pedido genérico todo el año.**

#### ✅ Publicado el 2026-08-16: las tres primeras

Decidido con el dueño. Están **activas en producción**:

| Destino | Puntual | Recurrente |
|---|---|---|
| Sostenimiento institucional | ✓ | ✓ |
| Equipamiento deportivo | ✓ | |
| **Apadriná una categoría** | ✓ | ✓ |

Entre las dos formas de apadrinamiento se eligió **la categoría por sobre la beca
individual**, por lo del apartado anterior: mismo tirón emocional, cero exposición de
menores, y escala mejor. "Beca formativa" queda en borrador por si más adelante conviene
tener las dos.

Verificado en el sitio construido: `/collaborate` ya muestra el desplegable de destino en
las dos tarjetas —apareció solo, porque antes había un único destino y ahora hay varios— y
`/rendicion` lista los tres con los $7.141 ya imputados.

**Salieron sin `meta_monto` a propósito**, y es una decisión, no una omisión: publicar hoy
sin barra de progreso vale más que esperar semanas a tener los precios. Se muestra cuánto
se juntó; el día que se carguen las metas, la barra aparece sola y no hay que rehacer nada.

⚠️ **Lo que queda pendiente de la entidad, y es lo único que bloquea el potencial de esto:**

| Destino | Qué falta |
|---|---|
| Equipamiento deportivo | `meta_monto` = Σ (precio unitario × cantidad) de pelotas, conos y pecheras |
| Apadriná una categoría | `meta_monto` = costo mensual de sostener una categoría, y `cupos_totales` = cuántas categorías hay |
| Sostenimiento institucional | Nada. **Va sin meta y está bien**: no tiene final, no es "juntemos $X" |

Y el corolario de copy, que es donde está el verdadero valor del número: si una pelota
sale $25.000, la campaña puede decir *"cada $25.000 = una pelota"*. **Eso convierte un
monto en una decisión**, y donar "una pelota" es mucho más fácil que donar "un monto".


### 10.15 — El casillero que faltaba antes de tocar el servicio de pagos (2026-08-16)

Primer paso del traslado a Vercel (§10.13), y resultó no ser código de Vercel.

#### El hallazgo

Antes de escribir la primera función se revisó dónde iba a aterrizar el destino. Y no
había dónde: **`donations` no tenía columna `destino_id`.** `memberships` sí la tiene
desde la fase 1, y el front ya manda `destino_id` al crear la preferencia desde §10.11 —
pero del lado de las donaciones el dato no tenía casillero.

O sea que **mover el servicio a Vercel sin esto habría sido construir la cañería y dejarla
desembocando en el mismo lugar de siempre**: el trigger seguiría imputando todo al
institucional, y no habría forma de notar que el trabajo no sirvió para nada.

Migración `20260816170000`, aplicada. Nullable a diferencia de `aportes.destino_id`, que
es NOT NULL, y no es inconsistencia: `donations` registra lo que informó la pasarela, y
puede llegar sin destino —el link directo de MercadoPago que publica la entidad no pasa
por el checkout del sitio—. `aportes` es el libro, y ahí todo aporte tiene destino sí o
sí. NULL en `donations` significa "el canal no lo informó", y el trigger cae al
institucional.

#### La decisión sutil: `DO NOTHING`, no `DO UPDATE`

La tentación obvia al agregar la columna era que el trigger sincronizara el destino:
`ON CONFLICT (referencia_externa) DO UPDATE SET destino_id = EXCLUDED.destino_id`.

**Sería un error.** La comisión puede re-imputar un aporte mal dirigido desde el panel, y
con `DO UPDATE` el próximo reintento del webhook le desharía la corrección **en silencio**.
Entre "el trigger crea y nunca modifica" y "el trigger sincroniza", la primera es la única
que deja sobrevivir una corrección humana. Verificado (E4 en Docker): dos reintentos
seguidos y la corrección sigue en pie.

#### Y la contracara en el panel: re-imputar

§10.11 había dicho que un aporte de pasarela no se edita. Eso sigue valiendo **para el
monto y la fecha**, que son el registro de MercadoPago. Pero **el destino MercadoPago ni
lo conoce**: es una decisión de la entidad, así que re-imputarlo no contradice a nadie.

Ahora `/admin → Libro de aportes` ofrece **"Cambiar destino"** en los aportes de pasarela,
con un diálogo que solo toca esa columna. Hace falta de verdad: hasta que el servicio de
pagos reenvíe el destino elegido, toda donación digital cae al institucional y esta es la
única forma de mandarla a su campaña.

#### Lo que sigue, y lo que hace falta de afuera

Con el casillero puesto, el trabajo en Vercel ya tiene dónde depositar el resultado.
Tres cosas que **no dependen del código** y sin las cuales no se puede completar:

| Qué | Quién |
|---|---|
| `MP_ACCESS_TOKEN` de MercadoPago en las variables de entorno de Vercel | La entidad |
| Cambiar la URL de notificaciones en el panel de MercadoPago | La entidad |
| Saber qué es el proceso que actualiza donaciones **exactamente 10 días** después (§10.13) | Investigar |

⚠️ Y la trampa que ya está documentada en §10.13, que conviene releer antes de empezar:
`vercel.json` manda todo `/api/(.*)` a Render. Las funciones nuevas necesitan su rewrite
**antes** del catch-all, o Vercel las ignora sin ningún error visible.

### 10.16 — El servicio de pagos, arreglado en origen (2026-08-16)

Se consiguió acceso a Render y **al repo del microservicio**:
`GonzaloRamosEngineer/mp-supabase-webhook`. Eso cambió el plan de §10.13, y con razón:
son **483 líneas claras y funcionando**. La decisión de portarlo a Vercel se había tomado
sin ver el código; con el código a la vista, los arreglos que faltaban eran ~40 líneas ahí
adentro. **Se arregló primero; el traslado a Vercel queda como tarea aparte y sin apuro.**

#### Lo que el código reveló, y que ninguna consulta a la base podía decir

| Hallazgo | Consecuencia |
|---|---|
| Los controladores desestructuran solo los campos que conocen | El `destino_id` que el front manda desde §10.11 **se descartaba en silencio** |
| `if (ext.kind === 'donacion')` en la rama de pagos | **Causa raíz** de que el canal recurrente nunca llegara al libro: MercadoPago sí avisa de cada cobro mensual, y el aviso se tiraba |
| Nadie escribe `last_payment_id` | Por eso estaba vacío en las 16 filas. No era un webhook perdido: no existía el código |
| El webhook está en `/webhook`, no en `/api/...` | Por eso las sondas de §10.13 daban 404. MercadoPago pega directo a Render vía `MP_NOTIFICATION_URL`, **sin pasar por el proxy de Vercel** |

#### El misterio de los 10 días: cerrado

```js
created_at: new Date(pago.date_created).toISOString(),  // fecha del pago
updated_at: new Date().toISOString()                    // ahora
```

La fila se actualiza cuando MercadoPago manda `payment.updated`, y MP lo manda **al
liberar el dinero** — en Argentina, típicamente 10 días después. **No hay ningún cron
fantasma.** §10.13 sospechaba un proceso por lotes no documentado; era el ciclo de
acreditación de MercadoPago.

#### Una afirmación propia que hay que corregir

§10.13 dijo que el `external_reference` que mandaba el front "quedaba armado para perder
la identificación del usuario en la primera suscripción". **Es falso, y el código lo
prueba:** ambos controladores arman el suyo e ignoran el del body. Nunca hubo riesgo real.
Sacarlo siguió siendo lo correcto, pero el peligro estaba sobreestimado.

**La lección, que ya había aparecido en §10.13 y esta vez cortó para el otro lado:** sin
leer el código solo se puede razonar sobre el contrato observable, y ese razonamiento
tiende a ser conservador de más. Vale igual — el conservadurismo no rompió nada — pero
conviene decir "no lo sé" en vez de afirmar un mecanismo.

#### Qué se cambió

**El destino viaja dentro de `external_reference`**, el único campo que MercadoPago
devuelve intacto tanto en un `payment` como en un `preapproval`. El formato **extiende** el
que ya existía:

```
antes:  user:<uuid>:donacion          | anon:suscripcion
ahora:  user:<uuid>:donacion:destino:<uuid>
```

Las 20 referencias que ya están en producción no tienen el sufijo y se siguen leyendo
igual — hay pruebas que lo fijan. Y el destino se busca **por token, no por posición**: la
posición del sufijo cambia según haya `user:` o `anon:` adelante, y hardcodear dos índices
distintos es donde se esconden los bugs.

**Las renovaciones ya no se descartan.** Se registran como `donations` con
`donation_type = 'suscripción'`, y de ahí el trigger de §10.13 crea el aporte. En una
renovación además se escribe `last_payment_id` en la suscripción — pero **solo si el match
por `external_reference` es inequívoco**: hoy hay 6 filas compartiendo `anon:suscripcion`,
y actualizar "alguna" sería peor que no tocar ninguna, porque escribiría el cobro de una
persona en la suscripción de otra.

**La regla de oro, la misma que en el trigger:** el registro del cobro no se puede perder.
`destino_id` es una FK; si apunta a un destino borrado, el insert entero falla y el cobro
queda sin registrar. Por eso ante cualquier fallo se reintenta una vez sin ese campo, y un
destino mal formado se omite en silencio en vez de rechazar la donación.

#### Verificado

- **15 pruebas** del ida y vuelta del destino (`npm test` en el repo del servicio),
  incluida la compatibilidad con las referencias viejas y siete formas de destino inválido.
- Deploy en Render OK: `/webhook` responde 200 y `/api/crear-preferencia` sigue validando.
- Preferencia real creada **con un `destino_id` de producción**: MercadoPago la aceptó y
  devolvió `init_point`.

⚠️ **Lo único que no se puede verificar sin mover plata de verdad** es el circuito
completo: pago real → webhook → `donations.destino_id` → aporte en la campaña correcta.
Una donación de prueba de $100 lo cierra.

#### Lo que queda

| Qué | Estado |
|---|---|
| ~~El `origen` del aporte de una renovación dice `donacion`, no `membresia`~~ | ✅ **CERRADO el 2026-09-02 (§10.22), y no era una imprecisión: eran tres bugs.** El más caro no tenía nada que ver con la etiqueta — un cobro mensual de $50.000 otorgaba **diez meses** de acceso, porque la renovación se convertía con la regla proporcional de las donaciones. El bloqueante que este renglón declaraba (las 6 filas ambiguas) **ya se había caído solo**: la suscripción nueva trae `external_reference` única |
| Las 6 suscripciones con `anon:suscripcion` idéntico | Bloquean el match inequívoco. Son todas de prueba (§10.10): lo más limpio es cancelarlas en MercadoPago y darlas de baja |
| `MP_WEBHOOK_SECRET` sin definir | Sin él **no se valida la firma** de los webhooks: hoy cualquiera que sepa la URL puede postear un evento falso. Es la mejora de seguridad más barata que queda |
| Portar a Vercel | Sigue valiendo por el cold start de 22 s y por tener un solo repo. Ya sin urgencia |

---

### 10.17 — La capa de acceso, y el bloqueante que destapó (2026-08-30)

El libro (§10.11) registra **cuánto entró y a qué destino**. Lo que faltaba era la otra
mitad: **que un aporte habilite algo**. Hasta el 2026-08-30 todos los aportes tenían
`acceso_desde` y `acceso_hasta` en NULL, así que la cuota no otorgaba ningún privilegio
(el ítem 10.1.b).

#### Qué se construyó

| Migración | Qué |
|---|---|
| `20260830110000_capa_acceso.sql` | `reglas_acceso`, `acceso_vigente()` / `tiene_acceso()` / `mi_acceso()` / `antiguedad_socio()` / `mi_antiguedad()` / `meses_por_donacion()` / `destino_otorga_acceso()`, más `benefits.requiere_acceso`, `destinos.otorga_acceso` y `aportes.equivale_a` |
| `20260830140000_triggers_otorgan_acceso.sql` | El cálculo del período dentro de `aporte_desde_donacion()` —**conservando su cuerpo**, incluido el `ON CONFLICT DO NOTHING`— y `aporte_desde_membresia()`, que no existía: hasta ahora solo las donaciones entraban al libro |

Verificación: `supabase/checks/acceso-check.sql`, 14 comprobaciones. Aplicadas en
producción, con backfill (`supabase/data/backfill_acceso.sql`).

#### Las reglas, y por qué

- **Conversión donación → meses:** proporcional, `least(12, greatest(1, floor(monto /
  cuota)))`. Un plazo fijo canibaliza la cuota: con una donación chica se obtendría medio
  año y nadie pagaría todos los meses.
- **Piso = el precio de la cuota.** Se modela `piso_monto = NULL` ("usar la cuota") y no
  el número copiado, para que al subir la cuota el piso suba solo. Sin piso, una donación
  de $100 otorgaba un mes entero de beneficios.
- **Gracia de 30 días, solo para cuotas.** Un cobro recurrente falla por tarjeta vencida
  más que por decisión; una donación puntual no falla, se terminó.
- **Antigüedad: no es un número, son tres.** `socio_desde` no se reinicia nunca (la
  identidad, el carnet), `meses_aportados` es lo que **otorga derechos**, `racha_meses`
  premia la continuidad. Se calculan con `range_agg`, así que un doble pago no cuenta
  doble. Quien se fue un año y volvió conserva su historia pero no cobra por el año que no
  pagó.
- **Aporte manual:** la comisión elige al cargarlo si equivale a cuota o a donación
  (`aportes.equivale_a`); de eso depende la gracia.
- **Destinos:** todos otorgan acceso por defecto; las excepciones se marcan con
  `destinos.otorga_acceso = false`. Que un destino habilite el club tiene que ser una
  decisión visible, no un efecto lateral.
- **`tiene_acceso` quedó en dos versiones.** Con una sola con parámetro y `SECURITY
  DEFINER`, cualquier usuario logueado podía averiguar si otra persona paga la cuota. La
  sin parámetro (resuelve por `auth.uid()`) es para usuarios y policies; la que recibe un
  uuid es solo para `service_role`.

#### 🔴 El bloqueante: las donaciones no traen quién donó

Corrido el backfill en producción, el resultado fue **0 personas con acceso vigente**. No
falló nada: es el estado real.

| | |
|---|---|
| Donaciones con `user_id` | **1 de 5** |
| Membresías con `user_id` | 10 de 17 |
| Membresías con `payer_email` | **0** |

Cuatro de las cinco donaciones aprobadas son anónimas. La única con cuenta es de $1.916,
debajo del piso. La de $5.000 —que sí daría un mes— no tiene a quién habilitar.

**Y no se puede reconciliar después:** `donations` no tiene columna de email y
`memberships.payer_email` está vacío en las 17 filas. Un aporte anónimo es, por
construcción, inatribuible. Es el ítem 10.1.c convertido en bloqueante concreto.

> ⚠️ **REFUTADO el mismo día — ver §10.18.** Las dos afirmaciones de este bloque están
> mal. (a) El vínculo **no se pierde**: los cuatro eslabones mandan y leen `user_id`
> correctamente; lo que pasa es que se dona sin sesión iniciada. (b) La reconciliación
> **sí es posible**: la columna faltaba, pero el dato existe — MercadoPago informa
> `payer.email` en cada pago y conserva los históricos. Se dejaron acá tal como se
> escribieron, porque el error importa: es la segunda vez que un casillero ausente se lee
> como un dato inexistente.

Se arregla en el servicio de pagos, no en SQL — el mismo frente del §10.13/§10.16. Tres
caminos, de menos a más fricción:

1. ~~**Pasar `user_id` cuando hay sesión.**~~ **Ya estaba hecho** (§10.18). Se escribió
   como pendiente sin leer el código que ya lo implementaba.
2. **Guardar el email del pagador** (`donations.payer_email`, como ya existe en
   `memberships`) y reconciliar contra `users.email`. Requiere que el proveedor lo informe.
3. **Pedir cuenta antes de donar.** Máxima atribución y máxima fricción. Para una
   fundación que necesita que donar sea fácil, es el peor de los tres.

Hasta que esto se resuelva, el club funciona y está vacío.

---

### 10.18 — El bloqueante, releído contra el código (2026-08-30)

§10.17 cerró con un diagnóstico y tres caminos. **El diagnóstico estaba equivocado en su
parte central**, y el código lo prueba. Esta sección lo corrige y deja hecho lo único que
no dependía de una decisión.

#### La cañería está entera

§10.17 dijo: *"Si alguien logueado dona, el vínculo se pierde en algún punto entre el
sitio y el webhook."* Se leyeron los cuatro eslabones y **no se pierde en ninguno**:

| Eslabón | Qué hace | Archivo |
|---|---|---|
| El checkout | manda `userId: user?.id` | `src/pages/Collaborate.jsx:88` |
| El sitio → servicio | lo reenvía como `user_id` | `src/api/membershipApi.js` |
| El servicio | lo codifica en el `external_reference` | `preferencia.controller.js` |
| El webhook | lo lee de vuelta y lo escribe | `index.js` + `lib/destino.js` |

**No hay nada roto que arreglar.** El camino 1 de §10.17 —"pasar `user_id` cuando hay
sesión"— ya está implementado desde antes de que se escribiera como pendiente.

La causa es más simple y no tiene arreglo técnico: **se dona sin sesión iniciada**.
`user?.id || null` da null porque no hay usuario, no porque se haya perdido el dato.

#### Lo que dicen las cinco donaciones

| Fecha | Monto | ¿Cuenta? | ¿Destino? |
|---|---|---|---|
| 2025-10-18 | $75 | anónima | — |
| 2025-10-18 | $1.916 | ✅ | — |
| 2025-11-16 | $5.000 | anónima | — |
| 2026-01-14 | $150 | anónima | — |
| **2026-08-16** | **$100** | **anónima** | **sí** |

Cuatro de las cinco son **anteriores** a todo este modelo. Y la quinta es la donación de
prueba que demostró el circuito de punta a punta (§11.1): trae destino —el canal nuevo
funciona— y aun así entró anónima, porque quien la hizo no tenía sesión. **La muestra que
sostenía el diagnóstico es una sola donación de la era nueva, y era una prueba.**

#### La otra afirmación que hay que corregir

§10.17 dijo que un aporte anónimo es *"inatribuible por construcción"* porque `donations`
no tiene columna de email. **La columna faltaba; el dato no.** MercadoPago informa
`payer.email` en cada `payment` y lo conserva: los cinco `payment_id` están en la tabla,
así que las donaciones históricas **también** son recuperables consultando la API con
`MP_ACCESS_TOKEN`.

Era el mismo hallazgo que motivó `donations.destino_id` (§10.15) —un casillero ausente
leído como un dato inexistente— y por segunda vez se describió como imposible algo que
solo faltaba guardar.

#### Qué se hizo

| Dónde | Qué |
|---|---|
| `20260830170000_donations_payer_email.sql` | La columna, con índice sobre `lower(payer_email)` para la reconciliación |
| `lib/pagador.js` (servicio) | `emailDelPagador()`: extrae, normaliza y **descarta placeholders** |
| `index.js` (servicio) | Lo escribe en cada `donations`, y el reintento de la regla de oro ahora también lo suelta |
| `supabase/checks/payer-email-check.sql` | 8 comprobaciones, con control negativo |

**La trampa que justifica un módulo entero para leer un campo:** el checkout manda
`payer.email = 'anon@fundacion.com'` cuando no hay sesión (`Collaborate.jsx:89`). Ese
placeholder vuelve en el payment, y guardarlo sería **peor que guardar `null`**: `null`
dice "no se sabe", mientras que un email sintético se lee como un dato real y además es
**el mismo para todas las personas anónimas**. Una reconciliación futura que empareje por
email juntaría donaciones de gente distinta en una sola identidad.

**Y una advertencia de despliegue, escrita en el código:** la columna es nueva, así que si
el servicio se despliega **antes** de aplicar la migración, PostgREST rechaza el payload
entero por columna desconocida y se pierde el registro de cada donación mientras dure el
desfasaje. El orden es **migración primero, deploy después**; el tercer reintento existe
para que equivocarse cueste un dato accesorio y no la plata.

#### Lo que NO se hizo, y es deliberado

**Vincular el email a una cuenta.** Emparejar `payer_email` con `auth.users.email` y
completar `user_id` **otorga acceso al club**, así que no es una tarea de plomería sino
una decisión con consecuencias de seguridad: quien escriba el email de otra persona en el
checkout de MercadoPago le estaría regalando —o robando— antigüedad y beneficios.

Guardar el dato es reversible e inocuo. Vincularlo no. Por eso van en migraciones
separadas: la segunda tiene que poder revisarse sola.

Y hay un problema técnico atado a esa decisión que conviene resolver junto: el trigger
`aporte_desde_donacion()` usa `ON CONFLICT (referencia_externa) DO NOTHING` (§10.15), a
propósito, para que un reintento del webhook no pise una corrección de la comisión. Eso
significa que **completar el `user_id` de una donación vieja no actualiza el aporte que ya
existe**: haría falta un camino explícito que recalcule el acceso sin romper esa garantía.

#### Lo que sigue, en orden

1. **Decidir la política de vinculación** (abajo, §10.19 cuando se decida).
2. **Bajar la fricción de la sesión en el checkout.** Es lo único que ataca la causa real
   sin tocar la seguridad: hoy `/colaborar` no invita a iniciar sesión ni explica que
   aportar con cuenta habilita el carnet. No es pedir cuenta obligatoria —el camino 3, el
   peor— sino decir en el momento justo lo que hoy no se dice.
3. **Backfill de los 5 `payment_id` contra la API de MercadoPago**, para recuperar los
   emails históricos. Necesita `MP_ACCESS_TOKEN`, que vive en Render.
4. **Dejar de mandar un email falso al checkout.** `anon@fundacion.com` degrada el dato en
   origen. Cambia el contrato de `/api/crear-preferencia` (hoy exige `payer.email`), así
   que es un cambio con riesgo sobre el cobro y merece su propia verificación.

---

### 10.19 — La vinculación: el email como pista, la persona como decisión (2026-08-30)

§10.18 dejó guardado el email del pagador y **no** lo vinculó a ninguna cuenta, porque esa
era una decisión y no una tarea. **Decidido:** vincula la persona, reclamando.

#### Por qué no automático

La tentación era emparejar `payer_email` con `auth.users.email` y completar `user_id` solo.
Sería un error de seguridad: completar `user_id` **no es anotar un dato, es otorgar acceso
al club**, con su antigüedad y sus beneficios.

Y el email del checkout **lo escribe quien paga, en el sitio de MercadoPago, sin que nadie
lo verifique contra nada**. Quien escriba ahí el mail de otra persona —por error o a
propósito— le estaría transfiriendo el aporte.

**La regla que queda:** el email es una **pista**, no una credencial. Habilita a *ofrecer*;
nunca a *otorgar*. Quien otorga es la persona que demuestra controlar la cuenta y que
además decide hacerlo.

#### Las tres condiciones, y ninguna sobra

| | Qué | Por qué |
|---|---|---|
| 1 | Sesión iniciada | `auth.uid()`, **nunca un uuid por parámetro** |
| 2 | Email verificado | sin `email_confirmed_at`, el mail no prueba nada |
| 3 | Un acto explícito | no lo llama ningún trigger: lo llama un botón |

La 1 no es cosmética: es la misma lección que dejó `tiene_acceso()` en §10.17. Con una
sola versión que reciba el uuid y sea `SECURITY DEFINER`, cualquier usuario logueado
podría reclamar los aportes de otro. **Acá no existe la variante con parámetro**, y hay un
check que lo verifica (T12).

#### Qué se construyó

| Dónde | Qué |
|---|---|
| `20260830180000_reclamar_donaciones.sql` | `donations.reclamado_en`, `email_verificado()`, `donaciones_reclamables()` y `reclamar_donaciones()` |
| `src/api/accesoApi.js` + `useContentQueries` | RPC y hooks; la mutación invalida `['acceso', userId]` **por prefijo** |
| `src/components/Acceso/ReclamarAportes.jsx` | La tarjeta, en `/carnet` entre el estado y la credencial |
| `supabase/checks/reclamar-check.sql` | 17 comprobaciones |

**Dos decisiones que conviene dejar escritas:**

- **El acceso corre desde hoy, no desde la fecha de la donación.** Contarlo desde la fecha
  original sería más "fiel" y en la práctica inútil: una donación de 2025 daría un mes
  vencido en 2025, o sea nada. Si la entidad decidió que ese aporte otorga un mes, la
  persona tiene que poder usarlo.
- **Se actualiza el aporte que ya existe, no se crea uno nuevo.** Insertar otro duplicaría
  la plata en la rendición. Y no alcanza con tocar `donations`: el trigger tiene
  `ON CONFLICT DO NOTHING` a propósito (§10.15), así que completar el `user_id` de la
  donación **no actualiza el aporte por sí solo**. Por eso el UPDATE es explícito.

#### Tres cosas que salieron de verificar, y las tres son la misma

**Una verificación que no puede fallar no verifica nada** — §11.4, por cuarta, quinta y
sexta vez:

1. **`SET LOCAL request.jwt.claims` no es donde mira `auth.uid()`** en esta base (usa
   `request.jwt.claim.sub`). Con el uid en NULL, el check de §10.18 que decía "un tercero
   no ve el email del donante" **pasaba sin probar nada**: no había ningún tercero. Se
   agregó T3a, un control positivo que falla si la sesión simulada no es real.
2. **Y cuando la sesión pasó a ser real, el check falló** — correctamente: el usuario
   elegido era el **admin**, y la policy es `auth.uid() = user_id OR check_is_admin()`. Un
   admin ve todo por diseño. El tercero tiene que ser un usuario común.
3. **La migración no se podía validar en Docker.** La imagen trae un `auth.users` viejo,
   con `confirmed_at` y sin `email_confirmed_at`. En vez de probarla solo contra
   producción, la columna se resuelve al aplicar (`email_verificado()`). Una migración que
   solo se puede probar en producción es exactamente lo que este repo decidió no tener.

#### Lo que falta

- **El render del carnet con sesión no está verificado en navegador**: `/carnet` es una
  ruta protegida y la verificación headless cae en el login. El bundle sí está verificado
  (las cuatro rutas cargan con tamaño y contenido sanos) y el componente tiene 7 pruebas,
  pero **la pantalla real con una sesión de verdad la tiene que mirar una persona**.
- **Bajar la fricción de la sesión en el checkout** (§10.18): sigue siendo lo único que
  ataca la causa de raíz. Reclamar repara hacia atrás; que la gente done con sesión evita
  el problema.
- **El backfill de los 5 `payment_id`** contra la API de MercadoPago, para que haya algo
  que reclamar. Necesita `MP_ACCESS_TOKEN`, que vive en Render. **Sin esto, la pantalla de
  reclamo es correcta y no le aparece a nadie**, porque `payer_email` está vacío en las 5
  donaciones que ya existen.

---

### 10.20 — Que aportar con sesión sirva para algo, y que se note (2026-08-30)

El backfill (§11.5) dejó medido el problema: de cinco donaciones reales **tres no dejaron
ningún rastro** y una sola quedó atribuida a una persona. El acceso al club se otorga por
aporte, así que un aporte anónimo es plata que entra y no le habilita nada a nadie.

La causa nunca fue técnica —la cañería del `user_id` siempre estuvo entera (§10.18)— sino
que **`/collaborate` no decía en ningún lado que aportar con sesión iniciada sirviera para
algo**. Reclamar (§10.19) repara hacia atrás; esto evita el problema.

#### Qué se construyó

| Dónde | Qué |
|---|---|
| `src/components/Collaborate/AvisoSesion.jsx` | El bloque: explica, ofrece iniciar sesión o crear cuenta, y acepta un email opcional |
| `src/lib/aportante.js` | `emailParaCheckout()`: qué email viaja al cobro, en un solo lugar y con pruebas |
| `Collaborate.jsx` | Un solo estado de email para las dos formas de aportar |

**Va arriba de las tres tarjetas y no dentro de cada una**: aplica a la donación y a la
suscripción por igual, y repetirlo sería pedir el mismo dato dos veces.

#### Las tres decisiones, y las tres son la misma

**No bloquea nada.** Pedir cuenta antes de donar era el camino 3 de §10.17 y sigue siendo
el peor: para una fundación que necesita que donar sea fácil, la fricción cuesta más de lo
que rinde la atribución. Se informa y se ofrece; donar sin nada de esto sigue estando a un
clic.

**El email es el segundo mejor camino, y es opcional de verdad.** Quien no quiere crear
cuenta puede dejarlo y reclamar el aporte más adelante. Si está vacío —o si no parece un
email— se dona igual: `emailParaCheckout()` cae al placeholder de siempre. Un email mal
escrito **avisa pero no deshabilita nada**, y hay una prueba que lo fija. La regla de
fondo es la misma que rige el trigger y el webhook: **un dato accesorio no puede impedir
un cobro.**

**El placeholder sigue existiendo, y no es un descuido.** `/api/crear-preferencia` exige
`payer.email` y responde 400 sin él, así que sacarlo cambia el contrato del endpoint que
cobra. Queda como estaba, con una diferencia: ahora solo se usa cuando de verdad no hay
ningún dato. El webhook lo sigue descartando explícitamente (`lib/pagador.js`), y hay una
prueba que ata la constante de este repo a esa decisión del otro.

#### El detalle que hace que funcione

El link de "Iniciar sesión" lleva `state={{ from: { pathname: '/collaborate' } }}`, que es
el mecanismo que `LoginPage` ya usaba. **Sin eso, iniciar sesión te deposita en el panel
que corresponda a tu rol y perdés el aporte que ibas a hacer** — es decir, el aviso
causaría exactamente el abandono que vino a evitar.

Tiene prueba propia, y existe porque la obvia no alcanza: **el `state` no aparece en el
`href`**, así que un link sin él pasaría un test que solo mire el destino. La prueba monta
las dos rutas, hace click y lee el `state` que llegó.

#### Otra vez la misma lección, y esta vez estaba en este archivo

La verificación en navegador de §B mandaba comprobar `/nosotros` y `/actividades`.
**Ninguna de las dos existe**: las rutas de `App.jsx` están en inglés (`/about`,
`/activities`). Los dos chequeos pegaban en el 404 y aprobaban.

Se notó por un detalle: las dos daban **exactamente 25.900 bytes**, al byte. Dos páginas
distintas no pesan igual; dos 404 sí. §B ya advertía esto mismo por `/colaborar` — la
advertencia estaba escrita y la lista de al lado seguía mal. Ahora está corregida, con el
tamaño del 404 anotado como olor a buscar.

---

### 10.21 — Un `.ok` que faltaba, y por qué era un cobro perdido (2026-08-31)

Al cargar `MP_WEBHOOK_SECRET` y simular una notificación desde el panel de MercadoPago,
los logs de Render mostraron esto:

```
TypeError: s.toLowerCase is not a function at mapPaymentStatus (index.js:163)
```

El webhook hacía `await pagoRes.json()` **sin mirar `pagoRes.ok`**. Cuando MercadoPago
contesta un error, el cuerpo tiene esta forma:

```json
{ "message": "Payment not found", "error": "not_found", "status": 404, "cause": [...] }
```

Trae un campo `status` que **no es el estado del pago sino el código HTTP**, y además es
un número. `mapPaymentStatus(404)` reventaba y se llevaba puesto el procesamiento entero.

#### Por qué esto no era "un log feo de la simulación"

**El webhook responde 200 ANTES de procesar**, para no hacer esperar a MercadoPago. Así
que cuando el procesamiento falla, **MercadoPago no reintenta nunca**. Si la API contesta
429 o 500 justo en el momento en que avisa de un pago real, ese pago no entra a
`donations`, no entra al libro, y **nadie se entera**.

Es la regla de oro del proyecto —el registro del cobro no se puede perder— rota por un
`.ok` que faltaba. Y la rama de suscripciones tenía el mismo agujero, con el agravante de
que habría escrito basura en `memberships`, empezando por un `preapproval_id` undefined.

#### Qué se cambió

`lib/mp.js` en el servicio de pagos: `consultarRecurso()` mira `res.ok`, **reintenta lo
que puede ser pasajero** (408/429/5xx y errores de red, con backoff) y no reintenta lo que
va a dar igual (401, 404). No lanza nunca: devuelve `{ok, status, datos, motivo}`, porque
un `throw` suelto vuelve al `catch` general — que es exactamente donde se pierden los
cobros en silencio.

Los dos mensajes de error distinguen los dos casos, porque son muy distintos de leer a las
tres de la mañana:

| Caso | Qué dice el log |
|---|---|
| 404 | "No existe: probablemente una simulación o un id de otra cuenta" |
| Cualquier otro | "⚠️ ESE COBRO NO QUEDÓ REGISTRADO y MercadoPago no reintenta: revisar a mano" |

#### La lección, que es la de siempre vista al revés

Las lecciones anteriores (§11.4) fueron todas sobre **verificaciones que no podían fallar**.
Esta es la contraria: **una verificación que sí falló, y encontró algo que ninguna prueba
del repo había tocado en diez meses**. El bug estaba desde el primer día; hizo falta
simular una notificación —o sea, ejercitar el camino de error— para que apareciera.

Corolario práctico: **el camino feliz no es el que hay que probar en una integración con
un tercero**. Lo que rompe no es que MercadoPago conteste distinto, es que conteste mal, y
eso solo se ve pidiéndole algo que no puede responder.

---

### 10.22 — Una renovación entraba al libro como donación, y costaba tres cosas (2026-09-02)

El 2026-09-02 se cobró **la primera cuota real del proyecto** (`payment_id`
175967372005, $5.000). El canal recurrente funcionó de punta a punta por primera vez:
la membresía quedó `active`, con `preapproval_id`, `destino_id` y —esto no había pasado
nunca— **`last_payment_id` escrito**. Lo que §10.10 dio por muerto («el canal recurrente
nunca funcionó») quedó cerrado.

Y en `/carnet` el socio leía **«ORIGEN DEL ACCESO: Donación»**.

#### Lo que parecía una etiqueta mal puesta

§10.16 lo había anotado como *«imprecisión conocida»*, con un bloqueante razonable: ligar
la membresía exigía resolver la ambigüedad de las 6 filas de prueba que comparten
`external_reference`. **Ese bloqueante ya no existía** —la suscripción nueva trae una
referencia única, y por eso el `last_payment_id` se pudo escribir— así que se fue a mirar.
No era una imprecisión. Eran **tres defectos encadenados**, y el del medio era caro.

#### La causa: el orden de dos escrituras

El webhook (`index.js`, repo aparte) hace, en este orden y en transacciones separadas:

```
1. INSERT en donations  (donation_type = 'suscripción')
2. UPDATE de memberships.last_payment_id
```

Entrar a `donations` es lo que hace **nacer** el aporte, y es deliberado: es la regla de
oro del servicio, que el registro del cobro no se pierda aunque la membresía no se pueda
resolver. Pero entonces el trigger de la donación corre primero y crea el aporte; después
corre el de la membresía, choca contra `referencia_externa UNIQUE` y su
`ON CONFLICT DO NOTHING` lo descarta.

**No es una carrera que a veces se pierde: se pierde siempre.** El único trigger que sabe
que ese cobro es una cuota es el único cuya escritura se tira.

#### Los tres defectos

| # | Qué | Consecuencia |
|---|---|---|
| 1 | `acceso_vigente()` da los 30 días de gracia solo si `origen='membresia'` | El socio mensual **no tenía gracia**. Verificado en producción: `en_gracia = f`. Si le fallaba la tarjeta el 02/10, perdía el acceso el 03/10 — exactamente lo que §10.17 decidió evitar |
| 2 | `meses_por_donacion()` convierte monto → meses **proporcionalmente** | Correcto para una donación puntual, ruinoso para un cobro mensual |
| 3 | `aportes_origen_chk` exigía que `membresia` tuviera `donation_id` NULL | Reclasificar obligaba a **borrar el rastro al cobro** para arreglar la etiqueta |

El 2 es el que asusta. `Collaborate.jsx` ofrece cuotas de $5.000 a $50.000 y
`membershipApi.js` fija `frequency: 1, frequency_type: 'months'`, así que **un** cobro
mensual otorgaba (medido contra producción, no razonado):

```
$ 5.000/mes  ->  1 mes     <- coincide, y por eso no se veía
$15.000/mes  ->  3 meses
$25.000/mes  ->  5 meses
$50.000/mes  -> 10 meses
```

Quien eligiera $50.000/mes acumulaba diez meses por cobro, y al mes siguiente diez más.
**Nadie lo sufrió porque la única suscripción viva es de $5.000, donde 1 cuota = 1 mes por
casualidad aritmética.** El defecto estaba a un clic del menú, y el caso que lo habría
mostrado es el del socio que aporta *más*.

#### Por qué se arregló en la base y no en el webhook

La tentación era que el webhook no escriba en `donations` para una renovación. Eso rompe
la regla de oro: con el match ambiguo —y hoy lo es para 6 filas— el cobro no quedaría
registrado en ningún lado. **Perder plata para ganar una etiqueta.**

La base tiene los dos datos y puede converger sin importar el orden. Cada trigger usa
solo lo que sabe:

- `aporte_desde_donacion()` sabe por `donation_type` que es una renovación. No puede
  resolver *cuál* membresía —el webhook todavía no escribió `last_payment_id`— pero sí
  puede dejar de aplicar la regla proporcional. Cierra el defecto 2 por sí solo.
- `aporte_desde_membresia()` sabe cuál membresía y cuándo es el próximo cobro. En vez de
  descartar por conflicto, **reclasifica**. Cierra el 1.

Y queda **orden-independiente**: si mañana el webhook invierte las dos escrituras, el de
membresía crea la fila ya bien clasificada y el de donación choca y no toca nada. Probado
en los dos órdenes (R8).

La regla, en una línea: **un cobro recurrente compra un mes, y solo si llega al piso.** Se
escribió `LEAST(1, meses_por_donacion(monto))` en vez de un `1` pelado para **heredar** el
piso en lugar de copiarlo — la misma decisión que §10.17 tomó para `piso_monto = NULL`.

#### Tres trampas que costaron pensar

1. **`EXCLUDED.acceso_desde` está envenenado.** Se calcula con `proximo_acceso_desde()`
   cuando la fila del conflicto **ya existe**, así que devuelve el día siguiente al acceso
   que esa misma fila otorga. Usarlo en el `DO UPDATE` habría empujado el período un mes
   al futuro y dejado al socio **sin acceso hoy**. Se conserva el `acceso_desde` existente
   y se recalcula solo el `hasta`. Es R5, y es la prueba que más costó redactar.
2. **El `WHERE` del `DO UPDATE` no es decorativo.** Solo se toca una fila que siga siendo
   `donacion` sin membresía: eso deja sobrevivir cualquier corrección de la comisión
   (§10.16) y hace la operación idempotente. Probado (R9).
3. **El piso faltaba en la rama de membresía.** Esa rama nunca lo miró, así que una
   suscripción de $1 armada contra la API —el menú arranca en $5.000, pero la API no
   valida— habilitaba el club. Se cerró de paso.

#### Cómo se verificó

`supabase/checks/renovacion-check.sql`, **12 comprobaciones**, cada negativo con su
positivo al lado. Lo importante no es que dé 12/12: es que **se corrió primero contra el
código viejo y falló donde tenía que fallar** —R2, R4, R6 y R12— y recién después con la
migración aplicada encima. Una prueba que no se vio fallar no probó nada (§11.6.3).

| Prueba | Qué distingue |
|---|---|
| R1 ←→ R2 | una donación de $15.000 **sigue** dando 3 meses; una renovación de $15.000 da 1 |
| R6 ←→ R7 | la cuota vencida hace 10 días sigue vigente en gracia; la donación no |
| R11 ←→ R12 | el CHECK sigue rechazando lo incoherente, y **ya no** rechaza la cuota con las dos referencias |
| R8 | los dos órdenes de escritura convergen |
| R9 | una corrección humana sobrevive al reintento |

Aplicado en **PostgreSQL 15** (la versión de producción, `pg15-bootstrap/`), con la
migración encima del estado ya aplicado — o sea, con convergencia probada, no solo
idempotencia. Y se corrieron los otros cinco checks contra un contenedor **con** y **sin**
la migración: el contenido de la salida es idéntico, cero regresiones.

#### El dato viejo

`supabase/data/reclasificar_renovaciones.sql` arregla la fila que ya estaba en el libro,
porque el trigger de la membresía solo corre cuando `last_payment_id` **cambia** y ahí ya
estaba escrito. Reclasifica **por regla y no por id**, con tres hechos independientes que
tienen que decir lo mismo: el aporte sigue siendo `donacion` sin membresía, su
`referencia_externa` es el `last_payment_id` de una membresía, y la donación de la que
nació dice `donation_type = 'suscripción'`.

⚠️ **`acceso_hasta` no se toca**, y la tentación de recalcularlo a `next_charge_date` era
un error: esa fecha **se mueve con cada cobro**, así que reclasificar dentro de un mes
usaría la fecha del cobro siguiente y regalaría un mes.

Antes de aplicar: backup con `tools/db.sh dump` **restaurado y verificado** en un
contenedor limpio (6 aportes / $12.241, el total conocido). El libro después: **6 aportes
/ $12.241** — nada duplicado, nada perdido. Y el socio queda cubierto hasta el
**2026-11-01** si el cobro del 02/10 falla.

#### La lección

**Un cobro que sale bien no prueba que se registró bien.** El circuito funcionó de punta a
punta, la plata entró, el total del libro estaba perfecto — y la clasificación estaba mal
de una forma que le sacaba un derecho al socio y podía regalar diez meses de acceso. Lo
único que lo delató fue **una pantalla mostrando una palabra rara**: «Donación» donde
tenía que decir cuota. Van cuatro hallazgos de esta jornada que salieron de mirar
pantallas y ninguno de un test.

Y el corolario sobre este archivo: **«imprecisión conocida» es una etiqueta peligrosa.**
Estuvo escrita quince días al lado de un bloqueante que ya se había caído, y describía
como cosmético algo que no lo era. Cuando algo se anota como imprecisión, conviene anotar
**qué habría que medir para saber si molesta** — o se vuelve una excusa con fecha.

---

### 10.23 — `/dashboard` y `/carnet` le decían cosas distintas a la misma persona (2026-09-02)

El mismo día, con la misma cuenta y a minutos de distancia:

| | `/dashboard` decía | `/carnet` decía |
|---|---|---|
| Condición | «SOCIO NIVEL BASE» | «Tu acceso está vigente» |
| Desde cuándo | «SOCIO DESDE **2025**» | «parte de la comunidad desde el **2 de septiembre de 2026**» |
| Qué es | «RANGO: MIEMBRO» | «origen del acceso: cuota social» |
| Y encima | ofrecía «ACTIVAR MEMBRESÍA» | — |

Lo encontró el dueño del proyecto mirando las dos pantallas al lado, justo después
de suscribirse. **Es el mismo patrón que `/beneficios` vs `/club`** (§12.10.16): dos
piezas que funcionan, cada una con su propia fuente de verdad, contestando la misma
pregunta con datos distintos.

#### La causa: el dashboard nunca migró a la capa de acceso

`/carnet` nació después de §10 y pregunta a `mi_acceso()` / `mi_antiguedad()`, o sea a
`aportes`. `DashboardHeader.jsx` es anterior y se armaba su propia respuesta:

```jsx
activeMembership ? 'MEMBRESÍA ACTIVA' : 'SOCIO NIVEL BASE'
Rango: activeMembership ? 'Padrino' : 'Miembro'
Socio desde: new Date(user.created_at).getFullYear()   // ¡la CUENTA!
```

Tres problemas, y el tercero era un bug:

1. **La jerarquía no existe.** No hay tabla `socios` ni `categorias_socio` — §10.1.a
   sigue abierto. «NIVEL BASE» y «RANGO: PADRINO» prometían niveles que nadie podía
   subir porque no había de dónde.

2. **«Socio desde» era el alta de la cuenta**, no el primer aporte, con un `'2025'`
   hardcodeado de fallback. Son cosas distintas y la diferencia se mide: hay **23
   cuentas y 6 aportes**.

3. **`.eq('status','active').maybeSingle()`** falla con más de una fila, y desde que
   se permite una membresía viva **por destino** eso es alcanzable. El error se tragaba
   en un `logger.error` y la pantalla le decía «SOCIO NIVEL BASE» a alguien con dos
   suscripciones activas: **el `else` que adivina**, la misma lección que `estadosPago.js`
   documenta desde el 2026-08-16.

#### Qué se hizo

La condición sale ahora de la capa de acceso, igual que en el carnet. **El dashboard
pregunta y punto** — es la regla 1 de §12.7 aplicada a otra pantalla.

⚠️ **Y la consulta a `memberships` no se reemplazó por otra: se borró.** `Dashboard.jsx`
ya las cargaba con `useUserMemberships` para las tarjetas de suscripción, así que había
**dos consultas de lo mismo** y solo una tenía el bug. Ahora la cabecera las recibe por
prop. Menos código y una fuente menos.

| Antes | Ahora | De dónde sale |
|---|---|---|
| «MEMBRESÍA ACTIVA» / «SOCIO NIVEL BASE» | «Aporte vigente» / «En tolerancia» / «Aporte vencido» / «Sin aportes» | `estadoAcceso()` |
| «Rango: Padrino / Miembro» | «Origen del aporte: Cuota social» | `aportes.origen` |
| «Socio desde 2025» (la cuenta) | «Aportando desde el 2 de septiembre de 2026» | `antiguedad_socio().socio_desde` |
| — | «Tiempo aportado: 1 mes» | `meses_aportados` |

**El CTA pasó de dos estados a tres**, y el que faltaba es el que importaba:

- con acceso → **«Ver mi carnet»**, que además conecta una pieza que existía y a la que
  no se llegaba desde acá (misma familia que §12.10.20)
- con una suscripción `pending`/`active` pero sin acceso todavía → **«Suscripción en
  curso: tu acceso se habilita en cuanto se acredite el primer cobro»**
- sin nada → «Activar membresía»

Ese caso del medio **es el que vio el dueño del proyecto**: entre que MercadoPago crea el
`preapproval` y avisa del primer cobro pasan un par de minutos, y en esa ventana la
pantalla le ofrecía suscribirse a alguien que acababa de suscribirse. El botón viejo era
`!activeMembership && "ACTIVAR MEMBRESÍA"`, así que también se lo ofrecía a quien aporta
por donación.

También se movieron a `src/lib/acceso.js` el vocabulario del estado (`etiquetaEstado`) y
el formato de fecha (`formatearFecha`), que estaba resuelto en el carnet. Ese formateo
tiene una trampa que valía centralizar: sin el `T00:00:00`, `new Date('2026-09-02')` se
lee como UTC y en Argentina muestra **el día anterior**.

#### Cómo se verificó, que es donde estuvo el trabajo

Arreglar esto una vez no alcanza: lo que hay que impedir es que **vuelva**. Y no vuelve
por un error — vuelve porque alguien agrega una pantalla y resuelve la condición a mano.
Así que hay dos defensas, y las dos se vieron fallar antes de creerles:

**1. `src/lib/fuente-unica-socio.test.js`** — lee el código de las pantallas que hablan
de la condición del socio y verifica que la pregunten a la capa de acceso. Se probó
reintroduciendo el patrón viejo: las tres aserciones fallan y vuelven a pasar al
revertir.

⚠️ **La primera versión de ese test falló por su propia documentación.** El comentario
que explica el bug **cita** el código borrado (`'Padrino'`, `user.created_at`), y un
detector que mira el archivo entero no distingue «esto lo hace» de «esto explica lo que
ya no hace». Un test así obliga a elegir entre documentar el error o tener la protección,
y las dos hacen falta. Se agregó un limpiador de comentarios — con su propio control de
que no se lleve el código por delante, porque «limpia bien» y «borra todo» se ven igual
desde afuera.

**2. `src/components/Dashboard/DashboardHeader.test.jsx`** — 7 casos que la **montan de
verdad**. Hacía falta porque **`/dashboard` no se puede verificar en un navegador**: está
detrás de sesión, y un Chrome headless cae en el login sin montar la cabecera. Se
comprobó: las dos rutas responden, y las dos muestran «Iniciar sesión». O sea que el
chequeo de navegador —el procedimiento de §B— **no cubre nada detrás de auth**, y ahí un
error de render aparecería recién en producción con el socio adentro.

Los casos: los cuatro estados, el CTA en cada uno, la suscripción pendiente, **tres
membresías a la vez** (el escenario del `maybeSingle`) y los hooks sin datos. Se
verificó que no son vacíos reintroduciendo el `created_at`: dos casos fallan.

Y en el bundle: «SOCIO NIVEL BASE» **desapareció** de todos los chunks, y las etiquetas
nuevas quedaron en el chunk **compartido** (`useContentQueries-*.js`), no en el de la
página — que es la trampa que §B documenta y por la que un deploy se puede dar por
llegado mirando el archivo equivocado.

#### Lo que queda dicho

- **`/dashboard` sigue teniendo una identidad distinta de `/carnet`, y está bien.** No se
  unificaron las pantallas: se unificó **la fuente**. El carnet es la credencial; el
  dashboard es la cuenta —movimientos, suscripciones, actividades—. Dos vistas, un solo
  dato, como quedó `/beneficios` (vidriera) y `/club` (mostrador).
- **Sacar el «rango» fue una decisión de producto, no técnica.** Hoy no hay jerarquía; si
  se implementa la fase 4 de §10.3 (`socios` + `categorias_socio`), el test de fuente
  única se actualiza **junto con la tabla, no antes**.

#### La lección

**Dos pantallas que se contradicen no producen ningún error.** Compilan, pasan el lint,
pasan los 313 tests y se ven bien por separado. Lo único que las delata es verlas juntas,
y eso solo pasa si alguien usa el sitio como lo usa una persona. Van **cinco** hallazgos
en la jornada que salieron de mirar pantallas y **ninguno** de un test.

El corolario operativo: cuando aparece una pantalla nueva que habla de algo que otra
pantalla ya explicaba, la pregunta no es «¿está bien?» sino **«¿de dónde saca el dato, y
es el mismo lugar?»**.

---

### 10.24 — El cartel rojo con JSON adentro, y el callejón sin salida (2026-09-02)

Al intentar suscribirse, el dueño del proyecto recibió esto:

```json
{"message":"invalid_request","error":"bad_request","status":400,
 "cause":[{"code":2034,"description":"guest_site_mismatch"}]}
```

El JSON crudo de MercadoPago, dentro de un cartel rojo, como único mensaje. **Y el
diagnóstico real era accionable**: ese email está registrado en **MercadoPago Uruguay**,
y una cuenta de otro país no puede pagarle a un cobrador argentino. La salida era usar
otro email — que es exactamente lo que hizo, después de averiguarlo por su cuenta.

#### Cómo llega un JSON a una pantalla

Tres pasos, ninguno mal por separado:

1. el servicio de pagos hace `res.status(400).json({ error: data })` con la respuesta
   **entera** de MercadoPago (`subscription.controller.js`);
2. `membershipApi.js` recibía un `error` que no es string y lo pasaba por
   `JSON.stringify`;
3. `Collaborate.jsx` lo mostraba como `description` del toast.

El resultado: la persona que estaba a un clic de aportar ve una estructura de datos.

#### Y encima, el callejón sin salida

Peor que el mensaje. `emailParaCheckout()` devolvía `user.email` cuando había sesión, sin
excepción:

```js
if (user?.email) return user.email;   // y no había forma de usar otro
```

Así que **el único email posible era justamente el que MercadoPago rechazaba**. Con
sesión iniciada no había ninguna salida dentro del sitio: la única opción era cerrar
sesión, o averiguar el problema por fuera y usar otra cuenta.

La regla vieja tenía un argumento bueno —el email de la sesión lo verificó Supabase, el
escrito a mano no lo verificó nadie— y estaba **mal de todas formas**, porque
`payer_email` **no es una credencial**: es *con qué cuenta de MercadoPago se paga*. Con
sesión, quién aporta ya está resuelto por otro lado.

⚠️ **Verificado antes de tocarlo, no supuesto:** en el servicio de pagos,
`external_reference` se arma con `user_id`, `kind` y `destino_id` (`lib/destino.js`), sin
mirar `payer_email`. Así que el aporte queda a nombre de la sesión aunque el pago salga
de otra cuenta — que es, además, lo que pasa cuando alguien paga con la tarjeta de un
familiar, un caso que antes tampoco se podía.

#### Qué se hizo

| | Antes | Ahora |
|---|---|---|
| El mensaje | el JSON de MercadoPago | «Ese email es de una cuenta de MercadoPago de otro país» + qué hacer |
| El email con sesión | fijo, el de la cuenta | el de la cuenta por defecto, **con la opción de usar otro** |
| El payload del error | aplastado con `JSON.stringify` | conservado en `WebhookError.payload` |

`src/lib/erroresPago.js` traduce. Dos decisiones que valen más que la lista de mensajes:

- **El reconocimiento junta TODAS las cadenas del objeto** y busca firmas ahí, en vez de
  leer rutas fijas como `payload.cause[0].description`. La forma del error de MercadoPago
  **no es un contrato nuestro**: una ruta fija se rompe en silencio el día que cambian el
  envoltorio, y «no reconocí nada» se ve igual que «no había nada».
- **El camino de descarte es el que más vale.** Para un error que no conocemos, extrae el
  texto más específico que MercadoPago haya mandado (`cause[].description`, después
  `message`) en vez de volcar la estructura. Eso cubre los errores que todavía no vimos,
  que son la mayoría. Y `bad_request` se descarta explícitamente: es la categoría HTTP, no
  lo que pasó — **cambiar un JSON incomprensible por una palabra incomprensible no es
  traducir**.

Las reglas llevan un campo `observado` que distingue lo que vimos (`guest_site_mismatch`,
2026-09-02) de lo que está por precaución. No es estilo: una regla que nunca se disparó
puede estar mal escrita y nadie se enteraría.

En la interfaz, «Pagar con otro email» va **plegado**. Que exista una salida no significa
ponerla en el camino de todos: un campo de email extra arriba del botón de aportar es
fricción para el 99% que no tiene el problema.

#### Dos cosas que encontraron los tests

**1. El test viejo defendía la regla equivocada.** `aportante.test.js` tenía
*«con sesión gana el email de la cuenta, aunque haya texto escrito»* y falló al invertir
la precedencia. Hizo exactamente su trabajo: obligó a justificar el cambio en vez de
dejarlo pasar. Se reescribió **con el motivo adentro**, para que la próxima persona que
lo lea no lo «arregle» de vuelta.

**2. La guarda contra el JSON tenía un agujero.** Era `!message.startsWith('{')`, y se le
escapaba `[{"x":1}]` — un array JSON no empieza con llave. Lo encontró el propio test
porque recorre **varias formas** de JSON en vez de una: con una sola forma habría dado
verde. Ahora la guarda parsea y pregunta si el texto **es** una estructura, en vez de
adivinarlo por el primer carácter.

Es la misma lección de §11.6.3 desde otro ángulo: un caso de prueba no prueba una regla,
prueba un caso. Si la regla dice «nunca», el test tiene que intentar varias formas de
violarla.

#### Verificado

- **9 tests** de `erroresPago.js`, incluida la firma real de MercadoPago con su forma
  exacta, la misma firma anidada en otro lugar, la misma solo dentro del `message`
  aplastado, y el «NUNCA devuelve JSON» sobre seis formas distintas.
- **6 tests** de la rama con sesión de `AvisoSesion`, y los 10 que ya tenía siguen
  pasando.
- **`/collaborate` en el navegador**, que acá sí se puede porque es pública (a diferencia
  de §10.23): renderiza los 45.912 bytes, y **sin sesión el botón nuevo no aparece** —
  que es lo correcto, y el control de que la rama vieja quedó intacta.

348 tests en total (eran 331), lint 0 errores.

#### Lo que queda

⚠️ **La regla `mismo_usuario` y las otras dos defensivas no se vieron disparar.** Están
escritas contra firmas plausibles de MercadoPago, no observadas. El día que aparezca una
de verdad, hay que confirmar el texto contra lo que llegó en vez de darlo por bueno.

---

### 10.25 — Un cartel que parecía un botón, y un mensaje que no se entendía (2026-09-02)

Dos cosas que solo aparecen **usando la pantalla con una sesión real**, las dos reportadas
por el dueño del proyecto sobre `/beneficios/30-de-descuento-...`.

#### 1. «No me deja clickear nada»

El descuento se mostraba en una caja de ancho completo, con borde, fondo y texto centrado
en negrita, **pegada justo debajo de un botón `outline` de ancho completo**. O sea:
visualmente idéntica a un botón. Textual: *«tengo que hacer click sobre % 30% de
descuento?? no me deja clickear nada, o sea como que no hay acción permitida de nada»*.

Tenía razón en las dos mitades, y la segunda es la que importa:

- **parecía un botón y no lo era** — un elemento inerte pintado como acción;
- y en el estado «tiene acceso pero no cumple los requisitos» **la única acción real es
  «Ver mi carnet»**, que quedaba compitiendo visualmente con ese cartel muerto. La
  pantalla se leía como si no hubiera nada que hacer.

El descuento **es un dato del beneficio**, igual que la vigencia y los legales. Se movió
a «Info adicional», con el mismo formato de fila que los otros datos: ícono, rótulo,
valor. La caja centrada desapareció, y con ella la ambigüedad.

⚠️ **Y es la tercera vez en la jornada que el problema es «una pieza nueva no se agregó
mirando qué había».** El comentario que quedó en ese archivo ya advertía de lo mismo para
el bloque de al lado —dos mensajes y dos botones para lo mismo, §12.10.13— y el cartel
del descuento seguía ahí, heredado, sin que nadie se preguntara qué parecía **al lado de
un botón**.

#### 2. El mensaje de requisitos, que no se entendía

Decía, palabra por palabra:

> «Te faltan 5 meses de aporte o $25.000 más acumulados para este beneficio. Tu aporte ya
> está vigente.»

Y no se entiende por **tres** motivos distintos, no uno:

| Problema | Por qué |
|---|---|
| No dice el requisito | «Te faltan 5 meses» flota: sin saber que pide 6, no hay forma de saber si falta poco o mucho |
| La buena noticia va al final | «Te falta algo… ya estás bien» se lee como contradicción. Adelante, enmarca el «pero» |
| «acumulados» | Es jerga nuestra, no de quien lee |

Encima estaba bajo el título **«¿Cómo lo obtengo?»**, así que la pregunta era *cómo* y la
respuesta hablaba de lo que falta.

Ahora contesta las tres cosas que una persona necesita —**qué pide, dónde estás, cuánto
falta**— en `mensajeRequisitos()`:

> «Ya tenés aporte vigente, pero este beneficio pide 6 meses de aporte o $30.000 en total.
> Vas por 1 mes y $5.000, así que te faltan 5 meses o $25.000.»

Y concuerda: a un mes de distancia dice *«te **falta** 1 mes o $5.000»*.

#### Lo que esto dejó claro sobre los tests

**Ese mensaje no tenía ningún test.** Ninguno. Los 25 tests de `club-reglas.ts` cubrían
*la decisión* —quién cumple y quién no, que estaba bien— y **nadie miraba lo que la
decisión le dice a la persona.** Es una frontera que este repo no tenía marcada: la
lógica estaba probada y la redacción no existía como cosa verificable.

Ahora hay 8 tests que fijan las tres propiedades y la concordancia, y se vieron fallar:
reintroduciendo el mensaje viejo, **7 de 8 se ponen en rojo**.

⚠️ Uno de ellos no comprueba el texto sino que `mensajeRequisitos` devuelva `null` cuando
la persona **sí** cumple. Sin él, todas las demás aserciones pasarían igual con una
función que siempre devuelve el mensaje, y la pantalla le diría «te falta» a alguien que
ya puede canjear.

#### La lección

**Un texto correcto no es un texto entendible, y solo uno de los dos tiene tests.** Los
dos hallazgos de esta sección salieron de una persona mirando una pantalla con su propia
sesión: uno es puramente visual (dos elementos con el mismo aspecto y distinta función) y
el otro es de redacción. Ninguno de los dos produce un error, ninguno lo encuentra un
test que no se haya escrito a propósito, y **ninguno se puede ver sin sesión** — el
chequeo de navegador de §B tampoco los alcanza (§10.23).

Van **siete** hallazgos en la jornada que salieron de mirar pantallas.

---

## 11. Cierre de la jornada del 2026-08-16

Un solo día de trabajo, de una auditoría a un circuito de aportes completo y verificado en
producción. Esta sección es el resumen ejecutable: **qué quedó funcionando, qué falta y en
qué orden conviene atacarlo.** El detalle de cada decisión está en §10.11 a §10.16.

### 11.1 — El circuito, demostrado de punta a punta

A las 23:33 UTC entró una donación real de $100 eligiendo "Equipamiento deportivo", y
recorrió los nueve pasos sin intervención:

```
sitio → destino_id → servicio de pagos → external_reference → MercadoPago
  → webhook → donations.destino_id → trigger → aportes → destinos.monto_recaudado
  → /rendicion pública
```

**Esa mañana el sistema recibía plata y no sabía para qué.**

Dato lateral que cerró un misterio: esa donación tiene `updated_at` **3 segundos** después
de `created_at`. Las viejas tenían 10 días. Confirma que aquel patrón era el aviso de
liberación de fondos de MercadoPago, no un proceso por lotes sin documentar.

### 11.2 — Estado de producción

| | |
|---|---|
| Migraciones | 9, todas aplicadas y reconstruyen la base desde cero |
| Checks de RLS | 24 (T1–T23), verificados contra producción sin dejar residuo |
| Tests | 177, 0 errores de lint (53 warnings de backlog) |
| Destinos | 3 activos, 8 en borrador |
| Libro de aportes | 5 aportes, **$7.241** |
| Gastos | 0 — la rendición todavía no se estrenó |
| Servicio de pagos | `2026-08-16.destino`, desplegado y verificado por `/health` |

### 11.3 — Lo siguiente a resolver, en orden

**1. `MP_WEBHOOK_SECRET` — seguridad, y es lo más urgente.**
`/health` dice `valida_firma_mp: false`. El webhook ahora **escribe en el libro contable**,
así que sin validar la firma cualquiera que conozca la URL puede inventar aportes en la
rendición pública. El código ya soporta la validación (`verifyMPSignature`): solo falta
generar el secreto en el panel de MercadoPago y cargarlo como variable en Render.

**2. Cargar el primer gasto real** con su comprobante, desde `/admin → Gastos`. Es lo único
que falta para demostrar el circuito de egresos como se demostró el de ingresos. Sin
gastos, `/rendicion` es una página correcta y a medias.

**3. Rotar la contraseña de la base.** Quedó en `.env.db` — fuera de git, pero en disco.

**4. Los cupos de la Novena.** Falta el número de chicos de la categoría, y **falta el
contador**: `cupos_totales` existe como columna pero nada cuenta los ocupados. Hace falta un
contador de suscripciones activas por destino, hermano de los que ya existen para aportes y
gastos.

**5. Las 6 suscripciones con `anon:suscripcion` idéntico.** Bloquean el match inequívoco
cuando llegue un cobro recurrente real: el webhook no actualiza ninguna antes que actualizar
la equivocada. Son todas de prueba (§10.10) — lo más limpio es cancelarlas en MercadoPago.

**6. `react-router-dom` por encima de `7.17.0`.** La única vulnerabilidad viva (open
redirect). Es un major sobre el router de toda la app: rama propia y verificación de todas
las rutas, no de una muestra.

**7. Sin CI, sin Sentry, sin ErrorBoundary.** Hoy cada verificación la corre una persona a
mano. Es lo que más se va a notar cuando entre alguien más al proyecto.

**8. Portar el servicio de pagos a Vercel.** Sigue valiendo por los 22 s de cold start y por
tener un solo repo con tests, pero ya sin urgencia: el servicio hace lo que tiene que hacer.

### 11.4 — Tres lecciones que se ganaron rompiendo cosas

**Una verificación que no puede fallar no verifica nada.** Pasó tres veces el mismo día, de
tres formas distintas: un check de RLS abortado por un `ERROR` previo devolvía "current
transaction is aborted" y se leía igual que si hubiera pasado; un check de navegador
apuntaba a `/colaborar`, una ruta que no existe, y el 404 tiene `<nav>`, `<footer>` y un
tamaño verosímil; y un deploy fallido dejó viva la versión anterior, que siguió
respondiendo 200. **Ninguna de las tres fallaba de forma visible.** De ahí salió
`GET /health`: sin un dato que distinga una versión de otra, un deploy roto se ve igual que
uno bueno.

**Antes de razonar sobre un sistema que no controlás, leelo.** Se dieron dos diagnósticos
seguros y los dos estaban mal. Que el `external_reference` del front "iba a romper la
primera suscripción" — falso: los controladores arman el suyo e ignoran el del body. Y que
el `package-lock.json` había roto el build — falso: Render corre Node 22 con `npm install`,
y el problema real era que **había perdido el acceso al repo**. Los dos errores fueron
conservadores y no rompieron nada, pero los dos se resolvieron leyendo: el código en un
caso, el log en el otro.

**Lo que varía por entidad va en datos; lo que es igual para todas, en código.** Sostuvo
tres decisiones que se tomaron distinto por eso: los destinos de la Fundación fueron a
`supabase/data/` y no a una migración; `categoria` en `gastos` quedó sin CHECK porque un
refugio dice "veterinaria" donde un club dice "arbitraje"; y `visibilidad_beneficiario` es
una columna y no una regla del código, porque en una fundación con menores el beneficiario
no se puede mostrar y en un refugio mostrarlo es el motor de la recaudación.

---

### 11.5 — Continuación del 2026-08-30

La jornada del 16 cerró con el libro y la rendición andando. La del 30 agregó **la capa de
acceso** (§10.17) y la **fase 1 del club de beneficios** (§12), las dos aplicadas en
producción.

Lo que cambia respecto del orden de §11.3:

- **Entra un punto nuevo y va primero:** las donaciones anónimas (§10.17). Es del mismo
  frente que el punto 1 —el servicio de pagos— así que conviene resolverlos juntos.
- **El punto 3 (rotar la contraseña) sigue abierto.** ⚠️ Este ítem decía que además de
  `.env.db` había un connection string en `~/.config/antoniana/db.url`. Se buscó el
  2026-08-30 y **ese archivo no existe**: la contraseña vive solo en `.env.db`.

#### El orden al cierre del 2026-08-30 (§10.18 y §10.19)

El circuito de ingresos quedó completo de punta a punta, **pero apoyado en datos que
todavía no existen**. Los dos primeros puntos no son de programación: hay que entrar a
Render.

| | Qué | Por qué primero |
|---|---|---|
| ~~**1**~~ | ~~Backfill de los emails~~ **✅ HECHO** — ver abajo | Recuperó 2 de 5. El plan Free no tiene Shell, así que se corrió por una ruta temporal del servicio |
| ~~**2**~~ | ~~`MP_WEBHOOK_SECRET`~~ **✅ HECHO 2026-08-31** | `valida_firma_mp: true`, `firma_modo: rechaza`. Verificado por las dos puntas: un POST sin firma y otro con firma falsa dan **401**, y una notificación real de MercadoPago dice `🔏 Firma OK` y entra. Ninguna de las dos pruebas sola alcanzaba: "rechaza lo malo" y "rechaza todo" se ven igual desde afuera |
| **3** | Rotar la contraseña de la base | Solo en `.env.db`. No toca producción: el webhook usa la service_role key, no esta contraseña |
| ~~**4**~~ | ~~Bajar la fricción de la sesión en `/collaborate`~~ **✅ HECHO** — §10.20 | Era lo único que ataca la causa. Ahora la página lo explica, ofrece iniciar sesión sin perder el aporte, y acepta el email de quien no quiere cuenta |
| **5** | El primer gasto real, `react-router-dom`, CI/Sentry | Sin cambios respecto de §11.3 |

**Sobre el 2 conviene ser explícito**, porque el ROADMAP lo tuvo mal descrito un día
entero: §11.3 decía que "solo falta generar el secreto y cargarlo en Render". No era solo
eso. La implementación firmaba `${ts}.${rawBody}`, que **no es lo que firma MercadoPago**:
cargar el secreto habría rechazado el 100% de los webhooks, o sea que "activar la
seguridad" habría significado **dejar de registrar la plata que entra**, sin ningún
síntoma visible. De ahí que la activación sea en dos pasos, con un modo `observa` que
calcula y loguea sin rechazar.

#### El backfill, corrido (2026-08-30)

Recuperó **2 emails de 5 donaciones**, sin fallas. Lo que dejó a la vista importa más
que el número:

| Donación | Email | Qué habilita |
|---|---|---|
| $1.916 | recuperado | **Nada**: ya estaba atribuida, y el reclamo solo ofrece donaciones anónimas |
| $5.000 | recuperado | **Un mes** — es exactamente una cuota. Pero **no existe ninguna cuenta con ese email** |
| $75, $150, $100 | sin dato | MercadoPago no informó nada utilizable. Irrecuperables |

Verificado en producción: se escribieron 2 emails y ninguno es el placeholder, la
atribución no cambió, **nadie ganó acceso**, el libro sigue en $7.241 y `reclamado_en`
sigue vacío.

**O sea que el club sigue vacío, y ahora se sabe por qué.** De cinco donaciones reales,
tres no dejaron ningún rastro y una sola quedó atribuida a una persona. El reclamo
(§10.19) funciona pero solo repara hacia atrás, y hacia atrás había poco que reparar.
**Lo que queda es el punto 4: que se done con sesión iniciada.** Eso dejó de ser una
mejora de UX para ser el único camino por el que el club se puede llenar.

Dato accionable, y no es técnico: **hay alguien que donó $5.000 y no tiene cuenta**. Si
la Fundación puede identificar ese contacto, invitarlo a registrarse con ese mismo email
le da su mes de beneficios sin que nadie toque nada.

⚠️ **La ruta temporal (`/admin/backfill-payer-email`) queda apagada borrando
`BACKFILL_TOKEN` en Render.** `GET /health` lo confirma: `backfill_habilitado` tiene que
decir `false`. El campo informa si la ruta **está montada**, no si la variable existe.

---

#### Una lección más, cara

**Antes de escribir la primera migración, `git fetch` y conectarse a la base.** El
2026-08-30 se trabajó tres commits sobre una copia local **20 commits atrasada**: se
"descubrió" como no documentado un módulo que estaba commiteado, versionado y pusheado
desde el 16, se lo re-baselinó al pedo, y se llegó a describir como *peso muerto* una
vista que en realidad se había borrado **como fix de seguridad** (§C). Nada de eso llegó a
producción, pero se perdió media jornada y el relato quedó mal escrito hasta que el
`git push` lo delató.

Corolario para el repo: **`tools/db.sh` es el camino** para tocar la base, no un
connection string armado a mano. Acota el permiso, se audita, y la contraseña no queda en
el historial del shell.

---

### 11.6 — Cierre de la jornada del 2026-08-30/31

Segunda jornada larga seguida. La del 16 construyó el circuito de ingresos; esta lo
**cerró**: ahora el dinero que entra se puede atribuir a una persona, esa persona puede
reclamar lo suyo, y el endpoint que registra la plata dejó de aceptar eventos de cualquiera
—y de perder cobros en silencio—.

El detalle de cada cosa está en §10.18 a §10.21. Esta sección es el resumen ejecutable.

#### 11.6.1 — Qué se construyó, en orden

| | Qué | Dónde quedó |
|---|---|---|
| 1 | **Firma de webhooks** — estaba escrita, sin commitear, y **calculaba mal el HMAC** | `lib/firma.js` + activación en dos pasos |
| 2 | **`donations.payer_email`** — el casillero que faltaba | Migración `20260830170000` |
| 3 | **Captura del email** en el webhook, con descarte del placeholder | `lib/pagador.js` |
| 4 | **Reclamo de aportes anónimos** — la persona reclama, no el sistema vincula | Migración `20260830180000` + `/carnet` |
| 5 | **Backfill de los emails históricos** + ruta temporal para correrlo | `lib/backfill.js` + `/admin/backfill-payer-email` |
| 6 | **Aviso de sesión en `/collaborate`** | `AvisoSesion.jsx` + `lib/aportante.js` |
| 7 | **Consulta defensiva a la API de MercadoPago** | `lib/mp.js` |

#### 11.6.2 — Las cinco afirmaciones propias que resultaron falsas

Esto es lo más valioso de la jornada, y por eso va antes que los logros. **Cinco cosas que
este repo daba por ciertas y no lo eran.** Ninguna se descubrió razonando: todas
aparecieron al leer el código o al mirar los datos.

**1. "El vínculo del `user_id` se pierde entre el sitio y el webhook" (§10.17).** Falso.
Los cuatro eslabones lo mandan y lo leen bien. Se dona **sin sesión iniciada**, que es otro
problema y no tiene arreglo técnico. El "camino 1" que el ROADMAP listaba como pendiente
**ya estaba implementado**.

**2. "Un aporte anónimo es inatribuible por construcción" (§10.17).** Falso. Faltaba la
columna; el dato existía. MercadoPago conserva el `payer.email` de cada pago, incluidos los
históricos. Es la **segunda vez** (después de §10.15) que un casillero ausente se lee como
un dato inexistente.

**3. "Para la firma solo falta generar el secreto y cargarlo en Render" (§11.3).** Falso, y
era el más peligroso. La implementación firmaba `${ts}.${rawBody}`, que no es lo que firma
MercadoPago: cargar el secreto habría **rechazado el 100% de los webhooks**. "Activar la
seguridad" habría significado dejar de registrar la plata que entra.

**4. La verificación en navegador mandaba comprobar `/nosotros` y `/actividades` (§B).**
Ninguna de las dos existe — las rutas de `App.jsx` están en inglés. Los dos chequeos
pegaban en el 404 y aprobaban. **El mismo archivo ya advertía este error por `/colaborar`,
y la lista de al lado seguía mal.**

**5. El webhook nunca miró si la consulta a MercadoPago había salido bien (§10.21).** El
cuerpo de error trae `status` como código HTTP y en número; `mapPaymentStatus(404)`
reventaba. Como el webhook responde 200 antes de procesar, MercadoPago no reintenta:
**cada fallo transitorio de su API era un cobro perdido en silencio**, desde el primer día.

#### 11.6.3 — Y tres verificaciones que no verificaban nada

Van aparte porque el patrón es distinto: acá el código estaba bien y **la prueba estaba
rota**, que es peor, porque da confianza falsa.

| Qué parecía | Qué pasaba |
|---|---|
| `SET LOCAL request.jwt.claims` simulaba una sesión | No es donde mira `auth.uid()` en esta base (usa `request.jwt.claim.sub`). Con el uid en NULL, "un tercero no ve el email" pasaba **sin que hubiera ningún tercero** |
| El "tercero" del check era un usuario cualquiera | Era el **admin**, que ve todo por diseño. Al arreglar lo anterior, el check falló — correctamente |
| `/health` informaba si el backfill estaba habilitado | Informaba `Boolean(BACKFILL_TOKEN)`: con un token corto decía `true` mientras la ruta estaba apagada. **El mismo error que este archivo ya había corregido en `valida_firma_mp`** |

**La regla que sale de las tres, y ya es la cuarta vez que se escribe:** una verificación
tiene que poder fallar, y hay que hacerla fallar una vez para creerle. Un control positivo
al lado del negativo no es redundancia, es lo que distingue "pasó" de "no midió nada".

#### 11.6.4 — Cómo quedó verificada la firma, que es el patrón a copiar

Ninguna de las dos pruebas por separado alcanzaba, porque **"rechaza lo malo" y "rechaza
todo" se ven idénticos desde afuera** — y la segunda habría cortado los ingresos sin
síntoma visible:

```
🔏 Firma INVÁLIDA (falta el header x-signature) · modo=rechaza    ← POST sin firma      → 401
🔏 Firma INVÁLIDA (el hash no coincide) · esperado=0935f1… recibido=deadbeef…  ← firma falsa → 401
🔏 Firma OK                                                       ← notificación real  → 200
```

Y la activación fue en dos pasos a propósito (`observa` → `rechaza`), para que el tráfico
real confirmara que la firma cerraba **antes** de que un error pudiera costar plata.

#### 11.6.5 — Lo que dijeron los datos

El backfill recuperó **2 emails de 5 donaciones**. El desglose importa más que el número:

| Donación | Resultado | Qué habilita |
|---|---|---|
| $1.916 | email recuperado | **Nada**: ya estaba atribuida |
| $5.000 | email recuperado | **Un mes** — pero **no existe cuenta con ese email** |
| $75, $150, $100 | sin dato en MercadoPago | Irrecuperables |

**El club sigue vacío, y ahora se sabe exactamente por qué.** De cinco donaciones reales,
tres no dejaron ningún rastro y una sola quedó atribuida a una persona. Reclamar repara
hacia atrás, y hacia atrás había muy poco que reparar.

Por eso el aviso de sesión en `/collaborate` dejó de ser una mejora cosmética: **es el
único camino por el que el club se puede llenar.**

#### 11.6.6 — Estado de producción al 2026-08-31

| | |
|---|---|
| Migraciones | 13 al cierre de esa jornada (este renglón decía 11: se contaron mal), **14** desde §11.7. Todas aplican desde cero y convergen al reaplicarse |
| Checks SQL | 24 de RLS + 14 de acceso + 8 de `payer_email` + 17 de reclamo |
| Tests | **216** en el sitio (0 errores de lint, 53 warnings de backlog) + **95** en el servicio de pagos |
| Servicio de pagos | `2026-08-31.consulta-mp` · `firma_modo: rechaza` · `backfill_habilitado: false` |
| Libro de aportes | 5 aportes, **$7.241** · 0 personas con acceso vigente |
| Donaciones con email | 2 de 5 |
| Ruta temporal de backfill | **Cerrada** (verificada: 404) |

#### 11.6.7 — Lo siguiente, en orden

**1. Rotar la contraseña de la base.** Es el único pendiente de seguridad que queda. Está
en `.env.db`, y en ningún otro lado — ver la corrección en §11.7.2.

**2. Cargar el primer gasto real** con su comprobante, desde `/admin → Gastos`. Es lo único
que falta para estrenar `/rendicion`, que hoy es una página correcta y a medias.

**3. `react-router-dom` por encima de `7.17.0`.** La única vulnerabilidad viva (open
redirect). Major sobre el router de toda la app: rama propia y verificación de **todas** las
rutas —las de verdad, ver §B— no de una muestra.

**4. Fase 2 del club de beneficios** (§12.8): `club_comercios`, `club_canjes`, las 3 Edge
Functions y el panel `/comercio`. Piloto decidido: DigitalMatch.

**5. Los cupos de la Novena.** `cupos_totales` existe y nada cuenta los ocupados.

**6. Sin CI, sin Sentry, sin ErrorBoundary.** Hoy cada verificación la corre una persona a
mano. Es lo que más se va a notar cuando entre alguien más al proyecto.

**Y una acción que no es técnica:** hay alguien que donó **$5.000 y no tiene cuenta**. Si la
Fundación puede identificar ese contacto, invitarlo a registrarse con **ese mismo email** le
otorga su mes de beneficios sin que nadie toque nada.

#### 11.6.8 — Cuatro cosas del entorno que costaron tiempo

- **El plan de Render es Free**: no hay Shell ni One-Off Jobs. Cualquier tarea que necesite
  correr *dentro* del servicio necesita una ruta temporal (ver §10.18) o bajar credenciales
  de producción a una máquina, que es lo que conviene evitar.
- **En PowerShell, `curl` no es curl**: es un alias de `Invoke-WebRequest`, ignora `-X` y
  `-H`, y frena con una advertencia de seguridad. Usar `curl.exe`.
- **Los archivos del repo son CRLF**, y `cat -A` no siempre lo muestra. Editarlos con regex
  sobre `\n` no matchea: normalizar a LF, editar, y volver a CRLF al escribir.
- **`String.replace(a, b)` interpreta `$&` y `` $` `` dentro de `b`.** Un texto de reemplazo
  con un `$` seguido de backtick insertó el archivo entero dentro de sí mismo. Usar una
  **función** de reemplazo cuando el texto pueda contener `$`.

---

### 11.7 — Cierre de la jornada del club (2026-08-30)

Esta jornada no tocó el dinero: construyó **la fase 2 del club entera** (§12), que es el
módulo donde el beneficio deja de ser un cupón público y pasa a ser un canje trazable.

**Aplicado en producción el 2026-08-31**: la migración corrió con `tools/db.sh apply` y las
tres Edge Functions están desplegadas. Lo que falta no es código: son los datos del comercio
piloto y un canje real. Ver §11.7.8.

#### 11.7.1 — Qué se construyó

| | Qué | Dónde |
|---|---|---|
| 1 | **Esquema del club**: `club_config`, `club_comercios`, `club_sucursales`, `club_comercio_usuarios`, `club_beneficios`, `club_canjes` + `is_comercio_member()` + `mis_comercios()` + reaper | Migración `20260830190000` |
| 2 | **Check con controles positivos**, 15 pruebas | `supabase/checks/club-check.sql` |
| 3 | **Tres Edge Functions**: generar, confirmar, anular | `supabase/functions/club-*` |
| 4 | **Reglas puras testeables** del club (huso, ventanas, ahorro) | `_shared/club-reglas.ts` + 17 tests |
| 5 | **UI del socio**: catálogo `/club` + pantalla de canje con QR, código y Realtime | `src/pages/club/`, `src/components/Club/` |
| 6 | **UI del mostrador**: `/comercio`, escanear o tipear | `src/pages/club/ComercioPanel.jsx` |
| 7 | **Reglas de presentación** del club | `src/lib/club.js` + 19 tests |

**Una dependencia nueva:** `qrcode.react@4.2.0`, cero deps transitivas. El escáner NO usa
librería: es `BarcodeDetector`, que ya viene en el navegador. En iOS no existe y el botón
directamente no aparece — queda el campo de tipear, que §12.3 pide igual. `npm audit` sigue
en 2 moderate, las dos de `react-router`.

#### 11.7.2 — Las cuatro afirmaciones propias que resultaron falsas

Van antes que los logros por el mismo motivo que en §11.6.2. Con estas son **nueve** en tres
jornadas. Ninguna se descubrió razonando: todas aparecieron al mirar el código o los datos.

**1. "La contraseña de la base está en `.env.db` y en `~/.config/antoniana/db.url`".**
Falso. Ese archivo **no existe** — se buscó en todo el perfil. Lo nombraban cuatro lugares
de este ROADMAP y **ningún script**. Peor: el texto sugería un radio de impacto que no
existe. El webhook usa `SUPABASE_SERVICE_ROLE_KEY` y el sitio la anon key, así que rotar
**no puede cortar el circuito de ingresos**. El riesgo real era el inverso: que la rotación
se postergara por miedo a romper los pagos.

**2. "Las suscripciones se crean y nunca se actualizan, y el destino no llega" (§Estado).**
Falso desde la jornada del 30/31, que cerró las dos cosas sin actualizar este párrafo. El
webhook actualiza `memberships`, escribe `last_payment_id` y manda `destino_id`. El ROADMAP
listaba como pendiente algo ya hecho. **Lo que sí queda es otra cosa:** ese código nunca
corrió contra un cobro real (0 de 17 membresías tienen `last_payment_id`).

**3. "$7.141 cuadrando con `donations`".** Eran 4 donaciones; hoy son 5 y **$7.241**.

**4. "Migraciones: 11".** Eran **13**. Se contaron mal, y el renglón estaba en la tabla de
"estado de producción", que es justo donde no hay que estimar.

**Y un quinto hallazgo, de otra naturaleza: §12 se autorreferenciaba como §11.** La sección
se redactó como §11, se renumeró a §12 y **las referencias internas quedaron sin cambiar**:
seis lugares decían `11.1.a`, `11.6`, `11.7`. Además `§11.7` se citaba dos veces **sin
existir**, y `CLAUDE.md` apuntaba a un `§11.8` inexistente. Corregido todo. Ninguna de esas
citas estaba en código, así que no aplicó la regla de "no renumerar".

#### 11.7.3 — Dos bugs que encontraron los tests, no el razonamiento

**El alfabeto del código incluía la `L`.** La clase de caracteres `[2-9A-HJ-NP-Z]` parece
correcta y **abarca la L**, que el generador de 31 caracteres no produce. Estaba repetida en
cinco archivos, incluido el `CHECK` de la migración y las dos Edge Functions: un código con
`L` habría pasado la validación de formato para después no encontrarse nunca. Lo destapó un
test que afirmaba `normalizarCodigo('O0I1L') === ''`.

**El huso horario iba a romper el límite diario.** Postgres corre en UTC y Argentina es
UTC-3: calculando "un canje por día" en UTC, el día se reiniciaba a las **21:00 hora
local**. La misma persona podía canjear a las 20:30 y a las 21:30 y llevarse dos veces el
mismo beneficio. Se agregó `zona_horaria` a `club_config` y todo lo que depende del
calendario se calcula ahí. El test se hizo fallar a propósito pasándole `'UTC'` para
confirmar que mide algo.

#### 11.7.4 — Tres decisiones sobre ambigüedades de §12

Están acá porque el ROADMAP no las resolvía y alguien las va a querer discutir.

**1. El TTL de 5 minutos y la confirmación diferida de 2 h se contradicen.** §12.3 pide las
dos: que el código venza rápido para que se genere en la caja, y que el cajero rescate
códigos viejos cuando el local se quedó sin señal. Si el rescate está siempre disponible, el
contador es decorativo. **Resolución:** el vencimiento es real y el socio lo ve, pero
confirmar un vencido sigue siendo posible dentro de la ventana. Queda registrado **sin
agregar ninguna columna**: un canje con `confirmado_en > expira_en` fue un rescate tardío.

**2. La red de contención se generalizó.** §12.5 pedía un índice único parcial para el caso
"uno por día". Se agregó `club_canjes.clave_limite`, que la Edge Function calcula desde la
ventana, y el mismo índice cubre las cuatro. **Solo cubre `limite_por_persona = 1`**: con
límite mayor hay que contar, y ese conteo no tiene red debajo. Está escrito en la migración.

**3. `club_beneficios.estado` nace en `borrador`, no activo.** §12.3 dice que la redacción
la controla la entidad junto al comercio porque ahí se generan los conflictos de mostrador.
Un beneficio que se publica solo al crearse contradice eso.

#### 11.7.5 — Qué quedó verificado y qué NO

| Verificado | Cómo |
|---|---|
| Las 14 migraciones aplican desde cero **y convergen al reaplicarse** | Postgres 17 en Docker, dos pasadas |
| `club_canjes` no se puede escribir desde el browser | `club-check.sql` T1/T2, con T12 (service_role **sí** escribe) al lado |
| Los comercios no se ven los canjes entre sí | T6/T7, con el positivo al lado del negativo |
| La red del límite ataja el duplicado **y no bloquea de más** | T9/T10 |
| `/club` renderiza de verdad | Chrome headless: el 404 mide 25.900 bytes y `/club` 25.646 |
| 252 tests al cierre de esa jornada (hoy 265), lint 0 errores, build | `npm test` / `npm run lint` / `npm run build` |

**Sobre el runtime de las Edge Functions.** `npx supabase start` falla en esta máquina
(documentado en `supabase/checks/README.md`), así que **localmente** no se pueden ejecutar.
Al desplegarlas se probó contra producción lo que se podía sin datos (§11.7.8): que
arranquen, que resuelvan los imports de `_shared/`, que tengan las env vars y que rechacen
lo que no trae sesión.

✅ **Y el camino feliz autenticado quedó probado el 2026-09-02** con un canje real de punta
a punta (§11.7.12): elegibilidad, embeds de PostgREST y el `UPDATE` condicional de la
confirmación. Ya no queda nada del runtime sin ejercitar. Aun así, la lógica que **decide**
algo sigue viviendo en `club-reglas.ts` y no en el `index.ts`: es lo único testeable sin
desplegar.

#### 11.7.6 — El club, medido

El dato que §12.8 no dice y conviene tener a mano antes de seguir construyendo:

| | |
|---|---|
| Beneficios cargados | **1** (el de DigitalMatch) |
| Beneficios con `requiere_acceso` | **0** |
| Personas con acceso vigente | **0** de 23 |
| Tablas `club_*` en producción | **0** |

**El club está vacío de los dos lados.** Que no haya socios ya se sabía; que tampoco haya
catálogo, y que **ninguna fila ejercite la capa de acceso** de la fase 1, no estaba escrito.
Toda la maquinaria del 2026-08-30 —carnet, filtro, estados— no se ejecuta hoy contra ningún
dato real: si estuviera rota, nadie se enteraría.

Por eso lo barato y lo que destraba no es programar la fase 3: es **cargar beneficios
reales y decidir cuáles se bloquean**. Es tarea de la entidad, igual que el primer gasto.

#### 11.7.7 — Lo siguiente, en orden

1. ~~**Desplegar**~~ **✅ HECHO 2026-08-31** (§11.7.8). Falta **cargar DigitalMatch y hacer
   un canje real**: ahí se ejercita el camino feliz, que es lo único que quedó sin probar.
2. **La anulación no tiene UI.** La Edge Function está y `clubApi.anularCanje()` también,
   pero no hay botón en `/comercio`: se dejó afuera para no agregar una acción destructiva
   sin poder ejercitarla contra un canje confirmado real.
3. **El catálogo sigue partido en dos.** `/beneficios` lee `benefits` (viejo, 1 fila) y
   `/club` lee `club_beneficios` (nuevo, vacío). §12.4 decidió deprecar el primero migrando
   su contenido, no romperlo. Mientras las dos existan: **lo que se canjea vive en `/club`**.
4. **Rotar la contraseña**, el gasto real, `react-router-dom`. Sin cambios.
5. **Fase 3 del club** (§12.8): el reporte para el comercio, que es lo que hace que renueve.

#### 11.7.8 — El despliegue a producción (2026-08-31)

**Antes de tocar producción se cubrió el riesgo que este archivo ya advertía y que la
validación original no cubría: producción corre PostgreSQL 15 y todo se había validado en
la imagen 17.** Se levantó `public.ecr.aws/supabase/postgres:15.8.1.094` —la misma versión
mayor y menor que la base real— y ahí corrieron las 14 migraciones y el check completo.

⚠️ **La imagen de PG15 no arranca sola**, a diferencia de la de 17: su entrypoint espera un
`/docker-entrypoint-initdb.d/init-scripts/99-roles.sql` que la imagen no trae (normalmente
lo inyecta `supabase start`). Hay que montarlo, y **tiene que tolerar roles ausentes**:
`supabase_functions_admin` no existe en esa versión y un `ALTER USER` a secas tumba el
contenedor. Con eso resuelto: **14 migraciones aplicadas, club-check en 17 PASA / 0 FALLA,
y converge al reaplicarse**, igual que en 17.

La única migración que falla en PG15 pelado es `20260719140000_comision_docs_storage.sql`,
y **está bien**: en 17 emitía un `NOTICE` y en 15 da error porque `storage.buckets` tiene
otras columnas. Es la misma excepción que ya documenta §B — en producción esa tabla es real.

#### Qué se hizo

| | Cómo |
|---|---|
| Migración | `bash tools/db.sh apply supabase/migrations/20260830190000_club_fase2_canjes.sql` — transacción única, `ON_ERROR_STOP` |
| Funciones | `npx supabase functions deploy` **una por una y por nombre**, para no redeployar `create-user` ni las otras existentes |

#### Cómo quedó verificado contra la base real

| Qué | Resultado |
|---|---|
| Las 6 tablas `club_*` existen | ✅ |
| RLS activa en las 6 | ✅ `relrowsecurity = t` en todas |
| **`club_canjes` no tiene policy de escritura** | ✅ el único comando con policy es `SELECT` — la ausencia de INSERT/UPDATE/DELETE **es** la protección |
| `club_config` sembrada | ✅ 5 claves, incluida `zona_horaria` |
| Las 4 funciones nuevas | ✅ `is_comercio_member`, `mis_comercios`, `club_nuevo_codigo`, `club_expirar_canjes` |

Y las Edge Functions, con **el control al lado del negativo**, que es la regla de §11.6.3:

```
POST sin JWT  → 401   en las tres
POST a una función inventada → 404   ← el control: sin esto, el 401 no probaría
                                        que las funciones estén desplegadas
POST con la anon key como JWT → {"error":"Sesión inválida"}
```

**La tercera línea es la que más dice.** Un 401 del gateway solo prueba que Supabase
protege la ruta. Esa respuesta, en cambio, sale **del código propio**: significa que la
función bootea, que los imports de `_shared/cors.ts`, `_shared/club-db.ts` y
`_shared/club-reglas.ts` resuelven en el bundle, que las tres env vars están inyectadas —si
faltara una, `contextoDesde()` diría "Configuración del servidor incompleta"— y que el
manejo de errores devuelve JSON con la forma esperada.

#### Lo que quedaba sin probar — cerrado el 2026-09-02

El **camino feliz autenticado** era la mitad que faltaba. Se ejercitó con un canje real
(§11.7.12) y no queda nada del runtime sin correr contra producción.

#### 11.7.9 — El hueco que encontró una pregunta, no una prueba (2026-09-01)

Al explicar cómo se da de alta un comercio quedó a la vista que **no había
flujo**: en `src/` todas las referencias a las tablas `club_*` eran lecturas, el
panel admin tenía 13 secciones y ninguna del club, y el alta eran cuatro filas
de SQL cargadas por alguien con acceso a la base.

**No fue una decisión de recorte: nadie lo escribió.** §12.3 sí diseñó el flujo
—postulación, aprobación, magic link, alta del dispositivo del local— pero
§12.8 nunca lo puso en una fase. La lista de la fase 2 dice «las 3 Edge
Functions + panel `/comercio`», y ese panel es el mostrador.

**Por qué importa más de lo que parece.** §12.7 define el éxito del módulo como
«copiar migraciones + Edge Functions a otro proyecto y que funcione». Con el
alta por SQL, lo que viaja es el código y no la operación: cada comercio nuevo
—en este proyecto o en el próximo— pasa por un desarrollador. Es exactamente lo
que §12.9 quería evitar al decidir entrar «de a uno y digitalizando».

Se construyó la sección **«Club de beneficios»** en `/admin`. Vive en
`src/components/Club/`, no en `src/components/Admin/`, para que la carpeta del
club viaje completa: el único punto de integración con el anfitrión es una línea
en `AdminPanel.jsx`.

⚠️ **Lo que NO se pudo verificar al escribirla:** la pantalla renderizada.
`/admin` exige sesión de admin y desde acá no hay forma de autenticarse. Se
verificó que la ruta siguiera respondiendo (redirige a login, no 404), que el
código entrara al bundle —el chunk pasó de 125 a 155 kB— y que los validadores
pasaran sus 13 tests. ✅ **Se usó por primera vez el 2026-09-02** para activar y
archivar el beneficio de prueba, y funcionó.

**La lección, que no es sobre el club:** este hueco no lo encontró un test ni
una revisión de código. Lo encontró alguien preguntando *«¿y cómo sería el
flujo?»*. Un plan puede estar completo en lo que enumera y tener un agujero en
lo que da por obvio.

---

#### 11.7.10 — «Tiene el texto» no es «se ve bien» (2026-09-01)

`/club` se verificó como manda §B: navegador de verdad, ruta real, y **contenido** en vez
de tamaño. Pasó. En un teléfono, el título salía **a una palabra por renglón**.

La causa era de layout, no de datos: la fila era `flex flex-wrap` con la etiqueta y el
botón en `shrink-0`. En una pantalla angosta el botón se queda con el ancho que necesita y
el bloque de texto —que tiene `min-w-0`— se comprime hasta desaparecer. Se arregló
apilando en mobile (`flex-col` → `sm:flex-row`), con el mismo tratamiento en el aviso de
«hay N beneficios para socios».

**Dos cosas que salen de acá y valen más que el arreglo:**

1. **La regla de §B estaba incompleta.** Decía «confirmá contenido, no tamaño», y eso ataca
   el 404 disfrazado. No ataca una página que tiene todas las cadenas correctas y es
   ilegible. Hay que abrirla y mirarla, y en ancho de teléfono.

2. **Cuidado con las capturas headless.** Al sacar el screenshot a 390 px de ancho, la
   página aparecía cortada a la derecha… y **la Home, que lleva meses en producción,
   aparecía cortada igual**. Chrome headless maqueta a un viewport más ancho del que
   fotografía. Sin ese control —una página que se sabe sana— se habría «arreglado» un
   desborde que no existe. Es el mismo patrón de siempre: una medición sin control no
   distingue el defecto del instrumento.

---

#### 11.7.11 — El primer uso real encontró lo que ninguna prueba buscaba (2026-09-01)

Con el comercio cargado y el beneficio de prueba activo, el primer intento de generar un
canje desde un teléfono devolvió **«Sesión inválida»**.

No era un bug del canje: era que **`/club` ofrecía «Usar ahora» a un visitante sin sesión**.
El botón se decidía solo con `requiere_acceso`, y un beneficio abierto —justamente el de
prueba, que existe para no exigir aporte— le aparecía canjeable a cualquiera. La Edge
Function hacía lo correcto y rechazaba; el problema era haberlo ofrecido.

Es **exactamente lo que §12.3 prohíbe** en sus casos borde: *«nunca dejarlo generar un
código que va a fallar»*. Estaba escrito, y aun así se implementó mal, porque la condición
se pensó como «¿tiene acceso?» cuando en realidad son dos preguntas: **¿hay sesión?** y
después **¿tiene acceso?**. Sin sesión no se puede canjear NADA, ni siquiera un beneficio
abierto: el canje se emite a nombre de una persona.

**Y el error era un callejón sin salida.** Ofrecía «Probar de nuevo», que ante una sesión
que no existe falla para siempre. De ahí que `ErrorHttp` ahora lleve un `codigo` que viaja
al front: con `codigo_error: 'sesion'` la pantalla ofrece **iniciar sesión** en vez de
reintentar. Un mensaje de error sirve si la persona puede hacer algo con él.

**La lección: ninguna de las verificaciones podía encontrar esto.** Los tests cubren
lógica pura; el check SQL cubre las RLS; el chequeo en navegador cubre que la página
renderice. El hueco estaba en el estado «visitante anónimo mirando un beneficio abierto»,
que es una combinación que solo aparece usando la cosa. **Lo encontró el primer uso real,
como el hueco del ABM lo encontró una pregunta.**

**Y el primer arreglo estuvo mal por exceso.** Se agregó el aviso de sesión arriba **sin
sacar el botón de cada fila**, así que la pantalla quedó con cuatro CTA y tres decían lo
mismo: una pared de botones rojos que tapaba los beneficios, que es lo único que la
página tiene para mostrar. La regla que quedó: **la acción va UNA vez, arriba; por ítem
solo hay botón cuando la acción está realmente disponible**, y si no, una etiqueta callada
que dice por qué («Para socios»). Arreglar agregando, sin sacar lo que sobra, es media
corrección.

---

#### 11.7.12 — El circuito, demostrado con plata de mentira y gente de verdad (2026-09-02)

**La fase 2 quedó probada de punta a punta.** Un socio generó, un comercio confirmó, y la
pantalla del socio cambió sola. Esto es lo que quedó en la base, que es la única prueba que
vale:

| | |
|---|---|
| Código | `9GUBT2` |
| Socio | `gonzaloandresramos@gmail.com` |
| Cajero | `info@evolucionantoniana.com` (operador de DigitalMatch Global) |
| Generado → confirmado | **53 segundos** |
| `confirmado_en > expira_en` | `false` — no fue rescate tardío |
| `monto_operacion` | 100.000 |
| `ahorro` | **NULL** |

**Ese `ahorro` en NULL no es un bug: es la decisión de `calcularAhorro()` funcionando.** El
beneficio es de tipo `regalo`, y cuánto se ahorró depende de qué se llevó la persona. Un 0
ahí habría mentido en el reporte que después se le muestra al comercio para que renueve
(12.6). **NULL no es cero: es «no calculable».**

Con esto se ejercitó lo único que quedaba sin correr: elegibilidad, embeds de PostgREST en
la consulta del canje, y el `UPDATE` condicional de la confirmación.

#### 11.7.13 — El bug que la prueba NO encontró, y que habría aparecido con el segundo socio

Revisando el estado al cierre apareció una pregunta simple: **el reaper existe, ¿alguien lo
llama?** No. `club_expirar_canjes()` solo aparecía en `club-check.sql`. En producción, nada.

**Por qué eso es grave y no cosmético.** El índice único del límite por persona cubre
`estado IN ('pendiente','confirmado')`. Un canje vencido sigue diciendo `'pendiente'` hasta
que alguien lo expire. Con un beneficio de `limite_por_persona = 1` —como el **real** de
DigitalMatch, que es `1 / total`— alcanza con que una persona genere un código y no lo use
para que quede **sin ese beneficio de por vida**. Y el mensaje de error le diría «ya usaste
este beneficio», cuando no lo usó.

Reproducido en PostgreSQL 15 antes de afirmarlo, con las dos puntas en la misma corrida:

```
SIN reaper  → unique_violation: el socio queda bloqueado para siempre
CON reaper  → expira 1 canje y puede volver a generar
```

**El arreglo:** `club-generar-canje` llama al reaper antes de mirar los límites. El sistema
se auto-repara sin depender de un scheduler que el plan de Supabase no tiene. Si esa llamada
falla, se loguea y se sigue: cortar ahí sería negarle el canje a alguien que sí puede.

**Tres cosas que este bug enseña, y ninguna es sobre reapers:**

1. **Lo escribió el mismo que lo rompió.** El comentario de la migración decía, palabra por
   palabra, *«sin esto, un canje abandonado queda 'pendiente' para siempre y bloquea el
   índice: la persona no podría volver a generar ese beneficio nunca más»*. Se escribió la
   función, se documentó el peligro, y **no se conectó a nada**. Saber cuál es el riesgo no
   es lo mismo que haberlo cubierto.

2. **La prueba exitosa lo ocultó.** El canje de §11.7.12 se confirmó en 53 segundos, así que
   nunca venció nada. Un circuito que funciona a la primera **no prueba lo que pasa cuando
   algo se abandona** — y §12.3 dice que abandonar es el caso normal, no la excepción.

3. **Los checks tampoco podían verlo.** `club-check.sql` T11 prueba que el reaper funciona…
   llamándolo explícitamente. Probaba la función, no que estuviera conectada. Es el mismo
   patrón de §11.6.3 en otra forma: la prueba pasaba y no medía lo que importaba.

---

---


### 12.1 — Estado actual (relevado 2026-08-30, resuelto en código el 2026-08-30)

> ✅ **Los tres ítems de abajo están resueltos, en producción, y demostrados.** Las 6 tablas
> `club_*` con RLS y las tres Edge Functions se aplicaron el 2026-08-31 (§11.7.8), y el
> 2026-09-02 se hizo **el primer canje real de punta a punta** con DigitalMatch Global
> (§11.7.12). Lo que describen estos tres puntos —cupón estático, comercio inexistente como
> actor, cero trazabilidad— **ya no es cierto**. Se dejan como registro del punto de
> partida.

- [ ] **12.1.a — Hoy no hay un club: hay un listado de cupones.**
  `benefits.codigo` y `benefits.codigo_descuento` (`baseline:378-379`) son texto
  estático, uno solo por beneficio, igual para todo el mundo.
  `BenefitDetailPage.jsx:231` lo renderiza en pantalla, y `/beneficios/:slug`
  (`App.jsx:101`) es **ruta pública sin `ProtectedRoute`**: el código se lo lleva
  cualquiera que entre al sitio. Un código estático y público no se puede limitar,
  ni vencer, ni contar, ni atribuir a una persona.

- [ ] **12.1.b — El comercio no existe como actor del sistema.**
  `partners` (`baseline:507`) tiene nombre, logo, descripción, contacto y estado. **No
  tiene login, ni sucursales, ni ubicación, ni usuarios, ni forma de reportar nada.**
  Un partner es hoy un logo en la Home, no una contraparte operativa.

- [ ] **12.1.c — No hay registro de que un beneficio se haya usado.**
  No existe tabla de canjes ni equivalente. Consecuencia práctica: la entidad no puede
  decirle al comercio cuánta gente le mandó, que es exactamente el argumento que hace
  falta para renovar el acuerdo al año siguiente.

---
