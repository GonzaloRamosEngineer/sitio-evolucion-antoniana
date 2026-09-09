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

**Tercera incorporación, 2026-09-08.** `§10` completa —el modelo de dominio aporte → acceso,
~810 líneas— se movió acá después de **revalidarla entera contra producción con SQL de solo
lectura**, no contra el archivo. Está al final. Dos de sus pendientes declarados resultaron
ya resueltos y se corrigieron in situ antes de archivarla; los tres que seguían vivos son de
carga de datos y subieron a «Por dónde arrancar». **El criterio del corte: una sección se
archiva cuando lo que afirma se comprobó contra la base, no cuando dice de sí misma que está
cerrada.**

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

### 10.26 — El rechazo del canje, ejercitado por fin (2026-09-05)

§12.11 se construyó el 2026-09-02 y dejó una rama sin correr nunca contra la base: **«tiene
acceso vigente pero no llega a los requisitos»**. No se podía probar porque no había un
solo socio con aporte vigente. Con la primera cuota real cobrada, el caso existió.

#### Lo que se encontró ANTES de dispararlo

Preparando la prueba se fue a leer **qué iba a contestar la función**, y el mensaje estaba
mal:

> «Este beneficio pide **5 meses** de aporte o **25.000** de aporte acumulado.»

Es la palabra «pide» seguida de **lo que falta**. El beneficio pide **6 meses o $30.000**,
así que le anunciaba a la persona un umbral que no existe — y sin el `$`. Ese texto es el
que la pantalla muestra cuando la función rechaza, así que **la primera persona en tocar
el botón iba a leer un requisito falso.**

⚠️ **Y el test asertaba `/4 meses/` y `/20.000/`**, que son justamente los números del
hueco: le daba la razón al defecto. **Tercera vez en dos días** que pasa lo mismo
(§10.24 con `faltaParaBeneficio`, §10.25 con el `$`). El patrón, ya identificado:

> **Asertar un número suelto en vez de la frase.** `/4 meses/` pasa esté donde esté,
> **incluso donde significa lo contrario**. La aserción tiene que fijar la frase, porque
> lo que se está probando es lo que una persona va a leer.

Se corrigió con la **misma redacción** que `mensajeRequisitos()` del front, y hay un test
que compara la frase completa contra esa: si divergen, la persona leería una cosa antes de
apretar y otra después. Seis tests se ponen en rojo con el mensaje viejo.

#### Cómo se ejercitó sin arriesgar nada

La tentación era bajar el umbral desde el ABM —que existe y está cableado— y apretar el
botón. **Habría sido caro:** DigitalMatch tiene `limite_por_persona = 1`, ventana `total`,
así que eso consumía el único canje de esa persona *para siempre*, sobre un descuento real
de hasta $30.000.

No hizo falta, y el motivo es una propiedad del diseño: **el rechazo ocurre en el paso 2,
antes de cualquier escritura.** Llamar a la función con el umbral real no puede consumir
nada porque nunca llega al insert. Así que se llamó directo, con la sesión del socio, sin
tocar ni un dato.

De paso quedó medido que **el header `apikey` no hace falta** —alcanza `Authorization`—,
así que el snippet documentado en §12.11.1 no lleva ninguna clave adentro.

#### El resultado

```
HTTP 403 {
  error: 'Este beneficio pide 6 meses de aporte o $30.000 en total. Vas por 1 mes
          y $5.000, así que te faltan 5 meses o $25.000.',
  codigo_error: 'requisitos', faltan_meses: 5, falta_monto: 25000
}
```

Los cuatro campos exactos. **El circuito del club está cerrado de punta a punta**: la
vidriera anuncia, la función decide, y las dos dicen la misma frase.

#### Y en la misma consola, un hallazgo que nadie buscaba

En la captura aparecía, en rojo, una línea que no tenía nada que ver:

```
GET https://grainy-gradients.vercel.app/noise.svg  404 (Not Found)
```

`Dashboard.jsx` pedía una textura a **un dominio que no controlamos**, en cada carga del
panel. Resto del scaffold original. Y la URL **devuelve 404**, así que la textura nunca se
vio: era una petición a un tercero a cambio de nada.

**Por qué importa más que un 404.** Es una pantalla **con sesión iniciada** pidiéndole un
archivo a un dominio ajeno. Un asset de terceros no es gratis aunque sea decorativo: quien
lo sirve ve la visita, y el día que devuelva algo distinto de un 404 lo estaríamos pintando
adentro de nuestra página. Se borró — y **no cambia nada en pantalla**, porque nunca cargó.

Quedó `src/lib/assets-externos.test.js`, que rechaza cualquier asset con URL absoluta a
otro dominio. Dos cosas que costaron:

1. **La primera versión marcó ocho páginas**, todas por su `<link rel="canonical">`, que
   es SEO y no un asset. Un detector que marca de más es un detector que alguien apaga:
   ahora los `<link>` se miran tag por tag y solo cuentan los `rel` que hacen bajar un
   archivo.
2. **Falló por su propia documentación**, porque el comentario que explica el hallazgo
   cita la línea borrada. Es **exactamente** lo que le había pasado a
   `fuente-unica-socio.test.js` tres días antes. Cuando el mismo tropiezo aparece dos
   veces la solución deja de ser local: el limpiador de comentarios —con su control de que
   no se lleve el código puesto— vive ahora en `src/lib/sin-comentarios.testutil.js`.

#### La lección

**Un `404` de un asset no rompe nada.** React renderiza, el build pasa, el lint pasa y los
364 tests pasan. Solo se ve en la consola de alguien que estaba mirando otra cosa — y por
eso estuvo ahí desde el scaffold original.

Van **ocho** hallazgos en estas jornadas que salieron de mirar pantallas, y este es el
primero que salió de mirar la **consola**. Vale agregarlo al procedimiento: cuando se
verifica una pantalla en el navegador, **mirar también la pestaña de red**, no solo el DOM.

---

### 10.27 — El cierre de §10: cuatro piezas, y tres premisas que no se sostenían (2026-09-05)

§10 era la sección más larga del ROADMAP y llevaba abierta desde el 2026-08-16. Lo que
quedaba de ella no era código a medias: eran **tres fases que nunca se empezaron** y una
lista de decisiones de negocio sin tomar.

Antes de escribir nada se releyó §10 **contra la base**, que es la regla 1. Tres de sus
premisas no se sostenían, y las tres habrían llevado a construir mal:

**1. «El precio de las actividades es la mitad del valor de ser socio» (§10.1.d).**
Hay 12 actividades y **ninguna menciona arancel, precio ni cuota** en su descripción. Son
todas gratuitas de hecho. La fase 2, «acá la cuota empieza a valer algo», no podía valer
nada mientras la oferta propia fuera gratis. Se construyó igual —con la decisión tomada
explícitamente— pero por otro motivo: el día que exista la primera actividad arancelada,
el esquema tiene que estar, porque si no ese día se cobra por afuera. Al aplicarlo, las
doce quedan en `precio_general = 0` y **en la pantalla no cambia nada**, que es lo honesto.

**2. §10.2 diseñó `socios` + `categorias_socio` con `otorga_voto`.** Es el vocabulario de
una asociación civil. Pero `entidad.tipo = 'fundacion'`, y **una fundación no tiene
asociados, ni asamblea, ni voto**: tiene consejo de administración y beneficiarios.
Escribir `socios` habría metido el vocabulario del cliente 2 dentro del cliente 1 —
exactamente lo que §10.9 mandó no hacer. El repo ya lo sabía sin haberlo escrito:
`entidad.vocabulario.aportante` decía 'padrino' desde el 2026-08-16, **y no lo consumía
nadie**. Una configuración declarada y sin consumidor parece existir y no gobierna nada.

**3. §10.1.c nombra a `registrations` y a educación como el mismo problema.** No lo son.
`registrations` tiene 5 filas y **0 invitados**: ahí no hay nada que reconciliar.
`education_preinscriptions` tiene **160 filas con 156 emails distintos** (feb–mar 2026), y
**solo 4** coinciden con una cuenta. Contra 23 usuarios y 1 con acceso vigente.

Ese último número reordenó la prioridad de la sección entera: **la base de contactos más
grande de la Fundación es siete veces el sistema, y el sistema la ve como nadie.**

#### Qué se construyó

| Migración | Qué resuelve |
|---|---|
| `20260905120000_membresia_institucional` | `miembros` + `categorias_miembro` + `reglas_membresia`. La figura, con el comportamiento en datos |
| `20260905130000_reclamo_universal` | `fuentes_reclamables` + `huellas_reclamables()` + `reclamar_huellas()` |
| `20260905140000_actividades_precio` | `precio_general` / `precio_socio` + `precio_actividad_para()` |
| `20260905150000_padrinazgos_y_reporte` | `padrinazgos` + cupos + `hitos_destino` + `reporte_destino()` |

**La tabla se llama `miembros` y no `socios`, y en ningún dato aparece la palabra
"socio".** Lo que varía por entidad quedó como parámetro: `modo_alta`
(automática ↔ por aprobación de comisión), `otorga_voto`, `renumera_al_reingresar`
(§10.4 pregunta 4, que llevaba tres semanas sin responder) y `suspension_corta_acceso`.

Ese último es el más delicado y merece su renglón: **¿suspender a alguien le quita los
beneficios, o solo la condición institucional?** Las dos respuestas son legítimas y
ninguna es «la del software». El default es `false` —el conservador: quitarle los
beneficios a alguien es una segunda decisión, no un efecto lateral de la primera— y el
check ejercita **las dos puntas**, porque una opción que no hace nada y una que hace de
más se ven idénticas desde afuera.

**El reclamo universal es un mecanismo, no un parche por tabla.** §10.19 había resuelto el
caso de `donations` con una función dedicada; escribir ahora `reclamar_preinscripciones()`,
y mañana otra, es tres veces la misma lógica de seguridad, y la tercera copia es donde se
olvida el `email_verificado`. La lista de qué se puede reclamar es un DATO, con **lista
negra**: `donations`, `memberships`, `aportes`, `miembros`, `users` y `club_canjes` se
rechazan al registrarse, porque vincularlas no es reconocer a alguien sino **otorgarle
privilegios**. `reclamar_huellas()` invoca a `reclamar_donaciones()` en vez de copiarla.

**El apadrinamiento cumple las dos reglas de §10.8 por estructura, no por disciplina.** En
ese archivo **no existe ninguna columna donde guardar la identidad de un beneficiario**:
no hay nombre, ni edad, ni foto, ni DNI, ni diagnóstico, ni FK a una tabla de chicos —
porque esa tabla tampoco existe. No se puede filtrar lo que no se puede guardar. Y
`hitos_destino` **exige `cantidad` cuando el destino es anonimizado**: obliga a que el
hito sea un agregado («24 entrenamientos») en vez de un relato sobre un chico. Es un
empujón del esquema; los filtros de texto se evaden.

Como el sistema no guarda ningún dato personal de menores, la consulta legal pendiente
pasa a ser sobre **qué se publica**, no sobre qué se guarda. Es más chica, pero sigue
siendo previa a publicar un padrinable con fotos.

#### Lo que encontró el check, y que ningún test iba a encontrar

`membresia-check.sql`: **36 assertions** — 32 al escribirlo, más 4 que llegaron con la
categoría por defecto y el resumen para la comisión. Controles positivos apareados con
cada negativo.
Se lo hizo fallar **tres veces a propósito** antes de creerle (regla 2), y la tercera es
la que valió:

- **Sabotaje 1** — abrir `miembros` a `authenticated`: T1 y T2 gritaron. ✅
- **Sabotaje 2** — sacar el trigger que exige agregado en los hitos: T15 gritó. ✅
- **Sabotaje 3** — hacer que `email_verificado()` devolviera `true` siempre: **el check
  siguió pasando.**

T10 decía «sin email verificado no se reclama nada» y pasaba **porque a Beto no se le
había dejado ninguna huella**: pasaba por vacío, no por verificación. Una prueba que no
puede fallar es decorado. Se le agregó una preinscripción a Beto y ahora el sabotaje 3
hace fallar tres assertions.

⚠️ **Y armando el escenario apareció algo preexistente en `rls-check.sql`.** Saca sus
uuids con `\gset` sobre `public.users`; en una base recién migrada no hay usuarios, la
variable queda sin definir, y **7 sentencias mueren con `syntax error at or near ":"` sin
llegar a ejecutar su assertion** — se llevan puestas T14, T15 y T16, que son justamente
las tres de `aportes`, *la tabla que otorga privilegios*. No se nota porque el archivo ya
emite errores esperados y siete más pasan por paisaje. Contra producción sí corren, pero
contra producción el README manda correr **solo la otra mitad**. Queda anotado en
`supabase/checks/README.md`; `membresia-check.sql` arma su escenario entero por eso.

⚠️ **Segunda trampa del mismo escenario:** `UPDATE public.users SET role =
'comision_directiva'` **no hace nada** si quien lo ejecuta no es admin —
`trg_prevent_privilege_escalation` revierte la columna en silencio, sin error. El síntoma
fue un control positivo fallando con «solo la comisión puede», que se lee como un bug del
módulo cuando lo roto es el andamio. Es el modo de falla de §11.4, y el README de la
carpeta ya lo tenía anotado con un ⚠️ que nadie relacionó.

#### Verificación

Las **21 migraciones aplican desde cero en PostgreSQL 15** (la versión de producción, no
17) y **convergen al reaplicarse**. Los seis checks previos dan **0 FALLA antes y
después** —se comparó contra un contenedor sin las migraciones nuevas, porque «no rompí
nada» sin línea de base es una afirmación sin respaldo—. `npm test`: **387 en 32
archivos** (eran 368). Lint 0 errores, build limpio.

⚠️ **`acceso_vigente()` se redefinió**, y eso es lo más riesgoso de la jornada: la
consumen el club, el carnet y el dashboard. Se tocó la existente en vez de crear una
segunda porque **una segunda fuente de verdad sobre el acceso es el bug de §10.23**, y no
se repite a propósito. Con el default (`suspension_corta_acceso = false`) el
comportamiento es idéntico al anterior, y el check lo ejercita en las dos direcciones.

#### Aplicado en producción, y lo que apareció al aplicarlo

Las cuatro migraciones se aplicaron el mismo 2026-09-05, y **al ir a cargar la categoría
única apareció que la decisión no se podía cumplir**: el trigger de alta automática
insertaba con `categoria_id` en NULL, así que la categoría sembrada **no la iba a tener
nadie** y `descuento_actividades()` seguiría devolviendo 0 para todo el mundo. La tabla de
categorías habría quedado como un ABM que no gobierna nada — *el mismo modo de falla que
`entidad.vocabulario`, dos veces en la misma jornada*.

Se corrigió dentro de `20260905120000` en vez de apilar una quinta migración, porque **no
estaba aplicada en ningún lado todavía**: se agregó `categorias_miembro.por_defecto` con
índice único parcial (una sola), `categoria_miembro_por_defecto()`, y la asignación en el
trigger, en `solicitar_membresia()` y en el backfill.

**El resultado en producción, verificado después de aplicar:**

| | |
|---|---|
| Padrón | **1 miembro, N°1, alta 2026-09-02**, con categoría — el backfill tomó `min(acceso_desde)` |
| `acceso_vigente()` | **sigue devolviendo `true`** para el socio vigente ← el riesgo de la jornada |
| Actividades | 12 en `precio_general = 0`: en pantalla **no cambió nada**, como se esperaba |
| Lo que verá la comisión | «Preinscripción a Educación: **156 sin cuenta de 160**» |

⚠️ **Y el backup destapó una trampa que estaba desde siempre.** `tools/db.sh` imprime «un
backup sin restaurar no es un backup», así que se lo restauró en Docker antes de tocar
producción. **No restaura tal cual:** el cliente es `pg_dump` **17** y producción es
PostgreSQL **15**, así que el dump trae en la línea 13 un `SET transaction_timeout = 0;`
que 15 no conoce. Con `psql` a secas es un ERROR que se saltea y todo lo demás entra bien
—restauró 23 usuarios, 6 aportes, 11 destinos, 160 preinscripciones—, pero **con
`-v ON_ERROR_STOP=1` aborta en la línea 13**, que es exactamente el flag que uno usa el
día que necesita el backup de verdad. Queda anotado en §A del ROADMAP.

#### Las dos moralejas de la jornada

**1. Una configuración declarada y sin consumidor no gobierna nada.**
`entidad.vocabulario` existía hacía tres semanas con la respuesta correcta adentro
—'padrino', no 'socio'— y mientras nadie la leyera, §10.2 seguía diseñando la tabla
equivocada. Y volvió a pasar el mismo día con `categorias_miembro`: la tabla, el ABM y la
función de descuento estaban, y sin `por_defecto` nadie iba a caer en ninguna categoría.
**No alcanza con escribir la decisión en el lugar correcto: hasta que algo la lee, es un
comentario.** Cuando agregues una opción de configuración, agregá en el mismo commit quién
la lee.

**2. Probá el backup antes de necesitarlo.** El script lo venía pidiendo por escrito y
nadie lo había hecho; se hizo una vez y apareció que no restaura con el flag con el que
uno restaura. Es el mismo principio que «una verificación tiene que poder fallar»,
aplicado a la red de seguridad en lugar de a las pruebas.

---

### 14.0 — Cómo apareció la tesis del producto (2026-09-06)

No salió de una sesión de estrategia. Salió de una pregunta operativa sobre qué
cargar primero, y de que el dueño del proyecto contara una historia que el modelo
no sabía representar.

#### La cadena, porque el orden importa

**1. Una recomendación mía que los datos desmintieron.** Al cerrar §10 dejé como
próximo paso «publicar las 8 campañas en borrador». Al ir a mirar apareció que
`/rendicion` dice en público **«Rendido $0 · 0% de lo recaudado ya tiene rendición
publicada»**: cero gastos cargados. Publicar 8 campañas habría multiplicado por
nueve una promesa cuya respuesta es $0 — exactamente lo que §10.8 advirtió que no
había que hacer. **El prerequisito no era publicar: era cargar un gasto.**

**2. La pregunta del dueño que destrabó todo.** «*¿No puedo poner algo que voy a
gastar sin antes tener algo recaudado?*» La respuesta era que `gastos` no es un
presupuesto sino un libro de egresos —registra lo que ya pasó— pero la pregunta
que venía atrás era mejor: qué hacer con los gastos históricos, y si un **recibo**
de escribano vale lo mismo que una factura.

**3. La historia que rompió el modelo.** Entre 2022 y 2024 la Fundación trabajó
casi en exclusiva con una institución deportiva. Al cerrarse el convenio, esa
institución dejó **$1.000.000 con destino estipulado**: dejar cubierto el
ordenamiento contable y legal. Hoy quedan $95.083,30 —dicho «~$180.000» hasta el
2026-09-08, que era el saldo de la CUENTA y no el del fondo—. Todo respaldado con
documentación certificada ante escribano, firmada por autoridades de las dos
instituciones, y todo en MercadoPago.

Eso resolvió de golpe el problema del punto 1: **no había que reconstruir años de
ingresos, había que cargar un aporte.** Y de paso hizo que el libro y el saldo real
de la cuenta puedan coincidir, que es lo más creíble que una rendición puede
mostrar y lo más difícil de fingir.

**4. Y expuso que el modelo sabía expresar una sola de las dos categorías de
ingreso.** Plata de libre disponibilidad —la cuota social— y plata restringida
—subsidio, convenio, donación con cargo, legado—. `destinos` cubría bien la
primera. La segunda no entraba: un destino con `admite_puntual` y
`admite_recurrente` en `false` estaba **prohibido por un CHECK**, y sacarlo del
checkout obligaba a ponerlo en `estado = 'cerrado'`, donde la policy de `gastos`
deja de publicarlo. **Se podía elegir entre no ofrecerlo o poder rendirlo, y hacen
falta las dos.**

#### Tres cosas que se corrigieron sobre la marcha

⚠️ **Un argumento mío que era falso.** Sostuve que leer el saldo de MercadoPago no
servía porque «el millón entró por transferencia bancaria y ese saldo no lo
refleja». **Eso lo asumí, y era mentira**: está todo en MercadoPago. La conclusión
—no cablear la página pública al saldo— se sostuvo igual, pero por tres razones en
vez de cinco, y la más fuerte no era esa: **el endpoint de balance está deprecado**
y el reporte «Dinero disponible» se dio de baja en marzo de 2022. Se verificó
contra la documentación de MercadoPago en vez de contestar de memoria.

⚠️ **Una "mejora" que era un riesgo.** Al extraer el mecanismo de comprobantes a
`src/lib/comprobantes.js` reescribí `nombreSeguro` para quitar acentos con un rango
de diacríticos combinantes. Quedaban **caracteres crudos dentro de una expresión
regular**, a cambio de nada: `\w` ya los descarta. Se volvió al que venía
funcionando desde agosto. No reescribir lo que anda para que se vea mejor.

⚠️ **Un bloque JSX metido dentro de un ternario.** El botón de adjuntar quedó en la
rama `else` de un ternario, que admite una sola expresión. `npm run build` lo
atajó. Es el recordatorio de que el gate existe por algo.

#### Qué quedó construido

`20260906120000_fondos_restringidos.sql`:

- **Se relajó `destinos_admite_algo_chk`.** Su comentario original decía que un
  destino que no admite ninguna forma de aporte «es un error de carga, no una
  configuración válida». Era cierto para los tres casos que existían entonces; un
  fondo de convenio lo desmiente. La restricción se removió **con el motivo
  escrito al lado**, no en silencio.
- **Comprobante en `aportes`.** La rendición se apoya en dos columnas y hasta ese
  día **la de ingresos no se podía documentar** — se veía crudo con un millón
  respaldado por escritura y sin dónde adjuntarla. Mismo bucket privado y mismo
  patrón que `gastos`: cero policies de storage nuevas.
- **`tipo_comprobante` + `comprobante_numero` en las dos tablas.** Sin declarar el
  tipo, todo es «un comprobante» y se asume que todo son facturas; cuando alguien
  descubre que aquel gasto tenía un recibo simple, **lo que se rompe no es el
  recibo: es haberlo dejado implícito**. Los valores son genéricos a propósito —
  la letra A/B/C es normativa argentina y va en `comprobante_numero`.
- **`reporte_destino()` devuelve `aportes_documentados` / `aportes_totales` y
  `abierto_a_aportes`.** El público puede ver que el ingreso está respaldado sin
  que se publique el convenio ni quién lo firmó.

`fondos-check.sql`: 10 assertions, saboteado dos veces —reponiendo el CHECK viejo y
abriendo `aportes` a `anon`— y las dos veces gritó.

#### La tesis, que es lo que quedó de todo esto

Está en `ROADMAP.md` §14. En corto: **el diferencial no es el club de beneficios
sino rendir un fondo restringido, y sobre todo que rendirlo salga barato.**

La evidencia de la segunda mitad es incómoda y propia: la maquinaria de rendición
está desplegada desde el 2026-08-16 y **al 2026-09-06 tiene cero gastos cargados**.
No falló el código. Si acá pasaron tres semanas sin que nadie cargara nada, en un
cliente donde la tesorera tiene otras cuarenta cosas no va a pasar nunca.

De ahí que §14.2 —importar desde el extracto— sea el ítem con más valor de todo lo
que queda. Y de ahí también que se haya **decidido NO construir** §14.1
(comprometido vs disponible): en el caso que lo motiva no se sabe cuánto cuesta el
trámite, así que no hay número que cargar. Construirlo ahora sería repetir lo de
§10.1.d, donde se hizo `precio_socio` sobre 12 actividades gratuitas y hoy no mueve
nada.

---

### 14.1 — El extracto real corrigió el relato, y construyó el importador (2026-09-06)

El dueño del proyecto subió dos documentos: el **resumen de cuenta de MercadoPago
de octubre de 2024** y el **Acta de Finalización del Convenio** con firmas
certificadas ante escribano. Cambiaron tres cosas.

#### 1. Una descripción mía que los documentos desmintieron

Yo había sembrado el destino diciendo que la institución deportiva «dejó
$1.000.000» y que la Fundación «recibió un aporte único». **Los documentos dicen
otra cosa.**

La Fundación **administraba los ingresos del Centro Juventud Antoniana en sus
propias cuentas** —cuotas sociales, polideportivo, indumentaria— desde 2021. Al
rescindirse el convenio, el Acta dispuso un **resguardo de $1.000.000**: se
devolvió el resto y se retuvo esa suma. **Nadie transfirió un millón.**

