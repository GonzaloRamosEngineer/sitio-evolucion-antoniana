-- =====================================================================
-- P0 · EMERGENCIA — vuelve a abrir la escritura de donations/memberships
--
-- ⚠️ ESTO REABRE EL AGUJERO: cualquier sesión vuelve a poder insertarse una
-- donación aprobada y darse acceso. Existe SOLO para un caso:
--
--   después de aplicar 20261016110000, el webhook de Mercado Pago NO puede
--   registrar cobros (en Render: «❌ Guardar pago» con «permission denied» /
--   42501) — lo que significaría que el servicio NO usa la service_role key,
--   contra todo lo que dicen el código y los datos (verificado 2026-10-16).
--
-- Antes de correrlo: confirmar en Render que SUPABASE_SERVICE_ROLE_KEY es la
-- service_role (no la anon) y corregir eso. Si la key está bien, esto NO
-- arregla nada: service_role no depende de estos permisos.
--
-- Reconstruye EXACTAMENTE el estado que registró la foto del paso 1
-- (p0_1_foto_estado_previo.sql, 2026-10-16). Compararlo con esa salida.
--
-- Uso:  tools/db.sh sql < supabase/data/p0_9_revertir_permisos_EMERGENCIA.sql
-- =====================================================================
BEGIN;

GRANT INSERT ON public.donations TO anon;
GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.donations   TO authenticated;
GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.memberships TO authenticated;

DROP POLICY IF EXISTS "Insert donations: if own or anonymous" ON public.donations;
CREATE POLICY "Insert donations: if own or anonymous" ON public.donations
  FOR INSERT WITH CHECK (((SELECT auth.uid() AS uid) = user_id) OR (user_id IS NULL));

DROP POLICY IF EXISTS "Insert memberships: only own" ON public.memberships;
CREATE POLICY "Insert memberships: only own" ON public.memberships
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid() AS uid) = user_id);

COMMIT;
