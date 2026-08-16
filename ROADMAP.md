# ROADMAP — Sitio Fundación Evolución Antoniana

> **Qué es esto:** lo que **falta hacer**. Nada más.
> El trabajo ya terminado —sesiones A-I, 83 ítems cerrados y el razonamiento detrás de
> cada decisión— está en **[`HISTORIAL.md`](HISTORIAL.md)**.
>
> Se partió en dos el 2026-08-16. Antes era un solo archivo de 1.522 líneas donde el 88%
> era historia, y eso tuvo un costo real: dos premisas habían quedado vencidas sin que
> nadie lo notara (decía "63 `console.*`" cuando eran 40 y todos `error`/`warn`; mandaba
> optimizar una imagen que no usaba nadie). Seguirlas al pie de la letra habría empeorado
> las cosas. **En la parte que nadie relee es donde se pudren las afirmaciones.**
>
> **La numeración de los ítems no se toca** (`3.4`, `6.7`, …): hay 35 archivos de código
> con comentarios que la citan.

---

## Estado

Las nueve sesiones planificadas (A-I) están cerradas y desplegadas. El sitio está sano en
producción, con lint en 0 errores, 78 tests y `vite@7`.

Lo que queda son **dos cosas de naturaleza distinta**:

| | Qué | Dónde |
|---|---|---|
| **Deuda** | 2 ítems técnicos + deuda menor. Nada bloquea nada | §A abajo |
| **Producto** | El modelo aporte→acceso, que nunca se construyó | §10 abajo |

La única **vulnerabilidad viva** es `react-router-dom` (open redirect → XSS, moderate).
Ver 6.7.

⚠️ **Pendiente de aplicar a producción (2026-08-16):** la migración
`20260816120000_fix_view_rls_bypass_and_anon_grants.sql` cierra una **fuga de datos
financieros verificada en producción** — dos vistas puenteaban las RLS y exponían a
`anon` el historial de pagos de cada persona y la facturación de la entidad. Está
**validada en Docker pero NO aplicada**. Es lo más urgente del repo. Ver §C.

---

## A. Deuda técnica abierta

### 6.7 — Upgrades de dependencias

**Ya hecho (Sesión I, 2026-08-16 — detalle en `HISTORIAL.md`):** `vite@4` (EOL) → `7.3`,
`vitest@0.34` → `4`, más los arreglos no-breaking de `dompurify`, `postcss` y
`react-router-dom`. Las vulnerabilidades pasaron de **13 a 2**.

**Lo que queda, en orden de valor:**

1. **`react-router-dom` → por encima de `7.17.0`** — la **única vulnerabilidad viva**.
   ⚠️ **Corregido el 2026-08-16:** el rango del aviso es `6.0.0 – 7.17.0`, o sea que
   **subir a v7 a secas ya no alcanza** — hay que ir por encima de 7.17.0. Son dos CVE;
   el de hidratación SSR (`deserializeErrors`) **no aplica acá** porque la app es una SPA
   pura, el de open redirect sí. `npm audit fix` promete arreglarlo pero el *dry run*
   confirma que no cambia nada: sigue requiriendo el major a mano. Es un major sobre el
   router de toda la app: **rama propia, deploy propio, y verificación en navegador de
   todas las rutas**, no de una muestra.
2. **`eslint@8 → v9`** — la config ya es flat, así que el salto es menor de lo que suena.
   Sale de EOL. Sin vulns asociadas.
3. **`tailwindcss@3 → v4`** — cambio grande de motor. Sin urgencia.
4. **`framer-motion@10 → motion`** — 59 archivos. **Diferir indefinidamente:** mucho
   riesgo a cambio de nada concreto.

**Dos reglas que salieron de hacer el de Vite:**
- **Verificar el requisito de Node del deploy *antes* de instalar.** Es lo que decide si
  el upgrade rompe Vercel, no lo que compile en tu máquina. `.nvmrc` manda.
- **`npm audit fix` sin `--force` es seguro** (solo aplica no-breaking). **Con `--force`
  sube majors de golpe** y es exactamente lo que no querés.

