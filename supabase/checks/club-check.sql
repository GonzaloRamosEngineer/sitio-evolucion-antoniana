-- =====================================================================
-- CLUB FASE 2 — que el canje no se pueda fabricar desde el browser.
--
-- `club_canjes` es la tabla que otorga VALOR ECONÓMICO: del otro lado hay un
-- comercio esperando que le paguen. Si alguien con las devtools abiertas puede
-- insertar una fila 'confirmado', el club deja de tener sentido y la entidad
-- queda debiendo plata que nadie consumió.
--
-- Por eso el check más importante de este archivo NO es que el flujo funcione:
-- son **T1 y T2**, que `authenticated` no pueda insertar ni auto-confirmar. Si
-- algún día hay que borrar pruebas de acá, esas dos son las últimas.
--
-- ⚠️ LOS CONTROLES POSITIVOS NO SON RELLENO (§11.6.3, cuarta vez que se
-- escribe). "Nadie puede escribir" y "la tabla es inescribible para todos, y el
-- módulo no funciona" se ven IDÉNTICOS desde afuera. Por eso al lado de cada
-- negativo hay un positivo:
--
--     T1/T2 (authenticated no escribe)   ←→  T12 (service_role SÍ escribe)
--     T3    (anon no ve canjes)          ←→  T4  (el socio SÍ ve el suyo)
--     T5    (Beto no ve el de Ana)       ←→  T6  (el cajero del comercio SÍ)
--     T9    (la red bloquea el duplicado)←→  T10 (y NO bloquea de más)
--
-- ⚠️ CONTRA PRODUCCIÓN NO. Crea usuarios en `auth.users`, comercios y canjes.
-- Todo va dentro de una transacción que revierte, pero si la corrida se corta a
-- la mitad quedan fantasmas. Se corre contra el Postgres de Docker
-- (`supabase/checks/README.md`).
-- =====================================================================

BEGIN;

-- ---------- Escenario ----------
-- Dos comercios que NO se pueden ver entre sí, dos socios, dos cajeros.
--
-- El nombre de la columna de confirmación se resuelve como en los otros checks:
-- Supabase usa `email_confirmed_at`, la imagen de Docker todavía tiene
-- `confirmed_at`. Y `raw_user_meta_data.name` es obligatorio porque
-- `handle_new_user` copia la fila a `public.users`, donde `name` es NOT NULL:
-- sin eso el INSERT falla y TODAS las pruebas de abajo devuelven "current
-- transaction is aborted", el modo de fallo que §11.4 documenta como el más
-- engañoso.
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
      ('a0000000-0000-0000-0000-0000000000a1', 'zz-ana@ejemplo.com',   'authenticated','authenticated','{"name":"ZZ Ana"}',      now(), now()),
      ('b0000000-0000-0000-0000-0000000000b1', 'zz-beto@ejemplo.com',  'authenticated','authenticated','{"name":"ZZ Beto"}',     now(), now()),
      ('c0000000-0000-0000-0000-0000000000c1', 'zz-cajA@ejemplo.com',  'authenticated','authenticated','{"name":"ZZ Cajero A"}', now(), now()),
      ('d0000000-0000-0000-0000-0000000000d1', 'zz-cajB@ejemplo.com',  'authenticated','authenticated','{"name":"ZZ Cajero B"}', now(), now());
  $i$, v_col);
END $esc$;

INSERT INTO public.club_comercios (id, nombre, slug, estado) VALUES
  ('11111111-0000-0000-0000-000000000001', 'ZZ Comercio A', 'zz-comercio-a', 'activo'),
  ('22222222-0000-0000-0000-000000000002', 'ZZ Comercio B', 'zz-comercio-b', 'activo');

INSERT INTO public.club_sucursales (id, comercio_id, nombre) VALUES
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'ZZ Sucursal Centro');