Y se verifica al peso:

| Evidencia | Dato |
|---|---|
| Acta: «la cuenta de MercadoPago dispone de $1.933.533,58» | Extracto **08-10**: saldo $1.933.533,58 |
| Acta: «resguardo de $1.000.000» | **10-10**: transferencia a CJA −$937.776,27, impuesto −$5.626,66 → **$1.000.000,00 exacto** |
| Acta: «saldar el descubierto Santander por $53.989,20» | **15-10**: transferencia −$53.989,20 |

La transferencia se calculó para que, **después del impuesto**, quedara el millón
redondo.

**Por qué la corrección no es cosmética:** si la rendición dice «recibimos un
aporte de $1.000.000», quien vaya al extracto **no va a encontrar ningún ingreso
de $1.000.000** — y se vería mal justo ante quien la revisa en serio. El término
correcto es el que usa el Acta: *resguardo de fondos*.

La corrección tuvo que ir como `UPDATE` acotado a la firma del texto viejo, porque
la semilla ya estaba aplicada y el `WHERE NOT EXISTS` no toca una fila existente
(`CLAUDE.md`). Se probó en las dos direcciones: corrige el texto equivocado y **no
pisa** una edición hecha a mano desde el ABM.

#### 2. Una pregunta del dueño que era mejor que la respuesta

Notó que además de los gastos que se deciden están «los famosos **gastos hormiga**:
montos pequeños y gran cantidad, que en volumen terminan costando».

Tenía razón, y el extracto trae el detalle que lo resuelve: **el impuesto comparte
el id de operación con la transferencia que lo generó.**

```
10-10-2024  Transferencia enviada Centro Juventud Antoniana  90165423466  -937.776,27
10-10-2024  Impuesto por extracción                          90165423466    -5.626,66
```

De ahí salieron dos decisiones:

- **La clave de idempotencia lleva el monto**: `mp:<id>:<monto>`. Con solo el id,
  el impuesto se rechazaría como duplicado y **no entraría nunca** — un gasto que
  desaparece en silencio, peor que uno duplicado porque nadie lo busca. Se
  comprobó saboteándolo: la clave sin monto hace fallar el caso.
- **La rendición pública agrupa por categoría.** Los impuestos van a
  «Comisiones e impuestos» y se muestran sumados en un renglón. Sin eso, cuarenta
  líneas de $120 tapan el honorario de $53.989 que es lo que la gente quiere ver.
  El detalle sigue estando: cerrado, no escondido.

#### 3. El dato que volvió urgente a §14.2

Tienen extractos **de octubre de 2024 hasta hoy: 23 meses**. Eso no se carga de a
uno, y §14 ya había establecido que el diferencial no es la página de rendición
sino que cargar los datos salga barato. Así que se construyó el importador el
mismo día.

Al ir a hacerlo apareció el hueco que faltaba: **`gastos` no tenía clave de
idempotencia.** `aportes.referencia_externa` existía desde §10.11 por otro motivo
—que un reintento del webhook no duplicara un cobro— y los gastos nunca la
necesitaron porque se cargaban a mano, de a uno. Con una importación eso se da
vuelta: reimportar un período solapado duplica todos los gastos y **nada avisa**.

#### Dos errores míos que atraparon las pruebas

⚠️ **`Number('')` es 0, no NaN.** Una celda de importe vacía se convertía en un
gasto de $0 en silencio. Lo atrapó un test que yo mismo había escrito esperando
`null` — el tipo de test que parece trivial hasta que corre.

⚠️ **Usé `attempt` donde iba `listResult`.** `attempt` envuelve algo que *lanza*
(una Edge Function, un `fetch`), y el cliente de Supabase no lanza: devuelve
`{ data, error }`. Pasárselo habría dado `{ data: { data, error }, error: null }`
— **un error de la base llegando como éxito**, con el contador de filas
importadas siempre en 0. Se vio leyendo la firma del helper antes de confiar en
ella.

#### Lo que quedó

`20260906130000_importar_movimientos.sql`, `src/lib/importarMovimientos.js` (puro,
**19 tests** con los datos reales del extracto), `src/api/importarApi.js` y
`/admin → Importar movimientos`.

`fondos-check.sql` pasó de 10 a **15 assertions**, con dos sabotajes que
confirmaron que las dos decisiones centrales son estructurales: sin el UNIQUE se
duplica, y sin el monto en la clave el impuesto no entra.

#### Una corrección posterior, el mismo día

⚠️ **Yo había listado el impuesto de $5.626,66 como gasto del fondo. No lo es.**
Ese impuesto y la transferencia de $937.776,27 son **anteriores** a que el fondo
existiera: el resguardo se define como lo que queda **después** de los dos, y por
eso el saldo cae en $1.000.000,00 exacto. Cargarlos como gasto del fondo sería
contarlos dos veces y dejar la rendición corta por ese monto.

Los gastos del fondo en octubre son cuatro y suman **$78.748,70**, y el saldo
cierra al peso contra el extracto: `1.000.000 − 78.748,70 = 921.251,30`.

Se descubrió al rehacer la aritmética con la calculadora en vez de repetir lo
escrito el día anterior. **Una cuenta que ya se hizo una vez no está verificada:
está recordada.**

Y quedó aclarado que Torrado y Moncorvo son **dos escribanos distintos con dos
certificaciones distintas** —no un desajuste entre concepto y comprobante, como
yo había sospechado—. Como no hubo movimientos en efectivo, cada erogación tiene
su fila en el extracto y el libro puede cuadrar contra él al peso.

#### La moraleja

**El documento del cliente corrige la descripción del sistema, no al revés.** Yo
había escrito el relato del fondo con lo que entendí de una conversación, y sonaba
razonable. El extracto y el acta dijeron otra cosa —y cuadraron entre sí al peso—.
Cuando exista un documento, leerlo antes de describir lo que representa.

---

### 14.2 — Los tres formatos, comparados de verdad (2026-09-06)

§14.3 había quedado con una pregunta bloqueante —¿MercadoPago exporta CSV?— y una
hipótesis. El dueño subió el mismo período en `.pdf`, `.csv` y `.xlsx`. **La
pregunta se respondió y la hipótesis era falsa.**

#### Lo que dijeron los archivos

**El XLSX no aporta nada.** Sus celdas son `inlineStr` con los valores **como
texto**, en el mismo formato argentino que el CSV: mismas 5 columnas, mismas 27
filas, **0 diferencias**. Traería una librería de parseo a cambio de nada.

**⚠️ Mi hipótesis sobre las comisiones era equivocada, y conviene que quede
escrito.** Yo había sostenido que el CSV probablemente abriría bruto / comisión /
neto, y que ahí estaría la categoría de gastos hormiga que el PDF esconde. **No es
así:** la columna se llama literalmente `TRANSACTION_NET_AMOUNT` y no hay ninguna
de comisión. La comisión de la pasarela **no es visible en el resumen de cuenta en
ningún formato**; para rendirla hay que buscar otro reporte, que es trabajo
distinto y sin explorar.

**Lo bueno fue otra cosa: el CSV trae los totales declarados.** El archivo tiene
dos bloques —`INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE` arriba, los
movimientos abajo—, así que **las tres verificaciones de §14.3 salen del CSV solo**
y el PDF no hace falta ni para el checksum. Contra el archivo real: 27 movimientos,
**0 desvíos** en el saldo corrido, y entradas y salidas **al centavo**.

**⚠️ Y los encabezados vienen en INGLÉS**, aunque el PDF del mismo resumen esté en
castellano. Los patrones del parser eran solo castellanos y **no reconocían ni la
descripción ni el id** — y el id es el que da la idempotencia. Habría cargado los
27 movimientos **sin referencia**, y reimportar habría duplicado todo. Se descubrió
corriendo el parser contra el archivo real en vez de suponer que andaba.

#### La deuda del `referencia_externa`, saldada sin exponerla

El saldo inicial se había cargado sin referencia porque **el ABM no tenía el
campo** — yo había recomendado un valor que la pantalla no permitía ingresar.

**No se arregló agregando un campo de texto.** `referencia_externa` es la clave de
idempotencia: alguien podría escribir `mp:90165423466:-5626.66` copiando un id del
extracto, sin mala intención, y **ese movimiento no se podría importar nunca más**
— la base lo rechazaría como duplicado de una fila que no tiene nada que ver.

En su lugar hay un tilde «es el saldo inicial de este destino» que la deriva del
slug. Nunca puede chocar con una `mp:*`, y el UNIQUE garantiza gratis **un solo
saldo inicial por destino**. Hay un test que fija que la referencia no puede tomar
forma de importación aunque el formulario traiga basura.

#### Un test que se rompió sin que el cambio lo tocara

Agregar el tilde hizo fallar **dos tests de `AportesAdmin` que no tenían nada que
ver**: el `Checkbox` de Radix usa `ResizeObserver` al montarse y jsdom no lo trae.
El error sale en un stack de `react-dom` que **no menciona al componente
culpable**. Se resolvió con un stub en `src/test/setup.js`, que es donde
corresponde — cualquier componente de Radix que mida su contenido lo iba a
necesitar tarde o temprano.

#### La moraleja

**Una pregunta bloqueante se responde con el archivo, no con una hipótesis.** §14.3
quedó escrita con una suposición razonable sobre las comisiones y la suposición era
falsa. El costo de haberla escrito igual fue cero porque estaba marcada como
sospecha; el costo de haberla construido habría sido un reporte entero apuntando al
lugar equivocado.

---

### 14.3 — Subir los resúmenes, y el borde que la fecha no resuelve (2026-09-06)

Los tres pendientes que §14.2 había dejado anotados, construidos de una vez: elegir
archivos, verificar la cadena entre ellos y avisar de los movimientos anteriores al
inicio del destino. Lo que sigue es lo que apareció al hacerlo, que no estaba en el
diseño.

#### 1. Juntar archivos trae dos problemas que un archivo solo no tiene

**El orden.** La verificación de cadena compara el saldo final de un período contra
el inicial del siguiente, así que sin ordenar da huecos falsos. Ordenar por nombre
era lo obvio y **habría estado mal**: los de MercadoPago se llaman
`account_statement-<uuid>.csv` y no dicen nada del período. Se ordena por el primer
movimiento, y el test que lo fija usa nombres elegidos para que el orden alfabético
dé el orden **contrario** — si alguna vez alguien lo cambia por `nombre`, falla.

**El mismo archivo elegido dos veces**, que con 23 en un diálogo es cuestión de
tiempo. Se detecta por `referencia` repetida entre archivos **distintos**: dos
extractos son períodos disjuntos, así que un movimiento que aparece en los dos es
siempre el mismo archivo cargado dos veces.

⚠️ **Y la mitad que no se hizo importa igual que la que sí:** repetida *dentro* de
un archivo **no** se marca. Ahí puede ser legítima, y marcarla dejaría afuera un
gasto real. Hay un test para cada mitad, porque «detecta duplicados» y «detecta
demasiados duplicados» se ven idénticos desde afuera.

#### 2. La distinción que ordena las tres verificaciones

Al llevar el nivel 3 a la pantalla apareció que **no puede comportarse como los
otros dos**:

- Niveles 1 y 2 fallan cuando lo que se leyó **está mal** → **bloquean**.
- El nivel 3 falla cuando **falta un mes** → **avisa**. Importar octubre y diciembre
  sin noviembre es *incompleto*, no *incorrecto*, y es exactamente lo que hace
  alguien que va bajando los extractos de a uno.

Bloquear ahí habría sido tratar «te falta un archivo» como «tus datos están mal», y
la persona no tiene forma de distinguirlo desde el botón deshabilitado.

Los niveles 1 y 2 pasaron a calcularse **por archivo**: cada extracto declara sus
propios totales, y sumarlos todos juntos escondería justo el que no cuadra.

#### 3. ⚠️ Lo que la fecha de inicio NO resuelve, y es el caso peligroso

El corte por `destinos.fecha_inicio` funcionó y se midió contra el archivo real:
**21 de los 27 movimientos de octubre 2024 son de la etapa previa** al fondo. Pero
al correrlo apareció que **los dos que importaban no estaban entre esos 21**.

`fecha_inicio` es una fecha, no un instante, y **un fondo puede arrancar a mitad de
un día**. El del convenio es exactamente eso: el 10/10/2024 la cuenta hizo la
transferencia de cierre y pagó su impuesto, y **recién después** el saldo que quedó
pasó a ser el fondo. `fecha < inicio` no los alcanza — y **el saldo inicial de
$1.000.000 ya está neto de los dos**, así que importarlos los contaría dos veces.

O sea: la regla automática cubre 21 filas inofensivas y **no cubre las 2 peligrosas**.

`delDiaDelInicio()` las **marca** y no las destilda, y la decisión es deliberada: un
movimiento del día del inicio puede ser igual de bien el primero del fondo.
Destildar de más hace desaparecer un gasto en silencio —el error que este módulo
entero trata de no cometer—; marcar obliga a mirar dos filas.

#### Una decisión de estado que se pagó sola

El default de una fila dejó de ser siempre «sí», así que el set de `excluidas` no
alcanzaba: cambiar de destino habría tenido que reescribirlo, **pisando lo que la
persona destildó a mano**. Pasó a ser un mapa `indice -> entra` que es un *override*
del default. El default se recalcula solo cuando cambia el destino y las decisiones
manuales sobreviven.

#### Una consecuencia de escala que no estaba prevista

`getReferenciasCargadas` ya no recibe un mes sino veintitrés. Se trocea de a 500, y
**si una tanda falla corta** en vez de seguir: una lista incompleta de «ya cargadas»
hace que la previsualización *prometa* insertar lo que la base va a saltear — un
contador que miente en la dirección tranquilizadora.

#### La moraleja

**Una regla automática que cubre lo inofensivo y no lo peligroso es peor que no
tenerla**, porque la tranquiliza a la persona justo donde tenía que mirar. El corte
por fecha destildó 21 filas correctas y dejó pasar las 2 que habrían roto la
rendición. Lo que lo salvó no fue razonar el borde: fue **correr la regla contra el
archivo real y mirar el número**.

---

### 14.4 — El mismo pozo, dos veces: `loading` desmontaba la aplicación (2026-09-06)

Reporte del dueño: «cada vez que cambio de pestaña o de programa y vuelvo, **se me
recarga**». Pasaba en todo el sitio, no en una pantalla.

#### Lo que se descartó, con evidencia y no por descarte

| Sospechoso | Por qué no era |
|---|---|
| TanStack Query | `refetchOnWindowFocus: false` en `queryClient.js`, sin overrides en ningún hook |
| Código propio | No hay un solo `visibilitychange`, `focus` ni `location.reload` en `src/`. Sin service worker |
| Supabase disparando en cada foco | ⚠️ **Se creyó al principio y es FALSO en auth-js 2.74**: el `SIGNED_IN` al volver a la pestaña vive en la rama `__isUserNotAvailableProxy`, que requiere `userStorage` y este proyecto no lo configura |

#### El bug que sí estaba

`ProtectedRoute` devuelve un spinner **en lugar de** `children` mientras `loading` es
true. O sea que cada vez que el `AuthProvider` lo ponía en true, **la pantalla
protegida entera se desmontaba y se volvía a montar**: formulario a medio llenar,
lote de movimientos analizado, scroll. Desde afuera es indistinguible de una recarga
de página, y por eso no se diagnostica mirando la pantalla.

Y lo hacía con **cualquier** evento de `onAuthStateChange`, incluidos los que no
cambian la identidad de nadie: `INITIAL_SESSION` (que además llega duplicado, porque
`syncSession` lo dispara a mano además de Supabase) y `TOKEN_REFRESHED`.

⚠️ **ES LA SEGUNDA VEZ QUE ESTE ARCHIVO PISA EL MISMO POZO, Y HABÍA UNA NOTA
ESCRITA.** Ya se había quitado un listener propio de `visibilitychange`
«porque desmontaba las páginas protegidas y hacía perder formularios a medio
completar». **Se quitó el disparador y se dejó el mecanismo**, así que el síntoma
volvió por otra puerta y más espaciado. La guarda nueva es por id de usuario: un
evento que no cambia quién está logueado no toca `loading` ni relee el perfil.

**La lección, que generaliza:** cuando se arregla un síntoma sacando *quién lo
dispara*, hay que preguntarse qué más puede disparar el mismo mecanismo. Una nota
que explica el daño y no lo cierra es una trampa: la próxima persona la lee, ve que
«ya se resolvió» y no mira el mecanismo.

#### ⚠️ Y el control negativo salvó el test

Con el arreglo revertido, **3 de los 4 tests nuevos seguían en verde.** Con el perfil
resolviendo en el mismo microtask, React agrupa el `loading` true→false y **el
desmontaje nunca llega a renderizarse**. En el navegador hay un viaje de red en el
medio, así que sí ocurre. El mock ahora demora un tick, y con eso 2 de 4 fallan como
corresponde.

Es exactamente la regla de §B —«una verificación tiene que poder fallar»— y esta vez
el costo de no correrla habría sido **un test que fija lo contrario de lo que dice
fijar**, dando permiso para reintroducir el bug una tercera vez.

Segundo hallazgo del mismo control: `useToast` devuelve una `toast` **estable** (es
función de módulo), pero el mock la creaba nueva por render. Eso hacía que el efecto
se resuscribiera y llamara a `syncSession()` en cada render — el test estaba midiendo
su propio mock.

#### Lo que quedó sin confirmar

`TOKEN_REFRESHED` sale solo cuando faltan menos de **90s** para que venza el access
token (`EXPIRY_MARGIN_MS` = 3 × 30s en auth-js 2.74), o sea **una vez por hora**. El
reporte era «todo el tiempo», así que **el arreglo puede no explicar del todo el
síntoma reportado**. Lo que sí quedó probado con la consola del dueño es que **no era
una recarga real**: los listeners sobrevivieron a dos ciclos de ocultar/mostrar y
nunca se disparó `beforeunload`, o sea que el contexto de la página nunca se destruyó
(descarta el Ahorro de memoria de Chrome). **La confirmación pendiente es volver a la
pestaña después de más de una hora**, que es cuando el evento culpable existe.

---

### 14.5 — Dos trampas que solo aparecieron usando la pantalla (2026-09-06)

El importador estaba construido, testeado y desplegado. Las dos cosas que
siguieron rompiéndolo no las encontró ningún test: las encontró el dueño
cargando el extracto real de octubre.

#### 1. El aviso que llega después de que ya no sirve

Con el lote analizado y el destino **sin elegir**, la pantalla se veía como si
hubiera revisado todo y no tuviera nada que señalar: columna Estado vacía, ningún
chip de «anteriores al inicio», las 27 filas tildadas. Es coherente —sin destino
no hay fecha contra la cual comparar— y es **exactamente igual a que la
verificación no hubiera encontrado nada**.

El único aviso estaba al lado del botón, o sea **después de 27 filas**. Con 23
meses van a ser cientos. Se movió arriba de la tabla y dice lo que NO pasó
todavía, no solo que falta completar un campo.

**La lección:** un aviso sobre algo que gobierna toda la pantalla no puede vivir
al final de la pantalla. Y «el estado vacío porque falta un dato» tiene que verse
distinto de «el estado vacío porque está todo bien».

#### 2. ⚠️ Importar volvía a tildar lo que la persona acababa de excluir

Este es el grave. Después de importar, la pantalla se reanaliza sola para que lo
que entró figure como «Ya cargado» —la prueba visible de que reimportar no
duplica—. Pero el reanálisis **borraba las decisiones manuales**, así que las
filas *marcadas y no destildadas* volvían a nacer tildadas.

Resultado real, con el fondo del convenio: la persona destildó las dos filas del
10/10, importó los 4 gastos correctos… y la pantalla quedó ofreciendo **«Importar
2 movimientos»**, en rojo, con los $943.402,93 que el fondo nunca gastó y que su
saldo inicial ya tenía descontados. Un click de distancia de romper la rendición
que este módulo existe para sostener.

Ahora `analizar()` acepta `conservarDecisiones`, y el reanálisis posterior a
importar lo usa. Conservarlas es seguro **solo cuando la fuente no cambió**: los
índices salen de `consolidarArchivos`, determinística sobre la misma entrada. Con
archivos nuevos apuntarían a otras filas, y por eso el default sigue siendo
borrarlas — hay un control positivo que fija esa mitad.

**La lección, y es la misma que §14.3 dejó escrita del otro lado:** cuando una
regla automática decide *no* proteger algo —acá, no destildar lo del día del
inicio— la protección queda en manos de la persona, y entonces **su decisión pasa
a ser un dato que hay que cuidar como cualquier otro**. Borrarla en un refresco
de UI es perder trabajo que el sistema le pidió hacer.

`src/components/Admin/ImportarMovimientos.test.jsx` fija las dos mitades. El
control negativo tumba el test correcto y solo ese.

#### Y lo que sí funcionó

El resto de la cadena hizo lo suyo sin intervención: **21 de 27 movimientos se
destildaron solos** con su motivo en pantalla, los 2 del borde quedaron marcados,
las tres verificaciones cuadraron al centavo contra lo que declara MercadoPago, y
los 4 gastos que entraron suman **$78.748,70** — el fondo cierra octubre en
$921.251,30, que es el saldo del extracto.

---

### 14.6 — Nombres en la rendición, y un modal que no entraba en la pantalla (2026-09-06)

Dos pedidos del dueño mirando los gastos ya cargados. Los dos parecían de gusto
y ninguno lo era.

#### 1. «No pongamos nombres, sí para qué era»

Al ir a mirar, no era una preferencia de redacción: **era una regla del proyecto
que el importador estaba violando.** La migración que creó `gastos` la había
dejado escrita, con el motivo:

>     lo que no pueda ser público NO se escribe en un gasto.

Porque `gastos` tiene lectura pública de las filas publicadas y **publicar una la
publica entera** — las RLS filtran filas, no columnas, y la migración rechaza
explícitamente los grants por columna «porque producen un modelo que nadie puede
razonar».

El importador metía la descripción literal del extracto como `concepto` y la
contraparte como `proveedor`. «Transferencia enviada Maria Alejandra Torrado»
—una escribana— quedaba a un click de ser pública, **y repetida en los dos
campos**. Con 23 meses son cientos de filas.

Ahora va `conceptoGenerico()` —la descripción sin el nombre— y `proveedor` queda
null. El nombre no se pierde: `referencia_externa` apunta a la línea exacta del
extracto, que es el respaldo documental igual.

⚠️ **Y se verificó que en `aportes` NO había que hacer lo mismo, en vez de
asumirlo:** esa tabla no tiene policy de lectura pública, solo
`aportes_select_propio` y `aportes_select_board`. El nombre de quien transfiere
nunca se expone; lo público son los agregados de `reporte_destino()`. La misma
descripción es peligrosa en una tabla e inofensiva en la otra, y lo que decide es
la policy, no el texto.

#### 2. «¿No podemos ver todo sin scroll?»

Había dos problemas encadenados, y el primero era un bug de verdad:

**El bloque del comprobante estaba ANIDADO** dentro de la grilla de dos columnas
de categoría/proveedor, o sea que era su tercer item: caía en la mitad izquierda
de la segunda fila —con la mitad derecha vacía— y, al partirse a su vez en dos
columnas, cada campo ocupaba **un cuarto** del ancho del modal.

⚠️ **Con ese bug, `npm run build` pasa en verde.** Comprobado corriéndolo. Ni el
build, ni el lint, ni los 11 tests de comportamiento del panel lo ven: el
formulario *funciona* perfecto, se *ve* mal. Y la pantalla está detrás de sesión,
así que el chequeo con Chrome headless de §B tampoco la toca.

**El segundo era el ancho**: `max-w-lg` son 512px, y nueve campos ahí sólo entran
apilados. El modal medía más que la pantalla.

#### Cómo se midió, que es lo que hace que esto no sea opinión

No se puede abrir esta pantalla en Chrome (redirige al login) ni medirla en jsdom
(no calcula layout). Lo que sí se puede es **volcar el DOM real del componente
desde un test, inyectarle el CSS del build y abrir eso en Chrome**:

```
DUMP_OUT=... npx vitest run <un test temporal que escribe document.body.innerHTML>
# + el index-*.css del build + un <script> que mide scrollHeight vs clientHeight
```

Resultados reales, no estimados:

