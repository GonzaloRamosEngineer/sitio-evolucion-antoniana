-- =====================================================================
-- CHECK de fondos restringidos: destinos cerrados a aportes y el respaldo
-- documental de los INGRESOS (20260906120000).
--
-- QUÉ ES LO QUE NO PUEDE FALLAR ACÁ, Y SON DOS COSAS DISTINTAS:
--
--  1. **El comprobante de un aporte no puede ser público.** Es el documento que
--     respalda un ingreso: un convenio firmado, la resolución de un subsidio,
--     una escritura. Puede tener nombres, montos y firmas de terceros que no
--     dieron permiso para publicarse. Lo que se publica es que **existe**
--     (`tiene_comprobante`), nunca el archivo ni su ruta.
--
--  2. **Un fondo cerrado tiene que seguir siendo rendible.** Es la razón entera
--     de la migración: antes se podía elegir entre sacarlo del checkout o poder
--     rendirlo, y hacen falta las dos. Un check que solo probara «se puede crear
--     con los dos flags en false» no probaría nada de eso — por eso T3 verifica
--     que el gasto publicado de ese destino **sí** se lee desde `anon`.
--
-- ⚠️ CONTRA PRODUCCIÓN NO: crea destinos, aportes y gastos. Todo dentro de una
-- transacción que revierte. Va contra el Postgres de Docker, en la versión de
-- producción (PostgreSQL 15). Arma su propio escenario y no depende de datos
-- previos, por el motivo que explica `checks/README.md`.
-- =====================================================================

BEGIN;

-- ---------- Escenario ----------
-- Dos destinos que se comportan al revés uno del otro:
--   ZZ Fondo   — cerrado a aportes, con ingreso documentado. El caso nuevo.
--   ZZ Abierta — campaña normal, control de que no se rompió lo que ya andaba.
INSERT INTO public.destinos
  (id, tipo, nombre, slug, descripcion, estado, otorga_acceso,
   admite_puntual, admite_recurrente)
VALUES
  ('f1000000-0000-0000-0000-0000000000f1','campana','ZZ Fondo convenio','zz-fondo',
   'Llego completo y atado a un fin. No admite aportes nuevos.', 'activo',
   false,   -- un fondo institucional NO habilita el club a nadie
   false, false),
  ('f2000000-0000-0000-0000-0000000000f2','campana','ZZ Abierta','zz-abierta',
   'Campana normal, abierta a aportes.', 'activo', true, true, false);

\echo ''
\echo '--- T0: CONTROL — el destino cerrado se pudo crear'
\echo '     (antes de esta migracion, `destinos_admite_algo_chk` lo rechazaba)'
SELECT CASE WHEN EXISTS (SELECT 1 FROM public.destinos
                          WHERE slug='zz-fondo' AND NOT admite_puntual AND NOT admite_recurrente)
            THEN 'PASA · destino cerrado a aportes creado'
            ELSE 'FALLA · no se pudo crear un destino cerrado' END;

-- El ingreso del fondo, documentado. `origen = manual` porque no vino de una
-- pasarela: es una transferencia respaldada por un convenio.
INSERT INTO public.aportes
  (destino_id, origen, monto, fecha, nombre_aportante,
   tipo_comprobante, comprobante_numero, comprobante_path, comprobante_nombre)
VALUES
  ('f1000000-0000-0000-0000-0000000000f1','manual', 1000000, current_date - 400,
   'ZZ Institucion conveniante',
   'escritura','ZZ-ESC-001','aportes/zz-convenio.pdf','convenio-certificado.pdf');

-- Un segundo aporte SIN comprobante, para que el conteo tenga que discriminar.
-- Sin este, "1 de 1 documentado" pasaria aunque la funcion contara mal.
INSERT INTO public.aportes (destino_id, origen, monto, fecha, nombre_aportante)
VALUES ('f1000000-0000-0000-0000-0000000000f1','manual', 50000, current_date - 200, 'ZZ Otro');

INSERT INTO public.gastos (destino_id, concepto, monto, fecha, publicado, tipo_comprobante)
VALUES ('f1000000-0000-0000-0000-0000000000f1','ZZ Honorarios contador', 300000,
        current_date - 100, true, 'recibo');

\echo ''
\echo '=== EL RESPALDO DOCUMENTAL DE UN INGRESO ==='

\echo '--- T1: ✅ `tiene_comprobante` se deriva sola, no se escribe a mano'
SELECT CASE WHEN (SELECT count(*) FROM public.aportes
                   WHERE destino_id='f1000000-0000-0000-0000-0000000000f1' AND tiene_comprobante) = 1
            THEN 'PASA · 1 de los 2 aportes figura documentado'
            ELSE 'FALLA · la columna generada no discrimina' END;

