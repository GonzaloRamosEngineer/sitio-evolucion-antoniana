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
> **La numeración de los ítems no se toca** (`3.4`, `6.7`, …): hay **122 archivos** de
> código que la citan — remedido el 2026-09-05 al cerrar §10, con
> `grep -rlE '§|ROADMAP' src/ supabase/ api/ tools/`. Decía 102 antes de esta jornada, 85 el
> 2026-09-02 y 35 antes. Por eso mover una sección a `HISTORIAL.md` **nunca** implica
> renumerarla.
>
> ⚠️ **El comando va junto al número, y esto se aprendió acá:** las cifras anteriores se
> anotaron sin decir cómo se midieron, así que al remedir no hay forma de saber si el
> número creció o cambió el patrón. Con el mismo `grep`, contando solo `§`, dan **95**.

---

## 🚦 Por dónde arrancar (actualizado 2026-09-06, con §12 cerrado y compactado)

> **Leé esto primero, y verificá lo que dice antes de actuar.** Esta sección se
> reescribe al cierre de cada jornada. Si la fecha de arriba está vieja, desconfiá:
> en este archivo, la parte que nadie relee es donde se pudren las afirmaciones.

**Estado en una línea:** el circuito de ingresos está cerrado, §10 está cerrado desde el
2026-09-05, §14 se cerró el 2026-09-06 y **§12 se cerró como módulo el 2026-09-06**. Lo
que queda es de contenido, de gente y de una consulta legal; de infraestructura ya no
queda nada bloqueando.

🟢 **§12 pasó de 927 líneas a 142, y su deuda de código quedó en cero.** Se cerraron los
7 ítems de §12.10 que eran código —autoconfirmación, UI de anulación, cron del reaper,
invitación por magic link, postulación pública, la decisión del rescate diferido y la
pregunta `/beneficios` vs `/club`— **y se construyó la fase 3, el reporte al comercio**,
que §12.8 marca como «lo que hace que el comercio renueve». La crónica entera se movió a
`HISTORIAL.md` §12. Aplicado en producción con backup restaurado y verificado (16 de 16
conteos), `club-check.sql` pasó de **17 a 28 assertions, 0 FALLA**.

⚠️ **Y apareció la premisa falsa número catorce, esta vez propia:** §12.10.11 declaraba
el cron «deuda consciente» porque *«el plan Free de Supabase no lo trae»*. **`pg_cron`
estaba disponible y precargada desde siempre.** Se escribió la limitación y se le creyó
dos jornadas sin mirar la base.

🟢 **Y por primera vez la rendición no está vacía.** El 2026-09-06 se importó octubre de
2024 del fondo del convenio y se publicaron sus 4 gastos: `/rendicion` pasó de decir
**«Rendido $0 · 0%»** a **«8% de lo recaudado ya tiene rendición publicada»**, verificado
sin sesión desde afuera. Son $78.748,70 y el fondo cierra octubre en $921.251,30, que es
exactamente el saldo del extracto. **La maquinaria completa —importar, verificar,
corregir, publicar, mostrar— corrió de punta a punta con dinero real.**

**Lo que cerró §10** (relato en `HISTORIAL.md` §10.27): la figura institucional
(`miembros`, con el comportamiento en datos), el reclamo universal de huellas, el precio
de actividades y el esquema del apadrinamiento. Cuatro migraciones, validadas en
PostgreSQL 15 y con `supabase/checks/membresia-check.sql` — **36 assertions, 0 FALLA**.

✅ **§14 aplicado y desplegado el 2026-09-06**, verificado con el procedimiento de §B: el
vocabulario de comprobantes vive en `useContentQueries-DEg2eiEb.js` (chunk compartido, no
en el de la página — el punto 4 de §B otra vez) y el ABM en `AdminPanel-5V_ZHq6p.js`. Las
dos puntas del fondo restringido, comprobadas en producción con Chrome headless:
**no aparece en `/collaborate`** —está cerrado a aportes— **y sí aparece en `/rendicion`**,
que es la razón entera de la migración.

👉 **Y el 2026-09-06 apareció §14, que es lo más importante de estos dos días**: el
diferencial de este producto no es el club de beneficios —mercado saturado— sino **poder
rendir un fondo restringido, y que rendirlo salga barato**. Leer §14 antes de decidir qué
construir. Lo que la habilita ya está aplicado (`20260906120000`).

✅ **APLICADAS EN PRODUCCIÓN el 2026-09-05**, y **el front desplegado y verificado**:
los cuatro símbolos nuevos (`mi_membresia`, `reclamar_huellas`, `huellas_sin_cuenta`,
`mi_precio_actividad`) aparecen en `useContentQueries-DYpOLrFh.js` y el padrón en
`AdminPanel-B01OEU--.js`. Siete rutas renderizadas con Chrome headless, todas con `<nav>`,
`<footer>` y contenido propio, ninguna en los 25.900 bytes del 404. El detalle de una
actividad **no muestra precio**, que es lo correcto con `precio_general = 0`.
Con backup previo restaurado y probado.
Verificado después de aplicar: el padrón tiene **1 miembro (N°1, alta 2026-09-02)** con su
categoría, `acceso_vigente()` **sigue devolviendo `true`** para el socio vigente —que era
el riesgo de la jornada—, y las 12 actividades quedaron en `precio_general = 0`, o sea que
en pantalla no cambió nada, que es lo que se esperaba.

⚠️ **Y tres premisas de §10 resultaron falsas al ir a construirlas**, que es la novena,
décima y undécima vez que pasa en este repo. Están corregidas donde vivían:

| Decía | Es |
|---|---|
| «no existe la entidad socio» → hay que crear `socios` con voto | Una **fundación no tiene socios ni voto**. La tabla es `miembros` y el vocabulario es un dato |
| `registrations` y educación son el mismo problema de identidad | `registrations` tiene **0 invitados**. Educación tiene **156 personas** que el sistema no reconoce |
| El precio de actividades es «la mitad del valor de ser socio» | Las **12 actividades son gratuitas**. La columna hacía falta igual, pero hoy no cambia nada |

