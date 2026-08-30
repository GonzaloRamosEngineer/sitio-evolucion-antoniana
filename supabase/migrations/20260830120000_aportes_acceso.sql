-- =====================================================================
-- APORTES → ACCESO  (ROADMAP §10, fase 1 — que es la fase 0 del §11)
--
-- Codifica la regla del dominio: hay dos maneras de aportar (cuota social
-- recurrente o donación puntual) y una sola consecuencia (acceso a beneficios
-- y descuentos). Lo único que varía entre las dos es cuánto dura ese acceso.
--
-- Esta migración es el PRERREQUISITO del club de beneficios (§11): sin
-- `tiene_acceso()` el club no puede distinguir un socio de un visitante y no
-- hay nada que validar en el mostrador.
--
-- Idempotente, como el resto del repo. No incluye backfill: eso va aparte, en
-- `supabase/data/backfill_aportes.sql`, porque depende de una decisión de
-- negocio (desde qué fecha se reconoce antigüedad) y no debe correr solo.
--
-- TRES DESVÍOS respecto del diseño escrito en el ROADMAP §10.2, a propósito:
--
--   1. `reglas_acceso` suma `dias_gracia`. La decisión 10.4.3 recomienda 30
--      días de gracia ante un cobro fallido, pero el diseño no le había dejado
--      lugar. Va acá porque es un parámetro de la entidad, no del software
--      (mismo criterio de 10.5).
--
--   2. El CHECK de origen se relaja. El original exigía `membership_id` o
--      `donation_id` NOT NULL según el tipo, lo que hacía **imposible cargar un
--      aporte en efectivo a mano** — justamente uno de los motivos que el
--      propio §10.2 da para tener esta tabla. Ahora los dos orígenes siguen
--      siendo mutuamente excluyentes, pero ambos pueden ser NULL (carga manual).
--
--   3. `tiene_acceso` queda sobrecargada en dos versiones, por seguridad:
--        - `tiene_acceso()`   → usa auth.uid(). Es la que pueden ejecutar los
--          usuarios y la que se usa dentro de policies RLS. No permite espiar
--          a otro.
--        - `tiene_acceso(uuid)` → solo `service_role`. Es el contrato que
--          consumen las Edge Functions del club (§11.7).
--      Con una sola versión con parámetro y SECURITY DEFINER, cualquier usuario
--      logueado podría preguntar si otra persona paga la cuota.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Reglas de conversión aporte → acceso (configurable por entidad, 10.5)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reglas_acceso (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuota_referencia numeric NOT NULL CHECK (cuota_referencia > 0),
  -- NULL = "el piso ES el precio de la cuota" (decisión D3 de la Fundación,
  -- 2026-08-30). Se modela como NULL y no como un número copiado para que no
  -- puedan desincronizarse: al subir la cuota, el piso sube solo.
  piso_monto       numeric CHECK (piso_monto >= 0),
  meses_minimos    integer NOT NULL DEFAULT 1  CHECK (meses_minimos  >= 0),
  meses_maximos    integer NOT NULL DEFAULT 12 CHECK (meses_maximos  >= 1),
  dias_gracia      integer NOT NULL DEFAULT 30 CHECK (dias_gracia    >= 0),
  vigente          boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reglas_acceso_meses_chk CHECK (meses_maximos >= meses_minimos)
);

