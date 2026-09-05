-- =============================================================================
-- LA FIGURA INSTITUCIONAL — ROADMAP §10.1.a / fase 4 de §10.3.
--
-- QUÉ RESUELVE, EN UNA LÍNEA: el sistema sabe **quién tiene acceso** desde
-- §10.17, pero no sabe **quién es miembro de la entidad**. Son dos cosas
-- distintas y §10.2 ya lo había visto: *"un socio suspendido por la comisión no
-- es lo mismo que un socio atrasado en el pago"*. Hasta hoy solo se podía
-- expresar el segundo.
--
-- ⚠️ POR QUÉ ESTA TABLA NO SE LLAMA `socios`, QUE ES LO QUE PEDÍA §10.2
--
-- §10.2 diseñó `socios` + `categorias_socio` con `otorga_voto`, pensando en una
-- asociación civil. Pero el primer cliente es una FUNDACIÓN: `entidad.tipo =
-- 'fundacion'`. Una fundación **no tiene asociados, ni asamblea, ni voto** —
-- tiene consejo de administración y beneficiarios. Escribir `socios` acá sería
-- construir el vocabulario del cliente 2 dentro del cliente 1, que es
-- exactamente lo que §10.9 mandó no hacer.
--
-- El repo ya lo sabía sin haberlo escrito: `entidad.vocabulario.aportante` dice
-- 'padrino', no 'socio'.
--
-- LA REGLA APLICADA (§10.9): **el comportamiento va en la base, las palabras van
-- en `entidad.js`.** Acá no aparece la palabra "socio" como dato: la tabla se
-- llama `miembros` por ser el término más neutro del castellano, y cómo se lo
-- llama de cara a la gente lo decide `entidad.vocabulario`.
--
-- QUÉ ES CONFIGURABLE, Y POR QUÉ CADA COSA:
--   · `modo_alta`     — una fundación da de alta a un padrino al primer aporte;
--                       una asociación civil exige solicitud y aprobación de
--                       comisión, porque el estatuto lo manda.
--   · `otorga_voto`   — fundación: no. Club, mutual, cámara: sí.
--   · `suspension_corta_acceso` — si la comisión suspende a alguien, ¿pierde los
--                       beneficios o solo la condición institucional? Las dos
--                       respuestas son legítimas y ninguna es "la del software".
--   · `renumera_al_reingresar` — §10.4 pregunta 4, que quedó sin responder.
--
-- SOBRE LA ANTIGÜEDAD (la otra mitad de §10.4 pregunta 4): ya está resuelta y no
-- se toca. `antiguedad_socio()` (§10.17) la deriva de los aportes con
-- `range_agg`, así que `socio_desde` es el primer aporte y **nunca se reinicia**,
-- pase lo que pase con la condición institucional. Esta migración agrega la
-- fecha de alta INSTITUCIONAL, que es otra cosa y puede ser posterior.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Parámetros de la entidad
--
-- Una sola fila vigente, igual que `reglas_acceso`. No se fusiona con esa tabla
-- a propósito: `reglas_acceso` responde "cuánto acceso compra un peso" y esto
-- responde "qué es ser miembro acá". Mezclarlas haría que subir la cuota y
-- cambiar el estatuto sean el mismo UPDATE.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reglas_membresia (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 'automatica'  -> aportar con acceso da la condición de miembro, sin trámite.
  -- 'aprobacion'  -> hace falta solicitar y que la comisión apruebe.
  modo_alta   text NOT NULL DEFAULT 'automatica'
    CHECK (modo_alta IN ('automatica','aprobacion')),

  -- Default de la entidad. Cada categoría puede sobreescribirlo (ver 2).
  otorga_voto boolean NOT NULL DEFAULT false,

  -- La decisión más delicada de esta tabla. Ver 5.
  suspension_corta_acceso boolean NOT NULL DEFAULT false,

  -- ROADMAP 10.4 pregunta 4: al darse de baja y volver, ¿número nuevo o el de
  -- siempre? Default `false` = conserva el número. Es lo que hace toda entidad
  -- con registro de asociados: el número es la identidad, no el estado.
  renumera_al_reingresar boolean NOT NULL DEFAULT false,

  vigente     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reglas_membresia_una_vigente
  ON public.reglas_membresia ((vigente)) WHERE vigente;

-- La fila de la Fundación: alta automática (el padrino lo es por aportar, no por
-- trámite), sin voto (es una fundación), y la suspensión NO corta el acceso —
-- que es el default conservador: quitarle los beneficios a alguien es una
-- segunda decisión, no un efecto lateral de la primera.
INSERT INTO public.reglas_membresia (modo_alta, otorga_voto, suspension_corta_acceso, renumera_al_reingresar)
SELECT 'automatica', false, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.reglas_membresia);

