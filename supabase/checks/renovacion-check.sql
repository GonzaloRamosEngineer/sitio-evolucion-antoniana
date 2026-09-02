-- =====================================================================
-- Verificación de `20260902180000_renovacion_es_cuota_no_donacion.sql`
--
-- QUÉ SE PRUEBA. Que una renovación de suscripción entre al libro como
-- CUOTA y no como donación, con las tres consecuencias que eso tiene:
-- los 30 días de gracia, un mes de acceso (no meses proporcionales al
-- monto), y el rastro al cobro conservado.
--
-- POR QUÉ IMPORTA MÁS QUE UN NOMBRE. El defecto que esto cierra no era
-- una etiqueta mal puesta: un cobro mensual de $50.000 otorgaba DIEZ
-- meses de acceso, y al mes siguiente diez más.
--
-- CADA NEGATIVO TIENE SU POSITIVO AL LADO, que es la regla de este repo
-- ("rechaza lo malo" y "rechaza todo" se ven idénticos desde afuera):
--
--     R2  (una renovación da 1 mes)      ←→  R1  (una donación SÍ da 3)
--     R3  (bajo el piso no da acceso)    ←→  R1  (sobre el piso sí)
--     R6  (la cuota tiene gracia)        ←→  R7  (la donación NO)
--     R9  (una corrección humana vive)   ←→  R4  (una fila automática sí se toca)
--     R11 (el CHECK rechaza incoherente) ←→  R12 (y NO rechaza de más)
--
-- ⚠️ CONTRA PRODUCCIÓN NO. Crea usuarios en `auth.users`, donaciones y
-- membresías. Todo va dentro de una transacción que revierte, pero si la
-- corrida se corta a la mitad quedan fantasmas. Se corre contra el
-- Postgres de Docker (ver README.md de esta carpeta), y **en la imagen
-- 15**, que es la versión de producción (`pg15-bootstrap/`).
--
-- Leer el resultado: lo único que importa es que no haya ninguna línea
-- FALLA.  ... | grep -E 'FALLA|^ERROR'   -> sin salida = todo bien
-- =====================================================================

\set ON_ERROR_STOP off
\pset pager off

BEGIN;

-- ---------- Escenario ----------
-- Un usuario por prueba, a propósito: `proximo_acceso_desde()` ENCADENA los
-- períodos de una misma persona, así que compartir usuario entre pruebas haría
-- que el acceso de una arranque donde terminó la anterior y las fechas
-- esperadas dejarían de ser evidentes. Es el tipo de contaminación que hace
-- que un check pase por el motivo equivocado.
--
-- `raw_user_meta_data.name` es obligatorio: `handle_new_user` copia la fila a
-- `public.users`, donde `name` es NOT NULL. Sin eso el INSERT falla y TODAS
-- las pruebas de abajo devuelven "current transaction is aborted" — el modo de
-- fallo que §11.4 documenta como el más engañoso.
INSERT INTO auth.users (id, email, created_at, raw_user_meta_data) VALUES
  ('bbbb0000-0000-0000-0000-000000000001','zz-r-donac@test.com',  now(), '{"name":"ZZR Donacion"}'),
  ('bbbb0000-0000-0000-0000-000000000002','zz-r-cuota@test.com',  now(), '{"name":"ZZR Cuota"}'),
  ('bbbb0000-0000-0000-0000-000000000003','zz-r-piso@test.com',   now(), '{"name":"ZZR BajoPiso"}'),
  ('bbbb0000-0000-0000-0000-000000000004','zz-r-recla@test.com',  now(), '{"name":"ZZR Reclasifica"}'),
  ('bbbb0000-0000-0000-0000-000000000005','zz-r-orden@test.com',  now(), '{"name":"ZZR OrdenInverso"}'),
  ('bbbb0000-0000-0000-0000-000000000006','zz-r-manual@test.com', now(), '{"name":"ZZR Manual"}'),
  ('bbbb0000-0000-0000-0000-000000000007','zz-r-check@test.com',  now(), '{"name":"ZZR Check"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.destinos (id, tipo, nombre, slug, estado, otorga_acceso) VALUES
  ('cccc0000-0000-0000-0000-000000000001','institucional','ZZR Destino','zz-renovacion','activo', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- R1 — CONTROL POSITIVO: una donación PUNTUAL sigue dando meses
--      proporcionales. Si esto falla, el arreglo rompió las donaciones.
-- =====================================================================
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider,
                              payment_id, status, destino_id, created_at)
VALUES ('f1f10000-0000-0000-0000-000000000001','bbbb0000-0000-0000-0000-000000000001',
        15000,'única','mercadopago','ZZR-P1','approved',
        'cccc0000-0000-0000-0000-000000000001', now());

DO $$
DECLARE v_meses integer; v_origen text;
BEGIN
  SELECT (EXTRACT(year FROM age(acceso_hasta, acceso_desde)) * 12
          + EXTRACT(month FROM age(acceso_hasta, acceso_desde)))::int, origen
    INTO v_meses, v_origen
    FROM public.aportes WHERE referencia_externa = 'ZZR-P1';
  IF v_meses = 3 AND v_origen = 'donacion' THEN
    RAISE NOTICE 'R1  OK    · donacion puntual de $15.000 -> 3 meses, origen=donacion';
  ELSE
    RAISE NOTICE 'FALLA · R1: la regla proporcional de las DONACIONES se rompio (meses=%, origen=%)',
      COALESCE(v_meses::text,'sin fila'), COALESCE(v_origen,'sin fila');
  END IF;
END $$;

-- =====================================================================
-- R2 — EL BUG 2. Mismo monto, pero es una RENOVACIÓN: un mes, no tres.
--      Discrimina de verdad: antes del arreglo esta fila daba 3 meses,
--      igual que R1. Si alguien revierte la migración, R1 sigue en verde
--      y R2 se pone en rojo — que es lo que se le pide a una prueba.
-- =====================================================================
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider,
                              payment_id, status, destino_id, created_at)
