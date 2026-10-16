-- =====================================================================
-- P0 · paso 4 — POST CHEQUEO, después de aplicar 20261016110000
--
-- Uso:  tools/db.sh sql < supabase/data/p0_3_postcheck.sql
-- Tiene que terminar con «POST CHEQUEO OK» y «residuo = 0».
--
-- ⚠️ SOLO DESPUÉS DE APLICAR LA MIGRACIÓN. Antes, los intentos de escritura de
-- la sección B **se ejecutarían** (es el agujero); se deshacen con el ROLLBACK
-- final, pero no hay motivo para hacerlo.
--
-- Todo corre en UNA transacción que termina en ROLLBACK: no deja nada escrito.
-- No es READ ONLY a propósito: una transacción de solo lectura rechaza un
-- INSERT por ser de solo lectura ANTES de mirar los permisos, y no probaría nada.
--
--   A. Catálogo: nadie de anon/authenticated puede escribir; service_role sí.
--   B. Una sesión REAL (la cuenta con más donaciones, elegida acá: el repo es
--      público y no lleva ids de personas) intenta escribir: tiene que fallar
--      por PERMISOS (42501), no por otra cosa.
--   C. Esa misma sesión LEE su historial completo: lo que ve con su rol es
--      exactamente lo que tiene.
--   D. El webhook (service_role) registra un pago y da de alta una suscripción,
--      como hace hoy (insert + update). Filas marcadas `p0-verificacion`, en
--      estado `pending` (no disparan aportes), y se deshacen con el ROLLBACK.
--   E. Huella de datos, para comparar con la foto del paso 1.
--
-- No modifica el SELECT de `anon` sobre `donations`: queda como estaba y se
-- revisa aparte (ver p0_2_precheck.sql).
-- =====================================================================
\pset footer off
BEGIN;
-- Sin eco de los pasos intermedios: imprimirían el id de la cuenta elegida.
\o /dev/null

CREATE TEMP TABLE p0_resultado (orden serial, ok boolean, detalle text) ON COMMIT DROP;
GRANT INSERT, SELECT ON p0_resultado TO authenticated, anon, service_role;
GRANT USAGE ON SEQUENCE p0_resultado_orden_seq TO authenticated, anon, service_role;