**Lo primero, en orden:**

1. 🔴 **Terminar de cargar el fondo del convenio: faltan 22 meses y un PDF.**
   Octubre de 2024 ya está (importado, revisado y publicado). Lo que falta:

   **a)** ⚠️ **Adjuntar el PDF del acta** al aporte de $1.000.000. El comprobante figura
   declarado —escritura, Foja E 00405399— **pero sin archivo**. Es el documento que le da
   sustento al fondo entero, y desde §14.4 «Documentación oficial» quedó más a la vista.
   Se hace desde `/admin → Libro de aportes`, editando ese aporte.

   **b)** Verificar que ese mismo aporte tenga tildado **«es el saldo inicial de este
   destino»**. Se cargó antes de que el tilde existiera, y sin él le falta la
   `referencia_externa`.

   **c)** **Los 22 meses restantes de extractos**, de noviembre 2024 a hoy.
   `/admin → Importar movimientos`, y **se pueden elegir todos los `.csv` de una vez**:
   se ordenan solos por período y avisa si falta un mes.
   🟢 **En esos meses ya no hay que destildar nada a mano**: el problema del borde era
   sólo de octubre, porque el fondo arranca a mitad del 10/10/2024.
   ⚠️ **Los gastos entran SIN publicar y hay que revisarlos uno por uno antes de
   publicar.** No es burocracia: la descripción de un movimiento bancario trae el nombre
   de la contraparte, y aunque el importador ya no la escribe en `concepto` ni en
   `proveedor` (§14.4), el **concepto genérico no dice para qué fue**. Escribir «para qué
   fue» es trabajo humano y es lo que hace que la rendición sirva.

   **d)** ❓ **Decisión abierta: qué se hace con lo anterior al fondo.** El extracto de
   octubre traía **21 movimientos de ingreso previos al 10/10/2024 ($244.795,30)** que se
   destildaron por no pertenecer al fondo, y no están cargados en ningún lado. El saldo
   inicial de $1.000.000 los resume en una línea, así que **no falta plata**; lo que falta
   es decidir si algún día se quiere el libro completo de la cuenta desde 2022, y en ese
   caso a qué destino van.

2. 🟡 **Recién después, publicar las campañas en borrador.** Son 8, **ninguna tiene
   imagen ni meta** (verificado el 2026-09-05), así que además de activarlas hay que
   completarlas. De $12.241 aportados, $12.141 fueron al institucional — no porque la
   gente lo eligiera, sino porque es el único publicado.

3. 🔴 **Sumar dos o tres comercios de consumo cotidiano** (§12.11.2). Ticket bajo y
   frecuencia alta construyen el hábito que un descuento de una sola vez no puede
   construir: hoy el club tiene **un** beneficio, de ticket alto y canjeable una sola vez
   por persona.
   🟢 **Desde el 2026-09-06 esto ya no requiere un desarrollador**: un comercio se postula
   solo en `/club/postular`, la comisión lo aprueba desde `/admin → Club de beneficios`
   con un botón, y la invitación al mostrador sale por email desde el mismo panel.
   **Es el ítem más importante del club y ahora el cuello de botella es conseguir los
   comercios, no cargarlos.**

4. 🟡 **Las 156 personas de Educación — la decisión está tomada a medias.** El 2026-09-05
   se decidió **mostrárselas a la comisión y no contactarlas desde el sistema**: el bloque
   ya está en `/admin → Padrón` y dice «156 sin cuenta de 160». Lo que falta es que la
   entidad decida si les escribe, y con qué. **No es una decisión técnica**, y tiene una
   arista de consentimiento: dieron su email en un formulario de preinscripción a un
   programa educativo, entre el 2026-02-13 y el 2026-03-22.

5. 🟡 **El segundo socio.** 1 persona con acceso vigente de 23 cuentas. El circuito
   funciona entero; falta gente adentro, y eso no se arregla con código.

6. ⚠️ **Confirmar el arreglo del remontaje de sesión, que quedó SIN confirmar.**
   El 2026-09-06 se arregló que cualquier evento de `onAuthStateChange` pusiera `loading`
   en true y desmontara la pantalla protegida entera —se ve idéntico a una recarga—.
   **Pero el evento culpable (`TOKEN_REFRESHED`) sale una vez por hora**, y el reporte era
   «todo el tiempo», así que el arreglo puede no explicar todo el síntoma. Lo que **sí**
   quedó probado con la consola del dueño es que **no era una recarga real**: los
   listeners sobrevivieron a dos ciclos de ocultar/mostrar y nunca se disparó
   `beforeunload` (descarta el Ahorro de memoria de Chrome).
   **La prueba que cierra el caso:** dejar un lote analizado en `/admin → Importar
   movimientos`, irse **más de una hora**, y volver. Si las filas siguen ahí, era esto.

7. **Rotar la contraseña de la base.** Único pendiente de seguridad. Vive en **un solo
   archivo**: `.env.db`. ⚠️ Ese archivo dijo cuatro veces que también estaba en
   `~/.config/antoniana/db.url` — **no existe**. Rotar **no toca producción**: el webhook
   usa `SUPABASE_SERVICE_ROLE_KEY` y el sitio la anon key, así que el único consumidor es
   `tools/db.sh`.

8. **`npm audit fix`** (sin `--force`) — 5 minutos, cierra 3 de los 4 avisos, incluido el
   único `high`. Después, en rama propia, **`react-router-dom` → `7.18.3`**.

9. **Deuda menor, toda junta:** el apadrinamiento público en **§13** (bloqueado por legal,
   no por código) y **7 assertions muertas en `rls-check.sql`** — ver abajo.
   ✅ **La del club ya no está en esta lista**: §12.10 se cerró entero el 2026-09-06.