COMMENT ON TABLE public.reglas_membresia IS
  'Que significa "ser miembro" en ESTA entidad. Comportamiento, no palabras: el vocabulario vive en src/config/entidad.js (ROADMAP 10.9).';

-- ---------------------------------------------------------------------
-- 2) Categorías
--
-- Existe apenas hay más de un monto de cuota, y trae el descuento en actividades
-- porque es el lugar natural: "Protector paga más y tiene 50% en cursos" es UNA
-- decisión, y partirla en dos tablas garantiza que en algún momento discrepen.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias_miembro (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        text NOT NULL,
  slug          text NOT NULL UNIQUE,
  descripcion   text,
  cuota_mensual numeric NOT NULL DEFAULT 0 CHECK (cuota_mensual >= 0),

  descuento_actividades_pct integer NOT NULL DEFAULT 0
    CHECK (descuento_actividades_pct BETWEEN 0 AND 100),

  -- NULL = hereda `reglas_membresia.otorga_voto`. Se distingue de `false` a
  -- propósito: "esta categoría no vota" y "acá no vota nadie" son distintas, y
  -- la segunda no debería tener que repetirse en cada fila.
  otorga_voto   boolean,

  -- La categoría en la que cae quien entra por alta automática.
  --
  -- ⚠️ SIN ESTO, LA TABLA NO SIRVE PARA NADA EN UNA ENTIDAD DE ALTA AUTOMÁTICA.
  -- El trigger da de alta sin categoría, `descuento_actividades()` devuelve 0
  -- para todo el mundo, y las categorías quedan como un ABM que nadie usa. Se
  -- descubrió al ir a sembrar la categoría única de la Fundación: la fila
  -- existía y no la iba a tener nadie.
  por_defecto   boolean NOT NULL DEFAULT false,

  activa        boolean NOT NULL DEFAULT true,
  orden         integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Converge desde una versión anterior de esta migración (ver CLAUDE.md).
ALTER TABLE public.categorias_miembro
  ADD COLUMN IF NOT EXISTS por_defecto boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_categorias_miembro_activa
  ON public.categorias_miembro (activa, orden);

-- Una sola por defecto. Dos serían un empate que resolvería el orden de lectura,
-- y el descuento de cada persona dependería de cuál devolvió primero la base.
CREATE UNIQUE INDEX IF NOT EXISTS uq_categoria_miembro_por_defecto
  ON public.categorias_miembro ((por_defecto)) WHERE por_defecto;

COMMENT ON COLUMN public.categorias_miembro.por_defecto IS
  'La categoria que asigna el alta automatica. Una sola, garantizado por indice unico parcial. Sin ninguna marcada, el alta deja categoria_id NULL y el descuento es 0.';

COMMENT ON COLUMN public.categorias_miembro.otorga_voto IS
  'NULL = hereda reglas_membresia.otorga_voto. false = esta categoria en particular no vota.';

-- La categoría por defecto, resuelta en un solo lugar. NULL es una respuesta
-- válida: una entidad puede no tener categorías y funcionar igual.
CREATE OR REPLACE FUNCTION public.categoria_miembro_por_defecto()
RETURNS uuid LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id FROM public.categorias_miembro WHERE por_defecto AND activa LIMIT 1;
$$;

-- ---------------------------------------------------------------------
-- 3) MIEMBROS — la condición institucional
--
-- `user_id` es la PK y no hay id propio: una persona es miembro o no lo es, y
-- una segunda fila para la misma persona no significaría nada. Es la misma
-- razón por la que `uq_membresia_viva_por_destino` existe en `memberships`
-- (10.1.f): la unicidad que el dominio ya tiene, escrita en el esquema.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.miembros (
  user_id      uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

  -- El número. `bigint generated by default as identity` y no `always`, para que
  -- una entidad que migra desde un padrón en papel pueda conservar los números
  -- que ya venía usando. Si se deja que lo asigne la base, es correlativo.
  numero       bigint GENERATED BY DEFAULT AS IDENTITY UNIQUE,

  categoria_id uuid REFERENCES public.categorias_miembro(id) ON DELETE SET NULL,

  -- Alta INSTITUCIONAL. Distinta de `antiguedad_socio().socio_desde`, que es el
  -- primer aporte: alguien puede aportar en marzo y ser aceptado en junio.
  fecha_alta   date NOT NULL DEFAULT current_date,
  fecha_baja   date,

  estado       text NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('pendiente','activo','suspendido','baja')),

  -- Trazabilidad: cuando haya que auditar por qué alguien figura como miembro,
  -- la primera pregunta es si lo puso un trigger o una persona. Misma lección
  -- que `donations.reclamado_en` (10.19).
  alta_origen  text NOT NULL DEFAULT 'automatica'
    CHECK (alta_origen IN ('automatica','solicitud','manual')),

  observaciones text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT miembros_baja_chk  CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_alta),
  -- Un estado 'baja' sin fecha es un dato a medias: no se puede reportar cuántos
  -- se fueron este año. Y una fecha de baja con estado activo es una
  -- contradicción. Las dos direcciones, porque una sola deja el hueco abierto.
  CONSTRAINT miembros_baja_coherente_chk
    CHECK ((estado = 'baja') = (fecha_baja IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_miembros_estado ON public.miembros (estado);

COMMENT ON TABLE public.miembros IS
  'Condicion institucional de una persona en la entidad. NO es el acceso a beneficios (eso se deriva de `aportes`): un miembro puede estar al dia y suspendido, o en regla y con la cuota vencida.';
COMMENT ON COLUMN public.miembros.estado IS
  'pendiente = solicito y espera aprobacion (modo_alta=aprobacion). activo | suspendido (decision de la comision) | baja.';

-- `updated_at` con trigger propio y no genérico: el repo no tiene uno, y
-- agregarlo acá crearía un patrón que las otras 15 tablas no siguen.
CREATE OR REPLACE FUNCTION public.miembros_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_miembros_touch ON public.miembros;
CREATE TRIGGER trg_miembros_touch BEFORE UPDATE ON public.miembros
  FOR EACH ROW EXECUTE FUNCTION public.miembros_touch();

-- ---------------------------------------------------------------------
-- 4) El alta automática
--
-- Se engancha a `aportes` y no a `donations`/`memberships` por la misma razón
-- por la que existe el libro único: el día que entre otra pasarela, o un aporte
-- en efectivo cargado a mano, esto no cambia (10.2).
--
-- CUÁNDO DA DE ALTA: cuando el aporte **otorga acceso** (`acceso_hasta` no nulo).
-- Un aporte de $500 a un destino que no habilita el club se agradece, entra al
-- libro y no convierte a nadie en miembro. Sin esta condición, cualquier peso
-- daría número de socio y el número dejaría de significar algo.
--
-- Y NO REACTIVA A NADIE. Si la persona está 'suspendido' o de 'baja', un aporte
-- nuevo **no** la vuelve a poner en 'activo': la suspensión es una decisión de la
-- comisión y un pago no la revierte. Que un moroso suspendido se rehabilite
-- pagando es una política posible, pero tiene que ser un acto, no un trigger.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.miembro_desde_aporte()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_modo text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.acceso_hasta IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT modo_alta INTO v_modo FROM public.reglas_membresia WHERE vigente LIMIT 1;
  IF COALESCE(v_modo, 'automatica') <> 'automatica' THEN
    RETURN NEW;
  END IF;

  -- `DO NOTHING` y no `DO UPDATE`: si ya hay fila, su estado lo decidió alguien
  -- —la comisión o un alta anterior— y este trigger no es quién para pisarlo.
  -- La categoría sale de `por_defecto`; si la entidad no marcó ninguna, queda
  -- NULL y el descuento es 0, que es un estado legítimo.
  INSERT INTO public.miembros (user_id, fecha_alta, estado, alta_origen, categoria_id)
  VALUES (NEW.user_id, current_date, 'activo', 'automatica',
          public.categoria_miembro_por_defecto())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END $fn$;

-- AFTER, y sobre INSERT **y** UPDATE: el reclamo de aportes (10.19) completa
-- `user_id` y `acceso_hasta` con un UPDATE sobre una fila que ya existía. Solo
-- con INSERT, las 5 donaciones reclamadas no darían de alta a nadie — que es
-- exactamente el caso que hoy tiene el único miembro real del sistema.
DROP TRIGGER IF EXISTS trg_miembro_desde_aporte ON public.aportes;
CREATE TRIGGER trg_miembro_desde_aporte
  AFTER INSERT OR UPDATE OF user_id, acceso_hasta ON public.aportes
  FOR EACH ROW EXECUTE FUNCTION public.miembro_desde_aporte();

-- ---------------------------------------------------------------------
-- 5) Consulta
--
-- `es_miembro()` responde por la CONDICIÓN, no por el acceso. Las dos preguntas
-- conviven y el sistema tiene que poder hacer cada una por separado: eso es lo
-- que 10.2 pedía cuando separó "socio" de "acceso".
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_miembro(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.miembros WHERE user_id = p_user_id AND estado = 'activo'
  );
