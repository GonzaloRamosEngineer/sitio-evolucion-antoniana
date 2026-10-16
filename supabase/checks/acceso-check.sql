-- Verificación de la CAPA DE ACCESO contra un Postgres real.
-- Cubre `reglas_acceso`, las funciones de acceso y antigüedad, los triggers que
-- otorgan acceso, y los permisos sobre `aportes` (la tabla que da privilegios).
-- Procedimiento: ver README.md de esta carpeta.
\set ON_ERROR_STOP off
\pset pager off

-- ---- semilla -------------------------------------------------------
-- El trigger `handle_new_user` copia `created_at` y `raw_user_meta_data->>name`
-- a columnas NOT NULL de public.users: sin esos dos campos, la semilla falla.
INSERT INTO auth.users (id, email, created_at, raw_user_meta_data) VALUES
  ('aaaa0000-0000-0000-0000-000000000001','zz-cuota@test.com',   now(), '{"name":"ZZ Cuota"}'),
  ('aaaa0000-0000-0000-0000-000000000002','zz-gracia@test.com',  now(), '{"name":"ZZ Gracia"}'),
  ('aaaa0000-0000-0000-0000-000000000003','zz-vencido@test.com', now(), '{"name":"ZZ Vencido"}'),
  ('aaaa0000-0000-0000-0000-000000000004','zz-donac@test.com',   now(), '{"name":"ZZ DonacVencida"}'),
  ('aaaa0000-0000-0000-0000-000000000006','zz-manuald@test.com', now(), '{"name":"ZZ ManualDonac"}'),
  ('aaaa0000-0000-0000-0000-000000000007','zz-sin@test.com',     now(), '{"name":"ZZ SinAportes"}'),
  ('aaaa0000-0000-0000-0000-000000000008','zz-trg@test.com',     now(), '{"name":"ZZ Triggers"}'),
  ('aaaa0000-0000-0000-0000-000000000009','zz-antig@test.com',   now(), '{"name":"ZZ Antiguedad"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.destinos (id, tipo, nombre, slug, estado, otorga_acceso) VALUES
  ('dddd0000-0000-0000-0000-000000000001','institucional','ZZ Institucional','zz-institucional','activo', true),
  ('dddd0000-0000-0000-0000-000000000002','campana','ZZ Sin acceso','zz-sin-acceso','activo', false)
ON CONFLICT (id) DO NOTHING;

-- Desde 20261016120000 el período de un aporte manual NO se escribe: lo
-- calcula el trigger a partir del concepto y de la FECHA del pago (un mes
-- menos un día). Por eso la semilla describe cuándo se pagó, no hasta cuándo.
-- `equivale_a` se sigue aceptando y se traduce a `concepto`.
INSERT INTO public.aportes (user_id, monto, destino_id, origen, equivale_a, fecha) VALUES
  ('aaaa0000-0000-0000-0000-000000000001',5000,'dddd0000-0000-0000-0000-000000000001','manual','cuota',    now() - interval '20 days'),
  ('aaaa0000-0000-0000-0000-000000000002',5000,'dddd0000-0000-0000-0000-000000000001','manual','cuota',    now() - interval '40 days'),
  ('aaaa0000-0000-0000-0000-000000000003',5000,'dddd0000-0000-0000-0000-000000000001','manual','cuota',    now() - interval '75 days'),
  ('aaaa0000-0000-0000-0000-000000000006',5000,'dddd0000-0000-0000-0000-000000000001','manual','donacion', now() - interval '40 days');

\echo ''
\echo '=== A1: la gracia de 30 dias aplica a cuota, NO a donacion ==='
\echo '    esperado: Cuota=t | Gracia=t(en_gracia) | Vencido=f | ManualDonac=f SIN vencimiento (una donacion no da periodo) | SinAportes=f'
SELECT u.name, a.tiene_acceso, a.vence_el, a.origen, a.en_gracia
  FROM public.users u CROSS JOIN LATERAL public.acceso_vigente(u.id) a
 WHERE u.name LIKE 'ZZ %' AND u.name NOT IN ('ZZ Triggers','ZZ Antiguedad','ZZ DonacVencida')
 ORDER BY u.name;

\echo ''
\echo '=== A2: la conversion monto -> meses (cuota 5000, piso = la cuota) ==='
\echo '    esperado: 4999->0 | 5000->1 | 17000->3 | 999999->12 (tope)'
SELECT public.meses_por_donacion(4999) AS m4999, public.meses_por_donacion(5000) AS m5000,
       public.meses_por_donacion(17000) AS m17000, public.meses_por_donacion(999999) AS m_tope;

\echo ''
\echo '=== A3: anon NO puede leer el libro -> DEBE rechazar (42501) ==='
BEGIN; SET LOCAL ROLE anon;
SELECT count(*) FROM public.aportes;
ROLLBACK;

\echo ''
\echo '=== A4: un socio comun NO puede insertar un aporte (autoconcederse acceso) ==='
BEGIN; SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000007', true);
INSERT INTO public.aportes (user_id, monto, destino_id, origen, acceso_desde, acceso_hasta)
VALUES ('aaaa0000-0000-0000-0000-000000000007',1,'dddd0000-0000-0000-0000-000000000001','manual',current_date,current_date+3650);
\echo '   ^ DEBE fallar por RLS';
ROLLBACK;

\echo ''
\echo '=== A5: el socio ve SOLO sus aportes (esperado: 1) ==='
BEGIN; SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000001', true);
SELECT count(*) AS aportes_visibles FROM public.aportes;
SELECT public.tiene_acceso() AS mi_acceso_propio;
ROLLBACK;

\echo ''
\echo '=== A6: nadie puede preguntar por el acceso de otro -> DEBE rechazar (42501) ==='
BEGIN; SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaa0000-0000-0000-0000-000000000007', true);
SELECT public.tiene_acceso('aaaa0000-0000-0000-0000-000000000001');
ROLLBACK;

\echo ''
\echo '=== T1: donacion aprobada de $17.000 -> entra al libro SIN periodo (regla 2026-10: una donacion suma, no compra meses) ==='
INSERT INTO public.donations (id, user_id, amount, donation_type, status, payment_id, destino_id)
VALUES ('ffff0000-0000-0000-0000-000000000001','aaaa0000-0000-0000-0000-000000000008',
        17000,'unica','approved','MP-T1','dddd0000-0000-0000-0000-000000000001');
SELECT origen, monto, acceso_desde, acceso_hasta, notas FROM public.aportes
 WHERE referencia_externa = 'MP-T1';

\echo ''
\echo '=== T2: REINTENTO del webhook con el mismo payment_id -> no duplica (esperado: 1) ==='
UPDATE public.donations SET status='approved' WHERE id='ffff0000-0000-0000-0000-000000000001';
SELECT count(*) AS filas FROM public.aportes WHERE referencia_externa = 'MP-T1';

\echo ''
\echo '=== T3: donacion por DEBAJO del piso -> entra al libro SIN acceso ==='
INSERT INTO public.donations (id, user_id, amount, donation_type, status, payment_id, destino_id)
VALUES ('ffff0000-0000-0000-0000-000000000002','aaaa0000-0000-0000-0000-000000000008',
        3000,'unica','approved','MP-T3','dddd0000-0000-0000-0000-000000000001');
SELECT monto, acceso_desde IS NULL AS sin_acceso, notas FROM public.aportes WHERE referencia_externa='MP-T3';

\echo ''
\echo '=== T4: destino con otorga_acceso=false -> entra al libro SIN acceso ==='
INSERT INTO public.donations (id, user_id, amount, donation_type, status, payment_id, destino_id)
VALUES ('ffff0000-0000-0000-0000-000000000003','aaaa0000-0000-0000-0000-000000000008',
        50000,'unica','approved','MP-T4','dddd0000-0000-0000-0000-000000000002');
SELECT monto, acceso_desde IS NULL AS sin_acceso FROM public.aportes WHERE referencia_externa='MP-T4';

\echo ''
\echo '=== T5: donacion ANONIMA (sin user_id) -> entra al libro SIN acceso ==='
INSERT INTO public.donations (id, user_id, amount, donation_type, status, payment_id, destino_id)
VALUES ('ffff0000-0000-0000-0000-000000000004', NULL, 50000,'unica','approved','MP-T5','dddd0000-0000-0000-0000-000000000001');
SELECT monto, acceso_desde IS NULL AS sin_acceso FROM public.aportes WHERE referencia_externa='MP-T5';

\echo ''
\echo '=== T6: cobro de MEMBRESIA -> UN mes desde hoy; next_charge_date (a 120 dias) NO lo gobierna ==='
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status,
                                last_payment_id, last_payment_status, next_charge_date, destino_id)