-- Uno activo y uno en borrador: el borrador es el control de que el catálogo
-- público no filtra lo que la entidad todavía está redactando (12.3).
INSERT INTO public.club_beneficios
  (id, comercio_id, titulo, tipo, valor, estado, limite_por_persona, ventana) VALUES
  ('44444444-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
   'ZZ 30% en todo', 'porcentaje', 30, 'activo', 1, 'dia'),
  ('55555555-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   'ZZ Borrador sin publicar', 'porcentaje', 50, 'borrador', NULL, NULL);

INSERT INTO public.club_comercio_usuarios (comercio_id, user_id, rol) VALUES
  ('11111111-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-0000000000c1', 'dueno'),
  ('22222222-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-0000000000d1', 'dueno');

-- El canje pendiente de Ana, con la clave del límite "uno por día".
INSERT INTO public.club_canjes
  (id, beneficio_id, sucursal_id, user_id, codigo, estado, expira_en, clave_limite) VALUES
  ('66666666-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000004',
   '33333333-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-0000000000a1',
   'ZZ2345', 'pendiente', now() + interval '5 minutes',
   'dia:' || current_date::text);

\echo ''
\echo '--- T0: CONTROL — el escenario quedó armado (sin esto, media docena de PASA no significan nada)'
SELECT CASE WHEN (SELECT count(*) FROM public.club_canjes WHERE codigo='ZZ2345') = 1
             AND (SELECT count(*) FROM public.club_comercios WHERE slug LIKE 'zz-%') = 2
             AND (SELECT count(*) FROM public.club_comercio_usuarios) = 2
            THEN 'PASA · 2 comercios, 2 cajeros, 1 canje pendiente'
            ELSE 'FALLA · el escenario no se armó' END;

\echo ''
\echo '=== LO QUE ESTE MÓDULO NO PUEDE PERMITIR ==='
\echo '--- T1: 🔒 authenticated NO puede INSERTAR un canje (fabricar plata)'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-0000000000a1', true);
DO $$
BEGIN
  INSERT INTO public.club_canjes (beneficio_id, user_id, codigo, estado, expira_en, confirmado_en, cajero_id)
  VALUES ('44444444-0000-0000-0000-000000000004','a0000000-0000-0000-0000-0000000000a1',
          'ZZ9999','confirmado', now() + interval '5 minutes', now(),
          'a0000000-0000-0000-0000-0000000000a1');
  RAISE NOTICE 'FALLA · GRAVE: un socio se autogeneró un canje CONFIRMADO';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  RAISE NOTICE 'PASA · el insert se rechaza (%)', SQLERRM;
END $$;

\echo '--- T2: 🔒 authenticated NO puede auto-confirmar el canje que sí es suyo'
DO $$
DECLARE v_filas integer;
BEGIN
  UPDATE public.club_canjes
     SET estado='confirmado', confirmado_en=now(), cajero_id='a0000000-0000-0000-0000-0000000000a1'
   WHERE codigo='ZZ2345';
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  IF v_filas = 0 THEN
    RAISE NOTICE 'PASA · 0 filas: RLS no deja actualizar ni el propio';
  ELSE
    RAISE NOTICE 'FALLA · GRAVE: el socio confirmó su propio canje (% filas)', v_filas;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASA · el update se rechaza (%)', SQLERRM;
END $$;

\echo '--- T3: 🔒 anon no ve NINGÚN canje'
-- Va en un DO con EXCEPTION y no como SELECT porque `anon` no tiene ni el
-- GRANT de lectura: la base no le devuelve 0 filas, le niega la tabla entera.
-- Escrito como un SELECT pelado, el error aborta la transacción y las diez
-- pruebas siguientes informan "current transaction is aborted" — que es el modo
-- de fallo que §11.4 marca como el más engañoso, porque parece que fallaron
-- ellas. Las dos formas de no ver son un PASA; lo que importa es que no vea.
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.club_canjes;
  IF v_n = 0 THEN
    RAISE NOTICE 'PASA · anon lee la tabla pero no ve ninguna fila';
  ELSE
    RAISE NOTICE 'FALLA · GRAVE: anon ve % canje(s)', v_n;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASA · a anon se le niega la tabla entera (%)', SQLERRM;
END $$;

\echo ''
\echo '=== CONTROLES POSITIVOS — que lo legítimo SÍ pase ==='
\echo '--- T4: el socio SÍ ve el suyo (si esto falla, T3 pasaba por tabla vacía)'
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-0000000000a1', true);
SELECT CASE WHEN count(*) = 1 THEN 'PASA · Ana ve su canje'
            ELSE 'FALLA · Ana no ve el suyo (' || count(*) || ')' END
  FROM public.club_canjes;

\echo '--- T5: 🔒 Beto NO ve el canje de Ana'
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-0000000000b1', true);
SELECT CASE WHEN count(*) = 0 THEN 'PASA · Beto no ve nada'
            ELSE 'FALLA · GRAVE: Beto ve ' || count(*) || ' canje(s) ajeno(s)' END
  FROM public.club_canjes;

\echo '--- T6: el cajero del comercio A SÍ ve el canje de su comercio'
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000c1', true);
SELECT CASE WHEN count(*) = 1 THEN 'PASA · el cajero ve el canje de su local'
            ELSE 'FALLA · el cajero no ve el canje (' || count(*) || ') — el panel /comercio no funcionaría' END
  FROM public.club_canjes;

\echo '--- T7: 🔒 el cajero del comercio B NO ve nada del comercio A'
SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-0000000000d1', true);
SELECT CASE WHEN count(*) = 0 THEN 'PASA · los comercios no se ven entre sí'
            ELSE 'FALLA · GRAVE: un comercio ve los canjes de otro' END
  FROM public.club_canjes;

\echo '--- T8: el catálogo público muestra lo activo y NO el borrador'
RESET ROLE;
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) FILTER (WHERE titulo = 'ZZ 30% en todo') = 1
             AND count(*) FILTER (WHERE titulo = 'ZZ Borrador sin publicar') = 0
            THEN 'PASA · ve el activo, no ve el borrador'
            ELSE 'FALLA · el catálogo filtra mal' END
  FROM public.club_beneficios;

