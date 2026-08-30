-- =====================================================================
-- `reclamar_donaciones()` — que sirva, y sobre todo que no regale accesos.
--
-- Esta función **otorga privilegios**, así que el check más importante no es
-- que funcione: es **T6, que una persona no pueda reclamar el aporte de otra**.
-- Si algún día hay que borrar tests de este archivo, ese es el último.
--
-- ⚠️ CONTRA PRODUCCIÓN NO. Crea usuarios en `auth.users` y donaciones. Todo va
-- dentro de una transacción que revierte, pero si la corrida se corta a la
-- mitad quedan usuarios fantasma. Se corre contra el Postgres de Docker
-- (`supabase/checks/README.md`).
--
-- T0 es un CONTROL NEGATIVO al revés: verifica que el escenario quedó armado
-- como se cree. Sin él, media docena de "PASA" podrían significar solamente
-- que no había datos que probar.
-- =====================================================================

BEGIN;

-- ---------- Escenario ----------
-- Dos personas y una donación anónima hecha con el mail de ANA.
-- DOS COSAS QUE PARECEN RELLENO Y NO LO SON:
--
-- 1. `raw_user_meta_data` con `name` y `created_at`: el trigger
--    `handle_new_user` copia la fila a `public.users`, donde las dos son NOT
--    NULL. Sin ellas el INSERT falla y **todas** las pruebas de abajo devuelven
--    "current transaction is aborted", que es el modo de fallo que §11.4
--    documenta como el más engañoso.
--
-- 2. La confirmación se marca **en el INSERT y no con un UPDATE posterior**.
--    `on_auth_user_email_confirmed` es un `AFTER UPDATE` sin `OF`, así que
--    cualquier update sobre `auth.users` lo dispara — y su función lee
--    `NEW.email_confirmed_at`, que en la imagen de Docker no existe. Un INSERT
--    no lo dispara.
--
-- El nombre de la columna se resuelve como en la migración: Supabase usa
-- `email_confirmed_at`, la imagen de Docker todavía tiene `confirmed_at`.
DO $esc$
DECLARE v_col text;
BEGIN
  SELECT c.column_name INTO v_col
    FROM information_schema.columns c
   WHERE c.table_schema='auth' AND c.table_name='users'
     AND c.column_name IN ('email_confirmed_at','confirmed_at')
   ORDER BY CASE c.column_name WHEN 'email_confirmed_at' THEN 0 ELSE 1 END
   LIMIT 1;

  EXECUTE format($i$
    INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, created_at, %I)
    VALUES
      ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@ejemplo.com',  'authenticated', 'authenticated', '{"name":"ZZ Ana"}',   now(), now()),
      ('bbbbbbbb-0000-0000-0000-000000000002', 'beto@ejemplo.com', 'authenticated', 'authenticated', '{"name":"ZZ Beto"}',  now(), now()),
      -- Carla existe pero NUNCA verificó su email.
      ('cccccccc-0000-0000-0000-000000000003', 'carla@ejemplo.com','authenticated', 'authenticated', '{"name":"ZZ Carla"}', now(), NULL);
  $i$, v_col);
END $esc$;

INSERT INTO public.destinos (id, tipo, nombre, slug, estado, otorga_acceso)
VALUES ('dddddddd-0000-0000-0000-00000000000d', 'institucional', 'ZZ Institucional', 'zz-institucional', 'activo', true);

-- $5.000 = exactamente una cuota de referencia -> 1 mes.
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider, payment_id, status, payer_email, destino_id)
VALUES ('11111111-0000-0000-0000-000000000001', NULL, 5000, 'única', 'mercadopago', 'ZZCLAIM-1', 'approved', 'ANA@Ejemplo.com', 'dddddddd-0000-0000-0000-00000000000d');

\echo ''
\echo '--- T0: CONTROL — el escenario existe y el trigger creó el aporte sin dueño'
SELECT CASE WHEN count(*) = 1 THEN 'PASA · hay 1 aporte sin dueño para reclamar'
            ELSE 'FALLA · el escenario no se armó: ' || count(*) || ' aportes' END
  FROM public.aportes
 WHERE referencia_externa = 'ZZCLAIM-1' AND user_id IS NULL AND acceso_hasta IS NULL;