| | contenido | 1080 | 900 | 768 |
|---|---|---|---|---|
| antes | 950px | scroll | scroll | scroll |
| una sola grilla de 6 columnas | 726px | ok | scroll | scroll |
| + saldo en la línea de la etiqueta, ayudas cortas | 668px | ok | ok | scroll |
| + la nota comparte fila con el comprobante | **572px** | ok | ok | **ok** |

⚠️ **Y la primera medición dio un número falso.** Decía 950px con la grilla
resuelta en 2 columnas en vez de 6: **el CSS del build era anterior al cambio y
Tailwind purga las clases que no existían todavía**. `md:grid-cols-6` y los
`col-span` simplemente no estaban en el archivo. Medir contra un CSS viejo es
medir otro sitio.

#### La moraleja

**Un layout roto es invisible para todo lo que este repo corre automáticamente.**
Por eso el test nuevo es *estructural* y no de comportamiento: afirma que todos
los campos son hijos directos de la grilla del formulario. El control negativo
—reanidando el bloque, con el archivo compilando limpio— lo tumba, y sólo a él.

---

### 14.7 — La transparencia estaba publicada y escondida (2026-09-06)

Con los cuatro gastos ya publicados, el dueño preguntó lo que ninguna pantalla
pregunta sola: **«¿dónde se enchufa esto?»**. Y ahí apareció que la rendición
estaba pública pero no en el menú.

#### Lo primero: el nombre seguía público

Antes de contestar nada se fue a mirar `/rendicion` con Chrome headless **sin
sesión**, que es como lo ve cualquiera. El concepto estaba corregido y el
`proveedor` **no**:

```
Transferencia enviada certificación de firmas - Escribania
Transferencias enviadas · Maria Alejandra Torrado      ← el campo Proveedor
```

`proveedor` es la segunda línea de cada gasto en la rendición y también se
publica. Corregido por el dueño y verificado de nuevo: sin nombres.

**La lección:** cuando se cambia una regla de privacidad, la verificación no es
leer el formulario — es **abrir la página pública desde afuera**. Media
corrección se ve igual que una corrección entera desde el panel.

#### El agujero de navegación

`/rendicion` se llegaba desde el pie y desde «Colaborá». **«Transparencia» del
menú principal apuntaba a `/legal-documents`** —el estatuto y los balances—, o
sea que lo único que muestra plata entrando y saliendo, y que según §14 es el
diferencial del producto, no estaba en el menú.

Las dos páginas ya eran dos mitades de lo mismo: mismo hero, mismo eyebrow
(«Transparencia» / «Transparencia institucional»). Faltaba decirlo.

Ahora «Transparencia» es un grupo con el patrón que el menú ya tenía: **el padre
lleva a `/rendicion`** y el subitem a los documentos, y cada página enlaza a la
otra —«esta muestra el movimiento del dinero, los instrumentos se publican
aparte» y al revés—. En el pie, «Transparencia» pasó a llamarse «Documentación
oficial»: eran dos nombres distintos para las dos mitades, con el del paraguas
puesto sobre una sola.

#### ⚠️ El tercer grupo destapó un bug latente

El menú de escritorio elegía qué submenú abrir así:

```js
open={item.key === "nosotros" ? openNos : openColab}
```

Funciona con **exactamente dos** grupos. Con el tercero, todo lo que no sea
`nosotros` comparte el estado de `colabora`: pasar el mouse por uno abre el otro.
Estaba escrito desde antes y no molestaba porque nadie había sumado un grupo.

Se reemplazó por un mapa por clave —como ya era el acordeón de mobile— **en vez
de agregar una tercera rama**, que habría dejado la misma trampa armada para el
cuarto. Los tres `setOpenMob({ nosotros: false, colabora: false })` pasaron a
`{}`: una clave ausente ya es «cerrado», y así no hay lista que mantener.

El header no tenía **ningún** test. Ahora tiene cuatro, y el que importa fija que
abrir un grupo no abre los otros. El control negativo tumba ese y sólo ese.

#### La decisión de fondo: público sin registro

El dueño preguntó si la rendición debía pedir registro. La respuesta quedó
escrita porque va a volver:

- **Un muro de registro no protegería nada.** Cualquiera se registra en treinta
  segundos. Y acá sería peor: el bloqueo del frontend es **solo UX** —la frontera
  son las RLS—, así que gatear de verdad exigiría cambiar la policy, y entonces el
  dato deja de ser público.
- **La protección ya existe y está en el lugar correcto**: no se protege *quién
  mira* sino *qué se escribe*, campo por campo (`gastos`: «lo que no pueda ser
  público no se escribe»). Eso es más fuerte que un login.
- **El valor entero depende de que sea público.** Quien está decidiendo si dona no
  se registra para ver cómo gastás; se va. Y frente al convenio, mandar un link
  que abre sin cuenta es la diferencia entre rendir y decir que rendís.

Lo que sigue sin publicarse nunca son **los comprobantes**: traen CUIT, domicilio
y firmas de terceros. La página lo dice y ofrece pedirlos por contacto.

---

### 14.8 — Cierre de la jornada del 2026-09-06

**Lo que cambió de verdad:** la rendición dejó de estar vacía. `/rendicion` pasó de
«Rendido $0 · **0%**» a «**8%** de lo recaudado ya tiene rendición publicada»,
verificado sin sesión desde afuera. Son los 4 gastos de octubre 2024 del fondo del
convenio: **$78.748,70**, y el fondo cierra el mes en $921.251,30, que es
exactamente el saldo del extracto.

Importa menos la cifra que el hecho: **la maquinaria completa corrió de punta a
punta con dinero real** — importar un `.csv` de MercadoPago, verificar contra lo
que el banco declara, destildar lo que no corresponde, corregir los conceptos,
publicar, y que se vea desde afuera.

#### Los once commits, y qué los originó

| Commit | Qué | De dónde salió |
|---|---|---|
| `64738099`+`a956d888` | §14.3: varios archivos, cadena, corte por fecha | los 3 pendientes anotados |
| `28983d35` | el botón deshabilitado dice por qué | usarlo |
| `8979ef05`+`496190fb` | auth: un evento sin cambio de identidad no desmonta | reporte del dueño |
| `03ccd39d` | el aviso de destino va arriba | una captura |
| `d920b685` | importar no re-tilda lo excluido | una captura |
| `a5c0dde0` | el importador no escribe nombres en `gastos` | «no pongamos nombres» |
| `e0d3c64f`+`e85761e8` | el modal de gastos: anidado y sin scroll | «que se vea bien» |
| `f4816c03` | «Transparencia» abre la rendición | «¿dónde se enchufa?» |

⚠️ **Siete de los once salieron de usar la pantalla, no de programar.** Ninguno lo
habría encontrado el build, el lint ni los 447 tests que había: el formulario
funcionaba, los datos entraban bien y el layout estaba roto; el importador cargaba
correcto y ofrecía después importar justo lo que se había excluido; la rendición
estaba publicada y no estaba en el menú.

**Es el hallazgo de la jornada y conviene no olvidarlo: este proyecto tiene buena
cobertura de lo que DECIDE y casi ninguna de lo que se VE.** Por eso los tests
nuevos de esta jornada son de una clase distinta —estructurales, de navegación, de
estado de UI— y por eso se incorporó una forma de medir layout de pantallas detrás
de sesión (§14.6).

#### Estado medido al cierre (no copiado)

| | |
|---|---|
| Tests | **451 en 36 archivos** (`npm test`) |
| Lint | **0 errores**, 50 warnings de backlog |
| `npm audit` | 4 vulnerabilidades (1 low, 2 moderate, 1 high) |
| Archivos que citan §  | **136** (`grep -rlE '§\|ROADMAP' src/ supabase/ api/ tools/`) |
| Deploys verificados | 8, todos por símbolo servido, ninguno supuesto |

#### ⚠️ Lo único que quedó sin confirmar

El arreglo del remontaje de sesión (§14.4). `TOKEN_REFRESHED` sale **una vez por
hora** y el reporte era «todo el tiempo», así que puede no explicar todo el
síntoma. Sí quedó probado que **no era una recarga real**. La prueba pendiente:
dejar un lote analizado, irse más de una hora y volver.

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

---

## 12. El club de beneficios — la crónica (trasladada desde `ROADMAP.md` el 2026-09-06)

**Por qué se movió.** El §12 del ROADMAP llegó a **927 líneas, el 33% del archivo**, y
**13 de sus ítems ya estaban cerrados** — seguían ahí contando cómo se cerraron. Es
exactamente lo que el 2026-08-16 obligó a partir este archivo en dos: un ROADMAP que
acumula historia deja de leerse, y la parte que nadie relee es donde se pudren las
afirmaciones. Lo que quedó en `ROADMAP.md` §12 es el contrato del módulo y lo que falta;
todo el razonamiento está acá.

**Qué contiene:** el relevamiento del 2026-08-30, los cuatro modelos de descuento y por
qué solo el C es viable, el diseño del flujo y sus casos borde, el modelo de datos, los
niveles de comercio, las reglas de portabilidad, las decisiones de negocio del
2026-08-30, el ajuste de umbrales del 2026-09-02 (§12.11) y los 21 ítems de deuda de
§12.10 con su razonamiento completo.

### 12.A — Qué de todo esto sigue vigente

Casi todo el análisis sigue siendo cierto; lo que cambió es el estado. Tres avisos para
quien lea lo de abajo sin el contexto:

1. **`benefits` está deprecada.** El catálogo se unificó el 2026-09-02: las dos páginas
   leen `club_beneficios`. Las partes que hablan de «el catálogo viejo con código de
   texto fijo» describen algo que ya no existe.
2. **La deuda de §12.10 se cerró el 2026-09-06**, salvo lo que depende de gente. El
   detalle de cada cierre está en §12.B.
3. **La fase 1 «sin QR a propósito» y la limitación «el bloqueo es cosmético»** ya no
   aplican: el código se emite por persona y de un solo uso desde la fase 2, y
   `benefits` no publica nada.

### 12.B — Cómo se cerró la deuda (2026-09-06)

| Ítem | Cómo se cerró |
|---|---|
| **12.10.1** — la misma cuenta genera y confirma | Bloqueado en `club-confirmar-canje`, con `permitir_autoconfirmacion` en `club_config` para el modo «probar solo/a». Por defecto en `false` |
| **12.10.3** — la confirmación diferida nunca se ejercitó | La **decisión** se extrajo a `decidirRescate()` en `club-reglas.ts` y tiene 6 casos en vitest. El runtime HTTP sigue sin poder probarse fuera de producción |
| **12.10.4** — no hay invitación por magic link | Edge Function `club-invitar-operador` + el bloque «Invitar por email» en el ABM. Crea la cuenta, la ata al comercio y manda el link; sin Resend devuelve el link para pasarlo por WhatsApp |
| **12.10.5** — no hay formulario público de postulación | `/club/postular` + tabla `club_postulaciones` + bandeja de entrada en el ABM, con el botón «Crear el comercio» que evita retipear |
| **12.10.6** — la anulación no tiene UI | Botón por canje confirmado en `/comercio`, con motivo obligatorio |
| **12.10.7** — el PIN por empleado | **No se hace.** Pasó a «lo que se decidió no hacer» |
| **12.10.11** — el reaper depende de que alguien genere | Cron de `pg_cron` cada 15 minutos. **La premisa era falsa** (ver abajo) |
| **12.10.12** — el runtime no se prueba localmente | Pasó a limitación declarada. Ya no queda ninguna decisión del club fuera de `club-reglas.ts` |
| **12.10.14** — la pregunta abierta `/beneficios` vs `/club` | **Decidida:** vidriera pública vs mostrador del socio. A `/club` se llega desde el carnet, el dashboard y el CTA de un beneficio, no desde el nav |
| **Fase 3** — el reporte al comercio | `club_reporte_comercio` + `_por_beneficio` + `_por_mes`, y la solapa «Mis números» en `/comercio` |

⚠️ **Y la premisa número catorce que resultó falsa.** §12.10.11 declaró el cron «deuda
consciente, no olvido» porque *«el plan Free de Supabase no lo trae»*. Verificado el
2026-09-06 contra la base: **`pg_cron 1.6` está disponible Y precargada en
`shared_preload_libraries`** en producción. Lo que el plan Free no trae es el programador
de Edge Functions del panel; el cron de Postgres —el que hacía falta— estaba ahí desde
siempre. **Nadie lo miró: se escribió la limitación y se le creyó dos jornadas.** Es la
regla 1 del ROADMAP otra vez, y esta vez la premisa falsa era propia.

⚠️ **Dos cosas que encontró el propio check al escribirlo**, y las dos valen más que el
ítem que las destapó:

1. **`trg_prevent_privilege_escalation` pisa el cambio de rol EN SILENCIO.** El
   `UPDATE users SET role='comision_directiva'` del escenario «funcionaba» —0 errores,
   1 fila afectada— y la persona seguía siendo `'user'`. El `FALLA` que salía culpaba a
   la policy en vez de al andamio. `membresia-check.sql` ya lo documentaba; hubo que
   pisarlo de nuevo para verlo.
2. **El alfabeto del código no tiene 0/O ni 1/I/L**, así que un `'ZZB111'` de prueba
   viola el CHECK, aborta la transacción y las **cinco** pruebas siguientes informan
   «current transaction is aborted» — el modo de fallo que §11.4 marca como el más
   engañoso, porque parece que fallaron ellas.

⚠️ **Y una incompatibilidad de backup que este repo no tenía escrita.** `CLAUDE.md` avisa
que el dump de `pg_dump` 17 no restaura en PG15 por `SET transaction_timeout`. **Son dos
cosas, no una**: `pg_dump` 17.6 emite además las meta-órdenes `restrict` / `unrestrict`,
que `psql` 15 rechaza con `invalid command`. La receta completa está en `ROADMAP.md` §A.

Y el contenedor de restauración **necesita el bootstrap de `pg15-bootstrap/` montado**:
sin él arranca, acepta conexiones, y **muere a mitad de la inicialización** — el modo de
fallo que el README de `checks` advierte, visto en vivo.

### 12.C — El texto completo, tal como vivió en el ROADMAP

#### 12.0 — Qué es esto y cómo se relaciona con §10

La §10 responde **quién tiene derecho** a un beneficio (aporte → acceso). Esta sección
responde las otras dos preguntas, que quedaron fuera: **qué pasa en el mostrador** y
**qué gana el comercio por estar**.

Son módulos distintos y conviene que lo sigan siendo. §10 es del dominio de la entidad
(socios, cuotas, donaciones). §12 es un módulo genérico que solo le pregunta a §10 una
cosa: `tiene_acceso(user_id)`. Esa frontera es lo que lo hace portable a otro proyecto
(ver 12.7), y es una decisión de diseño, no una casualidad.

**La fase 1 de §10 es prerrequisito literal de todo lo de acá.** Sin `tiene_acceso()`,
el club no puede distinguir un socio de un visitante y no hay nada que validar.

---

#### 12.1 — Estado actual → `HISTORIAL.md`

El relevamiento del 2026-08-30 (12.1.a/b/c) está resuelto, en producción y demostrado con
un canje real. Se movió con su numeración.
#### 12.2 — Decisión de arquitectura

#### La entidad protagonista es el canje, no el beneficio

El beneficio es catálogo, casi contenido editorial. El **canje** es el hecho económico:
quién, dónde, cuándo, cuánto. De ahí salen las tres cosas que sostienen un club en el
tiempo: el socio ve que le sirve, el comercio ve que le trae gente, y la entidad tiene
números para negociar la renovación.

#### El token de canje ES el canje en estado pendiente

No hace falta tabla de tokens, ni JWT firmados, ni store externo:

```
socio pulsa "usar beneficio"
  → INSERT club_canjes (estado='pendiente', codigo='7K4M2P', expira_en=now()+5min)
  → pantalla del socio: QR + código de 6 caracteres + contador

comercio escanea o tipea el código
  → UPDATE ... estado='confirmado', cajero_id, monto_operacion
  → pantalla verde en los dos teléfonos
```

Una tabla, una máquina de estados, idempotencia natural (el código es único y de un solo
uso) y, de regalo, quedan registrados los canjes **abandonados** — que son una métrica
valiosa: muchos generados y pocos confirmados significa que ese comercio no está usando
el sistema, y te enterás sin que nadie lo reporte.

#### Por qué el modelo C y no otro

Hay cuatro formas conocidas de aplicar un descuento. Solo una es viable acá:

| Modelo | Quién aplica el descuento | Ejemplo | Viabilidad |
|---|---|---|---|
| **A. Integración con el POS del comercio** | El sistema del comercio | McDonald's, YPF | Solo con cadenas. Con comercios chicos y heterogéneos no existe |
| **B. En el medio de pago** | El banco o la billetera | MODO, beneficios bancarios | Requiere ser emisor o acordar con uno. Fuera de alcance |
| **C. Canje verificado por el club** | El comercio, confirmando en una web app | **Este** | Viable, y es lo que da trazabilidad |
| **D. Credencial visual** | El comercio, a ojo | Club La Nación clásico | Fase 1. Cero fricción, cero datos |

McDonald's y YPF resolvieron un problema **más fácil**: son closed-loop, el comercio son
ellos mismos, controlan la caja y al empleado. Lo que sí conviene copiarles es el patrón
del cupón: **personal, de un solo uso, con vencimiento, emitido a alguien identificado**
— nunca un código genérico, que es justo lo que hay hoy (12.1.a).

Los clubes que sí se parecen a este caso (Club La Nación, Clarín 365, Club Personal)
nunca tuvieron trazabilidad con el comercio chico: credencial a ojo, y descuentos
fuertes canalizados por medio de pago. Por eso no pueden demostrarle al comercio chico
cuánta gente le mandaron, y por eso lo pierden. **El modelo C es lo que ellos no
hicieron, y es la ventaja competitiva de esto.**

#### La regla que hace que el sistema funcione

> **El código es la llave del descuento, no un registro paralelo del descuento.**

No debe existir la vía "mostrale el carnet al cajero y listo" en un comercio que ya está
digitalizado. Si existe, el 100% del tráfico se va por ahí y no queda ningún dato.

El motivo es de incentivos, no técnico: en YPF el playero pregunta por Serviclub porque
**trabaja para YPF**. El cajero de la pizzería no trabaja para la fundación y no tiene
ninguna razón para registrar nada. Si el descuento solo se otorga procesando el código,
el que reclama en el momento es el cliente — y ese reclamo es el mecanismo de
cumplimiento, gratis.

---

#### 12.3 — El flujo

#### Alta del comercio (una sola vez)

1. Se postula desde el formulario público (base: `ApplyPartnerPage.jsx`) o lo carga admin.
2. Admin aprueba, carga sucursales y **redacta el beneficio junto al comercio**. Al
   principio la redacción la controla la entidad: ahí se generan casi todos los
   conflictos de mostrador ("¿incluye promos?", "¿aplica feriados?"). Después se le
   abre la edición al comercio.
3. Al dueño le llega un magic link a `/comercio`.
4. **Se da de alta el dispositivo del local, no a cada empleado.** El cajero rota cada
   pocos meses; crear una cuenta por empleado no va a ocurrir. El teléfono o tablet del
   mostrador queda logueado con un device token largo. Si el comercio quiere saber qué
   empleado validó cada canje, se agrega un PIN de 4 dígitos — opcional, casi ninguno
   lo va a querer.

#### El mostrador

**Socio** (en el local):
1. Abre el club; ve los beneficios ordenados por cercanía.
2. Toca el beneficio → condiciones + botón **"Usar ahora"**.
3. Advertencia antes de generar: *"Generalo recién cuando estés en la caja — vence en 5
   minutos."* Sin esto, la mitad lo genera en el colectivo y llega con el código vencido.
4. Pantalla de canje: QR grande, código de 6 caracteres, contador regresivo, su nombre
   y el del comercio.

**Cajero** (teléfono del local, `/comercio` siempre abierto en "Validar"):
5. **Escanear** o **Ingresar código**.
6. Ve nombre del socio + el beneficio en letra grande + botón **Confirmar**.
7. Campo opcional "Monto de la operación" (de esto depende el reporte de 12.6).
8. Confirma.

**El cierre:** la pantalla del socio **cambia sola** a verde en ese instante (Supabase
Realtime). El socio ve que quedó registrado y el cajero ve que el socio lo vio. Esa
confirmación cruzada es lo que hace que el sistema se sienta real y no un trámite.

#### Casos borde (resolver antes, no después)

| Situación | Comportamiento |
|---|---|
| **Socio sin acceso vigente** | El botón "Usar ahora" **no existe**; en su lugar, link a renovar. Nunca dejarlo generar un código que va a fallar en la caja: pasar vergüenza en el mostrador es la forma más rápida de perder un socio |
| **Local sin señal** (subsuelo, shopping) | El socio genera con su conexión; el comercio necesita señal para confirmar. **Confirmación diferida**: el cajero puede rescatar códigos de las últimas 2 h al recuperar conexión |
| **Se anula la venta** | El cajero anula dentro de 30 min → estado `anulado`. **No se borra**: el rastro importa |
| **El cajero se olvidó de confirmar** | El canje expira. Es una métrica de adopción del comercio, no un error |
| **Comercio que no quiere panel** | Existe y va a existir. Se queda en modo credencial (modelo D) y sus canjes los carga admin a mano. No dejarlo fuera del catálogo por eso |

---

#### 12.4 — Modelo de datos

Módulo aislado con prefijo `club_`. **No modifica ninguna tabla existente**; solo se
cuelga de `users(id)` y de la función de elegibilidad.

```sql
club_comercios (
  id uuid pk, partner_id uuid null references partners(id),
  nombre, rubro, cuit, slug unique, logo_url, descripcion,
  estado text check (estado in ('pendiente','activo','pausado','baja')),
  created_at
)

club_sucursales (id, comercio_id, nombre, direccion, lat, lng, horarios jsonb, telefono)

club_comercio_usuarios (comercio_id, user_id, rol check (rol in ('dueno','cajero')),
                        primary key (comercio_id, user_id))

club_beneficios (
  id, comercio_id,
  titulo, descripcion, terminos,
  tipo check (tipo in ('porcentaje','monto_fijo','2x1','regalo')),
  valor numeric,
  requiere_acceso boolean not null default true,
  limite_por_persona int, ventana check (ventana in ('dia','semana','mes','total')),
  limite_total int, stock int,
  vigencia_desde date, vigencia_hasta date,
  dias_semana int[], hora_desde time, hora_hasta time,
  estado, orden
)

club_canjes (                       -- el libro. También es el store de tokens.
  id, beneficio_id, sucursal_id, user_id,
  codigo text unique,               -- 6 chars, alfabeto sin ambiguos (sin 0/O, 1/I/L)
  estado check (estado in ('pendiente','confirmado','expirado','anulado')),
  expira_en timestamptz,
  cajero_id uuid, confirmado_en timestamptz,
  monto_operacion numeric, ahorro numeric,
  anulado_en, anulado_por, motivo_anulacion,
  created_at
)

club_config (clave text pk, valor jsonb)   -- todo parámetro variable vive acá (12.7)
```

**Por qué `club_comercios` y no extender `partners`:** hoy `partners` son sponsors
institucionales y sus logos van a la Home (`tools/normalize-partner-logos.mjs`). Si se
mezclan, la primera pizzería que entre al club aparece en la grilla de aliados de la
Fundación. Son dos relaciones distintas con la entidad, aunque una empresa pueda ser las
dos cosas — de ahí el `partner_id` opcional.

`benefits` queda como está y se deprecia migrando su contenido a `club_beneficios`. No
conviene romper las páginas públicas de entrada.

---

#### 12.5 — Dónde vive la lógica: cambio de patrón respecto del resto del repo

Hoy **toda la lógica de datos corre en el browser con la anon key** y la seguridad son
las RLS (ver `CLAUDE.md`, modelo de seguridad). **Para el club eso no alcanza.**
`club_canjes` es la tabla que otorga valor económico: si el browser puede insertar ahí,
cualquiera con las devtools abiertas se autogenera canjes confirmados, y del otro lado
hay un comercio esperando que le paguen. Es la misma advertencia de 10.2 sobre
`aportes`, pero con un tercero involucrado.

**Regla: `club_canjes` es de solo lectura para todo el mundo. Se escribe únicamente
desde Edge Functions con `service_role`.**

| Edge Function | La invoca | Valida |
|---|---|---|
| `club-generar-canje` | socio (JWT) | elegibilidad vigente, beneficio activo, límites por persona/ventana, stock, día y horario |
| `club-confirmar-canje` | cajero (JWT) | que el cajero pertenezca al comercio del beneficio, que el código no esté vencido ni usado |
| `club-anular-canje` | cajero / admin | ventana de anulación, deja rastro |

