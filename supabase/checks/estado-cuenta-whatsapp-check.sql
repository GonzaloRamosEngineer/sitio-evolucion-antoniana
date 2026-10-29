-- =====================================================================
-- «MI APORTE» POR WHATSAPP · account_status_for_phone (20261029100000)
--
-- QUÉ SE PRUEBA. Que MatchBot, al preguntar por el número que le escribe, reciba
-- los datos de ESA persona y de nadie más, con la forma que su parser espera.
--
-- POR QUÉ IMPORTA MÁS QUE UN FORMATO. El vínculo es `users.phone`: texto libre, sin
-- UNIQUE, con formatos mezclados. Lo que protege a la gente no es el formato: es que
-- la función rechace lo ambiguo y lo no verificado. Cada negativo trae su positivo:
--
--     T3  (email SIN verificar → no se encuentra)  ←→  T4  (verificado → sí)
--     T5  (dos cuentas, mismo número → ambiguous)  ←→  T6  (una sola → found)
--     T10 (acceso cortado → restricted)             ←→  T11 (misma persona, sin
--                                                          corte → found)
--     T13 (aporte reintegrado no cuenta)            ←→  T12 (el vigente sí)
--     T15 (anon/authenticated NO ejecutan)          ←→  T15b (service_role SÍ)
--
-- ⚠️ CONTRA PRODUCCIÓN NO. Crea usuarios en `auth.users`, donaciones y membresías.
-- Todo va en UNA transacción que termina en ROLLBACK, pero si la corrida se corta a
-- la mitad quedan fantasmas. Se corre contra el Postgres de Docker, y **en la imagen
-- 15**, que es la versión de producción (`pg15-bootstrap/`). Los teléfonos son
-- ficticios (387 555 00xx).
--
-- Leer el resultado: ninguna línea FALLA.
--     ... | grep -E 'FALLA|^ERROR'   -> sin salida = todo bien
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

-- Lo que hace el webhook: una donación aprobada; los triggers arman el aporte.
CREATE FUNCTION pg_temp.pago(p_id text, p_user uuid, p_monto numeric, p_tipo text,
                             p_creado timestamptz, p_reint numeric DEFAULT 0) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.donations (user_id, amount, donation_type, payment_provider, payment_id, status,
                                created_at, mp_status, monto_reintegrado, mp_actualizado_en)
  VALUES (p_user, p_monto, p_tipo, 'mercadopago', p_id, 'approved', p_creado, 'approved', p_reint, now());
$$;

