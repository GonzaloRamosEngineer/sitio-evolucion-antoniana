-- =============================================================================
-- APADRINAMIENTO — ROADMAP §10.8 fase 4. Cupos, y el reporte de impacto.
--
-- ⚠️ LA RESTRICCIÓN QUE MANDA SOBRE TODO ESTE ARCHIVO, Y NO ES TÉCNICA
--
-- Los beneficiarios de la Fundación son **chicos**. §10.8 dejó escritas dos
-- reglas de diseño y las dos se cumplen acá **por estructura, no por disciplina**:
--
--   1. Se apadrina un CUPO, nunca una persona identificada.
--   2. Los datos clínicos no van en este sistema.
--
-- CÓMO SE CUMPLEN: **en este archivo no existe ninguna columna donde guardar la
-- identidad de un beneficiario.** No hay nombre, ni edad, ni foto, ni DNI, ni
-- diagnóstico, ni una FK a una tabla de chicos — porque esa tabla tampoco
-- existe. No se puede filtrar lo que no se puede guardar, y esa es la única
-- garantía que no depende de que nadie se olvide.
--
-- El reporte al padrino se arma con lo que sí hay: cuánto entró, cuánto se
-- gastó con comprobante (§10.12), cuántos cupos están sostenidos, y una lista de
-- HITOS agregados que carga la entidad ("este trimestre hubo 24 entrenamientos y
-- 2 controles nutricionales").
--
-- Y por eso `hitos_destino` exige `cantidad` cuando el destino es anonimizado:
-- obliga a que el hito se exprese como un AGREGADO. "24 entrenamientos" pasa;
-- "Juan mejoró mucho este mes" no tiene dónde ponerse. Es un empujón del
-- esquema, no un filtro de texto — los filtros de texto se evaden.
--
-- ⚠️ LO QUE SIGUE NECESITANDO ABOGADO, Y NO LO RESUELVE ESTA MIGRACIÓN: qué se
-- puede PUBLICAR y con qué consentimiento de los tutores. Como el sistema no
-- guarda ningún dato personal de menores, la consulta legal pasa a ser sobre la
-- comunicación, no sobre la base. Es una consulta más chica, pero sigue siendo
-- previa a publicar un destino padrinable con fotos.
--
-- GENÉRICO POR DISEÑO (§10.9): un refugio de animales quiere exactamente lo
-- contrario —"Apadriná a Rocky", con foto e historia, es su motor de
-- recaudación—. Eso ya está resuelto y no se toca: `destinos.imagen_url` +
-- `visibilidad_beneficiario = 'publico'`. El refugio pone la foto del perro en
-- el destino; la Fundación deja el default `anonimizado` y no expone a nadie.
--
-- Idempotente.
-- =============================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Cupos ocupados
--
-- Desnormalizado y mantenido por trigger, por el mismo motivo que
-- `destinos.monto_recaudado` (20260816140000): el progreso público se lee de
-- `destinos` y así **nunca hay que exponer la tabla que tiene los datos de cada
-- persona**.
-- ---------------------------------------------------------------------
ALTER TABLE public.destinos
  ADD COLUMN IF NOT EXISTS cupos_ocupados integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.destinos.cupos_ocupados IS
  'Cupos sostenidos hoy. Lo mantiene trg_padrinazgo_cupos; no se escribe a mano.';

-- ---------------------------------------------------------------------
-- 2) PADRINAZGOS — quién sostiene qué
--
-- Tabla propia y no una vista sobre `memberships`, por la misma razón por la que
-- existe `aportes`: una entidad recibe apadrinamientos en efectivo y por
-- transferencia, y el día que entre otra pasarela además de MercadoPago esto no
-- cambia. `membership_id` es opcional y solo dice de dónde salió el cobro.
--
-- NO HAY BENEFICIARIO. Ver el encabezado.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.padrinazgos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- RESTRICT y no CASCADE: si alguien sostiene cupos de un destino, ese destino
  -- no se borra. Mismo invariante que `aportes.destino_id`.
  destino_id uuid NOT NULL REFERENCES public.destinos(id) ON DELETE RESTRICT,

  membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL,

  -- Cuántos cupos sostiene. Es normal sostener más de uno.
  cupos      integer NOT NULL DEFAULT 1 CHECK (cupos > 0),

  estado     text NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo','pausado','baja')),

  desde      date NOT NULL DEFAULT current_date,
  hasta      date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT padrinazgos_fechas_chk CHECK (hasta IS NULL OR hasta >= desde),
  CONSTRAINT padrinazgos_baja_coherente_chk CHECK ((estado = 'baja') = (hasta IS NOT NULL))
);