VALUES ('eeee0000-0000-0000-0000-000000000001','aaaa0000-0000-0000-0000-000000000008',
        'mensual',5000,'mercadopago','active','MP-M1','approved', current_date+120,
        'dddd0000-0000-0000-0000-000000000001');
SELECT origen, acceso_desde, acceso_hasta FROM public.aportes
 WHERE user_id='aaaa0000-0000-0000-0000-000000000008' AND acceso_desde IS NOT NULL
 ORDER BY acceso_desde;
\echo '   ^ esperado: 1 fila, membresia, de hoy a dentro de un mes menos un dia (las donaciones T1-T5 no generan tramos)';

\echo ''
\echo '=== T7: update de la membresia SIN pago nuevo -> no genera otro aporte ==='
UPDATE public.memberships SET payer_email='otro@mp.com' WHERE id='eeee0000-0000-0000-0000-000000000001';
SELECT count(*) AS aportes_de_membresia FROM public.aportes WHERE origen='membresia';

\echo ''
\echo '=== T8: ANTIGUEDAD con un corte de un anio: cuenta CUOTAS, no dias / 30 ==='
INSERT INTO public.aportes (user_id, monto, destino_id, origen, equivale_a, fecha) VALUES
  ('aaaa0000-0000-0000-0000-000000000009',5000,'dddd0000-0000-0000-0000-000000000001','manual','cuota','2024-01-01 15:00-03'),
  ('aaaa0000-0000-0000-0000-000000000009',5000,'dddd0000-0000-0000-0000-000000000001','manual','cuota', now() - interval '180 days'),
  ('aaaa0000-0000-0000-0000-000000000009',5000,'dddd0000-0000-0000-0000-000000000001','manual','cuota', now() - interval '150 days');
SELECT * FROM public.antiguedad_socio('aaaa0000-0000-0000-0000-000000000009');
\echo '   esperado: socio_desde=2024-01-01 | meses_aportados=3 (CUOTAS, no dias/30) | cortes=1 (2024 -> hoy) | racha=0 (la ultima vencio hace mas que la gracia)';

-- ---- limpieza ------------------------------------------------------
DELETE FROM public.aportes     WHERE user_id::text LIKE 'aaaa0000-%' OR destino_id::text LIKE 'dddd0000-%';
DELETE FROM public.memberships WHERE id::text LIKE 'eeee0000-%';
DELETE FROM public.donations   WHERE id::text LIKE 'ffff0000-%';
DELETE FROM public.destinos    WHERE id::text LIKE 'dddd0000-%';
DELETE FROM public.users       WHERE id::text LIKE 'aaaa0000-%';
DELETE FROM auth.users         WHERE id::text LIKE 'aaaa0000-%';