$$;

CREATE OR REPLACE FUNCTION public.es_miembro()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.es_miembro(auth.uid());
$$;

-- ¿La categoría de esta persona vota? Resuelve la herencia NULL -> entidad en un
-- solo lugar, para que ninguna pantalla la reimplemente.
CREATE OR REPLACE FUNCTION public.miembro_vota(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT COALESCE(c.otorga_voto, r.otorga_voto)
       FROM public.miembros m
       LEFT JOIN public.categorias_miembro c ON c.id = m.categoria_id
       CROSS JOIN LATERAL (
         SELECT otorga_voto FROM public.reglas_membresia WHERE vigente LIMIT 1
       ) r
      WHERE m.user_id = p_user_id AND m.estado = 'activo'),
    false);
$$;

-- El descuento en actividades que le corresponde. 0 si no es miembro activo o si
-- su categoría no da descuento. Lo consume `precio_actividad_para()`.
CREATE OR REPLACE FUNCTION public.descuento_actividades(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT c.descuento_actividades_pct
       FROM public.miembros m
       JOIN public.categorias_miembro c ON c.id = m.categoria_id
      WHERE m.user_id = p_user_id AND m.estado = 'activo' AND c.activa),
    0);
$$;

-- La vista de la propia persona. Junta condición + antigüedad para que el
-- carnet y el estado de cuenta hagan UNA llamada y no tres que puedan
-- desincronizarse — la lección de /dashboard vs /carnet (10.23).
DROP FUNCTION IF EXISTS public.mi_membresia();
CREATE FUNCTION public.mi_membresia()
RETURNS TABLE (
  es_miembro     boolean,
  numero         bigint,
  estado         text,
  fecha_alta     date,
  fecha_baja     date,
  categoria      text,
  vota           boolean,
  descuento_pct  integer,
  socio_desde    date,
  meses_aportados integer,
  racha_meses    integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(m.estado = 'activo', false),
    m.numero,
    m.estado,
    m.fecha_alta,
    m.fecha_baja,
    c.nombre,
    public.miembro_vota(auth.uid()),
    public.descuento_actividades(auth.uid()),
    a.socio_desde,
    a.meses_aportados,
    a.racha_meses
  FROM (SELECT auth.uid() AS uid) s
  LEFT JOIN public.miembros m ON m.user_id = s.uid
  LEFT JOIN public.categorias_miembro c ON c.id = m.categoria_id
  CROSS JOIN LATERAL public.antiguedad_socio(s.uid) a;
$$;

-- ---------------------------------------------------------------------
-- 6) La suspensión y el acceso — el interruptor de 1)
--
-- `acceso_vigente()` se REDEFINE acá para contemplar `suspension_corta_acceso`.
-- Se toca la función existente en vez de crear una segunda porque el club, el
-- carnet y el dashboard ya la consumen: una segunda fuente de verdad sobre el
-- acceso es exactamente el bug de 10.23, y no se repite a propósito.
--
-- ⚠️ CON EL DEFAULT (`false`) EL COMPORTAMIENTO ES IDÉNTICO AL ANTERIOR. El
-- LEFT JOIN no puede quitarle acceso a nadie mientras el parámetro esté en
-- false, y `acceso-check.sql` ejercita las dos ramas.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.acceso_vigente(uuid);
CREATE FUNCTION public.acceso_vigente(p_user_id uuid)
RETURNS TABLE (tiene_acceso boolean, vence_el date, origen text, en_gracia boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH regla AS (
    SELECT COALESCE(max(dias_gracia), 0) AS dias_gracia
      FROM public.reglas_acceso WHERE vigente
  ),
  -- ¿Esta entidad quita los beneficios al suspender, y esta persona está
  -- suspendida o de baja? Las dos condiciones, o no aplica.
  bloqueo AS (
    SELECT COALESCE(
      (SELECT rm.suspension_corta_acceso FROM public.reglas_membresia rm WHERE rm.vigente LIMIT 1)
      AND EXISTS (SELECT 1 FROM public.miembros m
                   WHERE m.user_id = p_user_id AND m.estado IN ('suspendido','baja')),
      false) AS cortado
  ),
  ultimo AS (
    SELECT a.acceso_hasta,
           a.origen,
           (a.origen = 'membresia'
            OR (a.origen = 'manual' AND a.equivale_a = 'cuota')) AS con_gracia
      FROM public.aportes a
     WHERE a.user_id = p_user_id AND a.acceso_hasta IS NOT NULL
     ORDER BY a.acceso_hasta DESC
     LIMIT 1
  )
  SELECT
    NOT b.cortado AND COALESCE(u.acceso_hasta >= current_date
             OR (u.con_gracia AND u.acceso_hasta + r.dias_gracia >= current_date), false),
    u.acceso_hasta,
    u.origen,
    NOT b.cortado AND COALESCE(u.acceso_hasta < current_date
             AND u.con_gracia
             AND u.acceso_hasta + r.dias_gracia >= current_date, false)
  FROM regla r CROSS JOIN bloqueo b LEFT JOIN ultimo u ON true;
$$;

-- `acceso_vigente` se recreó con DROP: las funciones que la envuelven pierden el
-- vínculo por OID y hay que recrearlas. No es opcional — sin esto, `mi_acceso()`
-- queda apuntando a una función que ya no existe.
CREATE OR REPLACE FUNCTION public.tiene_acceso(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(p_user_id) av), false);
$$;

