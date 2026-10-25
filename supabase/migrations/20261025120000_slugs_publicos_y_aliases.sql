-- Etapa 5: contrato unico de slugs publicos y compatibilidad historica.
--
-- Alcance deliberado: activities, news, partners y club_beneficios. La tabla
-- legacy `benefits` ya no alimenta la vidriera publica y no se incorpora a un
-- segundo espacio de nombres que podria competir con club_beneficios.
--
-- La migracion es atomica cuando se aplica con `bash tools/db.sh apply ...`.
-- Antes de aplicarla debe correrse `npm run audit:slugs`; una colision hace que
-- ese comando termine con error y este archivo tambien tiene guardas propias.

SET statement_timeout = 0;
SET client_min_messages = warning;

-- Una sola regla autoritativa. `translate` cubre el alfabeto usado en espanol
-- sin depender de la extension unaccent (que no es IMMUTABLE por defecto).
CREATE OR REPLACE FUNCTION public.normalize_public_slug(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT trim(both '-' FROM regexp_replace(
    regexp_replace(
      translate(
        lower(value),
        'áàäâãéèëêíìïîóòöôõúùüûñç',
        'aaaaaeeeeiiiiooooouuuunc'
      ),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-+', '-', 'g'
  ));
$$;

COMMENT ON FUNCTION public.normalize_public_slug(text) IS
  'Contrato autoritativo de slug publico: ASCII minuscula, numeros y guiones simples.';

REVOKE ALL ON FUNCTION public.normalize_public_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_public_slug(text) TO anon, authenticated, service_role;

-- Una tabla compartida evita cuatro implementaciones de historial y permite
-- que frontend, previews OG y futuros consumidores usen el mismo resolutor.
CREATE TABLE IF NOT EXISTS public.public_slug_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('activity', 'news', 'partner', 'benefit')),
  resource_id uuid NOT NULL,
  previous_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_slug_aliases_previous_slug_not_empty CHECK (length(trim(previous_slug)) > 0),
  CONSTRAINT public_slug_aliases_resource_slug_unique UNIQUE (resource_type, previous_slug)
);

COMMENT ON TABLE public.public_slug_aliases IS
  'Historial permanente de slugs publicos. Cada alias resuelve al UUID estable del recurso.';

CREATE INDEX IF NOT EXISTS idx_public_slug_aliases_resource
  ON public.public_slug_aliases (resource_type, resource_id);

ALTER TABLE public.public_slug_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_slug_aliases_read ON public.public_slug_aliases;
CREATE POLICY public_slug_aliases_read ON public.public_slug_aliases
  FOR SELECT TO anon, authenticated USING (
    (resource_type = 'activity' AND EXISTS (
      SELECT 1 FROM public.activities a WHERE a.id = resource_id
    ))
    OR (resource_type = 'news' AND EXISTS (
      SELECT 1 FROM public.news n WHERE n.id = resource_id
    ))
    OR (resource_type = 'partner' AND EXISTS (
      SELECT 1 FROM public.partners p WHERE p.id = resource_id
    ))
    OR (resource_type = 'benefit' AND EXISTS (
      SELECT 1 FROM public.club_beneficios b WHERE b.id = resource_id
    ))
  );

REVOKE ALL ON public.public_slug_aliases FROM anon, authenticated;
GRANT SELECT ON public.public_slug_aliases TO anon, authenticated;
GRANT ALL ON public.public_slug_aliases TO service_role;

