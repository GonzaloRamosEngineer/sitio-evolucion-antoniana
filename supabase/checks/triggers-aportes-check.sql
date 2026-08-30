-- Verificación de los triggers que alimentan `aportes` (D1) y de las funciones
-- de antigüedad (D4). Se corre después de aplicar todas las migraciones.
-- Procedimiento: ver README.md de esta carpeta.
\set ON_ERROR_STOP off
\pset pager off

INSERT INTO auth.users (id, email, created_at, raw_user_meta_data) VALUES
  ('dddddddd-0000-0000-0000-000000000001','zz-trg-cuota@test.com',  now(), '{"name":"ZZ TrgCuota"}'),
  ('dddddddd-0000-0000-0000-000000000002','zz-trg-donac@test.com',  now(), '{"name":"ZZ TrgDonacion"}'),
  ('dddddddd-0000-0000-0000-000000000003','zz-trg-chico@test.com',  now(), '{"name":"ZZ TrgChico"}'),
  ('dddddddd-0000-0000-0000-000000000004','zz-antiguedad@test.com', now(), '{"name":"ZZ Antiguedad"}')
ON CONFLICT (id) DO NOTHING;

\echo ''
\echo '=== T1: alta de membresía con cobro -> genera aporte solo (esperado: 1) ==='
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status,
                                last_payment_id, last_payment_status, next_charge_date, payer_email)
VALUES ('eeeeeeee-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
        'mensual', 5000, 'mercadopago', 'active', 'MP-PAY-001', 'approved',
        current_date + 30, 'pagador@mp.com');
SELECT count(*) AS aportes, min(acceso_desde) AS desde, max(acceso_hasta) AS hasta
  FROM public.aportes WHERE user_id = 'dddddddd-0000-0000-0000-000000000001';

\echo ''
\echo '=== T2: update SIN pago nuevo (cambia el mail) -> NO debe generar otro (esperado: 1) ==='
UPDATE public.memberships SET payer_email = 'otro@mp.com'
 WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
SELECT count(*) AS aportes FROM public.aportes
 WHERE user_id = 'dddddddd-0000-0000-0000-000000000001';

\echo ''
\echo '=== T3: REINTENTO del webhook, mismo payment_id -> NO duplica (esperado: 1) ==='
UPDATE public.memberships
   SET last_payment_id = 'MP-PAY-001', last_payment_status = 'approved'
 WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
SELECT count(*) AS aportes FROM public.aportes
 WHERE user_id = 'dddddddd-0000-0000-0000-000000000001';

\echo ''
\echo '=== T4: cobro NUEVO -> genera aporte ENCADENADO, sin hueco ni solape (esperado: 2) ==='
UPDATE public.memberships
   SET last_payment_id = 'MP-PAY-002', last_payment_status = 'approved',
       next_charge_date = current_date + 60
 WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
SELECT payment_id, acceso_desde, acceso_hasta FROM public.aportes
 WHERE user_id = 'dddddddd-0000-0000-0000-000000000001' ORDER BY acceso_desde;

\echo ''
\echo '=== T5: donación de $15.000 con cuota $5.000 -> 3 meses (esperado: 3) ==='
INSERT INTO public.donations (id, user_id, amount, donation_type, status, payment_id)
VALUES ('ffffffff-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000002',
        15000, 'unica', 'approved', 'MP-DON-001');
SELECT monto, acceso_desde, acceso_hasta,
       (acceso_hasta - acceso_desde) AS dias, observaciones
  FROM public.aportes WHERE user_id = 'dddddddd-0000-0000-0000-000000000002';

\echo ''
\echo '=== T6: donación de $3.000 (bajo el piso de $5.000) -> NO da acceso (esperado: 0) ==='
INSERT INTO public.donations (id, user_id, amount, donation_type, status, payment_id)
VALUES ('ffffffff-0000-0000-0000-000000000002','dddddddd-0000-0000-0000-000000000003',
        3000, 'unica', 'approved', 'MP-DON-002');
SELECT count(*) AS aportes_generados FROM public.aportes
 WHERE user_id = 'dddddddd-0000-0000-0000-000000000003';
SELECT public.meses_por_donacion(3000) AS meses_3000,
       public.meses_por_donacion(5000) AS meses_5000,
       public.meses_por_donacion(99999999) AS meses_tope;

\echo ''
\echo '=== T7: donación ya aprobada que se vuelve a updatear -> no duplica (esperado: 1) ==='
UPDATE public.donations SET donation_type = 'unica-editada'
 WHERE id = 'ffffffff-0000-0000-0000-000000000001';
SELECT count(*) AS aportes FROM public.aportes
 WHERE user_id = 'dddddddd-0000-0000-0000-000000000002';

\echo ''
\echo '=== T8: ANTIGÜEDAD con un año de corte y un doble pago solapado ==='
\echo '    12 meses en 2024 + (hueco de 2025) + 6 meses hasta hoy, con un pago duplicado'
INSERT INTO public.aportes (user_id, tipo, monto, acceso_desde, acceso_hasta) VALUES
  ('dddddddd-0000-0000-0000-000000000004','cuota',5000,'2024-01-01','2024-12-31'),
  ('dddddddd-0000-0000-0000-000000000004','cuota',5000, current_date - 180, current_date + 30),
  -- doble pago: período solapado, NO debe contar dos veces
  ('dddddddd-0000-0000-0000-000000000004','cuota',5000, current_date - 150, current_date - 60);
SELECT * FROM public.antiguedad_socio('dddddddd-0000-0000-0000-000000000004');
\echo '    esperado: socio_desde=2024-01-01 | cortes=1 | meses_aportados ~= 12+7 (sin doble conteo)'

-- Limpieza
DELETE FROM public.aportes     WHERE user_id::text LIKE 'dddddddd-%';
DELETE FROM public.donations   WHERE id::text LIKE 'ffffffff-%';
DELETE FROM public.memberships WHERE id::text LIKE 'eeeeeeee-%';
DELETE FROM public.users       WHERE id::text LIKE 'dddddddd-%';
DELETE FROM auth.users         WHERE id::text LIKE 'dddddddd-%';