RLS de lectura: el socio ve los suyos, el comercio los de su comercio, admin y comisión
todos. `anon` sin ningún permiso — **no repetir el patrón de GRANTs amplios de 10.1.g**.

Para el lado comercio, replicar el patrón que ya funcionó con `is_board_member()`: una
función `is_comercio_member(comercio_id)` `SECURITY DEFINER`. **No agregar un rol
`'comercio'` al CHECK de `users.role`**: la pertenencia a `club_comercio_usuarios` *es*
el rol, y así una persona puede ser dueña de dos comercios sin romper el modelo. El
redirect post-login se deriva de tener fila en esa tabla.

Los límites se validan en la Edge Function **y** tienen red de contención en la base
(índice único parcial sobre `(user_id, beneficio_id, fecha)` para el caso "uno por
día"). El doble clic en un celular lento es más frecuente que el atacante.

---

#### 12.6 — Niveles de comercio: el incentivo

La contraprestación al comercio es **publicidad de la entidad**: costo marginal cero
para la Fundación, valor real para el comercio. Es lo que responde la pregunta de por qué
un comercio seguiría dando descuento el año que viene.

#### La métrica no puede ser la cantidad de canjes

Premiar el `count(*)` de canjes tiene tres defectos, y los tres son evitables:

1. **Es inflable por el propio premiado.** Se le pone recompensa a un número que el
   comercio puede fabricar (conocidos que se asocian y "canjean" sin descuento real).
2. **Premia al grande por ser grande.** Una cadena de tres sucursales llega a 50 canjes
   en diez días; la óptica del barrio no llega nunca. Termina recibiendo publicidad
   gratis quien menos la necesita, mientras el chico —el que más fácil se va— nunca sube.
3. **Mide atractivo, no generosidad.** Una hamburguesería al 10% tendrá más canjes que
   una mueblería al 30%. El ranking premia vender barato y seguido.

#### Cómo se corrige

- **Métrica = ahorro generado a los socios** (`sum(ahorro)`), no cantidad de canjes.
- **Tope por socio en el cálculo**: máximo 3 canjes del mismo socio por mes cuentan para
  el nivel. Dos líneas en la vista; mata el inflado sin afectar a ningún comercio real.
- **Ventana móvil de 12 meses**, no acumulado histórico: si es acumulado, el que fue
  bueno en 2025 y se durmió es dorado para siempre y el nivel deja de significar algo.
  Evaluación **trimestral**, para que nadie baje por un mes flojo.
- **El nivel mezcla volumen con compromiso**: ahorro generado + meses activos sin cortar
  + antigüedad en el club + calidad del descuento. Así la óptica que hace 18 meses da
  25% sin fallar puede ser dorada aunque tenga una décima parte de los canjes que la
  cadena.
- **Los nombres importan**: nadie quiere un sticker que diga "somos el escalón de abajo".
  Los niveles bajos **no se muestran en público**; solo se muestra el logro alcanzado.

| Nivel | Qué recibe |
|---|---|
| **Comercio del club** (todos) | Ficha en el catálogo, mapa y buscador |
| **Solidario** | Posteo dedicado en redes + mención en newsletter |
| **Premium** | Destacado arriba del catálogo con badge + banner en Home + nota en Novedades |
| **Dorado** | Todo lo anterior + presencia en eventos + logo en materiales + entrevista |

**El premio que más vale no está en esa tabla: el reporte trimestral con sus propios
números.** "El club te mandó 47 personas este trimestre, $1,2M de consumo, el 60% volvió
una segunda vez." Es lo que el dueño le muestra a su contador para justificar seguir un
año más, es subproducto directo de `club_canjes`, y no lo tiene ningún club chico.

#### Los umbrales se fijan con datos, no antes

Números como 5/10/50 canjes son inventados y van a estar mal: o todos son dorados el
primer mes (y el nivel no vale nada) o nadie llega (y desmotiva). **Arrancar con un solo
nivel** ("Comercio del club") y fijar los cortes después de 3 meses de operación, sobre
percentiles reales.

```sql
club_niveles (id, nombre, orden, min_ahorro_12m, min_meses_activo, min_canjes_12m, ...)
-- vista: nivel vigente por comercio, con el tope por socio ya aplicado
club_comercio_nivel (comercio_id, nivel_id, ahorro_12m, canjes_12m, meses_activo, desde)
```

**El nivel se calcula, no se asigna a mano.** Asignado a mano, el primer comercio que se
queje discute el criterio y no hay con qué responderle.

Nota institucional: poner "Partner Dorado" en la Home de una fundación **es publicidad**.
Viniendo de una entidad de bien público, el criterio tiene que ser objetivo y estar
publicado en la página del club. Evita el conflicto antes de que exista.

---

#### 12.7 — Reglas de portabilidad (qué lo hace reutilizable)

El objetivo es **copiar migraciones + Edge Functions a otro proyecto Supabase y que
funcione**. No es un servicio multi-tenant compartido: con un solo dev y varios
proyectos, un servicio central es punto único de falla y problema de versionado.
Duplicar código es feo pero es libre. El costo aceptado es que un fix se aplica N veces.

Para que esa copia sea posible, el módulo tiene que respetar:

1. **Contrato único de elegibilidad.** El club **nunca sabe por qué** alguien es
   elegible: solo llama a `public.tiene_acceso(uuid) → boolean`. Cada proyecto la
   implementa a su manera (en un gimnasio: cuota del mes paga; en una cámara: socio
   activo; en un proyecto sin socios: `select true`).
2. **Prefijo `club_` en todo**, y ninguna tabla del club referencia tablas del proyecto
   salvo `users(id)` y el `partner_id` opcional (que puede quedar NULL siempre).
3. **Cero marca dentro del módulo**: ni nombres de la entidad, ni copy institucional, ni
   colores en tablas, funciones o Edge Functions. Mismo criterio del ítem 3.4.
4. **Todo parámetro variable en `club_config`**: duración del token, ventana de
   anulación, si el monto de operación es obligatorio, umbrales de nivel. Ninguna
   constante mágica en código (mismo criterio de 10.5).
5. **Las Edge Functions no leen nada fuera del prefijo `club_`**, salvo `users` y la
   función de elegibilidad.
6. **UI contenida en `src/components/Club/` y `src/pages/club/`**, sin importar nada del
   proyecto salvo `components/ui/` y `lib/`.

✅ **Bloqueante previo (10.6 #1): resuelto el 2026-08-30.** `src/lib/supabase.js` ya no
tiene fallback a las credenciales de producción — lanza al importarse — y
`vite.config.js` aborta el build si faltan las env vars. Sin eso, un fork mal
configurado habría emitido canjes contra la base de la Fundación **sin fallar**.

---

#### 12.8 — Orden de implementación

| Fase | Qué | Deja algo usable? |
|---|---|---|
| **0** | ~~§10 fase 1: `aportes` + `tiene_acceso()`~~ + ~~bloqueante #1 de 10.6~~ **✅ HECHO 2026-08-30** (esquema y guarda de credenciales; falta aplicar en prod) | Prerrequisito literal: sin esto no hay a quién validarle nada |
| **1** | ~~Carnet digital + `requiere_acceso` en beneficios + catálogo que muestra el estado de acceso~~ **✅ HECHO 2026-08-30** — `/carnet`, bloqueo en catálogo y detalle, `src/lib/acceso.js` + `accesoApi.js`. **Sin QR a propósito**: en esta fase el comercio *mira* el carnet, no lo escanea, así que un QR que nadie lee no aporta nada y suma una dependencia. Entra en la fase 2, que es donde se escanea. ⚠️ Ver la limitación de abajo | **Ya es un club funcionando**, sin pedirle nada al comercio (modelo D) |
| **2** | ~~`club_comercios`/`club_sucursales`/`club_comercio_usuarios` + `club_canjes` + las 3 Edge Functions + panel `/comercio`~~ **✅ CERRADA — probada de punta a punta el 2026-09-02** (§11.7.12). Queda deuda menor, toda en §12.10 | Entra el comercio. Acá aparece la trazabilidad |
| **2b** | **El ABM del club** — sección «Club de beneficios» en `/admin`: comercios, sucursales, beneficios y operadores del mostrador. ⚠️ **Este renglón no existía**: la fase 2 listaba «panel `/comercio`» y ese es el mostrador, no la administración. Ver §11.7.9 | Sin esto, cada comercio nuevo necesita un desarrollador — y §12.7 deja de cumplirse |
| **3** | Reporte para el comercio + límites finos + anulación + sucursales en mapa | **Esto es lo que hace que el comercio renueve** |
| **4** | `club_niveles` + cálculo + badges en catálogo (con umbrales sobre datos reales) | El incentivo de 12.6 |
| **5** | Extracción a un segundo proyecto (12.7). Wallet passes (Apple/Google) solo si hace falta | Producto |

⚠️ **Limitación conocida de la fase 1: el bloqueo es cosmético.** `benefits.codigo` sigue
siendo una columna de lectura pública (12.1.a), así que ocultar el código en pantalla no
impide que alguien lo lea consultando la API. **Esto no es un descuido y no se arregla
con RLS**: proteger la columna con GRANTs a nivel columna rompería el panel admin (que
usa el mismo rol `authenticated`), y partir el código a una tabla aparte es un refactor
que la fase 2 tira a la basura igual. La protección real llega cuando el código deja de
ser un texto fijo y pasa a emitirse por persona y de un solo uso (`club_canjes`). Hasta
entonces: **no poner en `requiere_acceso` un beneficio cuyo código valga dinero de
verdad.**

**La fase 1 sin comercio digital es deliberada.** La mayoría de los clubes de beneficios
mueren porque le exigen un panel al comercio desde el día uno; el comercio no lo usa,
los canjes no se registran, y no hay números para renovar. Conviene entrar con la
credencial y digitalizar comercio por comercio.

---

#### 12.9 — Decisiones de negocio (TOMADAS el 2026-08-30)

1. **12.9.1 — ¿El comercio entra digitalizado desde el arranque?**
   → **Se arranca con un comercio piloto: DigitalMatch** (descuento en landing pages y
   sitios web). Es un comercio propio, así que la fase 2 se puede probar de punta a punta
   sin depender de que un tercero adopte nada. Los demás entran por credencial (modelo D)
   y se digitalizan de a uno.

2. **12.9.2 — ¿Se captura el monto de la operación?**
   → **Opcional.** Y la forma de conseguirlo no es exigirlo: es que el reporte trimestral
   —"el club te mandó N personas, $X de consumo"— solo se pueda armar con ese dato. El
   comercio termina pidiéndolo él para tener sus métricas y para calificar a los niveles
   altos. Si se exige de entrada, el cajero lo completa con cualquier número.

3. **12.9.3 — ¿Qué pasa con los beneficios de un comercio dado de baja?**
   → **Los canjes no se borran nunca**: son el libro contable del club. La ficha del
   comercio se archiva y sus beneficios pasan a inactivos.

4. **12.9.4 — ¿El donante puntual entra al club?** → Sí, resuelto en 10.4.5.

Queda una sola decisión abierta, y **a propósito**: los umbrales de los niveles de
comercio (12.6). Se fijan con 3 meses de datos reales, no antes.

---

#### 12.11 — El umbral tenía que ser proporcional al valor (2026-09-02) ✅ APLICADO

**Lo encontró una pregunta del dueño del proyecto, no una prueba.** Y es la tercera vez
seguida que el hueco lo destapa pensar el negocio en voz alta y no ejecutar código.

#### El problema, con los números reales

La regla de acceso es **una sola para todo el sistema**: `cuota_referencia` = $5.000 dan un
mes. El beneficio de DigitalMatch es 30% sobre desarrollo web, y una cotización va de
$150.000 a $500.000. Y el límite es `1 / total`: **un canje por persona, en la vida.**

| Cotización | 30% off | Aporte para acceder | Gana la persona | Recibe la Fundación | Pone el comercio |
|---|---|---|---|---|---|
| $150.000 | $45.000 | **$5.000** | $40.000 | $5.000 | $45.000 |
| $300.000 | $90.000 | **$5.000** | $85.000 | $5.000 | $90.000 |
| $500.000 | $150.000 | **$5.000** | $145.000 | $5.000 | $150.000 |

> **La estrategia óptima del socio era aportar $5.000 una vez, canjear e irse.** Y como el
> límite es de por vida, no le quedaba ninguna razón para volver a aportar. **El club
> premiaba irse** — exactamente lo contrario de lo que §10.7 identificó como el motivo más
> fuerte para sostener una entidad.

Y volvía **casi teórico** al bloqueante de §10.17: cuando por fin hubiera un socio con
acceso, iba a recibir lo que ya tenía cualquiera.

#### Tres decisiones de negocio, tomadas

**1. La cuota se mantiene en $5.000, simbólica.** Decisión del dueño del proyecto: el
objetivo es **volumen de socios, no margen por socio** — una cuota de $25.000 no llegaría
ni al 10% del alcance posible. Así que el beneficio caro **no se protege encareciendo la
entrada**, que mataría el volumen: se protege **pidiendo tiempo**.

**2. No se parte el descuento entre la persona y la Fundación.** Se evaluó que el comercio
diera 10% a la persona y donara 20%. **El instinto es correcto** —el valor debería volver
en parte a la entidad— pero el mecanismo convierte un **descuento** (el comercio resigna
margen, no se mueve plata) en una **cobranza con rendición**: factura el total, tributa
sobre el total y transfiere. La Fundación pasa a ser **acreedora de cada comercio**, con
conciliación y pagos que perseguir, que es lo que mata a los clubes chicos. Y **obliga a
reabrir §12.9.2**, que dejó el monto opcional justamente porque exigirlo hace que el cajero
lo complete con cualquier número. La misma economía se consigue sin mover un peso.

**3. Los dos caminos son O, no Y.** Se cumple con la antigüedad **o** con el aporte
acumulado. Pedir los dos dejaría afuera al donante que pone una suma grande de una vez, que
es **el que más aporta**.

#### Qué se construyó

| Pieza | Dónde |
|---|---|
| `antiguedad_minima_meses`, `aporte_minimo_acumulado`, `ahorro_maximo` | `20260902160000_club_requisitos_beneficio.sql` |
| `elegibilidad_club(uuid)` / `mi_elegibilidad_club()` | idem — devuelven **hechos**, no decisiones |
| `cumpleRequisitos()` y el tope en `calcularAhorro()` | `club-reglas.ts` — puro y testeable |
| La exigencia | `club-generar-canje/index.ts` |
| `faltaParaBeneficio()` y el estado `sin_requisitos` | `src/lib/club.js` — **UX, no frontera** |
| Los 6 campos del ABM | `ComercioDetalle.jsx` + `clubAdminApi.js` |

**`antiguedad_socio()` ya existía desde la fase 1 de §10 y no lo usaba nadie.** Se usa
`meses_aportados` (acumulado) y **no `racha_meses`**: la racha castigaría un cobro fallido
por tarjeta vencida, que es justo lo que §10.4.3 dice evitar.

⚠️ **La regla vive dos veces y no se puede evitar**: el browser no puede importar del
runtime de Deno. La del front es UX; **la autoridad es la Edge Function**, que vuelve a
preguntar con `service_role`. La única defensa contra que divergan es que **las dos se
prueben con la misma tabla de casos**, y así están escritas.

#### Los números elegidos, y por qué son provisorios

**6 meses de aporte O $30.000 acumulados, con el ahorro topado en $30.000.**

| | Antes | Ahora |
|---|---|---|
| Aporta la persona | $5.000 | **$30.000** |
| Ahorra en un trabajo de $150.000 | $45.000 | $30.000 |
| Su resultado neto | **+$40.000** | **±$0** |
| Recibe la Fundación | $5.000 | **$30.000** (6×) |
| Pone el comercio | $45.000 | **$30.000** (un tercio) |

**Por qué 6 y no 12:** doce meses serían $60.000 de aporte contra $30.000 de ahorro — el
beneficio quedaría en pérdida explícita, y entonces no es un beneficio. Seis lo deja a la
par, y la persona sostuvo la Fundación medio año en el camino.

⚠️ **Son la mejor estimación posible, no un dato.** §12.6 ya fijó el criterio: los umbrales
se fijan con datos reales. **Hoy hay 0 personas con acceso vigente, así que no hay datos.**
Por eso viven en la base y se editan desde el panel sin desplegar nada (§11.4: lo que varía
por entidad va en datos).

#### Lo que queda pendiente de esto

- [x] ~~**12.11.1 — Ejercitar el rechazo con una cuenta real.**~~ **✅ HECHO el 2026-09-05** — respuesta real abajo. Se probó que las funciones
  arrancan y rechazan sin sesión (401, no 500), y la lógica tiene 35 tests. **Pero el camino
  «tiene acceso y NO cumple los requisitos» nunca corrió contra la base**, y es la rama
  nueva.

  #### Cómo ejercitarlo, y por qué NO hay que tocar el umbral

  La tentación es bajar el umbral desde el ABM (`/admin → Club de beneficios →
  DigitalMatch Global → Requisitos para canjearlo`, que existe y está cableado). **No
  hace falta y es peor**, por dos motivos medidos:

  1. **DigitalMatch tiene `limite_por_persona = 1`, ventana `total`.** Si con el umbral
     bajo se aprieta el botón, se consume el único canje de esa persona *para siempre*,
     y es un descuento real de hasta $30.000.
  2. **El rechazo ocurre ANTES de cualquier escritura** (paso 2 de `club-generar-canje`,
     antes del insert). Así que llamar a la función con el umbral REAL no puede consumir
     nada: no llega a escribir.

  Entonces se llama a la función directamente, con la sesión ya iniciada en el sitio.
  Comprobado el 2026-09-02: **el header `apikey` NO hace falta**, alcanza con
  `Authorization`, así que el snippet no lleva ninguna clave adentro.

  ```js
  // consola del navegador, con sesión iniciada en evolucionantoniana.com
  (async () => {
    const k = Object.keys(localStorage).find(x => x.startsWith('sb-') && x.endsWith('-auth-token'));
    if (!k) return console.error('Sin sesión.');
    const tok = JSON.parse(localStorage[k]).access_token;
    const r = await fetch('https://lbtyxnbyetsvngsxczkt.supabase.co/functions/v1/club-generar-canje', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify({ beneficio_id: 'dc100000-0000-4000-8000-000000000003' }),
    });
    console.log('HTTP', r.status, await r.json());
  })();
  ```

  **Esperado** para un socio con 1 mes y $5.000: `HTTP 403` con
  `codigo_error: "requisitos"`, `faltan_meses: 5`, `falta_monto: 25000` y el `error` con
  la frase completa. Cualquier otra cosa —200, 500, o un 403 con otro código— es el
  hallazgo.

  ⚠️ **Controles**: sin sesión la misma llamada da `401 codigo_error: "sesion"` (probado),
  que confirma que responde la función y no el gateway. Y `403 sin_acceso` sería un
  resultado distinto: significaría que el problema es el aporte, no el umbral.

  #### ✅ Corrido el 2026-09-05, con la cuenta del primer socio real

  ```
  HTTP 403 {
    error: 'Este beneficio pide 6 meses de aporte o $30.000 en total. Vas por 1 mes
            y $5.000, así que te faltan 5 meses o $25.000.',
    codigo_error: 'requisitos', faltan_meses: 5, falta_monto: 25000
  }
  ```

  **Los cuatro campos, exactos.** La rama nueva de §12.11 corrió contra la base por
  primera vez y decidió bien. Nada se escribió: el `limite_por_persona = 1` del socio
  sigue intacto, que es lo que hacía segura esta prueba.

  ✅ **El caso real ya existe (2026-09-02).** Hay un socio con acceso vigente, **1 mes
  aportado y $5.000 acumulados**, y DigitalMatch pide 6 meses o $30.000: cae exactamente en
  la rama que nunca se ejercitó. Ya no hace falta esperar a nadie — y conviene hacerlo antes
  de que ese socio acumule seis meses, porque después el caso se va hasta que aparezca otro.

- [ ] **12.11.2 — El club necesita beneficios de ticket bajo y frecuencia alta.** Es el
  problema de fondo y no lo arregla ninguna columna: **un beneficio de ticket alto y una
  sola vez no es un beneficio de club de fidelidad.** Los clubes funcionan con lo contrario
  —el café, la farmacia, la librería: $2.000 de ahorro veinte veces al año—, que construye
  hábito y premia la permanencia sin que nadie diseñe nada. **DigitalMatch es una vidriera
  excelente y un cimiento malo.** Sumar tres o cuatro comercios de consumo cotidiano vale
  más que cualquier ajuste de umbral.

- [ ] **12.11.3 — El tope cambia los números de §12.6.** `ahorro_maximo` alimenta el
  `ahorro` de `club_canjes`, que es la métrica de nivel del comercio. Cuando se definan los
  umbrales de la fase 4, hay que tener presente que un ahorro topado no es comparable con
  uno sin tope.

---

#### 12.10 — Deuda del club: qué falta, ordenado por lo que duele (2026-09-02)

La fase 2 está cerrada y probada (§11.7.12). Esto es lo que **no** está, en un solo lugar,
para no volver a descubrir un hueco preguntando.

> ⚠️ **12.10.13 a 12.10.15 se agregaron el 2026-09-02**, y no las encontró una prueba ni una
> revisión de código: las encontró **abrir el sitio en un navegador y mirar las dos páginas
> una al lado de la otra**. Los tres huecos son de *integración* — cada pieza funciona sola y
> el conjunto no —, que es justo lo que ningún test unitario mira. Van con §11.7.10: «tiene el
> texto» no es «se ve bien», y ahora también **«cada pieza anda» no es «el circuito anda»**.

#### A. Integridad — lo que puede dar un resultado incorrecto

- [ ] **12.10.1 — La misma cuenta puede generar y confirmar su propio canje.**
  `club-confirmar-canje` verifica que quien confirma pertenezca al comercio, pero **no** que
  sea distinto de quien generó. Hoy es útil (permite probar solo/a) y no hace daño: el
  descuento sale del bolsillo del propio comercio. Pero es **el vector de inflación que
  §12.6 advierte**, y cuando existan los niveles de la fase 4 —donde el número de canjes
  define un premio— se convierte en un incentivo perverso. Son dos líneas en la Edge
  Function. **Bloquearlo antes de construir la fase 4, no después.**

- [x] ~~**12.10.2 — `benefits.codigo` sigue siendo de lectura pública.**~~ **✅ CERRADO,
  y verificado contra producción el 2026-09-05 por las DOS puntas** —que es lo que este
  repo pide, porque «no se ve» y «no existe» se parecen desde afuera:

  | Comprobación | Resultado |
  |---|---|
  | La policy pública es `estado = 'activo'` | y la única fila de `benefits` está **`inactivo`**: no la alcanza |
  | Los campos en sí | `codigo` y `codigo_descuento` están **en NULL** |

  O sea que no hay código que filtrar aunque la policy fallara. La protección real la da
  §12 fase 2: el código se emite por persona y de un solo uso desde una Edge Function.
  Diagnóstico original:** Es la limitación
  declarada de la fase 1 (12.8): ocultar el código en pantalla no impide leerlo por API. Se
  cierra sola cuando el contenido de `benefits` migre a `club_beneficios`, porque ahí el
  código es por persona y de un solo uso. Hasta entonces: **no poner en `requiere_acceso` un
  beneficio de `benefits` cuyo código valga dinero.**

- [ ] **12.10.3 — La confirmación diferida nunca se ejercitó.** El rescate de un canje
  vencido dentro de la ventana (`confirmacion_diferida_horas`) está implementado y no se
  probó: el único canje real se confirmó en 53 segundos. Es la rama que corre cuando el
  local se queda sin señal, o sea justo cuando nadie está mirando.

- [x] ~~**12.10.13 — 🔴 El código del beneficio real está publicado, y se filtra por TRES
  campos.**~~ **✅ CERRADO el 2026-09-02, y estructuralmente** (§12.10.16). Verificado en
  producción el 2026-09-05: `benefits` tiene **1 fila y está `inactivo`**, y el adaptador
  `mapearABeneficio()` **no copia** `codigo` ni `codigo_descuento` — así que la fuga no es
  «no se muestra», es **que no hay de dónde mostrarla**. El texto original queda abajo
  porque explica los tres campos por los que se filtraba, que es lo que hay que no repetir.
  Diagnóstico original:** Esto **agrava y corrige a 12.10.2**, que lo describía como «lectura pública por
  API». Es peor: está **impreso en una página pública e indexable**. El mismo 30% de
  DigitalMatch vive en los dos catálogos con reglas opuestas —`benefits` con
  `requiere_acceso = false`, `club_beneficios` con `true`— y **el público anula al gateado:
  hoy nadie necesita ser socio para tener el descuento.** Eso vuelve casi teórico al
  bloqueante de §10.17: cuando por fin haya un socio con acceso, va a recibir lo que ya
  tenía cualquier visitante.

  **Y no es un campo, son tres** — este es el detalle que se escapa:

  ```
  codigo            = 'DMGlobal'
  codigo_descuento  = 'Codigo Alternativo'   ← basura de carga, igual de visible
  instrucciones     = '… Usá el código DMGlobal para aplicar el 30% OFF.'   ← el tercero
  ```

  **Blindar la columna `codigo` no alcanzaría**: el código también viaja dentro del texto
  libre de `instrucciones`. Cualquier solución que mire solo la columna deja la fuga abierta.

  ✅ **Lo que NO está roto, y conviene saberlo:** la puerta está bien construida.
  `BenefitDetailPage.jsx:59-61` ya llama `useMiAcceso` y `beneficioBloqueado()`, y la
  línea 268 solo renderiza el código con `{!bloqueado && …}`. **Es un problema de datos, no
  de código**: con `requiere_acceso = false` la lógica pasa de largo.

#### B. Operación — lo que hace falta para que entre un comercio que no sea propio

- [ ] **12.10.4 — No hay invitación por magic link.** §12.3 la diseñó. Hoy: o el comercio se
  registra solo en `/register` y alguien lo ata a mano desde el ABM, o admin le crea la
  cuenta y le pasa la contraseña por fuera. Funciona, es artesanal, y no escala a diez
  comercios.

- [ ] **12.10.5 — No hay formulario público de postulación.** §12.3 lo imaginaba sobre la
  base de `ApplyPartnerPage`. Hoy un comercio no tiene por dónde pedir entrar.

- [ ] **12.10.6 — La anulación no tiene UI.** `club-anular-canje` está desplegada y
  `clubApi.anularCanje()` existe; falta el botón en `/comercio`. §12.3 la pide para cuando se
  cae una venta. Se dejó afuera por no agregar una acción destructiva sin poder ejercitarla,
  y ahora que hay un canje confirmado real **ya se puede probar**.

- [ ] **12.10.7 — El PIN por empleado.** §12.3 lo declara opcional y predice que «casi
  ninguno lo va a querer». Anotado para no re-discutirlo: la decisión ya está tomada, es
  *no lo hagas hasta que un comercio lo pida*.

#### C. Contenido y catálogo

- [x] ~~**12.10.8 — El catálogo está partido en dos.**~~ **✅ CERRADO el 2026-09-02.**
  Verificado el 2026-09-05: `benefits` quedó con su única fila en `inactivo` y el nav
  (`Header.jsx`) manda «Colaborá → Beneficios» a `/beneficios`, que ahora lee
  `club_beneficios`. Diagnóstico original:** `/beneficios` lee `benefits` (viejo, 1
  fila, código estático) y `/club` lee `club_beneficios` (nuevo, con canje). §12.4 decidió
  deprecar el primero migrando su contenido, no romperlo. **Mientras las dos existan, la
  regla es: lo que se canjea vive en `/club`.** Migrar la fila de DigitalMatch y retirar la
  vieja cierra este punto y el 12.10.2 de una vez.

- [x] ~~**12.10.14 — 🔴 `/club` es una página huérfana: no hay un solo enlace en el sitio.**~~
  **✅ RESUELTO en lo que importaba, el 2026-09-02.** La queja concreta era que el nav
  apuntaba al catálogo **viejo**; hoy apunta a `/beneficios`, que es el unificado.

  ⚠️ **Pero queda una pregunta abierta que conviene no perder** (anotada el 2026-09-05):
  después de unificar, `/beneficios` y `/club` leen **la misma tabla**, y `/club` sigue sin
  ninguna entrada en el nav — solo se llega desde el CTA de un detalle. O son dos vistas con
  trabajos distintos (vidriera / mostrador) y hay que decirlo en la interfaz, o una sobra.
  **Es exactamente el patrón que ya costó dos veces** (§12.10.16 y §10.23): dos pantallas
  que hablan de lo mismo sin que nadie decida cuál manda. Diagnóstico original:**
  Grep sobre todo `src/`: fuera de su propia carpeta, la única mención de `/club` es la
  definición de la ruta en `App.jsx`. No está en el `Header`, ni en `/beneficios`, ni en el
  carnet. **Se llega solo tipeando la URL.** Y el nav sí ofrece «Colaborá → Beneficios», que
  apunta al catálogo **viejo**:

  > **El camino descubrible lleva al catálogo sin puerta. El que tiene puerta está escondido.**

  Explica por qué la fase 2 se probó bien y nadie notó nada: el canje real se hizo entrando
  por URL directa (§11.7.12). **Una página que funciona y no está enlazada se verifica igual
  que una que anda** — es el mismo patrón de §11.7.13, el reaper que existía sin que nada lo
  llamara, en la capa de navegación.

- [x] ~~**12.10.15 — Unificar el catálogo necesita TRES columnas antes de poder migrar.**~~
  **✅ APLICADO el 2026-09-02** (`20260902120000_club_beneficios_vidriera.sql`). Verificado
  en producción el 2026-09-05: `slug`, `instrucciones` e `imagen_url` existen en
  `club_beneficios`. Diagnóstico original:**
  §12.4 decidió «deprecar el viejo migrando su contenido» y 12.10.8 lo hace sonar como mover
  una fila. No lo es: `club_beneficios` todavía no puede recibir todo ese contenido.

  ⚠️ **Este ítem dijo «CUATRO columnas» por un rato el 2026-09-02.** Son tres, y la
  diferencia importa porque revela algo bueno: **el modelo nuevo está mejor normalizado que
  el viejo.** Lo que en `benefits` eran columnas repetidas por beneficio, en el modelo nuevo
  ya vive donde corresponde —en el comercio— y se llega por join.

  | Campo que `/beneficios` renderiza | En el modelo nuevo | Qué hace falta |
  |---|---|---|
  | `slug` — la URL indexable | ❌ | **agregar a `club_beneficios`** |
  | `instrucciones` — «¿Cómo acceder?» | ❌ | **agregar a `club_beneficios`** |
  | `imagen_url` — imagen del beneficio | ❌ | **agregar**, nullable, con fallback al logo del comercio |
  | `categoria` — el chip «TECNOLOGIA» | ✅ `club_comercios.rubro` = «Tecnología» | nada |
  | logo, `sitio_web`, `contacto_email` | ✅ `partners` vía `club_comercios.partner_id` | nada — join anidado |
  | título, descripción, términos, vigencia, % | ✅ | nada |

  ⚠️ **Y un detalle de datos que se descubre acá:** `club_comercios.logo_url` está en **NULL**
  para DigitalMatch. El logo tiene que salir de `partners.logo_url` por `partner_id`, así que
  la consulta necesita un **embed anidado** y `logo_url` en el comercio queda como override
  opcional. Si el join se escribe plano, la vidriera sale sin logo y nadie se entera hasta
  mirarla.

- [ ] 🟡 **12.10.9 — El club tiene UN socio.** Remedido contra producción el 2026-09-05:
  **1 de 23 cuentas** tiene acceso vigente. Decía «0 de 23» y era cierto hasta que se cobró
  la primera cuota real el 2026-09-02.

  Lo que cambió no es cosmético: con ese socio se pudo **ejercitar el rechazo por
  requisitos** (§12.11.1), que era la última rama del club sin correr contra la base. O sea
  que el bloqueante técnico se levantó — **queda el de negocio**, que no se arregla con
  código: hace falta gente aportando. Sigue siendo §10.17, no un problema del club.

- [x] ~~**12.10.10 — Queda un beneficio de prueba en el catálogo.**~~ **✅ ARCHIVADO el
  2026-09-02** por el paso 2 de 12.10.16. Verificado en el sitio vivo: «Prueba interna»
  ya no aparece en `/club`. *Original:* «Prueba interna del sistema
  de canje» se cargó para validar el circuito. **Archivarlo** (`estado = 'baja'`) desde
  `/admin → Club de beneficios` cuando no se lo necesite: mientras esté activo lo ve
  cualquier visitante.

#### E. La unificación del catálogo — CONSTRUIDA el 2026-09-02, sin aplicar

> Los tres ítems 12.10.13/14/15 tienen el código escrito y validado, y **no están
> cerrados**: cierran cuando se aplique en producción, en este orden y no en otro.

**Qué se construyó:**

| Pieza | Dónde | Qué garantiza |
|---|---|---|
| Migración aditiva | `20260902120000_club_beneficios_vidriera.sql` | `slug`, `instrucciones`, `imagen_url` en `club_beneficios` |
| Migración de datos | `supabase/data/unificar_catalogo_beneficios.sql` | El beneficio hereda la URL vieja; la fila vieja y el beneficio de prueba se archivan |
| El adaptador | `src/lib/club.js` → `mapearABeneficio()` | **La fuga es imposible por estructura**: la forma que sale no tiene dónde poner un código |
| El saneo | `src/lib/club.js` → `sanearInstrucciones()` | Corta la frase que menciona un código, que era la tercera vía |
| El CTA por estado | `src/lib/club.js` → `accionVidriera()` | Visitante → asociarse · con sesión sin aporte → aportar · con acceso → canjear. Nunca un callejón |
| La consulta | `clubApi.js` → `getBeneficiosVidriera()` | Embed **anidado** a `partners`, que es de donde sale el logo |

- [x] ~~**12.10.16 — pasos 1 y 2**~~ **✅ APLICADOS a producción el 2026-09-02.**

  1. ✅ `tools/db.sh apply .../20260902120000_club_beneficios_vidriera.sql` — 3 columnas
     y 2 índices, verificados en la base.
  2. ✅ `tools/db.sh sql < supabase/data/unificar_catalogo_beneficios.sql`

  **Verificado en producción, con las dos puntas y desde el rol `anon`:** ve el beneficio
  con logo, categoría y sitio (control positivo — si diera 0 filas, el negativo mentiría),
  y `DMGlobal` no aparece en **ningún** campo legible. `benefits` no publica nada.

  **Y verificado en el sitio vivo con Chrome headless** (§B): `DMGlobal` = 0 apariciones
  en `/beneficios` y en `/club`. **La fuga de §12.10.13 está cerrada en producción.**
  De paso quedó archivado el beneficio de prueba, que cierra **12.10.10**.

  Antes de aplicar se tomó un **backup verificado por restauración** —no solo generado—:
  `tools/db.sh dump` a `C:\Projects\_backups-antoniana\`, restaurado en un PG15 limpio,
  y los **15 conteos de tabla coinciden exactamente** con producción. Más un rollback
  quirúrgico fila por fila, al lado. Y el paso 2 se corrió **primero en seco**
  (`COMMIT`→`ROLLBACK`) para leer los controles antes de confirmar; no dejó residuo.

- [x] ~~**12.10.17 — el paso 3, desplegar el front**~~ **✅ HECHO el 2026-09-02.**

  Verificado en el DOM de producción con Chrome headless: `/beneficios` muestra el
  beneficio con su logo y la categoría «Tecnología», `/club` lo muestra sin el de prueba,
  la **URL vieja sigue viva** (se conservó el slug a propósito) y `DMGlobal` da **0
  apariciones** en las tres páginas. Los 8 links del nav cruzados contra `App.jsx`: todos
  existen.

- [x] ~~**12.10.18 — La pasada en ancho de teléfono.**~~ **✅ HECHA el 2026-09-02, y el
  problema era el método.**

  Durante horas el contenido salió «recortado a la derecha» a 390 px, en las páginas nuevas
  **y también** en `/club` —arreglada para teléfono en su momento— y en la propia 404.
  Que fallara en todas era la pista, y la conclusión honesta de entonces fue que el chequeo
  no medía nada. **Era peor: medía algo falso.**

  #### La medición que lo cerró

  Una página de una línea que imprime `window.innerWidth`, capturada con el mismo comando:

  ```
  --window-size=200  ->  innerWidth=504
  --window-size=290  ->  innerWidth=504
  --window-size=390  ->  innerWidth=504   <-- lo que se venía usando
  --window-size=504  ->  innerWidth=504
  --window-size=600  ->  innerWidth=582
  --window-size=800  ->  innerWidth=782
  ```

  **El viewport tiene un piso de 504 px** en esta máquina: por debajo, `--window-size` no
  baja más. Así que la página se maquetaba a **504** y el screenshot guardaba los **390 de
  la izquierda**, cortando contenido que estaba perfecto. Encima de 504 hay ~18 px de
  diferencia por el marco.

  ✅ **Recapturado a 504 —el piso real, con el viewport entero— el sitio se ve bien**: nada
  recortado, el título en una línea, el texto envolviendo, el nav inferior con sus cuatro
  ítems y el menú hamburguesa. Verificado sobre el build local servido con `vite preview`.

  **Y 504 sí sirve para esto:** el breakpoint `sm` de Tailwind es 640 px, así que a 504 se
  está ejercitando el layout móvil, no el de escritorio. Un teléfono real mide 360-430, así
  que **no cubre lo que pueda romperse solo por debajo de 504** — para eso hace falta
  emulación por CDP, no `--window-size`.

  ⚠️ Sigue sin poder verse el estado «puede canjear» del CTA hasta que exista un socio con
  aporte vigente (§12.10.9). Hoy se verifican «sin sesión» y «sin acceso».

  **La lección, y es incómoda:** una verificación que falla siempre se lee como «el sistema
  está mal» cuando lo más probable es que **el instrumento esté mal**. Van cuatro veces en
  la jornada que el problema era el instrumento y no lo medido. La regla que queda:
  **antes de creerle a una medición, medí el instrumento contra algo cuyo valor conozcas.**

- [x] ~~**12.10.19 — Los dos bugs que el deploy hizo visibles, y la defensa que quedó.**~~
  **✅ CERRADO.** Los dos arreglados, la defensa quedó en `rutas-cta.test.js`, y la
  «vidriera vacía» que este ítem declaraba como regresión temporal se cerró con el deploy
  del front — `/beneficios/:slug` se viene mirando en el navegador desde entonces.
  Se conserva porque **las dos lecciones valen más que el ítem**: un test que afirma un
  valor escrito a mano no puede detectar que ese valor está mal, y una pieza nueva no se
  agrega a una pantalla sin leer qué ya renderiza. Diagnóstico original:**

  Ninguno lo encontró un test: los encontró **mirar la pantalla desplegada**. Van dos
  jornadas seguidas así (§12.10.13 salió de abrir el sitio en un navegador).

  **a) `/colaborar` no existe — la ruta es `/collaborate`, en inglés.** El link no falla:
  React Router cae en el catch-all y renderiza el 404, que mide **25.865 bytes** y tiene
  `<nav>` y `<footer>`, contra los 45.702 de la página real. **Es el mismo tropiezo que ya
  documentaba §11.4, con la misma ruta.** Y lo peor: **el test propio afirmaba
  `toBe('/colaborar')`, así que estaba de acuerdo con el bug y pasaba en verde.** Un valor
  escrito a mano no puede detectar que el valor está mal.

  ✅ **La defensa quedó en `src/lib/rutas-cta.test.js`**: lee las rutas de `App.jsx` y las
  cruza contra cada `href` que `accionVidriera` puede emitir, en sus ocho estados. Con
  control positivo (que `App.jsx` se pudo leer y declara >10 rutas — sin eso, un archivo
  movido haría pasar el test por vacuidad) y negativo. **Se hizo fallar antes de creerle.**

  **b) El bloque nuevo duplicaba el panel que ya existía.** La página de detalle **ya**
  tenía un panel «Reservado» que resolvía el estado bloqueado, y lo dice mejor: explica que
  se accede con la cuota al día o con una donación desde el valor de una cuota. El bloque
  nuevo salió al lado, con dos mensajes y dos botones para lo mismo.

  Es irónico de la manera que conviene anotar: **`accionVidriera` existe justamente para
  que no haya dos lugares decidiendo sobre el mismo beneficio (§12.10.13), y al construirla
  se agregó un cuarto sin mirar qué había.** De ahí la regla: **una pieza nueva no se agrega
  a una pantalla sin leer primero qué ya renderiza esa pantalla.**

  Es la consecuencia prevista y documentada de hacer el paso 2 antes del 3: el front
  desplegado todavía lee `benefits`, que ya no publica nada. La página **no está rota**
  —`<nav>`, `<footer>` y 31 KB de DOM— pero no muestra ningún beneficio.

  **Se eligió a propósito quedar en este estado y no en el anterior:** entre una vidriera
  vacía y un código que vale dinero publicado para cualquiera, la vacía dura horas y no
  le cuesta nada a nadie. Pero **es una regresión visible y hay que cerrarla, no
  convivir con ella.**

  Lo que falta después del deploy, y solo se puede ver ahí: **mirar `/beneficios` y
  `/beneficios/:slug` en un navegador, en ancho de teléfono** (§11.7.10), y que el CTA
  cambie con la sesión. ⚠️ Con 0 personas con acceso vigente (§12.10.9), el estado
  «puede canjear» **sigue sin poder verse de verdad** hasta que exista un socio: lo que
  se puede verificar hoy son los estados «sin sesión» y «sin acceso».

  ⚠️ Y falta lo que no se puede validar sin producción: **mirar `/beneficios` y
  `/beneficios/:slug` en un navegador, en ancho de teléfono** (§11.7.10), y comprobar
  que el CTA cambia con la sesión. Con 0 personas con acceso vigente (§12.10.9), el
  estado «puede canjear» **solo se puede ver de verdad cuando exista un socio**.

**Lo que la validación en Docker encontró y este archivo no decía:**

- ⚠️ **`benefits.estado` solo admite `'activo'|'inactivo'`**, mientras
  `club_beneficios.estado` admite `'borrador'|'activo'|'pausado'|'baja'`. **Son dos
  vocabularios distintos para lo mismo.** El script de datos decía `'baja'` y habría
  abortado la transacción entera contra producción. No lo encontró leerlo: lo encontró
  correrlo.
- ✅ **Y se cerró una excepción que §11.7.8 daba por permanente.** Ese cierre decía que
  `comision_docs_storage.sql` «siempre falla en PG15 pelado». Con
  `supabase/checks/pg15-bootstrap/` **las 15 migraciones aplican desde cero en PG15, la
  versión de producción**, convergen al reaplicarse, y los cinco checks dan salida
  idéntica con y sin la migración nueva. Ya no queda ninguna excepción declarada.

- [x] ~~**12.10.20 — El enlace aliado ↔ beneficio era de una sola dirección.**~~
  **✅ ARREGLADO el 2026-09-02.** Lo encontró el dueño del proyecto mirando
  `/partners/digitalmatchglobal`: el detalle del beneficio manda al perfil del aliado
  («Ver perfil del aliado», dos veces), y **el perfil no volvía**.

  ⚠️ **Y era peor que un enlace faltante.** Donde el aliado no tiene
  `colaboracion_detalle`, la página decía *«Próximamente compartiremos más información
  detallada sobre los beneficios de esta alianza»* — **y el beneficio ya estaba publicado
  ese mismo día.** La página prometía como futuro algo que ya existía.

  Es la **misma familia que 12.10.14** (el `/club` huérfano): piezas que funcionan y no
  están conectadas. Un enlace que falta no rompe nada, no tira ningún error y **no lo
  encuentra ningún test** — solo aparece navegando el sitio como lo navega una persona.
  Van tres hallazgos así en la jornada, los tres de mirar pantallas.

  Ahora el perfil lista los beneficios del aliado con su descuento y el candado de «para
  socios», reusando `useBeneficiosVidriera` — misma consulta, misma caché y la misma
  garantía estructural de que ahí tampoco puede aparecer un código.

- [x] ~~**12.10.21 — Un nombre de una sola palabra larga desbordaba el título.**~~
  **✅ ARREGLADO el 2026-09-02.** «DigitalMatchGlobal» son 18 caracteres sin espacios, y
  en la columna angosta del perfil se pasaba del borde de la tarjeta.

  **Por qué no se veía en ningún otro lado:** el texto de alrededor envuelve bien porque
  tiene espacios. Solo rompe en un título, solo con un nombre largo y solo sin
  `break-words`. Se agregó en los **tres** lugares donde el nombre entra a un título
  grande: el perfil del aliado, el listado de `/partners` y el ABM del club.

  Es de la familia de §11.7.10 —«tiene el texto» no es «se ve bien»— y el corolario que
  deja es más específico: **cualquier dato cargado por una persona puede ser una palabra
  larga, y un título sin `break-words` es una bomba de tiempo esperando ese dato.**

#### D. Infraestructura del módulo

- [ ] **12.10.11 — El reaper depende de que alguien genere un canje.** Desde §11.7.13,
  `club-generar-canje` llama a `club_expirar_canjes()` y eso hace el sistema auto-reparable.
  Pero si nadie genera, nada expira, y los canjes abandonados quedan en `'pendiente'`
  ensuciando la métrica de adopción del comercio. Un cron diario lo resolvería bien; el plan
  Free de Supabase no lo trae, así que **queda como deuda consciente, no como olvido**.

- [ ] **12.10.12 — El runtime de las Edge Functions no se puede probar localmente.**
  ⚠️ **Matizado el 2026-09-02:** sigue siendo cierto para el *runtime* de las funciones,
  pero **ya no para el esquema**. `supabase/checks/pg15-bootstrap/` permite validar
  migraciones, policies y triggers contra la **misma versión mayor y menor que
  producción**, que era la mitad más peligrosa del problema.
  `supabase start` falla en la máquina de trabajo (`supabase/checks/README.md`). Por eso toda
  la lógica que decide algo vive en `club-reglas.ts`. Mientras siga así, **cada cambio en un
  `index.ts` se prueba recién en producción.**

#### Lo que NO es deuda, aunque lo parezca

- **No hay rol `'comercio'` en `users`, y está bien.** La pertenencia a
  `club_comercio_usuarios` *es* el permiso (§12.5). Permite que una persona opere dos
  comercios, y el redirect post-login sale de `mis_comercios()`.
- **No se puede borrar un comercio, y está bien.** Se archiva con `estado = 'baja'`; los
  canjes no se borran nunca porque son el libro contable del club (12.9.3).
- **`ahorro` en NULL para 2x1 y regalo no es un dato faltante**: es «no calculable», y un 0
  mentiría en el reporte al comercio (§11.7.12).

---

## 2026-09-08 — Diseño mobile de colaboración, panel, rendición y carnet

Se simplificaron `/collaborate`, `/dashboard`, `/rendicion` y `/carnet`, además de la barra de navegación mobile. El formulario de colaboración muestra una modalidad por vez y conserva sus valores; el panel reduce contenido decorativo y reemplaza la tabla ancha del historial; la rendición aclara el saldo por rendir y distingue carga, error y ausencia de datos; el carnet prioriza identidad y estado, con trayectoria desplegable y tolerancia explícita.

Antes de publicar se integró `origin/master` (`cbc77b00`), conservando los gastos agrupados por categoría, la fecha de inicio y el enlace documental de la rendición, así como el acceso del carnet a `/club` para generar canjes. “Donar” en la barra mobile lleva ahora al formulario `/collaborate`, para no saltear la identificación del aportante.

Validación del conjunto integrado: build correcto, lint sin errores (39 advertencias), 494 pruebas aprobadas en 41 archivos. El alcance por pantalla, los comportamientos preservados, la revisión visual y el procedimiento de verificación del deploy están en [docs/ui-ux-mobile-2026-09-08.md](docs/ui-ux-mobile-2026-09-08.md).

---

## 10. Modelo de dominio: aporte → acceso — CERRADO el 2026-09-05, trasladado el 2026-09-08

> **Se trasladó desde `ROADMAP.md` el 2026-09-08, después de revalidar la sección entera
> contra producción** — no contra este archivo, que ya se había equivocado trece veces.
> Las veinte afirmaciones se comprobaron con SQL de solo lectura sobre la base real:
>
> | Comprobación | Resultado |
> |---|---|
> | `miembros` + `categorias_miembro` + `reglas_membresia` | existen, y **coherentes**: 0 usuarios con acceso vigente sin fila en `miembros`, sostenido por `trg_miembro_desde_aporte` |
> | `requiere_acceso` | `benefits` default `false`, `club_beneficios` default `true` — divergencia deliberada, justificada en la migración `20260902120000` |
> | `fuentes_reclamables` + `reclamar_huellas()` | 2 fuentes activas: preinscripciones y inscripciones |
> | `precio_general` / `precio_socio` / `precio_actividad_para()` | existen |
> | `destinos.tipo` + `donations.destino_id` | existen |
> | `uq_membresia_viva_por_destino` | índice parcial único sobre `(user_id, destino_id)` where status ∈ pending/active/paused |
> | GRANTs de `anon` | **cero** UPDATE/DELETE/TRUNCATE. Los 5 INSERT que quedan son los formularios públicos |
> | Las seis decisiones de §10.4 | vivas en datos: cuota 5000, meses 1–12, gracia 30, `suspension_corta_acceso=f`, `renumera_al_reingresar=f` |
> | Las 8 funciones del modelo | las 8 presentes (`tiene_acceso` con dos sobrecargas) |
>
> ⚠️ **Un susto que no era:** `reglas_acceso.piso_monto` está en NULL, y §10.4 dice
> «solo si `monto >= piso_monto`» — con NULL esa comparación da NULL y nadie tendría
> acceso. No pasa: `meses_por_donacion` hace `COALESCE(piso_monto, cuota_referencia)`, o
> sea que el piso **cae en la cuota**, que es exactamente lo que la decisión pedía. Vale
> anotarlo porque el próximo que lea §10.4 sin leer la función va a «arreglar» esto.
>
> **Y dos de los pendientes que la sección declaraba ya no lo eran** — están corregidos
> in situ en la tabla de §10.3: la barra de progreso pública existe, y el `SELECT` amplio
> se midió y no expone nada.
>
> **Lo que quedó vivo no se perdió, se subió a `ROADMAP.md`:** las metas de destino sin
> cargar, `reporte_destino()` sin llamador, y el diferencial de socio sin ejercer.

> **Esta sección está cerrada.** Las cinco fases de §10.3 están aplicadas, las seis
> decisiones de negocio de §10.4 están tomadas y viven en datos, y `10.1.a` a `10.1.g`
> están los siete resueltos. Lo único que sigue abierto y se sacó a §13 es el
> **apadrinamiento de cara al público**, que está bloqueado por una consulta legal y no
> por código.
>
> **Se conserva entera igual**, y no por archivo: es el razonamiento que explica por qué
> el esquema es como es, y ya evitó tres errores caros. El relato de cómo se cerró está en
> `HISTORIAL.md` §10.27.
>
> ⚠️ **Tres premisas de esta sección resultaron falsas al construirla**, y están corregidas
> in situ: `10.1.a` (diseñaba `socios` con voto, para una fundación que no tiene voto),
> `10.1.c` (culpaba a `registrations`, y el problema era diez veces más grande y estaba en
> educación) y `10.1.d` («la mitad del valor de ser socio», sobre 12 actividades que son
> todas gratuitas). **Van doce afirmaciones de este repo que se cayeron al verificarlas.**

### 10.0 — Por qué existe esta sección

El proyecto creció de forma iterativa: cada módulo se enganchó cuando hizo falta. Eso
funcionó — las secciones 1 a 9 muestran que **cada módulo está bien construido por
separado**. Lo que nunca se escribió es la **regla que los conecta**: por qué existen
juntos socios, cuota, donaciones, beneficios, sponsors y actividades.

Esa regla existe y es del dueño del proyecto (relevada el 2026-08-16):

> Hay **dos maneras de aportar** — cuota social recurrente o donación puntual — y **una
> sola consecuencia**: acceder a beneficios y descuentos (sponsors, cursos, actividades
> pagas). Lo único que varía entre las dos es **cuánto dura ese acceso**.

Esta sección documenta el estado actual verificado contra el código, propone cómo
codificar esa regla, y deja anotadas las decisiones de negocio que no son técnicas.

**A diferencia del resto del ROADMAP, esto no es deuda: es funcionalidad que falta.**
Ninguno de los ítems de abajo es un bug. Son piezas del modelo que nunca se escribieron.

---

### 10.1 — Estado actual (verificado 2026-08-16, **revalidado contra producción el 2026-09-02**)

> ⚠️ **Cuatro de los siete estaban cerrados y seguían marcados como abiertos.** El
> diagnóstico de abajo se conserva entero porque explica *por qué* cada cosa importaba —
> pero el estado se releyó contra la base, no contra este archivo.
>
> | | Estado al 2026-09-02 | Cómo se verificó |
> |---|---|---|
> | 10.1.a | ✅ resuelto 2026-09-05 | `miembros` + `categorias_miembro` + `reglas_membresia`. **No se llama `socios`**: ver abajo |
> | 10.1.b | ✅ resuelto | `requiere_acceso` en `benefits` y `club_beneficios` |
> | 10.1.c | ✅ resuelto 2026-09-05 | reclamo universal: `fuentes_reclamables` + `reclamar_huellas()` |
> | 10.1.d | ✅ resuelto 2026-09-05 | `precio_general` / `precio_socio` + `precio_actividad_para()` |
> | 10.1.e | ✅ resuelto por otro camino | `destinos.tipo` + `donations.destino_id` |
> | 10.1.f | ✅ resuelto | índice `uq_membresia_viva_por_destino` |
> | 10.1.g | ✅ en su parte peligrosa | `anon` ya no tiene UPDATE/DELETE/TRUNCATE |

- [x] ✅ **10.1.a — No existe la entidad socio.** **RESUELTO el 2026-09-05**, y con una
  corrección al diseño de §10.2 que conviene leer antes de tocar nada:
  **la tabla se llama `miembros`, no `socios`, y en ningún dato aparece la palabra
  "socio".** §10.2 la había diseñado con `otorga_voto` y categorías estatutarias, que es
  el vocabulario de una **asociación civil**. Pero `entidad.tipo = 'fundacion'`: una
  fundación no tiene asociados, ni asamblea, ni voto — tiene consejo de administración.
  Construir `socios` habría metido el vocabulario del cliente 2 dentro del cliente 1.
  Lo que varía por entidad quedó en `reglas_membresia`: `modo_alta`
  (automática ↔ aprobación de comisión), `otorga_voto`, `renumera_al_reingresar` y
  `suspension_corta_acceso`. Las palabras, en `entidad.vocabulario` — que **existía desde
  el 2026-08-16 con la respuesta correcta adentro (`'padrino'`) y no la consumía nadie**.
  El relato está en `HISTORIAL.md` §10.27. *Diagnóstico original abajo:*
  Existen `users` (cuenta de login, `baseline:583`) y `memberships` (suscripción de
  cobro de MercadoPago, `baseline:446`). No existe número de socio, fecha de alta como
  socio, categoría ni estado institucional. `memberships` modela **un cobro recurrente**,
  no una membresía. Buscado `is_socio|socio_activo|estado_socio|member_since|numero_socio`
  en `src/` y `supabase/`: **cero resultados**.

- [x] ✅ **10.1.b — La cuota no habilita nada.** **RESUELTO** — era *el nudo del asunto* y ya
  no lo es: `tiene_acceso()` más `requiere_acceso` en `benefits` y `club_beneficios` hacen que
  un socio vea y pueda canjear lo que un visitante no. `/carnet` y `/club` lo muestran.
  *Diagnóstico original abajo, que es lo que explica por qué se construyó así:*
  Verificado: `BenefitsPage.jsx`, `BenefitDetailPage.jsx`, `BenefitCard.jsx`,
  `Activities.jsx` y `ActivityDetailPage.jsx` **no consultan `memberships` en ningún
  punto**. Un visitante sin cuenta ve y usa exactamente lo mismo que un socio que paga
  hace tres años. El sistema cobra una cuota que, dentro del sistema, no otorga ningún
  privilegio. **Esta es la causa de que los módulos se sientan sueltos**: no falta
  pegamento entre ellos, falta el concepto que los enhebra.

- [x] ✅ **10.1.c — Cuatro identidades paralelas de la misma persona.** **RESUELTO el
  2026-09-05 con un mecanismo, no con un parche por tabla**: `fuentes_reclamables` es un
  registro de qué tablas guardan huellas de gente sin cuenta, y `reclamar_huellas()` las
  vincula todas con email verificado. Un cliente nuevo agrega una fila, no escribe SQL.
  Tiene **lista negra**: `donations`, `memberships`, `aportes`, `miembros`, `users` y
  `club_canjes` se rechazan, porque vincularlas no es reconocer a alguien sino
  **otorgarle privilegios** — para eso está `reclamar_donaciones()` (§10.19), que se
  invoca, no se copia.
  ⚠️ **Y este ítem tenía mal el diagnóstico.** Nombraba a `registrations` y a educación
  como el mismo problema: `registrations` tiene 5 filas y **0 invitados**, ahí no había
  nada que reconciliar. El problema era uno solo y diez veces más grande —
  `education_preinscriptions`: **160 filas, 156 emails distintos, y solo 4 con cuenta**,
  contra 23 usuarios y 1 con acceso vigente. *Diagnóstico original abajo:*
  | Dónde | Campos | Se vincula a `users`? |
  |---|---|---|
  | `users` | `email` (unique), `dni`, `phone` | es la cuenta |
  | `registrations` | `guest_name`, `guest_email` | **no** — el CHECK `check_registration_type` fuerza que sea `user_id` **o** invitado, nunca ambos |
  | `education_preinscriptions` | `email`, `full_name`, `dni`, `phone` | solo si había sesión abierta al enviar (`educationApi.js:41`); si no, queda huérfano |
  | `memberships` | `payer_email` | es el mail de MercadoPago, puede diferir del de la cuenta |
  Nada reconcilia los cuatro. La misma persona puede donar, preinscribir a un hijo,
  anotarse de invitada y ser socia, y el sistema la ve como cuatro personas distintas.

- [x] ✅ **10.1.d — Las actividades no tienen precio.** **RESUELTO el 2026-09-05**:
  `precio_general` (0 = gratuita) + `precio_socio` (NULL = aplicar el descuento de la
  categoría; 0 = gratis para miembros), y `precio_actividad_para()` como única fuente del
  cálculo — la card, el detalle y el checkout preguntan y no reimplementan nada.
  ⚠️ **Pero la premisa de este ítem era falsa y conviene no repetirla.** Decía que la
  distinción gratis/pago es «la mitad del valor de ser socio». Medido el 2026-09-05: hay
  **12 actividades y ninguna menciona arancel, precio ni cuota**. Son todas gratuitas de
  hecho, así que al aplicar la migración **en la pantalla no cambia nada**. Se construyó
  igual, y por otro motivo: el día que exista la primera actividad arancelada el esquema
  tiene que estar, porque si no ese día se cobra por afuera. *Diagnóstico original:*
  `activities` (`baseline:333`) tiene título, descripción, fecha, duración, modalidad,
  cupo, imágenes y redes. **Ningún campo de precio, arancel o costo.** La distinción
  "algunas actividades son gratis y otras pagas" —que es la mitad del valor de ser
  socio— hoy no existe en la base.

- [x] ✅ **10.1.e — No hay campañas.** **RESUELTO POR OTRO CAMINO, y conviene saber cuál:**
  nunca se creó la tabla `campanas`. §10.9 unificó los tres tipos de destino en **una sola
  tabla** `destinos` (`tipo`: `campana | padrinable | institucional`), y `donations.destino_id`
  cierra el circuito. Hoy hay 11 destinos cargados. *Diagnóstico original:*
  `donations.donation_type` (`baseline:405`) es `text NOT NULL`, pero el único lugar del
  código que lo menciona es `DonationList.jsx:35`, que **lo lee**. No hay tabla de
  campañas ni iniciativas. "Doné para esta causa puntual" no está modelado.

- [x] ✅ **10.1.f — Un socio puede acumular varias membresías activas.** **RESUELTO** — existe
  el índice `uq_membresia_viva_por_destino`. Permite a propósito una membresía viva *por
  destino*, que es lo que el modelo de §10.9 quiere. *Diagnóstico original:*
  Sin restricción de unicidad sobre `memberships`. `getUserMemberships` y el Dashboard ya
  operan sobre un array, así que la UI lo asume. Un doble pago deja dos suscripciones
  cobrando en paralelo.

- [x] ✅ **10.1.g — Permisos de `anon` más amplios de lo necesario.** **RESUELTO EN SU PARTE
  PELIGROSA** por la migración de §C: `anon` ya no tiene `UPDATE`, `DELETE`, `TRUNCATE` ni
  `REFERENCES` sobre ninguna tabla — solo `SELECT` y los `INSERT` que el sitio necesita.
  **Queda el `SELECT` amplio**, que es defensa en profundidad y vive en §A. *Original:*
  `baseline:1029-1065`: `GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE`
  a `anon` sobre `users`, `memberships`, `donations`, `registrations` y
  `education_preinscriptions`.
  **No es un agujero hoy**: RLS está habilitado en las 15 tablas (`baseline:893-955`) y
  deniega por defecto toda operación sin policy; además PostgREST no expone `TRUNCATE`.
  Pero deja el margen de error en cero: **cualquier policy nueva mal escrita pasa de ser
  demasiado permisiva a ser destructiva.** Se vuelve crítico con `aportes` (10.2), que es
  la tabla que otorga privilegios.

---

### 10.2 — Diseño propuesto

**Decisión de diseño central: la entidad protagonista es el _acceso_, no el _socio_.**

Si se modela "socio" como concepto central, el donante queda como ciudadano de segunda
—tiene beneficios pero no es socio— y toda consulta termina en un `OR` incómodo.
Modelando **acceso**, los dos caminos tienen la misma forma y el sistema entero hace una
sola pregunta: *¿esta persona tiene acceso vigente, y hasta cuándo?*

Eso **no elimina** la entidad socio: la separa. Son dos cosas distintas y conviene que lo
sigan siendo:

| Concepto | Qué es | Se deriva de |
|---|---|---|
| **Acceso** | Derecho a beneficios y descuentos, con vencimiento | Los aportes (calculado) |
| **Socio** | Condición institucional: número, antigüedad, categoría, voto | Decisión de la entidad (dato propio) |

Un socio suspendido por la comisión no es lo mismo que un socio atrasado en el pago, y
con esta separación se pueden expresar los dos.

#### Tablas nuevas

```sql
-- 1) Categorías de socio (necesaria apenas haya más de un monto de cuota)
create table public.categorias_socio (
  id                        uuid primary key default gen_random_uuid(),
  nombre                    text not null,              -- 'Activo', 'Adherente', 'Protector'
  cuota_mensual             numeric not null check (cuota_mensual >= 0),
  descuento_actividades_pct integer not null default 0
                              check (descuento_actividades_pct between 0 and 100),
  otorga_voto               boolean not null default true,
  activa                    boolean not null default true,
  orden                     integer not null default 0,
  created_at                timestamptz not null default now()
);

-- 2) Campañas / iniciativas puntuales (le da destino a la donación)
create table public.campanas (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  slug         text not null unique,
  descripcion  text,
  meta_monto   numeric check (meta_monto > 0),
  fecha_inicio date,
  fecha_fin    date,
  imagen_url   text,
  estado       text not null default 'borrador'
                 check (estado in ('borrador','activa','cerrada')),
  created_at   timestamptz not null default now(),
  constraint campanas_fechas_chk check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

-- 3) APORTES — el libro único. Todo lo que entra cae acá.
create table public.aportes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.users(id) on delete set null,
  tipo           text not null check (tipo in ('cuota','donacion')),
  monto          numeric not null check (monto > 0),
  fecha          timestamptz not null default now(),
  membership_id  uuid references public.memberships(id) on delete set null,
  donation_id    uuid references public.donations(id)   on delete set null,
  campana_id     uuid references public.campanas(id)    on delete set null,
  acceso_desde   date not null,
  acceso_hasta   date not null,
  -- identidad de respaldo: permite reconciliar a quien aportó sin cuenta (10.1.c)
  email_aportante  text,
  nombre_aportante text,
  created_at     timestamptz not null default now(),
  constraint aportes_origen_chk check (
    (tipo = 'cuota'    and membership_id is not null and donation_id   is null) or
    (tipo = 'donacion' and donation_id   is not null and membership_id is null)
  ),
  constraint aportes_rango_chk check (acceso_hasta >= acceso_desde)
);
create index idx_aportes_user_vig  on public.aportes(user_id, acceso_hasta desc);
create index idx_aportes_email     on public.aportes(lower(email_aportante));
create index idx_aportes_campana   on public.aportes(campana_id);
```

**Por qué un libro y no calcularlo al vuelo desde `memberships` + `donations`:** es el
historial que se le muestra al socio ("aportaste 14 veces desde 2023"), es lo que se le
pasa al contador, es lo que hace computable la antigüedad, y sobre todo **desacopla el
acceso del medio de pago** — el día que entre otro proveedor además de MercadoPago, o un
aporte en efectivo cargado a mano, `aportes` no cambia.

```sql
-- 4) Socios — la condición institucional, que NO se deriva del pago
create table public.socios (
  user_id       uuid primary key references public.users(id) on delete cascade,
  numero_socio  bigint generated always as identity unique,
  categoria_id  uuid references public.categorias_socio(id) on delete set null,
  fecha_alta    date not null default current_date,
  fecha_baja    date,
  estado        text not null default 'activo'
                  check (estado in ('activo','suspendido','baja')),
  observaciones text,
  constraint socios_baja_chk check (fecha_baja is null or fecha_baja >= fecha_alta)
);

