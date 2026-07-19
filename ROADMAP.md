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

- [ ] **3.5 — Componentes de auth muertos en el repo.** `LoginForm.jsx` y
  `RegisterForm.jsx` declarados "ya no se usan" pero siguen (con diseño divergente).
  El login/registro real vive en `LoginPage`/`RegisterPage`. Borrar.

- [ ] **3.6 — Estado `inscrito` de educación sin métrica ni filtro.**
  El flujo permite marcar `inscrito` ("Finalizar Inscripción", `EducationAdmin.jsx:488`),
  pero las tarjetas de métricas y los tabs (`:220-225,338-355`) solo contemplan
  pending/contacted/rejected. Un `inscrito` solo aparece en "TODOS" y no se cuenta.

---

## 4. Deuda técnica — arquitectura

- [ ] **4.1 — Capa de datos con 3 contratos de retorno distintos.**
  En el mismo `src/lib/storage.js`: getters **lanzan** (`getPartners:10-23`), `addPartner`
  devuelve `null` en error (`:25-46`), `deletePartner` **devuelve** el error (`:60-68`).
  Además `api/activitiesApi.js:24-27` y `membershipApi.js:20-22` **silencian** devolviendo
  `[]`; `educationApi.js` re-lanza; `projectsApi/documentsApi` devuelven `{data,error}`
  crudo. **Acción:** unificar a un contrato único (recomendado: `{data, error}`).
  **Esfuerzo:** ~2-3 días (refactor transversal). **Prioridad:** importante.

- [ ] **4.2 — Sin caché de estado servidor (no react-query/SWR).**
  Cada página hace fetch manual con `useEffect` (18 páginas). `Activities.jsx:43-51` usa
  `sessionStorage('activities_loaded')` como caché casera frágil. No hay N+1 (los joins
  usan embedding de Supabase, correcto; `useAdminStats.js:37-97` usa `Promise.all`).
  **Acción:** migrar a TanStack Query incrementalmente; elimina cientos de líneas de
  loading/error boilerplate. **Esfuerzo:** ~3-4 días. **Prioridad:** importante.

- [ ] **4.3 — Proxy a Render frágil (pagos).**
  `vercel.json:6` reescribe `/api/*` → microservicio Render. `membershipApi.js:59-78`
  (`callWebhook`) hace `fetch` **sin timeout, sin retry, sin manejo de cold-start**.
  El free-tier de Render duerme; el usuario ve "Error en la operación" (`:74`) sin
  distinguir cold-start de fallo real. Además naming inconsistente en share de partners:
  `vercel.json:3` apunta a `slug` pero el archivo es `api/share/partners/[slug].js`
  (novedades usa `slug.js`). **Acción:** timeout+retry+mensaje de cold-start; unificar
  naming. **Esfuerzo:** ~medio día. **Prioridad:** importante.

- [ ] **4.4 — Dark mode = código muerto.** Tema forzado a claro
  (`App.jsx:176-181`, `forcedTheme="light"`), pero existe paleta `.dark` completa
  (`index.css:44-78`), 11-20 variantes `dark:` sueltas, `ThemeSwitch` importado y
  dependencia `next-themes` viva. **Decisión:** completar dark mode **o** eliminar
  `next-themes` + `ThemeSwitch` + variantes `dark:`. **Esfuerzo:** ~2-4h.

- [ ] **4.5 — `react-helmet` sin mantenimiento (27 archivos).** Sin publicar desde ~2020,
  no soporta React 18 oficialmente, warnings con StrictMode. Migrar a
  `react-helmet-async`. **Esfuerzo:** ~1 día (mecánico).

- [ ] **4.6 — RHF+zod para un solo formulario.** `react-hook-form`, `zod`,
  `@hookform/resolvers` se usan **solo** en `EducationForm.jsx`; el resto valida con
  `useState` manual. Decidir: estandarizar RHF+zod en todos los forms **o** sacarlo.
  **Esfuerzo:** ~1 día.

