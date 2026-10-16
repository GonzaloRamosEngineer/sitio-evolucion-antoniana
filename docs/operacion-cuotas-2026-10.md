# Procedimiento — desplegar la regla de cuotas, donaciones, adelantos y webhook (2026-10)

**Estado:** para revisión. **No ejecutar sin autorización explícita.**
**Prerrequisito cumplido:** la P0 (cierre de escritura de pagos) está aplicada en
producción desde el 2026-10-16 (`HISTORIAL.md` §16) y mergeada en `master`.

| Pieza | Dónde | Commit/rama |
|---|---|---|
| Base: 2 migraciones + reclasificación histórica | este repo | `feat/cuotas-concepto` (rebasada sobre la P0) |
| Frontend | este repo | la misma rama |
| Webhook | `GonzaloRamosEngineer/mp-supabase-webhook` | `feat/seguridad-reintegros-idempotencia` sobre `main` (`417587f`) |
| Edge Function `club-generar-canje` | este repo | la misma rama (solo textos) |

**Qué cambia** (detalle en `HISTORIAL.md` §15):
- una cuota cubre un mes, aunque el monto sea mayor;
- una donación suma al total y registra a la persona como donante, pero no da acceso,
  cuotas ni racha;
- reintegros y contracargos anulan el aporte sin borrarlo, y un reintegro parcial
  descuenta sólo lo devuelto;
- el beneficio web se habilita con acceso + 6 cuotas o $30.000;
- los 135 aportes manuales quedan sin clasificar.

**Adelantos:** el modelo los admite (`concepto = 'adelanto_cuotas'`, N cuotas), pero
**ninguna pantalla ni el formulario de la comisión los ofrece todavía**. Este despliegue
no habilita adelantos: los deja listos en la base.

---

## Orden, y por qué no se cambia

**1. Base → 2. Frontend → 3. Webhook → 4. Edge Function.**

En cada etapa intermedia conviven piezas viejas y nuevas. El orden garantiza que todas esas
combinaciones funcionen:

| Después de… | Front | Webhook | ¿Funciona? |
|---|---|---|---|
| 1 | viejo | viejo | Sí. El front viejo ignora la columna nueva `concepto` de `mi_acceso`. El webhook viejo hace select-then-insert y no manda `mp_actualizado_en`, así que la guarda de orden queda inactiva. Un reintegro igual anula, porque el webhook viejo manda `refunded` |
| 2 | nuevo | viejo | Sí. El front manda el token y el webhook viejo lo ignora; el front sigue mandando `user_id` en el body |
| 3 | nuevo | nuevo | Sí. El webhook exige el token para pausar, activar y cancelar, y el front ya lo manda. El upsert por `payment_id` necesita el UNIQUE de la etapa 1 |

**Al revés se rompe:**
- webhook antes que la base: el upsert falla sin el UNIQUE y **se pierden cobros**;
- webhook antes que el front: pausar, activar y cancelar dan 401 para todos.

**Ventana sin acceso (sólo etapa 1):** entre el paso 1.4 y el 1.6, las filas viejas tienen
`cuotas_cubiertas = 0` y **nadie tiene acceso**. Hoy afecta a una sola cuenta. Los pasos
1.4 a 1.6 se corren seguidos, en minutos.

---

## Antes de empezar

```bash
cd ~/Documents/dev/sitio-evolucion-antoniana
git fetch origin && git switch feat/cuotas-concepto
git log --oneline -1                        # el commit revisado
D=~/Documents/dev/BACKUPS/evolucion-antoniana
ls -l "$D/reclasificacion-2026-10-verificado.psql"   # -rw------- ; NO está en el repo
bash tools/db.sh check                      # OK · postgres · PostgreSQL 15.8
```

`reclasificacion-2026-10-verificado.psql` guarda **lo verificado en producción**: los 8
aportes automáticos con sus IDs, referencias, importes y períodos esperados, los 135
manuales y la cuenta de control. Está fuera del repo porque el repo es público y son IDs de
personas. Los scripts lo reciben antepuesto por la entrada estándar. Sin él, el pre
chequeo **falla**. Si entró un cobro real desde el 2026-10-16, el pre chequeo también falla
y nombra el aporte nuevo. En ese caso hay que actualizar el archivo y revisarlo de nuevo
antes de seguir.

---

## Etapa 1 — Base (migraciones + reclasificación histórica)

