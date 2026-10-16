-- =====================================================================
-- P0 — nadie desde el navegador escribe `donations` ni `memberships`
-- (migración 20261016110000_p0_cerrar_escritura_pagos.sql)
--
-- La migración verifica PERMISOS en el catálogo; esto verifica el EFECTO:
-- una sesión real intenta escribir y falla, y el webhook (service_role) sigue
-- registrando un pago de punta a punta —donación, aporte en el libro,
-- reproceso idempotente y cobro de una suscripción—.
--
-- CADA NEGATIVO TIENE SU POSITIVO: «authenticated no puede escribir» al lado
-- de «authenticated sí puede leer lo suyo» y de «service_role sí escribe».
-- Sin los positivos, una base que rechaza TODO pasaría igual.
--
-- ⚠️ Corrido ANTES de la migración tiene que dar FALLA (es el control de que
-- este check discrimina). Todo va en una transacción con ROLLBACK.
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

-- Intenta una sentencia con el rol vigente: true SOLO si la base la rechazó por
-- PERMISOS (42501). Cualquier otro rechazo —una FK, un CHECK— devuelve false y
-- lo informa: que algo falle por otro motivo no prueba que esté cerrado.
-- Siempre deshace lo que haya hecho (el bloque con EXCEPTION es un savepoint).
CREATE FUNCTION pg_temp.rechaza(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'zz-se-ejecuto';
  EXCEPTION
    WHEN insufficient_privilege THEN RETURN true;
    WHEN raise_exception THEN
      IF SQLERRM = 'zz-se-ejecuto' THEN
        RAISE NOTICE '      (se EJECUTÓ: la base lo permitió)';
        RETURN false;
      END IF;
      RAISE NOTICE '      (rechazado por otro motivo: %)', SQLERRM;
      RETURN false;
    WHEN OTHERS THEN
      RAISE NOTICE '      (rechazado por otro motivo, no por permisos: % %)', SQLSTATE, SQLERRM;
      RETURN false;
  END;
END $$;

-- Para el webhook: ejecuta y CONSERVA el efecto; true si no hubo error.
CREATE FUNCTION pg_temp.ejecuta(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '      (falló: % %)', SQLSTATE, SQLERRM;
  RETURN false;
END $$;

INSERT INTO auth.users (id, email, created_at, raw_user_meta_data) VALUES
  ('e5c00000-0000-0000-0000-000000000001', 'zz-p0-socia@test.com', now(), '{"name":"ZZP0 Socia"}');

-- Lo que ya existe, cargado como lo cargaría el webhook (dueño de la tabla).
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider, payment_id, status)
VALUES ('e5c0d000-0000-0000-0000-000000000001', 'e5c00000-0000-0000-0000-000000000001',
        5000, 'única', 'mercadopago', 'ZZP0-EXISTE', 'pending');
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status, preapproval_id)
VALUES ('e5c0e000-0000-0000-0000-000000000001', 'e5c00000-0000-0000-0000-000000000001',
        'mensual', 5000, 'mercadopago', 'pending', 'ZZP0-PRE');

\echo ''
\echo '=== P1 · una sesión autenticada NO escribe pagos ni membresías ==='
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e5c00000-0000-0000-0000-000000000001', true);

SELECT pg_temp.chk(pg_temp.rechaza($q$
  INSERT INTO public.donations (user_id, amount, donation_type, payment_id, status)
  VALUES ('e5c00000-0000-0000-0000-000000000001', 30000, 'única', 'ZZP0-FALSA', 'approved') $q$),
  'P1a no puede insertarse una donación propia approved');
SELECT pg_temp.chk(pg_temp.rechaza($q$
  INSERT INTO public.donations (user_id, amount, donation_type, payment_id, status)
  VALUES (NULL, 30000, 'única', 'ZZP0-FALSA-ANON', 'approved') $q$),
  'P1b no puede insertar una donación anónima approved');
SELECT pg_temp.chk(pg_temp.rechaza($q$
  UPDATE public.donations SET status = 'approved', amount = 999999 WHERE payment_id = 'ZZP0-EXISTE' $q$),
  'P1c no puede aprobar (UPDATE) su propia donación pendiente');
SELECT pg_temp.chk(pg_temp.rechaza($q$ DELETE FROM public.donations WHERE payment_id = 'ZZP0-EXISTE' $q$),
  'P1d no puede borrar donaciones');
-- Defensa en profundidad: PostgREST no expone TRUNCATE y la FK desde
-- `aportes` lo frena igual. Lo que se exige acá es que lo frene el PERMISO.
SELECT pg_temp.chk(pg_temp.rechaza($q$ TRUNCATE public.donations $q$),
  'P1e no tiene permiso de TRUNCATE sobre donations (no pasa por RLS)');