CREATE OR REPLACE FUNCTION public.tiene_acceso()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(auth.uid()) av), false);
$$;

DROP FUNCTION IF EXISTS public.mi_acceso();
CREATE FUNCTION public.mi_acceso()
RETURNS TABLE (tiene_acceso boolean, vence_el date, origen text, en_gracia boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.acceso_vigente(auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 7) Los actos: solicitar, aprobar, cambiar de estado
--
-- Ninguno es un trigger. Dar de alta, suspender y dar de baja son decisiones, y
-- la lección de `reclamar_donaciones()` (10.19) fue que lo que otorga condición
-- se hace por acto explícito y con la identidad probada de quien lo hace.
-- ---------------------------------------------------------------------

-- Para entidades con `modo_alta = 'aprobacion'`. Deja la fila en 'pendiente':
-- solicitar no es ser miembro.
CREATE OR REPLACE FUNCTION public.solicitar_membresia()
RETURNS TABLE (estado text, numero bigint)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid  uuid := auth.uid();
  v_modo text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Hay que iniciar sesion para solicitar la membresia.' USING ERRCODE = '28000';
  END IF;

  SELECT modo_alta INTO v_modo FROM public.reglas_membresia WHERE vigente LIMIT 1;

  -- En una entidad de alta automática esto no es un error del usuario: es una
  -- pantalla que no debería haberle ofrecido el botón. Se responde con el estado
  -- real en vez de fallar, para que la UI se corrija sola.
  INSERT INTO public.miembros (user_id, fecha_alta, estado, alta_origen, categoria_id)
  VALUES (v_uid, current_date,
          CASE WHEN COALESCE(v_modo,'automatica') = 'aprobacion' THEN 'pendiente' ELSE 'activo' END,
          'solicitud', public.categoria_miembro_por_defecto())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY SELECT m.estado, m.numero FROM public.miembros m WHERE m.user_id = v_uid;
END $fn$;

-- Cambio de estado por la comisión. Una sola función para los cuatro estados:
-- con una por estado, la coherencia de `fecha_baja` habría que escribirla cuatro
-- veces, y en la cuarta se olvida.
CREATE OR REPLACE FUNCTION public.cambiar_estado_miembro(p_user_id uuid, p_estado text, p_motivo text DEFAULT NULL)
RETURNS TABLE (user_id uuid, estado text, numero bigint)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_renumera boolean;
  v_anterior text;
BEGIN
  IF NOT public.is_board_member() THEN
    RAISE EXCEPTION 'Solo la comision puede cambiar la condicion de un miembro.' USING ERRCODE = '42501';
  END IF;

  IF p_estado NOT IN ('pendiente','activo','suspendido','baja') THEN
    RAISE EXCEPTION 'Estado invalido: %', p_estado USING ERRCODE = '22023';
  END IF;

  SELECT m.estado INTO v_anterior FROM public.miembros m WHERE m.user_id = p_user_id;
  IF v_anterior IS NULL THEN
    RAISE EXCEPTION 'Esa persona no tiene ficha de miembro.' USING ERRCODE = 'P0002';
  END IF;

  SELECT renumera_al_reingresar INTO v_renumera FROM public.reglas_membresia WHERE vigente LIMIT 1;

  UPDATE public.miembros m
     SET estado     = p_estado,
         -- La coherencia que exige `miembros_baja_coherente_chk`, resuelta en el
         -- único lugar donde se cambia el estado.
         fecha_baja = CASE WHEN p_estado = 'baja' THEN COALESCE(m.fecha_baja, current_date) ELSE NULL END,
         -- Reingreso: solo si la entidad lo pidió. El default conserva el número.
         numero     = CASE
                        WHEN p_estado = 'activo' AND v_anterior = 'baja' AND COALESCE(v_renumera, false)
                          THEN nextval(pg_get_serial_sequence('public.miembros','numero'))
                        ELSE m.numero
                      END,
         observaciones = CASE
                           WHEN p_motivo IS NULL THEN m.observaciones
                           ELSE COALESCE(m.observaciones || E'\n', '') ||
                                format('%s -> %s el %s: %s', v_anterior, p_estado, current_date, p_motivo)
                         END
   WHERE m.user_id = p_user_id;

  RETURN QUERY SELECT m.user_id, m.estado, m.numero FROM public.miembros m WHERE m.user_id = p_user_id;
END $fn$;

-- ---------------------------------------------------------------------
-- 8) RLS
--
-- Mismo criterio que `aportes`: esta tabla otorga CONDICIÓN, no plata, pero un
-- INSERT ajeno se convierte en "figuro como socio activo desde 2019". Escritura
-- solo por las funciones de arriba y por la comisión.
-- ---------------------------------------------------------------------
ALTER TABLE public.reglas_membresia   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_miembro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembros           ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.reglas_membresia   FROM anon, authenticated;
REVOKE ALL ON public.categorias_miembro FROM anon, authenticated;
REVOKE ALL ON public.miembros           FROM anon, authenticated;

