-- La service role sólo se usa dentro de Edge Functions. Permitirle actualizar
-- role/is_verified evita que el trigger de autoprotección bloquee los cambios
-- realizados por procesos de servidor, manteniendo el bloqueo para clientes.
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.check_is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.role := OLD.role;
  NEW.is_verified := OLD.is_verified;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.prevent_privilege_escalation() OWNER TO postgres;