\echo ''
\echo '=== LA RED DE CONTENCIÓN DEL LÍMITE (el doble clic, no el atacante) ==='
\echo '--- T9: un segundo canje del mismo día para el mismo beneficio se rechaza'
RESET ROLE;
DO $$
BEGIN
  INSERT INTO public.club_canjes
    (beneficio_id, user_id, codigo, estado, expira_en, clave_limite)
  VALUES ('44444444-0000-0000-0000-000000000004','a0000000-0000-0000-0000-0000000000a1',
          'ZZ3456','pendiente', now() + interval '5 minutes', 'dia:' || current_date::text);
  RAISE NOTICE 'FALLA · la red no atajó el duplicado: se generaron dos canjes del mismo día';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASA · el índice parcial rechazó el duplicado';
END $$;

\echo '--- T10: y NO bloquea de más: sin clave_limite se pueden generar varios'
DO $$
BEGIN
  INSERT INTO public.club_canjes
    (beneficio_id, user_id, codigo, estado, expira_en, clave_limite)
  VALUES ('44444444-0000-0000-0000-000000000004','b0000000-0000-0000-0000-0000000000b1',
          'ZZ4567','pendiente', now() + interval '5 minutes', NULL),
         ('44444444-0000-0000-0000-000000000004','b0000000-0000-0000-0000-0000000000b1',
          'ZZ5678','pendiente', now() + interval '5 minutes', NULL);
  RAISE NOTICE 'PASA · con límite > 1 (clave_limite NULL) la base no se mete';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'FALLA · el índice bloquea beneficios sin límite de a uno';
END $$;

\echo '--- T11: el reaper expira los pendientes vencidos y libera la clave'
UPDATE public.club_canjes SET expira_en = now() - interval '1 minute' WHERE codigo = 'ZZ2345';
SELECT CASE WHEN public.club_expirar_canjes() >= 1
            THEN 'PASA · el reaper expiró al menos un canje'
            ELSE 'FALLA · el reaper no expiró nada' END;
