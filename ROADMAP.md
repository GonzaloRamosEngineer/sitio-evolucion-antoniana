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
> **Volvió a pasar, y se volvió a partir el 2026-09-02.** El ROADMAP había llegado a 3.185
> líneas y ~1.760 eran otra vez crónica de trabajo terminado. La causa es estructural:
> **cada jornada cerraba escribiendo su cierre en el archivo de lo pendiente.** Se movió a
> `HISTORIAL.md` §C, §10.10–§10.21, §11 completa y §12.1, con la numeración intacta.
>
> **La regla para que no vuelva a pasar:** el cierre de jornada se escribe en
> `HISTORIAL.md`. Acá solo se actualiza «Por dónde arrancar» y se tachan ítems.
>
> 👉 **Si buscás un `§N` y no está en este archivo, está en `HISTORIAL.md` con el mismo
> número.** Las referencias cruzadas de abajo (§10.17, §11.7.12, …) siguen siendo válidas.
>
> **La numeración de los ítems no se toca** (`3.4`, `6.7`, …): hay **85 archivos** de
> código con comentarios que la citan (remedido el 2026-09-02; decía 35). Por eso mover una
> sección a `HISTORIAL.md` **nunca** implica renumerarla.

---

## 🚦 Por dónde arrancar (actualizado 2026-09-02, cierre del club fase 2)

> **Leé esto primero, y verificá lo que dice antes de actuar.** Esta sección se
> reescribe al cierre de cada jornada. Si la fecha de arriba está vieja, desconfiá:
> en este archivo, la parte que nadie relee es donde se pudren las afirmaciones.

**Estado en una línea:** el circuito de ingresos está cerrado y **la fase 2 del club también
—probada de punta a punta el 2026-09-02 con un canje real** (§11.7.12)—, pero **el club
sigue sin socios**: 0 de 23 personas con acceso vigente, así que el único beneficio real
está bloqueado para todo el mundo.

**Lo primero, en orden:**

1. ✅ **La unificación del catálogo está aplicada y desplegada** (12.10.16 y 12.10.17). La
   fuga de `DMGlobal` está cerrada, hay un solo catálogo, el beneficio de prueba está
   archivado y la URL vieja sigue viva. **Queda una sola cosa de esto: mirarlo en un
   teléfono real (12.10.18)** — el chequeo headless no concluye.

2. **Que alguien tenga acceso vigente.** Vuelve a ser *el* bloqueante, y ahora con más peso:
   toda la vidriera está construida y verificada, y el estado «puede canjear» **sigue sin
   poder ejercitarse** porque no hay una sola persona con aporte vigente (§10.17, §12.10.9). «Prueba interna del sistema de canje» quedó
   **activo** y lo ve cualquier visitante de `/club`. Se apaga en un minuto desde
   `/admin → Club de beneficios → DigitalMatch Global`, poniéndolo en «De baja». Es lo único
   con urgencia real, y no es técnico.
2. **Que alguien tenga acceso vigente.** Es *el* bloqueante, y no es del club: es §10.17. Sin
   un aporte de $5.000 o más atribuido a una cuenta, el beneficio real no se puede canjear ni
   probar. Las dos salidas —un aporte real, o uno manual que **aparece en la rendición
   pública**— tienen costo, y la decisión es de la entidad.
3. **Rotar la contraseña de la base.** Único pendiente de seguridad. Vive en **un solo
   archivo**: `.env.db`. ⚠️ Este archivo dijo cuatro veces que también estaba en
   `~/.config/antoniana/db.url` — **ese archivo no existe**. Y rotar **no toca producción**:
   el webhook usa `SUPABASE_SERVICE_ROLE_KEY` y el sitio la anon key, así que el único
   consumidor es `tools/db.sh`.
4. **`npm audit fix`** (sin `--force`) — 5 minutos, cierra 3 de los 4 avisos, incluido el
   único `high`. Y después, en rama propia, **`react-router-dom` → `7.18.3`**, que es el
   resto. ⚠️ Este renglón decía «la única vulnerabilidad viva»: son cuatro (6.7).
