# Procedimiento — aplicar la migración P0 (cierre de escritura de pagos)

**Migración:** `supabase/migrations/20261016110000_p0_cerrar_escritura_pagos.sql`
**Rama:** `fix/p0-escritura-pagos` (aislada: sin cuotas, frontend, webhook ni datos históricos).
**Qué cierra:** cualquier sesión del sitio podía insertarse una donación `approved` (o una
membresía activa con cobro) y el trigger le daba acceso y monto acumulado; `anon` podía
insertar donaciones anónimas aprobadas. Revoca toda escritura de `anon`/`authenticated`
sobre `donations` y `memberships` y conserva la del webhook (`service_role`).

> ⚠️ **No modifica el SELECT actual de `anon` sobre `donations`** (ni sobre `memberships`).
> anon conserva ese GRANT; la policy `donations_admin_select_all` hoy le devuelve **0 filas**
> (verificado en producción el 2026-10-16). Si hay que revocarlo, se decide en una
> **revisión separada**. El pre y el post chequeo lo informan para que quede a la vista.

---

## Antes de empezar

| | |
|---|---|
| Docker | encendido (`tools/db.sh` usa la imagen de Postgres como cliente) |
| Credenciales | `.env.db` en la raíz del repo (nunca se imprime) |
| Código | `git switch fix/p0-escritura-pagos` — incluye el arreglo de `tools/db.sh` para el bash de macOS |
| Invocación | **`bash tools/db.sh …`** — el archivo no tiene permiso de ejecución en el repo |
| Destino de respaldos | **fuera del repo** (el repo es público): `D=~/Documents/dev/BACKUPS/evolucion-antoniana` |
| Duración | segundos. La migración corre en una sola transacción |

**Por qué `tools/db.sh apply` y no `supabase db push`:** en producción **no existe**
`supabase_migrations.schema_migrations` (verificado el 2026-10-16). `db push` creería que
no se aplicó ninguna y correría las 33. `tools/db.sh apply` aplica **un solo archivo** de
`supabase/migrations/`, con `psql -1 -v ON_ERROR_STOP=1`: todo o nada.

Referencia tomada al preparar este procedimiento (solo lectura, 2026-10-16):
`$D/p0-foto-referencia-2026-10-16.txt` — huellas `donations 8 · memberships 18 · aportes 143`.

---

## Pasos

### 0. Conexión
```bash
bash tools/db.sh check
```
✅ `OK · postgres · PostgreSQL 15.8` · ❌ cualquier otra cosa → no seguir.

### 1. Respaldo y foto del estado previo
```bash
bash tools/db.sh dump "$D/pre-p0-$(date +%F-%H%M).sql"
grep -c 'COPY public\.\(donations\|memberships\)' "$D"/pre-p0-*.sql        # tiene que dar 2
bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql > "$D/p0-foto-antes.txt"
```
- El **dump** guarda los datos del schema `public` (lleva datos personales: nunca dentro del
  repo; el script se niega). Se genera con `--no-privileges`, así que **no** guarda permisos.
- La **foto** es la referencia de permisos, ACL cruda y policies, más una huella md5 de los
  datos. Comparar con la referencia: la parte de permisos y policies tiene que ser
  idéntica. Si no lo es, alguien cambió algo: **parar y revisar**.

### 2. Pre chequeo (solo lectura)
```bash
bash tools/db.sh sql < supabase/data/p0_2_precheck.sql
```
✅ `ESTADO · escritura abierta: 9 permisos … La migración los cierra.` + `PRE CHEQUEO OK`
(o `ESTADO · la migración P0 YA está aplicada`, si se re-corre).
❌ `PRE CHEQUEO FALLÓ` → **no aplicar**. Dice el motivo (RLS apagada, service_role sin
permisos, una policy de escritura no contemplada…).

### 3. Aplicar
```bash
bash tools/db.sh apply supabase/migrations/20261016110000_p0_cerrar_escritura_pagos.sql 2>&1 | tee "$D/p0-aplicar.txt"
```
✅ Las líneas `PRE · …`, después `POST CHEQUEO OK: …` y `Listo.`
❌ `POST CHEQUEO FALLÓ` o cualquier `ERROR` → la transacción se revirtió sola y la base quedó
como estaba. Repetir el paso 2 para confirmarlo y revisar antes de reintentar.

### 4. Post chequeo funcional
```bash
bash tools/db.sh sql < supabase/data/p0_3_postcheck.sql | tee "$D/p0-postcheck.txt"
```
Corre en **una transacción que termina en ROLLBACK** (no deja nada escrito) y prueba con
los roles reales:

| | Esperado |
|---|---|
| A1–A5 catálogo | sin escritura para anon/authenticated; service_role con INSERT/UPDATE; authenticated con SELECT; anon conserva su SELECT |
| B1–B7 una sesión real (y anon) intenta escribir | rechazado **por permisos** (42501) |
| C1 esa sesión lee su historial | ve exactamente lo que le corresponde |
| D1–D5 el webhook (`service_role`) registra un pago y una suscripción | se ejecuta |

