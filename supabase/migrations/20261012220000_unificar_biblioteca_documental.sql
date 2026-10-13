-- Una única biblioteca documental para la Fundación.
--
-- `documents` pasa a ser el catálogo canónico. Cada registro puede tener una
-- versión pública (enlace ya publicado) y/o archivos privados versionados en
-- `comision-docs`. La visibilidad controla dónde aparece el documento, nunca
-- se infiere por su categoría.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_visibility_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_visibility_check
  CHECK (visibility IN ('public', 'internal'));

COMMENT ON COLUMN public.documents.visibility IS
  'public: se muestra en transparencia; internal: solo biblioteca institucional autenticada.';
COMMENT ON COLUMN public.documents.public_url IS
  'Enlace de la versión aprobada para difusión pública. Los archivos internos permanecen en comision-docs.';

-- El Balance 2022 ya tenía historial privado: se completa ese mismo registro
-- con su edición pública en vez de crear un duplicado lógico.
UPDATE public.documents d
SET
  title = l.title,
  category = l.category,
  description = l.description,
  visibility = 'public',
  public_url = l.url,
  published_at = l.created_at
FROM public.legal_documents l
WHERE d.title = 'Balance 2022'
  AND l.title = 'Estados Contables Ejercicio 2022';

-- Los demás documentos que ya estaban publicados pasan al catálogo único.
INSERT INTO public.documents (
  title, category, description, visibility, public_url, published_at,
  created_at, updated_at
)
SELECT
  l.title,
  l.category,
  l.description,
  'public',
  l.url,
  l.created_at,
  l.created_at,
  l.created_at
FROM public.legal_documents l
WHERE l.title <> 'Estados Contables Ejercicio 2022'
  AND NOT EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.title = l.title
  );

-- Lectura anónima únicamente de la ficha pública. Las versiones privadas y
-- todos los documentos internos siguen requiriendo puede_leer_documentacion().
DROP POLICY IF EXISTS documents_public_select ON public.documents;
CREATE POLICY documents_public_select
  ON public.documents
  FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public');

-- La política de lectura de `legal_documents` se retira en la migración de
-- cierre, cuando el frontend nuevo ya está publicado. Así la página pública
-- actual no queda sin datos durante el despliegue.