VALUES ('f1f10000-0000-0000-0000-000000000002','bbbb0000-0000-0000-0000-000000000002',
        15000,'suscripción','mercadopago','ZZR-P2','approved',
        'cccc0000-0000-0000-0000-000000000001', now());

DO $$
DECLARE v_meses integer; v_proporcional integer;
BEGIN
  SELECT (EXTRACT(year FROM age(acceso_hasta, acceso_desde)) * 12
          + EXTRACT(month FROM age(acceso_hasta, acceso_desde)))::int
    INTO v_meses FROM public.aportes WHERE referencia_externa = 'ZZR-P2';
  v_proporcional := public.meses_por_donacion(15000);
  IF v_meses = 1 THEN
    RAISE NOTICE 'R2  OK    · renovacion de $15.000 -> 1 mes (la regla proporcional habria dado %)', v_proporcional;
  ELSE
    RAISE NOTICE 'FALLA · R2 GRAVE: un cobro MENSUAL de $15.000 otorgo % mes(es) de acceso',
      COALESCE(v_meses::text,'sin fila');
  END IF;
END $$;

-- =====================================================================
-- R3 — El piso se HEREDA, no se copia: una renovación por debajo de la
--      cuota de referencia no otorga acceso. Es lo que evita que una
--      suscripción de $1 armada contra la API habilite el club.
-- =====================================================================
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider,
                              payment_id, status, destino_id, created_at)
VALUES ('f1f10000-0000-0000-0000-000000000003','bbbb0000-0000-0000-0000-000000000003',
        1000,'suscripción','mercadopago','ZZR-P3','approved',
        'cccc0000-0000-0000-0000-000000000001', now());

DO $$
DECLARE v_desde date; v_hay boolean;
BEGIN
  SELECT acceso_desde INTO v_desde FROM public.aportes WHERE referencia_externa = 'ZZR-P3';
  SELECT tiene_acceso INTO v_hay FROM public.acceso_vigente('bbbb0000-0000-0000-0000-000000000003');
  IF v_desde IS NULL AND NOT COALESCE(v_hay, false) THEN
    RAISE NOTICE 'R3  OK    · renovacion de $1.000 (bajo el piso) entra al libro y NO otorga acceso';
  ELSE
    RAISE NOTICE 'FALLA · R3: una cuota bajo el piso otorgo acceso (desde=%, tiene_acceso=%)', v_desde, v_hay;
  END IF;
END $$;

