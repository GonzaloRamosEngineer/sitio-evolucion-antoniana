# Runbook — regla de cuotas, donaciones, adelantos y webhook (2026-10)

**Estado:** para revisión final. **No ejecutar sin autorización explícita.**
**Prerrequisito cumplido:** la P0 (cierre de escritura de pagos) está aplicada en
producción y mergeada en `master` desde el 2026-10-16 (`HISTORIAL.md` §16).

| Pieza | Dónde | Rama |
|---|---|---|
| Base: 2 migraciones + reclasificación histórica | este repo | `feat/cuotas-concepto` (rebasada sobre la P0) |
| Frontend | este repo | la misma |
| Webhook | `GonzaloRamosEngineer/mp-supabase-webhook` | `feat/seguridad-reintegros-idempotencia` sobre `main` (`417587f`) |
| Edge Function `club-generar-canje` | este repo | la misma (solo textos) |

**Qué cambia** (detalle en `HISTORIAL.md` §15):
- una cuota cubre un mes, aunque el monto sea mayor;
- una donación suma al total y registra a la persona como donante, pero no da acceso,
  cuotas ni racha;
- reintegros y contracargos anulan el aporte sin borrarlo, y un reintegro parcial
  descuenta sólo lo devuelto;
- el beneficio web se habilita con acceso + 6 cuotas o $30.000;
- los 135 aportes manuales quedan sin clasificar.

**Adelantos:** el modelo los admite (`concepto = 'adelanto_cuotas'`), pero ninguna pantalla
los ofrece todavía. Este despliegue los deja listos en la base.

---

## Las herramientas

| | Qué hace | ¿Escribe? |
|---|---|---|
| `supabase/data/precheck_reclasificacion_aportes_2026_10.sql` | compara la base con lo verificado y simula la reclasificación | no (READ ONLY) |
| `bash tools/cuotas-2026-10.sh simular` | **todo** (esquema + funciones + reclasificación) en una transacción, y ROLLBACK | no |
| `bash tools/cuotas-2026-10.sh aplicar` | lo mismo, y COMMIT | sí |
| `bash tools/cuotas-2026-10.sh simular-reversion` | datos + lógica en una transacción, y ROLLBACK | no |
| `bash tools/cuotas-2026-10.sh revertir` | lo mismo, y COMMIT. Se niega si el webhook desplegado no es el viejo | sí |
| `supabase/data/foto_logica_aportes.sql` | huella de funciones, triggers, permisos, restricciones, columnas y policies | no |
| `supabase/data/p0_1_foto_estado_previo.sql` | permisos de pagos + huellas de datos | no |
| `supabase/data/monitoreo_cuotas_2026_10.sql` | contadores que tienen que dar 0 | no |

**Atómico, sin ventana.** `aplicar` arma un único flujo de SQL que corre en **una sesión y
una transacción**:
1. `\set ON_ERROR_STOP on`, `BEGIN`, `SET LOCAL lock_timeout = '15s'`.
2. `LOCK … ACCESS EXCLUSIVE` sobre `donations` → `memberships` → `aportes`, el mismo orden en que escribe el webhook.
3. Migración `20261016120000`.
4. Migración `20261016120100`.
5. El cuerpo de la reclasificación, que repite la verificación, aplica, hace el post chequeo y valida el CHECK.
6. `COMMIT`.

Ante cualquier error, psql corta y la transacción se descarta: **nadie ve nunca un
estado intermedio**. Ya no existe la ventana sin acceso del procedimiento anterior.

Un aviso de Mercado Pago que llega durante esos segundos **espera** al bloqueo y entra
después: no se pierde.

Las migraciones no abren ni cierran transacciones propias, y el cuerpo es el mismo texto
que usa la aplicación suelta. Las dos cosas las fija `src/lib/tools-cuotas.test.js`.

**Lo verificado** (IDs de personas y de pagos) **no está en el repo**, que es público. Vive
en `$D/reclasificacion-2026-10-verificado.psql` (0600) y las herramientas lo reciben por la
entrada estándar. Sin ese archivo, el pre chequeo falla y `aplicar` no emite nada.

---

## Orden de despliegue: base → frontend → webhook → Edge Function