10. ⚠️ **Desplegar `club-invitar-operador`, que quedó SIN desplegar.** Es lo único del
    cierre de §12 que no llegó a producción: el código está en el repo y probado, la
    migración y las otras funciones sí se desplegaron. Un comando:
    `npx supabase functions deploy club-invitar-operador`. **Hasta que corra, el botón
    «Invitar por email» del ABM va a dar 404** — verificado que hoy la ruta no existe.

**Antes de tocar nada, tres comprobaciones que ya evitaron daño real:**

```bash
git fetch && git status          # la copia local estuvo 20 y 8 commits atrás, dos veces
bash tools/db.sh check           # mirar la base, no el ROADMAP
curl.exe https://mp-supabase-webhook.onrender.com/health
```

`/health` tiene que decir hoy: `version: 2026-08-31.consulta-mp`, `firma_modo: "rechaza"`,
`valida_firma_mp: true`, `backfill_habilitado: false`. Si `backfill_habilitado` dice `true`,
**alguien dejó abierta la ruta temporal**: borrar `BACKFILL_TOKEN` en Render.

**Las ocho reglas que este proyecto pagó caro:**

1. **Verificá las premisas del ROADMAP contra el código antes de trabajar.** Van **trece**
   afirmaciones de este repo que resultaron falsas: cinco el 2026-08-30/31 (§11.6.2),
   cuatro el 2026-08-30 (§11.7.2), tres el 2026-09-05 (§10.27) y una el 2026-09-06
   (`HISTORIAL.md` §14.4: una nota decía que el remontaje de las páginas protegidas estaba
   resuelto porque se había quitado su disparador — **el mecanismo seguía intacto** y el
   síntoma volvió por otra puerta). No es mala suerte: es lo que le pasa a un documento que
   se escribe una vez y se relee nunca.
   ⚠️ **Y el corolario que costó esta jornada: arreglar un síntoma quitando QUIÉN lo
   dispara no es arreglarlo.** Preguntate siempre qué más puede disparar el mismo
   mecanismo, y cerrá el mecanismo. Una nota que explica el daño y no lo cierra es peor que
   no tener nota: la próxima persona lee «ya se resolvió» y no mira.
2. **Una verificación tiene que poder fallar.** Hacela fallar una vez antes de creerle
   (§11.6.3). Y en seguridad, probá **las dos puntas**: que lo ilegítimo se rechace y que
   lo legítimo pase. ⚠️ **El 2026-09-05 esto atrapó un test decorativo**: «sin email
   verificado no se reclama nada» pasaba porque no había nada que reclamar, no porque la
   verificación funcionara. Se descubrió **saboteando** `email_verificado()` a propósito.
   Y destapó además que **7 sentencias de `rls-check.sql` mueren sin ejecutar su
   assertion** en una base sin usuarios — justo las tres de `aportes`. Ver
   `supabase/checks/README.md`.
3. **Migración a Docker primero**, nunca directo a producción (§B) — y **en la versión de
   producción**, que es PostgreSQL **15**, no 17 (§11.7.8).
4. **Verificá en un navegador si tocaste una página** — rutas reales, y **contenido**, no
   tamaño: el 404 mide 25.900 bytes y `/club` 25.646. ⚠️ **Y confirmar contenido tampoco
   alcanza: hay que MIRAR la pantalla, en ancho de teléfono** (§11.7.10), **y la consola**
   (§10.26).
   ⚠️ **Para las pantallas detrás de sesión, que el navegador no alcanza** (§B), se puede
   **volcar el DOM real del componente desde un test, inyectarle el `index-*.css` del build
   y medir eso en Chrome**. Así se midió el modal de gastos el 2026-09-06 (`HISTORIAL.md`
   §14.6): 950px de alto → 572px, y el dato de si scrollea dejó de ser opinión.
   ⚠️⚠️ **Rebuildeá ANTES de medir.** La primera medición dio un número falso porque el
   CSS del build era anterior al cambio y **Tailwind purga las clases que todavía no
   existían**: la grilla se resolvía en 2 columnas en vez de 6. Medir contra un CSS viejo
   es medir otro sitio.
   ⚠️⚠️ **Y si cambiaste una regla de privacidad, abrí la página PÚBLICA desde afuera**,
   sin sesión. El 2026-09-06 el concepto de un gasto estaba corregido y el campo
   `proveedor` seguía publicando el nombre de una escribana: media corrección se ve igual
   que una corrección entera desde el panel (§14.7).
5. **Escribir la función no es conectarla.** El reaper del club existió tres días con su
   peligro documentado en un comentario y **sin que nada lo llamara** (§11.7.13). Antes de
   dar algo por hecho, preguntá quién lo invoca.
6. **Un circuito que sale bien a la primera no probó el camino del fracaso.** El canje real
   se confirmó en 53 segundos, así que nunca ejercitó qué pasa cuando alguien abandona —
   que según §12.3 es el caso normal.
7. **Una pantalla nueva que habla de algo que otra ya explicaba: preguntá de dónde saca el
   dato.** No «¿está bien?», sino **«¿es el mismo lugar?»**. Pasó con `/beneficios` vs
   `/club` (§12.10.16) y otra vez con `/dashboard` vs `/carnet` (§10.23).
8. **Una configuración declarada y sin consumidor no gobierna nada.** `entidad.vocabulario`
   existió tres semanas con la respuesta correcta adentro —`'padrino'`, no `'socio'`— y
   mientras nadie la leyera, §10.2 seguía diseñando la tabla equivocada (§10.27). Cuando
   agregues una opción, agregá en el mismo commit quién la lee.

---

## Estado

Las nueve sesiones planificadas (A-I) están cerradas y desplegadas. El sitio está sano en
producción, con lint en **0 errores (50 warnings)**, **387 tests en 32 archivos** y `vite@7`.
(Decía «174» hasta el 2026-09-02, «265» hasta el 2026-09-05 y «368» hasta el cierre de
§10: las tres eran mediciones viejas que nadie volvió a tomar. **Remedir antes de citar** —
son treinta segundos.)