\echo '--- T1: ANA ve su donación (el match de email NO distingue mayúsculas)'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001', true);
SELECT CASE WHEN count(*) = 1 AND max(meses_estimados) = 1
            THEN 'PASA · 1 donación reclamable, 1 mes'
            ELSE 'FALLA · ' || count(*) || ' reclamables' END
  FROM public.donaciones_reclamables();

\echo '--- T2: 🔒 BETO NO ve la donación de ANA (el ataque que esta función NO puede permitir)'
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002', true);
SELECT CASE WHEN count(*) = 0 THEN 'PASA · Beto no ve nada'
            ELSE 'FALLA · GRAVE: Beto ve ' || count(*) || ' donación(es) ajena(s)' END
  FROM public.donaciones_reclamables();

\echo '--- T3: 🔒 y tampoco puede reclamarla'
SELECT CASE WHEN (SELECT vinculadas FROM public.reclamar_donaciones()) = 0
            THEN 'PASA · Beto no vinculó nada'
            ELSE 'FALLA · GRAVE: Beto se quedó con el aporte de Ana' END;

\echo '--- T4: CARLA, con el mismo mail pero SIN verificar, no ve ni reclama'
RESET ROLE;
UPDATE public.donations SET payer_email = 'carla@ejemplo.com' WHERE payment_id = 'ZZCLAIM-1';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','cccccccc-0000-0000-0000-000000000003', true);
SELECT CASE WHEN count(*) = 0 THEN 'PASA · sin email verificado no hay nada que ver'
            ELSE 'FALLA · un email sin verificar alcanzó' END
  FROM public.donaciones_reclamables();

\echo '--- T5: y el reclamo le da un error explícito, no un silencio'
DO $$
BEGIN
  PERFORM public.reclamar_donaciones();
  RAISE NOTICE 'FALLA · Carla pudo reclamar sin verificar el email';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%verificar el email%' THEN
    RAISE NOTICE 'PASA · error explícito: %', SQLERRM;
  ELSE
    RAISE NOTICE 'FALLA · error inesperado: %', SQLERRM;
  END IF;
END $$;

-- Se devuelve la donación a Ana para el resto de las pruebas.
RESET ROLE;
UPDATE public.donations SET payer_email = 'ANA@Ejemplo.com' WHERE payment_id = 'ZZCLAIM-1';

\echo '--- T6: ANA reclama: 1 donación, 1 mes'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001', true);
SELECT CASE WHEN vinculadas = 1 AND meses_nuevos = 1 AND vence_el = (current_date + interval '1 month')::date
            THEN 'PASA · vinculada, 1 mes, vence ' || vence_el
            ELSE 'FALLA · vinculadas=' || vinculadas || ' meses=' || meses_nuevos || ' vence=' || COALESCE(vence_el::text,'NULL') END
  FROM public.reclamar_donaciones();

\echo '--- T7: ahora tiene acceso vigente'
SELECT CASE WHEN (SELECT tiene_acceso FROM public.mi_acceso()) THEN 'PASA · acceso vigente'
            ELSE 'FALLA · reclamó y sigue sin acceso' END;

\echo '--- T8: IDEMPOTENCIA — reclamar de nuevo no vincula ni regala otro mes'
SELECT CASE WHEN vinculadas = 0 AND meses_nuevos = 0
            THEN 'PASA · el segundo reclamo no hace nada'
            ELSE 'FALLA · duplicó: vinculadas=' || vinculadas || ' meses=' || meses_nuevos END
  FROM public.reclamar_donaciones();

\echo '--- T9: el acceso NO se estiró con el segundo reclamo'
SELECT CASE WHEN (SELECT vence_el FROM public.mi_acceso()) = (current_date + interval '1 month')::date
            THEN 'PASA · sigue venciendo en 1 mes'
            ELSE 'FALLA · el acceso se estiró' END;

