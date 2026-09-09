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
> **Tercer corte, 2026-09-08: §10 completa** (~810 líneas). Esta vez con un criterio más
> duro, porque la sección **decía de sí misma que estaba cerrada desde el 2026-09-05 y
> tenía dos pendientes declarados que ya no existían**. No se archivó por lo que afirmaba:
> se revalidaron sus veinte afirmaciones con SQL de solo lectura contra producción, se
> corrigieron las dos falsas antes de moverla, y los tres residuales reales subieron a
> «Por dónde arrancar». **Una sección se archiva cuando se comprobó contra la base, no
> cuando se declara cerrada.**
>
> **Y de paso se barrió el resto con el mismo criterio:** §14.2–§14.4 (el importador y la
> transparencia, revalidadas con 63 tests verdes antes de moverlas) y §12.17 (la crónica
> del bug del «$0 de ahorro», cuya lección se quedó acá). En total el ROADMAP pasó de
> **3.185 líneas a 995**. Lo que sobrevive es lo que falta hacer, lo que no se puede
> romper y por qué — nada de crónica.
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

## 🚦 Por dónde arrancar (actualizado 2026-09-08, con §10 revalidada y archivada)

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

   ✅ **a) y b) ya están hechas** — comprobado contra producción el 2026-09-08. El aporte
   de $1.000.000 **tiene el PDF adjunto** (`Acta_de_Finalizacion_Convenio_CJA.pdf`, tipo
   `escritura`, Foja E 00405399) y **tiene la `referencia_externa`**
   `saldo-inicial:fondo-convenio-2024`, o sea que el tilde de saldo inicial está puesto.
   Este ítem decía que faltaban las dos.

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

2. 🟡 **Recién después, publicar las campañas en borrador.** Son **7** (decía 8;
   remedido el 2026-09-08), y **ninguna tiene imagen ni meta** —eso sí sigue siendo
   cierto, las 7—, así que además de activarlas hay que completarlas. De $12.241 aportados, $12.141 fueron al institucional — no porque la
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

8. **`npm audit fix`** (sin `--force`). ⚠️ **Remedido el 2026-09-08 y cambió:** son **8
   avisos, no 4**, y **2 `high`, no 1** — subieron `js-yaml` (high) y tres de la cadena de
   `vitest`, que entraron con el salto a `vitest@4`. La novedad buena es que **npm reporta
   fix no-breaking para los 8**, incluido `react-router-dom`, que este ítem daba por
   imposible sin el major. Correr `audit fix`, y después `build` + `lint` + los 494 tests
   antes de creerle. El major a `7.18.3` sigue siendo deseable, pero ya no es el único
   camino para cerrar el advisory.

9. **Los tres residuales de §10, que son carga de datos y no código** (relevados contra
   producción el 2026-09-08, al archivar la sección). El esquema está entero y verificado;
   lo que falta es que alguien cargue lo que el esquema ya sabe mostrar:

   - 🟡 **Tres de los cuatro destinos activos no muestran barra de progreso** porque no
     tienen `meta_monto` cargada — entre ellos `fondo-convenio-2024`, que lleva
     **$1.000.000 recaudado**, y `sostenimiento-institucional` con $12.141. El único que
     sí la muestra es `equipamiento-deportivo`. Es un `UPDATE` por destino, y la decisión
     de cuánto es la meta es del dueño, no del código.
   - 🟡 **`reporte_destino()` no la llama nadie.** La función existe y está ejercitada en
     `membresia-check.sql`, pero en `src/` aparece solo en comentarios de `aportesApi.js`
     y `AportesAdmin.jsx`. O se usa para el reporte agregado público, o se borra: una
     función sin llamador es una promesa que el próximo lector va a creer.
   - 🟡 **El diferencial de socio nunca se ejerció en producción:** 0 actividades con
     `precio_socio` o `precio_general`, 0 beneficios con `requiere_acceso`. El mecanismo
     está probado; **lo que no está probado es que sirva**, porque nunca corrió con datos
     reales. Antes de darlo por bueno, cargar un caso de cada uno.

10. **Deuda menor, toda junta:** el apadrinamiento público en **§13** (bloqueado por legal,
    no por código) y **7 assertions muertas en `rls-check.sql`** — ver abajo.
    ✅ **La del club ya no está en esta lista**: §12.10 se cerró entero el 2026-09-06.
    ✅ **Y `club-invitar-operador` tampoco**: figuraba acá como «SIN desplegar, la ruta no
    existe», y el 2026-09-08 se comprobó contra producción que **sí está desplegada** — el
    gateway devuelve `UNAUTHORIZED_NO_AUTH_HEADER`, no el `NOT_FOUND` que devuelve para una
    función inexistente. Queda por probar el botón «Invitar por email» de punta a punta.

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

