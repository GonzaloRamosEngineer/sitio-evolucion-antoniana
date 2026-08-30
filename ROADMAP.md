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
| **Producto** | El club de beneficios: el canje y el comercio como actor | §11 abajo |

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
| **1** | ~~`aportes` + `acceso_vigente()` + `tiene_acceso()`~~ **✅ ESQUEMA HECHO 2026-08-30** — `20260830120000_aportes_acceso.sql` (libro + funciones de acceso) y `20260830130000_aportes_triggers_antiguedad.sql` (triggers que lo alimentan + antigüedad). Validado en Docker: 22 comprobaciones entre `aportes-check.sql` y `triggers-aportes-check.sql`. Parámetros reales ya cargados (cuota $5.000, piso = la cuota). **Falta**: aplicarlo en producción y correr el backfill | ~2-3 días | Historial de aportes en el panel del socio |
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

### 10.4 — Decisiones de negocio (TOMADAS el 2026-08-30)

Las tomó la Fundación; acá queda el qué y el porqué, porque son las que un cliente
distinto va a querer cambiar (ver 10.5).

1. **¿Cuántos meses de acceso otorga una donación puntual?**
   → **Proporcional:** `meses = least(12, greatest(1, floor(monto / cuota_referencia)))`.
   No un plazo fijo: "cualquier donación da 6 meses" canibaliza la cuota. Implementado en
   `meses_por_donacion()`, que es la **única** fuente de la regla — la usan el trigger y
   el backfill, para que no puedan decir cosas distintas.

2. **¿Cuál es el piso para que una donación otorgue acceso?**
   → **El precio de la cuota.** Sin piso, una donación de $100 otorgaba un mes entero de
   beneficios, que es exactamente lo que 10.4.1 quería evitar. Se modela como
   `piso_monto = NULL` (que significa "usar `cuota_referencia`") y **no** como el número
   copiado: así al subir la cuota el piso sube solo y no pueden desincronizarse.

3. **¿Hay período de gracia cuando falla el cobro?**
   → **30 días, y solo para cuotas.** Un cobro recurrente falla por tarjeta vencida más
   que por decisión. Una donación puntual no "falla": simplemente se terminó, así que la
   gracia no aplica. Está en `reglas_acceso.dias_gracia` y verificado en
   `supabase/checks/aportes-check.sql`.

4. **¿Cómo corre la antigüedad si alguien deja de pagar y vuelve?**
   → **No es un número, son tres**, y los tres salen del mismo libro sin guardar nada
   extra (`antiguedad_socio()`):

   | Número | Qué es | Se reinicia? |
   |---|---|---|
   | `socio_desde` | Fecha del primer aporte. La identidad, lo que va en el carnet | **Nunca** |
   | `meses_aportados` | Suma real de tiempo cubierto, sin contar dos veces los solapamientos | No, pero solo crece pagando |
   | `racha_meses` | Tramo continuo actual, sin cortes | Sí, en cada interrupción |

   **La regla: los derechos los da `meses_aportados`, no `socio_desde`.** Así quien se fue
   un año y volvió no pierde su historia —sigue siendo socio desde 2026— pero tampoco
   cobra beneficios por el año que no pagó. Y `racha_meses` queda disponible para premiar
   la continuidad sin castigar al que tuvo un mal año.

   Las tres se calculan con `range_agg` sobre los períodos de acceso: Postgres une los
   rangos solapados y deja los huecos a la vista. Sumar días a mano es donde aparece el
   doble conteo (un doble pago valdría doble); está verificado que no ocurre.

5. **¿El donante accede a los mismos beneficios que el socio?**
   → **Sí, al mismo catálogo de descuentos**, pero el socio conserva lo que el donante no
   puede tener: antigüedad, número de socio, carnet, prioridad de cupo y voz en asamblea.
   Coincide con la realidad legal: en una asociación civil el socio tiene derechos
   estatutarios que el donante no tiene.

6. **¿Los beneficios exclusivos son la regla o la excepción?**
   → **Mixto, con los mejores cerrados.** `benefits.requiere_acceso` nace en `false` (no
   cambia el comportamiento al migrar) y se cierra beneficio por beneficio. El visitante
   ve el catálogo completo con los exclusivos **visibles pero bloqueados**: ver lo que uno
   se está perdiendo convierte mejor que no saber que existe.

