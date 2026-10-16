-- =====================================================================
-- P0 · paso 5 — MONITOREO desde la base (solo lectura)
--
-- Uso:  tools/db.sh sql < supabase/data/p0_4_monitoreo.sql
--
-- Complementa los logs del webhook en Render, no los reemplaza: si el webhook
-- no pudiera escribir, acá NO aparecería nada nuevo, y el error estaría solo
-- en Render («❌ Guardar pago», «permission denied», «42501»).
--
-- Qué mirar: después de un cobro real (el próximo débito de una suscripción,
-- o una donación de prueba con el checkout del sitio), `ultima_escritura` de
-- donations tiene que avanzar y la fila nueva tiene que tener su aporte.
-- No imprime datos de personas.
-- =====================================================================
BEGIN TRANSACTION READ ONLY;
\pset footer off

SELECT now() AS consultado_en;

SELECT 'donations' AS tabla, count(*) AS filas, max(created_at) AS ultimo_alta, max(updated_at) AS ultima_escritura,
       count(*) FILTER (WHERE updated_at > now() - interval '24 hours') AS escritas_24h,
       count(*) FILTER (WHERE updated_at > now() - interval '7 days')   AS escritas_7d
  FROM public.donations
UNION ALL
SELECT 'memberships', count(*), max(created_at), max(updated_at),
       count(*) FILTER (WHERE updated_at > now() - interval '24 hours'),
       count(*) FILTER (WHERE updated_at > now() - interval '7 days')
  FROM public.memberships;

-- Los últimos 10 movimientos que escribió el webhook, sin datos personales.
SELECT d.updated_at AS escrita, d.created_at AS cobro, d.status, d.donation_type AS tipo, d.amount AS monto,
       (d.user_id IS NOT NULL) AS con_titular,
       EXISTS (SELECT 1 FROM public.aportes a WHERE a.donation_id = d.id) AS tiene_aporte
  FROM public.donations d
 ORDER BY d.updated_at DESC
 LIMIT 10;

-- Un cobro aprobado sin aporte sería un renglón perdido del libro.
SELECT count(*) AS aprobadas_sin_aporte
  FROM public.donations d
 WHERE d.status = 'approved' AND COALESCE(d.amount, 0) > 0
   AND NOT EXISTS (SELECT 1 FROM public.aportes a WHERE a.donation_id = d.id);

ROLLBACK;
