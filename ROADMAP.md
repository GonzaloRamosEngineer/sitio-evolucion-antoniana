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

La única **vulnerabilidad viva** es `react-router-dom@6.30.4` (open redirect → XSS,
moderate). No tiene parche en la v6: el arreglo es react-router v7, un major. Ver 6.7.

---

## A. Deuda técnica abierta

### 6.7 — Upgrades de dependencias

**Ya hecho (Sesión I, 2026-08-16 — detalle en `HISTORIAL.md`):** `vite@4` (EOL) → `7.3`,
`vitest@0.34` → `4`, más los arreglos no-breaking de `dompurify`, `postcss` y
`react-router-dom`. Las vulnerabilidades pasaron de **13 a 2**.

**Lo que queda, en orden de valor:**

1. **`react-router-dom@6 → v7`** — la **única vulnerabilidad viva** (open redirect → XSS,
   moderate). No tiene parche en la v6: `6.30.4` es la última y sigue en el rango
   vulnerable. La v7 es en buena medida compatible, pero es un major sobre el router de
   toda la app: **rama propia, deploy propio, y verificación en navegador de todas las
   rutas**, no de una muestra.
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

1. **`src/lib/supabase.js:8-13` cae a la URL y anon key de producción** si faltan las
   variables de entorno. Un fork mal configurado escribe en la base de la Fundación **sin
   fallar**. Es el más barato de arreglar y el más grave: debe romper el build, no
   silenciarse.
2. ~~**Las migraciones no reconstruyen desde cero**~~ — **resuelto el 2026-08-16**
   (`HISTORIAL.md`). Sin eso, "levantar un cliente
   nuevo" es trabajo manual, no un comando. Es la fase 0 de 10.3.
3. **Marca y textos hardcodeados** en ~40 archivos (ítem 3.4 y afines).

Ninguno de los tres es este modelo de dominio — pero **conviene resolver el 2 antes de
empezar la fase 1**, porque cada migración nueva agranda ese problema.

---