CREATE FUNCTION pg_temp.anotar(p_ok boolean, p_detalle text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO p0_resultado (ok, detalle) VALUES (COALESCE(p_ok, false), p_detalle);
$$;

-- true SOLO si la base rechazó por PERMISOS. Siempre deshace lo que intentó.
CREATE FUNCTION pg_temp.rechaza(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'p0-se-ejecuto';
  EXCEPTION
    WHEN insufficient_privilege THEN RETURN true;
    WHEN OTHERS THEN
      RAISE NOTICE '      (%: %)', CASE WHEN SQLERRM = 'p0-se-ejecuto' THEN 'SE EJECUTÓ' ELSE 'rechazado por OTRO motivo' END, SQLERRM;
      RETURN false;
  END;
END $$;

-- Ejecuta y conserva el efecto (hasta el ROLLBACK final); true si no hubo error.
CREATE FUNCTION pg_temp.ejecuta(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '      (falló: % %)', SQLSTATE, SQLERRM;
  RETURN false;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.anotar(boolean, text), pg_temp.rechaza(text), pg_temp.ejecuta(text)
  TO authenticated, anon, service_role;

-- ---- A. Catálogo ------------------------------------------------------
SELECT pg_temp.anotar(NOT EXISTS (
         SELECT 1 FROM pg_class c
          CROSS JOIN (VALUES ('anon'), ('authenticated')) ro(rolname)
          CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
          WHERE c.oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
            AND has_table_privilege(ro.rolname, c.oid, p.priv)),
       'A1 anon/authenticated sin INSERT/UPDATE/DELETE/TRUNCATE en donations y memberships');
SELECT pg_temp.anotar(NOT EXISTS (
         SELECT 1 FROM pg_policy
          WHERE polrelid IN ('public.donations'::regclass, 'public.memberships'::regclass)
            AND polcmd IN ('a', 'w', 'd', '*')),
       'A2 no queda ninguna policy de escritura');
SELECT pg_temp.anotar(
         has_table_privilege('service_role', 'public.donations', 'INSERT')
     AND has_table_privilege('service_role', 'public.donations', 'UPDATE')
     AND has_table_privilege('service_role', 'public.memberships', 'INSERT')
     AND has_table_privilege('service_role', 'public.memberships', 'UPDATE'),
       'A3 service_role (webhook) conserva INSERT/UPDATE');
SELECT pg_temp.anotar(
         has_table_privilege('authenticated', 'public.donations', 'SELECT')
     AND has_table_privilege('authenticated', 'public.memberships', 'SELECT'),
       'A4 authenticated conserva SELECT (historial)');
SELECT pg_temp.anotar(has_table_privilege('anon', 'public.donations', 'SELECT'),
       'A5 anon conserva su SELECT sobre donations: la migración NO lo modifica (se revisa aparte)');

-- ---- B y C. Una sesión real -----------------------------------------
-- La cuenta con más donaciones propias. Se guarda en un setting, no en el repo.
SELECT set_config('p0.uid', (SELECT user_id::text FROM public.donations WHERE user_id IS NOT NULL
                              GROUP BY user_id ORDER BY count(*) DESC, user_id LIMIT 1), true);
-- Lo que esa sesión DEBERÍA ver: lo propio, o todo si es admin (la policy de
-- lectura es `auth.uid() = user_id OR check_is_admin()`).
SELECT set_config('p0.es_admin', COALESCE((SELECT (role = 'admin')::text FROM public.users
                                             WHERE id::text = current_setting('p0.uid')), 'false'), true);
SELECT set_config('p0.donaciones_propias',
         (SELECT count(*)::text FROM public.donations
           WHERE current_setting('p0.es_admin') = 'true' OR user_id::text = current_setting('p0.uid')), true);
SELECT set_config('p0.membresias_propias',
         (SELECT count(*)::text FROM public.memberships
           WHERE current_setting('p0.es_admin') = 'true' OR user_id::text = current_setting('p0.uid')), true);
SELECT pg_temp.anotar(current_setting('p0.uid', true) <> '', 'B0 hay una cuenta real con donaciones para probar');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('p0.uid'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('p0.uid'), 'role', 'authenticated')::text, true);

SELECT pg_temp.anotar(pg_temp.rechaza(format(
  $q$INSERT INTO public.donations (user_id, amount, donation_type, payment_id, status)
     VALUES (%L, 30000, 'única', 'p0-verificacion-intento', 'approved')$q$, current_setting('p0.uid'))),
  'B1 la sesión NO puede insertarse una donación approved');
SELECT pg_temp.anotar(pg_temp.rechaza(
  $q$INSERT INTO public.donations (amount, donation_type, payment_id, status)
     VALUES (30000, 'única', 'p0-verificacion-intento-anon', 'approved')$q$),
  'B2 la sesión NO puede insertar una donación anónima');
SELECT pg_temp.anotar(pg_temp.rechaza(format(
  $q$UPDATE public.donations SET amount = amount WHERE user_id = %L$q$, current_setting('p0.uid'))),
  'B3 la sesión NO puede actualizar sus donaciones');
SELECT pg_temp.anotar(pg_temp.rechaza(format(
  $q$DELETE FROM public.donations WHERE user_id = %L$q$, current_setting('p0.uid'))),
  'B4 la sesión NO puede borrar sus donaciones');
SELECT pg_temp.anotar(pg_temp.rechaza(format(
  $q$INSERT INTO public.memberships (user_id, plan, amount, payment_method, status, last_payment_id)
     VALUES (%L, 'p0', 5000, 'mp', 'active', 'p0-verificacion-intento')$q$, current_setting('p0.uid'))),
  'B5 la sesión NO puede insertarse una membresía activa con cobro');
SELECT pg_temp.anotar(pg_temp.rechaza(format(
  $q$UPDATE public.memberships SET status = status WHERE user_id = %L$q$, current_setting('p0.uid'))),
  'B6 la sesión NO puede actualizar sus membresías');

SELECT pg_temp.anotar(
         (SELECT count(*) FROM public.donations)::text = current_setting('p0.donaciones_propias')
     AND (SELECT count(*) FROM public.memberships)::text = current_setting('p0.membresias_propias')
     AND current_setting('p0.donaciones_propias')::int > 0,
       format('C1 la sesión LEE exactamente lo que le corresponde (%s donaciones, %s membresías; %s)',
              current_setting('p0.donaciones_propias'), current_setting('p0.membresias_propias'),
              CASE WHEN current_setting('p0.es_admin') = 'true' THEN 'cuenta admin: ve todo'
                   ELSE 'solo lo propio' END));
RESET ROLE;

SET LOCAL ROLE anon;
SELECT pg_temp.anotar(pg_temp.rechaza(
  $q$INSERT INTO public.donations (amount, donation_type, payment_id, status)
     VALUES (30000, 'única', 'p0-verificacion-intento-anon2', 'approved')$q$),
  'B7 anon NO puede insertar donaciones');
RESET ROLE;

-- ---- D. El webhook -------------------------------------------------------
SET LOCAL ROLE service_role;
SELECT pg_temp.anotar(pg_temp.ejecuta(
  $q$INSERT INTO public.donations (amount, donation_type, payment_provider, payment_id, status)
     VALUES (1, 'única', 'mercadopago', 'p0-verificacion-' || txid_current(), 'pending')$q$),
  'D1 el webhook inserta un pago');
SELECT pg_temp.anotar(pg_temp.ejecuta(
  $q$UPDATE public.donations SET status = 'pending', updated_at = now()
      WHERE payment_id = 'p0-verificacion-' || txid_current()$q$),
  'D2 el webhook actualiza ese pago (payment.updated)');
SELECT pg_temp.anotar(pg_temp.ejecuta(
  $q$INSERT INTO public.memberships (plan, amount, payment_method, status, preapproval_id)
     VALUES ('p0', 1, 'mercadopago', 'pending', 'p0-verificacion-' || txid_current())$q$),
  'D3 el webhook da de alta una suscripción (preapproval.created)');
SELECT pg_temp.anotar(pg_temp.ejecuta(
  $q$UPDATE public.memberships SET updated_at = now()
      WHERE preapproval_id = 'p0-verificacion-' || txid_current()$q$),
  'D4 el webhook actualiza esa suscripción');
SELECT pg_temp.anotar(
         (SELECT count(*) FROM public.donations   WHERE payment_id     = 'p0-verificacion-' || txid_current()) = 1
     AND (SELECT count(*) FROM public.memberships WHERE preapproval_id = 'p0-verificacion-' || txid_current()) = 1,
       'D5 las dos filas del webhook existen dentro de la transacción');
RESET ROLE;

-- ---- Resultado -----------------------------------------------------------
\o
SELECT CASE WHEN ok THEN 'PASA ' ELSE 'FALLA' END AS r, detalle FROM p0_resultado ORDER BY orden;
SELECT CASE WHEN bool_and(ok) THEN 'POST CHEQUEO OK' ELSE 'POST CHEQUEO FALLÓ — ver líneas FALLA' END AS veredicto
  FROM p0_resultado;

ROLLBACK;

-- ---- E. Nada quedó escrito, y la huella para comparar con la foto -------
SELECT (SELECT count(*) FROM public.donations   WHERE payment_id     LIKE 'p0-verificacion%')
     + (SELECT count(*) FROM public.memberships WHERE preapproval_id LIKE 'p0-verificacion%') AS residuo;

SELECT 'donations' AS tabla, count(*) AS filas, max(updated_at) AS ultima_escritura,
       md5(COALESCE(string_agg(id::text || '|' || COALESCE(status, '') || '|' || amount::text || '|' ||
                               COALESCE(user_id::text, '-') || '|' || COALESCE(payment_id, '-'), ',' ORDER BY id), '')) AS huella
  FROM public.donations
UNION ALL
SELECT 'memberships', count(*), max(updated_at),
       md5(COALESCE(string_agg(id::text || '|' || COALESCE(status, '') || '|' || amount::text || '|' ||
                               COALESCE(user_id::text, '-') || '|' || COALESCE(last_payment_id, '-'), ',' ORDER BY id), ''))
  FROM public.memberships
UNION ALL
SELECT 'aportes', count(*), max(created_at),
       md5(COALESCE(string_agg(id::text || '|' || monto::text || '|' || COALESCE(user_id::text, '-') || '|' ||
                               COALESCE(acceso_hasta::text, '-'), ',' ORDER BY id), ''))
  FROM public.aportes;