5. **La deuda del club está toda en §12.10**, ordenada por lo que duele. Lo más barato con
   más valor: la **UI de anulación** (12.10.6), que ahora sí se puede probar porque existe un
   canje confirmado real.

**Antes de tocar nada, tres comprobaciones que ya evitaron daño real:**

```bash
git fetch && git status          # la copia local estuvo 20 y 8 commits atrás, dos veces
bash tools/db.sh check           # mirar la base, no el ROADMAP
curl.exe https://mp-supabase-webhook.onrender.com/health
```

`/health` tiene que decir hoy: `version: 2026-08-31.consulta-mp`, `firma_modo: "rechaza"`,
`valida_firma_mp: true`, `backfill_habilitado: false`. Si `backfill_habilitado` dice `true`,
**alguien dejó abierta la ruta temporal**: borrar `BACKFILL_TOKEN` en Render.

**Las seis reglas que este proyecto pagó caro:**

1. **Verificá las premisas del ROADMAP contra el código antes de trabajar.** Cinco
   afirmaciones resultaron falsas el 2026-08-30/31 (§11.6.2) y **cuatro más** el 2026-08-30
   (§11.7.2). Van nueve. No es mala suerte: es lo que le pasa a un documento que se escribe
   una vez y se relee nunca.
2. **Una verificación tiene que poder fallar.** Hacela fallar una vez antes de creerle
   (§11.6.3). Y en seguridad, probá **las dos puntas**: que lo ilegítimo se rechace y que lo
   legítimo pase.
3. **Migración a Docker primero**, nunca directo a producción (§B) — y **en la versión de
   producción**, que es PostgreSQL **15**, no 17 (§11.7.8).
4. **Verificá en un navegador si tocaste una página** — rutas reales, y **contenido**, no
   tamaño: el 404 mide 25.900 bytes y `/club` 25.646. ⚠️ **Y confirmar contenido tampoco
   alcanza: hay que MIRAR la pantalla, en ancho de teléfono** (§11.7.10).
5. **Escribir la función no es conectarla.** El reaper del club existió tres días con su
   peligro documentado en un comentario y **sin que nada lo llamara** (§11.7.13). Antes de
   dar algo por hecho, preguntá quién lo invoca.
6. **Un circuito que sale bien a la primera no probó el camino del fracaso.** El canje real
   se confirmó en 53 segundos, así que nunca ejercitó qué pasa cuando alguien abandona — que
   según §12.3 es el caso normal.

---

## Estado

Las nueve sesiones planificadas (A-I) están cerradas y desplegadas. El sitio está sano en
producción, con lint en 0 errores, **265 tests** en 26 archivos y `vite@7`.
(Decía «174» hasta el 2026-09-02: era la medición de la Sesión I.)

Lo que queda son **dos cosas de naturaleza distinta**:

| | Qué | Dónde |
|---|---|---|
| **Bloqueante** | Las donaciones llegan sin saber quién donó, así que el acceso no le alcanza a nadie | §10.17 |
| **Deuda** | 2 ítems técnicos + deuda menor. Nada bloquea nada | §A abajo |
| **Producto** | Precio de socio en actividades, socios formales | §10 abajo |
| **Producto** | El club de beneficios: el canje y el comercio como actor | §12 abajo |

⚠️ **Corregido el 2026-09-02 — este párrafo decía «la única vulnerabilidad viva es
`react-router-dom`».** Hoy `npm audit` reporta **4**: aparecieron `browserslist` (**high**,
dos advisories) y `postcss-selector-parser` (low), los dos de *build-time*. Y la novedad
buena: **`npm audit fix` sin `--force` ahora cierra 3 de las 4** — cuando se escribió esto,
el dry run no cambiaba nada. Ver 6.7.

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

> ⚠️ **Remedido el 2026-09-02, y cambiaron las tres cosas que decía este ítem.** Son **4**
> avisos, no 1; `npm audit fix` **sí** sirve ahora; y el destino del major **ya existe**.