**1.1 Respaldo y foto**
```bash
bash tools/db.sh dump "$D/pre-cuotas-$(date +%F-%H%M).sql"          # datos de public
bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql > "$D/cuotas-foto-antes.txt"
bash tools/db.sh sql < supabase/data/p0_4_monitoreo.sql             # sin cobros en curso
```
✅ El dump no está vacío. La foto da los permisos de la P0 (anon y authenticated sólo con
`SELECT`). ❌ Si `ultima_escritura` es de minutos atrás, hay un aviso de Mercado Pago en
curso: esperar.

**1.2 Pre chequeo (sólo lectura)**
```bash
cat "$D/reclasificacion-2026-10-verificado.psql" supabase/data/precheck_reclasificacion_aportes_2026_10.sql | bash tools/db.sh sql
```
✅ `verificado_cargado = t`, `La reclasificación todavía no está instalada…` y
`PRE CHEQUEO OK: 8 aportes automáticos y 8 cobros verificados; 135 manuales…`.
❌ `PRE CHEQUEO FALLÓ` → **parar**. La salida dice qué no coincide.

**1.3 Ventana.** Desde acá hasta 1.6, sin pausas.

**1.4 Migración de esquema y reglas**
```bash
bash tools/db.sh apply supabase/migrations/20261016120000_cuotas_concepto_y_reintegros.sql 2>&1 | tee "$D/cuotas-mig1.txt"
```
✅ `Listo.` sin `ERROR`. Es una sola transacción. Re-aplica el cierre de la P0, que ya está,
sin cambios.

**1.5 Migración de la función de reclasificación** (sólo define, no toca datos)
```bash
bash tools/db.sh apply supabase/migrations/20261016120100_reclasificar_aportes_historicos.sql 2>&1 | tee "$D/cuotas-mig2.txt"
cat "$D/reclasificacion-2026-10-verificado.psql" supabase/data/precheck_reclasificacion_aportes_2026_10.sql | bash tools/db.sh sql | tee "$D/cuotas-precheck-2.txt"
```
✅ El pre chequeo ahora informa los 8 `CAMBIO ESPERADO`:

| Aporte | Cambio |
|---|---|
| Cuota del 2/9 | `cuota_mensual`, 1 cuota, período 2026-09-02 → 2026-10-01 |
| Cuota del 2/10 | `cuota_mensual`, 1 cuota, período 2026-10-02 → 2026-11-01 |
| Donación del 2/10 | `donacion_extraordinaria`, sin período |
| Las otras 5 | `donacion_extraordinaria`, sin cambios de período |

Termina con `PRE CHEQUEO OK`.

**1.6 Aplicar la reclasificación**
```bash
cat "$D/reclasificacion-2026-10-verificado.psql" supabase/data/aplicar_reclasificacion_aportes_2026_10.sql | bash tools/db.sh sql | tee "$D/cuotas-aplicar.txt"
```
Hace todo en una transacción:
1. bloquea `aportes` y `donations`;
2. repite el pre chequeo;
3. aplica, dejando el antes y el después de cada fila en `aportes_correcciones` (lote `2026-10-cuotas-v2`);
4. verifica que una segunda simulación no proponga nada;
5. verifica la cuenta de control;
6. valida el CHECK de períodos.

✅ `POST CHEQUEO OK: cuenta de control con 2 cuotas efectivas y $30000 acumulados; acceso=t`.
❌ Si falla, la transacción no deja nada aplicado, pero las migraciones 1.4 y 1.5 sí quedan,
así que la ventana sin acceso sigue abierta. Leer el motivo. Si es un cobro nuevo, actualizar
el archivo de lo verificado, volver a 1.5 (pre chequeo) y reintentar.

**1.7 Post chequeo**
```bash
bash tools/db.sh sql < supabase/data/p0_3_postcheck.sql        # la P0 sigue cerrada y el webhook escribe: 19 PASA
bash tools/db.sh sql < supabase/data/monitoreo_cuotas_2026_10.sql
bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql > "$D/cuotas-foto-despues.txt"
```
✅ En el monitoreo, estos cinco tienen que dar 0: `aprobadas_sin_aporte`, `periodos_de_un_dia`,
`donaciones_con_periodo`, `manuales_con_efecto` y `cuotas_sin_periodo_con_titular`. Las
huellas de `donations` y `memberships` no cambian. La de `aportes` sí cambia, y es lo esperado.

**Reversión de la etapa 1:**
- **Datos:** `bash tools/db.sh sql < supabase/data/revertir_reclasificacion_aportes_2026_10.sql`.
  Restaura cada fila exacta desde `aportes_correcciones`, sin borrar nada.