DO $$
BEGIN
  INSERT INTO public.club_canjes
    (beneficio_id, user_id, codigo, estado, expira_en, clave_limite)
  VALUES ('44444444-0000-0000-0000-000000000004','a0000000-0000-0000-0000-0000000000a1',
          'ZZ6789','pendiente', now() + interval '5 minutes', 'dia:' || current_date::text);
  RAISE NOTICE 'PASA · tras expirar, Ana puede volver a generar (si no, quedaba trabada para siempre)';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'FALLA · un canje abandonado deja al socio sin el beneficio para siempre';
END $$;

\echo ''
\echo '=== EL CONTROL POSITIVO DE T1/T2 ==='
\echo '--- T12: service_role SÍ escribe (si esto falla, T1 pasaba porque la tabla es inescribible para todos)'
SET LOCAL ROLE service_role;
DO $$
BEGIN
  INSERT INTO public.club_canjes
    (beneficio_id, user_id, codigo, estado, expira_en)
  VALUES ('44444444-0000-0000-0000-000000000004','b0000000-0000-0000-0000-0000000000b1',
          'ZZ7892','pendiente', now() + interval '5 minutes');
  RAISE NOTICE 'PASA · la Edge Function puede escribir: el módulo funciona';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FALLA · service_role no puede escribir (%) — el club no podría emitir canjes', SQLERRM;
END $$;

\echo '--- T13: el código generado respeta el alfabeto sin ambiguos (sin 0/O ni 1/I/L)'
RESET ROLE;
SELECT CASE WHEN bool_and(c ~ '^[2-9A-HJKMNP-Z]{6}$') AND count(DISTINCT c) > 90
            THEN 'PASA · 100 códigos, todos válidos y ' || count(DISTINCT c) || ' distintos'
            ELSE 'FALLA · el generador produce códigos inválidos o repetidos' END
  FROM (SELECT public.club_nuevo_codigo() AS c FROM generate_series(1,100)) s;


\echo ''
\echo '=== §12.10.5 — LA POSTULACIÓN PÚBLICA ==='
\echo '    Es una escritura abierta a anon, o sea la superficie más expuesta que'
\echo '    tiene el módulo. Lo que no puede fallar: que nadie se autoapruebe y'
\echo '    que nadie LEA lo que postuló otro (trae mail y teléfono).'

-- Una persona de la comisión, para los controles positivos de lectura. Va acá y
-- no en el escenario de arriba a propósito: si se le cambiara el rol a Beto,
-- `is_board_member()` empezaría a decir true y T5 —que prueba que Beto NO ve el
-- canje de Ana— pasaría a probar otra cosa sin que nadie se entere.
DO $esc2$
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
    VALUES ('e0000000-0000-0000-0000-0000000000e1','zz-comision@ejemplo.com',
            'authenticated','authenticated','{"name":"ZZ Comision"}', now(), now());
  $i$, v_col);
END $esc2$;

-- ⚠️ Hay que desactivar `trg_prevent_privilege_escalation`, igual que en
-- `membresia-check.sql`. El trigger PISA el cambio de rol en silencio cuando
-- quien ejecuta no es admin, y acá no hay sesión de admin: sin esto el UPDATE
-- "funciona" —0 errores, 1 fila afectada— y la persona sigue siendo 'user'.
-- La primera versión de este check falló así, y el FALLA que devolvía culpaba
-- a la policy en vez de al andamio: el modo de fallo de §11.4 otra vez.
ALTER TABLE public.users DISABLE TRIGGER trg_prevent_privilege_escalation;
UPDATE public.users SET role = 'comision_directiva'
 WHERE id = 'e0000000-0000-0000-0000-0000000000e1';
ALTER TABLE public.users ENABLE TRIGGER trg_prevent_privilege_escalation;

\echo '--- T15: un comercio sin cuenta SÍ puede postularse (control positivo)'
-- Primero el positivo: si esto falla, todos los "no puede" de abajo pasan
-- porque la tabla es inescribible, y el formulario público no existiría.
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  INSERT INTO public.club_postulaciones (nombre, contacto_email, propuesta)
  VALUES ('ZZ Pizzeria del barrio', 'zz-pizza@ejemplo.com',
          'Queremos ofrecer 15% de descuento a los socios de lunes a jueves.');
  RAISE NOTICE 'PASA · un comercio puede postularse sin tener cuenta';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FALLA · nadie puede postularse (%) — el formulario público no funcionaría', SQLERRM;
