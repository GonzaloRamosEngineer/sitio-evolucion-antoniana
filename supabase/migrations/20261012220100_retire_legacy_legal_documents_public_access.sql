-- El catálogo canónico es public.documents. La página pública y el panel
-- administrativo ya lo utilizan; este cierre evita que la tabla histórica
-- legal_documents continúe siendo una segunda fuente pública de información.
-- Se conserva temporalmente para respaldo y migraciones, pero sin lectura
-- anónima. La política de administración existente permanece limitada a admin.

DROP POLICY IF EXISTS "Public can read legal documents" ON public.legal_documents;