- **Lógica:** ⚠️ **no hay script.** Volver a las funciones anteriores implica reinstalar las
  versiones de `20260902180000`, `20260905120000`, `20260902160000` y `20260830180000`, y
  quitar los triggers nuevos. Si se quiere esa red antes de ejecutar, escribirla y ensayarla
  como paso previo.

---

## Etapa 2 — Frontend

```bash
git fetch origin && git switch master
git merge --ff-only feat/cuotas-concepto       # falla si master se movió
git push origin master                          # Vercel despliega
gh api repos/GonzaloRamosEngineer/sitio-evolucion-antoniana/commits/$(git rev-parse HEAD)/status --jq '.state'
curl -s -o /dev/null -L -w '%{http_code}\n' https://evolucionantoniana.com/
```
✅ `success` y `200`.

**Revisión manual, con sesión, en la cuenta de control:**
- `/carnet` muestra «Cuotas pagadas: 2 cuotas», «Total aportado: $30.000», vence el
  1 de noviembre y «Tu acceso viene de: Cuota mensual».
- En el historial del panel aparecen «Cuota mensual» ×2 y «Donación extraordinaria» ×1.
- Una cuenta que sólo donó ve el estado «Donante».

**Reversión:** en Vercel, *Promote* del deploy anterior. Después, revertir el merge en
`master`. El front viejo funciona con la base nueva.

---

## Etapa 3 — Webhook (repo `mp-supabase-webhook`)

```bash
cd ~/Documents/dev/mp-supabase-webhook
git fetch origin && git switch main
git merge --ff-only feat/seguridad-reintegros-idempotencia
git push origin main
```
Render despliega solo si el auto-deploy está activo. Si no, en el panel: *Manual Deploy →
Deploy latest commit*. **«Responde 200» no prueba que el deploy entró: hay que verificar la
versión.**
```bash
curl -s https://mp-supabase-webhook.onrender.com/health
```
✅ `"version":"2026-10-16.reintegros-auth"`, con `autentica_gestion_suscripciones`,
`user_id_desde_sesion`, `registra_reintegros_y_contracargos` y `guardado_idempotente` en
`true`, y `firma_modo: "rechaza"`.

**Prueba de humo** (no llega a Mercado Pago ni escribe nada):
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://mp-supabase-webhook.onrender.com/api/suscripciones/no-existe/pausar
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Authorization: Bearer token-invalido' https://mp-supabase-webhook.onrender.com/api/suscripciones/no-existe/pausar
```
✅ `401` y `401`. Antes de este deploy, cualquiera podía pausar o cancelar la suscripción de
otra persona sabiendo su id.

**Revisión manual, con sesión:** pausar y reanudar la propia suscripción desde el panel
funciona.

**Reversión:** redeploy de `417587f` en Render. Es compatible con la base nueva.

---

## Etapa 4 — Edge Function `club-generar-canje`

```bash
cd ~/Documents/dev/sitio-evolucion-antoniana
supabase functions deploy club-generar-canje --project-ref lbtyxnbyetsvngsxczkt
```
Sólo cambian los textos: «cuotas» en lugar de «meses». La regla y la firma de
`elegibilidad_club` no cambian, así que no es urgente.

---

## Monitoreo

| Cuándo | Qué |
|---|---|
| Al terminar, +24 h, +72 h | `monitoreo_cuotas_2026_10.sql`: los cinco contadores en 0 |
| Próximo cobro real (renovación ≈ 2/11) | fila nueva arriba: `cuota_mensual`, 1 cuota, ~30 días; nada de períodos de un día |
| Mismo cobro, en los logs de Render | `🔍 Respuesta MP (payment)`: confirmar de qué campo sale el id del preapproval (`metadata.preapproval_id`, `point_of_interaction…subscription_id` o `subscription_id`) y que se vea `✅ Suscripción actualizada con el último cobro` |

---

## Pendientes conocidos, fuera de este despliegue

- El SELECT de `anon` sobre `donations` (revisión aparte, ver P0).
- Datos personales que **ya estaban publicados en `master`** antes de este trabajo: el email
  del dueño en `src/lib/persona.js`, `persona.test.js` y `HISTORIAL.md`, y una referencia de
  pago real en `supabase/migrations/20260902180000_*`, `supabase/data/reclasificar_renovaciones.sql`
  y `HISTORIAL.md`. Esta rama no agrega ninguno.
- Los 135 aportes manuales esperan clasificación individual.
- La reversión de lógica de la etapa 1 (ver arriba).