⚠️ **Corregido el 2026-09-05: este bloque decía que el bloqueante era «las donaciones
llegan sin saber quién donó, así que el acceso no le alcanza a nadie» (§10.17).** Está
resuelto desde el 2026-08-30 —la persona reclama sus aportes con email verificado— y hay
un socio con acceso vigente desde el 2026-09-02. **No queda ningún bloqueante técnico.**

Lo que queda:

| | Qué | Dónde |
|---|---|---|
| **Carga de datos** | El fondo del convenio y sus gastos. Sin eso la rendición dice 0% | «Por dónde arrancar» |
| **Producto** | **La tesis: rendir fondos restringidos, e importar desde extracto** | §14 abajo |
| **Contenido** | 8 campañas en borrador, ninguna con meta ni imagen | «Por dónde arrancar» |
| **Deuda** | 2 ítems técnicos + deuda menor. Nada bloquea nada | §A abajo |
| **Bloqueado por legal** | El apadrinamiento de cara al público. El esquema está; falta saber qué se puede publicar | §13 abajo |
| **Producto** | El club de beneficios: comercios de consumo cotidiano | §12 abajo |
| **Producto** | Invitar a las 156 personas de Educación que el sistema ya puede reconocer | «Por dónde arrancar» |

✅ **Cerrado el 2026-09-05: §10 entero** — la figura institucional (`miembros`), el reclamo
universal de huellas, el precio de actividades y el esquema del apadrinamiento. Relato en
`HISTORIAL.md` §10.27.

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
| `donations.donation_type` es texto libre y de él depende que una renovación entre como cuota | Detectado el 2026-09-02 al arreglar §10.22 | La columna **no tiene CHECK** (verificado en producción): vale `'única'` o `'suscripción'` por convención del webhook. `aporte_desde_donacion()` acepta las dos grafías de «suscripción», pero si un futuro escritor manda otra palabra, la renovación vuelve a clasificarse como donación **sin ningún error** — y el síntoma sería un socio sin gracia, no una excepción. Un `CHECK (donation_type IN (...))` lo vuelve estructural. |
| Tres de las cuatro reglas de `src/lib/erroresPago.js` nunca se vieron disparar | Escritas el 2026-09-02 con §10.24 | Solo `guest_site_mismatch` es una firma **observada**; `mismo_usuario`, `email_invalido` y `monto_invalido` están contra firmas plausibles de MercadoPago, no contra un error real. El campo `observado` de cada regla lo dice. Cuando aparezca uno de verdad, **confirmar el texto contra lo que llegó** en vez de darlo por bueno — una regla que nunca se disparó puede estar mal escrita y nadie se entera. El camino de descarte cubre el caso igual, así que no urge. |
| Micro-tipografía `text-[9-10px]` en paneles internos | `HISTORIAL.md` §5, ítem 5.7 | Backlog opcional declarado. Solo si molesta en uso real. |

---

### ⚠️ El backup de `tools/db.sh dump` no restaura tal cual en PostgreSQL 15

Descubierto el 2026-09-05 **probando el backup antes de usarlo**, que es lo que el propio
script pide («un backup sin restaurar no es un backup»).

`tools/db.sh` usa la imagen de Postgres **17** como cliente, así que `pg_dump` es 17 y
produce cosas que **PostgreSQL 15 no conoce**. Producción es 15.

⚠️ **Son TRES obstáculos, no uno, y el 2026-09-05 solo se había encontrado el primero.**
Los otros dos aparecieron el 2026-09-06 al volver a restaurar un backup antes de aplicar
el cierre del club. Cada uno frena en un punto distinto, así que arreglar el primero
descubre el segundo:

| # | Qué emite `pg_dump` 17 | Cómo falla en 15 |
|---|---|---|
| 1 | `SET transaction_timeout = 0;` (línea 13) | Con `-v ON_ERROR_STOP=1` el restore **aborta en la línea 13** — y el día que haga falta un backup, ese es el flag que uno usa |
| 2 | Las meta-órdenes `\restrict` / `\unrestrict` de `psql` 17.6 | `psql` 15 corta con **`invalid command \restrict`**. No es SQL: es una orden del cliente, así que no la saltea ni siquiera sin `ON_ERROR_STOP` |
| 3 | `CREATE SCHEMA public;` sobre una base que ya lo tiene | **`schema "public" already exists`**. Hay que dropearlo antes en el destino |

La receta completa, probada de punta a punta el 2026-09-06:

```bash
# 1) Limpiar lo que 15 no entiende
sed -e '/transaction_timeout/d' -e '/^.restrict/d' -e '/^.unrestrict/d' backup.sql > limpio.sql

# 2) El contenedor destino NECESITA el bootstrap montado (ver supabase/checks/pg15-bootstrap).
#    Sin él arranca, ACEPTA CONEXIONES, y muere a mitad de la inicialización.
docker run -d --name pgrestore -e POSTGRES_PASSWORD=postgres \
  -v "$(cygpath -m "$PWD/supabase/checks/pg15-bootstrap")":/docker-entrypoint-initdb.d/init-scripts \
  public.ecr.aws/supabase/postgres:15.8.1.094 postgres

# 3) ⚠️ Esperar el FIN de la inicialización, no que acepte conexiones:
until docker logs pgrestore 2>&1 | grep -q "PostgreSQL init process complete"; do :; done

# 4) El dump usa extensions.uuid_generate_v4() y trae su propio schema public
docker exec pgrestore psql -U supabase_admin -d postgres -q \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;' \
  -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;' \
  -c 'DROP SCHEMA IF EXISTS public CASCADE;'

# 5) Restaurar como supabase_admin (postgres NO es superusuario en esta imagen)
docker exec -i pgrestore psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q < limpio.sql
```