Cada etapa intermedia funciona con lo viejo que todavía convive:

| Después de… | Front | Webhook | Estado |
|---|---|---|---|
| A. Base | viejo | viejo | OK. El front viejo ignora la columna nueva `concepto` de `mi_acceso`. El webhook viejo hace select-then-insert y no manda `mp_actualizado_en`, así que la guarda de orden queda inactiva. Un reintegro igual anula, porque el webhook viejo manda `refunded` |
| B. Frontend | nuevo | viejo | OK. Manda el token, que el webhook viejo ignora, y sigue mandando `user_id` en el body |
| C. Webhook | nuevo | nuevo | OK. Exige el token, que el front ya manda. El upsert por `payment_id` usa el UNIQUE de A |

**Al revés se rompe:** el webhook antes que la base pierde cobros (su upsert necesita el
UNIQUE), y el webhook antes que el front deja pausar, activar y cancelar en 401.

---

## Etapa A — Base

```bash
cd ~/Documents/dev/sitio-evolucion-antoniana
git fetch origin && git switch feat/cuotas-concepto && git log --oneline -1     # el commit revisado
D=~/Documents/dev/BACKUPS/evolucion-antoniana
ls -l "$D/reclasificacion-2026-10-verificado.psql"                              # -rw-------
bash tools/db.sh check                                                          # OK · postgres · PostgreSQL 15.8
```

**A1. Respaldo y fotos**
```bash
bash tools/db.sh dump "$D/pre-cuotas-$(date +%F-%H%M).sql"
bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql  > "$D/cuotas-foto-datos-antes.txt"
bash tools/db.sh sql < supabase/data/foto_logica_aportes.sql      > "$D/cuotas-foto-logica-antes.txt"
bash tools/db.sh sql < supabase/data/p0_4_monitoreo.sql
```
✅ El dump no está vacío. La foto de datos muestra la P0 cerrada. ❌ Si `ultima_escritura` es
de minutos atrás, hay un aviso de Mercado Pago en curso: esperar.

**A2. Pre chequeo (fuera de la transacción, sólo lectura)**
```bash
cat "$D/reclasificacion-2026-10-verificado.psql" supabase/data/precheck_reclasificacion_aportes_2026_10.sql | bash tools/db.sh sql
```
✅ `verificado_cargado = t`, «todavía no está instalada» y `PRE CHEQUEO OK: 8 aportes
automáticos y 8 cobros verificados; 135 manuales…`. ❌ `PRE CHEQUEO FALLÓ` → **parar**. Si
entró un cobro real nuevo, la salida lo nombra: hay que actualizar lo verificado y volver a
revisarlo.

**A3. Simulación completa en producción**
```bash
bash tools/cuotas-2026-10.sh simular 2>&1 | tee "$D/cuotas-simular.txt"
bash tools/db.sh sql < supabase/data/foto_logica_aportes.sql > "$D/cuotas-foto-logica-post-simular.txt"
diff "$D/cuotas-foto-logica-antes.txt" "$D/cuotas-foto-logica-post-simular.txt"     # vacío
```
Corre **todo** contra la base real y termina en ROLLBACK. Toma los bloqueos unos segundos:
los avisos del webhook esperan y entran después.
✅ Los 8 `CAMBIO ESPERADO`:

| Aporte | Cambio |
|---|---|
| Cuota del 2/9 | `cuota_mensual`, período 2026-09-02 → 2026-10-01 |
| Cuota del 2/10 | `cuota_mensual`, período 2026-10-02 → 2026-11-01 |
| Donación del 2/10 | `donacion_extraordinaria`, sin período |
| Las otras 5 | `donacion_extraordinaria` |

Después `POST CHEQUEO OK: cuenta de control con 2 cuotas efectivas y $30000 acumulados;
acceso=t`, `== FIN: ROLLBACK`, y el `diff` vacío.
❌ Cualquier `ERROR`, o un `diff` con contenido → **parar**.

**A4. Aplicar**
```bash
bash tools/cuotas-2026-10.sh aplicar 2>&1 | tee "$D/cuotas-aplicar.txt"
```
✅ La misma salida que A3, pero con `== FIN: COMMIT`. ❌ Si falla, **no quedó nada
aplicado**: es la misma transacción que A3. Leer el motivo antes de reintentar.