END $$;

\echo '--- T16: 🔒 pero NO puede postularse ya aprobado'
DO $$
BEGIN
  INSERT INTO public.club_postulaciones (nombre, contacto_email, propuesta, estado)
  VALUES ('ZZ Vivo', 'zz-vivo@ejemplo.com',
          'Me apruebo solo y entro al catalogo sin que nadie me mire.', 'aprobada');
  RAISE NOTICE 'FALLA · GRAVE: cualquiera se autoaprueba y entra al club';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  RAISE NOTICE 'PASA · la autoaprobación se rechaza (%)', SQLERRM;
END $$;

\echo '--- T17: 🔒 ni atarse a un comercio existente'
DO $$
BEGIN
  INSERT INTO public.club_postulaciones (nombre, contacto_email, propuesta, comercio_id)
  VALUES ('ZZ Secuestrador', 'zz-sec@ejemplo.com',
          'Me cuelgo del comercio de otro para operar su mostrador.',
          '11111111-0000-0000-0000-000000000001');
  RAISE NOTICE 'FALLA · GRAVE: una postulación puede atarse a un comercio ajeno';
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  RAISE NOTICE 'PASA · no se puede insertar con comercio_id (%)', SQLERRM;
END $$;

\echo '--- T18: 🔒 anon NO puede LEER las postulaciones (traen mail y teléfono)'
DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.club_postulaciones;
  IF v_n = 0 THEN
    RAISE NOTICE 'PASA · anon no ve ninguna postulación';
  ELSE
    RAISE NOTICE 'FALLA · GRAVE: anon lee % postulación(es) con datos de contacto', v_n;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASA · a anon se le niega la lectura entera (%)', SQLERRM;
END $$;

\echo '--- T19: 🔒 un usuario logueado cualquiera tampoco las ve'
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','b0000000-0000-0000-0000-0000000000b1', true);
SELECT CASE WHEN count(*) = 0 THEN 'PASA · Beto no ve las postulaciones'
            ELSE 'FALLA · GRAVE: cualquier usuario lee ' || count(*) || ' postulación(es)' END
  FROM public.club_postulaciones;

\echo '--- T20: la comisión SÍ las ve (si esto falla, T18/T19 pasaban por tabla vacía)'
SELECT set_config('request.jwt.claim.sub','e0000000-0000-0000-0000-0000000000e1', true);
SELECT CASE WHEN count(*) = 1 THEN 'PASA · la comisión ve la postulación y puede trabajarla'
            ELSE 'FALLA · la comisión no ve las postulaciones (' || count(*) || ') — nadie las revisaría' END
  FROM public.club_postulaciones;

\echo ''
\echo '=== FASE 3 — EL REPORTE AL COMERCIO ==='
\echo '    El reporte agrega canjes de OTRA gente. Lo que no puede fallar es que'
\echo '    un comercio vea los números de otro: sería decirle a la pizzería'
\echo '    cuánto factura la de enfrente.'

-- Un canje confirmado del comercio B, para que el reporte de A tenga algo
-- ajeno que NO debe contar. Sin esta fila, un reporte que ignorara el filtro
-- por comercio daría el mismo número y el test pasaría igual.
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO public.club_beneficios (id, comercio_id, titulo, tipo, valor, estado)
VALUES ('66666666-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000002',
        'ZZ 10% comercio B', 'porcentaje', 10, 'activo');
INSERT INTO public.club_canjes
  (beneficio_id, user_id, codigo, estado, expira_en, confirmado_en, cajero_id, monto_operacion, ahorro)
VALUES ('66666666-0000-0000-0000-000000000006','a0000000-0000-0000-0000-0000000000a1',
        'ZZB234','confirmado', now() + interval '5 minutes', now(),
        'd0000000-0000-0000-0000-0000000000d1', 1000, 100);