**Y restaurar no es verificar.** Lo que cierra la prueba es comparar conteos contra
producción — el 2026-09-06 dieron **16 de 16 iguales** (users 23, aportes 7, donations 6,
memberships 18, gastos 4, destinos 12, miembros 1, club_canjes 1, partners 7, …).

El arreglo de fondo es alinear la versión del cliente con la del servidor. No se tocó en
el momento para no cambiar `IMAGEN`, que también gobierna `apply` y `sql`.

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

### Capturar el layout móvil: `--window-size` MIENTE por debajo de 504 px

`--window-size=390` **no da un viewport de 390**: en esta máquina el piso es **504 px**, y
el screenshot recorta los 390 de la izquierda de una página maquetada a 504. Se pierde
contenido que está perfecto, y se lee como si el sitio desbordara (§12.10.18).

**Calibrá el instrumento antes de creerle**, con una página que imprima su propio ancho:

```bash
cat > /tmp/regla.html <<'HTML'
<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1.0">
<body style="margin:0;font:16px monospace"><div id="r"></div>
<script>r.textContent='innerWidth='+innerWidth+' scrollWidth='+document.documentElement.scrollWidth</script>
HTML
chrome --headless=new --dump-dom --window-size=390,120 "file:///tmp/regla.html" | grep innerWidth
```

**Reglas prácticas:**

- Capturar a **504** (el piso) y no a 390: se obtiene el viewport entero y **sí ejercita el
  layout móvil**, porque el breakpoint `sm` de Tailwind es 640.
- Agregar `--headless=new --hide-scrollbars`. (Probado: el modo headless **no** era la
  causa del recorte — las dos versiones daban igual.)
- **Verificar el ancho del PNG**: si sale más angosto que el `--window-size` pedido, se
  está recortando. Los bytes 16 y 20 de la cabecera PNG son ancho y alto, big-endian.
- Para un ancho real de teléfono (360-430) hace falta **emulación de dispositivo por CDP**,
  no `--window-size`. Queda como lo único que este procedimiento no cubre.
- Servir el build con `npx vite preview` en vez de pegarle a producción: se puede mirar
  **antes** de desplegar, que es cuando sirve.

### ⚠️ El chequeo de navegador NO cubre nada detrás de sesión

Comprobado el 2026-09-02: un Chrome headless sobre `/dashboard` y `/carnet` responde 200
y devuelve **«Iniciar sesión»** en los dos casos. `ProtectedRoute` redirige antes de que
el componente se monte, así que **el procedimiento de arriba no verifica ni una línea** de
una pantalla privada — y un error de render ahí aparece recién en producción, con el socio
adentro (§10.23).

Para esas pantallas la verificación es **montarlas en un test** con `QueryClientProvider`
y `MemoryRouter`, mockeando los hooks de datos: ver
`src/components/Dashboard/DashboardHeader.test.jsx`. Es lo único que se puede hacer sin
una sesión real, y alcanza para lo que suele romperse (un hook sin provider, un icono que
no existe, un estado sin rama).

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

3. **Un marcador que sale de la BASE no prueba nada del front.** Tercer intento fallido del
   2026-09-02: se esperó a que `/beneficios/:slug` mostrara los términos nuevos, y esos
   términos salen de `club_beneficios.terminos` — el front **anterior** ya los leía. El
   chequeo dio verde en la primera vuelta sin medir el deploy.

4. **Y el chunk de la página tampoco alcanza.** El código de `src/lib/club.js` y
   `src/api/clubApi.js` lo comparten varias pantallas, así que Vite lo pone en un chunk
   propio (`club-*.js`) y **no** en `BenefitDetailPage-*.js`. Buscar el marcador en el chunk
   de la página da 0 aunque el deploy ya esté.

#### El procedimiento que sí funciona

Dos verificaciones distintas, porque son dos cosas distintas:

**Para un cambio VISIBLE** (copy, layout, un bloque que aparece o desaparece): Chrome
headless sobre la ruta real y `grep` en el DOM por un marcador **que solo pueda venir del
código nuevo** — no de la base, no de un texto que ya existía.

**Para un cambio NO visible sin sesión** (lógica, una RPC nueva, un estado interno): seguir
el grafo de módulos hasta el chunk servido y buscar el símbolo adentro.

```bash
# 1) el index desplegado (su hash NO es el del build local)
IDX=$(curl.exe -sL https://evolucionantoniana.com/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
# 2) todos los chunks que referencia
curl.exe -sL "https://evolucionantoniana.com/$IDX" | grep -oE '[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.js' | sort -u > /tmp/chunks.txt
# 3) buscar el simbolo nuevo en cada uno, salteando los que devuelven el fallback HTML
while read -r c; do
  curl.exe -sL "https://evolucionantoniana.com/assets/$c" -o /tmp/x.js
  grep -q '<!doctype' /tmp/x.js && continue
  grep -q 'mi_elegibilidad_club' /tmp/x.js && echo "ENCONTRADO en $c"
done < /tmp/chunks.txt
```

Así se confirmó el deploy de §12.11: el símbolo apareció en `club-Dkfqlm4O.js`, un chunk
compartido. **De paso el mismo grep sirve de control de la fuga**: `DMGlobal` da 0
apariciones en el bundle público.

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
## 10. Modelo de dominio: aporte → acceso ✅ CERRADO el 2026-09-05

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
| **3** | ~~`campanas` + FK desde donaciones~~ **✅ RESUELTO POR OTRO CAMINO**: no hay tabla `campanas`; §10.9 unificó en `destinos` (`tipo`) + `donations.destino_id`. Falta solo la **barra de progreso pública** | ~medio día lo que falta | Donaciones dirigidas |
| **4** | ~~`socios` + `categorias_socio`~~ **✅ HECHA 2026-09-05 como `miembros`** (10.1.a). El carnet ya muestra número, categoría y condición, además del acceso | — | Carnet, antigüedad, categorías, padrón en `/admin` |
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
## 14. Dónde está el diferencial (2026-09-06)

