# ⛔ NO APLICAR — migraciones a rehacer

Estas dos migraciones se escribieron el 2026-08-30 contra el esquema **versionado
en el repo**, y ese esquema **no es el que está en producción**.

Al conectarse a la base productiva apareció que ya existe un módulo de aportes
completo, hecho, que el repo no documenta:

- `aportes` (5 filas, con `destino_id`, `origen`, `referencia_externa`, `notas`)
- `destinos` (11 filas: campañas con meta, recaudado y rendición)
- `gastos` (rendición de cuentas con comprobantes)
- `email_log`
- funciones `aporte_desde_donacion()`, `destino_por_defecto()`,
  `recalcular_totales_destino()`, `recalcular_rendicion_destino()`,
  `trg_aportes_totales()`, `trg_gastos_totales()`, `handle_email_confirmed()`
- triggers `trg_aporte_desde_donacion`, `trg_aportes_totales`, `trg_gastos_totales`
- policies RLS propias sobre `aportes`

Estas migraciones asumen un `aportes` con `tipo`, `payment_id` y `observaciones`.
El real usa `origen`, `referencia_externa` y `notas`, y tiene `destino_id NOT NULL`.
`CREATE TABLE IF NOT EXISTS` **no falla**: saltea la tabla existente en silencio y
después revienta —o peor, le agrega columnas sueltas a una tabla ajena.

Están acá, fuera de `supabase/migrations/*.sql`, para que ningún `db push` las
levante. Se reescriben contra el esquema real, después de re-baselinar el repo.

Ver ROADMAP §10.7.