SELECT pg_temp.chk(pg_temp.rechaza($q$
  INSERT INTO public.memberships (user_id, plan, amount, payment_method, status, last_payment_id)
  VALUES ('e5c00000-0000-0000-0000-000000000001', 'x', 5000, 'mp', 'active', 'ZZP0-FALSO') $q$),
  'P1f no puede insertarse una membresía activa con cobro');
SELECT pg_temp.chk(pg_temp.rechaza($q$
  UPDATE public.memberships SET status = 'active', last_payment_id = 'ZZP0-FALSO'
   WHERE preapproval_id = 'ZZP0-PRE' $q$),
  'P1g no puede activar (UPDATE) su propia membresía');
SELECT pg_temp.chk(pg_temp.rechaza($q$ TRUNCATE public.memberships $q$),
  'P1h no tiene permiso de TRUNCATE sobre memberships');

-- Positivo: el historial del panel sigue funcionando.
SELECT pg_temp.chk((SELECT count(*) FROM public.donations)   = 1
               AND (SELECT count(*) FROM public.memberships) = 1,
               'P1i control: SÍ lee su donación y su membresía (el historial no se rompe)');
SELECT pg_temp.chk(NOT public.tiene_acceso(), 'P1j control: no ganó acceso con ninguno de los intentos');
RESET ROLE;

\echo ''
\echo '=== P2 · anon tampoco ==='
SET LOCAL ROLE anon;
SELECT pg_temp.chk(pg_temp.rechaza($q$
  INSERT INTO public.donations (amount, donation_type, payment_id, status)
  VALUES (30000, 'única', 'ZZP0-ANON', 'approved') $q$),
  'P2a anon no puede insertar donaciones');
SELECT pg_temp.chk(pg_temp.rechaza($q$ TRUNCATE public.donations $q$), 'P2b anon no tiene permiso de TRUNCATE');
RESET ROLE;
SELECT pg_temp.chk((SELECT count(*) FROM public.aportes WHERE referencia_externa LIKE 'ZZP0-FALS%'
                                                          OR referencia_externa = 'ZZP0-ANON') = 0,
                   'P2c ningún intento dejó rastro en el libro');

\echo ''
\echo '=== P3 · el webhook (service_role) SÍ registra un pago, como hoy ==='
SET LOCAL ROLE service_role;
-- Lo que hace `index.js` del webhook hoy: buscar por payment_id, insertar,
-- y ante un payment.updated, actualizar.
SELECT pg_temp.chk(pg_temp.ejecuta($q$
  INSERT INTO public.donations (user_id, amount, donation_type, payment_provider, payment_id, status, payer_email)
  VALUES ('e5c00000-0000-0000-0000-000000000001', 5000, 'suscripción', 'mercadopago', 'ZZP0-WEBHOOK', 'approved',
          'zz-p0-socia@test.com') $q$),
  'P3a el webhook inserta el cobro');
SELECT pg_temp.chk(pg_temp.ejecuta($q$
  UPDATE public.donations SET status = 'approved', updated_at = now() WHERE payment_id = 'ZZP0-WEBHOOK' $q$),
  'P3b el webhook reprocesa (payment.updated) sin error');
SELECT pg_temp.chk(pg_temp.ejecuta($q$
  UPDATE public.memberships SET status = 'active', last_payment_id = 'ZZP0-WEBHOOK',
         last_payment_status = 'approved', updated_at = now()
   WHERE preapproval_id = 'ZZP0-PRE' $q$),
  'P3c el webhook anota el cobro en la suscripción');
SELECT pg_temp.chk(pg_temp.ejecuta($q$
  INSERT INTO public.memberships (user_id, plan, amount, payment_method, status, preapproval_id)
  VALUES ('e5c00000-0000-0000-0000-000000000001', 'mensual', 5000, 'mercadopago', 'pending', 'ZZP0-PRE-2') $q$),
  'P3d el webhook da de alta una suscripción nueva (preapproval.created)');
RESET ROLE;

SELECT pg_temp.chk((SELECT count(*) FROM public.donations WHERE payment_id = 'ZZP0-WEBHOOK') = 1
               AND (SELECT count(*) FROM public.aportes   WHERE referencia_externa = 'ZZP0-WEBHOOK') = 1,
               'P3e el cobro llegó al libro: 1 donación y 1 aporte, aunque se reprocesó');
SELECT pg_temp.chk((SELECT origen FROM public.aportes WHERE referencia_externa = 'ZZP0-WEBHOOK') = 'membresia'
               AND public.tiene_acceso('e5c00000-0000-0000-0000-000000000001'),
               'P3f y la cadena sigue entera: se reclasificó como cuota y otorga acceso');

ROLLBACK;

\echo ''
\echo '=== limpieza: debe dar 0 ==='
SELECT (SELECT count(*) FROM public.donations WHERE payment_id LIKE 'ZZP0-%')
     + (SELECT count(*) FROM auth.users WHERE id = 'e5c00000-0000-0000-0000-000000000001') AS residuo;
