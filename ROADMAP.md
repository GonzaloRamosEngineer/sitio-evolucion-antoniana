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

## 🚦 Por dónde arrancar (actualizado 2026-08-30, jornada del club)

> **Leé esto primero, y verificá lo que dice antes de actuar.** Esta sección se
> reescribe al cierre de cada jornada. Si la fecha de arriba está vieja, desconfiá:
> en este archivo, la parte que nadie relee es donde se pudren las afirmaciones.

**Estado en una línea:** el circuito de ingresos está completo y cerrado, y la **fase 2 del
club está aplicada en producción** —6 tablas, RLS y las tres Edge Functions desplegadas el
2026-08-31— pero **todavía no se hizo ningún canje real**, y el club sigue vacío de los dos
lados: 1 beneficio (del catálogo viejo), 0 socios con acceso vigente.

**Lo primero, en orden:**

1. **Cargar DigitalMatch y hacer el primer canje real** (§11.7). El esquema, las funciones
   y **el ABM** ya están en producción, así que esto ya **no necesita un desarrollador**:
   se hace desde `/admin → Club de beneficios`. Cargar el comercio, la sucursal, el
   beneficio redactado y el operador del mostrador; después generar en un teléfono y
   confirmar en otro. Eso ejercita las dos cosas que siguen sin probarse: **el camino feliz
   autenticado** de las Edge Functions y **la pantalla del ABM**, que nunca se vio
   renderizada (§11.7.9).
2. **Rotar la contraseña de la base.** Único pendiente de seguridad. Vive en **un solo
   archivo**: `.env.db`. ⚠️ Corregido el 2026-08-30: este archivo dijo cuatro veces que
   también estaba en `~/.config/antoniana/db.url` — **ese archivo no existe**, ni ahí ni en
   ningún lado del perfil, y ningún script del repo lo lee. Y rotar **no toca producción**:
   el servicio de pagos usa `SUPABASE_SERVICE_ROLE_KEY` y el sitio la anon key, así que el
   único consumidor de esa contraseña es `tools/db.sh`.
3. **Cargar el primer gasto real** desde `/admin → Gastos`. Estrena `/rendicion`. No es
   técnico: es tarea de la entidad.
4. **`react-router-dom` > `7.17.0`** — la única vulnerabilidad viva.

**Antes de tocar nada, tres comprobaciones que ya evitaron daño real:**

```bash
git fetch && git status          # la copia local estuvo 20 y 8 commits atrás, dos veces
bash tools/db.sh check           # mirar la base, no el ROADMAP
curl.exe https://mp-supabase-webhook.onrender.com/health
```

`/health` tiene que decir hoy: `version: 2026-08-31.consulta-mp`, `firma_modo: "rechaza"`,
`valida_firma_mp: true`, `backfill_habilitado: false`. Si `backfill_habilitado` dice `true`,
**alguien dejó abierta la ruta temporal**: borrar `BACKFILL_TOKEN` en Render.

**Las cuatro reglas que este proyecto pagó caro:**

1. **Verificá las premisas del ROADMAP contra el código antes de trabajar.** Cinco
   afirmaciones de este archivo resultaron falsas el 2026-08-30/31 (§11.6.2) y **cuatro más
   el 2026-08-30** (§11.7.2). Van nueve. No es mala suerte: es lo que le pasa a un
   documento que se escribe una vez y se relee nunca.
2. **Una verificación tiene que poder fallar.** Hacela fallar una vez antes de creerle
   (§11.6.3). Y en seguridad, probá **las dos puntas**: que lo ilegítimo se rechace y que lo
   legítimo pase.
3. **Migración a Docker primero**, nunca directo a producción (§B).
4. **Verificá en un navegador si tocaste una página** — con las rutas reales, que están en
   inglés, y confirmando **contenido**, no tamaño. El 404 mide 25.900 bytes, y `/club`
   mide 25.646: **254 bytes de diferencia**. Comparar tamaños habría aprobado un 404.
   ⚠️ **Y confirmar contenido tampoco alcanza: hay que MIRAR la pantalla, en ancho de
   teléfono.** `/club` pasó el chequeo por contenido —tenía todas las cadenas correctas— y
   en un celular el título salía a una palabra por renglón (§11.7.10).

---

## Estado

Las nueve sesiones planificadas (A-I) están cerradas y desplegadas. El sitio está sano en
producción, con lint en 0 errores, 174 tests y `vite@7`.

Lo que queda son **dos cosas de naturaleza distinta**:

| | Qué | Dónde |
|---|---|---|
| **Bloqueante** | Las donaciones llegan sin saber quién donó, así que el acceso no le alcanza a nadie | §10.17 |
| **Deuda** | 2 ítems técnicos + deuda menor. Nada bloquea nada | §A abajo |
| **Producto** | Precio de socio en actividades, socios formales | §10 abajo |
| **Producto** | El club de beneficios: el canje y el comercio como actor | §12 abajo |

