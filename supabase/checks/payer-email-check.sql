-- =====================================================================
-- `donations.payer_email` — que el dato sirva y que no se escape.
--
-- POR QUÉ ESTE CHECK EXISTE
-- La columna guarda el email de quien paga: **dato personal de una persona que
-- muchas veces ni siquiera tiene cuenta en el sitio**. Es la primera columna
-- del repo con esa característica, y `donations` ya fue protagonista de una
-- fuga (§C: dos vistas puenteaban las RLS y exponían el historial de pagos).
-- Un `GRANT` de más o una policy mal escrita convierten esta mejora en la
-- próxima fuga.
--
-- Todo corre DENTRO de una transacción que revierte, así que es seguro contra
-- producción:
--   sed -n '/^BEGIN;/,$p' supabase/checks/payer-email-check.sql | bash tools/db.sh sql
--
-- T2 es un CONTROL NEGATIVO y no es decorativo: sin él, T1 diría "PASA" tanto
-- si la RLS funciona como si el INSERT nunca hubiera ocurrido. Una verificación
-- que no puede fallar no verifica nada (§11.4).
-- =====================================================================

BEGIN;

INSERT INTO public.donations (
  user_id, amount, donation_type, payment_provider, payment_id, status, payer_email
) VALUES (
  NULL, 5000, 'única', 'mercadopago', 'ZZCHECK-payer-email', 'approved', 'donante.real@gmail.com'
);

\echo ''
\echo '--- T1: anon NO puede leer el email del donante'
SET LOCAL ROLE anon;
SELECT CASE WHEN count(*) = 0 THEN 'PASA · anon no ve la donación'
            ELSE 'FALLA · anon ve ' || count(*) || ' fila(s) con email' END
  FROM public.donations WHERE payment_id = 'ZZCHECK-payer-email';
RESET ROLE;

\echo '--- T2: CONTROL NEGATIVO — la fila existe, así que T1 midió algo real'
SELECT CASE WHEN count(*) = 1 THEN 'PASA · la fila existe'
            ELSE 'FALLA · la fila no existe: T1 no probó nada' END
  FROM public.donations WHERE payment_id = 'ZZCHECK-payer-email';

\echo '--- T3: un usuario autenticado cualquiera tampoco lo ve'
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT CASE WHEN count(*) = 0 THEN 'PASA · un tercero no ve el email'
            ELSE 'FALLA · fuga de dato personal' END
  FROM public.donations WHERE payment_id = 'ZZCHECK-payer-email';
RESET ROLE;

\echo '--- T4: el aporte entra al libro igual (payer_email no estorba al trigger)'
SELECT CASE WHEN count(*) = 1 THEN 'PASA · el aporte entró al libro'
            ELSE 'FALLA · el aporte NO se creó' END
  FROM public.aportes WHERE referencia_externa = 'ZZCHECK-payer-email';

\echo '--- T5: y NO otorga acceso: un email no es una cuenta'
SELECT CASE WHEN count(*) = 1 THEN 'PASA · sin user_id no hay acceso'
            ELSE 'FALLA · un aporte anónimo otorgó acceso' END
  FROM public.aportes
 WHERE referencia_externa = 'ZZCHECK-payer-email'
   AND user_id IS NULL AND acceso_desde IS NULL;

\echo '--- T6: no quedan GRANTs a nivel columna que contradigan las policies'
SELECT CASE WHEN count(*) = 0 THEN 'PASA · anon no tiene UPDATE sobre la columna'
            ELSE 'FALLA · anon puede escribir payer_email de otros' END
  FROM information_schema.column_privileges
 WHERE table_name = 'donations' AND column_name = 'payer_email'
   AND grantee = 'anon' AND privilege_type = 'UPDATE';

\echo '--- T7: el índice de reconciliación existe (si no, el emparejamiento futuro escanea la tabla)'
SELECT CASE WHEN count(*) = 1 THEN 'PASA · idx_donations_payer_email'
            ELSE 'FALLA · falta el índice' END
  FROM pg_indexes WHERE tablename = 'donations' AND indexname = 'idx_donations_payer_email';

ROLLBACK;

\echo ''
\echo '--- T8: no quedó residuo'
SELECT CASE WHEN count(*) = 0 THEN 'PASA · sin residuo'
            ELSE 'FALLA · quedaron ' || count(*) || ' filas ZZCHECK' END
  FROM public.donations WHERE payment_id LIKE 'ZZCHECK%';