---

### 3.4 — Datos institucionales hardcodeados ⚠️ requiere decisión de la Fundación

**Qué es:** las métricas de la Home (`Home.jsx:51-72`) y los reconocimientos y
autoridades de Nosotros (`About.jsx:60-85`) están escritos en el código. Cambiar un
número o un nombre de la Comisión Directiva **requiere un deploy**.

**Esto no es una decisión técnica.** La pregunta real es: *¿quién mantiene esos datos y
cada cuánto cambian?*

**Alternativas:**
- **(a) Dejarlo en código.** Correcto si cambia una o dos veces al año y siempre lo
  toca alguien con acceso al repo. Cero trabajo.
- **(b) Moverlo a la base.** La tabla `fundacion_metrics` **ya existe** y el Dashboard
  ya la lee. Habría que crear el CRUD en el panel admin. ~1-2 días. Se justifica si la
  Fundación quiere editarlo sin depender de un desarrollador.
- **(c) Mixto:** las métricas (números que cambian) a la base; autoridades y
  reconocimientos (que cambian con cada elección de comisión) en código.

→ **Recomendado: preguntar antes de codificar.** Si la respuesta es "lo actualizamos
una vez por año cuando cambia la comisión", **(a) es la respuesta correcta** y el ítem
se cierra como "no se hace". Si es "queremos cambiar las métricas cada trimestre",
entonces (b) para métricas. Mi sospecha, por la naturaleza de los datos, es que **(a) o
(c)** alcanzan — pero es su decisión, no nuestra.

---

### Deuda menor declarada (no bloquea nada)

| Qué | Dónde quedó | Recomendación |
|---|---|---|
| `ApplyPartnerPage` con el lenguaje visual viejo (pill glassmórfico, grid de puntos, `rounded-3xl`) que 5.13 eliminó del resto | `HISTORIAL.md` §8, Sesión F1 | Hacerlo en una pasada de identidad visual, no suelto. Es la última página pública fuera del sistema. |
| `GuestRegistrationForm`, `RequestPasswordResetForm`, `UpdatePasswordForm` con validación manual | `HISTORIAL.md` §4, ítem 4.6 | Migrar **al tocarlos**. Es la política acordada desde la Sesión G, no una omisión. |
| `ActivityDetailPage` y los módulos de Comisión sin TanStack Query | `HISTORIAL.md` §4, ítem 4.2 | Igual: al tocarlos. Tienen bastante lógica de mutación propia. |
| `getPartnerBySlug` sin consumidores | `HISTORIAL.md` §8, Sesión F2 | Borrar en la próxima limpieza. Se conservó por simetría con `getNewsBySlug`. |
| 53 warnings de lint (imports sin usar, 2 `exhaustive-deps`) | `HISTORIAL.md` §4, ítem 4.7 | Barrer de a poco. El gate falla solo en errores; **0 errores es la barra**. |
| Micro-tipografía `text-[9-10px]` en paneles internos | `HISTORIAL.md` §5, ítem 5.7 | Backlog opcional declarado. Solo si molesta en uso real. |

---

## B. Cómo trabajar en este repo

Dos procedimientos que se ganaron su lugar acá porque **se aprendieron rompiendo cosas**.

### Antes de tocar el bundle: verificar en un navegador

En la Sesión H, un `manualChunks` mal armado dejó **el sitio en blanco en producción**
con `build`, `lint` y los 72 tests **los tres en verde**. Ninguna de esas tres cosas
carga la página, así que ninguna podía verlo. Al tocar `vite.config.js`, lazy loading,
orden de imports o cualquier cosa que cambie cómo arranca la app, verificar así:

```bash
npm run build
npx vite preview --port 4179 &
# Chrome headless ejecuta el JS y vuelca el DOM ya renderizado.
chrome --headless=new --disable-gpu --virtual-time-budget=7000 \n       --dump-dom http://localhost:4179/ > dom.html
```