La única **vulnerabilidad viva** es `react-router-dom` (open redirect → XSS, moderate).
Ver 6.7.

✅ **Cerrado el 2026-08-16:** la fuga de datos financieros (dos vistas puenteaban las RLS
y exponían a `anon` el historial de pagos de cada persona) **está tapada en producción y
verificada** (§C). Junto con ella se aplicaron las **fases 1 y 2 del modelo de aportes**:

| | Qué quedó | Detalle |
|---|---|---|
| **Fase 1** | `destinos` + `aportes`: el libro único con destino, y la carga manual | §10.11 |
| **Fase 2** | `gastos` + comprobante + `/rendicion` pública: `saldo = recaudado − rendido` | §10.12 |

Las **donaciones únicas ya entran solas al libro** (§10.13): el trigger las registra al
aprobarse, con backfill hecho — hoy son **$7.241** en 5 donaciones, cuadrando con
`donations` y con el Dashboard. (Este párrafo dijo $7.141 con 4 donaciones hasta el
2026-08-30: era la medición del 16.)

⚠️ **Corregido el 2026-08-30 — este párrafo estaba vencido.** Decía que quedaba abierto el
servicio de pagos porque *"las suscripciones se crean y nunca se actualizan, y el destino
elegido en el checkout todavía no llega"*. **Las dos partes son falsas.** La jornada del
30/31 las cerró y el texto quedó atrás: el webhook actualiza `memberships` cuando llega un
`preapproval` (`index.js:305`), escribe `last_payment_id` (`index.js:458`), manda
`destino_id` en las dos ramas, y existe `trg_aporte_desde_membresia` que convierte el cobro
en aporte. `/health` lo informa: `registra_renovaciones: true`, `destino_en_external_reference: true`.

**Lo que sí queda del canal recurrente, y es distinto:** de 17 membresías, **0** tienen
`last_payment_id`, `payer_email` o `destino_id`, y ninguna está activa (6 canceladas, 5
vencidas, 4 pendientes, 2 pausadas). El código de renovación **existe y nunca corrió contra
un cobro real**. No está roto: está sin estrenar, que no es lo mismo que andando.

Sigue decidido —y sin ejecutar— **mover el servicio de pagos a Vercel**, en este mismo
repo. Y queda lo que no es técnico: **cargar los datos reales**, sin los cuales la
rendición es una página correcta y vacía.

✅ **Cerrado el 2026-08-31:** el **circuito de pagos**, entero. El webhook valida la firma
de MercadoPago y rechaza lo que no la trae (§11.5), y dejó de tomar una respuesta de error
de la API como si fuera un pago (§10.21) — esto último era un cobro perdido en silencio
cada vez que MercadoPago contestara mal, y estaba así desde el primer día.

✅ **Cerrado el 2026-08-30:** la **capa de acceso** sobre el libro (§10.17) y la **fase 1
del club de beneficios** (§12.8): `/carnet` y el catálogo que distingue un socio de un
visitante. Aplicado en producción.

🔴 **Y el bloqueante que destapó:** el backfill dio **0 personas con acceso vigente**,
porque 4 de 5 donaciones llegan sin `user_id`. El modelo funciona y no le llega a nadie.
Ver §10.17, **y §10.18 para el diagnóstico corregido**: la cañería del `user_id` está
entera y el problema es que se dona sin sesión. Ya se guarda el email del pagador y **está
resuelta la vinculación** (§10.19): la persona reclama sus aportes desde `/carnet`, con
sesión y email verificado. Lo que falta para que el club se llene ya no es diseño, es
**datos** — recuperar desde MercadoPago los emails de las 5 donaciones que ya existen.

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
| `handle_new_user()` explota si el alta no trae `name` en `raw_user_meta_data` | Detectado el 2026-08-16 al arreglar el check T6 | El trigger inserta en `public.users`, donde `name` es NOT NULL, leyendo `raw_user_meta_data->>'name'`. Un alta sin ese campo **falla entera**. El registro propio sí lo manda; el riesgo es un proveedor OAuth que use otra clave (`full_name`). Un `COALESCE(name, full_name, email)` lo cerraría. |
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
roto daba **3,3 KB** y ninguno de los dos. Comprobar además `/about`, `/activities`,
`/collaborate`, `/contact` y `/login`, que son las rutas con distinto árbol de vendors.

⚠️ **Las rutas van tal cual están en `App.jsx`**, que están **en inglés**. Esta lista ya
falló dos veces por lo mismo: decía `/colaborar` (la real es `/collaborate`), y el
2026-08-30 se descubrió que `/nosotros` y `/actividades` tampoco existen — son `/about`
y `/activities`. Los dos chequeos pegaban en el 404, que **también** tiene `<nav>`,
`<footer>` y un tamaño verosímil.

**El 404 de este sitio mide 25.900 bytes exactos.** Si dos rutas distintas dan el mismo
tamaño al byte, no son dos páginas: son dos 404. Ese es el olor a buscar.