-- Lectura pública de los parámetros y las categorías: la página que invita a
-- asociarse tiene que poder mostrar los planes y decir si se vota. No hay nada
-- personal en ninguna de las dos.
GRANT SELECT ON public.reglas_membresia   TO anon, authenticated;
GRANT SELECT ON public.categorias_miembro TO anon, authenticated;
-- `miembros` NO: el padrón es dato personal. Cada quien ve su fila y nada más.
GRANT SELECT ON public.miembros TO authenticated;

DROP POLICY IF EXISTS reglas_membresia_public_read ON public.reglas_membresia;
CREATE POLICY reglas_membresia_public_read ON public.reglas_membresia
  FOR SELECT USING (vigente);

DROP POLICY IF EXISTS reglas_membresia_board_all ON public.reglas_membresia;
CREATE POLICY reglas_membresia_board_all ON public.reglas_membresia
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

DROP POLICY IF EXISTS categorias_miembro_public_read ON public.categorias_miembro;
CREATE POLICY categorias_miembro_public_read ON public.categorias_miembro
  FOR SELECT USING (activa);

DROP POLICY IF EXISTS categorias_miembro_board_all ON public.categorias_miembro;
CREATE POLICY categorias_miembro_board_all ON public.categorias_miembro
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

DROP POLICY IF EXISTS miembros_self_read ON public.miembros;
CREATE POLICY miembros_self_read ON public.miembros
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_board_member());