7. **¿Quién escribe en `aportes`?**
   → **Triggers en la base** (`trg_registrar_aporte_cuota` / `trg_registrar_aporte_donacion`),
   no el webhook externo ni un cron. El webhook de cobros vive fuera de este repo
   (`mp-supabase-webhook.onrender.com`, ver `vercel.json`) y solo toca `memberships` y
   `donations`; con triggers el libro se llena **sin importar quién escriba el pago** —
   ese webhook, un admin cargando en efectivo, o el proveedor que venga en dos años. Es
   el desacople que justifica que el libro exista.
   Idempotencia por `aportes.payment_id` con índice único: **MercadoPago reintenta los
   webhooks**, y sin esa clave cada reintento regalaba un mes de acceso.

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

1. ~~**`src/lib/supabase.js:8-13` cae a la URL y anon key de producción**~~ — **resuelto
   el 2026-08-30**. Se quitaron las credenciales de fallback: el cliente lanza al
   importarse y `vite.config.js` **aborta el build** si faltan `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` (verificado: `npm run build` sale con código 1). Era
   prerrequisito del módulo de canjes de §11: con canjes en producción, un fork mal
   configurado no mostraba datos de más, **emitía canjes contra la base equivocada**.
2. ~~**Las migraciones no reconstruyen desde cero**~~ — **resuelto el 2026-08-16**
   (`HISTORIAL.md`). Sin eso, "levantar un cliente
   nuevo" es trabajo manual, no un comando. Es la fase 0 de 10.3.
3. **Marca y textos hardcodeados** en ~40 archivos (ítem 3.4 y afines).

Ninguno de los tres es este modelo de dominio — pero **conviene resolver el 2 antes de
empezar la fase 1**, porque cada migración nueva agranda ese problema.

---

## 11. Club de beneficios: el canje (propuesta, 2026-08-30)

### 11.0 — Qué es esto y cómo se relaciona con §10

La §10 responde **quién tiene derecho** a un beneficio (aporte → acceso). Esta sección
responde las otras dos preguntas, que quedaron fuera: **qué pasa en el mostrador** y
**qué gana el comercio por estar**.

Son módulos distintos y conviene que lo sigan siendo. §10 es del dominio de la entidad
(socios, cuotas, donaciones). §11 es un módulo genérico que solo le pregunta a §10 una
cosa: `tiene_acceso(user_id)`. Esa frontera es lo que lo hace portable a otro proyecto
(ver 11.7), y es una decisión de diseño, no una casualidad.

**La fase 1 de §10 es prerrequisito literal de todo lo de acá.** Sin `tiene_acceso()`,
el club no puede distinguir un socio de un visitante y no hay nada que validar.

---

### 11.1 — Estado actual (verificado 2026-08-30)

- [ ] **11.1.a — Hoy no hay un club: hay un listado de cupones.**
  `benefits.codigo` y `benefits.codigo_descuento` (`baseline:378-379`) son texto
  estático, uno solo por beneficio, igual para todo el mundo.
  `BenefitDetailPage.jsx:231` lo renderiza en pantalla, y `/beneficios/:slug`
  (`App.jsx:101`) es **ruta pública sin `ProtectedRoute`**: el código se lo lleva
  cualquiera que entre al sitio. Un código estático y público no se puede limitar,
  ni vencer, ni contar, ni atribuir a una persona.

- [ ] **11.1.b — El comercio no existe como actor del sistema.**
  `partners` (`baseline:507`) tiene nombre, logo, descripción, contacto y estado. **No
  tiene login, ni sucursales, ni ubicación, ni usuarios, ni forma de reportar nada.**
  Un partner es hoy un logo en la Home, no una contraparte operativa.

- [ ] **11.1.c — No hay registro de que un beneficio se haya usado.**
  No existe tabla de canjes ni equivalente. Consecuencia práctica: la entidad no puede
  decirle al comercio cuánta gente le mandó, que es exactamente el argumento que hace
  falta para renovar el acuerdo al año siguiente.