- [ ] **4.7 — Sin ESLint configurado ni tests.** ESLint instalado +
  `eslint-config-react-app` pero **no hay** `.eslintrc*`/`eslint.config.js` ni script
  `lint`. Cero tests. Única verificación: `npm run build` manual.
  **Acción:** configurar ESLint (flat config) + script `lint`; agregar tests de humo
  (Vitest). **Esfuerzo:** ~1-2 días. **Prioridad:** importante.

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

- [ ] **5.1 — CUATRO paletas superpuestas / 3 azules de marca / 3 fondos "blancos". [ALTA]**
  En `tailwind.config.js:21-70` conviven tokens HSL, `primary.antoniano #103754`,
  paleta legacy (`azul-profundo #1A2F48`, `celeste-complementario`) y paleta `brand.*`
  (`brand-primary #163A68`, `brand-sand #F9F7F5`). Tres azules de marca distintos.
  ~~**Home usa la paleta vieja**~~ **HECHO (2026-07):** Home migrada a `brand-*` +
  `bg-hero-glow` (mismo hero que Activities/About); `.hero-pattern` eliminada de
  `index.css`. **Pendiente:** colapsar tokens legacy que quedan en Auth forms,
  `GuestRegistrationForm`, `ThemeSwitch`, `App.jsx:190`, `button.jsx:21-22`.
  Fondos "blancos" distintos: `blanco-fundacion #F8F9F7`
  (`App.jsx:190`), `brand-sand #F9F7F5`, `bg-[#F8FAFC]` (`Preinscripcion.jsx:43`),
  `bg-[#FDFDFD]` (`Dashboard.jsx:127`).
  **Acción:** colapsar a un set de tokens único (`brand.*`), eliminar paletas legacy,
  migrar Home. **Esfuerzo:** ~2-3 días. **La mejora de diseño de mayor impacto.**

- [x] **5.2 — Errores de validación no renderizados en EducationForm.** (= 2.6) **HECHO (2026-07-19)**