-- Escritura: solo la comisión, y aun así el camino recomendado es
-- `cambiar_estado_miembro()`, que mantiene la coherencia de `fecha_baja`.
DROP POLICY IF EXISTS miembros_board_write ON public.miembros;
CREATE POLICY miembros_board_write ON public.miembros
  FOR ALL TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

-- ---------------------------------------------------------------------
-- 9) Permisos sobre las funciones
--
-- Las que reciben un uuid no las ejecuta nadie con sesión: con SECURITY DEFINER
-- serían un oráculo para preguntar por la condición institucional de otro. Es la
-- misma regla que dejó `tiene_acceso(uuid)` fuera del alcance de `authenticated`
-- en la capa de acceso.
-- ---------------------------------------------------------------------
-- Lectura pública: la página que invita a asociarse necesita saber qué categoría
-- le tocaría a alguien que se suma. No revela nada de ninguna persona.
GRANT EXECUTE ON FUNCTION public.categoria_miembro_por_defecto() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.es_miembro(uuid)             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.miembro_vota(uuid)           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.descuento_actividades(uuid)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.miembro_desde_aporte()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.miembros_touch()             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.solicitar_membresia()        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cambiar_estado_miembro(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.es_miembro(uuid)            TO service_role;
GRANT EXECUTE ON FUNCTION public.miembro_vota(uuid)          TO service_role;
GRANT EXECUTE ON FUNCTION public.descuento_actividades(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.es_miembro()                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_membresia()              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.solicitar_membresia()       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_miembro(uuid, text, text) TO authenticated, service_role;

-- Recreadas en 6: hay que devolverles los permisos que tenían.
REVOKE ALL ON FUNCTION public.acceso_vigente(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tiene_acceso(uuid)   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acceso_vigente(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso(uuid)   TO service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso()       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_acceso()          TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 10) Backfill
--
-- Quien ya tiene acceso vigente ya era miembro de hecho: no tener la ficha es un
-- accidente de que la tabla no existía. Sin esto, el único miembro real del
-- sistema quedaría afuera de su propio padrón.
--
-- Idempotente por el `ON CONFLICT`. Solo corre si la entidad es de alta
-- automática: en una de aprobación, dar de alta a 23 personas de una sin que la
-- comisión lo pida sería inventar un padrón.
-- ---------------------------------------------------------------------
INSERT INTO public.miembros (user_id, fecha_alta, estado, alta_origen, categoria_id, observaciones)
SELECT DISTINCT a.user_id,
       COALESCE(min(a.acceso_desde), current_date),
       'activo',
       'automatica',
       public.categoria_miembro_por_defecto(),
       'Alta retroactiva al crear el padron (ROADMAP 10.1.a).'
  FROM public.aportes a
 WHERE a.user_id IS NOT NULL
   AND a.acceso_hasta IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.reglas_membresia WHERE vigente AND modo_alta = 'automatica')
 GROUP BY a.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Y los que ya estaban sin categoría: si la entidad marca una por defecto DESPUÉS
-- de que existiera el padrón (que es el caso de la Fundación, donde la categoría
-- se siembra aparte), sin esto los primeros miembros quedan afuera para siempre.
--
-- Solo toca `categoria_id IS NULL`: una categoría asignada a mano por la comisión
-- no se pisa.
UPDATE public.miembros
   SET categoria_id = public.categoria_miembro_por_defecto()
 WHERE categoria_id IS NULL
   AND public.categoria_miembro_por_defecto() IS NOT NULL;
