-- =====================================================================
-- FOTO DE LÓGICA de aportes/donaciones/membresías (solo lectura)
--
-- Uso:  bash tools/db.sh sql < supabase/data/foto_logica_aportes.sql > "$D/logica-<momento>.txt"
--
-- Una línea por objeto, con un md5 de su definición: funciones del schema
-- public (todas), sus permisos, triggers, restricciones, columnas, permisos y
-- policies de las tablas del circuito de cobro. Sirve para probar que una
-- reversión dejó la lógica EXACTAMENTE como estaba: se toma antes de aplicar y
-- después de revertir, y se comparan con `diff`.
-- No imprime datos: solo nombres de objetos y huellas.
-- =====================================================================
BEGIN TRANSACTION READ ONLY;
\pset footer off
\pset tuples_only on
\pset format unaligned

SELECT 'funcion ' || p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid))
  FROM pg_proc p
 WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
 ORDER BY 1;

SELECT 'permiso_funcion ' || p.oid::regprocedure::text || ' ' ||
       COALESCE((SELECT string_agg(a, ',' ORDER BY a) FROM unnest(p.proacl::text[]) a), 'DEFAULT')
  FROM pg_proc p
 WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
 ORDER BY 1;

SELECT 'trigger ' || c.relname || ' ' || t.tgname || ' ' || md5(pg_get_triggerdef(t.oid))
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
   AND c.relname IN ('donations', 'memberships', 'aportes', 'aportes_correcciones')
 ORDER BY 1;

SELECT 'restriccion ' || c.relname || ' ' || k.conname || ' ' || md5(pg_get_constraintdef(k.oid)) ||
       CASE WHEN k.convalidated THEN '' ELSE ' NOT-VALID' END
  FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
 WHERE c.relnamespace = 'public'::regnamespace
   AND c.relname IN ('donations', 'memberships', 'aportes', 'aportes_correcciones')
 ORDER BY 1;

SELECT 'columna ' || c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod) ||
       CASE WHEN a.attnotnull THEN ' not-null' ELSE '' END
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
 WHERE c.relnamespace = 'public'::regnamespace AND a.attnum > 0 AND NOT a.attisdropped
   AND c.relname IN ('donations', 'memberships', 'aportes', 'aportes_correcciones')
 ORDER BY 1;

SELECT 'permiso_tabla ' || c.relname || ' ' ||
       COALESCE((SELECT string_agg(a, ',' ORDER BY a) FROM unnest(c.relacl::text[]) a), 'DEFAULT')
  FROM pg_class c
 WHERE c.relnamespace = 'public'::regnamespace
   AND c.relname IN ('donations', 'memberships', 'aportes', 'aportes_correcciones')
 ORDER BY 1;

SELECT 'policy ' || polrelid::regclass || ' ' || polname || ' ' || polcmd || ' ' ||
       md5(COALESCE(pg_get_expr(polqual, polrelid), '') || '|' || COALESCE(pg_get_expr(polwithcheck, polrelid), ''))
  FROM pg_policy
 WHERE polrelid::regclass::text IN ('donations', 'memberships', 'aportes', 'aportes_correcciones')
 ORDER BY 1;

ROLLBACK;