---

### 11.2 — Decisión de arquitectura

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
— nunca un código genérico, que es justo lo que hay hoy (11.1.a).

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

### 11.3 — El flujo

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
7. Campo opcional "Monto de la operación" (de esto depende el reporte de 11.6).
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

### 11.4 — Modelo de datos

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

club_config (clave text pk, valor jsonb)   -- todo parámetro variable vive acá (11.7)
```

**Por qué `club_comercios` y no extender `partners`:** hoy `partners` son sponsors
institucionales y sus logos van a la Home (`tools/normalize-partner-logos.mjs`). Si se
mezclan, la primera pizzería que entre al club aparece en la grilla de aliados de la
Fundación. Son dos relaciones distintas con la entidad, aunque una empresa pueda ser las
dos cosas — de ahí el `partner_id` opcional.

`benefits` queda como está y se deprecia migrando su contenido a `club_beneficios`. No
conviene romper las páginas públicas de entrada.

---

### 11.5 — Dónde vive la lógica: cambio de patrón respecto del resto del repo

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

### 11.6 — Niveles de comercio: el incentivo

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

### 11.7 — Reglas de portabilidad (qué lo hace reutilizable)

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

### 11.8 — Orden de implementación

| Fase | Qué | Deja algo usable? |
|---|---|---|
| **0** | ~~§10 fase 1: `aportes` + `tiene_acceso()`~~ + ~~bloqueante #1 de 10.6~~ **✅ HECHO 2026-08-30** (esquema y guarda de credenciales; falta aplicar en prod) | Prerrequisito literal: sin esto no hay a quién validarle nada |
| **1** | Carnet digital (QR del socio) + `requiere_acceso` en beneficios + catálogo que muestra el estado de acceso | **Ya es un club funcionando**, sin pedirle nada al comercio (modelo D) |
| **2** | `club_comercios`/`club_sucursales`/`club_comercio_usuarios` + `club_canjes` + las 3 Edge Functions + panel `/comercio` | Entra el comercio. Acá aparece la trazabilidad |
| **3** | Reporte para el comercio + límites finos + anulación + sucursales en mapa | **Esto es lo que hace que el comercio renueve** |
| **4** | `club_niveles` + cálculo + badges en catálogo (con umbrales sobre datos reales) | El incentivo de 11.6 |
| **5** | Extracción a un segundo proyecto (11.7). Wallet passes (Apple/Google) solo si hace falta | Producto |

**La fase 1 sin comercio digital es deliberada.** La mayoría de los clubes de beneficios
mueren porque le exigen un panel al comercio desde el día uno; el comercio no lo usa,
los canjes no se registran, y no hay números para renovar. Conviene entrar con la
credencial y digitalizar comercio por comercio.

---

### 11.9 — Decisiones de negocio (TOMADAS el 2026-08-30)

1. **¿El comercio entra digitalizado desde el arranque?**
   → **Se arranca con un comercio piloto: DigitalMatch** (descuento en landing pages y
   sitios web). Es un comercio propio, así que la fase 2 se puede probar de punta a punta
   sin depender de que un tercero adopte nada. Los demás entran por credencial (modelo D)
   y se digitalizan de a uno.

2. **¿Se captura el monto de la operación?**
   → **Opcional.** Y la forma de conseguirlo no es exigirlo: es que el reporte trimestral
   —"el club te mandó N personas, $X de consumo"— solo se pueda armar con ese dato. El
   comercio termina pidiéndolo él para tener sus métricas y para calificar a los niveles
   altos. Si se exige de entrada, el cajero lo completa con cualquier número.

3. **¿Qué pasa con los beneficios de un comercio dado de baja?**
   → **Los canjes no se borran nunca**: son el libro contable del club. La ficha del
   comercio se archiva y sus beneficios pasan a inactivos.

4. **¿El donante puntual entra al club?** → Sí, resuelto en 10.4.5.

Queda una sola decisión abierta, y **a propósito**: los umbrales de los niveles de
comercio (11.6). Se fijan con 3 meses de datos reales, no antes.

---