0. **`npm audit fix` (sin `--force`) — primero, porque es gratis.** Cambia 10 paquetes y
   **cierra 3 de los 4 avisos**: `browserslist` (**high**, dos advisories), 
   `postcss-selector-parser` (low) y el advisory propio de `react-router-dom`
   (`>=6.30.2 <=6.30.4`, se cierra con **6.30.6** — sin major). Los dos primeros son
   *build-time* (entran por `autoprefixer`, `@babel/core` y `tailwindcss`), así que **no
   viajan al bundle**: el riesgo real es bajo, pero el arreglo no cuesta nada. Correr
   `build` + `lint` + tests después, y listo.

1. **`react-router-dom` → `7.18.3`** — lo único que `audit fix` **no** puede cerrar.
   Quedan los dos advisories de `react-router` (transitivo), rango `>=6.0.0 <7.18.0`:
   el de hidratación SSR (`deserializeErrors`) **no aplica acá** porque la app es una SPA
   pura; el **open redirect por backslash en `<Link>`/`useNavigate`** (CVE-2025-68470
   bypass) **sí**. ✅ **La novedad:** cuando se escribió este ítem no había versión por
   encima de 7.17.0; hoy **`7.18.3` está publicada**, así que el destino dejó de ser
   hipotético. Sigue siendo un major sobre el router de toda la app: **rama propia,
   deploy propio, y verificación en navegador de todas las rutas**, no de una muestra.
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

### Cómo saber si un deploy llegó (y dos formas de creer que sí sin que haya llegado)

Aprendido el 2026-09-02, las dos en la misma tarde:

1. **`HTTP 200` no prueba que un archivo exista.** El SPA devuelve `index.html` con **200**
   para cualquier ruta desconocida, así que `curl` a un chunk inexistente da 200 igual. Se
   comprobó pidiendo `BenefitsPage-NOEXISTE.js`: mismo 200, mismo cuerpo. **La condición
   útil es que el cuerpo NO sea HTML**, no el código de estado.

2. **Los hashes de Vercel NO coinciden con los del build local.** Vercel corre `npm install`
   fresco y resuelve otras versiones transitivas, así que el contenido difiere y el hash
   con él: local `index-BF9WSxx3.js` contra `index-CnVEx8ZX.js` en producción. **Esperar el
   chunk del build local es esperar un archivo que nunca va a existir.**

**Lo que sí funciona: pedir la página con Chrome headless y buscar en el DOM un marcador
del cambio** —un texto que antes no estaba, o uno que tenía que desaparecer—. Es la única
verificación que mide lo que importa en vez de un proxy.

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

## C. El fix de seguridad — cerrado el 2026-08-16 → `HISTORIAL.md`

La migración `20260816120000_fix_view_rls_bypass_and_anon_grants.sql` está aplicada y
verificada en producción. **Revalidado el 2026-09-02:** RLS activa con policies en las 7
tablas sensibles, y `anon` ya no conserva ningún GRANT destructivo — solo `SELECT` y los
`INSERT` que el sitio necesita.

El detalle del fix, el SQL y el punto ciego que lo causó viven en `HISTORIAL.md`.
Lo único que sigue abierto de este frente es el resto de 10.1.g, en §A.
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

### 10.1 — Estado actual (verificado 2026-08-16, **revalidado contra producción el 2026-09-02**)

> ⚠️ **Cuatro de los siete estaban cerrados y seguían marcados como abiertos.** El
> diagnóstico de abajo se conserva entero porque explica *por qué* cada cosa importaba —
> pero el estado se releyó contra la base, no contra este archivo.
>
> | | Estado al 2026-09-02 | Cómo se verificó |
> |---|---|---|
> | 10.1.a | 🔴 abierto | no existen `socios` ni `categorias_socio` |
> | 10.1.b | ✅ resuelto | `requiere_acceso` en `benefits` y `club_beneficios` |
> | 10.1.c | 🟡 parcial | `donations` ya vincula; `registrations` y `education_preinscriptions` no |
> | 10.1.d | 🔴 abierto | 0 columnas de precio en `activities` |
> | 10.1.e | ✅ resuelto por otro camino | `destinos.tipo` + `donations.destino_id` |
> | 10.1.f | ✅ resuelto | índice `uq_membresia_viva_por_destino` |
> | 10.1.g | ✅ en su parte peligrosa | `anon` ya no tiene UPDATE/DELETE/TRUNCATE |

