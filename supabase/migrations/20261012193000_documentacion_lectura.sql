-- Perfil de consulta documental para profesionales externos.
--
-- `documentacion_lectura` puede leer la biblioteca interna y descargar sus
-- archivos, pero no pertenece a la Comisión Directiva: no ve proyectos y no
-- puede crear, editar, borrar ni versionar documentos. Las policies de escritura
-- siguen apoyadas exclusivamente en `is_board_member()`.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (
    role = ANY (ARRAY[
      'admin'::text,
      'user'::text,
      'educacion_manager'::text,
      'comision_directiva'::text,
      'documentacion_lectura'::text
    ])
  );

CREATE OR REPLACE FUNCTION public.puede_leer_documentacion()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'comision_directiva', 'documentacion_lectura')
  );
$$;

REVOKE ALL ON FUNCTION public.puede_leer_documentacion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.puede_leer_documentacion() TO authenticated, service_role;

DROP POLICY IF EXISTS documents_documentacion_select ON public.documents;
CREATE POLICY documents_documentacion_select
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (public.puede_leer_documentacion());

DROP POLICY IF EXISTS document_versions_documentacion_select ON public.document_versions;
CREATE POLICY document_versions_documentacion_select
  ON public.document_versions
  FOR SELECT
  TO authenticated
  USING (public.puede_leer_documentacion());

-- El bucket ya existe y es privado. Solo ampliamos SELECT; INSERT, UPDATE y
-- DELETE conservan `is_board_member()` como condición.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage.objects no existe: se omite la policy de lectura del bucket.';
    RETURN;
  END IF;

  EXECUTE $ddl$ DROP POLICY IF EXISTS comision_docs_select ON storage.objects $ddl$;
  EXECUTE $ddl$
    CREATE POLICY comision_docs_select ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'comision-docs'
        AND public.puede_leer_documentacion()
      )
  $ddl$;
END
$$;

COMMENT ON FUNCTION public.puede_leer_documentacion() IS
  'Autoriza lectura de la biblioteca documental privada. No otorga permisos de escritura ni acceso a proyectos.';
