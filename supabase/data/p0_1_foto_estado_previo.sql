-- =====================================================================
-- P0 · paso 1 — FOTO VERIFICABLE del estado previo (solo lectura)
--
-- Uso (la salida va FUERA del repo, que es público):
--   tools/db.sh sql < supabase/data/p0_1_foto_estado_previo.sql > "$DIR/p0-foto-antes.txt"
--
-- El dump de `tools/db.sh dump` lleva los DATOS pero se genera con
-- --no-privileges: NO guarda los permisos, que es justo lo que esta migración
-- cambia. Esta foto es la referencia de permisos y policies, más una huella
-- de los datos que la migración NO debe tocar (se compara con la de después).
--
-- No imprime datos de personas: solo roles, definiciones y md5.
-- =====================================================================
BEGIN TRANSACTION READ ONLY;
\pset footer off

SELECT now() AS foto_tomada_en, current_database() AS base, current_setting('server_version') AS version;

-- Permisos efectivos por rol (incluye lo heredado de PUBLIC).
SELECT c.relname AS tabla, ro.rolname AS rol,
       string_agg(p.priv, ',' ORDER BY p.priv) AS permisos
  FROM pg_class c
  CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) ro(rolname)
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                     ('REFERENCES'), ('TRIGGER')) p(priv)
 WHERE c.oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
   AND has_table_privilege(ro.rolname, c.oid, p.priv)
 GROUP BY 1, 2 ORDER BY 1, 2;

-- La ACL cruda: la referencia exacta para reconstruir los GRANT si hiciera falta.
SELECT relname AS tabla, relacl AS acl_cruda
  FROM pg_class WHERE oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
 ORDER BY 1;

-- Policies con su definición completa.
SELECT polrelid::regclass AS tabla, polname AS policy, polcmd AS comando,
       COALESCE(NULLIF(array_to_string(ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(polroles)), ','), ''), 'PUBLIC') AS roles,
       pg_get_expr(polqual, polrelid)      AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS with_check_expr
  FROM pg_policy
 WHERE polrelid IN ('public.donations'::regclass, 'public.memberships'::regclass)
 ORDER BY 1, 2;

SELECT relname AS tabla, relrowsecurity AS rls_activa, relforcerowsecurity AS rls_forzada
  FROM pg_class WHERE oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
 ORDER BY 1;

-- Huella de los datos. La migración no toca datos: la foto de después tiene
-- que dar EXACTAMENTE estos números (salvo que entre un cobro real en el medio,
-- que se ve en `ultima_escritura`).
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

ROLLBACK;