Un sitio sano da **~58 KB** de DOM en la home con `<nav>` y `<footer>` presentes; el
roto daba **3,3 KB** y ninguno de los dos. Comprobar además `/nosotros`, `/actividades`,
`/colaborar`, `/contact` y `/login`, que son las rutas con distinto árbol de vendors.
Y como con cualquier verificación: **confirmar que detecta el fallo** corriéndola una
vez contra el build roto, si no, no se sabe si sirve.

### Migraciones: validar en Docker, nunca contra producción

`supabase/checks/README.md` tiene el procedimiento. Tres cosas que cuestan tiempo si no
se saben:

- **Esperar el *segundo* `database system is ready to accept connections`** en
  `docker logs`. `pg_isready` da OK antes de que terminen los scripts de setup de la
  imagen, y aplicar el baseline en el medio falla con un
  `could not open relation with OID …` que no tiene nada que ver con las migraciones.
- **`20260719140000_comision_docs_storage.sql` se saltea en Postgres pelado y está bien**:
  emite un `NOTICE` porque `storage.buckets` la crea storage-api, no la imagen.
- **Producción corre PostgreSQL 15**; la validación documentada usa la imagen 17.6.1. El
  DDL es estándar, pero la diferencia de major existe y conviene tenerla presente.

⚠️ **`supabase db push` contra producción no es rutina.** El historial remoto está vacío
(el esquema se aplicó pegando SQL en el editor web), así que el CLI intentaría aplicar
las tres migraciones. Convergen sin cambios y cada una corre en su transacción, pero son
~1.100 líneas de DDL contra la base viva: backup reciente y fuera de horario.

---

## C. Pendiente crítico: aplicar el fix de seguridad a producción

La migración `20260816120000_fix_view_rls_bypass_and_anon_grants.sql` **está validada en
Docker y NO aplicada a producción.** Hasta que se aplique, la fuga sigue abierta.

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

## 10. Modelo de dominio: aporte → acceso (propuesta, 2026-08-16)

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

### 10.1 — Estado actual (verificado 2026-08-16)

- [ ] **10.1.a — No existe la entidad socio.**
  Existen `users` (cuenta de login, `baseline:583`) y `memberships` (suscripción de
  cobro de MercadoPago, `baseline:446`). No existe número de socio, fecha de alta como
  socio, categoría ni estado institucional. `memberships` modela **un cobro recurrente**,
  no una membresía. Buscado `is_socio|socio_activo|estado_socio|member_since|numero_socio`
  en `src/` y `supabase/`: **cero resultados**.

- [ ] **10.1.b — La cuota no habilita nada. ← el nudo del asunto**
  Verificado: `BenefitsPage.jsx`, `BenefitDetailPage.jsx`, `BenefitCard.jsx`,
  `Activities.jsx` y `ActivityDetailPage.jsx` **no consultan `memberships` en ningún
  punto**. Un visitante sin cuenta ve y usa exactamente lo mismo que un socio que paga
  hace tres años. El sistema cobra una cuota que, dentro del sistema, no otorga ningún
  privilegio. **Esta es la causa de que los módulos se sientan sueltos**: no falta
  pegamento entre ellos, falta el concepto que los enhebra.

- [ ] **10.1.c — Cuatro identidades paralelas de la misma persona.**
  | Dónde | Campos | Se vincula a `users`? |
  |---|---|---|
  | `users` | `email` (unique), `dni`, `phone` | es la cuenta |
  | `registrations` | `guest_name`, `guest_email` | **no** — el CHECK `check_registration_type` fuerza que sea `user_id` **o** invitado, nunca ambos |
  | `education_preinscriptions` | `email`, `full_name`, `dni`, `phone` | solo si había sesión abierta al enviar (`educationApi.js:41`); si no, queda huérfano |
  | `memberships` | `payer_email` | es el mail de MercadoPago, puede diferir del de la cuenta |
  Nada reconcilia los cuatro. La misma persona puede donar, preinscribir a un hijo,
  anotarse de invitada y ser socia, y el sistema la ve como cuatro personas distintas.

