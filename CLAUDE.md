# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sitio web institucional de la **Fundación Evolución Antoniana** (Salta, Argentina): educación, deporte, inclusión y tecnología. SPA en español. Scaffold original de Hostinger Horizons (de ahí los restos en `plugins/visual-editor/`, solo activos en dev).

## Stack

- **Vite 7 + React 18** (JavaScript, sin TypeScript), `react-router-dom` v6 (client-side routing, SPA).
  ⚠️ Decía «Vite 4» hasta el 2026-09-05: el `package.json` tiene `vite@^7.3.6` desde hace meses.
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
  Sesión G. `npm run lint` es un gate que falla solo en errores; hoy quedan **50** warnings
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
- **Auth**: `src/hooks/useAuth.jsx` (`AuthProvider` + `useAuth`) expone `user`, `isAuthenticated`, `isAdmin`, `role`, `isBoardMember`.
  ⚠️ **`loading` DESMONTA LA APLICACIÓN: solo puede moverse cuando cambia QUIÉN está
  logueado.** `ProtectedRoute` devuelve un spinner *en lugar de* `children` mientras es
  true, así que ponerlo en true tira abajo la pantalla protegida entera — formulario a
  medio llenar, lote de movimientos analizado, scroll — y desde afuera se ve idéntico a
  una recarga de página. `onAuthStateChange` emite eventos que **no** cambian la
  identidad (`INITIAL_SESSION`, que además llega duplicado, y `TOKEN_REFRESHED`), y hasta
  el 2026-09-06 todos ellos lo movían. **Este archivo pisó el mismo pozo dos veces**: la
  primera se quitó un listener de `visibilitychange` —el disparador— y se dejó el
  mecanismo. La guarda por id de usuario y `src/hooks/useAuth.test.jsx` lo cierran; ver
  `HISTORIAL.md` §14.4. El perfil/rol sale de la tabla `users`. `src/components/Auth/ProtectedRoute.jsx` soporta `requireAdmin` y `allowedRoles={[...]}`. Tras login, `LoginPage` redirige según rol a su portal (admin→`/admin`, comisión→`/comision`, educación→`/admin/education`, resto→`/dashboard`).
- **Acceso del socio (aporte → acceso, ROADMAP §10)**: la regla es *dos maneras de aportar (cuota o donación), una sola consecuencia (acceso a beneficios)*. Vive **en SQL**: `aportes` es el libro (escritura solo `service_role`, alimentado por los triggers de `memberships`/`donations`), y `tiene_acceso()` / `mi_acceso()` / `mi_antiguedad()` son la única fuente de la regla. Desde el front se consulta por RPC con `src/api/accesoApi.js` + `useMiAcceso()`; las reglas de presentación (bloqueo, estados, formato) están en `src/lib/acceso.js` y **no se duplican en las páginas**. `/carnet` es la credencial del socio. ⚠️ El bloqueo de un beneficio es **UX, no seguridad**: `benefits.codigo` sigue siendo público (ver la limitación en ROADMAP §12.8).
- **Condición institucional (ROADMAP §10.1.a) — NO es el acceso**: `miembros` +
  `categorias_miembro` + `reglas_membresia`. Son **dos preguntas distintas** y el sistema
  tiene que poder hacer cada una por separado: alguien puede estar al día con su aporte y
  **suspendido por la comisión**, o en regla y con la cuota vencida. El acceso se deriva de
  `aportes`; la condición es un dato propio. Se consulta con `mi_membresia()` (trae también
  la antigüedad, para que el carnet haga UNA llamada) vía `src/api/miembroApi.js`, y las
  reglas de presentación viven en `src/lib/miembro.js`.
  ⚠️ **La tabla NO se llama `socios`, y es a propósito.** `entidad.tipo = 'fundacion'`: una
  fundación no tiene asociados ni voto. **Cómo se llama esa figura de cara a la gente sale
  de `entidad.vocabulario`** (`'padrino'` acá, `'asociado'` en una cámara), nunca escrito a
  mano en un componente. El alta la da un trigger sobre `aportes` cuando el aporte otorga
  acceso —y **no reactiva a un suspendido**: pagar no revierte una sanción—. Cambiar un
  estado va por `cambiar_estado_miembro()`, no por UPDATE directo.
  ⚠️ **El alta asigna `categorias_miembro.por_defecto`** (una sola, garantizada por índice
  único parcial). Sin ninguna marcada, todo el mundo queda con `categoria_id` NULL y el
  descuento en 0: la tabla de categorías existe y no gobierna nada. La categoría de la
  Fundación se carga con `supabase/data/seed_categoria_miembro_fundacion.sql` — una sola,
  'General', 0% de descuento, porque hoy las 12 actividades son gratuitas.