-- Un padrinazgo vivo por persona y destino. Sostener más cupos se expresa
-- subiendo `cupos`, no abriendo una segunda fila — dos filas activas serían dos
-- verdades sobre lo mismo. Misma decisión que `uq_membresia_viva_por_destino`.
CREATE UNIQUE INDEX IF NOT EXISTS uq_padrinazgo_vivo_por_destino
  ON public.padrinazgos (user_id, destino_id) WHERE estado <> 'baja';

CREATE INDEX IF NOT EXISTS idx_padrinazgos_destino ON public.padrinazgos (destino_id, estado);

-- ---------------------------------------------------------------------
-- 3) Las dos reglas que el esquema no puede expresar solo
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.padrinazgo_validar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  d record;
  v_ocupados integer;
BEGIN
  SELECT tipo, admite_recurrente, cupos_totales, nombre, estado
    INTO d FROM public.destinos WHERE id = NEW.destino_id;

  -- a) Solo se apadrina lo que se sostiene en el tiempo. No se ata al `tipo`
  --    porque el esquema ya decidió no atar capacidades al tipo (20260816140000):
  --    lo que importa es que el destino admita aporte recurrente.
  IF NOT COALESCE(d.admite_recurrente, false) THEN
    RAISE EXCEPTION 'El destino "%" no admite aporte recurrente, asi que no se puede apadrinar.', d.nombre
      USING ERRCODE = '22023';
  END IF;

  -- b) No se pueden sostener más cupos de los que hay. `cupos_totales` NULL =
  --    sin tope declarado, que es legítimo (la cuota institucional no tiene
  --    cupos) y no se convierte en un error.
  IF NEW.estado = 'activo' AND d.cupos_totales IS NOT NULL THEN
    SELECT COALESCE(sum(p.cupos), 0) INTO v_ocupados
      FROM public.padrinazgos p
     WHERE p.destino_id = NEW.destino_id AND p.estado = 'activo'
       AND (TG_OP = 'INSERT' OR p.id <> NEW.id);

    IF v_ocupados + NEW.cupos > d.cupos_totales THEN
      RAISE EXCEPTION 'No quedan cupos en "%": hay % de % ocupados y se piden %.',
        d.nombre, v_ocupados, d.cupos_totales, NEW.cupos
        USING ERRCODE = '23514';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_padrinazgo_validar ON public.padrinazgos;
CREATE TRIGGER trg_padrinazgo_validar BEFORE INSERT OR UPDATE ON public.padrinazgos
  FOR EACH ROW EXECUTE FUNCTION public.padrinazgo_validar();

-- El contador. Se recalcula entero en vez de sumar el delta: sumar deltas es
-- donde el contador se despega de la realidad y nadie se entera hasta que la
-- vidriera dice "0 cupos libres" con la mitad vacía.
CREATE OR REPLACE FUNCTION public.padrinazgo_cupos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_destino uuid := COALESCE(NEW.destino_id, OLD.destino_id);
BEGIN
  UPDATE public.destinos d
     SET cupos_ocupados = COALESCE((
           SELECT sum(p.cupos) FROM public.padrinazgos p
            WHERE p.destino_id = d.id AND p.estado = 'activo'), 0)
   WHERE d.id = v_destino;

  -- Un UPDATE que mueve el padrinazgo de destino deja dos contadores por
  -- corregir, no uno. Es el caso que se olvida siempre.
  IF TG_OP = 'UPDATE' AND OLD.destino_id IS DISTINCT FROM NEW.destino_id THEN
    UPDATE public.destinos d
       SET cupos_ocupados = COALESCE((
             SELECT sum(p.cupos) FROM public.padrinazgos p
              WHERE p.destino_id = d.id AND p.estado = 'activo'), 0)
     WHERE d.id = OLD.destino_id;
  END IF;

  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS trg_padrinazgo_cupos ON public.padrinazgos;