- [ ] **5.3 — Contraste insuficiente pervasivo. [ALTA]**
  `text-gray-400` (#9CA3AF) sobre blanco ≈ 2.85:1 (WCAG AA pide 4.5:1) usado como
  patrón por defecto en labels/ayuda: `RegisterPage.jsx:109,117`, `LoginPage.jsx:103,112`,
  `EducationForm.jsx:93`, `Collaborate.jsx:318`, `Preinscripcion.jsx:72`.

- [ ] **5.4 — Sin `prefers-reduced-motion` + animación global de cards. [ALTA]**
  **Parcial (2026-07):** Home ya usa `useReducedMotion` (patrón `fadeIn`/`fadeUpInView`
  reutilizable) + `viewport: once`. Falta el resto del sitio y `card.jsx`.
  0 usos de `useReducedMotion`. `card.jsx:12-15` anima `whileInView` en **cada** card del
  sitio (incluidas listas admin), + 17 `whileInView` extra. Incumple WCAG 2.3.3.
  **Acción:** respetar `prefers-reduced-motion` (envolver o desactivar animaciones).

- [ ] **5.5 — `<main>` anidados/duplicados en ~9 páginas. [ALTA]**
  `App.jsx:192` ya envuelve en `<main>`, pero también lo renderizan `NewsPage.jsx:72`,
  `AdminPanel.jsx:256`, `ApplyPartnerPage.jsx:76`, `BenefitsPage.jsx:144`,
  `BenefitDetailPage.jsx:140`, `PartnersPage.jsx:81`, `NewsDetailPage.jsx:167`,
  `TermsOfUse.jsx:37`, `PrivacyPolicy.jsx:37`. HTML inválido, confunde lectores de
  pantalla. **Acción:** dejar un solo `<main>` (el del shell) y cambiar los demás a `<div>`.

- [ ] **5.6 — Auth: labels sin `htmlFor/id`, toggles sin `aria-label`, sin `<h1>`. [ALTA]**
  `LoginPage.jsx:112` (label sin `htmlFor`), `:115` (input sin `id`), `:142-148`
  (toggle password sin `aria-label`); mismo patrón en `RegisterPage.jsx:117-127,146`.
  El título visible usa `CardTitle` (`<h3>`), así que Login/Register **no tienen `<h1>`**.
  (Curiosamente los componentes muertos `LoginForm/RegisterForm` sí tenían aria — se
  perdió a11y al migrar a las páginas.)

- [ ] **5.7 — Tipografía micro + valores arbitrarios. [MEDIA-ALTA]**
  ~~Logos de alianzas en Home a `text-[7px]` — ilegible.~~ **HECHO (2026-07):** alianzas
  refactorizadas a `<ul>` semántica con `text-lg`/`text-[11px]`.
  Errores de form a `text-[9px]` (`EducationForm.jsx:95,102,107`). Labels a `text-[10px]`.
  552 usos de `text-gray-*`/`text-[Npx]` arbitrarios en 60 archivos ignorando los tokens.

- [ ] **5.8 — Variantes de botón sin usar; CTA hardcodeado. [MEDIA]**
  `button.jsx:21-22` define `antoniano`/`marron` que nadie usa; los CTA hardcodean
  `bg-brand-action hover:bg-red-800` inline (`Activities.jsx:294`, `Collaborate.jsx:161`,
  `Header.jsx:405`, `ApplyPartnerPage.jsx:209`…). **Acción:** crear `variant="action"`.

- [x] **5.9 — `ApplyPartnerPage` sin estado loading → doble submit. HECHO (2026-07-19)**
  — `isSubmitting` + spinner + manejo del `null` que devuelve `addPartner` en error.

- [x] **5.10 — `BottomNavBar` tapa 16px de contenido. HECHO (2026-07)**
  `App.jsx:192` ahora reserva `pb-20`.

- [ ] **5.11 — Offsets sticky inconsistentes. [BAJA]**
  `AdminPanel.jsx:188` usa `top-24` y `CommissionPortal.jsx:94` usa `top-20`, con header
  real `h-20`. Unificar a `top-20`.

- [ ] **5.12 — Formularios con 3 estilos de label distintos. [MEDIA]**
  `ApplyPartnerPage.jsx:115` (`text-brand-dark font-semibold`, correcto) vs páginas de
  auth/educación (`text-[10px] text-gray-400 uppercase`). Unificar.
  (Parcial 2026-07: `Contact.jsx` rediseñado ya usa el estilo correcto.)

- [ ] **5.13 — Propagar el lenguaje editorial de Home/Contact al resto. [MEDIA-ALTA]**
  Home y Contact (rediseño 2026-07) definen el lenguaje visual de referencia (ver
  sección "Lenguaje visual" en CLAUDE.md): `Eyebrow` (`src/components/ui/eyebrow.jsx`),
  sentence case, voseo, filas/bandas hairline, `rounded-sm`, sin pills glassmórficos ni
  grids de puntos. Pendientes: About, Activities, NewsPage, PartnersPage, BenefitsPage,
  Collaborate, LegalDocuments, Login/Register, Preinscripcion (heroes y encabezados).
  **Esfuerzo:** ~1 día (mecánico, página por página).

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

## 7. Orden sugerido (las 3 inversiones de mayor retorno)

1. **Consolidar la paleta y alinear Home con el resto del sitio** (5.1) — máximo impacto
   visual, no requiere reescribir lógica.
2. **Versionar RLS + Edge Functions faltantes** (2.4, 2.2) — cierra el mayor riesgo de
   seguridad/auditoría.
3. **Pasada de accesibilidad** (5.3, 5.4, 5.5, 5.6) — contraste, tamaños, reduced-motion,
   landmarks/headings. Alto impacto en usabilidad real, bajo riesgo.

Antes de todo eso, los arreglos rápidos de la sección 2 (bug de Dashboard 2.1, scaffold
Horizons 2.3, 404 2.5, errores de EducationForm 2.6) son de horas y sin riesgo.

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