- **Reclamo universal de huellas (§10.1.c)**: qué tablas guardan rastros de gente sin cuenta
  es un **dato** (`fuentes_reclamables`), no código; `reclamar_huellas()` las vincula con
  email verificado. Tiene lista negra: `donations`, `memberships`, `aportes`, `miembros`,
  `users` y `club_canjes` **no** se pueden registrar ahí, porque vincularlas no es
  reconocer a alguien sino **otorgarle privilegios**. Para las donaciones sigue estando
  `reclamar_donaciones()`, que es lo único que otorga acceso.
- **Precio de actividades (§10.1.d)**: `precio_general` (0 = gratis) y `precio_socio`
  (NULL = aplicar el descuento de la categoría; 0 = gratis para miembros). El número que se
  le muestra a una persona sale **siempre** de `mi_precio_actividad()`, nunca de una cuenta
  hecha en el front: es una cifra que alguien va a pagar.
- **Fondos restringidos (ROADMAP §14)**: hay **dos categorías de ingreso**, no una. De
  libre disponibilidad (cuota social) y **restringido** (subsidio, convenio, donación con
  cargo, legado): llega completo, atado a un fin, y no se puede aplicar a otra cosa. Un
  destino con `admite_puntual` y `admite_recurrente` en `false` es exactamente eso —
  cerrado a aportes nuevos y **rendible igual**. ⚠️ No volver a poner un CHECK que lo
  impida: se removió a propósito en `20260906120000`, con el motivo escrito.
  **No mezclar un fondo restringido con la cuota social en un mismo destino**: mezclados,
  el «disponible» deja de significar algo y la entidad no puede demostrar que respetó la
  restricción.
- **Comprobantes**: los adjuntan `aportes` **y** `gastos` — la rendición se apoya en las
  dos columnas. El mecanismo vive en `src/lib/comprobantes.js` y **el orden de las
  operaciones es lo único delicado**: al subir, archivo y después fila; al quitar, fila y
  después archivo. Está escrito una vez a propósito. El archivo **nunca** es público (va
  al bucket privado `comision-docs`); lo público es que existe, vía `tiene_comprobante` y
  el conteo agregado de `reporte_destino()`. `tipo_comprobante` es genérico a propósito:
  la letra A/B/C es normativa argentina y va en `comprobante_numero`.
- **Importar movimientos (ROADMAP §14.2/§14.3)**: `/admin → Importar movimientos` convierte
  los extractos de la cuenta en filas del libro. Se eligen **varios `.csv` de una vez** y
  `consolidarArchivos()` los ordena **por el primer movimiento, no por el nombre** (los de
  MercadoPago se llaman `account_statement-<uuid>.csv`). La lógica que **decide** es pura y está testeada en
  `src/lib/importarMovimientos.js`; el componente solo muestra y confirma. Tres invariantes
  que no se tocan: **propone y no ejecuta** (nada se escribe sin confirmación), **nada entra
  publicado** (un movimiento puede traer el nombre de un particular en la descripción) y
  **reimportar no duplica**. Lo último se sostiene en `referencia_externa` = `<fuente>:<id>:<monto>`,
  UNIQUE en `aportes` **y** en `gastos`. ⚠️ **El monto forma parte de la clave a propósito**:
  en MercadoPago el impuesto comparte el id de operación con su transferencia, y sin el monto
  el impuesto nunca entraría.
  ⚠️ **Lo que no cuadra no se importa; lo incompleto sí.** Los niveles 1 y 2 (saldo corrido y
  totales, **por archivo**) fallan cuando lo leído *está mal* y **bloquean**; el nivel 3
  (cadena entre resúmenes) falla cuando *falta un mes* y **solo avisa** — importar octubre y
  diciembre sin noviembre es incompleto, no incorrecto.
  ⚠️ **El importador NO escribe nombres en `gastos`.** `gastos` publica la fila **entera**
  al publicarse, y la migración `20260816150000` fijó la regla: *lo que no pueda ser
  público no se escribe en un gasto*. La descripción del extracto trae la contraparte
  («Transferencia enviada Fulano»), así que va `conceptoGenerico()` —la descripción sin el
  nombre— y `proveedor` queda **null** para que alguien escriba a mano el proveedor que la
  entidad sí quiere nombrar. El nombre no se pierde: `referencia_externa` apunta a la línea
  exacta del extracto. ⚠️ En `aportes` sí se guarda, y es correcto: **esa tabla no tiene
  policy de lectura pública**, solo el propio aportante y la comisión.
  ⚠️ **`destinos.fecha_inicio` destilda lo anterior pero NO alcanza el borde.** Un fondo
  puede arrancar a mitad de un día: los movimientos de ese día se **marcan** con
  `delDiaDelInicio()` y no se destildan, porque pueden ser igual de bien los primeros del
  fondo. Es el caso del fondo del convenio, y es el peligroso — el saldo inicial ya está neto
  de ellos, así que importarlos los cuenta dos veces.