\echo '--- T10: el libro NO cambió de monto: se adoptó el aporte, no se creó otro'
RESET ROLE;
SELECT CASE WHEN count(*) = 1 AND sum(monto) = 5000
            THEN 'PASA · 1 aporte, $5.000'
            ELSE 'FALLA · ' || count(*) || ' aportes por $' || COALESCE(sum(monto),0) END
  FROM public.aportes WHERE referencia_externa = 'ZZCLAIM-1';

\echo '--- T11: queda registrado que fue un reclamo y no un pago con sesión'
SELECT CASE WHEN count(*) = 1 THEN 'PASA · reclamado_en escrito'
            ELSE 'FALLA · sin trazabilidad del reclamo' END
  FROM public.donations WHERE payment_id = 'ZZCLAIM-1' AND reclamado_en IS NOT NULL;

\echo '--- T12: 🔒 no existe una variante con parámetro (sería pedir por otro)'
SELECT CASE WHEN count(*) = 0 THEN 'PASA · solo la versión sin parámetros'
            ELSE 'FALLA · hay ' || count(*) || ' variante(s) que aceptan un uuid' END
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('reclamar_donaciones','donaciones_reclamables')
   AND p.pronargs > 0;

\echo '--- T13: 🔒 anon no puede ejecutar ninguna de las dos'
SELECT CASE WHEN bool_and(NOT has_function_privilege('anon', p.oid, 'EXECUTE'))
            THEN 'PASA · anon sin EXECUTE'
            ELSE 'FALLA · anon puede preguntar por emails ajenos' END
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('reclamar_donaciones','donaciones_reclamables');

\echo '--- T14: dos donaciones encadenan períodos, no los solapan'
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider, payment_id, status, payer_email, destino_id)
VALUES
  ('22222222-0000-0000-0000-000000000002', NULL, 5000, 'única', 'mercadopago', 'ZZCLAIM-2', 'approved', 'ana@ejemplo.com', 'dddddddd-0000-0000-0000-00000000000d'),
  ('33333333-0000-0000-0000-000000000003', NULL, 5000, 'única', 'mercadopago', 'ZZCLAIM-3', 'approved', 'ana@ejemplo.com', 'dddddddd-0000-0000-0000-00000000000d');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001', true);
-- La ventana no es un margen de error: `proximo_acceso_desde()` arranca el
-- período nuevo AL DÍA SIGUIENTE del anterior, justamente para no solaparlos,
-- así que tres cuotas encadenadas dan tres meses **más un día por empalme**.
-- Fijar la fecha exacta sería copiar la implementación al test; lo que importa
-- es que no falte un mes (se pisaron) ni sobre uno (se contó dos veces).
SELECT CASE WHEN vinculadas = 2
             AND vence_el >= (current_date + interval '3 months')::date
             AND vence_el <  (current_date + interval '3 months 5 days')::date
            THEN 'PASA · 2 más, acceso hasta ' || vence_el || ' (3 meses encadenados)'
            ELSE 'FALLA · vinculadas=' || vinculadas || ' vence=' || COALESCE(vence_el::text,'NULL') END
  FROM public.reclamar_donaciones();

\echo '--- T15: y no hay períodos superpuestos'
RESET ROLE;
SELECT CASE WHEN count(*) = 0 THEN 'PASA · sin solapamientos'
            ELSE 'FALLA · ' || count(*) || ' par(es) de períodos superpuestos' END
  FROM public.aportes a
  JOIN public.aportes b
    ON a.user_id = b.user_id AND a.id <> b.id
   AND daterange(a.acceso_desde, a.acceso_hasta, '[]') && daterange(b.acceso_desde, b.acceso_hasta, '[]')
 WHERE a.user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

ROLLBACK;

\echo ''
\echo '--- T16: no quedó residuo'
SELECT CASE WHEN count(*) = 0 THEN 'PASA · sin residuo'
            ELSE 'FALLA · quedaron ' || count(*) || ' filas ZZCLAIM' END
  FROM public.donations WHERE payment_id LIKE 'ZZCLAIM%';