> **Qué es esto y por qué está en el ROADMAP y no en el HISTORIAL:** no es una
> crónica, es la tesis que ordena lo que falta. Apareció trabajando —no en una
> sesión de estrategia— y cambia qué conviene construir después. La crónica de
> cómo apareció está en `HISTORIAL.md` §14.0.

### La tesis, en una línea

**Lo que ningún competidor tiene no es el club de beneficios: es poder rendir un
fondo restringido, y que rendirlo salga barato.**

### Por qué el club no alcanza

§10.7 ya lo había concluido y conviene no olvidarlo: acceso-por-descuentos es
**exactamente lo que ya hacen CuotaQ, SIGCLU, DigitalClub y PortalSocios**, que
llevan años en eso y compiten por precio. Están construidos alrededor de la
**cobranza** —recordatorios, morosidad, débito automático—, que es una palanca de
extracción y está saturada.

Construir solo eso es llegar último a una pelea ya perdida.

### Lo que apareció el 2026-09-06, y no es un caso de la Fundación

Modelando el fondo del convenio quedó a la vista que `destinos` sabía expresar
**una sola de las dos categorías de ingreso** que tiene cualquier entidad sin
fines de lucro:

| | Qué es | El modelo lo sabía expresar |
|---|---|---|
| **Libre disponibilidad** | Cuota social, donación suelta. Se aplica a lo que la entidad necesite | ✅ desde §10.9 |
| **Restringido** | Subsidio estatal, convenio, donación con cargo, legado, beca de una empresa. **Llega completo y atado a un fin** | ❌ hasta el 2026-09-06 |

En contabilidad de organizaciones sociales esa separación es un concepto central,
no una particularidad argentina ni de esta fundación. El caso que la destapó
—$1.000.000 dejados al cerrarse un convenio, con destino estipulado y certificación
notarial— es el caso típico, no el raro.

**Y es la categoría que crea la obligación.** Nadie te exige rendir la cuota
social. Quien te dio un subsidio **sí** te va a pedir la rendición, con fecha. Un
producto que la produce resuelve un problema de cumplimiento, no de marketing —y
eso es lo que no se compite por precio.

### ⚠️ La advertencia que vale más que la tesis

**El diferencial no es la página de rendición. Es que cargar los datos salga tan
barato que efectivamente se haga.**

✅ **Y por eso §14.2 se construyó el mismo día**: pegar el extracto y que salga la
rendición. Lo que sigue abajo es la evidencia de por qué era urgente, y se
conserva porque la advertencia sigue viva — **la herramienta existe, el hábito de
usarla no**.

La evidencia está en esta misma base. La fase 2 —gastos, comprobante y
`/rendicion` pública— está construida, probada y desplegada **desde el
2026-08-16**. Al 2026-09-06 tiene **cero gastos cargados**, y la página dice en
público «**0% de lo recaudado ya tiene rendición publicada**». No falló el código:
nadie se sentó a cargar.

Si en la Fundación —donde el dueño del proyecto es quien escribe el sistema—
pasaron tres semanas sin un solo gasto, en un cliente donde la tesorera tiene otras
cuarenta cosas no va a pasar nunca. **Y una rendición vacía es peor que no
tenerla**: la promesa queda publicada y sin cumplir, que es justo lo que §10.8
advirtió que no había que hacer.

---

### 14.1 — 🟡 Comprometido no es disponible

`/rendicion` calcula `saldo = recaudado − rendido` y lo titula **«Disponible»**.
Para el fondo del convenio eso es engañoso en la dirección peor: los ~$180.000 que
quedan **están afectados al trámite de Personería Jurídica**, y publicarlos como
disponibles invita a leer «tienen plata guardada, no hace falta aportar».

Es la distinción contable estándar entre **comprometido** y **pagado**:

```
disponible = recaudado − pagado − comprometido
```

**Cómo se implementaría:** un gasto con `estado ∈ ('previsto','pagado')` en vez de
existir solo cuando ya se pagó. `previsto` resta del disponible sin figurar como
rendido.

**Por qué no se hizo ahora:** en el caso que lo motivó **no se sabe cuánto cuesta**
el trámite, así que no hay número que cargar. Mientras tanto se dice con palabras,
en la descripción del destino. Cuando aparezca el primer caso con monto conocido,
construirlo.

⚠️ **Y no inventar el estado antes de tener el caso.** Es la lección de §10.1.d:
se construyó `precio_socio` sobre 12 actividades gratuitas y hoy no mueve nada.

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

## 13. Apadrinamiento de cara al público — bloqueado por legal, no por código

> Se sacó de §10.8 el 2026-09-05 **para que §10 pudiera cerrarse sin esconder un
> bloqueo**. Tres listas de prioridades que se contradicen ya costaron caro una vez
> (§10.10); un ítem trabado dentro de una sección «cerrada» es la misma trampa.

**Qué está hecho:** el esquema entero. `padrinazgos` con cupos y su contador,
`hitos_destino` con el reporte agregado, `reporte_destino()` público, `mis_padrinazgos()`
para quien sostiene. Ejercitado en `membresia-check.sql` (T13 a T16).

**La garantía, y es estructural:** en el sistema **no existe ninguna columna donde
guardar la identidad de un beneficiario** — no hay nombre, ni edad, ni foto, ni DNI, ni
diagnóstico, ni FK a una tabla de chicos, porque esa tabla tampoco existe. Y
`hitos_destino` **exige `cantidad`** cuando el destino es `anonimizado`, lo que obliga a
que el impacto se cuente («24 entrenamientos») en vez de narrarse sobre un chico.

**Qué falta, en orden:**

1. 🔴 **La consulta legal.** Como el sistema no guarda ningún dato personal de menores, ya
   **no es sobre qué se guarda sino sobre qué se publica**: qué se puede mostrar de un
   programa con chicos y con qué consentimiento de los tutores. Es una consulta más chica
   que la de §10.8, pero sigue siendo previa a publicar un destino padrinable.