-- 5) Regla de conversión donación → acceso (configurable POR CLIENTE, ver 10.5)
create table public.reglas_acceso (
  id                uuid primary key default gen_random_uuid(),
  cuota_referencia  numeric not null check (cuota_referencia > 0),
  piso_monto        numeric not null default 0,   -- debajo: se agradece, no da acceso
  meses_minimos     integer not null default 1,
  meses_maximos     integer not null default 12,
  vigente           boolean not null default true
);
```

#### La función que consulta todo el sistema

```sql
create or replace function public.acceso_vigente(p_user_id uuid)
returns table (tiene_acceso boolean, vence_el date, origen text)
language sql stable security definer set search_path = public as $$
  select
    coalesce(max(acceso_hasta) >= current_date, false),
    max(acceso_hasta),
    (array_agg(tipo order by acceso_hasta desc))[1]
  from public.aportes
  where user_id = p_user_id;
$$;

-- Versión booleana, para usar dentro de policies RLS sin recursión
create or replace function public.tiene_acceso(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.aportes
    where user_id = p_user_id and acceso_hasta >= current_date
  );
$$;
```

**Una sola función.** Beneficios, actividades, cursos y el panel del socio la consultan;
la lógica no se reparte por la UI. Es el mismo patrón que `is_board_member()`
(`CLAUDE.md`, modelo de seguridad), que ya demostró funcionar.

#### Cambios a tablas existentes

```sql
alter table public.activities
  add column precio_general numeric not null default 0 check (precio_general >= 0),
  add column precio_socio   numeric check (precio_socio >= 0);
  -- precio_general = 0  → actividad gratuita (resuelve 10.1.d)
  -- precio_socio NULL   → aplica el descuento de la categoría del socio