\echo '--- T2: 🔒 anon NO puede leer el comprobante de un ingreso'
\echo '     (es un convenio firmado por terceros: se publica que existe, no el archivo)'
SAVEPOINT t2;
SET LOCAL ROLE anon;
DO $t$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.aportes;
  RAISE WARNING 'FALLA · anon leyo la tabla de aportes (% filas)', n;
EXCEPTION WHEN insufficient_privilege OR sqlstate '42501' THEN
  RAISE NOTICE 'PASA · rechazado (42501)';
END $t$;
RESET ROLE;
ROLLBACK TO SAVEPOINT t2;

\echo '--- T2b: ✅ pero el AGREGADO si es publico, y no filtra la ruta del archivo'
SET LOCAL ROLE anon;
SELECT CASE WHEN (SELECT aportes_documentados FROM public.reporte_destino('zz-fondo')) = 1
             AND (SELECT aportes_totales      FROM public.reporte_destino('zz-fondo')) = 2
            THEN 'PASA · dice "1 de 2 documentados" sin decir cual ni donde'
            ELSE 'FALLA · el conteo publico no cuadra' END;
RESET ROLE;

\echo '--- T2c: 🔒 y el reporte NO devuelve ninguna columna con la ruta del comprobante'
SELECT CASE WHEN NOT EXISTS (
                 SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public'
                    AND table_name IN (SELECT 'reporte_destino')
              )
             AND NOT EXISTS (
                 SELECT 1 FROM pg_proc p
                   JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname='public' AND p.proname='reporte_destino'
                    AND pg_get_function_result(p.oid) ILIKE '%comprobante_path%')
            THEN 'PASA · la firma de reporte_destino no expone comprobante_path'
            ELSE 'FALLA · el reporte publica la ruta del archivo' END;

\echo ''
\echo '=== UN FONDO CERRADO SIGUE SIENDO RENDIBLE — la razon de la migracion ==='

\echo '--- T3: ✅ anon SI ve el gasto publicado de un destino cerrado a aportes'
SET LOCAL ROLE anon;
SELECT CASE WHEN (SELECT count(*) FROM public.gastos
                   WHERE destino_id='f1000000-0000-0000-0000-0000000000f1') = 1
            THEN 'PASA · el fondo cerrado rinde en publico'
            ELSE 'FALLA · cerrarlo a aportes lo dejo sin rendicion (el bug que esto arregla)' END;
RESET ROLE;

\echo '--- T3b: y el reporte avisa que NO esta abierto a aportes'
\echo '     (para que la pantalla no ofrezca un boton que no lleva a ningun lado)'
SET LOCAL ROLE anon;
SELECT CASE WHEN (SELECT abierto_a_aportes FROM public.reporte_destino('zz-fondo')) = false
             AND (SELECT abierto_a_aportes FROM public.reporte_destino('zz-abierta')) = true
            THEN 'PASA · distingue el cerrado del abierto'
            ELSE 'FALLA · no distingue, o rompio el caso abierto' END;
RESET ROLE;

\echo ''
\echo '=== TIPO DE COMPROBANTE ==='

\echo '--- T4: 🔒 un tipo inventado se rechaza'
DO $t$
BEGIN
  UPDATE public.gastos SET tipo_comprobante = 'factura_b'
   WHERE destino_id='f1000000-0000-0000-0000-0000000000f1';
  RAISE WARNING 'FALLA · acepto un tipo fuera de la lista (la letra de factura va en comprobante_numero)';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASA · rechazado por el CHECK';
END $t$;

\echo '--- T4b: ✅ y NULL sigue siendo valido: no declarar el tipo no es un error'
DO $t$
BEGIN
  UPDATE public.gastos SET tipo_comprobante = NULL
   WHERE destino_id='f1000000-0000-0000-0000-0000000000f1';
  RAISE NOTICE 'PASA · NULL aceptado (gastos viejos sin tipo declarado)';
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'FALLA · exige declarar el tipo, y eso rompe la carga historica';
END $t$;

\echo ''
\echo '--- T5: CONTROL — no se rompio el caso que ya andaba'
SELECT CASE WHEN (SELECT count(*) FROM public.destinos
                   WHERE slug='zz-abierta' AND admite_puntual) = 1
            THEN 'PASA · una campana abierta sigue siendo valida'
            ELSE 'FALLA · se rompio el caso normal' END;

ROLLBACK;
