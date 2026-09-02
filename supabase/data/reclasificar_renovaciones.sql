-- =====================================================================
-- RECLASIFICAR las renovaciones que YA entraron al libro como donación
--
-- NO ES UNA MIGRACIÓN y por eso vive acá: toca datos históricos y hay que
-- mirarlo antes de confirmarlo. Se ejecuta a mano, una vez.
--
-- `20260902180000_renovacion_es_cuota_no_donacion.sql` arregla el código:
-- de acá en adelante, cada cobro recurrente entra como cuota. Pero las
-- filas que YA están en el libro no se arreglan solas, porque el trigger
-- de la membresía solo corre cuando `last_payment_id` CAMBIA — y en la
-- fila afectada ya está escrito.
--
-- Al 2026-09-02 la fila afectada es UNA: la primera cuota real del
-- proyecto (`payment_id` 175967372005, $5.000, del 2026-09-02). Ese socio
-- estaba sin los 30 días de gracia que §10.17 decidió darle.
--
-- ---------------------------------------------------------------------
-- POR QUÉ NO SE HARDCODEA ESE ID
-- ---------------------------------------------------------------------
-- Se reclasifica por REGLA y no por id, y la regla es la conjunción de
-- tres hechos independientes que tienen que decir lo mismo:
--
--   1. el aporte sigue siendo `origen='donacion'` sin membresía ligada
--   2. su `referencia_externa` es el `last_payment_id` de una membresía
--   3. la donación de la que nació dice `donation_type = 'suscripción'`
--
-- Con los tres, la fila es inequívocamente una cuota. Con dos, no: (2)
-- sola alcanzaría para reclasificar una donación puntual que por
-- casualidad comparta el id, y (3) sola no dice CUÁL membresía es.
--
-- ⚠️ El punto (1) es además lo que hace esto IDEMPOTENTE y lo que deja
-- sobrevivir cualquier corrección hecha a mano por la comisión: una fila
-- que ya se pasó a `manual` no entra en la regla. Es la misma decisión
-- que el `WHERE` del `ON CONFLICT` en la migración.
--
-- ⚠️ Y `acceso_hasta` NO se toca. La tentación era recalcularlo a
-- `next_charge_date`, pero `next_charge_date` se MUEVE con cada cobro:
-- reclasificar dentro de un mes usaría la fecha del cobro siguiente y le
-- estiraría el acceso un mes de regalo. Acortar el período de alguien que
-- ya lo tiene otorgado también sería injusto — el error fue nuestro. La
-- fila afectada hoy tiene `acceso_hasta = 2026-10-02`, que coincide con
-- su próximo cobro, así que no hay nada que corregir. Lo único que
-- cambia, y es el punto, es que **ahora le corresponde la gracia.**
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) ANTES: qué se va a tocar, y qué acceso tiene hoy cada uno
-- ---------------------------------------------------------------------
\echo ''
\echo '=== ANTES: renovaciones mal clasificadas ==='
SELECT a.id, a.user_id, a.monto, a.origen, a.referencia_externa,
       a.acceso_desde, a.acceso_hasta,
       (SELECT en_gracia FROM public.acceso_vigente(a.user_id)) AS tiene_gracia_hoy
  FROM public.aportes a
  JOIN public.memberships m ON m.last_payment_id = a.referencia_externa
  JOIN public.donations   d ON d.id = a.donation_id
 WHERE a.origen = 'donacion'
   AND a.membership_id IS NULL
   AND lower(coalesce(d.donation_type, '')) IN ('suscripción', 'suscripcion')
 ORDER BY a.fecha;

-- ---------------------------------------------------------------------
-- 2) La reclasificación
-- ---------------------------------------------------------------------
-- El subselect de `membership_id` no puede devolver dos filas: si dos
-- membresías compartieran `last_payment_id`, esto abortaría con
-- "more than one row returned by a subquery" y no elegiría ninguna al
-- azar. Es a propósito: escribir el cobro de una persona en la
-- suscripción de otra es peor que no reclasificar (§10.16).
UPDATE public.aportes a
   SET origen        = 'membresia',
       membership_id = (SELECT m.id FROM public.memberships m
                         WHERE m.last_payment_id = a.referencia_externa),
       email_aportante = coalesce(
                           a.email_aportante,
                           (SELECT m.payer_email FROM public.memberships m
                             WHERE m.last_payment_id = a.referencia_externa)),
       notas = coalesce(a.notas, '') || ' [Reclasificado 2026-09-02: es la cuota de una'
               || ' suscripcion, no una donacion puntual. Aterrizo en donations por la regla'
               || ' de oro del webhook. Le corresponden los 30 dias de gracia.]'
 WHERE a.origen = 'donacion'
   AND a.membership_id IS NULL
   AND EXISTS (SELECT 1 FROM public.memberships m
                WHERE m.last_payment_id = a.referencia_externa)
   AND EXISTS (SELECT 1 FROM public.donations d
                WHERE d.id = a.donation_id
                  AND lower(coalesce(d.donation_type, '')) IN ('suscripción', 'suscripcion'));

-- ---------------------------------------------------------------------
-- 3) DESPUÉS: la verificación que importa no es "el origen dice cuota"
--    sino "el socio tiene la gracia". Es la consecuencia, no la etiqueta.
-- ---------------------------------------------------------------------
\echo ''
\echo '=== DESPUES: esperado origen=membresia, con las DOS referencias ==='
SELECT a.id, a.monto, a.origen,
       a.donation_id   IS NOT NULL AS conserva_donacion,
       a.membership_id IS NOT NULL AS liga_membresia,
       a.acceso_desde, a.acceso_hasta
  FROM public.aportes a
 WHERE a.origen = 'membresia' AND a.donation_id IS NOT NULL
 ORDER BY a.fecha;

\echo ''
\echo '=== La consecuencia: el acceso de cada socio de cuota ==='
SELECT u.email, av.tiene_acceso, av.vence_el, av.origen, av.en_gracia
  FROM public.aportes a
  JOIN public.users u ON u.id = a.user_id
  CROSS JOIN LATERAL public.acceso_vigente(a.user_id) av
 WHERE a.origen = 'membresia'
 GROUP BY u.email, av.tiene_acceso, av.vence_el, av.origen, av.en_gracia;

\echo ''
\echo '=== Control: no debe quedar NINGUNA renovacion sin reclasificar (esperado 0) ==='
SELECT count(*) AS renovaciones_pendientes
  FROM public.aportes a
  JOIN public.memberships m ON m.last_payment_id = a.referencia_externa
  JOIN public.donations   d ON d.id = a.donation_id
 WHERE a.origen = 'donacion'
   AND a.membership_id IS NULL
   AND lower(coalesce(d.donation_type, '')) IN ('suscripción', 'suscripcion');

\echo ''
\echo '=== Control de que NO se toco de mas: el libro tiene que dar lo mismo ==='
\echo '    (6 aportes, $12.241 — si cambio, algo se duplico o se perdio)'
SELECT count(*) AS aportes, sum(monto) AS total FROM public.aportes;

-- Si algo no cuadra: ROLLBACK;
COMMIT;