-- Generador comun usado por los cuatro triggers. Mantiene el slug estable si
-- solo cambia el titulo/nombre; si el slug cambia deliberadamente, normaliza y
-- el trigger AFTER conserva el anterior. Las colisiones usan -2, -3... para
-- que el resultado sea determinista y facil de explicar.
CREATE OR REPLACE FUNCTION public.prepare_public_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  source_column text := TG_ARGV[0];
  resource_kind text := TG_ARGV[1];
  fallback_value text := TG_ARGV[2];
  allow_null boolean := coalesce(TG_ARGV[3], 'false')::boolean;
  raw_value text;
  base_slug text;
  candidate text;
  suffix integer := 1;
  current_collision boolean;
  alias_collision boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.slug IS NOT DISTINCT FROM OLD.slug THEN
    RETURN NEW;
  END IF;

  raw_value := nullif(trim(NEW.slug), '');
  IF raw_value IS NULL AND allow_null THEN
    NEW.slug := NULL;
    RETURN NEW;
  END IF;

  IF raw_value IS NULL THEN
    raw_value := nullif(trim(to_jsonb(NEW) ->> source_column), '');
    -- Mantiene la semantica del generador anterior de actividades: el prefijo
    -- editorial "[Ciclo X · Nombre] —" no forma parte de la URL publica.
    IF resource_kind = 'activity' THEN
      raw_value := regexp_replace(raw_value, '^\s*\[[^\]]*\]\s*[-—–]\s*', '', '');
    END IF;
  END IF;

  base_slug := public.normalize_public_slug(coalesce(raw_value, fallback_value));
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := fallback_value;
  END IF;

  candidate := base_slug;
  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE slug = $1 AND id <> $2)',
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME
    ) INTO current_collision USING candidate, NEW.id;

    SELECT EXISTS (
      SELECT 1
        FROM public.public_slug_aliases a
       WHERE a.resource_type = resource_kind
         AND a.previous_slug = candidate
         AND a.resource_id <> NEW.id
    ) INTO alias_collision;

    EXIT WHEN NOT current_collision AND NOT alias_collision;
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_public_slug() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_public_slug() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.archive_previous_public_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.slug IS NOT NULL
     AND length(trim(OLD.slug)) > 0
     AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    INSERT INTO public.public_slug_aliases (resource_type, resource_id, previous_slug)
    VALUES (TG_ARGV[0], NEW.id, OLD.slug)
    ON CONFLICT (resource_type, previous_slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_previous_public_slug() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_previous_public_slug() TO anon, authenticated, service_role;

-- Reemplazo de los generadores divergentes. El trigger comun se dispara ante
-- un cambio explicito de slug o al crear el recurso. Los cambios de titulo no
-- reescriben una URL ya publicada.
DROP TRIGGER IF EXISTS activities_generate_slug ON public.activities;
CREATE TRIGGER activities_generate_slug
  BEFORE INSERT OR UPDATE OF slug ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.prepare_public_slug('title', 'activity', 'actividad', 'false');

DROP TRIGGER IF EXISTS news_generate_slug ON public.news;
CREATE TRIGGER news_generate_slug
  BEFORE INSERT OR UPDATE OF slug ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.prepare_public_slug('title', 'news', 'novedad', 'false');

DROP TRIGGER IF EXISTS partners_generate_slug ON public.partners;
CREATE TRIGGER partners_generate_slug
  BEFORE INSERT OR UPDATE OF slug ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.prepare_public_slug('nombre', 'partner', 'alianza', 'false');

DROP TRIGGER IF EXISTS club_beneficios_generate_slug ON public.club_beneficios;
CREATE TRIGGER club_beneficios_generate_slug
  BEFORE INSERT OR UPDATE OF slug ON public.club_beneficios
  FOR EACH ROW EXECUTE FUNCTION public.prepare_public_slug('titulo', 'benefit', 'beneficio', 'true');

DROP TRIGGER IF EXISTS activities_archive_slug ON public.activities;
CREATE TRIGGER activities_archive_slug
  AFTER UPDATE OF slug ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.archive_previous_public_slug('activity');

DROP TRIGGER IF EXISTS news_archive_slug ON public.news;
CREATE TRIGGER news_archive_slug
  AFTER UPDATE OF slug ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.archive_previous_public_slug('news');

DROP TRIGGER IF EXISTS partners_archive_slug ON public.partners;
CREATE TRIGGER partners_archive_slug
  AFTER UPDATE OF slug ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.archive_previous_public_slug('partner');

DROP TRIGGER IF EXISTS club_beneficios_archive_slug ON public.club_beneficios;
CREATE TRIGGER club_beneficios_archive_slug
  AFTER UPDATE OF slug ON public.club_beneficios
  FOR EACH ROW EXECUTE FUNCTION public.archive_previous_public_slug('benefit');

-- Guardas previas al backfill: abortan toda la transaccion si dos slugs
-- convergen al mismo valor. El reporte legible vive en `npm run audit:slugs`.
DO $$
DECLARE
  collision text;
BEGIN
  SELECT string_agg(resource_type || ':' || normalized, ', ' ORDER BY resource_type, normalized)
    INTO collision
    FROM (
      SELECT resource_type, normalized
        FROM (
          SELECT 'activity'::text AS resource_type, public.normalize_public_slug(slug) AS normalized FROM public.activities WHERE slug IS NOT NULL
          UNION ALL
          SELECT 'news', public.normalize_public_slug(slug) FROM public.news WHERE slug IS NOT NULL
          UNION ALL
          SELECT 'partner', public.normalize_public_slug(slug) FROM public.partners WHERE slug IS NOT NULL
          UNION ALL
          SELECT 'benefit', public.normalize_public_slug(slug) FROM public.club_beneficios WHERE slug IS NOT NULL
        ) candidates
       GROUP BY resource_type, normalized
      HAVING count(*) > 1
    ) collisions;

  IF collision IS NOT NULL THEN
    RAISE EXCEPTION 'Slug normalization collisions: %', collision;
  END IF;
END;
$$;

-- Backfill controlado. Los triggers guardan automaticamente cada valor previo.
UPDATE public.activities
   SET slug = public.normalize_public_slug(slug)
 WHERE slug IS NOT NULL AND slug IS DISTINCT FROM public.normalize_public_slug(slug);

UPDATE public.news
   SET slug = public.normalize_public_slug(slug)
 WHERE slug IS NOT NULL AND slug IS DISTINCT FROM public.normalize_public_slug(slug);

UPDATE public.partners
   SET slug = public.normalize_public_slug(slug)
 WHERE slug IS NOT NULL AND slug IS DISTINCT FROM public.normalize_public_slug(slug);

UPDATE public.club_beneficios
   SET slug = public.normalize_public_slug(slug)
 WHERE slug IS NOT NULL AND slug IS DISTINCT FROM public.normalize_public_slug(slug);

-- La base impide que vuelva a entrar un slug fuera del contrato. NULL sigue
-- permitido donde ya era parte del modelo (p.ej. beneficio en borrador).
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_slug_contract;
ALTER TABLE public.activities ADD CONSTRAINT activities_slug_contract
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE public.news DROP CONSTRAINT IF EXISTS news_slug_contract;
ALTER TABLE public.news ADD CONSTRAINT news_slug_contract
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_slug_contract;
ALTER TABLE public.partners ADD CONSTRAINT partners_slug_contract
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE public.club_beneficios DROP CONSTRAINT IF EXISTS club_beneficios_slug_contract;
ALTER TABLE public.club_beneficios ADD CONSTRAINT club_beneficios_slug_contract
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- Resolutor unico. SECURITY INVOKER es intencional: cada SELECT conserva las
-- RLS del recurso, de modo que anon no puede resolver una alianza pendiente ni
-- un beneficio despublicado solo por conocer un alias.
CREATE OR REPLACE FUNCTION public.resolve_public_slug(
  p_resource_type text,
  p_lookup text
)
RETURNS TABLE (
  resource_id uuid,
  canonical_slug text,
  matched_by text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF p_resource_type NOT IN ('activity', 'news', 'partner', 'benefit')
     OR p_lookup IS NULL OR trim(p_lookup) = '' THEN
    RETURN;
  END IF;

  IF p_resource_type = 'activity' THEN
    RETURN QUERY
      SELECT a.id, a.slug,
             CASE WHEN a.id::text = p_lookup THEN 'id' ELSE 'canonical' END
        FROM public.activities a
       WHERE a.id::text = p_lookup OR a.slug = p_lookup
      UNION ALL
      SELECT a.id, a.slug, 'alias'::text
        FROM public.public_slug_aliases s
        JOIN public.activities a ON a.id = s.resource_id
       WHERE s.resource_type = 'activity' AND s.previous_slug = p_lookup
       LIMIT 1;
  ELSIF p_resource_type = 'news' THEN
    RETURN QUERY
      SELECT n.id, n.slug,
             CASE WHEN n.id::text = p_lookup THEN 'id' ELSE 'canonical' END
        FROM public.news n
       WHERE n.id::text = p_lookup OR n.slug = p_lookup
      UNION ALL
      SELECT n.id, n.slug, 'alias'::text
        FROM public.public_slug_aliases s
        JOIN public.news n ON n.id = s.resource_id
       WHERE s.resource_type = 'news' AND s.previous_slug = p_lookup
       LIMIT 1;
  ELSIF p_resource_type = 'partner' THEN
    RETURN QUERY
      SELECT p.id, p.slug,
             CASE WHEN p.id::text = p_lookup THEN 'id' ELSE 'canonical' END
        FROM public.partners p
       WHERE p.id::text = p_lookup OR p.slug = p_lookup
      UNION ALL
      SELECT p.id, p.slug, 'alias'::text
        FROM public.public_slug_aliases s
        JOIN public.partners p ON p.id = s.resource_id
       WHERE s.resource_type = 'partner' AND s.previous_slug = p_lookup
       LIMIT 1;
  ELSE
    RETURN QUERY
      SELECT b.id, b.slug,
             CASE WHEN b.id::text = p_lookup THEN 'id' ELSE 'canonical' END
        FROM public.club_beneficios b
       WHERE b.id::text = p_lookup OR b.slug = p_lookup
      UNION ALL
      SELECT b.id, b.slug, 'alias'::text
        FROM public.public_slug_aliases s
        JOIN public.club_beneficios b ON b.id = s.resource_id
       WHERE s.resource_type = 'benefit' AND s.previous_slug = p_lookup
       LIMIT 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.resolve_public_slug(text, text) IS
  'Resuelve UUID, slug canonico o alias historico respetando las RLS del recurso.';

REVOKE ALL ON FUNCTION public.resolve_public_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_slug(text, text) TO anon, authenticated, service_role;

-- Gate dentro de la propia migracion.
DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT count(*) INTO invalid_count
    FROM (
      SELECT slug FROM public.activities WHERE slug IS NOT NULL
      UNION ALL SELECT slug FROM public.news
      UNION ALL SELECT slug FROM public.partners WHERE slug IS NOT NULL
      UNION ALL SELECT slug FROM public.club_beneficios WHERE slug IS NOT NULL
    ) all_slugs
   WHERE slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'Stage 5 gate failed: % invalid canonical slugs', invalid_count;
  END IF;
END;
$$;
