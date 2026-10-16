-- =====================================================================
-- P0 · paso 2 — PRE CHEQUEO (solo lectura). Corta si algo no es lo esperado.
--
-- Uso:  tools/db.sh sql < supabase/data/p0_2_precheck.sql
-- Tiene que terminar con «PRE CHEQUEO OK». Con «PRE CHEQUEO FALLÓ», NO aplicar.
--
-- Verifica lo que la migración 20261016110000 asume:
--   * RLS activa en donations y memberships;
--   * service_role con BYPASSRLS y con SELECT/INSERT/UPDATE (el webhook);
--   * authenticated con SELECT (el historial del panel);
--   * las únicas policies de escritura son las dos conocidas (si apareció otra,
--     alguien cambió algo que este procedimiento no contempla);
-- e informa si la migración ya estaba aplicada (re-aplicarla no cambia nada).
--
-- ⚠️ NO MODIFICA, Y LA MIGRACIÓN TAMPOCO, el SELECT de `anon` sobre
-- `donations`: anon conserva el GRANT de SELECT y la RLS (policy
-- `donations_admin_select_all`) hoy le devuelve 0 filas. Se informa acá para
-- que quede a la vista; esa política se evalúa en una revisión separada.
-- =====================================================================
BEGIN TRANSACTION READ ONLY;

DO $pre$
DECLARE
  v_fallas text[] := '{}';
  v_policies_escritura text[];
  v_conocidas text[] := ARRAY['Insert donations: if own or anonymous', 'Insert memberships: only own'];
  v_abiertas integer;
  r record;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.donations'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.memberships'::regclass) THEN
    v_fallas := v_fallas || 'RLS no está activa en donations o memberships'::text;
  END IF;

  IF NOT COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'), false) THEN
    v_fallas := v_fallas || 'service_role no tiene BYPASSRLS'::text;
  END IF;

  FOR r IN
    SELECT c.relname AS tabla, p.priv
      FROM pg_class c CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE')) p(priv)
     WHERE c.oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
       AND NOT has_table_privilege('service_role', c.oid, p.priv)
  LOOP
    v_fallas := v_fallas || format('service_role no tiene %s sobre %s (el webhook no podría escribir)', r.priv, r.tabla);
  END LOOP;

  IF NOT has_table_privilege('authenticated', 'public.donations', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.memberships', 'SELECT') THEN
    v_fallas := v_fallas || 'authenticated no tiene SELECT: el historial ya estaría roto antes de empezar'::text;
  END IF;

  SELECT array_agg(polname ORDER BY polname) INTO v_policies_escritura
    FROM pg_policy
   WHERE polrelid IN ('public.donations'::regclass, 'public.memberships'::regclass)
     AND polcmd IN ('a', 'w', 'd', '*');
  IF v_policies_escritura IS NOT NULL AND NOT (v_policies_escritura <@ v_conocidas) THEN
    v_fallas := v_fallas || format('hay policies de escritura no contempladas: %s', v_policies_escritura);
  END IF;

  SELECT count(*) INTO v_abiertas
    FROM pg_class c
    CROSS JOIN (VALUES ('anon'), ('authenticated')) ro(rolname)
    CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
   WHERE c.oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
     AND has_table_privilege(ro.rolname, c.oid, p.priv);

  IF v_abiertas = 0 AND v_policies_escritura IS NULL THEN
    RAISE NOTICE 'ESTADO · la migración P0 YA está aplicada (re-aplicarla no cambia nada).';
  ELSE
    RAISE NOTICE 'ESTADO · escritura abierta: % permisos de anon/authenticated y policies %. La migración los cierra.',
      v_abiertas, COALESCE(v_policies_escritura::text, '{}');
  END IF;

  RAISE NOTICE 'FUERA DE ALCANCE · anon conserva SELECT sobre donations (%) y memberships (%); la migración NO lo modifica. Se revisa aparte.',
    has_table_privilege('anon', 'public.donations', 'SELECT'),
    has_table_privilege('anon', 'public.memberships', 'SELECT');

  IF array_length(v_fallas, 1) > 0 THEN
    RAISE EXCEPTION E'PRE CHEQUEO FALLÓ — NO aplicar:\n- %', array_to_string(v_fallas, E'\n- ');
  END IF;
  RAISE NOTICE 'PRE CHEQUEO OK';
END $pre$;

-- Lo que anon ve HOY con ese SELECT (se espera 0 en las dos: la RLS lo filtra).
SET LOCAL ROLE anon;
SELECT 'anon ve hoy' AS nota,
       (SELECT count(*) FROM public.donations)   AS donations_visibles,
       (SELECT count(*) FROM public.memberships) AS memberships_visibles;
RESET ROLE;

ROLLBACK;