alter table public.benefits
  add column requiere_acceso boolean not null default false;
  -- false = beneficio abierto (comportamiento actual, no rompe nada)
  -- true  = solo para quien tiene acceso vigente

alter table public.donations
  add column campana_id uuid references public.campanas(id) on delete set null;
```

Los cursos del módulo educación necesitan el mismo par de precios, pero hoy no existe
tabla `cursos` — solo `education_preinscriptions`. Se resuelve cuando exista.

#### RLS — el punto más delicado

`aportes` **es la tabla que otorga privilegios**. Si alguien puede insertar ahí, se
autoconcede beneficios. Reglas mínimas:

- `aportes`: **`anon` sin ningún permiso.** `INSERT`/`UPDATE` exclusivamente con
  `service_role` desde el webhook de pagos. `SELECT` propio para el socio, total para
  admin y comisión. **No repetir el patrón de GRANTs amplios de 10.1.g.**
- `socios`: lectura propia + admin/comisión; escritura solo admin.
- `campanas`: lectura pública de las `activa`; escritura admin.
- `categorias_socio`: lectura pública (hay que mostrar los planes); escritura admin.
- `reglas_acceso`: lectura pública no hace falta; escritura admin.

---

### 10.3 — Orden de implementación

El orden importa: cada fase se apoya en la anterior y **la fase 2 es la que responde la
pregunta original** (por qué los módulos se sienten desconectados).

| Fase | Qué | Esfuerzo | Deja algo usable? |
|---|---|---|---|
| **0** | ~~Arreglar el orden de migraciones~~ **✅ HECHO 2026-08-16** — ver `HISTORIAL.md` | ~2-3 h | Prerrequisito, ya cubierto |
| **1** | ~~`aportes` + `acceso_vigente()` + `tiene_acceso()` + backfill~~ **✅ HECHO 2026-08-30** (§10.17) | ~2-3 días | Historial de aportes en el panel del socio |
| **2** | ~~`requiere_acceso` en beneficios + `precio_general`/`precio_socio` en actividades~~ **✅ COMPLETA 2026-09-05** (10.1.d) | — | ⚠️ Con 12 actividades gratuitas, **hoy no cambia nada en pantalla**. Ver 10.1.d |
| **3** | ~~`campanas` + FK desde donaciones~~ **✅ RESUELTO POR OTRO CAMINO**: no hay tabla `campanas`; §10.9 unificó en `destinos` (`tipo`) + `donations.destino_id`. **La barra de progreso pública TAMBIÉN existe** (verificado 2026-09-08): está en `SelectorDestino.jsx:38-40` y sale de `destinos.monto_recaudado` / `meta_monto`, no de `reporte_destino()`. Lo que falta es **cargar metas**, no código | — | Donaciones dirigidas |
| **4** | ~~`socios` + `categorias_socio`~~ **✅ HECHA 2026-09-05 como `miembros`** (10.1.a). El carnet ya muestra número, categoría y condición, además del acceso | — | Carnet, antigüedad, categorías, padrón en `/admin` |
| **5** | ~~Unicidad de membresía activa (10.1.f)~~ **✅** + achicar GRANTs (10.1.g) **✅**. El `SELECT` amplio quedó, pero **se midió el 2026-09-08 y no expone nada**: RLS activa en las 24 tablas, y asumiendo el rol `anon` se ven 0 filas de `users` (de 23), `donations` (de 6), `memberships` (de 18), `email_log` (de 31), `education_preinscriptions` (de 160) y `tasks` (de 61). Solo `gastos` es visible, a propósito: es la rendición pública | casi nada | Higiene |

**La fase 0 ya está hecha** (2026-08-16). Era el prerrequisito de todo lo demás: las
migraciones no reconstruían la base desde cero, y las 5 nuevas de la fase 1 se habrían
apilado sobre una cadena rota. Ahora `supabase db push` levanta el esquema completo
desde cero, que es lo que hace viable el objetivo multi-cliente (10.6).

#### Backfill (parte de la fase 1, no la subestimes) — ✅ CORRIDO el 2026-08-30

> Recuperó 2 de 5 donaciones. Las otras 3 llegaron sin `payer_email` y son la causa del
> bloqueante que sigue vivo. El relato está en `HISTORIAL.md` §11.5.

Hay que volcar `memberships` y `donations` existentes a `aportes`. Requisitos:
- **Idempotente**, como el resto de las migraciones del repo.
- Decisión previa: *¿desde qué fecha se reconoce antigüedad?* Si se toma
  `memberships.created_at`, quien pausó y retomó pierde continuidad.
- Verificar contra Docker con `supabase/checks/` antes de tocar producción — el
  procedimiento está en `supabase/checks/README.md` y en `HISTORIAL.md` §8, Sesión F2.

---

### 10.4 — Decisiones de negocio pendientes (no son técnicas)

> ✅ **Las cinco están tomadas y viven en datos** (2026-09-05). Se conservan enteras porque
> explican *por qué* cada respuesta es la que es — y porque en otra entidad la respuesta
> puede ser distinta, que es exactamente el punto de §10.5.
>
> | | Respuesta | Dónde vive |
> |---|---|---|
> | 1. Meses por donación | Proporcional, piso = la cuota | `reglas_acceso` (§10.17) |
> | 2. Donante vs. socio | Mismo catálogo; la condición institucional es aparte | `miembros` ≠ `aportes` (§10.2) |
> | 3. Gracia al fallar el cobro | 30 días, solo para aportes tipo cuota | `reglas_acceso.dias_gracia` |
> | 4. Antigüedad y número al reingresar | **Antigüedad nunca se reinicia** (`antiguedad_socio()` la deriva de los aportes); el **número se conserva** salvo que la entidad pida lo contrario | `reglas_membresia.renumera_al_reingresar` |
> | 5. Beneficios exclusivos | Excepción, no regla: default `false` | `benefits.requiere_acceso` |
>
> **Y apareció una sexta que §10.2 no había previsto:** *¿suspender a alguien le quita los
> beneficios, o solo la condición institucional?* Las dos respuestas son legítimas y
> ninguna es «la del software». Default `false` —el conservador— en
> `reglas_membresia.suspension_corta_acceso`.
>
> La sexta de §10.7 —*¿la entidad está dispuesta a rendir cuentas por campaña?*— quedó
> respondida por los hechos: `/rendicion` existe y está publicada.

Ninguna de estas la puede tomar quien escribe el código:

1. **¿Cuántos meses de acceso otorga una donación puntual?**
   → **Recomendado: proporcional, no fijo.**
   `meses = least(máximos, greatest(mínimos, floor(monto / cuota_referencia)))`, y solo
   si `monto >= piso_monto`.
   **Por qué no un plazo fijo:** "cualquier donación da 6 meses" canibaliza la cuota — con
   una donación chica se obtiene medio año y nadie paga todos los meses. Proporcional es
   auto-explicable ("donaste el equivalente a 3 cuotas, tenés 3 meses") y donar nunca
   sale más barato que ser socio.

2. **¿El donante accede a los mismos beneficios que el socio?**
   → **Recomendado: al mismo catálogo de descuentos, pero el socio conserva lo que el
   donante no puede tener**: antigüedad acumulada, número de socio, carnet, prioridad de
   cupo y voz en asamblea. Si los dos obtienen exactamente lo mismo, la cuota pierde el
   sentido simbólico que se busca. Además coincide con la realidad legal: en una
   asociación civil el socio tiene derechos estatutarios que el donante no tiene.

3. **¿Hay período de gracia cuando falla el cobro?**
   → **Recomendado: 30 días.** Los cobros recurrentes fallan por motivos técnicos
   (tarjeta vencida, límite) más que por decisión. Cortar el acceso al día siguiente
   genera bronca y llamados a la comisión por algo que se resuelve solo.

4. **¿La antigüedad se pierde al darse de baja y volver?** Afecta `socios.fecha_alta`
   y si se conserva o se reasigna el `numero_socio`.

5. **¿Los beneficios exclusivos son la regla o la excepción?** Define el default de
   `benefits.requiere_acceso`. Se propone `false` para no cambiar el comportamiento
   actual al aplicar la migración.

---

### 10.5 — Por qué esto se configura y no se hardcodea

Todo lo de 10.4 son **parámetros de la entidad, no del software**. Un club va a querer
gracia de 60 días y tope de 24 meses; una fundación, 30 y 12. Por eso `reglas_acceso` y
`categorias_socio` son tablas y no constantes en el código.

Es el mismo criterio que el ítem 3.4 (datos institucionales hardcodeados) y el mismo que
hará falta para el objetivo multi-cliente: **lo que varía por entidad va en datos.**

---

### 10.6 — Impacto en el objetivo "producto multi-cliente"

Este modelo es lo que convierte el proyecto de *sitio de una fundación* en *producto para
entidades con socios*: **aporte → acceso** es exactamente el modelo de un club, una
mutual, una cámara o una cooperativa de servicios.

Los tres bloqueantes reales para un segundo cliente, en orden:

1. ~~**`src/lib/supabase.js` cae a la URL y anon key de producción**~~ — **resuelto el
   2026-08-16.** Ahora tira si faltan `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
   Verificado: un build sin variables **ya no contiene la URL de producción en ningún
   chunk** (antes quedaba horneada) y el DOM da 3,3 KB sin `<nav>` ni `<footer>` — la
   firma de sitio roto documentada en §B. Falla a la vista en vez de escribir en la base
   de la Fundación.