1. **Verificá las premisas del ROADMAP contra el código antes de trabajar.** Van
   **veinticuatro** afirmaciones de este repo que resultaron falsas: cinco el 2026-08-30/31
   (§11.6.2), cuatro el 2026-08-30 (§11.7.2), tres el 2026-09-05 (§10.27), una el
   2026-09-06 (`HISTORIAL.md` §14.4) y **diez el 2026-09-08 en una sola pasada**, al
   revalidar §10 y la lista de arranque antes de archivarlas:

   | # | Decía | Es |
   |---|---|---|
   | 15 | §10.3 fase 3: «falta la barra de progreso pública» | Existe, en `SelectorDestino.jsx:38-40` |
   | 16 | §10.3 fase 5 y §C: el `SELECT` amplio de `anon` sigue abierto | RLS tapa todo: 0 filas de `users`, `donations`, `memberships`, `email_log`. Y §C apuntaba a un ítem de §A **que no existía** |
   | 17 | «`club-invitar-operador` sin desplegar, la ruta no existe» | Desplegada: el gateway da `UNAUTHORIZED`, no `NOT_FOUND` |
   | 18 | «387 tests en 32 archivos, 50 warnings» | 494 en 41, y 39 warnings. **Cuarta medición vieja seguida** |
   | 19 | «el código de renovación nunca corrió contra un cobro real» | Corrió: 1 membresía activa con `last_payment_id` y `destino_id` |
   | 20 | 🔴 «0 personas con acceso vigente» | 1 persona, y 3 de 6 donaciones traen `payer_email` |
   | 21 | «el acta de $1.000.000 figura sin archivo» | Tiene el PDF adjunto |
   | 22 | «le falta la `referencia_externa` del saldo inicial» | La tiene |
   | 23 | «son 8 campañas en borrador» | Son 7 |
   | 24 | «4 avisos de `npm audit`, 1 `high`» | 8 avisos, 2 `high` — **subieron al saltar a `vitest@4`** |

   No es mala suerte: es lo que le pasa a un documento que se escribe una vez y se relee
   nunca. ⚠️ **Y fijate el patrón nuevo de las diez de golpe: siete de ellas decían que
   algo faltaba cuando ya estaba hecho.** Un ROADMAP que envejece no solo te hace confiar
   en lo que no anda — **también te hace rehacer lo que ya está**.
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
producción, con lint en **0 errores (39 warnings)**, **494 tests en 41 archivos** y `vite@7`.
(Remedido el 2026-09-08. Decía «174» hasta el 2026-09-02, «265» hasta el 2026-09-05, «368»
hasta el cierre de §10 y «387 en 32 archivos» hasta hoy — **cuatro mediciones viejas
seguidas, y el aviso de remedir estaba escrito al lado de la cuarta**. Los warnings también
bajaron: decía 50, son 39. **Remedir antes de citar** — son treinta segundos.)

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

⚠️ **Y esto también quedó viejo — remedido el 2026-09-08.** Decía: *«de 17 membresías, 0
tienen `last_payment_id`, `payer_email` o `destino_id`, y ninguna está activa. El código de
renovación existe y nunca corrió contra un cobro real»*. **Ya no.** Hoy son **18
membresías**, y hay **1 activa, con `last_payment_id` y `destino_id`**: el canal recurrente
**se estrenó**. Lo que sigue en cero es `payer_email` en las 18 —el webhook no lo escribe en
esta tabla— y el resto del padrón sigue frío (6 canceladas, 5 vencidas, 4 pendientes, 2
pausadas). **Un solo cobro real no valida el canal entero**, pero «nunca corrió» dejó de ser
cierto, y esa frase estaba desalentando probarlo.

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

✅ **Y el bloqueante que destapó, cerrado.** Decía en rojo: *«el backfill dio 0 personas
con acceso vigente, porque 4 de 5 donaciones llegan sin `user_id`»*. Remedido el 2026-09-08:
**1 persona con acceso vigente**, y de **6** donaciones hay **3 con `payer_email` y 2 con
`user_id`**. Sigue siendo poca gente, pero eso es adopción, no un bloqueante técnico.
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

> ⚠️ **Remedido dos veces, y las dos veces cambió.** El 2026-09-02 pasó de 1 aviso a **4**.
> **El 2026-09-08 son 8, con 2 `high`** (`browserslist` y `js-yaml`): subieron `js-yaml` y
> tres de la cadena de `vitest`, que entraron con el salto a `vitest@4` — o sea que
> **actualizar también trae advisories, no solo los cierra**. Y npm ahora reporta **fix
> no-breaking para los 8**, `react-router-dom` incluido. El detalle de abajo es del
> 2026-09-02 y hay que releerlo con eso en la mano.

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
| **Un extracto que mezcla destinos hay que importarlo por partes** | Residual de §14.2, subido acá el 2026-09-08 al archivarla | El lote entero se imputa a un destino. Reimputar después existe (§10.11) pero es más trabajo que separar antes. Nadie se topó con el caso todavía. |
| **Las heurísticas de clasificación del importador nunca se probaron con otro banco** | Residual de §14.2, subido acá el 2026-09-08 | Son vocabulario castellano de MercadoPago y viven como dato (`REGLAS` en `src/lib/importarMovimientos.js`), así que sumar otro banco es agregar filas — **pero eso es la hipótesis, no el hecho**. Se confirma el día que entre un extracto de un banco. |

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

