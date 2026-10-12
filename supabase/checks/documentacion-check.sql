-- Verifica el perfil `documentacion_lectura` sobre un Postgres desechable.
-- Todo vive dentro de una transacción y termina en ROLLBACK.
\set ON_ERROR_STOP on
\pset pager off

BEGIN;

-- El stub de Storage del Postgres pelado no trae los GRANT que storage-api sí
-- instala en Supabase. Se agregan dentro de esta transacción y se revierten.
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz-documentacion@test.com', 'x', '{"name":"ZZ Documentacion"}', now(), now()),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zz-comision@test.com', 'x', '{"name":"ZZ Comision"}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, email, role)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'ZZ Documentacion', 'zz-documentacion@test.com', 'user'),
  ('d0000000-0000-0000-0000-000000000002', 'ZZ Comision', 'zz-comision@test.com', 'user')
ON CONFLICT (id) DO NOTHING;

-- El trigger anti escalada protege producción, pero el andamio necesita crear
-- expresamente ambos perfiles para probar sus policies.
ALTER TABLE public.users DISABLE TRIGGER trg_prevent_privilege_escalation;
UPDATE public.users SET role = 'documentacion_lectura'
 WHERE id = 'd0000000-0000-0000-0000-000000000001';
UPDATE public.users SET role = 'comision_directiva'
 WHERE id = 'd0000000-0000-0000-0000-000000000002';
ALTER TABLE public.users ENABLE TRIGGER trg_prevent_privilege_escalation;

INSERT INTO public.documents (id, title, created_by)
VALUES ('d1000000-0000-0000-0000-000000000001', 'ZZ Balance interno', 'd0000000-0000-0000-0000-000000000002');
INSERT INTO public.document_versions
  (id, document_id, version_number, file_path, file_name, uploaded_by)
VALUES
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 1, 'zz/balance.pdf', 'balance.pdf', 'd0000000-0000-0000-0000-000000000002');
INSERT INTO public.projects (id, name, created_by)
VALUES ('d3000000-0000-0000-0000-000000000001', 'ZZ Proyecto reservado', 'd0000000-0000-0000-0000-000000000002');
INSERT INTO storage.objects (id, bucket_id, name, owner)
VALUES ('d4000000-0000-0000-0000-000000000001', 'comision-docs', 'zz/balance.pdf', 'd0000000-0000-0000-0000-000000000002');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', true);

DO $$
DECLARE visible integer;
DECLARE affected integer;
BEGIN
  SELECT count(*) INTO visible FROM public.documents WHERE id = 'd1000000-0000-0000-0000-000000000001';
  IF visible <> 1 THEN RAISE EXCEPTION 'FALLA: el perfil documental no puede leer documents'; END IF;

  SELECT count(*) INTO visible FROM public.document_versions WHERE id = 'd2000000-0000-0000-0000-000000000001';
  IF visible <> 1 THEN RAISE EXCEPTION 'FALLA: el perfil documental no puede leer document_versions'; END IF;

  SELECT count(*) INTO visible FROM public.projects WHERE id = 'd3000000-0000-0000-0000-000000000001';
  IF visible <> 0 THEN RAISE EXCEPTION 'FALLA: el perfil documental puede ver proyectos'; END IF;

  SELECT count(*) INTO visible FROM storage.objects WHERE id = 'd4000000-0000-0000-0000-000000000001';
  IF visible <> 1 THEN RAISE EXCEPTION 'FALLA: el perfil documental no puede leer el archivo privado'; END IF;

  UPDATE public.documents SET title = 'ZZ Alterado' WHERE id = 'd1000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FALLA: el perfil documental puede editar documentos'; END IF;

  DELETE FROM public.documents WHERE id = 'd1000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FALLA: el perfil documental puede borrar documentos'; END IF;

  BEGIN
    INSERT INTO public.documents (title, created_by)
    VALUES ('ZZ Creado sin permiso', 'd0000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'FALLA: el perfil documental puede crear documentos';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.add_document_version(
      'd1000000-0000-0000-0000-000000000001', 'zz/nueva.pdf', 'nueva.pdf',
      'application/pdf', 100, 'sin permiso'
    );
    RAISE EXCEPTION 'FALLA: el perfil documental puede versionar documentos';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'No autorizado' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('comision-docs', 'zz/sin-permiso.pdf', 'd0000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'FALLA: el perfil documental puede subir archivos';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000002', true);

DO $$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible FROM public.projects WHERE id = 'd3000000-0000-0000-0000-000000000001';
  IF visible <> 1 THEN RAISE EXCEPTION 'FALLA: la Comisión perdió acceso a proyectos'; END IF;

  INSERT INTO public.documents (title, created_by)
  VALUES ('ZZ Documento de Comisión', 'd0000000-0000-0000-0000-000000000002');
END $$;

RESET ROLE;
ROLLBACK;

\echo 'PASA: acceso documental lee documentos y archivos, no ve proyectos y no puede escribir.'
