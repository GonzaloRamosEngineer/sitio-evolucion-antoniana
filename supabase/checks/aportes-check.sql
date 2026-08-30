-- Verificación de `aportes` / `acceso_vigente()` contra un Postgres real.
-- Procedimiento y motivo: ver README.md de esta carpeta.
-- Se corre DESPUÉS de aplicar todas las migraciones.
\set ON_ERROR_STOP off
\pset pager off

-- Semilla (como superusuario; RLS no aplica a superuser)
-- El trigger `handle_new_user` copia auth.users -> public.users y `name` es
-- NOT NULL, así que la metadata tiene que traerlo o la semilla falla.
-- `created_at` explícito: el trigger copia NEW.created_at a una columna NOT NULL.
-- En Supabase real siempre viene de GoTrue; sembrando a mano hay que ponerlo.
INSERT INTO auth.users (id, email, created_at, raw_user_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','zz-vigente@test.com', now(),   '{"name":"ZZ Vigente"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002','zz-gracia@test.com', now(),    '{"name":"ZZ Gracia"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003','zz-vencido@test.com', now(),   '{"name":"ZZ Vencido"}'),
  ('aaaaaaaa-0000-0000-0000-000000000004','zz-donante@test.com', now(),   '{"name":"ZZ Donante"}'),
  ('aaaaaaaa-0000-0000-0000-000000000005','zz-sinaportes@test.com', now(),'{"name":"ZZ SinAportes"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, email, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','ZZ Vigente','zz-vigente@test.com','user'),
  ('aaaaaaaa-0000-0000-0000-000000000002','ZZ Gracia','zz-gracia@test.com','user'),
  ('aaaaaaaa-0000-0000-0000-000000000003','ZZ Vencido','zz-vencido@test.com','user'),
  ('aaaaaaaa-0000-0000-0000-000000000004','ZZ Donante','zz-donante@test.com','user'),
  ('aaaaaaaa-0000-0000-0000-000000000005','ZZ SinAportes','zz-sinaportes@test.com','user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.aportes (user_id, tipo, monto, acceso_desde, acceso_hasta) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','cuota',    5000, current_date - 30, current_date + 10),
  ('aaaaaaaa-0000-0000-0000-000000000002','cuota',    5000, current_date - 60, current_date - 10),
  ('aaaaaaaa-0000-0000-0000-000000000003','cuota',    5000, current_date - 90, current_date - 40),
  ('aaaaaaaa-0000-0000-0000-000000000004','donacion',20000, current_date - 60, current_date - 10);

\echo ''
\echo '=== A1: la lógica de acceso (gracia = 30 días, SOLO para cuota) ==='
\echo '    esperado: vigente=t | gracia=t(en_gracia) | vencido=f | donante=f | sin aportes=f'
SELECT u.name,
       a.tiene_acceso,
       a.vence_el,
       a.origen,
       a.en_gracia
  FROM public.users u
  CROSS JOIN LATERAL public.acceso_vigente(u.id) a
 WHERE u.name LIKE 'ZZ %'
 ORDER BY u.name;

\echo ''
\echo '=== A2: anon NO puede leer aportes -> DEBE rechazar (42501) ==='
\echo '    (mejor que el caso de partners: acá no hay GRANT, no es un 0 filas silencioso)'
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS filas_visibles_anon FROM public.aportes;
ROLLBACK;

\echo ''
\echo '=== A3: anon INSERT en aportes -> DEBE rechazar (42501) ==='
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.aportes (user_id, tipo, monto, acceso_desde, acceso_hasta)
VALUES ('aaaaaaaa-0000-0000-0000-000000000005','cuota',1,current_date,current_date+3650);
ROLLBACK;

\echo ''
\echo '=== A4: authenticated INSERT en aportes -> DEBE rechazar (autoconcederse acceso) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000005', true);
INSERT INTO public.aportes (user_id, tipo, monto, acceso_desde, acceso_hasta)
VALUES ('aaaaaaaa-0000-0000-0000-000000000005','cuota',1,current_date,current_date+3650);
ROLLBACK;

\echo ''
\echo '=== A5: el socio ve SOLO sus aportes (esperado: 1) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001', true);
SELECT count(*) AS aportes_visibles FROM public.aportes;
ROLLBACK;

\echo ''
\echo '=== A6: tiene_acceso() sin parámetro usa auth.uid() (esperado: t) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001', true);
SELECT public.tiene_acceso() AS acceso_propio;
ROLLBACK;

\echo ''
\echo '=== A7: un usuario NO puede espiar el acceso de otro -> DEBE rechazar (42501) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000005', true);
SELECT public.tiene_acceso('aaaaaaaa-0000-0000-0000-000000000001');
ROLLBACK;

\echo ''
\echo '=== A8: reglas_acceso es de lectura pública, pero no escribible por anon ==='
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS reglas_visibles_anon FROM public.reglas_acceso;
UPDATE public.reglas_acceso SET dias_gracia = 9999 WHERE vigente;
\echo '   ^ el UPDATE debe fallar (42501) o afectar 0 filas'
ROLLBACK;

\echo ''
\echo '=== A9a: aporte manual en efectivo (sin membership ni donation) -> DEBE pasar ==='
BEGIN;
INSERT INTO public.aportes (user_id, tipo, monto, acceso_desde, acceso_hasta, observaciones)
VALUES ('aaaaaaaa-0000-0000-0000-000000000005','cuota',5000,current_date,current_date+30,'efectivo, a mano');
SELECT count(*) AS aporte_manual_insertado FROM public.aportes
 WHERE observaciones = 'efectivo, a mano';
ROLLBACK;

\echo ''
\echo '=== A9b: mezclar orígenes (cuota con donation_id) -> DEBE rechazar (23514) ==='
BEGIN;
INSERT INTO public.donations (id, user_id, amount, donation_type, status)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000005',100,'test','approved');
INSERT INTO public.aportes (user_id, tipo, monto, acceso_desde, acceso_hasta, donation_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000005','cuota',5000,current_date,current_date+30,
        'bbbbbbbb-0000-0000-0000-000000000001');
ROLLBACK;

-- Limpieza
DELETE FROM public.aportes WHERE user_id::text LIKE 'aaaaaaaa-%';
DELETE FROM public.users   WHERE id::text LIKE 'aaaaaaaa-%';
DELETE FROM auth.users     WHERE id::text LIKE 'aaaaaaaa-%';