- **El CSV de MercadoPago (ROADMAP §14.3)**, comprobado contra un archivo real el
  2026-09-06: encabezados **en inglés** (`RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE`),
  **dos bloques** —los totales del período arriba, los movimientos abajo— y números en
  formato argentino. ⚠️ **El importe es NETO y la comisión de la pasarela no figura en
  ningún formato** del resumen de cuenta; para verla hay que ir a otro reporte. El `.xlsx`
  trae exactamente lo mismo que el `.csv` con los valores como texto: no aporta nada y
  costaría una librería. **Y las tres verificaciones salen del CSV solo** — saldo corrido,
  totales del período y cadena entre meses—: si alguna no cuadra, la pantalla **no deja
  importar**, porque sin eso un cambio de formato del banco se convierte en datos mal
  cargados en silencio.
- **Club de beneficios (ROADMAP §12) — CERRADO como módulo el 2026-09-06, fases 0 a 3 en producción**: el módulo del canje. Su ABM vive en `/admin → Club de beneficios`. **Ya no hay deuda de código**: §12.10 se cerró entero y la crónica se movió a `HISTORIAL.md` §12; lo que queda en el ROADMAP son las 5 invariantes (§12.12), dónde vive cada cosa (§12.13) y lo que falta, que es de negocio (§12.14). **Rompe el patrón del resto del repo a propósito**: `club_canjes` otorga valor económico (del otro lado hay un comercio esperando cobrar), así que **no tiene policy de INSERT/UPDATE/DELETE** y se escribe únicamente desde tres Edge Functions con `service_role` — `club-generar-canje`, `club-confirmar-canje`, `club-anular-canje`. La cuarta, `club-invitar-operador`, crea la cuenta del mostrador y manda el magic link (§12.10.4). Si alguna vez alguien "arregla" `src/api/clubApi.js` agregando un insert directo con la anon key, el club deja de tener sentido. Las lecturas sí van directas, filtradas por RLS. La pertenencia al comercio **no es un rol de `users`**: es tener fila en `club_comercio_usuarios`, y la responde `is_comercio_member()` / `mis_comercios()`. Rutas: `/beneficios` (**la vidriera**: pública, indexable, con slug y OG — es la que está en el nav), `/club` (**el mostrador del socio**: canjear y ver los canjes propios; se llega desde el carnet, el dashboard y el CTA de un beneficio, NO desde el nav — mandar ahí a un visitante es ofrecerle algo que no puede usar), `/club/postular` (postulación pública de un comercio) y `/comercio` (mostrador del comercio, requiere sesión). **Las cuatro leen la misma tabla `club_beneficios`**: la división es por para quién, no por de dónde sale el dato — la pregunta que §12.10.14 dejó abierta dos jornadas.
  ⚠️ **`club_canjes` NO se auto-confirma**: quien genera un canje no puede confirmarlo, salvo que `club_config.permitir_autoconfirmacion` esté en `true` (default `false`). Es el vector de inflación que §12.6 advierte para cuando existan los niveles.
  ⚠️ **El reaper corre por `pg_cron` cada 15 minutos** (`20260906150000`) **y además** al arrancar `club-generar-canje`. Son dos redes, no una duplicada: la segunda garantiza que nadie quede sin un beneficio por un canje que no usó, y esa garantía no puede depender de infraestructura externa. Toda la lógica que **decide** algo vive en `supabase/functions/_shared/club-reglas.ts` (puro, testeable con vitest) y las reglas de presentación en `src/lib/club.js`; el `index.ts` de cada función es pegamento HTTP y no se puede probar localmente.