- [ ] **10.1.d — Las actividades no tienen precio.**
  `activities` (`baseline:333`) tiene título, descripción, fecha, duración, modalidad,
  cupo, imágenes y redes. **Ningún campo de precio, arancel o costo.** La distinción
  "algunas actividades son gratis y otras pagas" —que es la mitad del valor de ser
  socio— hoy no existe en la base.

- [ ] **10.1.e — No hay campañas; `donation_type` es texto libre sin escritor.**
  `donations.donation_type` (`baseline:405`) es `text NOT NULL`, pero el único lugar del
  código que lo menciona es `DonationList.jsx:35`, que **lo lee**. No hay tabla de
  campañas ni iniciativas. "Doné para esta causa puntual" no está modelado.

- [ ] **10.1.f — Un socio puede acumular varias membresías activas.**
  Sin restricción de unicidad sobre `memberships`. `getUserMemberships` y el Dashboard ya
  operan sobre un array, así que la UI lo asume. Un doble pago deja dos suscripciones
  cobrando en paralelo.

- [ ] **10.1.g — Permisos de `anon` más amplios de lo necesario.**
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
| **1** | `aportes` + `acceso_vigente()` + `tiene_acceso()` + backfill | ~2-3 días | Historial de aportes en el panel del socio |
| **2** | `precio_general`/`precio_socio` en actividades + `requiere_acceso` en beneficios | ~2-3 días | **Acá la cuota empieza a valer algo** |
| **3** | `campanas` + FK desde donaciones + barra de progreso pública | ~2 días | Donaciones dirigidas |
| **4** | `socios` + `categorias_socio` + número y antigüedad | ~2 días | Carnet, antigüedad, categorías |
| **5** | Unicidad de membresía activa (10.1.f) + achicar GRANTs (10.1.g) | ~medio día | Higiene |

**La fase 0 ya está hecha** (2026-08-16). Era el prerrequisito de todo lo demás: las
migraciones no reconstruían la base desde cero, y las 5 nuevas de la fase 1 se habrían
apilado sobre una cadena rota. Ahora `supabase db push` levanta el esquema completo
desde cero, que es lo que hace viable el objetivo multi-cliente (10.6).

#### Backfill (parte de la fase 1, no la subestimes)

Hay que volcar `memberships` y `donations` existentes a `aportes`. Requisitos:
- **Idempotente**, como el resto de las migraciones del repo.
- Decisión previa: *¿desde qué fecha se reconoce antigüedad?* Si se toma
  `memberships.created_at`, quien pausó y retomó pierde continuidad.
- Verificar contra Docker con `supabase/checks/` antes de tocar producción — el
  procedimiento está en `supabase/checks/README.md` y en `HISTORIAL.md` §8, Sesión F2.

---

### 10.4 — Decisiones de negocio pendientes (no son técnicas)

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
| Campañas con meta y estado | ❌ No existe |
| Libro de aportes con destino | ❌ No existe (10.2 lo diseña) |
| **Gastos + comprobante + balance por campaña** | ❌ **No existe. Es la mitad faltante** |
| Cupos/becas y apadrinamiento con beneficiario | ❌ No existe (y el UI ya lo promete) |
| Rendición pública | ❌ No existe |

**No es "deuda técnica": es funcionalidad que nunca se construyó.** La deuda real que sí
bloquea es corta: `donation_type` es texto libre sin escritor (10.1.e), `memberships` no
tiene destino ni unicidad (10.1.f), y la migración de seguridad de §C sigue sin aplicarse.

#### Orden sugerido

| Fase | Qué | Aprox. |
|---|---|---|
| **1** | `campanas` (tipo, meta, estado) + `aportes` con `campana_id` + elegir destino en el checkout | ~1 semana |
| **2** | `gastos` + comprobante reusando Storage + balance por campaña | ~1 semana |
| **3** | Rendición pública: barra de progreso y "así se gastó" | ~4-5 días |
| **4** | Cupos/becas + apadrinamiento anonimizado + reporte al padrino | ~1 semana + legal |

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