2. 🟡 **La vidriera y el checkout recurrente dirigido.** Hoy hay 2 destinos `padrinable`
   —uno en borrador— **sin cupos cargados** y con $0 recaudado. El esquema los soporta;
   falta la pantalla y que el checkout de suscripción pueda apuntar a uno.
3. 🟡 **El UI ya promete lo que todavía no existe** (§10.8): `MembershipList.jsx:84` habla
   de «red de padrinos», `DashboardHeader.jsx:113` muestra el rol `'Padrino'` y
   `membershipApi.js:190` manda «Beca mensual» a MercadoPago. Ahora hay dónde apoyar esas
   palabras, pero hasta que exista la vidriera **siguen prometiendo de más**.

⚠️ **Regla de lanzamiento, la misma de §10.8:** no publicar destinos padrinables antes de
que el reporte de impacto tenga algo adentro. Prometer «te muestro qué pasó con tu beca» y
no mostrarlo es peor que no prometerlo.

---

## 12. Club de beneficios — CERRADO como módulo el 2026-09-06

> **Esta sección medía 927 líneas —el 33% del ROADMAP— y 13 de sus ítems ya estaban
> cerrados.** La crónica completa (el relevamiento, los cuatro modelos de descuento, el
> diseño del flujo, la unificación del catálogo, el ajuste de umbrales de §12.11 y los
> 21 ítems de deuda con su razonamiento) se movió a **`HISTORIAL.md` §12**. Acá queda
> lo que hace falta para *trabajar* en el módulo: qué no se puede romper, qué falta y
> qué se decidió no hacer.

**Estado:** las fases 0 a 3 están construidas, aplicadas en producción y verificadas.
La deuda de §12.10 se cerró entera salvo lo que depende de gente, no de código.

> ⚠️ **Los números de abajo saltan de 12.0 a 12.12 a propósito.** `CLAUDE.md` fija que
> la numeración es estable porque **la cita el código: §12.3, §12.5, §12.6 y §12.7 solos
> aparecen en 58 lugares de `src/` y `supabase/`**. Reusar 12.1–12.5 para contenido nuevo
> habría dejado 58 comentarios apuntando a otra cosa — y un comentario que cita mal es
> peor que no tener comentario. Los originales viven en `HISTORIAL.md` §12.C con su
> numeración intacta.

### 12.0 — Qué es, y su frontera con §10

§10 responde **quién tiene derecho** a un beneficio (aporte → acceso). §12 responde
**qué pasa en el mostrador** y **qué gana el comercio por estar**.

Son módulos distintos a propósito. §12 le pregunta a §10 **una sola cosa**:
`tiene_acceso(user_id)`. Esa frontera es lo que lo hace portable (12.7), y es una
decisión de diseño, no una casualidad.

---

### 12.12 — Las cinco cosas que no se pueden romper

Si vas a tocar el módulo, esto es lo que hay que respetar. El porqué largo de cada una
está en `HISTORIAL.md` §12; acá va la regla y el costo de romperla.

| # | La regla | Qué pasa si se rompe |
|---|---|---|
| 1 | **`club_canjes` no tiene policy de INSERT/UPDATE.** Se escribe solo desde Edge Functions con `service_role` | Cualquiera con las devtools se autogenera canjes confirmados, y del otro lado hay un comercio esperando cobrar |
| 2 | **El código ES el canje pendiente.** No hay tabla de tokens ni JWT | Se pierde la idempotencia natural y el registro de los canjes abandonados, que es la métrica de adopción del comercio |
| 3 | **La pertenencia al comercio NO es un rol de `users`.** Es tener fila en `club_comercio_usuarios` | Una persona deja de poder operar dos comercios, y el permiso más bajo del módulo empieza a dar privilegios en el resto del sitio |
| 4 | **Todo parámetro variable vive en `club_config`**, ninguna constante mágica en código | El módulo deja de poder copiarse a otro proyecto sin editarlo, que es el objetivo entero de 12.7 |
| 5 | **El club nunca sabe POR QUÉ alguien es elegible.** Pide hechos (`elegibilidad_club`) y decide en `club-reglas.ts` | Se acopla al modelo de socios de esta entidad y deja de ser un módulo |

⚠️ **Y la regla que hace que el club funcione como negocio**, que no es técnica:
**el código es la llave del descuento, no un registro paralelo del descuento.** Si
existe la vía «mostrale el carnet al cajero y listo» en un comercio digitalizado, el
100% del tráfico se va por ahí y no queda ningún dato. El cajero de la pizzería no
trabaja para la fundación; el que reclama en el momento es el cliente, y ese reclamo es
el mecanismo de cumplimiento, gratis.

---

### 12.13 — Dónde vive cada cosa

| Pieza | Archivo |
|---|---|
| Esquema, RLS y el reaper | `supabase/migrations/20260830190000_club_fase2_canjes.sql` |
| Requisitos y tope por beneficio (§12.11) | `…20260902160000_club_requisitos_beneficio.sql` |
| Postulaciones, config y **el reporte al comercio** | `…20260906140000_club_cierre_deuda.sql` |
| El cron del reaper | `…20260906150000_club_cron_reaper.sql` |
| **Toda la lógica que decide algo** | `supabase/functions/_shared/club-reglas.ts` — puro, 41 tests |
| Las 4 Edge Functions | `supabase/functions/club-*` — pegamento HTTP, sin decisiones |
| Reglas de presentación | `src/lib/club.js` — **UX, no frontera** |
| Vidriera pública | `/beneficios` → `BenefitsPage.jsx` |
| Mostrador del socio | `/club` → `pages/club/ClubPage.jsx` |
| Mostrador del comercio | `/comercio` → `pages/club/ComercioPanel.jsx` |
| Postulación pública | `/club/postular` → `pages/club/PostularComercioPage.jsx` |
| ABM | `/admin → Club de beneficios` → `components/Club/` |
| Verificación | `supabase/checks/club-check.sql` — **28 assertions, 0 FALLA** |