**Cerrado del todo el 2026-09-08.** Este puntero decía que seguía abierto «el resto de
10.1.g, en §A» — y en §A no había tal ítem. Lo que quedaba era el `SELECT` amplio de
`anon`, y se midió: RLS activa en las **24** tablas (no 7), y asumiendo el rol `anon` se
ven **0 filas** de `users` (de 23), `donations` (de 6), `memberships` (de 18), `email_log`
(de 31), `education_preinscriptions` (de 160), `registrations` (de 5) y `tasks` (de 61).
La única visible es `gastos`, a propósito: es la rendición pública. **El GRANT es ancho,
la exposición es cero.** Achicarlo sigue siendo higiene defendible, pero no es un riesgo
y no merece estar en una lista de pendientes.
## 10. Modelo de dominio: aporte → acceso — cerrado y archivado → `HISTORIAL.md`

**Revalidada entera contra producción el 2026-09-08** con SQL de solo lectura, y recién
entonces movida. Las veinte afirmaciones se comprobaron contra la base: las tres tablas del
padrón existen y son coherentes (0 usuarios con acceso vigente sin fila en `miembros`), las
seis decisiones de §10.4 viven en datos, las 8 funciones del modelo están, y `anon` no
conserva ningún GRANT destructivo.

**Dos pendientes que la sección declaraba ya no lo eran:** la barra de progreso pública
existe (`SelectorDestino.jsx:38-40`, por `destinos.monto_recaudado` y no por
`reporte_destino()`), y el `SELECT` amplio de `anon` **se midió y no expone nada** — RLS
activa en las 24 tablas, 0 filas visibles de `users`, `donations`, `memberships`,
`email_log`, `education_preinscriptions` y `tasks`. Solo `gastos` se ve, que es la rendición.

El razonamiento entero —que ya evitó tres errores caros, y las tres premisas propias que se
cayeron al construirlo— vive en `HISTORIAL.md`, junto con §10.10–§10.21 y §11.

**Lo que sigue abierto de este frente no está acá:** los tres residuales de carga de datos
están en «Por dónde arrancar» (ítem 9), y el apadrinamiento público en §13.

## 14. Dónde está el diferencial (2026-09-06)

> **Qué es esto y por qué está en el ROADMAP y no en el HISTORIAL:** no es una
> crónica, es la tesis que ordena lo que falta. Apareció trabajando —no en una
> sesión de estrategia— y cambia qué conviene construir después. La crónica de
> cómo apareció está en `HISTORIAL.md` §14.0.
>
> **Depurada el 2026-09-08:** §14.2–§14.4 estaban cerradas y se archivaron. Acá quedan la
> tesis y **§14.1, que es lo único abierto de este frente** — y está esperando un dato,
> no tiempo de desarrollo.

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

### 14.2 – 14.4 — El importador y la transparencia → `HISTORIAL.md`

**Las tres cerradas el 2026-09-06, revalidadas y archivadas el 2026-09-08** (63 tests
verdes en `importarMovimientos`, su componente y `gastosApi`): la importación desde
extracto, subir los `.csv` en vez de pegarlos —con las tres verificaciones de cadena— y
la transparencia publicada y navegable. La crónica entera está en `HISTORIAL.md`.

**Los dos residuales que quedaron vivos están abajo, en «Deuda menor declarada» (§A).**

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
| Verificación | `supabase/checks/club-check.sql` — **30 assertions, 0 FALLA** |

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
| **`ahorro` en NULL para 2x1 y regalo** | No es un dato faltante, es «no calculable». Un 0 mentiría en el reporte al comercio — **y el reporte de la fase 3 lo hizo el 2026-09-06**, ver abajo |
| **Partir el descuento entre la persona y la entidad** | Convierte un descuento en una cobranza con rendición: la entidad pasa a ser acreedora de cada comercio. Es lo que mata a los clubes chicos |
| **Encarecer la cuota para proteger un beneficio caro** | El objetivo es volumen de socios, no margen por socio. Se protege **pidiendo tiempo** (antigüedad o aporte acumulado), no plata |
| **Mapa embebido de sucursales** | Arrastraría una librería de mapas para un club con 1 comercio, y hoy su única sucursal es «Online». La dirección con link al mapa cubre el caso |

### 12.17 — El bug del «$0 de ahorro» → `HISTORIAL.md`

Arreglado el 2026-09-06 (`20260906160000`, fijado con T25b/T25c). **La lección se queda
acá porque es la que hay que leer antes de escribir el próximo `sum()`:** tener la regla
escrita, verificada y citada en este mismo archivo **no impidió romperla**. Lo que la
atrapó no fue leer mejor — fue **mirar el número que el sistema le iba a mostrar a una
persona real**. La crónica está en `HISTORIAL.md`.

---
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