\echo '--- T21: 🔒 el cajero del comercio B NO puede pedir el reporte del A'
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d0000000-0000-0000-0000-0000000000d1', true);
DO $$
DECLARE v_n integer;
BEGIN
  SELECT canjes_generados INTO v_n
    FROM public.club_reporte_comercio('11111111-0000-0000-0000-000000000001');
  RAISE NOTICE 'FALLA · GRAVE: un comercio obtiene el reporte de otro (% canjes)', v_n;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASA · el reporte ajeno se rechaza (%)', SQLERRM;
END $$;

\echo '--- T22: el cajero del comercio A SÍ obtiene el suyo, y NO cuenta al B'
SELECT set_config('request.jwt.claim.sub','c0000000-0000-0000-0000-0000000000c1', true);
DO $$
DECLARE r record; v_real integer;
BEGIN
  SELECT * INTO r FROM public.club_reporte_comercio('11111111-0000-0000-0000-000000000001');
  -- Lo que el comercio A tiene de verdad, contado aparte de la función.
  SELECT count(*) INTO v_real
    FROM public.club_canjes c
    JOIN public.club_beneficios b ON b.id = c.beneficio_id
   WHERE b.comercio_id = '11111111-0000-0000-0000-000000000001';

  IF r.canjes_generados = v_real AND v_real > 0 THEN
    RAISE NOTICE 'PASA · el reporte cuenta % canje(s), los del comercio A y ninguno del B', v_real;
  ELSE
    RAISE NOTICE 'FALLA · el reporte dice % y el comercio tiene % (o no tiene ninguno)',
                 r.canjes_generados, v_real;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'FALLA · el operador no puede ver su propio reporte (%) — el panel no funcionaría', SQLERRM;
END $$;

\echo '--- T23: el desglose por beneficio incluye los que tienen CERO canjes'
-- Un beneficio publicado que nadie canjea es el dato más accionable del
-- reporte. Con INNER JOIN desaparecería, y el comercio nunca sabría que su
-- promo no mueve a nadie.
DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n
    FROM public.club_reporte_comercio_por_beneficio('11111111-0000-0000-0000-000000000001');
  IF v_n = 2 THEN
    RAISE NOTICE 'PASA · aparecen los 2 beneficios del comercio, incluido el que no tuvo canjes';
  ELSE
    RAISE NOTICE 'FALLA · el desglose trae % fila(s) y el comercio tiene 2 beneficios', v_n;
  END IF;
END $$;

\echo '--- T24: la serie mensual devuelve los meses vacíos, no los saltea'
DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n
    FROM public.club_reporte_comercio_por_mes('11111111-0000-0000-0000-000000000001', 12);
  IF v_n = 12 THEN
    RAISE NOTICE 'PASA · 12 meses, con los vacíos en 0 (un gráfico sin huecos)';
  ELSE
    RAISE NOTICE 'FALLA · la serie trae % meses en vez de 12', v_n;
  END IF;
END $$;

\echo '--- T25: 🔒 anon no puede ejecutar el reporte'
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.club_reporte_comercio('11111111-0000-0000-0000-000000000001');
  RAISE NOTICE 'FALLA · GRAVE: anon ejecuta el reporte de un comercio';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASA · a anon se le niega el EXECUTE (%)', SQLERRM;
END $$;
RESET ROLE;
\echo ''
\echo '--- T26: CONTROL FINAL — nada de esto quedó escrito'
ROLLBACK;

SELECT CASE WHEN (SELECT count(*) FROM public.club_comercios WHERE slug LIKE 'zz-%') = 0
             AND (SELECT count(*) FROM public.club_canjes WHERE codigo LIKE 'ZZ%') = 0
             AND (SELECT count(*) FROM public.club_postulaciones WHERE nombre LIKE 'ZZ %') = 0
            THEN 'PASA · la transacción revirtió, no quedó residuo'
            ELSE 'FALLA · quedaron datos de prueba en la base' END;
