-- =====================================================================
-- P0 — NADIE DESDE EL NAVEGADOR ESCRIBE `donations` NI `memberships`
--
-- Relevado contra producción el 2026-10-16 (solo lectura):
--
--   donations    anon           INSERT, SELECT
--   donations    authenticated  INSERT, UPDATE, DELETE, TRUNCATE, SELECT
--   memberships  authenticated  INSERT, UPDATE, DELETE, TRUNCATE, SELECT
--   policy "Insert donations: if own or anonymous"  (PUBLIC, INSERT)
--   policy "Insert memberships: only own"          (authenticated, INSERT)
--
-- Lo explotable hoy, desde la API pública (PostgREST):
--
--   1. Cualquier sesión podía insertarse una donación propia `approved` (o una
--      membresía `active` con `last_payment_id`): el trigger la convierte en
--      aporte con ACCESO y monto acumulado. Acceso y beneficios sin pagar.
--      Reproducido en Postgres 15 con `pagos-escritura-check.sql` (P1a).
--   2. `anon` podía insertar donaciones anónimas `approved`: no dan acceso,
--      pero entran al libro y a la rendición pública como plata que no entró.
--
-- Defensa en profundidad, NO explotable hoy: el TRUNCATE. No pasa por RLS,
-- pero PostgREST no ofrece forma de emitirlo y la FK desde `aportes` lo
-- bloquea igual. Se revoca porque no hay ningún motivo para que exista.
--
-- Estas tablas las escribe SOLO el webhook de Mercado Pago, con
-- `service_role` (que tiene BYPASSRLS). Verificado en código el 2026-10-16:
-- ninguna ruta del frontend inserta ni actualiza estas tablas; el único
-- `insert`/`update` está en `src/hooks/useMembership.jsx`, que no importa
-- nadie (lo fija `src/lib/escrituras-pagos.test.js`). Las funciones SQL que
-- las modifican (`reclamar_donaciones`) son SECURITY DEFINER y no dependen de
-- estos permisos.
--
-- QUÉ NO TOCA, A PROPÓSITO: la LECTURA. `authenticated` conserva SELECT y la
-- RLS sigue limitándolo a las filas propias (o todo, para admin): el historial
-- del panel sigue funcionando. Tampoco toca conceptos, períodos, triggers,
-- datos ni frontend: es solo el cierre de permisos.
--
-- ⚠️ ESTA MIGRACIÓN NO MODIFICA EL SELECT DE `anon` SOBRE `donations` (ni
-- sobre `memberships`). anon conserva ese GRANT, y la policy
-- `donations_admin_select_all` (`auth.uid() = user_id OR check_is_admin()`)
-- hoy le devuelve 0 filas (verificado en producción el 2026-10-16). Si ese
-- SELECT debe revocarse se decide en una revisión SEPARADA: no entra acá.
--
-- Trae su pre chequeo (informa y exige las condiciones de partida) y su post
-- chequeo (falla y revierte si queda cualquier escritura abierta, o si el
-- webhook pierde la suya). La prueba funcional —un usuario real intentando
-- escribir, y el webhook registrando un pago— está en
-- `supabase/checks/pagos-escritura-check.sql`.
--
-- Idempotente: re-aplicarla no cambia nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PRE CHEQUEO: informa lo que hay y exige lo que esta migración asume
-- ---------------------------------------------------------------------
DO $pre$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tabla, ro.rolname AS rol,
           string_agg(p.priv, ',' ORDER BY p.priv) AS privilegios
      FROM pg_class c
      CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) ro(rolname)
      CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
     WHERE c.oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
       AND has_table_privilege(ro.rolname, c.oid, p.priv)
     GROUP BY 1, 2 ORDER BY 1, 2
  LOOP
    RAISE NOTICE 'PRE · permiso  % / %: %', r.tabla, r.rol, r.privilegios;
  END LOOP;

  FOR r IN
    SELECT polrelid::regclass AS tabla, polname, polcmd
      FROM pg_policy
     WHERE polrelid IN ('public.donations'::regclass, 'public.memberships'::regclass)
     ORDER BY 1, 2
  LOOP
    RAISE NOTICE 'PRE · policy   % / "%" (%)', r.tabla, r.polname, r.polcmd;
  END LOOP;

  -- Lo que esta migración necesita que sea cierto para no romper nada.
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.donations'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.memberships'::regclass) THEN
    RAISE EXCEPTION 'PRE CHEQUEO: RLS no está activa en donations/memberships; revisar antes de seguir.';
  END IF;
  IF NOT COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'), false) THEN
    RAISE EXCEPTION 'PRE CHEQUEO: service_role no tiene BYPASSRLS; el webhook dejaría de poder escribir.';
  END IF;
END $pre$;

-- ---------------------------------------------------------------------
-- 2) El cierre
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert donations: if own or anonymous" ON public.donations;
DROP POLICY IF EXISTS "Insert memberships: only own"          ON public.memberships;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.donations, public.memberships
  FROM PUBLIC, anon, authenticated;

-- El webhook (service_role) conserva lo que usa: leer, insertar y actualizar.
-- Se declara explícito para que el post chequeo no dependa de un default.
GRANT SELECT, INSERT, UPDATE ON public.donations, public.memberships TO service_role;

-- ---------------------------------------------------------------------
-- 3) POST CHEQUEO: si algo queda abierto, o el webhook pierde lo suyo, la
--    migración entera se revierte
-- ---------------------------------------------------------------------
DO $post$
DECLARE
  v_fallas text[] := '{}';
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tabla, ro.rolname AS rol, p.priv
      FROM pg_class c
      CROSS JOIN (VALUES ('anon'), ('authenticated')) ro(rolname)
      CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
     WHERE c.oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
       AND has_table_privilege(ro.rolname, c.oid, p.priv)
  LOOP
    v_fallas := v_fallas || format('%s todavía tiene %s sobre %s', r.rol, r.priv, r.tabla);
  END LOOP;

  FOR r IN
    SELECT polrelid::regclass AS tabla, polname
      FROM pg_policy
     WHERE polrelid IN ('public.donations'::regclass, 'public.memberships'::regclass)
       AND polcmd IN ('a', 'w', 'd', '*')
  LOOP
    v_fallas := v_fallas || format('queda una policy de escritura: %s / "%s"', r.tabla, r.polname);
  END LOOP;

  FOR r IN
    SELECT c.relname AS tabla, p.priv
      FROM pg_class c
      CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE')) p(priv)
     WHERE c.oid IN ('public.donations'::regclass, 'public.memberships'::regclass)
       AND NOT has_table_privilege('service_role', c.oid, p.priv)
  LOOP
    v_fallas := v_fallas || format('el webhook (service_role) perdió %s sobre %s', r.priv, r.tabla);
  END LOOP;

  -- El historial del panel sigue leyendo (la RLS lo limita a lo propio).
  IF NOT has_table_privilege('authenticated', 'public.donations', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.memberships', 'SELECT') THEN
    v_fallas := v_fallas || 'authenticated perdió la LECTURA: el historial del panel dejaría de funcionar'::text;
  END IF;

  IF array_length(v_fallas, 1) > 0 THEN
    RAISE EXCEPTION E'POST CHEQUEO FALLÓ:\n- %', array_to_string(v_fallas, E'\n- ');
  END IF;
  RAISE NOTICE 'POST CHEQUEO OK: anon y authenticated sin INSERT/UPDATE/DELETE/TRUNCATE ni policies de escritura; service_role conserva SELECT/INSERT/UPDATE; authenticated conserva SELECT.';
END $post$;
