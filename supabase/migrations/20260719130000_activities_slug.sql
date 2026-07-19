-- Slugs para actividades (fase 2 de "URLs limpias para compartir").
-- Antes las actividades se accedían por UUID (/activities/<uuid>); esta migración
-- agrega una columna `slug` con un trigger que la deriva del título, replicando el
-- patrón ya usado en news/benefits/partners (ver baseline). Idempotente: se puede
-- correr con `supabase db push` o pegándola en el SQL Editor.
--
-- Comportamiento del trigger (igual que generate_news_slug):
--   * En INSERT sin slug: deriva del título (quitando el prefijo de ciclo
--     "[Ciclo X · Nombre] — " si existe) y transliterando acentos.
--   * Si la fila YA tiene slug, se mantiene estable aunque se edite el título
--     (coalesce(NEW.slug, ...)), para no romper links ya compartidos.
--   * Garantiza unicidad con un sufijo md5 corto.

-- 1) Columna
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS slug text;

-- 2) Función
CREATE OR REPLACE FUNCTION public.generate_activity_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  raw_title text;
  base_slug text;
  tmp_slug  text;
  tries     int := 0;
BEGIN
  -- Base: slug existente (estable) o, si no hay, el título sin el prefijo de ciclo.
  IF NEW.slug IS NOT NULL AND length(trim(NEW.slug)) > 0 THEN
    raw_title := NEW.slug;
  ELSE
    raw_title := coalesce(NEW.title, '');
    -- quitar "[Ciclo A · Tecnología] — " / "[...] - " del comienzo si está presente
    raw_title := regexp_replace(raw_title, '^\s*\[[^\]]*\]\s*[-—–]\s*', '', '');
  END IF;

  -- transliterar acentos comunes del español a ASCII (así "educación" -> "educacion")
  base_slug := translate(
    lower(raw_title),
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc'
  );
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');       -- espacios -> guiones
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]+', '', 'g'); -- limpiar inválidos
  base_slug := regexp_replace(base_slug, '\-+', '-', 'g');        -- colapsar guiones
  base_slug := trim(both '-' from base_slug);                     -- recortar bordes

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'actividad';
  END IF;

  tmp_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.slug = tmp_slug
      AND a.id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) LOOP
    tries := tries + 1;
    tmp_slug := base_slug || '-' || substr(md5(random()::text), 1, 6);
    EXIT WHEN tries >= 10;
  END LOOP;

  NEW.slug := tmp_slug;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.generate_activity_slug() OWNER TO postgres;

-- 3) Trigger (solo se dispara al insertar o al cambiar title/slug)
CREATE OR REPLACE TRIGGER activities_generate_slug
  BEFORE INSERT OR UPDATE OF title, slug ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.generate_activity_slug();

-- 4) Backfill de las filas existentes (dispara el trigger, que deriva del título)
UPDATE public.activities SET title = title WHERE slug IS NULL OR slug = '';

-- 5) Índice único (red de seguridad; el trigger ya garantiza unicidad)
CREATE UNIQUE INDEX IF NOT EXISTS activities_slug_unique_idx ON public.activities USING btree (slug);

-- 6) Grants de la función (consistente con las otras generate_*_slug del baseline)
GRANT ALL ON FUNCTION public.generate_activity_slug() TO anon;
GRANT ALL ON FUNCTION public.generate_activity_slug() TO authenticated;
GRANT ALL ON FUNCTION public.generate_activity_slug() TO service_role;