**A5. Post chequeos (después, fuera de la transacción)**
```bash
bash tools/db.sh sql < supabase/data/p0_3_postcheck.sql                 # la P0 sigue cerrada y el webhook escribe: 19 PASA
bash tools/db.sh sql < supabase/data/monitoreo_cuotas_2026_10.sql       # los cinco contadores en 0
bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql  > "$D/cuotas-foto-datos-despues.txt"
bash tools/db.sh sql < supabase/data/foto_logica_aportes.sql      > "$D/cuotas-foto-logica-despues.txt"
cat "$D/reclasificacion-2026-10-verificado.psql" supabase/data/precheck_reclasificacion_aportes_2026_10.sql | bash tools/db.sh sql
```
✅ En el monitoreo dan 0 `aprobadas_sin_aporte`, `periodos_de_un_dia`,
`donaciones_con_periodo`, `manuales_con_efecto` y `cuotas_sin_periodo_con_titular`. Las
huellas de `donations` y `memberships` no cambian. El pre chequeo ahora ya no propone
cambios: es idempotente.

---

## Etapa B — Frontend

```bash
git fetch origin && git switch master
git merge --ff-only feat/cuotas-concepto          # falla si master se movió
git push origin master                             # Vercel despliega
gh api repos/GonzaloRamosEngineer/sitio-evolucion-antoniana/commits/$(git rev-parse HEAD)/status --jq '.state'   # success
curl -s -o /dev/null -L -w '%{http_code}\n' https://evolucionantoniana.com/                                       # 200
```

**Revisión manual, con sesión, en la cuenta de control:**
- `/carnet` muestra «Cuotas pagadas: 2 cuotas», «Total aportado: $30.000», vence el 1 de
  noviembre y «Tu acceso viene de: Cuota mensual».
- En el historial aparecen «Cuota mensual» ×2 y «Donación extraordinaria» ×1.

---

## Etapa C — Webhook

```bash
cd ~/Documents/dev/mp-supabase-webhook
git fetch origin && git switch main
git merge --ff-only feat/seguridad-reintegros-idempotencia && git push origin main
curl -s https://mp-supabase-webhook.onrender.com/health
```
Si Render no tiene auto-deploy: *Manual Deploy → Deploy latest commit*. Hay que verificar
la **versión**, no el 200: ✅ `"version":"2026-10-16.reintegros-auth"`, los cuatro flags
nuevos en `true` y `firma_modo: "rechaza"`.