- [ ] 🔴 **10.1.a — No existe la entidad socio.** *(sigue abierto — es la fase 4 de 10.3. La
  capa de acceso de §10.17 resolvió la **consecuencia** —quién accede— pero no la **condición
  institucional**: número de socio, antigüedad formal, categoría y voto.)*
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

- [ ] 🟡 **10.1.c — Cuatro identidades paralelas de la misma persona.** *(parcial: `donations`
  ya trae `user_id` y `payer_email`, y §10.19 dio el reclamo de aportes con email verificado.
  **Siguen sin reconciliar `registrations` y `education_preinscriptions`.**)*
  | Dónde | Campos | Se vincula a `users`? |
  |---|---|---|
  | `users` | `email` (unique), `dni`, `phone` | es la cuenta |
  | `registrations` | `guest_name`, `guest_email` | **no** — el CHECK `check_registration_type` fuerza que sea `user_id` **o** invitado, nunca ambos |
  | `education_preinscriptions` | `email`, `full_name`, `dni`, `phone` | solo si había sesión abierta al enviar (`educationApi.js:41`); si no, queda huérfano |
  | `memberships` | `payer_email` | es el mail de MercadoPago, puede diferir del de la cuenta |
  Nada reconcilia los cuatro. La misma persona puede donar, preinscribir a un hijo,
  anotarse de invitada y ser socia, y el sistema la ve como cuatro personas distintas.

- [ ] 🔴 **10.1.d — Las actividades no tienen precio.** *(sigue abierto, verificado el
  2026-09-02: cero columnas de precio/arancel en `activities`. Es la mitad NO hecha de la
  fase 2 de 10.3 — y es «la mitad del valor de ser socio» según este mismo ítem.)*
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
| **2** | ⚠️ **A MEDIAS** — `requiere_acceso` en beneficios **✅ hecho**; `precio_general`/`precio_socio` en actividades **🔴 sin empezar** (10.1.d) | ~1-2 días lo que falta | **Acá la cuota empieza a valer algo** |
| **3** | ~~`campanas` + FK desde donaciones~~ **✅ RESUELTO POR OTRO CAMINO**: no hay tabla `campanas`; §10.9 unificó en `destinos` (`tipo`) + `donations.destino_id`. Falta solo la **barra de progreso pública** | ~medio día lo que falta | Donaciones dirigidas |
| **4** | 🔴 `socios` + `categorias_socio` + número y antigüedad (10.1.a) — **la única fase entera sin empezar**. El carnet ya existe, pero muestra *acceso*, no *condición de socio* | ~2 días | Carnet, antigüedad, categorías |
| **5** | ~~Unicidad de membresía activa (10.1.f)~~ **✅** + achicar GRANTs (10.1.g) **✅ en su parte peligrosa**; queda el `SELECT` amplio | casi nada | Higiene |

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

## 10.10 – 10.21 y §11 — la crónica de cómo se construyó → `HISTORIAL.md`

Doce secciones de evidencia y fases aplicadas (§10.10 a §10.21) y los cuatro cierres de
jornada (§11.1 a §11.7.13) se movieron a `HISTORIAL.md` el 2026-09-02, con su numeración.

**Lo que estaba vivo ahí adentro no se perdió, se subió**: el bloqueante de §10.17 está en
«Por dónde arrancar» y en §12.10.9, y las lecciones operativas de §11.4/§11.6.3 están en
«Las seis reglas que este proyecto pagó caro».

⚠️ **Lo que sí se descartó, a propósito:** §11.3, §11.6.7 y §11.7.7 eran tres listas
sucesivas de «lo siguiente, en orden», cada una superada por la siguiente y ninguna
borrada. §11.3 todavía encabezaba con `MP_WEBHOOK_SECRET`, que está hecho desde el
2026-08-31. **Tres listas de prioridades que se contradicen son peor que ninguna.** La
única lista viva es «Por dónde arrancar».
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

### 12.1 — Estado actual → `HISTORIAL.md`