Y la regla que se sigue de ahí: **confirmar siempre algo del contenido** —un título, un
botón, un texto propio de esa página— y no solo el esqueleto. Un chequeo que solo mira
`<nav>` y el peso aprueba el 404 sin haber mirado nada.
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
| El `origen` del aporte de una renovación dice `donacion`, no `membresia` | Imprecisión conocida. `aportes.origen = 'membresia'` exige `membership_id`, y ligarlo requiere resolver la ambigüedad de las 6 filas con el mismo `external_reference` |
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
| 252 tests, lint 0 errores, build | `npm test` / `npm run lint` / `npm run build` |

**Sobre el runtime de las Edge Functions.** `npx supabase start` falla en esta máquina
(documentado en `supabase/checks/README.md`), así que **localmente** no se pueden ejecutar.
Al desplegarlas se probó contra producción lo que se podía sin datos (§11.7.8): que
arranquen, que resuelvan los imports de `_shared/`, que tengan las env vars y que rechacen
lo que no trae sesión.

**Lo que sigue sin probarse es el camino feliz autenticado**: validación de límites, embeds
de PostgREST en la consulta del canje, y el `UPDATE` condicional de la confirmación. Eso se
ejercita con el primer canje real, no antes. Por eso toda la lógica que **decide** algo se
sacó del `index.ts` y vive en `club-reglas.ts`, que sí está testeada.

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

#### Lo que sigue sin probarse, dicho con precisión

El **camino feliz autenticado**: elegibilidad, límites por ventana, los embeds de PostgREST
en la consulta del canje y el `UPDATE` condicional de la confirmación. Nada de eso se puede
ejercitar sin una sesión de socio real y un beneficio cargado. **El primer canje real sigue
siendo la primera prueba de esa mitad** — que ahora es una mitad, no el bloque entero.

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

⚠️ **Lo que NO se pudo verificar:** la pantalla renderizada. `/admin` exige
sesión de admin y desde acá no hay forma de autenticarse. Verificado: que la
ruta siga respondiendo (redirige a login, no 404), que el código entró al bundle
—el chunk pasó de 125 a 155 kB y contiene las cadenas de la sección— y que los
validadores pasan sus 13 tests. **La primera vez que alguien la abra es su
primera prueba real.**

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

---

## 12. Club de beneficios: el canje (propuesta, 2026-08-30)

### 12.0 — Qué es esto y cómo se relaciona con §10

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

### 12.1 — Estado actual (relevado 2026-08-30, resuelto en código el 2026-08-30)

> ✅ **Los tres ítems de abajo están resueltos, y desde el 2026-08-31 también en
> producción** (§11.7.8): las 6 tablas `club_*` existen con RLS activa y las tres Edge
> Functions están desplegadas. Lo que todavía NO cambió es el mundo real: no hay ningún
> comercio cargado ni ningún canje hecho, así que **el efecto práctico que describen estos
> puntos sigue vigente hasta que entre DigitalMatch**.

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

### 12.2 — Decisión de arquitectura

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

### 12.3 — El flujo

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

### 12.4 — Modelo de datos

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

### 12.5 — Dónde vive la lógica: cambio de patrón respecto del resto del repo

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

### 12.6 — Niveles de comercio: el incentivo

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

### 12.7 — Reglas de portabilidad (qué lo hace reutilizable)

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

### 12.8 — Orden de implementación

| Fase | Qué | Deja algo usable? |
|---|---|---|
| **0** | ~~§10 fase 1: `aportes` + `tiene_acceso()`~~ + ~~bloqueante #1 de 10.6~~ **✅ HECHO 2026-08-30** (esquema y guarda de credenciales; falta aplicar en prod) | Prerrequisito literal: sin esto no hay a quién validarle nada |
| **1** | ~~Carnet digital + `requiere_acceso` en beneficios + catálogo que muestra el estado de acceso~~ **✅ HECHO 2026-08-30** — `/carnet`, bloqueo en catálogo y detalle, `src/lib/acceso.js` + `accesoApi.js`. **Sin QR a propósito**: en esta fase el comercio *mira* el carnet, no lo escanea, así que un QR que nadie lee no aporta nada y suma una dependencia. Entra en la fase 2, que es donde se escanea. ⚠️ Ver la limitación de abajo | **Ya es un club funcionando**, sin pedirle nada al comercio (modelo D) |
| **2** | ~~`club_comercios`/`club_sucursales`/`club_comercio_usuarios` + `club_canjes` + las 3 Edge Functions + panel `/comercio`~~ **✅ APLICADA EN PRODUCCIÓN 2026-08-31** — §11.7. Falta cargar el comercio piloto y hacer un canje real. La **anulación no tiene UI** todavía | Entra el comercio. Acá aparece la trazabilidad |
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

### 12.9 — Decisiones de negocio (TOMADAS el 2026-08-30)

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
comercio (12.6). Se fijan con 3 meses de datos reales, no antes.

---