- **Transparencia = dos páginas, un grupo de menú (2026-09-06)**: `/rendicion` (el
  movimiento del dinero) y `/legal-documents` (los instrumentos: estatuto, balances,
  actas). El item «Transparencia» del header es un grupo cuyo **padre lleva a
  `/rendicion`** y cuyo subitem lleva a los documentos, y cada página enlaza a la otra.
  ⚠️ Antes «Transparencia» apuntaba solo a los papeles: la rendición —lo único que
  muestra plata entrando y saliendo, y el diferencial del producto según §14— no estaba
  en el menú principal. **Todo esto es público sin sesión, y es deliberado**: la
  protección no es quién mira sino qué se escribe (ver la regla de `gastos`); un muro de
  registro no protegería nada y rompería el único uso que la rendición tiene.
  ⚠️ Los submenús del header se guardan en **un mapa por `key`**, no en una variable por
  grupo: el ternario de dos ramas que había hacía que todo grupo distinto de `nosotros`
  compartiera el estado de `colabora`. `src/components/Layout/Header.test.jsx` lo fija.
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

### Previews de compartir (WhatsApp, Facebook, X, LinkedIn…)

`<Helmet>` corre **en el navegador** y los scrapers de las redes **no ejecutan JavaScript**: leen el HTML crudo. Por eso el OG de la preview NO puede salir de Helmet y se sirve aparte, desde funciones en `api/share/`, a las que `vercel.json` manda solo a los bots mediante **rewrites condicionales por `User-Agent`**. El humano recibe la SPA normal y la URL `/api/share/` nunca se expone.

Hay dos familias, y la diferencia es de dónde sale el texto:

- **Páginas de detalle** (`/novedades/:slug`, `/beneficios/:slug`, `/partners/:slug`, `/activities/:id`, más las rutas de compatibilidad por `id`/`uuid`): el OG sale de la base. Una función por recurso en `api/share/<recurso>/`.
- **Páginas estáticas** (`/rendicion`, `/beneficios`, `/club`, `/about`, …): el OG sale de la tabla `PAGINAS` en **`api/share/pagina.js`**, una sola función parametrizada por `?p=<ruta>`.
- **La home y todo lo que no se comparte** (auth, `/dashboard`, `/carnet`, `/comercio`, `/comision`, `/admin/*`, `/agradecimiento`, `/confirm-attendance`): caen al OG institucional de `index.html`, a propósito — compartir un link privado no debe contar qué hay detrás.

**Al agregar una ruta pública nueva**: agregarla a `PAGINAS` **y** su rewrite en `vercel.json`. `api/share/pagina.test.js` cruza `src/App.jsx` ↔ `PAGINAS` ↔ `vercel.json` y falla si una ruta queda sin clasificar, así que no hace falta acordarse: `npm test` lo dice. Si la ruta no debe tener preview, va a `RUTAS_SIN_PREVIEW` en ese test, con el motivo.

**Las imágenes de las tarjetas** viven en `public/img/og/` y las genera `node tools/generate-og-images.mjs` (Chrome headless sobre un HTML maquetado; el título lo toma de `PAGINAS`, así que la imagen no puede decir algo distinto del `og:title`). Las 11 secciones que se comparten tienen tarjeta propia con su nombre impreso; las utilitarias y legales caen a `/img/og-image-1200x630.png`, que es el logo sobre blanco. `IMAGEN_POR_DEFECTO` y cada `imagen:` tienen que existir en `public/` y medir 1200x630 — un `og:image` que da 404 muestra una tarjeta **sin foto**, peor que la genérica; el test lo verifica.

Dos trampas que ya costaron caro:

- **Los buscadores no van en la lista de bots.** El HTML del stub lleva `canonical` y, en las funciones de detalle, `noindex`: mandar ahí a Googlebot le servía una página no indexable en lugar de la SPA. Se quitaron `Googlebot` y `bingbot` de todos los rewrites (el test lo verifica). Los buscadores renderizan JS y leen los `<Helmet>`.
- **WhatsApp cachea la preview por URL.** Si ya compartiste un link, seguís viendo la tarjeta vieja aunque el deploy esté bien. Para re-testear: variar la URL, o usar <https://developers.facebook.com/tools/debug/> y forzar el scrape.

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

**La numeración de ítems (`4.1`, `6.2`, …) es estable** y la citan **136 archivos** de código
(remedido al cierre del 2026-09-06 con `grep -rlE '§|ROADMAP' src/ supabase/ api/ tools/`;
decía 133 a mitad de esa jornada, 122 al cerrar §10 y 102 antes.) Mové ítems entre archivos si hace falta, pero no los
renumeres. ⚠️ **Al remedir, citá el comando**: sin él no se sabe si el número creció o
cambió el patrón.