2. ~~**Las migraciones no reconstruyen desde cero**~~ — **resuelto el 2026-08-16**
   (`HISTORIAL.md`). Sin eso, "levantar un cliente
   nuevo" es trabajo manual, no un comando. Es la fase 0 de 10.3.
3. **Marca y textos hardcodeados** en ~40 archivos (ítem 3.4 y afines). **Parcialmente
   resuelto el 2026-08-16:** existe `src/config/entidad.js` como archivo único de la
   entidad y están migrados `Header`, `Footer`, `BottomNavBar` y `resource-state`.
   Falta el resto de las páginas y `api/share/*` (ver CLAUDE.md).

Ninguno de los tres es este modelo de dominio — pero **conviene resolver el 2 antes de
empezar la fase 1**, porque cada migración nueva agranda ese problema.

---

### 10.7 — Qué es realmente un aporte (2026-08-16)

> Esta sección **corrige y profundiza la premisa de 10.0**. No la reemplaza: el modelo de
> tablas de 10.2 sigue en pie. Lo que cambia es *qué consecuencia* tiene un aporte, y de
> ahí se desprende una pieza que faltaba.

#### El problema con "una sola consecuencia"

La regla relevada en 10.0 dice que hay dos maneras de aportar y **una sola consecuencia:
acceder a beneficios**, y que lo único que varía es cuánto dura ese acceso.

La primera mitad es correcta y es la buena idea del modelo: cuota y donación son la misma
cosa —un aporte— y conviene un libro único. **La segunda mitad es la que deja el modelo
hueco.** Si la única consecuencia de aportar es acceder a descuentos, la entidad se
convierte en un club de beneficios, y ahí pierde siempre: el socio hace la cuenta de
"¿qué me dan por mi plata?" y cualquier alternativa comercial le da más.

Peor todavía para el objetivo de 10.6: **acceso-por-pago es exactamente lo que ya hacen
CuotaQ, SIGCLU, DigitalClub y PortalSocios**, que llevan años en eso y compiten por
precio. Construir solo eso es llegar último a una pelea ya perdida.

#### Por qué la gente aporta a una entidad civil

En orden aproximado de peso real, el acceso es el más débil de los cinco:

| Motivo | Qué busca | ¿Lo cubre el modelo actual? |
|---|---|---|
| **Pertenencia** | Ser parte, y que se note. Antigüedad, número de socio | No |
| **Causa** | Que esto exista. Sostener algo concreto | No |
| **Confianza** | Saber que la plata hizo algo | No |
| **Reconocimiento** | Que la entidad sepa quién sos | No |
| **Reciprocidad** | Descuentos y beneficios | Sí, es lo único |

**El modelo cubre el motivo más débil y ninguno de los cuatro fuertes.** Esa es la razón
de fondo por la que los módulos se sienten sueltos, y es más profunda que la de 10.1.b.

#### La corrección: un aporte tiene tres consecuencias, no una

1. **Destino** — a qué se aplicó. Es lo que convierte "pagué una cuota" en "sostuve el
   taller de robótica". Hoy no existe: `donation_type` es texto libre sin escritor
   (10.1.e) y no hay campañas.
2. **Pertenencia** — la historia acumulada. "Aportaste 14 veces desde 2023, sostuviste
   3 proyectos, sos socio hace 4 años." Es un *derivado* del libro `aportes`, así que
   sale casi gratis una vez que el libro existe.
3. **Acceso** — los beneficios. Real, pero tercero.

Lo que hay que **agregar** al diseño de 10.2 es el **destino y su rendición**: el circuito
`aporte → destino → impacto → se lo mostramos a quien aportó`. Ese circuito cerrado es la
pieza que no tiene ningún competidor.

Esto **promueve a `campanas`**: en 10.3 estaba en la fase 3 como "donaciones dirigidas",
una funcionalidad más. No lo es: es el mecanismo por el cual un aporte adquiere
significado. **Conviene subirla a la fase 2.**

#### Cuota y donación no son lo mismo con distinta duración

10.0 las aplana en "varía cuánto dura el acceso". Se comportan distinto porque el motivo
es distinto, y el producto debería reflejarlo:

- **Cuota** — recurrente. Su valor es la **pertenencia sostenida**: identidad, antigüedad,
  condición institucional. Se renueva sola; se pierde por olvido, no por decisión.
- **Donación** — puntual. Su valor es la **causa concreta**: esto, ahora. Se decide cada
  vez y necesita un destino visible para repetirse.

De ahí sale una consecuencia práctica: a la cuota se la sostiene **recordándole al socio
por qué es socio**; a la donación se la repite **mostrando qué pasó con la anterior**. Son
dos mecánicas de producto distintas, no un parámetro de duración.

#### Por qué además es la diferencia comercial

Los productos del mercado optimizan la **cobranza**: recordatorios, morosidad, débito
automático. Es una palanca de extracción y está saturada.

La palanca que nadie toca es la **retención por sentido**. Nadie deja de pagar la cuota
porque el recordatorio llegó tarde; deja de pagar porque se olvidó de para qué la pagaba.
Un sistema que le muestra a cada aportante qué sostuvo ataca la causa en vez del síntoma
— y de paso hace que el próximo aporte sea más probable.

#### Implicación de esquema (se suma a 10.2, no lo reemplaza)

```sql
-- `aportes` necesita destino explícito, no solo origen de pago:
--   campana_id ya estaba previsto en 10.2  -> pasa a ser central, no opcional
-- y hace falta poder rendir:
alter table public.campanas
  add column monto_recaudado numeric not null default 0,  -- desnormalizado, para la barra
  add column rendicion_md    text;                        -- qué se hizo con la plata

-- La vista que le da sentido al aporte, y la pantalla que vende:
--   "aportaste N veces, sostuviste estas campañas, sos socio desde X"
-- Se deriva de `aportes`; NO es una tabla nueva.
-- ⚠️ Crearla con security_invoker = true (ver migración 20260816120000).
```

#### La pantalla que hay que construir para mostrar esto

**El estado de cuenta del aportante**: historial, total acumulado, antigüedad, campañas
sostenidas y —solo al final— los beneficios vigentes. Es la demo que se le muestra a una
comisión directiva y es lo que ningún competidor puede mostrar. Va en el Dashboard, que ya
existe.

#### Qué queda para decidir con la Fundación

Las cinco preguntas de 10.4 siguen abiertas y son previas al código. Se les suma una:
**¿la entidad está dispuesta a rendir cuentas por campaña?** Si la respuesta es que no
—que no quiere publicar en qué se gastó— todo este circuito se cae y conviene saberlo
antes de construirlo.

---

### 10.8 — El modelo real de la Fundación, relevado (2026-08-16)

> Relevado con el dueño el mismo día. **Esto reemplaza la premisa de 10.0 y ajusta la
> 10.7**: no hay dos maneras de aportar sino tres, y no se distinguen por duración.

#### Las tres formas de aportar

| | Qué es | Temporalidad | Destino |
|---|---|---|---|
| **Campaña puntual** | Materiales (pelotas, conos), profesionales (nutricionista, psicólogo, preparador físico, acompañamiento docente) | Puntual | Una **cosa** concreta y finita |
| **Apadrinamiento** | Cubrir la cuota de la escuelita formativa o de inferiores de un chico | Recurrente | Una **persona** (o un cupo) |
| **Cuota social** | Aporte simbólico para sostener la estructura: administración, alquiler, sueldos | Recurrente | La **institución** |

#### Por qué esto rompe el modelo de 10.0

10.0 decía: *"dos maneras de aportar, una sola consecuencia, lo único que varía es cuánto
dura el acceso"*. Con el modelo real a la vista, **la duración no es el eje**. Hay dos
ejes independientes:

- **Temporalidad**: puntual ↔ recurrente
- **Destino**: una cosa ↔ una persona ↔ la institución

**El apadrinamiento es el que rompe la simetría**: es recurrente *y* dirigido. Si se
asume "recurrente = cuota social", el apadrinamiento no tiene dónde vivir — y es
justamente el producto más vendible de los tres. La cuota social es recurrente y **no**
dirigida; son cosas distintas que hoy comparten la misma tabla `memberships`.

#### ⚠️ El sistema ya promete apadrinamiento y no lo tiene

Verificado en el código:

- `MembershipList.jsx:84` — *"Gestión de la red de padrinos y sostenimiento mensual"*
- `MembershipList.jsx:131` — columna *"Padrino / Madrina"*
- `DashboardHeader.jsx:113` — el rol que muestra es literalmente `'Padrino'`
- `Agradecimiento.jsx:52` — *"Te damos una cálida bienvenida como padrino/madrina"*
- `membershipApi.js:190` — el `reason` que va a MercadoPago es *"Beca mensual"*

**Pero en la base no hay ningún padrinazgo.** `memberships` es una suscripción de
MercadoPago con `plan` (texto), `amount` y `preapproval_id`: sin beneficiario, sin cupo,
sin programa, sin destino. La suscripción se crea eligiendo **solo un monto** entre seis
opciones (`Collaborate.jsx:31-38`). **El vocabulario del producto ya promete lo que el
modelo de datos no puede sostener** — y es exactamente el hueco de 10.1.b, pero peor,
porque acá sí se prometió explícitamente.

#### ⚠️ Falta la mitad del libro: no hay egresos

Para "mostrar en qué se gastó cada peso" hacen falta **las dos columnas**. Hoy:

- **Ingresos**: parcial. `donations` y `memberships` registran plata que entra, sin destino.
- **Egresos**: **no existe absolutamente nada.** Buscado `gasto|egreso|expense|comprobante|
  factura|rendicion` en `src/` y `supabase/`: cero resultados de modelo. La única
  aparición es `Collaborate.jsx:348`, que **le promete al donante "Recibís comprobante
  oficial"**.

Esto corrige lo que decía 10.7. Ahí se propuso `campanas.rendicion_md text`, un campo de
texto libre. **Es insuficiente para lo que se quiere hacer**: una rendición creíble no es
un párrafo escrito a mano, es la suma de gastos reales con su comprobante adjunto,
contrastable contra lo recaudado. Hace falta una tabla `gastos`, no un campo.

**La buena noticia:** la infraestructura de comprobantes **ya existe y está probada**.
`documents` + `document_versions` + el bucket privado `comision-docs` con policies sobre
`is_board_member()` es exactamente el mecanismo de "archivo adjunto versionado con acceso
restringido". Se reusa, no se construye.

#### ⚠️ Menores: la restricción de diseño que condiciona todo el apadrinamiento

Los beneficiarios son **chicos**. Y los servicios que se quieren financiar
—nutricionista haciendo mediciones, psicólogo, preparador físico— **generan datos de
salud de menores**, que en Argentina son datos sensibles (Ley 25.326) y suman las
protecciones de la Ley 26.061 sobre dignidad e imagen de niñas, niños y adolescentes.

**Dos reglas de diseño que salen de esto, y conviene tomarlas antes de escribir el
esquema:**