⚠️ **La regla que vive dos veces y no se puede evitar**: los requisitos de un beneficio
se evalúan en el browser (UX) y en la Edge Function (autoridad), porque el browser no
puede importar del runtime de Deno. **La única defensa contra que diverjan es que las
dos se prueben con la misma tabla de casos**, y así están escritas.

---

### 12.14 — Lo que falta, y ninguno es de código

- [ ] 🔴 **12.11.2 — El club necesita beneficios de ticket bajo y frecuencia alta.**
  Es el problema de fondo y no lo arregla ninguna columna: **un beneficio de ticket alto
  y una sola vez no es un beneficio de club de fidelidad.** Los clubes funcionan con lo
  contrario —el café, la farmacia, la librería: $2.000 de ahorro veinte veces al año—,
  que construye hábito y premia la permanencia sin que nadie diseñe nada.
  **DigitalMatch es una vidriera excelente y un cimiento malo.** Sumar tres o cuatro
  comercios de consumo cotidiano vale más que cualquier ajuste de umbral.

- [ ] 🟡 **12.10.9 — El club tiene UN socio.** 1 de 23 cuentas con acceso vigente. El
  circuito funciona entero y todas sus ramas corrieron; falta gente adentro. **Es §10.17,
  no un problema del club.**

- [ ] **12.10.3.b — El runtime del rescate diferido, en producción.** La *decisión* ya
  no es deuda: se extrajo a `decidirRescate()` en `club-reglas.ts` y tiene 6 casos en
  vitest, incluido el que fija que la ventana se mide contra `created_at` y no contra
  `expira_en` (medida mal daría 2 h 5 min en vez de 2 h, y las dos versiones «andan»).
  **Lo que sigue sin correr es el HTTP + el JWT + el UPDATE**, y eso no se puede probar
  fuera de producción (12.10.12). Hace falta un canje real que se deje vencer.

- [ ] **Fase 4 — `club_niveles`.** Bloqueada **a propósito** y no por falta de tiempo:
  §12.6 fijó que los umbrales se fijan con 3 meses de datos reales, y hoy hay 1 canje.
  Lo que ya está decidido para cuando se construya:
  - La métrica es **el ahorro generado** (`sum(ahorro)`), **no la cantidad de canjes**:
    contar canjes premia al grande por ser grande, es inflable, y mide atractivo en vez
    de generosidad.
  - **Tope de 3 canjes por socio por mes** en el cálculo del nivel — dos líneas en una
    vista, y mata el inflado.
  - **Ventana móvil de 12 meses**, evaluación trimestral.
  - Los niveles bajos **no se muestran en público**.
  - ⚠️ **12.11.3 — `ahorro_maximo` cambia estos números.** Un ahorro topado no es
    comparable con uno sin tope, y los umbrales se van a fijar sobre una mezcla de los dos.
  - ⚠️ Poner «Partner Dorado» en la Home de una fundación **es publicidad**: el criterio
    tiene que ser objetivo y estar publicado en la página del club.

- [ ] **Fase 5 — Extraer el módulo a un segundo proyecto.** Es la prueba real de 12.7 y
  el paso que convierte esto en producto. Las 6 reglas de portabilidad están respetadas
  y verificadas, pero **una portabilidad que nunca se ejerció es una hipótesis**: el
  objetivo es copiar `migrations` + `functions` + `components/Club/` a otro proyecto
  Supabase, implementar `tiene_acceso()` a su manera, y que funcione sin editar el
  módulo. No es multi-tenant compartido a propósito — con un solo dev, un servicio
  central es punto único de falla. **Se duplica el código y se acepta aplicar cada fix
  N veces.**

---

### 12.15 — Lo que se decidió NO hacer (para no re-discutirlo)

| | Por qué |
|---|---|
| **PIN por empleado** (12.10.7) | §12.3 lo declaró opcional y predijo que «casi ninguno lo va a querer». La decisión es *no lo hagas hasta que un comercio lo pida* |
| **Rol `'comercio'` en `users`** | La pertenencia a `club_comercio_usuarios` *es* el permiso. Permite operar dos comercios y no contamina el resto del sitio |
| **Poder borrar un comercio** | Se archiva con `estado = 'baja'`. Los canjes no se borran nunca: son el libro contable del club |
| **`ahorro` en NULL para 2x1 y regalo** | No es un dato faltante, es «no calculable». Un 0 mentiría en el reporte al comercio |
| **Partir el descuento entre la persona y la entidad** | Convierte un descuento en una cobranza con rendición: la entidad pasa a ser acreedora de cada comercio. Es lo que mata a los clubes chicos |
| **Encarecer la cuota para proteger un beneficio caro** | El objetivo es volumen de socios, no margen por socio. Se protege **pidiendo tiempo** (antigüedad o aporte acumulado), no plata |
| **Mapa embebido de sucursales** | Arrastraría una librería de mapas para un club con 1 comercio, y hoy su única sucursal es «Online». La dirección con link al mapa cubre el caso |

### 12.16 — Las limitaciones que quedan declaradas

- **12.10.12 — El runtime de las Edge Functions no se puede probar localmente.**
  `supabase start` falla en esta máquina. **Ya no vale para el esquema**:
  `supabase/checks/pg15-bootstrap/` valida migraciones, policies y triggers contra la
  misma versión de producción. Vale para el `index.ts` de cada función, y el remedio es
  el que se viene aplicando: **toda decisión vive en `club-reglas.ts`**, que sí se
  testea. Al 2026-09-06 no queda ninguna decisión del club fuera de ese archivo.

- **`club_postulaciones` es una escritura abierta a `anon`.** Es la superficie más
  expuesta del módulo. Está acotada a INSERT (sin SELECT: las filas traen mail y
  teléfono) y la policy exige `estado = 'nueva'` sin campos de revisión. Tiene honeypot
  y **no tiene captcha**: si algún día llega spam, esa es la palanca.