CREATE FUNCTION pg_temp.u(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('e5000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
$$;

-- Lo que llama la Edge Function.
CREATE FUNCTION pg_temp.s(p_phone text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.account_status_for_phone(p_phone);
$$;

-- ---------- Escenario ----------
-- Personas (todas con email VERIFICADO salvo la 6):
--   1 Ana    al día, membresía activa de $7.500, número local guardado '3875550001'
--   2 Beto   en gracia, guardado con símbolos '+54 9 387 555-0002'
--   3 Cora   vencida fuera de la gracia, guardado con 0 '03875550003'
--   4 Dani   sólo donó (un aporte manual del equipo), guardado '543875550004'
--   5 Eli    cuenta sin aportes, guardado '5493875550005'
--   6 Fede   al día pero con el email SIN VERIFICAR, guardado '3875550006'
--   7 y 8    MISMO número en dos cuentas (formatos distintos) → ambiguous
--   9 Gus    al día y SUSPENDIDO por la comisión
--  10 Hugo   una cuota vigente y una donación posterior REINTEGRADA entera
--  11 Ivo    número de otro país (Uruguay)
--  12 Juli   número con el prefijo 15 (limitación conocida)
--  13 Kari   membresía pendiente de hoy;  14 Leo: pendiente de hace 5 días
INSERT INTO auth.users (id, email, created_at, email_confirmed_at, raw_user_meta_data)
SELECT pg_temp.u(n), format('zz-aporte-%s@test.com', n), now(),
       CASE WHEN n = 6 THEN NULL ELSE now() END,
       jsonb_build_object('name', 'ZZ ' || (ARRAY['Ana','Beto','Cora','Dani','Eli','Fede','Gemelo7','Gemelo8',
                                                   'Gus','Hugo','Ivo','Juli','Kari','Leo'])[n])
  FROM generate_series(1, 14) n;

UPDATE public.users u SET phone = v.p
  FROM (VALUES (1,'3875550001'), (2,'+54 9 387 555-0002'), (3,'03875550003'), (4,'543875550004'),
               (5,'5493875550005'), (6,'3875550006'), (7,'3875550007'), (8,'+54 9 387 555-0007'),
               (9,'3875550009'), (10,'3875550010'), (11,'59899123456'), (12,'387155550012'),
               (13,'3875550013'), (14,'3875550014')) AS v(n, p)
 WHERE u.id = pg_temp.u(v.n);

-- Datos que NUNCA tienen que salir.
UPDATE public.users SET dni = '90909090', birth_date = '1971-02-03' WHERE id = pg_temp.u(1);

-- La regla de gracia real de esta base: los fixtures se arman relativos a ella.
SELECT set_config('zz.gracia', COALESCE((SELECT max(dias_gracia) FROM public.reglas_acceso WHERE vigente), 0)::text, false);

-- 1 Ana: membresía activa de $7.500 y una cuota hace 5 días.
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status, preapproval_id)
VALUES ('e5a50000-0000-0000-0000-000000000001', pg_temp.u(1), 'ZZ', 7500, 'mercadopago', 'active', 'ZZ-PRE-1');
SELECT pg_temp.pago('ZZA1', pg_temp.u(1), 5000, 'suscripción', now() - interval '5 days');
-- 2 Beto: la cuota venció hace ~gracia/2 días (dentro de la gracia).
SELECT pg_temp.pago('ZZA2', pg_temp.u(2), 5000, 'suscripción',
                    now() - ((current_setting('zz.gracia')::int / 2 + 31) || ' days')::interval);
-- 3 Cora: la cuota venció hace gracia+30 días (fuera de la gracia).
SELECT pg_temp.pago('ZZA3', pg_temp.u(3), 5000, 'suscripción',
                    now() - ((current_setting('zz.gracia')::int + 61) || ' days')::interval);
-- 4 Dani: un aporte manual del equipo, sin período.
INSERT INTO public.aportes (user_id, monto, fecha, destino_id, origen, concepto, referencia_externa)
VALUES (pg_temp.u(4), 12000, now() - interval '9 days', public.destino_por_defecto(), 'manual',
        'donacion_extraordinaria', 'ZZ-DANI');
-- 6 Fede: al día, pero su email no está verificado.
SELECT pg_temp.pago('ZZA6', pg_temp.u(6), 5000, 'suscripción', now() - interval '3 days');
-- 9 Gus: al día y suspendido.
SELECT pg_temp.pago('ZZA9', pg_temp.u(9), 5000, 'suscripción', now() - interval '3 days');
-- 10 Hugo: cuota hace 20 días + donación hace 5 días, reintegrada entera.
SELECT pg_temp.pago('ZZA10c', pg_temp.u(10), 5000, 'suscripción', now() - interval '20 days');
SELECT pg_temp.pago('ZZA10d', pg_temp.u(10), 20000, 'única', now() - interval '5 days', 20000);
-- 13 y 14: membresías pendientes.
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status, created_at)
VALUES ('e5a50000-0000-0000-0000-000000000013', pg_temp.u(13), 'ZZ', 5000, 'mercadopago', 'pending', now()),
       ('e5a50000-0000-0000-0000-000000000014', pg_temp.u(14), 'ZZ', 5000, 'mercadopago', 'pending', now() - interval '5 days');

\echo ''
\echo '=== T1 · teléfono inválido ==='
DO $$ BEGIN
  PERFORM pg_temp.chk(pg_temp.s('123') = '{"found":false,"reason":"invalid_phone"}'::jsonb, 'T1 corto → invalid_phone');
  PERFORM pg_temp.chk(pg_temp.s(NULL) = '{"found":false,"reason":"invalid_phone"}'::jsonb, 'T1 NULL → invalid_phone');
  PERFORM pg_temp.chk(pg_temp.s('abc') = '{"found":false,"reason":"invalid_phone"}'::jsonb, 'T1 sin dígitos → invalid_phone');
  PERFORM pg_temp.chk(pg_temp.s('1234567890123456') = '{"found":false,"reason":"invalid_phone"}'::jsonb, 'T1 16 dígitos → invalid_phone');
END $$;

\echo ''
\echo '=== T2 · desconocido ==='
DO $$ BEGIN
  PERFORM pg_temp.chk(pg_temp.s('5493875559999') = '{"found":false,"reason":"not_a_client"}'::jsonb, 'T2 número sin cuenta → not_a_client');
END $$;

\echo ''
\echo '=== T3/T4 · el email sin verificar NO basta; el verificado SÍ ==='
DO $$ BEGIN
  PERFORM pg_temp.chk(pg_temp.s('5493875550006') = '{"found":false,"reason":"not_a_client"}'::jsonb,
                      'T3 cuenta con el email sin verificar → not_a_client');
  PERFORM pg_temp.chk((pg_temp.s('5493875550001') ->> 'found')::boolean, 'T4 (par de T3) la misma forma de número, con email verificado → found');
END $$;

\echo ''
\echo '=== T5/T6 · dos cuentas con el mismo número → ambiguous; una sola → found ==='
DO $$ BEGIN
  PERFORM pg_temp.chk(pg_temp.s('5493875550007') = '{"found":false,"reason":"ambiguous"}'::jsonb,
                      'T5 mismo número en dos cuentas (formatos distintos) → ambiguous, no se adivina');
  PERFORM pg_temp.chk(pg_temp.s('5493875550007') ->> 'client_name' IS NULL, 'T5 y no se devuelve el nombre de ninguna');
  PERFORM pg_temp.chk((pg_temp.s('5493875550005') ->> 'found')::boolean, 'T6 (par de T5) un número con una sola cuenta → found');
END $$;

\echo ''
\echo '=== T7 · las cuatro formas del mismo celular argentino se reconocen, en las dos direcciones ==='
DO $$ BEGIN
  PERFORM pg_temp.chk(pg_temp.s('5493875550001') ->> 'client_name' LIKE 'ZZ Ana%', 'T7a Meta 549… ↔ guardado local de 10 dígitos');
  PERFORM pg_temp.chk(pg_temp.s('543875550001') ->> 'client_name' LIKE 'ZZ Ana%', 'T7b Meta 54… (sin el 9) ↔ guardado local');
  PERFORM pg_temp.chk(pg_temp.s('5493875550002') ->> 'client_name' LIKE 'ZZ Beto%', 'T7c guardado con +54 9 y guiones ↔ Meta 549…');
  PERFORM pg_temp.chk(pg_temp.s('5493875550003') ->> 'client_name' LIKE 'ZZ Cora%', 'T7d guardado con 0 inicial ↔ Meta 549…');
  PERFORM pg_temp.chk(pg_temp.s('5493875550004') ->> 'client_name' LIKE 'ZZ Dani%', 'T7e guardado 54… ↔ Meta 549…');
  PERFORM pg_temp.chk(pg_temp.s('543875550005') ->> 'client_name' LIKE 'ZZ Eli%', 'T7f guardado 549… ↔ Meta 54…');
  PERFORM pg_temp.chk(pg_temp.s('3875550004') ->> 'client_name' LIKE 'ZZ Dani%', 'T7g 10 dígitos locales ↔ guardado 54…');
  PERFORM pg_temp.chk(pg_temp.s('59899123456') ->> 'client_name' LIKE 'ZZ Ivo%', 'T7h otro país (Uruguay): se compara tal cual');
  PERFORM pg_temp.chk((pg_temp.s('5493875550012') ->> 'found')::boolean IS NOT TRUE,
                      'T7i LIMITACIÓN CONOCIDA: el prefijo 15 (387 15 55 0012) no se reconoce → not_a_client');
  PERFORM pg_temp.chk((pg_temp.s('5493875550099') ->> 'found')::boolean IS NOT TRUE, 'T7j (par) un número parecido pero distinto no coincide');
END $$;

\echo ''
\echo '=== T8 · al día (Ana: membresía de $7.500 y cuota vigente) ==='
DO $$
DECLARE j jsonb := pg_temp.s('5493875550001'); v record;
BEGIN
  SELECT * INTO v FROM public.acceso_vigente(pg_temp.u(1));
  PERFORM pg_temp.chk((j ->> 'found')::boolean AND j ->> 'client_name' LIKE 'ZZ Ana (Padrino N° %)', format('T8 nombre con su número de padrino (%s)', j ->> 'client_name'));
  PERFORM pg_temp.chk(j -> 'open_charges' = '[]'::jsonb, 'T8 sin cobros abiertos');
  PERFORM pg_temp.chk((j #>> '{summary,overdue_count}')::int = 0 AND (j #>> '{summary,pending_count}')::int = 0, 'T8 sin vencidos ni pendientes');
  PERFORM pg_temp.chk(j #>> '{summary,next_due,service}' = 'Cobertura de cuota mensual vigente'
                      AND (j #>> '{summary,next_due,amount}')::numeric = 7500
                      AND j #>> '{summary,next_due,due_date}' = v.vence_el::text,
                      format('T8 próxima fecha = vence_el (%s) con el importe de su membresía', v.vence_el));
  PERFORM pg_temp.chk(j #>> '{last_payment,service}' = 'Cuota mensual' AND (j #>> '{last_payment,amount}')::numeric = 5000
                      AND j #>> '{last_payment,currency}' = 'ARS' AND j #>> '{last_payment,confirmed_by}' = 'mercado_pago',
                      'T8 último pago: cuota mensual de $5.000, confirmada por Mercado Pago');
END $$;

\echo ''
\echo '=== T9 · en gracia (Beto) y vencida (Cora): un cobro a renovar, y la diferencia importa ==='
DO $$
DECLARE g jsonb := pg_temp.s('5493875550002'); c jsonb := pg_temp.s('5493875550003');
BEGIN
  PERFORM pg_temp.chk(jsonb_array_length(g -> 'open_charges') = 1 AND (g #>> '{open_charges,0,overdue}')::boolean = false
                      AND g #>> '{open_charges,0,service}' LIKE '%período de gracia%', 'T9a en gracia: un cobro, NO vencido, rotulado «en período de gracia»');
  PERFORM pg_temp.chk((g #>> '{summary,overdue_count}')::int = 0 AND (g #>> '{summary,pending_count}')::int = 1
                      AND g #> '{summary,next_due}' <> 'null'::jsonb, 'T9b en gracia: 0 vencidos, 1 pendiente, con próxima fecha');
  PERFORM pg_temp.chk(jsonb_array_length(c -> 'open_charges') = 1 AND (c #>> '{open_charges,0,overdue}')::boolean = true
                      AND c #>> '{open_charges,0,service}' = 'Renovación de cuota mensual', 'T9c vencida: un cobro VENCIDO');
  PERFORM pg_temp.chk((c #>> '{summary,overdue_count}')::int = 1 AND (c #>> '{summary,pending_count}')::int = 1
                      AND c #> '{summary,next_due}' = 'null'::jsonb, 'T9d vencida: 1 vencido, sin próxima fecha');
  PERFORM pg_temp.chk((c #>> '{open_charges,0,amount}')::numeric = 5000 AND c #>> '{open_charges,0,currency}' = 'ARS'
                      AND c #>> '{open_charges,0,due_date}' ~ '^\d{4}-\d{2}-\d{2}$', 'T9e el cobro trae importe, moneda y fecha ISO');
END $$;

\echo ''
\echo '=== T10/T11 · acceso cortado por la comisión → restricted (no «debe»); sin corte → normal ==='
UPDATE public.reglas_membresia SET suspension_corta_acceso = true WHERE vigente;
ALTER TABLE public.miembros DISABLE TRIGGER USER;
UPDATE public.miembros SET estado = 'suspendido' WHERE user_id = pg_temp.u(9);
ALTER TABLE public.miembros ENABLE TRIGGER USER;
DO $$ BEGIN
  PERFORM pg_temp.chk(NOT (SELECT tiene_acceso FROM public.acceso_vigente(pg_temp.u(9))), 'T10 (escenario) el suspendido PIERDE el acceso con el interruptor activado');
  PERFORM pg_temp.chk(pg_temp.s('5493875550009') = '{"found":false,"reason":"restricted"}'::jsonb,
                      'T10 acceso cortado → restricted, sin datos de cuenta ni «cuota vencida»');
END $$;
UPDATE public.reglas_membresia SET suspension_corta_acceso = false WHERE vigente;
DO $$
DECLARE j jsonb := pg_temp.s('5493875550009');
BEGIN
  PERFORM pg_temp.chk((j ->> 'found')::boolean AND j -> 'open_charges' = '[]'::jsonb,
                      'T11 (par de T10) misma persona con el interruptor apagado: conserva el acceso → found y al día');
END $$;

\echo ''
\echo '=== T12/T13 · el último pago es el vigente; un aporte reintegrado entero no cuenta ==='
DO $$
DECLARE j jsonb := pg_temp.s('3875550010'); d jsonb := pg_temp.s('5493875550004');
BEGIN
  PERFORM pg_temp.chk(j #>> '{last_payment,service}' = 'Cuota mensual' AND (j #>> '{last_payment,amount}')::numeric = 5000,
                      'T13 la donación reintegrada entera NO es el último pago: queda la cuota');
  PERFORM pg_temp.chk(d #>> '{last_payment,service}' = 'Donación extraordinaria' AND (d #>> '{last_payment,amount}')::numeric = 12000
                      AND d #>> '{last_payment,confirmed_by}' = 'registro_del_equipo',
                      'T12 (par) un aporte vigente cargado por el equipo SÍ: «registro del equipo»');
END $$;

\echo ''
\echo '=== T14 · cuenta sólo con una donación, y cuenta sin aportes ==='
DO $$
DECLARE d jsonb := pg_temp.s('5493875550004'); e jsonb := pg_temp.s('5493875550005');
BEGIN
  PERFORM pg_temp.chk(d ->> 'client_name' = 'ZZ Dani', 'T14a quien sólo donó no figura como padrino (sin «Padrino N°»)');
  PERFORM pg_temp.chk(d -> 'open_charges' = '[]'::jsonb AND (d #>> '{summary,pending_count}')::int = 0
                      AND d #> '{summary,next_due}' = 'null'::jsonb, 'T14b una donación no genera cuotas pendientes ni vencidas');
  PERFORM pg_temp.chk(e -> 'last_payment' = 'null'::jsonb AND e -> 'open_charges' = '[]'::jsonb
                      AND (e ->> 'found')::boolean, 'T14c cuenta sin aportes: found, sin último pago ni cobros');
END $$;

\echo ''
\echo '=== T15 · permisos: sólo service_role ==='
DO $$ BEGIN
  PERFORM pg_temp.chk(NOT has_function_privilege('anon', 'public.account_status_for_phone(text,uuid[])', 'EXECUTE'), 'T15 anon NO tiene EXECUTE');
  PERFORM pg_temp.chk(NOT has_function_privilege('authenticated', 'public.account_status_for_phone(text,uuid[])', 'EXECUTE'), 'T15 authenticated NO tiene EXECUTE');
  PERFORM pg_temp.chk(has_function_privilege('service_role', 'public.account_status_for_phone(text,uuid[])', 'EXECUTE'), 'T15b (par) service_role SÍ tiene EXECUTE');
END $$;
DO $$ BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM public.account_status_for_phone('5493875550001');
  RESET ROLE;
  PERFORM pg_temp.chk(false, 'T15c una sesión authenticated pudo ejecutarla (oráculo abierto)');
EXCEPTION WHEN insufficient_privilege THEN
  RESET ROLE;
  PERFORM pg_temp.chk(true, 'T15c una sesión authenticated que la llama recibe «permission denied»');
END $$;
DO $$ BEGIN
  SET LOCAL ROLE anon;
  PERFORM public.account_status_for_phone('5493875550001');
  RESET ROLE;
  PERFORM pg_temp.chk(false, 'T15d una sesión anon pudo ejecutarla (oráculo abierto)');
EXCEPTION WHEN insufficient_privilege THEN
  RESET ROLE;
  PERFORM pg_temp.chk(true, 'T15d una sesión anon que la llama recibe «permission denied»');
END $$;
DO $$ BEGIN
  SET LOCAL ROLE service_role;
  PERFORM pg_temp.chk((public.account_status_for_phone('5493875550001') ->> 'found')::boolean, 'T15e (par) service_role la ejecuta y obtiene datos');
  RESET ROLE;
END $$;

\echo ''
\echo '=== T16 · privacidad: nunca sale DNI, email, nacimiento ni datos de terceros ==='
DO $$
DECLARE j jsonb := pg_temp.s('5493875550001'); t text;
BEGIN
  t := j::text;
  PERFORM pg_temp.chk(position('90909090' IN t) = 0, 'T16 el DNI de Ana no está en la respuesta');
  PERFORM pg_temp.chk(position('zz-aporte-1@test.com' IN t) = 0, 'T16 el email de Ana no está en la respuesta');
  PERFORM pg_temp.chk(position('1971' IN t) = 0, 'T16 la fecha de nacimiento no está en la respuesta');
  PERFORM pg_temp.chk(position('ZZ Beto' IN t) = 0 AND position('ZZ Cora' IN t) = 0, 'T16 nadie más aparece en la respuesta');
  PERFORM pg_temp.chk(position('ZZ Ana' IN t) > 0, 'T16b (par) y sí está su nombre: el control no es «no devuelve nada»');
  PERFORM pg_temp.chk((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(j) k)
                      = ARRAY['client_name','contact_name','found','last_payment','open_charges','payment_in_process',
                              'payment_in_review','referenced_charges','summary'],
                      'T16 sólo las claves del contrato (ni una más)');
END $$;

\echo ''
\echo '=== T17 · forma del contrato que lee parseAccountStatus de MatchBot ==='
DO $$
DECLARE j jsonb := pg_temp.s('5493875550003');
BEGIN
  PERFORM pg_temp.chk(jsonb_typeof(j -> 'open_charges') = 'array' AND jsonb_typeof(j -> 'referenced_charges') = 'array'
                      AND jsonb_typeof(j -> 'payment_in_review') = 'boolean' AND jsonb_typeof(j -> 'payment_in_process') = 'boolean'
                      AND jsonb_typeof(j -> 'summary') = 'object' AND jsonb_typeof(j #> '{open_charges,0,amount}') = 'number'
                      AND jsonb_typeof(j #> '{open_charges,0,payment_url}') = 'null',
                      'T17 tipos del contrato; payment_url va null (lo completa la Edge Function)');
  PERFORM pg_temp.chk((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(j #> '{open_charges,0}') k)
                      = ARRAY['amount','currency','due_date','overdue','payment_details','payment_url','service'],
                      'T17 el cobro abierto trae exactamente las claves del contrato');
  PERFORM pg_temp.chk(public.account_status_for_phone('5493875550003', ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[]) = j,
                      'T17 charge_ids se acepta y se ignora (misma respuesta)');
END $$;

\echo ''
\echo '=== T18 · payment_in_process: una membresía pendiente de hoy sí; una vieja no ==='
DO $$ BEGIN
  PERFORM pg_temp.chk((pg_temp.s('5493875550013') ->> 'payment_in_process')::boolean, 'T18 pendiente de hoy → payment_in_process = true');
  PERFORM pg_temp.chk(NOT (pg_temp.s('5493875550014') ->> 'payment_in_process')::boolean, 'T18 (par) pendiente de hace 5 días → false');
  PERFORM pg_temp.chk(NOT (pg_temp.s('5493875550001') ->> 'payment_in_process')::boolean, 'T18 sin membresía pendiente → false');
END $$;

\echo ''
\echo '=== T19 · es sólo lectura y está blindada ==='
DO $$
DECLARE p record; antes bigint; despues bigint;
BEGIN
  SELECT * INTO p FROM pg_proc WHERE oid = 'public.account_status_for_phone(text,uuid[])'::regprocedure;
  PERFORM pg_temp.chk(p.provolatile = 's', 'T19 STABLE (no escribe)');
  PERFORM pg_temp.chk(p.prosecdef, 'T19 SECURITY DEFINER');
  PERFORM pg_temp.chk('search_path=""' = ANY (p.proconfig), 'T19 search_path vacío (todo calificado)');
  SELECT count(*) INTO antes FROM public.aportes;
  PERFORM pg_temp.s('5493875550001'); PERFORM pg_temp.s('5493875550003');
  SELECT count(*) INTO despues FROM public.aportes;
  PERFORM pg_temp.chk(antes = despues, 'T19 consultar no escribe nada');
END $$;

ROLLBACK;