**Prueba de humo** (no llega a Mercado Pago ni escribe):
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mp-supabase-webhook.onrender.com/api/suscripciones/no-existe/pausar                                     # 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Authorization: Bearer x' https://mp-supabase-webhook.onrender.com/api/suscripciones/no-existe/pausar       # 401
```

## Etapa D — Edge Function
```bash
cd ~/Documents/dev/sitio-evolucion-antoniana
supabase functions deploy club-generar-canje --project-ref lbtyxnbyetsvngsxczkt      # solo textos: «cuotas» en vez de «meses»
```

---

## Reversión completa — el orden seguro

**Siempre en este orden.** Cada paso protege al siguiente:

1. **Webhook a `417587f`**, con redeploy de ese commit en Render. Verificar
   `"version":"2026-08-31.consulta-mp"`. *Primero*, porque la reversión de lógica quita el
   UNIQUE de `payment_id`, y sin él el upsert del webhook nuevo falla y **se pierden
   cobros**. `tools/cuotas-2026-10.sh revertir` **se niega** a correr si `/health` no
   muestra la versión vieja.
2. **Frontend al deploy anterior** (Vercel, *Promote*) y revertir el merge en `master`. El
   front nuevo llama a `mi_resumen_aportes()`, que la reversión borra.
3. **Base: datos + lógica, en una transacción**
   ```bash
   bash tools/cuotas-2026-10.sh simular-reversion 2>&1 | tee "$D/cuotas-simular-reversion.txt"   # POST REVERSIÓN OK + ROLLBACK
   bash tools/cuotas-2026-10.sh revertir          2>&1 | tee "$D/cuotas-revertir.txt"            # POST REVERSIÓN OK + COMMIT
   ```
   Adentro, en este orden:
   1. **Datos:** `revertir_reclasificacion_aportes('2026-10-cuotas-v2')` devuelve cada fila a
      su estado anterior, guardado en `aportes_correcciones`. Las correcciones se marcan
      `revertido_en`; nada se borra. Va primero porque usa funciones que el paso siguiente borra.
   2. **Lógica** (`supabase/data/revertir_logica_cuotas_2026_10.sql`, **generado desde
      producción**): vuelven las 10 funciones con su cuerpo de producción, se recrea el trigger
      de donaciones, se restauran los permisos exactos (`proacl`) y los comentarios, se borran
      las 12 funciones y los 2 triggers nuevos, y se quitan los UNIQUE y el CHECK de períodos.
   3. **Post reversión:** no queda ninguna función ni trigger nuevo, `acceso_vigente` vuelve a
      su firma, no quedan reclasificaciones sin revertir y la P0 sigue cerrada.
4. **Comprobar**
   ```bash
   bash tools/db.sh sql < supabase/data/foto_logica_aportes.sql     > "$D/cuotas-foto-logica-revertida.txt"
   bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql > "$D/cuotas-foto-datos-revertida.txt"
   diff "$D/cuotas-foto-logica-antes.txt" "$D/cuotas-foto-logica-revertida.txt"
   ```
   ✅ En la lógica, sólo difiere lo que se conserva a propósito: las columnas nuevas de
   `aportes` y `donations` con sus CHECK, y la tabla `aportes_correcciones` con su policy.
   Funciones, triggers, permisos y policies quedan idénticos. Los datos vuelven a la foto de
   antes.

**Qué NO revierte, a propósito:**
- Las columnas nuevas y sus valores: la lógica vieja las ignora.
- El historial de `aportes_correcciones`.
- **La P0:** revertir cuotas no reabre la escritura de pagos.
- Los aportes **nuevos** que hayan entrado con la regla nueva: quedan con su concepto y su
  período, y la lógica vieja los lee igual.
- Las anulaciones automáticas por reintegro (lote `mp:*`).

**Revertir sólo los datos**, dejando la lógica nueva:
`bash tools/db.sh sql < supabase/data/revertir_reclasificacion_aportes_2026_10.sql`.

---

## Monitoreo

| Cuándo | Qué |
|---|---|
| Al terminar, +24 h, +72 h | `monitoreo_cuotas_2026_10.sql`: los cinco contadores en 0 |
| Próximo cobro real (≈ 2/11) | una fila nueva arriba: `cuota_mensual`, 1 cuota, ~30 días |
| Mismo cobro, logs de Render | `🔍 Respuesta MP (payment)`: de qué campo sale el id del preapproval; `✅ Suscripción actualizada con el último cobro` |

---

## Ensayo

`supabase/checks/reclasificacion-replica.sh` recorre este runbook sobre una réplica en
Postgres 15: el esquema de producción con la P0 y una foto de datos con los mismos
importes, fechas y períodos, pero IDs sintéticos. Hace:
- pre chequeo, también sin lo verificado;
- simulación (no deja nada en datos ni en lógica);
- aplicación atómica y re-aplicación;
- reversión de datos sola y nueva aplicación;
- simulación de la reversión completa;
- **reversión completa**: la foto de datos es la exacta de antes, y la de lógica es
  idéntica salvo lo conservado a propósito;
- **los checks SQL de `master` sobre la base revertida**, que pasan;
- nueva aplicación y controles negativos.

Resultado del 2026-10-16: **30/30, 0 fallas.**

Como la reversión de lógica salió de las definiciones de **producción** y deja la réplica,
construida desde las migraciones del **repo**, idéntica a como estaba, también queda
probado que producción y repo coinciden en esas funciones.

---

## Pendientes fuera de este despliegue

- El SELECT de `anon` sobre `donations` (revisión aparte, ver la P0).
- Datos personales ya publicados en `master`: plan en la rama `docs/plan-saneamiento-datos`.
- Los 135 aportes manuales esperan clasificación individual.