El relevamiento del 2026-08-30 (12.1.a/b/c) está resuelto, en producción y demostrado con
un canje real. Se movió con su numeración.
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

### 12.10 — Deuda del club: qué falta, ordenado por lo que duele (2026-09-02)

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

- [ ] **12.10.2 — `benefits.codigo` sigue siendo de lectura pública.** Es la limitación
  declarada de la fase 1 (12.8): ocultar el código en pantalla no impide leerlo por API. Se
  cierra sola cuando el contenido de `benefits` migre a `club_beneficios`, porque ahí el
  código es por persona y de un solo uso. Hasta entonces: **no poner en `requiere_acceso` un
  beneficio de `benefits` cuyo código valga dinero.**

- [ ] **12.10.3 — La confirmación diferida nunca se ejercitó.** El rescate de un canje
  vencido dentro de la ventana (`confirmacion_diferida_horas`) está implementado y no se
  probó: el único canje real se confirmó en 53 segundos. Es la rama que corre cuando el
  local se queda sin señal, o sea justo cuando nadie está mirando.

- [ ] **12.10.13 — 🔴 El código del beneficio real está publicado, y se filtra por TRES
  campos.** Esto **agrava y corrige a 12.10.2**, que lo describía como «lectura pública por
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

- [ ] **12.10.8 — El catálogo está partido en dos.** `/beneficios` lee `benefits` (viejo, 1
  fila, código estático) y `/club` lee `club_beneficios` (nuevo, con canje). §12.4 decidió
  deprecar el primero migrando su contenido, no romperlo. **Mientras las dos existan, la
  regla es: lo que se canjea vive en `/club`.** Migrar la fila de DigitalMatch y retirar la
  vieja cierra este punto y el 12.10.2 de una vez.

- [ ] **12.10.14 — 🔴 `/club` es una página huérfana: no hay un solo enlace en el sitio.**
  Grep sobre todo `src/`: fuera de su propia carpeta, la única mención de `/club` es la
  definición de la ruta en `App.jsx`. No está en el `Header`, ni en `/beneficios`, ni en el
  carnet. **Se llega solo tipeando la URL.** Y el nav sí ofrece «Colaborá → Beneficios», que
  apunta al catálogo **viejo**:

  > **El camino descubrible lleva al catálogo sin puerta. El que tiene puerta está escondido.**

  Explica por qué la fase 2 se probó bien y nadie notó nada: el canje real se hizo entrando
  por URL directa (§11.7.12). **Una página que funciona y no está enlazada se verifica igual
  que una que anda** — es el mismo patrón de §11.7.13, el reaper que existía sin que nada lo
  llamara, en la capa de navegación.

- [ ] **12.10.15 — Unificar el catálogo necesita TRES columnas antes de poder migrar.**
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

- [ ] **12.10.9 — El club sigue sin socios.** 0 de 23 personas con acceso vigente, así que el
  beneficio real está bloqueado para todo el mundo. **No es un problema del club**: es el
  bloqueante de §10.17 y se resuelve con aportes, no con código.

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

- [ ] **12.10.18 — Falta la pasada en ancho de teléfono, y NO se puede dar por hecha.**

  Se intentó con Chrome headless a 390 px y **el resultado no concluye nada**: el contenido
  sale recortado a la derecha, pero **sale igual de recortado en `/club` —que se arregló
  para teléfono en su momento— y en la propia página 404**, que nadie tocó. O sea que el
  método de captura no distingue «el sitio desborda» de «mi captura está mal dimensionada»,
  y sin esa distinción no mide nada (§11.4).

  **Lo que falta es mirarlo en un teléfono real**, o con emulación de dispositivo de verdad
  (CDP, no `--window-size`). Anotado como pendiente y no como aprobado: dar por bueno un
  chequeo que no puede fallar es exactamente lo que este archivo viene pagando.

  ⚠️ Y sigue sin poder verse el estado «puede canjear» del CTA hasta que exista un socio con
  aporte vigente (§12.10.9). Hoy se verifican «sin sesión» y «sin acceso».

- [ ] **12.10.19 — Los dos bugs que el deploy hizo visibles, y la defensa que quedó.**

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

