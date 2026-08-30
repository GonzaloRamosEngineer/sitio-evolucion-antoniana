-- =====================================================================
-- BACKFILL de `aportes` desde `memberships` y `donations`
-- (ROADMAP §10.3 — "no la subestimes")
--
-- NO ES UNA MIGRACIÓN y por eso vive acá: depende de una decisión de negocio
-- (desde qué fecha se reconoce antigüedad) y no debe correr sola en un
-- `db push`. Se ejecuta a mano, una vez, mirando el resultado.
--
-- ⚠️ LÍMITE HONESTO DE LO QUE SE PUEDE RECONSTRUIR
-- `memberships` no guarda historial de pagos: tiene `last_payment_id` y
-- `next_charge_date`, no una fila por cobro. Así que de una suscripción activa
-- desde 2023 **no se puede derivar cuántas veces pagó**. Este script genera UN
-- aporte por membresía activa, cubriendo desde su alta hasta su próximo cobro.
-- Eso alcanza para que el acceso quede vigente y para no perder la fecha de
-- alta, pero la antigüedad detallada de quien pausó y retomó NO se recupera
-- (10.3). De acá en adelante el webhook de pagos escribe un aporte por cobro y
-- el problema no se repite.
--
-- Idempotente: no duplica si ya existe el aporte de esa membresía/donación.
-- Corré primero el bloque de verificación del final.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Membresías activas → un aporte de tipo cuota
-- ---------------------------------------------------------------------
-- `payment_id` se copia a propósito: si el webhook vuelve a informar ese mismo
-- cobro, el trigger `trg_registrar_aporte_cuota` lo reconoce como ya
-- registrado y no duplica el período.
INSERT INTO public.aportes
  (user_id, tipo, monto, fecha, membership_id, payment_id, acceso_desde, acceso_hasta,
   email_aportante, observaciones)
SELECT
  m.user_id,
  'cuota',
  m.amount,
  m.created_at,
  m.id,
  m.last_payment_id,
  m.created_at::date,
  COALESCE(m.next_charge_date, (m.created_at + interval '1 month')::date),
  m.payer_email,
  'Backfill 2026-08-30 desde memberships. Cubre un período; el historial previo no es reconstruible (ver cabecera del script).'
FROM public.memberships m
WHERE m.status = 'active'
  AND m.amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.aportes a WHERE a.membership_id = m.id
  );

-- ---------------------------------------------------------------------
-- 2) Donaciones aprobadas → un aporte de tipo donacion
--
-- La conversión NO se escribe acá: se usa `meses_por_donacion()`, la misma
-- función que usa el trigger. Si estuviera duplicada, el día que cambie la
-- regla el backfill y el trigger dirían cosas distintas.
-- Devuelve 0 por debajo del piso (= el precio de la cuota, decisión D3): esas
-- donaciones se agradecen pero no otorgan acceso, así que no generan aporte.
-- ---------------------------------------------------------------------
INSERT INTO public.aportes
  (user_id, tipo, monto, fecha, donation_id, payment_id, acceso_desde, acceso_hasta,
   observaciones)
SELECT
  d.user_id,
  'donacion',
  d.amount,
  d.created_at,
  d.id,
  d.payment_id,
  d.created_at::date,
  (d.created_at + (public.meses_por_donacion(d.amount) * interval '1 month'))::date,
  format('Backfill 2026-08-30 desde donations (%s meses, ROADMAP 10.4.1).',
         public.meses_por_donacion(d.amount))
FROM public.donations d
WHERE d.status = 'approved'
  AND public.meses_por_donacion(d.amount) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.aportes a WHERE a.donation_id = d.id
  );

-- ---------------------------------------------------------------------
-- 3) Verificación — mirar ESTO antes del COMMIT
-- ---------------------------------------------------------------------
SELECT tipo, count(*) AS filas, min(acceso_desde) AS desde, max(acceso_hasta) AS hasta
  FROM public.aportes
 GROUP BY tipo;

SELECT count(*) AS aportes_sin_usuario
  FROM public.aportes WHERE user_id IS NULL;

SELECT count(*) AS con_acceso_vigente
  FROM public.aportes WHERE acceso_hasta >= current_date;

-- Donaciones aprobadas que NO otorgaron acceso por estar debajo del piso.
-- No es un error: es la decisión D3. Se listan para que el número no sorprenda.
SELECT count(*) AS donaciones_bajo_el_piso
  FROM public.donations d
 WHERE d.status = 'approved'
   AND public.meses_por_donacion(d.amount) = 0;

-- Si algo no cuadra: ROLLBACK;
COMMIT;
