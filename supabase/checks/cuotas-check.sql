-- =====================================================================
-- CUOTAS, DONACIONES, REINTEGROS Y SEGURIDAD (20261016120000)
--
-- Los casos de aceptación de la regla 2026-10 contra un Postgres real:
-- una cuota cubre un mes, una donación suma pero no da cuotas ni acceso, los
-- reintegros y contracargos anulan sin borrar, y nadie se autoconcede acceso.
--
-- Cada caso usa SU persona: `periodo_cuota()` encadena por persona y un caso
-- no puede depender de otro. Todo corre en UNA transacción que termina en
-- ROLLBACK: no deja nada en la base.
--
-- Leer el resultado: ninguna línea FALLA, y contar los PASA (ver README).
-- =====================================================================
\set ON_ERROR_STOP off
\pset pager off
SET client_min_messages = notice;

BEGIN;

CREATE FUNCTION pg_temp.chk(p_ok boolean, p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(p_ok, false) THEN RAISE NOTICE 'PASA  · %', p_msg;
  ELSE RAISE NOTICE 'FALLA · %', p_msg; END IF;
END $$;

-- Lo que hace el webhook: upsert por payment_id con TODOS los campos que manda.
CREATE FUNCTION pg_temp.pago(p_id text, p_user uuid, p_monto numeric, p_tipo text,
                             p_creado timestamptz, p_status text DEFAULT 'approved',
                             p_reint numeric DEFAULT 0, p_act timestamptz DEFAULT now(),
                             p_email text DEFAULT NULL) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.donations (user_id, amount, donation_type, payment_provider, payment_id, status,
                                created_at, mp_status, monto_reintegrado, mp_actualizado_en, payer_email)
  VALUES (p_user, p_monto, p_tipo, 'mercadopago', p_id, p_status, p_creado, p_status, p_reint, p_act, p_email)
  ON CONFLICT (payment_id) DO UPDATE
     SET status = EXCLUDED.status, mp_status = EXCLUDED.mp_status, amount = EXCLUDED.amount,
         monto_reintegrado = EXCLUDED.monto_reintegrado, mp_actualizado_en = EXCLUDED.mp_actualizado_en,
         updated_at = now();
$$;

CREATE FUNCTION pg_temp.ap(p_ref text) RETURNS public.aportes LANGUAGE sql AS $$
  SELECT * FROM public.aportes WHERE referencia_externa = p_ref;
$$;

CREATE FUNCTION pg_temp.u(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('c0a00000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

INSERT INTO auth.users (id, email, created_at, email_confirmed_at, raw_user_meta_data)
SELECT pg_temp.u(n), format('zz-cuotas-%s@test.com', n), now(), now(),
       jsonb_build_object('name', 'ZZ Cuotas ' || n)
  FROM generate_series(1, 20) n;

ALTER TABLE public.users DISABLE TRIGGER trg_prevent_privilege_escalation;
UPDATE public.users SET role = 'comision_directiva' WHERE id = pg_temp.u(17);
ALTER TABLE public.users ENABLE TRIGGER trg_prevent_privilege_escalation;

\echo ''
\echo '=== C1 · una cuota de $5.000 cubre un mes (2/9 -> 1/10, no un día más) ==='
SELECT pg_temp.pago('ZZC1', pg_temp.u(1), 5000, 'suscripción', now() - interval '5 days');
DO $$
DECLARE a public.aportes := pg_temp.ap('ZZC1'); v record; t record;
BEGIN
  SELECT * INTO v FROM public.acceso_vigente(pg_temp.u(1));
  SELECT * INTO t FROM public.antiguedad_socio(pg_temp.u(1));
  PERFORM pg_temp.chk(a.concepto = 'cuota_mensual' AND a.cuotas_cubiertas = 1, 'C1 concepto cuota_mensual, 1 cuota');
  PERFORM pg_temp.chk(a.acceso_desde = public.fecha_local(now() - interval '5 days')
                      AND a.acceso_hasta = (a.acceso_desde + interval '1 month' - interval '1 day')::date,
                      format('C1 período de un mes menos un día [%s..%s]', a.acceso_desde, a.acceso_hasta));
  PERFORM pg_temp.chk(v.tiene_acceso AND v.concepto = 'cuota_mensual', 'C1 acceso vigente, concepto informado');
  PERFORM pg_temp.chk(t.meses_aportados = 1 AND t.racha_meses = 1, format('C1 1 cuota y racha 1 (%s/%s)', t.meses_aportados, t.racha_meses));
END $$;

\echo ''
\echo '=== C2 · una cuota de $50.000 sigue cubriendo UN mes ==='
SELECT pg_temp.pago('ZZC2', pg_temp.u(2), 50000, 'suscripción', now() - interval '2 days');
DO $$
DECLARE a public.aportes := pg_temp.ap('ZZC2'); e record;
BEGIN
  SELECT * INTO e FROM public.elegibilidad_club(pg_temp.u(2));
  PERFORM pg_temp.chk(a.cuotas_cubiertas = 1
                      AND a.acceso_hasta = (a.acceso_desde + interval '1 month' - interval '1 day')::date,
                      'C2 1 cuota y un mes, aunque el monto sea 10 veces la cuota');
  PERFORM pg_temp.chk(e.meses_aportados = 1 AND e.aporte_acumulado = 50000, 'C2 suma $50.000 al total');
END $$;

\echo ''
\echo '=== C3 · una donación con cuota vigente suma al total y NO mueve acceso, cuotas ni racha ==='
SELECT pg_temp.pago('ZZC3c', pg_temp.u(3), 5000,  'suscripción', now() - interval '10 days');
DO $$ BEGIN PERFORM set_config('zz.c3_vence', (SELECT vence_el::text FROM public.acceso_vigente(pg_temp.u(3))), false); END $$;
SELECT pg_temp.pago('ZZC3d', pg_temp.u(3), 20000, 'única',       now() - interval '5 days');
DO $$
DECLARE d public.aportes := pg_temp.ap('ZZC3d'); v record; t record; e record;
BEGIN
  SELECT * INTO v FROM public.acceso_vigente(pg_temp.u(3));
  SELECT * INTO t FROM public.antiguedad_socio(pg_temp.u(3));
  SELECT * INTO e FROM public.elegibilidad_club(pg_temp.u(3));
  PERFORM pg_temp.chk(d.concepto = 'donacion_extraordinaria' AND d.cuotas_cubiertas = 0
                      AND d.acceso_desde IS NULL AND d.acceso_hasta IS NULL, 'C3 la donación entra sin período');
  PERFORM pg_temp.chk(v.vence_el::text = current_setting('zz.c3_vence'), 'C3 el vencimiento del acceso no cambia');
  PERFORM pg_temp.chk(t.meses_aportados = 1 AND t.racha_meses = 1, 'C3 sigue en 1 cuota y racha 1');
  PERFORM pg_temp.chk(e.aporte_acumulado = 25000, 'C3 el total sí suma: $25.000');
END $$;

\echo ''
\echo '=== C4 · el orden real de producción: donación primero, cuota después ==='
SELECT pg_temp.pago('ZZC4d', pg_temp.u(4), 20000, 'única',       now() - interval '3 days 6 hours');
SELECT pg_temp.pago('ZZC4c', pg_temp.u(4), 5000,  'suscripción', now() - interval '3 days');
DO $$
DECLARE c public.aportes := pg_temp.ap('ZZC4c');
BEGIN
  PERFORM pg_temp.chk(c.acceso_desde = public.fecha_local(now() - interval '3 days')
                      AND c.acceso_hasta - c.acceso_desde >= 27,
                      format('C4 la cuota cubre SU mes, no queda detrás de la donación [%s..%s]', c.acceso_desde, c.acceso_hasta));
END $$;

\echo ''
\echo '=== C5 · next_charge_date vieja: vincular la membresía NO acorta el período ==='
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status, preapproval_id, next_charge_date)
VALUES ('c0a50000-0000-0000-0000-000000000005', pg_temp.u(5), 'ZZ', 5000, 'mercadopago', 'active', 'ZZ-PRE-5',
        public.hoy_local() - 30);
SELECT pg_temp.pago('ZZC5', pg_temp.u(5), 5000, 'suscripción', now() - interval '1 day');
DO $$ BEGIN PERFORM set_config('zz.c5', (SELECT acceso_desde || '|' || acceso_hasta FROM pg_temp.ap('ZZC5')), false); END $$;
UPDATE public.memberships SET last_payment_id = 'ZZC5', last_payment_status = 'approved'
 WHERE id = 'c0a50000-0000-0000-0000-000000000005';
DO $$
DECLARE c public.aportes := pg_temp.ap('ZZC5');
BEGIN
  PERFORM pg_temp.chk(c.origen = 'membresia' AND c.membership_id = 'c0a50000-0000-0000-0000-000000000005'
                      AND c.donation_id IS NOT NULL, 'C5 vinculada a la membresía y a la donación');
  PERFORM pg_temp.chk(c.acceso_desde || '|' || c.acceso_hasta = current_setting('zz.c5'),
                      format('C5 el período no se tocó [%s..%s]', c.acceso_desde, c.acceso_hasta));
END $$;

\echo ''
\echo '=== C6 · un cobro que llega 3 días tarde NO corta la racha ==='
SELECT pg_temp.pago('ZZC6a', pg_temp.u(6), 5000, 'suscripción', now() - interval '65 days');
DO $$
DECLARE a public.aportes := pg_temp.ap('ZZC6a');
BEGIN
  PERFORM pg_temp.pago('ZZC6b', pg_temp.u(6), 5000, 'suscripción',
                       (a.acceso_hasta + 4)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires' + interval '12 hours');
END $$;
DO $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public.antiguedad_socio(pg_temp.u(6));
  PERFORM pg_temp.chk(t.meses_aportados = 2 AND t.racha_meses = 2 AND t.cortes = 0,
                      format('C6 2 cuotas, racha 2, 0 cortes (%s/%s/%s)', t.meses_aportados, t.racha_meses, t.cortes));
END $$;

\echo ''
\echo '=== C7 · un hueco mayor que la gracia corta la racha; las cuotas se siguen sumando ==='
SELECT pg_temp.pago('ZZC7a', pg_temp.u(7), 5000, 'suscripción', now() - interval '200 days');
SELECT pg_temp.pago('ZZC7b', pg_temp.u(7), 5000, 'suscripción', now() - interval '20 days');
DO $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public.antiguedad_socio(pg_temp.u(7));
  PERFORM pg_temp.chk(t.meses_aportados = 2 AND t.racha_meses = 1 AND t.cortes = 1,
                      format('C7 2 cuotas, racha 1, 1 corte (%s/%s/%s)', t.meses_aportados, t.racha_meses, t.cortes));
END $$;

\echo ''
\echo '=== C8 · el mismo aviso procesado 3 veces: 1 cobro y 1 aporte ==='
SELECT pg_temp.pago('ZZC8', pg_temp.u(8), 5000, 'suscripción', now() - interval '1 day', 'approved', 0, now() - interval '1 hour');
SELECT pg_temp.pago('ZZC8', pg_temp.u(8), 5000, 'suscripción', now() - interval '1 day', 'approved', 0, now() - interval '1 hour');
SELECT pg_temp.pago('ZZC8', pg_temp.u(8), 5000, 'suscripción', now() - interval '1 day', 'approved', 0, now() - interval '1 hour');
SELECT pg_temp.chk((SELECT count(*) FROM public.donations WHERE payment_id = 'ZZC8') = 1
               AND (SELECT count(*) FROM public.aportes  WHERE referencia_externa = 'ZZC8') = 1
               AND (SELECT meses_aportados FROM public.antiguedad_socio(pg_temp.u(8))) = 1,
               'C8 idempotente: 1 donación, 1 aporte, 1 cuota');

\echo ''
\echo '=== C9 · orden inverso (membresía antes que donación) converge ==='
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status, preapproval_id,
                                last_payment_id, last_payment_status)
VALUES ('c0a50000-0000-0000-0000-000000000009', pg_temp.u(9), 'ZZ', 5000, 'mercadopago', 'active', 'ZZ-PRE-9',
        'ZZC9', 'approved');
SELECT pg_temp.pago('ZZC9', pg_temp.u(9), 5000, 'suscripción', now());
SELECT pg_temp.chk((SELECT count(*) FROM public.aportes WHERE referencia_externa = 'ZZC9') = 1
               AND (pg_temp.ap('ZZC9')).origen = 'membresia'
               AND (pg_temp.ap('ZZC9')).concepto = 'cuota_mensual'
               AND (pg_temp.ap('ZZC9')).donation_id IS NOT NULL
               AND (pg_temp.ap('ZZC9')).acceso_desde IS NOT NULL,
               'C9 una fila, cuota, con las dos referencias y su período');

\echo ''
\echo '=== C10 · reintegro total: anula sin borrar; repetirlo no hace nada ==='
SELECT pg_temp.pago('ZZC10', pg_temp.u(10), 5000, 'suscripción', now() - interval '3 days', 'approved', 0, now() - interval '3 days');
SELECT pg_temp.pago('ZZC10', pg_temp.u(10), 5000, 'suscripción', now() - interval '3 days', 'refunded', 5000, now() - interval '2 days');
SELECT pg_temp.pago('ZZC10', pg_temp.u(10), 5000, 'suscripción', now() - interval '3 days', 'refunded', 5000, now() - interval '1 day');
DO $$
DECLARE a public.aportes := pg_temp.ap('ZZC10'); e record;
BEGIN
  SELECT * INTO e FROM public.elegibilidad_club(pg_temp.u(10));
  PERFORM pg_temp.chk(a.id IS NOT NULL AND a.anulado_en IS NOT NULL AND a.anulado_motivo LIKE 'Mercado Pago: refunded%',
                      'C10 la fila sigue, anulada, con el motivo');
  PERFORM pg_temp.chk(NOT e.tiene_acceso AND e.meses_aportados = 0 AND e.aporte_acumulado = 0,
                      'C10 sin acceso, 0 cuotas, $0 acumulado');
  PERFORM pg_temp.chk((SELECT count(*) FROM public.aportes_correcciones WHERE aporte_id = a.id AND accion = 'anulacion') = 1,
                      'C10 una sola anulación registrada aunque el aviso se repita');
END $$;

\echo ''
\echo '=== C11 · contracargo anula; un approved MÁS RECIENTE reactiva, con rastro ==='
SELECT pg_temp.pago('ZZC11', pg_temp.u(11), 10000, 'única', now() - interval '9 days', 'approved',     0, now() - interval '9 days');
SELECT pg_temp.pago('ZZC11', pg_temp.u(11), 10000, 'única', now() - interval '9 days', 'charged_back', 0, now() - interval '5 days');
SELECT pg_temp.chk((pg_temp.ap('ZZC11')).anulado_motivo LIKE 'Mercado Pago: charged_back%'
               AND (SELECT aporte_acumulado FROM public.elegibilidad_club(pg_temp.u(11))) = 0,
               'C11 contracargo: anulado y fuera del total');
SELECT pg_temp.pago('ZZC11', pg_temp.u(11), 10000, 'única', now() - interval '9 days', 'approved',     0, now() - interval '1 day');
DO $$
DECLARE a public.aportes := pg_temp.ap('ZZC11');
BEGIN
  PERFORM pg_temp.chk(a.anulado_en IS NULL AND (SELECT aporte_acumulado FROM public.elegibilidad_club(pg_temp.u(11))) = 10000,
                      'C11 reactivado: vuelve a sumar $10.000');
  PERFORM pg_temp.chk((SELECT string_agg(accion, ',' ORDER BY created_at, accion) FROM public.aportes_correcciones
                        WHERE aporte_id = a.id) = 'anulacion,reactivacion',
                      'C11 rastro: anulacion -> reactivacion, con antes/después');
END $$;

\echo ''
\echo '=== C12 · reintegro parcial: descuenta solo lo devuelto y la cuota sigue contando ==='
SELECT pg_temp.pago('ZZC12', pg_temp.u(12), 5000, 'suscripción', now() - interval '4 days', 'approved', 0,    now() - interval '4 days');
SELECT pg_temp.pago('ZZC12', pg_temp.u(12), 5000, 'suscripción', now() - interval '4 days', 'approved', 2000, now() - interval '1 day');
DO $$
DECLARE a public.aportes := pg_temp.ap('ZZC12'); e record;
BEGIN
  SELECT * INTO e FROM public.elegibilidad_club(pg_temp.u(12));
  PERFORM pg_temp.chk(a.anulado_en IS NULL AND a.monto_reintegrado = 2000 AND a.cuotas_cubiertas = 1,
                      'C12 no anulado, $2.000 reintegrados, la cuota sigue');
  PERFORM pg_temp.chk(e.tiene_acceso AND e.meses_aportados = 1 AND e.aporte_acumulado = 3000,
                      format('C12 acceso vigente, 1 cuota, $3.000 acumulados (%s)', e.aporte_acumulado));
  PERFORM pg_temp.chk((SELECT count(*) FROM public.aportes_correcciones WHERE aporte_id = a.id AND accion = 'reintegro_parcial') = 1,
                      'C12 el reintegro parcial queda registrado');
END $$;

\echo ''
\echo '=== C13 · un aviso VIEJO no pisa uno más nuevo ==='
SELECT pg_temp.pago('ZZC13', pg_temp.u(13), 5000, 'suscripción', now() - interval '2 days', 'approved', 0,    now() - interval '1 hour');
SELECT pg_temp.pago('ZZC13', pg_temp.u(13), 5000, 'suscripción', now() - interval '2 days', 'refunded', 5000, now() - interval '5 hours');
SELECT pg_temp.chk((SELECT status FROM public.donations WHERE payment_id = 'ZZC13') = 'approved'
               AND (pg_temp.ap('ZZC13')).anulado_en IS NULL,
               'C13 el refunded con fecha anterior se descarta: sigue aprobado y vigente');

\echo ''
\echo '=== C14 · reclamo: una donación anónima suma sin período; una cuota anónima cubre el mes de su pago ==='
SELECT pg_temp.pago('ZZC14d', NULL, 20000, 'única',       now() - interval '6 days', 'approved', 0, now(), 'zz-cuotas-14@test.com');
SELECT pg_temp.pago('ZZC14c', NULL, 5000,  'suscripción', now() - interval '2 days', 'approved', 0, now(), 'zz-cuotas-14@test.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', pg_temp.u(14)::text, true);
SELECT pg_temp.chk((SELECT count(*) FROM public.donaciones_reclamables()) = 2
               AND (SELECT sum(meses_estimados) FROM public.donaciones_reclamables()) = 1,
               'C14 ve 2 reclamables y le anuncia 1 cuota (no 4 meses por la donación)');
SELECT pg_temp.chk(r.vinculadas = 2 AND r.meses_nuevos = 1, 'C14 reclama 2, suma 1 cuota')
  FROM public.reclamar_donaciones() r;
RESET ROLE;
DO $$
DECLARE d public.aportes := pg_temp.ap('ZZC14d'); c public.aportes := pg_temp.ap('ZZC14c'); e record;
BEGIN
  SELECT * INTO e FROM public.elegibilidad_club(pg_temp.u(14));
  PERFORM pg_temp.chk(d.user_id = pg_temp.u(14) AND d.acceso_desde IS NULL, 'C14 la donación queda suya y sin período');
  PERFORM pg_temp.chk(c.acceso_desde = public.fecha_local(now() - interval '2 days'), 'C14 la cuota arranca el día de su pago, no hoy');
  PERFORM pg_temp.chk(e.tiene_acceso AND e.meses_aportados = 1 AND e.aporte_acumulado = 25000, 'C14 acceso, 1 cuota, $25.000');
END $$;

\echo ''
\echo '=== C14b · un aviso posterior NO desvincula la donación reclamada ==='
UPDATE public.donations SET user_id = NULL, status = 'refunded', mp_status = 'refunded',
       monto_reintegrado = 20000, mp_actualizado_en = now() + interval '1 hour'
 WHERE payment_id = 'ZZC14d';
SELECT pg_temp.chk(d.user_id = pg_temp.u(14) AND d.reclamado_en IS NOT NULL AND d.status = 'refunded',
                   'C14b el reintegro se aplica y la donación sigue siendo de quien la reclamó')
  FROM public.donations d WHERE d.payment_id = 'ZZC14d';
SELECT pg_temp.chk((pg_temp.ap('ZZC14d')).anulado_en IS NOT NULL
                   AND (SELECT aporte_acumulado FROM public.elegibilidad_club(pg_temp.u(14))) = 5000,
                   'C14b y el aporte queda anulado: el total baja a $5.000');

\echo ''
\echo '=== C15 · una cuenta que SOLO donó: es Donante y ve su historial, sin memberships ni padrón ==='
SELECT pg_temp.pago('ZZC15', pg_temp.u(15), 8000, 'única', now() - interval '1 day');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', pg_temp.u(15)::text, true);
SELECT pg_temp.chk(r.es_donante AND r.total_aportado = 8000 AND r.cuotas_efectivas = 0 AND r.donaciones = 1,
                   'C15 mi_resumen_aportes: donante, $8.000, 0 cuotas')
  FROM public.mi_resumen_aportes() r;
SELECT pg_temp.chk(NOT a.tiene_acceso AND a.vence_el IS NULL, 'C15 mi_acceso: sin acceso y sin vencimiento')
  FROM public.mi_acceso() a;
SELECT pg_temp.chk((SELECT count(*) FROM public.donations WHERE user_id = pg_temp.u(15)) = 1,
                   'C15 ve su donación en el historial (RLS de donations)');
SELECT pg_temp.chk((SELECT count(*) FROM public.memberships) = 0, 'C15 no tiene (ni ve) ninguna membresía');
RESET ROLE;
SELECT pg_temp.chk(NOT EXISTS (SELECT 1 FROM public.miembros WHERE user_id = pg_temp.u(15)),
                   'C15 donar no da de alta en el padrón de miembros');

\echo ''
\echo '=== C16 · SEGURIDAD: nadie se inserta un cobro aprobado ==='
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', pg_temp.u(16)::text, true);
DO $$ BEGIN
  INSERT INTO public.donations (user_id, amount, donation_type, payment_id, status)
  VALUES (pg_temp.u(16), 30000, 'única', 'ZZC16', 'approved');
  PERFORM pg_temp.chk(false, 'C16 una sesión NO puede insertar su propia donación aprobada');
EXCEPTION WHEN insufficient_privilege THEN
  PERFORM pg_temp.chk(true, 'C16 una sesión NO puede insertar su propia donación aprobada');
END $$;
DO $$ BEGIN
  INSERT INTO public.memberships (user_id, plan, amount, payment_method, status, last_payment_id)
  VALUES (pg_temp.u(16), 'x', 5000, 'mp', 'active', 'ZZC16m');
  PERFORM pg_temp.chk(false, 'C16 una sesión NO puede insertar su propia membresía activa');
EXCEPTION WHEN insufficient_privilege THEN
  PERFORM pg_temp.chk(true, 'C16 una sesión NO puede insertar su propia membresía activa');
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  INSERT INTO public.donations (amount, donation_type, payment_id, status) VALUES (30000, 'única', 'ZZC16a', 'approved');
  PERFORM pg_temp.chk(false, 'C16 anon NO puede insertar donaciones');
EXCEPTION WHEN insufficient_privilege THEN
  PERFORM pg_temp.chk(true, 'C16 anon NO puede insertar donaciones');
END $$;
RESET ROLE;
SELECT pg_temp.chk(NOT public.tiene_acceso(pg_temp.u(16)), 'C16 control: la cuenta sigue sin acceso');

\echo ''
\echo '=== C17 · aportes manuales: sin clasificar no da nada; una cuota calcula su período; lo automático no se toca ==='
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', pg_temp.u(17)::text, true);
INSERT INTO public.aportes (user_id, monto, fecha, destino_id, origen, acceso_desde, acceso_hasta, referencia_externa)
VALUES (pg_temp.u(18), 5000, now() - interval '1 day', public.destino_por_defecto(), 'manual',
        current_date, '2099-12-31', 'ZZC17-sin');
INSERT INTO public.aportes (user_id, monto, fecha, destino_id, origen, concepto, acceso_desde, acceso_hasta, referencia_externa)
VALUES (pg_temp.u(19), 5000, now() - interval '1 day', public.destino_por_defecto(), 'manual', 'cuota_mensual',
        current_date, '2099-12-31', 'ZZC17-cuota');
DO $$ BEGIN
  UPDATE public.aportes SET acceso_hasta = '2099-12-31' WHERE referencia_externa = 'ZZC1';
  PERFORM pg_temp.chk(false, 'C17 la comisión NO puede estirar el período de un aporte automático');
EXCEPTION WHEN insufficient_privilege THEN
  PERFORM pg_temp.chk(true, 'C17 la comisión NO puede estirar el período de un aporte automático');
END $$;
UPDATE public.aportes SET notas = 'reimputado por la comisión' WHERE referencia_externa = 'ZZC1';
RESET ROLE;
SELECT pg_temp.chk(a.concepto IS NULL AND a.cuotas_cubiertas = 0 AND a.acceso_hasta IS NULL,
                   'C17 manual sin clasificar: sin cuota ni período (las fechas inventadas se ignoran)')
  FROM pg_temp.ap('ZZC17-sin') a;
SELECT pg_temp.chk(a.cuotas_cubiertas = 1 AND a.acceso_desde = public.fecha_local(now() - interval '1 day')
                   AND a.acceso_hasta < '2099-01-01',
                   format('C17 manual cuota_mensual: período calculado [%s..%s], no el escrito', a.acceso_desde, a.acceso_hasta))
  FROM pg_temp.ap('ZZC17-cuota') a;
SELECT pg_temp.chk(a.notas = 'reimputado por la comisión' AND a.acceso_hasta < '2099-01-01',
                   'C17 control: la comisión SÍ puede editar notas/destino de un automático')
  FROM pg_temp.ap('ZZC1') a;

\echo ''
\echo '=== C18 · beneficio web (6 cuotas O $30.000): 5 cuotas + donación de $5.000 llega por monto ==='
SELECT pg_temp.pago('ZZC18-' || n, pg_temp.u(20), 5000, 'suscripción', now() - make_interval(days => 150 - (n - 1) * 30))
  FROM generate_series(1, 5) n;
SELECT pg_temp.chk(e.tiene_acceso AND e.meses_aportados = 5 AND e.aporte_acumulado = 25000,
                   format('C18 con 5 cuotas: acceso, 5 cuotas, $25.000 (%s/%s)', e.meses_aportados, e.aporte_acumulado))
  FROM public.elegibilidad_club(pg_temp.u(20)) e;
SELECT pg_temp.pago('ZZC18-don', pg_temp.u(20), 5000, 'única', now());
SELECT pg_temp.chk(e.meses_aportados = 5 AND e.aporte_acumulado = 30000,
                   'C18 la donación lleva el total a $30.000 sin sumar cuotas')
  FROM public.elegibilidad_club(pg_temp.u(20)) e;

\echo ''
\echo '=== C19 · una cuota bajo el piso (las de $50 de prueba) no cuenta ==='
SELECT pg_temp.pago('ZZC19', pg_temp.u(13), 50, 'suscripción', now());
SELECT pg_temp.chk(a.concepto = 'cuota_mensual' AND a.cuotas_cubiertas = 0 AND a.acceso_desde IS NULL,
                   'C19 $50: entra al libro como cuota, 0 cuotas, sin período')
  FROM pg_temp.ap('ZZC19') a;

ROLLBACK;
\echo ''
\echo '=== fin: todo se deshizo con ROLLBACK ==='