CREATE TRIGGER trg_padrinazgo_cupos AFTER INSERT OR UPDATE OR DELETE ON public.padrinazgos
  FOR EACH ROW EXECUTE FUNCTION public.padrinazgo_cupos();

-- ---------------------------------------------------------------------
-- 4) HITOS — el reporte de impacto, agregado
--
-- Es lo que se le muestra a quien sostiene un cupo. Lo carga la entidad; el
-- sistema no lo deduce de nada, porque no tiene con qué y no debería tenerlo.
--
-- REPASO DE LAS COLUMNAS QUE NO ESTÁN Y NO VAN A ESTAR: nombre, apellido, edad,
-- foto, DNI, escuela, diagnóstico, medición, FK a una persona.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hitos_destino (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destino_id uuid NOT NULL REFERENCES public.destinos(id) ON DELETE CASCADE,

  fecha      date NOT NULL DEFAULT current_date,
  titulo     text NOT NULL,
  descripcion text,

  -- El agregado. "24" + "entrenamientos". Ver el encabezado: en un destino
  -- anonimizado es obligatorio, y esa obligación es la regla de §10.8.1 escrita
  -- en el esquema.
  cantidad   numeric CHECK (cantidad >= 0),
  unidad     text,

  publicado  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hitos_destino ON public.hitos_destino (destino_id, fecha DESC);

CREATE OR REPLACE FUNCTION public.hito_validar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  v_vis text;
BEGIN
  SELECT visibilidad_beneficiario INTO v_vis FROM public.destinos WHERE id = NEW.destino_id;

  IF v_vis = 'anonimizado' AND NEW.cantidad IS NULL THEN
    RAISE EXCEPTION
      'Este destino es anonimizado: el hito tiene que ser un agregado ("24 entrenamientos"), asi que `cantidad` es obligatoria. Ver ROADMAP 10.8.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_hito_validar ON public.hitos_destino;
CREATE TRIGGER trg_hito_validar BEFORE INSERT OR UPDATE ON public.hitos_destino
  FOR EACH ROW EXECUTE FUNCTION public.hito_validar();

-- ---------------------------------------------------------------------
-- 5) El reporte
--
-- Público y agregado: los mismos números que ya muestra `/rendicion`, más los
-- cupos y los hitos. No hay una versión "privada con más detalle" para el
-- padrino, y eso es deliberado — si hubiera, alguien terminaría poniendo ahí lo
-- que no puede ir en la pública.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reporte_destino(text);
CREATE FUNCTION public.reporte_destino(p_slug text)
RETURNS TABLE (
  destino_id      uuid,
  nombre          text,
  tipo            text,
  descripcion     text,
  meta_monto      numeric,
  recaudado       numeric,
  cupos_totales   integer,
  cupos_ocupados  integer,
  cupos_libres    integer,
  aportantes      integer,
  hitos           jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.nombre, d.tipo, d.descripcion, d.meta_monto, d.monto_recaudado,
         d.cupos_totales, d.cupos_ocupados,
         CASE WHEN d.cupos_totales IS NULL THEN NULL
              ELSE GREATEST(d.cupos_totales - d.cupos_ocupados, 0) END,
         -- Cuántas personas sostienen, sin decir quiénes. El count sale de
         -- `padrinazgos`, que no se expone.
         (SELECT count(DISTINCT p.user_id)::int FROM public.padrinazgos p
           WHERE p.destino_id = d.id AND p.estado = 'activo'),
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'fecha', h.fecha, 'titulo', h.titulo, 'descripcion', h.descripcion,
                    'cantidad', h.cantidad, 'unidad', h.unidad) ORDER BY h.fecha DESC)
             FROM public.hitos_destino h
            WHERE h.destino_id = d.id AND h.publicado), '[]'::jsonb)
    FROM public.destinos d
   WHERE d.slug = p_slug AND d.estado IN ('activo','pausado','cerrado');
