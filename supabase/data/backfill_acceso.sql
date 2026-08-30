-- =====================================================================
-- BACKFILL del ACCESO sobre aportes que ya estaban en el libro
--
-- NO ES UNA MIGRACIÓN y por eso vive acá: toca datos históricos y hay que
-- mirarlo antes de confirmarlo. Se ejecuta a mano, una vez.
--
-- Los triggers (`aporte_desde_donacion`, `aporte_desde_membresia`) completan
-- `acceso_desde`/`acceso_hasta` **de acá en adelante**. Los aportes que ya
-- estaban en el libro cuando se aplicó la capa de acceso los tienen en NULL.
--
-- ⚠️ DECISIÓN IMPORTANTE: el acceso se cuenta desde la fecha del aporte, NO
-- desde hoy. Usar `proximo_acceso_desde()` acá sería un error caro: le daría
-- acceso vigente HOY a alguien que donó hace ocho meses. El backfill reconstruye
-- historia, no regala meses.
--
-- Idempotente: solo toca filas con acceso en NULL, y solo las que corresponden.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Aportes de donación: conversión proporcional desde su propia fecha
-- ---------------------------------------------------------------------
UPDATE public.aportes a
   SET acceso_desde = a.fecha::date,
       acceso_hasta = (a.fecha + (public.meses_por_donacion(a.monto) * interval '1 month'))::date,
       notas = coalesce(a.notas, '') || ' [Backfill 2026-08-30: '
               || public.meses_por_donacion(a.monto) || ' mes(es) de acceso desde la fecha del aporte.]'
 WHERE a.origen = 'donacion'
   AND a.acceso_desde IS NULL
   AND a.user_id IS NOT NULL                       -- sin persona no hay a quién habilitar
   AND public.meses_por_donacion(a.monto) > 0      -- por debajo del piso no otorga acceso
   AND public.destino_otorga_acceso(a.destino_id);

-- ---------------------------------------------------------------------
-- 2) Aportes de membresía: un período mensual desde su fecha
--
-- No se puede hacer mejor: `memberships` no guarda historial de cobros (tiene
-- `last_payment_id`, no una fila por pago), así que de una suscripción vieja no
-- se puede derivar cuántas veces pagó. De acá en adelante el trigger escribe un
-- aporte por cobro y el problema no se repite.
-- ---------------------------------------------------------------------
UPDATE public.aportes a
   SET acceso_desde = a.fecha::date,
       acceso_hasta = (a.fecha + interval '1 month')::date,
       notas = coalesce(a.notas, '') || ' [Backfill 2026-08-30: un período mensual desde la fecha del aporte.]'
 WHERE a.origen = 'membresia'
   AND a.acceso_desde IS NULL
   AND a.user_id IS NOT NULL
   AND public.destino_otorga_acceso(a.destino_id);

-- ---------------------------------------------------------------------
-- 3) Membresías activas que nunca entraron al libro
--
-- El trigger de membresías se creó el 2026-08-30 y solo dispara con cobros
-- nuevos. Una suscripción que ya estaba activa nunca generó su aporte.
-- ---------------------------------------------------------------------
INSERT INTO public.aportes
  (user_id, monto, fecha, destino_id, origen, membership_id, referencia_externa,
   acceso_desde, acceso_hasta, email_aportante, notas)
SELECT
  m.user_id, m.amount, m.created_at,
  COALESCE(m.destino_id, public.destino_por_defecto()),
  'membresia', m.id,
  COALESCE(NULLIF(m.last_payment_id, ''), 'membresia:' || m.id::text || ':backfill'),
  m.created_at::date,
  COALESCE(m.next_charge_date, (m.created_at + interval '1 month')::date),
  m.payer_email,
  'Backfill 2026-08-30: membresía activa previa al trigger.'
FROM public.memberships m
WHERE m.status = 'active'
  AND m.amount > 0
  AND m.user_id IS NOT NULL
  AND public.destino_por_defecto() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.aportes a WHERE a.membership_id = m.id);

-- ---------------------------------------------------------------------
-- 4) Verificación — mirar ESTO antes del COMMIT
-- ---------------------------------------------------------------------
SELECT origen,
       count(*) AS aportes,
       count(*) FILTER (WHERE acceso_desde IS NOT NULL) AS con_acceso,
       count(*) FILTER (WHERE acceso_hasta >= current_date) AS vigentes_hoy
  FROM public.aportes
 GROUP BY origen ORDER BY origen;

-- Personas que quedan con acceso vigente. Si este número sorprende, ROLLBACK.
SELECT count(DISTINCT user_id) AS personas_con_acceso_vigente
  FROM public.aportes WHERE acceso_hasta >= current_date;

-- Aportes que siguen sin acceso, y por qué. No es un error: es la regla.
SELECT 'sin persona'          AS motivo, count(*) FROM public.aportes WHERE acceso_desde IS NULL AND user_id IS NULL
UNION ALL
SELECT 'debajo del piso',     count(*) FROM public.aportes WHERE acceso_desde IS NULL AND user_id IS NOT NULL AND origen='donacion' AND public.meses_por_donacion(monto)=0
UNION ALL
SELECT 'destino sin acceso',  count(*) FROM public.aportes WHERE acceso_desde IS NULL AND NOT public.destino_otorga_acceso(destino_id);

-- Si algo no cuadra: ROLLBACK;
COMMIT;