-- =====================================================================
-- R4 — LA RECLASIFICACIÓN, en el orden real del webhook: primero la
--      donación, después la membresía. Tres cosas a la vez: el origen
--      pasa a `membresia`, se liga la membresía, y **el `donation_id` se
--      CONSERVA** — era lo que el CHECK viejo obligaba a tirar.
-- =====================================================================
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider,
                              payment_id, status, destino_id, created_at)
VALUES ('f1f10000-0000-0000-0000-000000000004','bbbb0000-0000-0000-0000-000000000004',
        5000,'suscripción','mercadopago','ZZR-P4','approved',
        'cccc0000-0000-0000-0000-000000000001', now());

-- Se guarda el acceso_desde de ANTES para probar el punto (a) del ON CONFLICT.
CREATE TEMP TABLE zzr_antes AS
  SELECT acceso_desde, acceso_hasta FROM public.aportes WHERE referencia_externa = 'ZZR-P4';

INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status,
                                last_payment_id, last_payment_status, next_charge_date,
                                destino_id, payer_email)
VALUES ('e1e10000-0000-0000-0000-000000000004','bbbb0000-0000-0000-0000-000000000004',
        'mensual',5000,'mercadopago','active','ZZR-P4','approved', current_date + 30,
        'cccc0000-0000-0000-0000-000000000001','zz-r-recla@mp.com');

DO $$
DECLARE r record; v_filas integer;
BEGIN
  SELECT count(*) INTO v_filas FROM public.aportes WHERE referencia_externa = 'ZZR-P4';
  SELECT origen, membership_id IS NOT NULL AS liga_membresia,
         donation_id IS NOT NULL AS conserva_donacion, email_aportante
    INTO r FROM public.aportes WHERE referencia_externa = 'ZZR-P4';

  IF v_filas <> 1 THEN
    RAISE NOTICE 'FALLA · R4 GRAVE: el cobro entro % veces al libro (la idempotencia se rompio)', v_filas;
  ELSIF r.origen = 'membresia' AND r.liga_membresia AND r.conserva_donacion THEN
    RAISE NOTICE 'R4  OK    · una sola fila, reclasificada a cuota, con las DOS referencias (email=%)',
      COALESCE(r.email_aportante,'sin email');
  ELSE
    RAISE NOTICE 'FALLA · R4: origen=% | liga membresia=% | conserva donacion=%',
      r.origen, r.liga_membresia, r.conserva_donacion;
  END IF;
END $$;

-- =====================================================================
-- R5 — LA TRAMPA DEL `EXCLUDED` ENVENENADO. `proximo_acceso_desde()` se
--      evalúa cuando la fila del conflicto YA existe, así que devuelve el
--      día siguiente al acceso que esa misma fila otorga. Si la
--      reclasificación usara `EXCLUDED.acceso_desde`, el período se iría
--      un mes al futuro y el socio quedaría SIN acceso hoy.
-- =====================================================================
DO $$
DECLARE v_desde_antes date; v_desde_ahora date; v_hasta_ahora date; v_hay boolean;
BEGIN
  SELECT acceso_desde INTO v_desde_antes FROM zzr_antes;
  SELECT acceso_desde, acceso_hasta INTO v_desde_ahora, v_hasta_ahora
    FROM public.aportes WHERE referencia_externa = 'ZZR-P4';
  SELECT tiene_acceso INTO v_hay FROM public.acceso_vigente('bbbb0000-0000-0000-0000-000000000004');

  IF v_desde_ahora = v_desde_antes AND v_hasta_ahora = current_date + 30 AND v_hay THEN
    RAISE NOTICE 'R5  OK    · acceso_desde intacto (%), acceso_hasta = el proximo cobro (%), y HOY tiene acceso',
      v_desde_ahora, v_hasta_ahora;
  ELSE
    RAISE NOTICE 'FALLA · R5: el periodo se movio. antes desde=% | ahora desde=% hasta=% | tiene_acceso hoy=%',
      v_desde_antes, v_desde_ahora, v_hasta_ahora, v_hay;
  END IF;
END $$;