$$;

COMMENT ON FUNCTION public.reporte_destino(text) IS
  'Reporte publico y AGREGADO de un destino: plata, cupos e hitos. No devuelve ningun dato de beneficiarios porque el esquema no los guarda (ROADMAP 10.8).';

-- Lo que sostiene la persona de la sesión, con el reporte de cada destino.
DROP FUNCTION IF EXISTS public.mis_padrinazgos();
CREATE FUNCTION public.mis_padrinazgos()
RETURNS TABLE (
  padrinazgo_id uuid,
  destino_id    uuid,
  slug          text,
  nombre        text,
  cupos         integer,
  estado        text,
  desde         date,
  hitos         jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, d.id, d.slug, d.nombre, p.cupos, p.estado, p.desde,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'fecha', h.fecha, 'titulo', h.titulo, 'descripcion', h.descripcion,
                    'cantidad', h.cantidad, 'unidad', h.unidad) ORDER BY h.fecha DESC)
             FROM public.hitos_destino h
            WHERE h.destino_id = d.id AND h.publicado
              AND h.fecha >= p.desde), '[]'::jsonb)
    FROM public.padrinazgos p
    JOIN public.destinos d ON d.id = p.destino_id
   WHERE p.user_id = auth.uid()
   ORDER BY p.desde DESC;
$$;

-- ---------------------------------------------------------------------
-- 6) RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.padrinazgos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hitos_destino ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.padrinazgos   FROM anon, authenticated;
REVOKE ALL ON public.hitos_destino FROM anon, authenticated;

-- `padrinazgos` NO se expone a `anon`: quién sostiene qué es dato personal, y en
-- un destino padrinable es además sensible por asociación. El público ve el
-- agregado por `reporte_destino()` y nada más.
GRANT SELECT ON public.padrinazgos TO authenticated;
GRANT SELECT ON public.hitos_destino TO anon, authenticated;

DROP POLICY IF EXISTS padrinazgos_self_read ON public.padrinazgos;
CREATE POLICY padrinazgos_self_read ON public.padrinazgos
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_board_member());

-- Escritura solo comisión y service_role: un padrinazgo es la contracara de un
-- cobro, y auto-insertarse uno sería figurar sosteniendo algo sin haber pagado.
DROP POLICY IF EXISTS padrinazgos_board_write ON public.padrinazgos;
CREATE POLICY padrinazgos_board_write ON public.padrinazgos
  FOR ALL TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

DROP POLICY IF EXISTS hitos_public_read ON public.hitos_destino;
CREATE POLICY hitos_public_read ON public.hitos_destino
  FOR SELECT USING (publicado);

DROP POLICY IF EXISTS hitos_board_all ON public.hitos_destino;
CREATE POLICY hitos_board_all ON public.hitos_destino
  FOR ALL TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

REVOKE ALL ON FUNCTION public.padrinazgo_validar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.padrinazgo_cupos()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hito_validar()       FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reporte_destino(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mis_padrinazgos()     TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 7) Backfill de cupos
--
-- La tabla nace vacía, así que esto deja los contadores en 0 explícito en vez de
-- confiar en el DEFAULT. Idempotente y barato.
-- ---------------------------------------------------------------------
UPDATE public.destinos d
   SET cupos_ocupados = COALESCE((
         SELECT sum(p.cupos) FROM public.padrinazgos p
          WHERE p.destino_id = d.id AND p.estado = 'activo'), 0)
 WHERE d.cupos_ocupados IS DISTINCT FROM COALESCE((
         SELECT sum(p.cupos) FROM public.padrinazgos p
          WHERE p.destino_id = d.id AND p.estado = 'activo'), 0);