✅ 19 líneas `PASA`, `POST CHEQUEO OK` y `residuo = 0`.
❌ Si falla **D** (el webhook no puede escribir): ir a **Reversión de emergencia**.
❌ Si falla **B**: la escritura sigue abierta. Re-aplicar el paso 3 y revisar.

> ⚠️ El paso 4 se corre **solo después** del 3. Antes, los intentos de la sección B se
> ejecutarían (es el agujero) y se desharían con el ROLLBACK, pero no hay motivo para hacerlo.

### 5. Foto de después
```bash
bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql > "$D/p0-foto-despues.txt"
diff "$D/p0-foto-antes.txt" "$D/p0-foto-despues.txt"
```
✅ Lo único distinto: los permisos de `anon`/`authenticated`, que quedan en `SELECT`; la ACL,
con `anon=r` y `authenticated=r`; y las dos policies `Insert …`, que desaparecen. **Las
huellas de datos tienen que ser idénticas.** Si una cambió, `ultima_escritura` dice si entró
un cobro real en el medio. Si no entró ninguno, investigar.

### 6. El webhook sigue en pie
```bash
curl -s https://mp-supabase-webhook.onrender.com/health
```
✅ `"ok":true` con la versión desplegada hoy (`2026-08-31.consulta-mp`). Esta migración no
requiere desplegar el webhook.

---

## Monitoreo

El webhook escribe con `service_role`, que no depende de estos permisos: el código lo usa
(`SUPABASE_SERVICE_ROLE_KEY`), y los datos lo confirman. Hay donaciones con titular y
actualizaciones de `memberships.last_payment_id`, y ninguna de las dos operaciones le estaba
permitida a anon o authenticated. Igual se vigila:

| Cuándo | Qué |
|---|---|
| Al terminar, +24 h, +72 h | `bash tools/db.sh sql < supabase/data/p0_4_monitoreo.sql` → `aprobadas_sin_aporte = 0` |
| Render → servicio `mp-supabase-webhook` → **Logs**, misma ventana | buscar `❌ Guardar pago`, `❌ Update membership`, `❌ Insert membership`, `permission denied`, `42501`. **Esperado: ninguno** |
| Próximo cobro real (renovación mensual ≈ 2/11, o una donación por el checkout) | en Render, `✅ Pago registrado`; en la base, la fila nueva arriba de `p0_4_monitoreo.sql` con `tiene_aporte = t` |

Si se quiere la prueba de punta a punta antes del 2/11, la única forma real es un cobro
real (una donación chica por el checkout del sitio). Es decisión de la Fundación.

---

## Reversión de emergencia

`supabase/data/p0_9_revertir_permisos_EMERGENCIA.sql` reconstruye **exactamente** los
permisos y las policies de la foto del paso 1. Está ensayado: la foto después de revertir
es idéntica a la de antes.

**Reabre el agujero.** Correrlo solo si, después de aplicar, el webhook no puede registrar
cobros (falla **D** del paso 4, o aparece `permission denied`/`42501` en Render). Antes,
revisar en Render que `SUPABASE_SERVICE_ROLE_KEY` sea la key **service_role** y no la anon.
Si la key está bien, revertir no arregla nada, porque service_role no depende de estos permisos.

```bash
bash tools/db.sh sql < supabase/data/p0_9_revertir_permisos_EMERGENCIA.sql
bash tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql > "$D/p0-foto-revertido.txt"
diff "$D/p0-foto-antes.txt" "$D/p0-foto-revertido.txt"      # permisos y policies idénticos
```

---

## Después

1. Anotar en `HISTORIAL.md` la fecha, la salida de los pasos 3 y 4 y las huellas de los
   pasos 1 y 5 (las huellas no tienen datos personales; el dump no va al repo).
2. Mergear `fix/p0-escritura-pagos` a `master` **cuando se autorice**. El push dispara un
   deploy de Vercel: la rama no cambia código de la app (agrega una migración, scripts,
   un test y documentación), así que el sitio desplegado queda igual.
3. La rama de cuotas (`feat/cuotas-concepto`) repite este cierre en su migración: con P0
   ya aplicada, esa parte no cambia nada. Rebasarla sobre esta rama antes de revisarla.

## Ensayo

El procedimiento completo, del paso 1 al 5, más la re-aplicación, el monitoreo y la
reversión, se ensayó el 2026-10-16 sobre Postgres 15.8 descartable con datos sembrados. Una
cuenta admin con donaciones y una común:
- **Control:** el post chequeo antes de migrar da FALLA en A1, A2 y B1–B7. La escritura
  estaba abierta.
- **Después de aplicar:** 19/19 PASA y `residuo 0`. Las huellas de datos son idénticas
  antes y después.
- **Re-aplicación:** sin cambios.
- **Reversión:** la foto queda igual a la de antes.

Contra producción solo se corrieron los pasos de lectura: 0 (check), 2 (pre chequeo OK) y
la foto de referencia.