1. **El padrino apadrina un _cupo_ o una _beca_, nunca un chico identificado.** Nada de
   "apadriná a Juan, 12 años, foto". El reporte de impacto va anonimizado y agregado
   ("tu beca cubrió la cuota de un chico de la categoría 2012; este trimestre hubo 24
   entrenamientos y 2 controles nutricionales"). Esto **no** debilita el producto: la
   evidencia de fundraising dice que el vínculo con el *programa* retiene parecido al
   vínculo con la persona, y sin el riesgo.
2. **Los datos clínicos no van en este sistema.** Ni en v1 ni probablemente nunca. Que
   la nutricionista y el psicólogo lleven su registro donde corresponde; el sistema
   guarda que *se prestó el servicio*, no *qué dio el resultado*. Mezclar historia
   clínica de menores con una base que tiene páginas públicas y anon con `SELECT` es
   pedir un incidente.

→ **Esto requiere asesoramiento legal antes de construir**, no después: consentimiento
de los tutores, qué se puede publicar y qué no. No es una decisión de arquitectura.

#### Qué hay y qué falta

| Pieza | Estado |
|---|---|
| Cobro recurrente y puntual (MercadoPago) | ✅ Funciona |
| Roles, RLS, panel admin, portal de comisión | ✅ Funciona |
| Storage privado + documentos versionados (→ comprobantes) | ✅ Reusable tal cual |
| Campañas con meta y estado | ✅ `destinos` (§10.9), 11 cargados |
| Libro de aportes con destino | ✅ `aportes` (§10.11) |
| **Gastos + comprobante + balance por campaña** | ✅ `gastos` + `/rendicion` (§10.12) |
| Cupos/becas y apadrinamiento **sin** beneficiario identificado | ✅ `padrinazgos` + `hitos_destino` (2026-09-05). ⚠️ La **vidriera pública** va en §13: falta legal |
| Rendición pública | ✅ `/rendicion` |

**No es "deuda técnica": es funcionalidad que nunca se construyó.** La deuda real que sí
bloquea es corta: `donation_type` es texto libre sin escritor (10.1.e), `memberships` no
tiene destino ni unicidad (10.1.f), y la migración de seguridad de §C sigue sin aplicarse.

#### Orden sugerido

| Fase | Qué | Aprox. |
|---|---|---|
| **1** | `campanas` (tipo, meta, estado) + `aportes` con `campana_id` + elegir destino en el checkout | ~1 semana |
| **2** | `gastos` + comprobante reusando Storage + balance por campaña | ~1 semana |
| **3** | Rendición pública: barra de progreso y "así se gastó" | ~4-5 días |
| **4** | ~~Cupos/becas + apadrinamiento anonimizado + reporte al padrino~~ **✅ EL ESQUEMA, 2026-09-05.** El sistema **no tiene ninguna columna donde guardar la identidad de un beneficiario**, así que las dos reglas de arriba se cumplen por estructura y no por disciplina. Falta la **vidriera pública** → §13 | hecho + legal |

⚠️ **Regla de lanzamiento: no publicar campañas antes de que funcione la fase 2.**
Prometer "te muestro en qué se gastó" y no mostrarlo es peor que no prometerlo — y
`Collaborate.jsx:348` ya lo promete hoy.

---

### 10.9 — El modelo genérico: de la Fundación al producto (2026-08-16)

> 10.8 relevó **cómo funciona la Fundación**. Esta sección abstrae eso a un modelo que
> sirve para cualquier entidad que recaude y rinda cuentas, sin que el esquema tenga que
> saber si sus beneficiarios son chicos, perros o libros.

#### La idea que unifica: todo aporte va a un *destino*

Las tres formas de 10.8 no son tres cosas distintas: son **tres tipos del mismo
concepto**. Un destino es *aquello a lo que se le puede dar plata*, y hay tres:

| Tipo | Qué es | Finito | Recurrente | Ejemplos por rubro |
|---|---|---|---|---|
| `campana` | Un objetivo concreto con meta | Sí, cierra | No | Pelotas y conos · Operar a un perro · Techo del salón |
| `padrinable` | Un sujeto sostenido en el tiempo | No | Sí | Beca de un chico · Un animal del refugio · Una hectárea |
| `institucional` | La entidad misma | No | Sí | Cuota social: administración, alquiler, sueldos |

**Por qué conviene una sola tabla y no tres:** los tres reciben aportes, consumen gastos y
se rinden igual. Si son tablas separadas, cada consulta del libro necesita tres joins y
tres caminos; unificados, **la rendición es una sola consulta** y el libro tiene una sola
clave foránea. El costo es un discriminador `tipo` con algunas columnas que no aplican a
todos (`meta_monto` es null en `institucional`), y ese costo es mucho menor.

```
entidad
  └── destinos (tipo: campana | padrinable | institucional)
        ├── aportes  (ingresos)  → destino_id
        └── gastos   (egresos)   → destino_id + comprobante

  saldo(destino) = Σ aportes − Σ gastos      ← la rendición, para los tres tipos
```

#### La variable que descubre el ejemplo del refugio

El caso "refugio de animales" no es un ejemplo más: **expone la única diferencia real
entre rubros**, y es una que 10.8 dio por sentada.

En la Fundación, el padrinable **no se puede mostrar**: son menores, y de ahí salieron las
dos reglas de 10.8 (cupo anonimizado, sin datos clínicos). En un refugio pasa **lo
contrario**: "Apadriná a Rocky", con foto, nombre e historia, **es el motor entero de la
recaudación**. Un perro no tiene derecho a la intimidad; un chico sí.

Si el esquema se escribe pensando solo en la Fundación, sale anonimizado por dentro y no
sirve para el refugio. Si se escribe pensando solo en el refugio, sale identificable y
**expone menores en el primer cliente**. Los dos errores son caros y evitables:

```sql
-- La visibilidad del beneficiario es un dato del destino, no una regla del código.
visibilidad_beneficiario text not null default 'anonimizado'
  check (visibilidad_beneficiario in ('publico','anonimizado'))
```

**El default es `anonimizado` a propósito.** Es la regla de "seguro por defecto": si
alguien crea un destino y no piensa en esto, no expone a nadie. Mostrar un beneficiario
tiene que ser un acto deliberado.

| Rubro | Padrinable | Visibilidad |
|---|---|---|
| Fundación con chicos | Beca / cupo en un programa | `anonimizado` |
| Refugio de animales | El animal, con foto y nombre | `publico` |
| Club deportivo | Una categoría o división | `publico` (es un colectivo) |
| Comedor comunitario | Una ración diaria | `anonimizado` |
| Biblioteca popular | Un fondo o una sección | `publico` |

#### La otra variable: el vocabulario

Un refugio no dice "socio", dice "padrino". Una cámara dice "asociado". Un club dice
"hincha" o "socio". Que el producto se sienta propio depende de que hable el idioma del
rubro, y eso **no justifica un fork**: va en `src/config/entidad.js`, junto al resto de lo
que ya se movió a datos el 2026-08-16.

```js
// en entidad.js
vocabulario: {
  aportante:     'padrino',        // 'socio' | 'asociado' | 'padrino' | 'miembro'
  padrinable:    'beca',           // 'beca' | 'animal' | 'categoría' | 'ración'
  apadrinar:     'Sostené una beca', // el CTA
  cuotaSocial:   'Cuota social',
}
```

#### Qué NO hay que hacer todavía

**Hacer el esquema genérico ahora es gratis; hacer el producto multi-cliente ahora no.**
Conviene no confundir las dos cosas:

- ✅ **Sí ahora:** que `destinos`, `aportes` y `gastos` no nombren a la Fundación ni
  asuman su rubro, y que la visibilidad y el vocabulario sean datos. Diseñarlo genérico
  no cuesta más que diseñarlo específico, y rehacerlo después sí cuesta.
- ❌ **Todavía no:** panel de alta de clientes, multi-tenancy, planes, facturación,
  onboarding. Eso es otro negocio y sigue dependiendo de las ocho entrevistas.

La regla es la misma de siempre en este repo: **lo que varía por entidad va en datos.**
Lo nuevo es que ahora sabemos *qué* varía — visibilidad del beneficiario y vocabulario—
porque apareció un segundo rubro imaginario que lo puso a prueba. **Ese es el valor de
pensar el refugio antes de construir: no es una distracción, es el test del diseño.**

---

---

## 14.2 – 14.4 — El importador y la transparencia, la crónica (trasladada desde `ROADMAP.md` el 2026-09-08)

> **Las tres estaban cerradas el 2026-09-06 y se revalidaron antes de archivarlas**: los
> artefactos existen (`src/lib/importarMovimientos.js`, `ImportarMovimientos.jsx`, la
> migración `20260906130000_importar_movimientos.sql`) y **63 tests pasan** en los tres
> archivos que las cubren. En `ROADMAP.md` §14 quedó la tesis —que no es crónica— y
> **§14.1, que sigue abierta**: «comprometido no es disponible».
>
> **Dos residuales 🟡 que vivían adentro de §14.2 subieron a `ROADMAP.md`**, para que no se
> pierdan en el archivo: el extracto que mezcla destinos hay que importarlo por partes, y
> las heurísticas de clasificación nunca se probaron con un banco que no sea MercadoPago.

### 14.2 — ✅ Importación desde extracto (2026-09-06)

**Construida.** Era el ítem con más valor de lo que quedaba y dejó de estar
pendiente el mismo día que se escribió la tesis, porque apareció el dato que lo
volvió urgente: la Fundación tiene extractos de MercadoPago **de octubre de 2024
hasta hoy — 23 meses**. Cargar eso de a uno no iba a pasar nunca.

`/admin → Importar movimientos`: se pega el extracto, se elige el destino, se
previsualiza y se confirma.

**Las tres reglas de la pantalla:**

1. **Propone, no ejecuta.** Nada se escribe hasta que alguien mira y aprieta. Las
   heurísticas de clasificación aciertan la mayoría y se equivocan algunas; el
   trabajo humano es destildar tres filas, no escribir cuatrocientas.
2. **Nada entra publicado.** La descripción de un movimiento bancario puede traer
   el nombre de un particular, y publicar un gasto lo publica entero. Revisar y
   publicar es un acto aparte.
3. **Reimportar es seguro**, y eso es lo que hace que alguien se anime a empezar.

#### La clave de idempotencia, y por qué no es solo el id

`<fuente>:<id de operación>:<monto>`, p. ej. `mp:90165423466:-5626.66`.

⚠️ **En el extracto de MercadoPago el impuesto comparte el id de operación con la
transferencia que lo generó.** Del extracto real de octubre de 2024:

```
10-10-2024  Transferencia enviada Centro Juventud Antoniana  90165423466  -937.776,27
10-10-2024  Impuesto por extracción                          90165423466    -5.626,66
```

Con la clave siendo solo el id, el segundo se rechaza como duplicado y **el
impuesto no entra nunca**: un gasto que desaparece en silencio, que es peor que
uno duplicado porque nadie lo busca. Está ejercitado en `fondos-check.sql` (T6b) y
se comprobó saboteándolo.

**Su límite, declarado:** dos movimientos con el mismo id **y** el mismo monto se
verían como uno. No apareció un caso así; el costo de equivocarse es un gasto no
cargado, no uno duplicado.

#### La garantía, en dos capas a propósito

La previsualización descarta lo ya cargado —eso es UX— y el INSERT igual usa
`upsert` con `ignoreDuplicates` —eso es la garantía—. Con solo lo primero, entre
el filtro y el insert hay una ventana y el segundo click cae justo ahí.

#### Lo que quedó pendiente de esto

- ✅ **Subir los archivos en vez de pegarlos** → **§14.3, cerrado el 2026-09-06.**
  Se eligen varios `.csv` de una vez, se ordenan solos por período y se verifica la
  cadena entre ellos. Pegar sigue existiendo, para un pedazo suelto.
- 🟡 **Un extracto que mezcla destinos** hay que importarlo por partes: el lote
  entero se imputa a un destino. Reimputar después existe (§10.11) pero es más
  trabajo que separar antes.
- 🟡 **Las heurísticas de clasificación son de vocabulario castellano de
  MercadoPago.** Están como dato (`REGLAS` en `src/lib/importarMovimientos.js`),
  así que sumar otro banco es agregar filas — pero todavía nadie lo probó con
  otro.

---

### 14.3 — ✅ Subir los resúmenes en vez de pegarlos (CERRADO el 2026-09-06)

> **Estado: construido y verificado contra los archivos reales.** Lo que sigue
> conserva el diseño y la evidencia que lo fundó, porque las conclusiones sobre
> el formato de MercadoPago no conviene volver a discutirlas.

§14.2 dejó funcionando el importador **de copiar y pegar**. Sirve, y tiene un
techo: son **23 meses de resúmenes**. Copiar y pegar veintitrés veces, cada una
con su selección a mano, es la clase de tarea que se abandona en el mes cuatro.

Lo que falta: **arrastrar los PDF, que el sistema los lea, y ver un resumen que
permita confirmar de un vistazo que los números dan.**

#### ⚠️ La idea que hace confiable a esto, y sale del propio documento

Un resumen de MercadoPago **trae sus propios totales en el encabezado**:

```
Saldo inicial: $ 1.698.607,63
Entradas:      $   244.795,30
Salidas:       $ -1.022.151,63
Saldo final:   $   921.251,30
```

Eso es una **suma de control gratis**, y habilita tres niveles de verificación
que no dependen de que le creamos al parser:

| Nivel | Qué compara | Qué error atrapa |
|---|---|---|
| **1. Por movimiento** | La columna `Saldo` de cada fila contra `saldo anterior ± valor` | Un importe mal leído. Es el error más peligroso porque es plausible: `937.776,27` leído como `937,78` |
| **2. Por resumen** | La suma de lo extraído contra `Entradas` / `Salidas` del encabezado | Una fila que se perdió o se duplicó en el parseo |
| **3. Entre resúmenes** | `Saldo final` del mes N contra `Saldo inicial` del mes N+1 | **Un mes que falta.** Con 23 archivos, este es el error probable |

**La regla que se sigue de esto: si los tres niveles no cierran, el importador NO
ofrece importar.** Avisa qué no cuadra y por cuánto. Es la diferencia entre una
herramienta en la que se confía y una que hay que auditar a mano cada vez — y
auditar a mano es justo lo que esto vino a evitar.

Es además el «resultante económico para chequear visualmente que coinciden los
resultados» que pidió el dueño del proyecto: la pantalla puede mostrar, por
resumen, *declarado vs. extraído* y un ✅ por cada nivel.

#### Qué mostrar antes de importar

- **Por archivo:** período, cantidad de movimientos, entradas, salidas, y los tres
  chequeos.
- **La cadena completa:** los meses en orden, con los huecos marcados. Un mes
  faltante se ve como un salto de saldo.
- **Agrupado por categoría**, reusando `clasificar()` de §14.2 — para ver de una
  cuánto se fue en comisiones e impuestos frente a los gastos que se decidieron.
- **El total del período contra el saldo actual de la cuenta.** Si dan igual, el
  libro quedó reconciliado y eso es lo más creíble que una rendición puede
  mostrar.

#### Lo técnico, con su riesgo

**Parsear el PDF en el navegador** con `pdfjs-dist`: devuelve los textos con sus
coordenadas y las filas se arman agrupando por `y` y separando por `x`. Es la
librería de Mozilla, madura y sin servidor de por medio — importante, porque **un
resumen de cuenta no debería salir de la máquina de quien lo sube**.

⚠️ **El riesgo real es el layout, no el parseo.** Si MercadoPago cambia el
formato, el extractor deja de encontrar las columnas. Por eso los tres niveles de
verificación no son un extra: **son lo que convierte un cambio de layout en un
aviso claro en vez de en datos silenciosamente mal cargados.** Sin ellos, esto no
se debería construir.

✅ **RESPONDIDO EL 2026-09-06, y cambia el plan: MercadoPago SÍ exporta.** En
*Reportes → Resumen de cuenta*, cada período ofrece **`.pdf`, `.xlsx` y `.csv`**.
El PDF viene pre-generado («Abrir») y los otros dos se generan a pedido
(«Generar»).

**Entonces no se parsea PDF.** `pdfjs-dist` queda descartado y con él su ~1 MB de
dependencia —contra los ~174 KB del chunk principal de este sitio— y todo el
riesgo de que un cambio de layout rompa la extracción. Leer un CSV es trivial y
`src/lib/importarMovimientos.js` **ya lo hace**: parte por separador, respeta
comillas y reconoce los encabezados.

⚠️ **Lo operativo que sí cambia:** hay que **generar** 23 archivos a mano en el
panel de MercadoPago antes de importarlos. Es tedioso pero se hace una vez.

#### ✅ Paso 1 HECHO el 2026-09-06: los tres formatos, comparados

Se exportó el período 10/2024 en `.pdf`, `.csv` y `.xlsx` y se compararon. **Las
conclusiones cambian el plan y conviene no volver a discutirlas:**

**1. El XLSX no aporta nada.** Sus celdas son `inlineStr` con **los valores como
texto**, en el mismo formato argentino que el CSV: mismas 5 columnas, mismas 27
filas, **0 diferencias**. Traería una librería de parseo a cambio de nada.
**El CSV gana.**

**2. ⚠️ NO hay bruto / comisión / neto. La hipótesis era equivocada.** Se sospechó
que el CSV abriría la comisión de la pasarela, que en el PDF es invisible. No lo
hace: la columna se llama literalmente **`TRANSACTION_NET_AMOUNT`**, y no hay
ninguna de comisión ni de bruto.

> **La comisión de MercadoPago no es visible en el resumen de cuenta, en ningún
> formato.** Si algún día se la quiere rendir, hay que buscar **otro reporte**
> —Liberaciones o Ventas—, que es un trabajo distinto y todavía sin explorar.

**3. ✅ El CSV trae los totales declarados**, y ahí está la mejor noticia: el
archivo tiene **dos bloques**.

```
INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE
1.698.607,63;244.795,30;-1.022.151,63;921.251,30

RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE
01-10-2024;Liquidación de dinero ;88205823663;6.845,60;1.705.453,23
```

O sea que **las tres verificaciones salen del CSV solo** — el PDF no hace falta
ni siquiera para el checksum:

| Nivel | Sale de | Verificado con el archivo real |
|---|---|---|
| 1 · saldo corrido | `PARTIAL_BALANCE` | ✅ 27 movimientos, **0 desvíos** |
| 2 · totales del período | el bloque de arriba | ✅ entradas y salidas **cuadran al centavo** |
| 3 · cadena entre meses | `FINAL_BALANCE` vs `INITIAL_BALANCE` del siguiente | listo para usar, falta un segundo archivo |

**4. ⚠️ Los encabezados del CSV vienen en INGLÉS**, aunque el PDF del mismo
resumen esté en castellano. La primera versión del parser era solo castellana y
**no reconocía ni la descripción ni el id** — y el id es el que da la
idempotencia, así que habría cargado los 27 movimientos **sin referencia** y
reimportar habría duplicado todo. Ya está corregido, con test.

#### Lo que se construyó con esa evidencia, el mismo día

- **`parsearExtracto` lee el CSV real**: los dos bloques, los encabezados en
  inglés, y devuelve `declarado` con los cuatro totales. Verificado contra el
  archivo: **27 filas, 0 problemas, 27 con referencia**.
- **`verificarSaldoCorrido`**, **`verificarTotales`** y **`verificarCadena`**, las
  tres puras y testeadas — incluido el caso que motivó todo: un importe leído como
  `684,56` en vez de `6.845,60` hace saltar el nivel 1.
- **La pantalla no deja importar si no cuadra.** El botón se deshabilita y explica
  qué no da. Es la regla de §14.3 aplicada: sin eso, esto sería un acto de fe.

#### ✅ Los tres pendientes, cerrados el 2026-09-06

**1. Se eligen los archivos, y varios a la vez.** `<input type="file" multiple>` +
`Blob.text()`, sin dependencias. Pegar sigue estando para un pedazo suelto, pero
deja de ser el camino principal.

Juntar varios trae **dos problemas que un archivo solo no tiene**, y los dos se
resuelven en `consolidarArchivos()` (puro, testeado):

- **El orden.** Se ordena por el primer movimiento, **no por el nombre**: los de
  MercadoPago se llaman `account_statement-<uuid>.csv` y no dicen nada del
  período. Hay un test cuyos nombres están elegidos para que el orden alfabético
  dé el orden contrario — si alguna vez se ordena por nombre, falla.
- **El mismo archivo elegido dos veces**, que con 23 en un diálogo es cuestión de
  tiempo. Se detecta por `referencia` repetida **entre archivos distintos**: dos
  extractos son períodos disjuntos, así que un movimiento en los dos es siempre el
  mismo archivo cargado dos veces. Repetida *dentro* de un archivo **no** se toca:
  ahí puede ser legítima, y marcarla dejaría afuera un gasto real.

**2. La cadena, en la pantalla — y avisa sin bloquear.** Es la distinción que
ordena las tres verificaciones, y no es un detalle de UI:

| | Falla cuando | Qué hace |
|---|---|---|
| Niveles 1 y 2 | lo que se leyó **está mal** (importe mal interpretado, archivo cortado) | **bloquea**: cargarlo mete un error que después hay que buscar movimiento por movimiento contra el papel |
| Nivel 3 | **falta un mes** | **avisa**: octubre y diciembre sin noviembre es *incompleto*, no *incorrecto*, y es justo lo que hace alguien que baja los extractos de a uno |

Los niveles 1 y 2 se calculan **por archivo**: cada extracto declara sus propios
totales, y sumarlos todos juntos escondería justo el que no cuadra.

**3. Los movimientos anteriores al inicio del destino se destildan solos.** Un
fondo restringido empieza un día concreto y el extracto del mes trae también lo de
antes: imputados al fondo, la rendición muestra gastos que ese fondo nunca hizo,
que es exactamente lo que un fondo restringido tiene que poder desmentir. Contra
el archivo real, **21 de 27 movimientos de octubre 2024 son de la etapa previa**.

Se destildan, **no se bloquean**: la fecha de inicio puede estar mal cargada, y un
dato de configuración no puede impedir cargar un movimiento que existió.

> ⚠️ **El borde que la fecha sola no resuelve, y que es el peligroso.**
> `fecha_inicio` es una fecha, no un instante, y **un fondo puede arrancar a mitad
> de un día**. El del convenio es exactamente eso: el 10/10/2024 la cuenta hizo la
> transferencia de cierre y pagó su impuesto, y **recién después** el saldo que
> quedó pasó a ser el fondo. Esos dos movimientos comparten fecha con el primer día
> del fondo, así que `fecha < inicio` no los alcanza — y **el saldo inicial cargado
> ya está neto de ellos**, así que importarlos los contaría dos veces.
>
> `delDiaDelInicio()` los **marca** y no los destilda, a propósito: un movimiento
> del día del inicio puede ser igual de bien el primero del fondo. Destildar de más
> hace desaparecer un gasto en silencio —el error que este módulo entero trata de
> no cometer—; marcar obliga a mirar dos filas.

**Y una consecuencia de escala que no estaba prevista:** `getReferenciasCargadas`
ya no recibe un mes sino veintitrés, así que se trocea de a 500. Si una tanda
falla, **corta** en vez de seguir: una lista incompleta de «ya cargadas» hace que
la previsualización *prometa* insertar lo que la base va a saltear.

#### Lo que hay que decidir después

1. **¿Un destino por archivo o por movimiento?** Hoy el lote entero va a un
   destino. Para 23 meses de una cuenta institucional probablemente alcance, pero
   conviene confirmarlo antes que reimputar cientos de filas después (§10.11).
2. ~~**¿Qué hacer con los movimientos anteriores a `destinos.fecha_inicio`?**~~
   ✅ **Resuelto el 2026-09-06: se destildan solos y se dice por qué.** Ver más
   abajo, incluido el borde del día del inicio, que la fecha sola no resuelve.
3. **¿Se guarda el archivo?** Un resumen de cuenta es respaldo documental y ya hay
   dónde ponerlo (`tipo_comprobante = extracto`, bucket privado). Guardarlo hace
   auditable la importación; no guardarlo deja el «de dónde salió esto» en el aire.

#### ✅ Saldada: el saldo inicial ya se puede marcar (2026-09-06)

El ABM de aportes no tenía campo para `referencia_externa`, así que el saldo
inicial del fondo se cargó sin ella — se había recomendado un valor que la
pantalla no permitía ingresar.

**No se resolvió agregando un campo de texto, y el motivo importa:**
`referencia_externa` es la clave de idempotencia de las importaciones. Dejarla
escribir a mano habría permitido poner `mp:90165423466:-5626.66` —por copiar un
id del extracto, sin mala intención— y **ese movimiento no se podría importar
nunca más**: la base lo rechazaría como duplicado de una fila que no tiene nada
que ver. Un gasto que desaparece en silencio.

En su lugar hay un tilde **«es el saldo inicial de este destino»** que la deriva:
`saldo-inicial:<slug>`. Nunca puede chocar con una `mp:*`, y el UNIQUE de la
columna garantiza gratis lo que el dominio ya pedía: **un solo saldo inicial por
destino**. Hay un test que fija que la referencia no puede tomar forma de
importación aunque el formulario traiga basura.

**Y el concepto que encierra generaliza:** un libro que arranca a mitad de la vida
de una entidad necesita una fila que diga «acá había esto». Cualquier cliente que
empiece a usar esto con plata ya en la cuenta la va a necesitar.

#### Lo que quedó abierto de §14.3

- 🟡 **El archivo no se guarda.** Un resumen de cuenta es respaldo documental y ya
  hay dónde ponerlo (`tipo_comprobante = extracto`, bucket privado). Guardarlo hace
  auditable la importación; hoy el «de dónde salió esto» queda en el aire. Es la
  decisión 3 de arriba, todavía sin tomar.
- 🟡 **Un lote, un destino.** Sigue igual: si un extracto mezcla destinos hay que
  importarlo por partes (§10.11 permite reimputar, pero es más trabajo).
- 🟡 **La comisión de la pasarela sigue sin poder rendirse.** No está en el resumen
  de cuenta en ningún formato; requiere otro reporte de MercadoPago —Liberaciones o
  Ventas— y eso está sin explorar.

**Toda la lógica que decide es pura y está en `src/lib/importarMovimientos.js`,
con 45 tests sobre datos reales.** El componente solo muestra y confirma.

---

### 14.4 — ✅ La transparencia, publicada Y navegable (CERRADO el 2026-09-06)

Los primeros gastos reales entraron y se publicaron, y ahí aparecieron tres cosas
que ninguna pantalla avisa sola. Relato completo en `HISTORIAL.md` §14.5–14.7.

**a) El importador escribía nombres de personas en `gastos`.** No era una
preferencia de redacción: la migración `20260816150000` ya tenía la regla escrita
—*lo que no pueda ser público NO se escribe en un gasto*, porque publicar publica
la fila entera y las RLS filtran filas, no columnas—. El importador metía la
descripción literal del extracto como `concepto` y la contraparte como
`proveedor`, así que el nombre de un particular quedaba a un clic de ser público
**y repetido en dos campos**. Ahora va `conceptoGenerico()` y `proveedor` queda
null.
⚠️ **En `aportes` NO hay que hacer lo mismo, y se verificó en vez de asumirlo**:
esa tabla no tiene policy de lectura pública. La misma descripción es peligrosa
en una tabla e inofensiva en la otra, y lo que decide es la policy.

**b) «Transparencia» del menú apuntaba solo a los papeles.** `/rendicion` —lo
único que muestra plata entrando y saliendo, y el diferencial de §14— se llegaba
desde el pie o desde «Colaborá». Ahora «Transparencia» es un grupo cuyo **padre
lleva a `/rendicion`** y cuyo subitem lleva a `/legal-documents`, y las dos
páginas se enlazan entre sí.

**c) Decidido: público sin registro.** No se protege *quién mira* sino *qué se
escribe*. Un muro de registro no protegería nada —cualquiera se registra— y en
este proyecto sería peor, porque el bloqueo del front es solo UX: gatear de
verdad exigiría cambiar la policy, y entonces el dato deja de ser público. Lo que
no se publica nunca son **los comprobantes**.

#### Y dos bugs latentes que este trabajo destapó

- **`loading` del `AuthProvider` desmontaba la aplicación entera** con cualquier
  evento de sesión, incluidos los que no cambian la identidad. Ver §14.4 de
  `HISTORIAL.md`: es la segunda vez que ese archivo pisa el mismo pozo.
  ⚠️ **Queda una confirmación pendiente**, abajo.
- **El menú de escritorio elegía el submenú con un ternario de dos ramas**, así
  que con el tercer grupo dos compartían estado. Reemplazado por un mapa por
  clave, con test.

---

---

## 12.17 — El bug que la regla escrita no evitó (trasladado desde `ROADMAP.md` el 2026-09-08)

> Arreglado el 2026-09-06 en la migración `20260906160000` y fijado con T25b/T25c. Se
> archiva porque es crónica de un bug cerrado — pero **la lección se quedó en `ROADMAP.md`
> §12.15**, que es donde alguien la va a leer antes de volver a escribir el `COALESCE`.

### 12.17 — ⚠️ El bug que la regla escrita no evitó (2026-09-06)

El reporte de la fase 3 salió con `COALESCE(sum(ahorro), 0)` en sus tres funciones,
así que a un comercio cuyos beneficios son 2x1 o regalo le decía
**«Ahorro que diste: $0»** después de haber regalado algo. Es exactamente lo que la
tabla de §12.15 declara imposible, y esa línea ya existía cuando se escribió el bug.

**Lo encontró correr el reporte contra los datos reales de producción** — no un test, no
una revisión. Y el motivo de que ningún test lo viera es instructivo: las 28 assertions
usaban beneficios de tipo `porcentaje`, que **siempre** tienen ahorro. El único canje real
que existe es de tipo `regalo`, que no lo tiene. **El caso que rompía era justo el que
ninguna prueba tocaba, y la prueba lo evitaba sin querer.**

Arreglado en `20260906160000` y fijado con T25b/T25c, que sí usan un beneficio de regalo.
La forma del arreglo es la que ya tenía el consumo: **el número viaja con su cobertura**
(`canjes_con_ahorro`), y la pantalla decide si dice un monto, «no calculable» o «sobre N
de M». Los dos NULL no son el mismo NULL:

| | Qué significa | Cómo se trata |
|---|---|---|
| `ahorro` en NULL | **No calculable** — el beneficio no tiene un monto que ahorrar | No se coalesce. Se muestra «No calculable» |
| `monto_operacion` en NULL | **Falta el dato** — nadie lo cargó al confirmar | Se coalesce a 0 y se muestra la cobertura |

**La lección, y es incómoda:** tener la regla escrita, verificada y citada en el propio
archivo **no impidió romperla**. Un `sum()` sobre una columna nullable *parece* que pide
un COALESCE, y la mano lo escribe antes de que la cabeza recuerde por qué esa columna
puede ser NULL. Lo que lo atrapó no fue leer mejor: fue **mirar el número que el sistema
le iba a mostrar a una persona real**.

---


---

## 2026-09-08 (tarde) — La jornada de verificar, no de construir

No se escribió una línea de código de producto. Se verificó lo que el repo decía de sí
mismo, y **diez afirmaciones se cayeron en una sola pasada** — el récord, contra las
catorce acumuladas en el mes anterior. El ROADMAP pasó de **2.096 a 1.018 líneas**.

### Qué se archivó, y con qué vara

| Sección | Cómo se validó antes de moverla |
|---|---|
| **§10** — modelo de dominio (~810 líneas) | 20 comprobaciones SQL de solo lectura contra producción: las tres tablas del padrón, las 8 funciones, los GRANTs de `anon`, las seis decisiones de §10.4 en datos |
| **§14.2–§14.4** — importador y transparencia (348) | 63 tests verdes en `importarMovimientos`, su componente y `gastosApi` |
| **§12.17** — el bug del «$0 de ahorro» (31) | Crónica de un bug cerrado. **La lección se quedó en el ROADMAP**, que es donde sirve |

### Las tres cosas que valen para la próxima

**1. «Cerrado» no es un estado verificado, es una opinión escrita.** §10 se declaraba
cerrada desde el 2026-09-05 y tenía dos pendientes que ya no existían, mientras §C apuntaba
a un ítem de §A que nunca existió. **La vara nueva: una sección se archiva cuando lo que
afirma se comprobó contra la base, no cuando se declara cerrada.**

**2. Siete de las diez afirmaciones caídas decían que algo faltaba, y ya estaba hecho.**
El PDF del acta, el tilde del saldo inicial, la barra de progreso, la Edge Function
desplegada, el canal recurrente que «nunca corrió». Hasta ahora el riesgo conocido de un
ROADMAP viejo era confiar en lo que no anda; **el riesgo simétrico es rehacer lo que sí**.

**3. Actualizar trae advisories, no solo los cierra.** `npm audit` pasó de 4 a 8 —de 1
`high` a 2— y el causante fue el salto a `vitest@4`, que se había hecho para cerrar
vulnerabilidades. Remedir después de actualizar, no solo antes.

### Un susto que no era, y conviene que quede escrito

`reglas_acceso.piso_monto` está en NULL, y §10.4 dice «solo si `monto >= piso_monto`» —con
NULL esa comparación da NULL y nadie tendría acceso—. No pasa: `meses_por_donacion` hace
`COALESCE(piso_monto, cuota_referencia)`, o sea que el piso **cae en la cuota**, que es lo
que la decisión pedía. **El próximo que lea §10.4 sin abrir la función va a «arreglar»
esto.** Está anotado también en §10, archivada.

### Lo que quedó anotado en el ROADMAP, no acá

Los tres residuales de §10 (metas de destino sin cargar, `reporte_destino()` sin llamador,
el diferencial de socio sin ejercer), los dos de §14.2 (extracto que mezcla destinos,
heurísticas sin probar con otro banco), y las cifras remedidas de «Estado» y `CLAUDE.md`.