-- =====================================================================
-- R6/R7 — EL BUG 1, que es el que sufrió el socio real: la GRACIA.
--
-- Se vencen las dos filas a mano diez días atrás y se pregunta. La cuota
-- tiene que seguir vigente por los 30 días de gracia; la donación no.
-- Es el par que prueba que el `origen` no es decorativo.
-- =====================================================================
UPDATE public.aportes SET acceso_desde = current_date - 40, acceso_hasta = current_date - 10
 WHERE referencia_externa IN ('ZZR-P4','ZZR-P1');

DO $$
DECLARE c record; d record;
BEGIN
  SELECT * INTO c FROM public.acceso_vigente('bbbb0000-0000-0000-0000-000000000004'); -- cuota
  SELECT * INTO d FROM public.acceso_vigente('bbbb0000-0000-0000-0000-000000000001'); -- donacion

  IF c.tiene_acceso AND c.en_gracia AND c.origen = 'membresia' THEN
    RAISE NOTICE 'R6  OK    · cuota vencida hace 10 dias: sigue vigente EN GRACIA (origen=%)', c.origen;
  ELSE
    RAISE NOTICE 'FALLA · R6 GRAVE: el socio mensual NO tiene los 30 dias de gracia (acceso=%, gracia=%, origen=%)',
      c.tiene_acceso, c.en_gracia, c.origen;
  END IF;

  IF NOT d.tiene_acceso AND NOT d.en_gracia THEN
    RAISE NOTICE 'R7  OK    · donacion vencida hace 10 dias: sin acceso y sin gracia (control negativo)';
  ELSE
    RAISE NOTICE 'FALLA · R7: una DONACION vencida recibio gracia (acceso=%, gracia=%)', d.tiene_acceso, d.en_gracia;
  END IF;
END $$;

-- =====================================================================
-- R8 — ORDEN INVERSO: si algún día el webhook escribe la membresía antes
--      que la donación, el resultado tiene que ser el MISMO. La fila nace
--      bien clasificada y el trigger de la donación choca y no toca nada.
-- =====================================================================
INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status,
                                last_payment_id, last_payment_status, next_charge_date,
                                destino_id, payer_email)
VALUES ('e1e10000-0000-0000-0000-000000000005','bbbb0000-0000-0000-0000-000000000005',
        'mensual',5000,'mercadopago','active','ZZR-P5','approved', current_date + 30,
        'cccc0000-0000-0000-0000-000000000001','zz-r-orden@mp.com');

INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider,
                              payment_id, status, destino_id, created_at)
VALUES ('f1f10000-0000-0000-0000-000000000005','bbbb0000-0000-0000-0000-000000000005',
        5000,'suscripción','mercadopago','ZZR-P5','approved',
        'cccc0000-0000-0000-0000-000000000001', now());

DO $$
DECLARE v_filas integer; v_origen text;
BEGIN
  SELECT count(*) INTO v_filas FROM public.aportes WHERE referencia_externa = 'ZZR-P5';
  SELECT origen INTO v_origen FROM public.aportes WHERE referencia_externa = 'ZZR-P5';
  IF v_filas = 1 AND v_origen = 'membresia' THEN
    RAISE NOTICE 'R8  OK    · con el orden invertido converge al mismo resultado (1 fila, cuota)';
  ELSE
    RAISE NOTICE 'FALLA · R8: filas=% origen=% (el arreglo depende del orden de escritura)', v_filas, v_origen;
  END IF;
END $$;

-- =====================================================================
-- R9 — UNA CORRECCIÓN HUMANA SOBREVIVE. Es la regla de §10.16, y es lo
--      que separa "el trigger reclasifica" de "el trigger pisa": si la
--      comisión ya arregló la fila a mano, el próximo reintento del
--      webhook NO se la deshace.
-- =====================================================================
INSERT INTO public.donations (id, user_id, amount, donation_type, payment_provider,
                              payment_id, status, destino_id, created_at)
VALUES ('f1f10000-0000-0000-0000-000000000006','bbbb0000-0000-0000-0000-000000000006',
        5000,'suscripción','mercadopago','ZZR-P6','approved',
        'cccc0000-0000-0000-0000-000000000001', now());

-- La comisión la corrige a mano: aporte manual equivalente a una cuota.
UPDATE public.aportes
   SET origen = 'manual', equivale_a = 'cuota', donation_id = NULL,
       notas = 'Corregido a mano por la comision'
 WHERE referencia_externa = 'ZZR-P6';

INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status,
                                last_payment_id, last_payment_status, next_charge_date,
                                destino_id, payer_email)
VALUES ('e1e10000-0000-0000-0000-000000000006','bbbb0000-0000-0000-0000-000000000006',
        'mensual',5000,'mercadopago','active','ZZR-P6','approved', current_date + 30,
        'cccc0000-0000-0000-0000-000000000001','zz-r-manual@mp.com');

DO $$
DECLARE r record;
BEGIN
  SELECT origen, notas FROM public.aportes WHERE referencia_externa = 'ZZR-P6' INTO r;
  IF r.origen = 'manual' AND r.notas = 'Corregido a mano por la comision' THEN
    RAISE NOTICE 'R9  OK    · la correccion de la comision sobrevivio al reintento del webhook';
  ELSE
    RAISE NOTICE 'FALLA · R9: el trigger piso una correccion humana (origen=%, notas=%)', r.origen, r.notas;
  END IF;
END $$;

-- =====================================================================
-- R10/R11/R12 — EL CHECK RELAJADO, por las tres puntas. Relajar un CHECK
--      es fácil de hacer de más, y un CHECK que ya no rechaza nada no se
--      nota nunca: no tira ningún error. Así que se prueban las dos
--      combinaciones que DEBEN seguir prohibidas y la única que se abrió.
-- =====================================================================
DO $$
BEGIN
  -- R10: una donación puntual NO pertenece a una membresía.
  BEGIN
    INSERT INTO public.aportes (user_id, monto, destino_id, origen, donation_id, membership_id)
    VALUES ('bbbb0000-0000-0000-0000-000000000007', 5000,
            'cccc0000-0000-0000-0000-000000000001', 'donacion',
            'f1f10000-0000-0000-0000-000000000001','e1e10000-0000-0000-0000-000000000004');
    RAISE NOTICE 'FALLA · R10: el CHECK acepto origen=donacion CON membership_id (se relajo de mas)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'R10 OK    · el CHECK sigue rechazando origen=donacion con membership_id';
  END;

  -- R11: `membresia` sin membresía es incoherente.
  BEGIN
    INSERT INTO public.aportes (user_id, monto, destino_id, origen)
    VALUES ('bbbb0000-0000-0000-0000-000000000007', 5000,
            'cccc0000-0000-0000-0000-000000000001', 'membresia');
    RAISE NOTICE 'FALLA · R11: el CHECK acepto origen=membresia SIN membership_id';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'R11 OK    · el CHECK sigue rechazando origen=membresia sin membership_id';
  END;

  -- R12: CONTROL POSITIVO — lo único que se abrió: una cuota que además
  -- dejó su renglón en `donations`. Sin este control, R10 y R11 pasarían
  -- igual con un CHECK que rechaza TODO, y el modulo estaria roto.
  BEGIN
    INSERT INTO public.aportes (user_id, monto, destino_id, origen, donation_id, membership_id,
                                referencia_externa)
    VALUES ('bbbb0000-0000-0000-0000-000000000007', 5000,
            'cccc0000-0000-0000-0000-000000000001', 'membresia',
            'f1f10000-0000-0000-0000-000000000001','e1e10000-0000-0000-0000-000000000004',
            'ZZR-P12');
    RAISE NOTICE 'R12 OK    · el CHECK ACEPTA una cuota con las dos referencias (lo que antes prohibia)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'FALLA · R12: el CHECK sigue prohibiendo una renovacion con donation_id — la migracion no se aplico';
  END;
END $$;

ROLLBACK;

-- Prueba de que el ROLLBACK alcanzó: no debe quedar nada.
\echo ''
\echo '=== limpieza: las 4 cuentas deben dar 0 ==='
SELECT (SELECT count(*) FROM public.aportes     WHERE referencia_externa LIKE 'ZZR-%')      AS aportes,
       (SELECT count(*) FROM public.donations   WHERE id::text LIKE 'f1f10000-%')           AS donations,
       (SELECT count(*) FROM public.memberships WHERE id::text LIKE 'e1e10000-%')           AS memberships,
       (SELECT count(*) FROM auth.users         WHERE id::text LIKE 'bbbb0000-%')           AS usuarios;