Estado al **2026-09-08** (remedido, no copiado): **8 vulnerabilidades** (1 low, 5 moderate,
2 high: `browserslist` y `js-yaml`); npm reporta **fix no-breaking para las 8**, incluida
`react-router-dom`. ⚠️ **Subieron de 4 a 8 al saltar a `vitest@4`**: actualizar también
trae advisories, no solo los cierra. **494 tests en 41 archivos** (remedido el 2026-09-08 con `npx vitest run`; más los del
servicio de pagos, repo aparte). Falta cobertura del flujo real, y en particular **el
runtime de las Edge Functions no se puede probar acá** (`supabase start` falla en esta
máquina): la lógica que decide vive en `supabase/functions/_shared/club-reglas.ts`, que sí
se testea con vitest (**41 casos**), y cada `index.ts` se prueba recién en producción.
**Al 2026-09-06 no queda ninguna decisión del club fuera de ese archivo**: la última que
faltaba —el rescate diferido de §12.10.3— se extrajo como `decidirRescate()`. ESLint deja **39
warnings** de backlog (decía 50): **la barra es 0 errores**.

⚠️ Este párrafo decía «2 vulnerabilidades, 265 tests, 53 warnings», después «4, 459, 50»,
y **las dos veces las cifras estaban viejas cuando alguien las leyó**. Van tres remediciones. **Es el archivo que se carga en cada sesión: si miente acá, arranca
mintiendo todo lo demás.** Remedirlo es un minuto:
`npm test`, `npm run lint`, `npm audit`.

**Leé `ROADMAP.md` § "🚦 Por dónde arrancar" antes de trabajar**: es lo primero del archivo,
se reescribe al cierre de cada jornada y dice qué verificar antes de tocar nada. El cierre
de la última jornada está en **§14.7** de `HISTORIAL.md`; los cierres anteriores, en §11.7 y
§11.6. Entre todos suman **veinticuatro afirmaciones de este repo que resultaron falsas** —
**diez de ellas el 2026-09-08, en una sola pasada de verificación**, que es el récord y la
mejor prueba de por qué esta regla existe. Entre las peores: §12.10.11 declaró el cron del
club «deuda consciente» porque «el plan Free de Supabase no lo trae», y **`pg_cron` estaba
disponible y precargada** — nadie miró la base. Y el 2026-09-08, **§10 se declaraba cerrada
con dos pendientes que ya no existían y un puntero a un ítem inexistente**, mientras tres
tareas marcadas como pendientes estaban hechas. Leelas: son el mejor resumen de cómo se rompe este proyecto. **La deuda del club se cerró el 2026-09-06**: lo que queda de §12 es de negocio
(conseguir comercios de ticket bajo) y vive en §12.14.

⚠️ **`tools/db.sh dump` produce un backup que NO restaura tal cual en PostgreSQL 15, y
son TRES obstáculos, no uno.** El cliente es `pg_dump` **17** y producción es **15**:
(1) el dump trae `SET transaction_timeout`, que 15 no conoce; (2) `psql` 17.6 emite además
las meta-órdenes `restrict`/`unrestrict`, que 15 rechaza con `invalid command` **incluso
sin `ON_ERROR_STOP`**; (3) trae su propio `CREATE SCHEMA public`. Los tres se saltean con
un `sed` de tres expresiones + dropear `public` en el destino. **La receta completa y
probada está en `ROADMAP.md` §A**, con el detalle de que el contenedor destino necesita el
bootstrap de `pg15-bootstrap/` montado o muere a mitad de la inicialización.

**Cuatro cosas que costaron trabajo real y conviene no volver a aprender:**
- **Antes de escribir una migración, `git fetch` y conectate a la base y mirá.** El
  2026-08-30 se escribieron tres commits contra un esquema que el repo describía mal
  (`HISTORIAL.md`, Sesión J) y sobre una copia local 20 commits atrás.
- **Una verificación tiene que poder fallar.** Poné un control positivo al lado del
  negativo, y en seguridad probá las dos puntas: que lo ilegítimo se rechace **y** que lo
  legítimo pase. "Rechaza lo malo" y "rechaza todo" se ven idénticos desde afuera.
- **En una integración con un tercero, probá el camino de ERROR.** El webhook tomaba el
  cuerpo de error de MercadoPago como si fuera un pago y perdía cobros en silencio; estaba
  así desde el primer día y lo destapó simular una notificación (§10.21).
- **Una configuración declarada y sin consumidor no gobierna nada.** `entidad.vocabulario`
  existió tres semanas con la respuesta correcta adentro —`'padrino'`, no `'socio'`— y
  mientras nadie la leyera, el ROADMAP siguió diseñando la tabla equivocada (§10.27).
  Cuando agregues una opción de configuración, agregá en el mismo commit quién la lee.