-- Convergencia desde una versión anterior de ESTA MISMA migración.
-- `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe: si la base
-- corrió una versión previa, las columnas nuevas nunca aparecen y la migración
-- falla más abajo (pasó en producción el 2026-08-30 con `payment_id`). Todo
-- cambio posterior al primer despliegue tiene que ir además como ALTER.
ALTER TABLE public.reglas_acceso ADD COLUMN IF NOT EXISTS dias_gracia integer NOT NULL DEFAULT 30;
ALTER TABLE public.reglas_acceso ALTER COLUMN piso_monto DROP NOT NULL;
ALTER TABLE public.reglas_acceso ALTER COLUMN piso_monto DROP DEFAULT;

COMMENT ON TABLE public.reglas_acceso IS
  'Parámetros de conversión aporte→acceso. Son de la entidad, no del software (ROADMAP 10.5). Debe haber exactamente una fila vigente.';
COMMENT ON COLUMN public.reglas_acceso.piso_monto IS
  'Monto mínimo para que una donación otorgue acceso. NULL = usar cuota_referencia. Por debajo del piso se agradece la donación pero no da acceso: si no, donar sale más barato que ser socio (ROADMAP 10.4.1).';
COMMENT ON COLUMN public.reglas_acceso.dias_gracia IS
  'Días de tolerancia tras el vencimiento, SOLO para aportes de tipo cuota: un cobro recurrente falla por tarjeta vencida más que por decisión (ROADMAP 10.4.3).';

-- Una sola regla vigente a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reglas_acceso_una_vigente
  ON public.reglas_acceso ((vigente)) WHERE vigente;

-- Regla vigente de la Fundación (decisiones D2 y D3, 2026-08-30):
--   cuota_referencia = 5000  → la cuota social
--   piso_monto       = NULL  → el piso ES la cuota: una donación por debajo de
--                              $5.000 se agradece pero no otorga acceso
--   meses 1..12, gracia 30 días
INSERT INTO public.reglas_acceso (cuota_referencia, piso_monto, meses_minimos, meses_maximos, dias_gracia)
SELECT 5000, NULL, 1, 12, 30
WHERE NOT EXISTS (SELECT 1 FROM public.reglas_acceso);

-- Y si ya está la fila que dejó la versión anterior (cuota 1000 = placeholder,
-- piso 0), se corrige. Sin esto la base quedaba con una regla que acepta
-- donaciones de $1 como si fueran una cuota, en silencio. Solo alcanza a esa
-- firma exacta: un valor puesto a mano por la Fundación no se pisa.
UPDATE public.reglas_acceso
   SET cuota_referencia = 5000, piso_monto = NULL
 WHERE vigente AND cuota_referencia = 1000 AND piso_monto = 0;

-- ---------------------------------------------------------------------
-- 2) APORTES — el libro único. Todo lo que entra cae acá.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aportes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  tipo             text NOT NULL CHECK (tipo IN ('cuota','donacion')),
  monto            numeric NOT NULL CHECK (monto > 0),
  fecha            timestamptz NOT NULL DEFAULT now(),
  membership_id    uuid REFERENCES public.memberships(id) ON DELETE SET NULL,
  donation_id      uuid REFERENCES public.donations(id)   ON DELETE SET NULL,
  -- Id del pago en el proveedor. Es la clave de idempotencia de los triggers:
  -- MercadoPago reintenta los webhooks, y sin esto un reintento otorga un mes
  -- de acceso de regalo.
  payment_id       text,
  acceso_desde     date NOT NULL,
  acceso_hasta     date NOT NULL,
  -- Identidad de respaldo: permite reconciliar a quien aportó sin cuenta (10.1.c)
  email_aportante  text,
  nombre_aportante text,
  observaciones    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aportes_origen_chk CHECK (
    (tipo = 'cuota'    AND donation_id   IS NULL) OR
    (tipo = 'donacion' AND membership_id IS NULL)
  ),
  CONSTRAINT aportes_rango_chk CHECK (acceso_hasta >= acceso_desde)
);

-- Mismo motivo que arriba: columnas agregadas después del primer despliegue.
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS payment_id    text;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS observaciones text;

COMMENT ON TABLE public.aportes IS
  'Libro único de aportes (ROADMAP 10.2). Desacopla el acceso del medio de pago: un aporte en efectivo cargado a mano tiene la misma forma que uno de MercadoPago. ESCRITURA SOLO CON service_role.';

CREATE INDEX IF NOT EXISTS idx_aportes_user_vig ON public.aportes (user_id, acceso_hasta DESC);
CREATE INDEX IF NOT EXISTS idx_aportes_email    ON public.aportes (lower(email_aportante));
CREATE INDEX IF NOT EXISTS idx_aportes_fecha    ON public.aportes (fecha DESC);

-- Idempotencia: un pago del proveedor genera UN aporte, y una donación también.
CREATE UNIQUE INDEX IF NOT EXISTS uq_aportes_payment_id
  ON public.aportes (payment_id) WHERE payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_aportes_donation_id
  ON public.aportes (donation_id) WHERE donation_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3) Las funciones que consulta todo el sistema
-- ---------------------------------------------------------------------

-- Detalle del acceso de un usuario. SOLO service_role / admin: saber si otra
-- persona tiene la cuota al día es información de ella, no pública.
DROP FUNCTION IF EXISTS public.acceso_vigente(uuid);
CREATE FUNCTION public.acceso_vigente(p_user_id uuid)
RETURNS TABLE (tiene_acceso boolean, vence_el date, origen text, en_gracia boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH regla AS (
    SELECT COALESCE(max(dias_gracia), 0) AS dias_gracia
      FROM public.reglas_acceso
     WHERE vigente
  ),
  ultimo AS (
    SELECT a.acceso_hasta, a.tipo
      FROM public.aportes a
     WHERE a.user_id = p_user_id
     ORDER BY a.acceso_hasta DESC
     LIMIT 1
  )
  SELECT
    COALESCE(
      u.acceso_hasta >= current_date
      OR (u.tipo = 'cuota' AND u.acceso_hasta + r.dias_gracia >= current_date),
      false),
    u.acceso_hasta,
    u.tipo,
    COALESCE(
      u.acceso_hasta < current_date
      AND u.tipo = 'cuota'
      AND u.acceso_hasta + r.dias_gracia >= current_date,
      false)
  FROM regla r
  LEFT JOIN ultimo u ON true;
$$;

COMMENT ON FUNCTION public.acceso_vigente(uuid) IS
  'Detalle del acceso de un usuario. Sin permisos para anon/authenticated a propósito: usar mi_acceso() desde el frontend.';

-- Versión booleana CON parámetro: el contrato que consumen las Edge Functions
-- del club (§11.7). Solo service_role.
CREATE OR REPLACE FUNCTION public.tiene_acceso(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(p_user_id) av), false);
$$;

-- Versión SIN parámetro: la que se usa dentro de policies RLS y la que pueden
-- ejecutar los usuarios. No se le puede preguntar por otro.
CREATE OR REPLACE FUNCTION public.tiene_acceso()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(auth.uid()) av), false);
$$;

COMMENT ON FUNCTION public.tiene_acceso() IS
  'Booleano de acceso del usuario actual. Es la que va dentro de las policies RLS (mismo patrón que is_board_member()).';

-- Detalle del acceso propio, para el panel del socio.
DROP FUNCTION IF EXISTS public.mi_acceso();
CREATE FUNCTION public.mi_acceso()
RETURNS TABLE (tiene_acceso boolean, vence_el date, origen text, en_gracia boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.acceso_vigente(auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 4) RLS y permisos
--
-- `aportes` ES LA TABLA QUE OTORGA PRIVILEGIOS. Si alguien puede insertar ahí,
-- se autoconcede beneficios. No hay policy de INSERT/UPDATE/DELETE para nadie:
-- solo escribe `service_role`, que salta RLS. Y se recortan los GRANTs en vez
-- de repetir el patrón amplio de 10.1.g.
-- ---------------------------------------------------------------------
ALTER TABLE public.aportes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reglas_acceso  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.aportes       FROM anon, authenticated;
REVOKE ALL ON public.reglas_acceso FROM anon, authenticated;
GRANT SELECT ON public.aportes       TO authenticated;
GRANT SELECT ON public.reglas_acceso TO anon, authenticated;

DROP POLICY IF EXISTS "aportes_select_propio" ON public.aportes;
CREATE POLICY "aportes_select_propio" ON public.aportes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "aportes_select_comision" ON public.aportes;
CREATE POLICY "aportes_select_comision" ON public.aportes
  FOR SELECT TO authenticated
  USING (public.is_board_member());

-- La regla vigente es pública: la página de donaciones tiene que poder explicar
-- cuántos meses de acceso da cada monto.
DROP POLICY IF EXISTS "reglas_acceso_select_vigente" ON public.reglas_acceso;
CREATE POLICY "reglas_acceso_select_vigente" ON public.reglas_acceso
  FOR SELECT TO anon, authenticated
  USING (vigente);

-- Permisos de ejecución de las funciones.
REVOKE ALL ON FUNCTION public.acceso_vigente(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tiene_acceso(uuid)   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acceso_vigente(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso(uuid)   TO service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso()       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_acceso()          TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5) Beneficios: el interruptor que hace que la cuota valga algo (10.1.b)
--
-- `false` por defecto = comportamiento actual, no rompe nada al aplicarse.
-- ---------------------------------------------------------------------
ALTER TABLE public.benefits
  ADD COLUMN IF NOT EXISTS requiere_acceso boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.benefits.requiere_acceso IS
  'true = solo para quien tiene acceso vigente. El default false preserva el comportamiento previo (ROADMAP 10.4.5).';
