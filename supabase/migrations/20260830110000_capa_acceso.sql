-- =====================================================================
-- CAPA DE ACCESO sobre el libro de aportes (ROADMAP §10, §10.7)
--
-- El libro (`aportes`) y los destinos ya existen. Lo que falta es la mitad que
-- nunca se construyó: **que un aporte habilite algo**. Hoy los aportes tienen
-- `acceso_desde`/`acceso_hasta` en NULL y ningún beneficio distingue un socio
-- de un visitante (10.1.b).
--
-- Esta migración NO recrea nada de lo que ya está. Se apoya en el esquema real:
-- `origen` ∈ (donacion|membresia|manual), `referencia_externa` como clave de
-- idempotencia, `destino_id` NOT NULL, y el CHECK `aportes_acceso_chk` que ya
-- contempla que un aporte pueda no otorgar acceso (ambas fechas NULL).
--
-- Decisiones de la Fundación (2026-08-30):
--   D2/D3 — cuota $5.000; el piso para que una donación otorgue acceso ES el
--           precio de la cuota. Se modela `piso_monto NULL` = "usar la cuota",
--           para que al subir la cuota el piso suba solo.
--   D4    — la antigüedad son tres números, no uno (ver `antiguedad_socio()`).
--   manual — la comisión elige, al cargarlo, si ese aporte equivale a una cuota
--           o a una donación (columna `equivale_a`). De eso depende la gracia.
--   destinos — todos otorgan acceso por defecto; las excepciones se marcan con
--           `destinos.otorga_acceso = false`. Que "Kit del jugador" habilite el
--           club tiene que ser una decisión visible, no un efecto lateral.
-- =====================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Parámetros de conversión (configurables por entidad, ROADMAP 10.5)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reglas_acceso (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuota_referencia numeric NOT NULL CHECK (cuota_referencia > 0),
  piso_monto       numeric CHECK (piso_monto >= 0),
  meses_minimos    integer NOT NULL DEFAULT 1  CHECK (meses_minimos >= 0),
  meses_maximos    integer NOT NULL DEFAULT 12 CHECK (meses_maximos >= 1),
  dias_gracia      integer NOT NULL DEFAULT 30 CHECK (dias_gracia   >= 0),
  vigente          boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reglas_acceso_meses_chk CHECK (meses_maximos >= meses_minimos)
);

-- Converge desde una versión anterior de esta migración (ver CLAUDE.md:
-- `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe).
ALTER TABLE public.reglas_acceso ADD COLUMN IF NOT EXISTS dias_gracia integer NOT NULL DEFAULT 30;
ALTER TABLE public.reglas_acceso ALTER COLUMN piso_monto DROP NOT NULL;
ALTER TABLE public.reglas_acceso ALTER COLUMN piso_monto DROP DEFAULT;

COMMENT ON COLUMN public.reglas_acceso.piso_monto IS
  'Monto mínimo para que una donación otorgue acceso. NULL = usar cuota_referencia. Por debajo se agradece la donación pero no da acceso: si no, donar sale más barato que ser socio (ROADMAP 10.4).';
COMMENT ON COLUMN public.reglas_acceso.dias_gracia IS
  'Tolerancia tras el vencimiento, solo para aportes que equivalen a una cuota: un cobro recurrente falla por tarjeta vencida más que por decisión.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_reglas_acceso_una_vigente
  ON public.reglas_acceso ((vigente)) WHERE vigente;

INSERT INTO public.reglas_acceso (cuota_referencia, piso_monto, meses_minimos, meses_maximos, dias_gracia)
SELECT 5000, NULL, 1, 12, 30
WHERE NOT EXISTS (SELECT 1 FROM public.reglas_acceso);

ALTER TABLE public.reglas_acceso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reglas_acceso FROM anon, authenticated;
GRANT SELECT ON public.reglas_acceso TO anon, authenticated;

-- Lectura pública: la página de donaciones tiene que poder explicar cuántos
-- meses de acceso da cada monto. Escritura, solo admin/comisión.
DROP POLICY IF EXISTS reglas_acceso_public_read ON public.reglas_acceso;
CREATE POLICY reglas_acceso_public_read ON public.reglas_acceso
  FOR SELECT USING (vigente);

DROP POLICY IF EXISTS reglas_acceso_board_all ON public.reglas_acceso;
CREATE POLICY reglas_acceso_board_all ON public.reglas_acceso
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

-- ---------------------------------------------------------------------
-- 2) Columnas nuevas sobre lo que ya existe
-- ---------------------------------------------------------------------

-- Un aporte `manual` (efectivo, transferencia) puede ser el pago de una cuota o
-- una donación suelta, y no hay forma de deducirlo. Lo elige la comisión al
-- cargarlo; de eso depende si le corresponden los días de gracia.
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS equivale_a text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_equivale_a_chk'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE public.aportes ADD CONSTRAINT aportes_equivale_a_chk
      CHECK (equivale_a IS NULL OR equivale_a IN ('cuota','donacion'));
  END IF;
END $$;
COMMENT ON COLUMN public.aportes.equivale_a IS
  'Solo para origen=manual: si ese aporte equivale a una cuota (con gracia) o a una donación (sin gracia). NULL en los automáticos, que ya se distinguen por `origen`.';

-- Todos los destinos otorgan acceso salvo que se diga lo contrario.
ALTER TABLE public.destinos ADD COLUMN IF NOT EXISTS otorga_acceso boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.destinos.otorga_acceso IS
  'false = aportar a este destino NO habilita el club de beneficios. Default true: la excepción se marca, no se asume.';

-- El interruptor que hace que la cuota valga algo (10.1.b). Default false para
-- no cambiar el comportamiento actual al aplicar.
ALTER TABLE public.benefits ADD COLUMN IF NOT EXISTS requiere_acceso boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.benefits.requiere_acceso IS
  'true = solo para quien tiene acceso vigente. ⚠️ El bloqueo es UX, no seguridad: `codigo` sigue siendo de lectura pública hasta los canjes de §11 fase 2.';

-- ---------------------------------------------------------------------
-- 3) La regla de conversión, en un solo lugar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meses_por_donacion(p_monto numeric)
RETURNS integer
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
           WHEN p_monto < COALESCE(r.piso_monto, r.cuota_referencia) THEN 0
           ELSE LEAST(r.meses_maximos,
                      GREATEST(r.meses_minimos, floor(p_monto / r.cuota_referencia)::int))
         END
    FROM public.reglas_acceso r WHERE r.vigente LIMIT 1;
$$;

COMMENT ON FUNCTION public.meses_por_donacion(numeric) IS
  'Conversión donación → meses de acceso: proporcional, con piso y topes. 0 = no otorga acceso. Única fuente de la regla: la usan los triggers y el backfill.';

-- Encadena períodos sin huecos ni solapamientos: si ya hay acceso pago hasta una
-- fecha futura, el período nuevo arranca al día siguiente; si está vencido, hoy.
CREATE OR REPLACE FUNCTION public.proximo_acceso_desde(p_user_id uuid)
RETURNS date
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT GREATEST(current_date,
                  COALESCE((SELECT max(acceso_hasta) + 1 FROM public.aportes
                             WHERE user_id = p_user_id AND acceso_hasta IS NOT NULL),
                           current_date));
$$;

-- ¿El destino de este aporte habilita el club?
CREATE OR REPLACE FUNCTION public.destino_otorga_acceso(p_destino_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT otorga_acceso FROM public.destinos WHERE id = p_destino_id), false);
$$;

-- ---------------------------------------------------------------------
-- 4) Consulta del acceso
--
-- `origen` manda: 'membresia' (y 'manual' marcado como cuota) tienen gracia,
-- porque un cobro recurrente falla por motivos técnicos. Una donación puntual no
-- "falla": simplemente se terminó.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.acceso_vigente(uuid);
CREATE FUNCTION public.acceso_vigente(p_user_id uuid)
RETURNS TABLE (tiene_acceso boolean, vence_el date, origen text, en_gracia boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH regla AS (
    SELECT COALESCE(max(dias_gracia), 0) AS dias_gracia
      FROM public.reglas_acceso WHERE vigente
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
    COALESCE(u.acceso_hasta >= current_date
             OR (u.con_gracia AND u.acceso_hasta + r.dias_gracia >= current_date), false),
    u.acceso_hasta,
    u.origen,
    COALESCE(u.acceso_hasta < current_date
             AND u.con_gracia
             AND u.acceso_hasta + r.dias_gracia >= current_date, false)
  FROM regla r LEFT JOIN ultimo u ON true;
$$;

-- Con parámetro: solo `service_role`. Es el contrato que van a consumir las
-- Edge Functions del club (§11.7).
CREATE OR REPLACE FUNCTION public.tiene_acceso(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(p_user_id) av), false);
$$;

-- Sin parámetro: la que va dentro de las policies RLS y la que pueden ejecutar
-- los usuarios. No se le puede preguntar por otro.
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
-- 5) Antigüedad (D4): no es un número, son tres
--
--   socio_desde     — primer aporte. NUNCA se reinicia. Va en el carnet.
--   meses_aportados — tiempo realmente cubierto, sin contar dos veces los
--                     solapamientos. Es lo que OTORGA DERECHOS.
--   racha_meses     — tramo continuo actual. Premia la continuidad.
--
-- `range_agg` une los rangos solapados y deja los huecos a la vista. Sumar días
-- a mano es donde aparece el doble conteo: un doble pago valdría doble.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.antiguedad_socio(uuid);
CREATE FUNCTION public.antiguedad_socio(p_user_id uuid)
RETURNS TABLE (socio_desde date, dias_aportados integer, meses_aportados integer,
               racha_dias integer, racha_meses integer, cortes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH unido AS (
    SELECT range_agg(daterange(acceso_desde, acceso_hasta, '[]')) AS mr
      FROM public.aportes
     WHERE user_id = p_user_id AND acceso_desde IS NOT NULL AND acceso_hasta IS NOT NULL
  ),
  tramos AS (SELECT unnest(mr) AS tramo FROM unido WHERE mr IS NOT NULL),
  actual AS (SELECT tramo FROM tramos WHERE tramo @> current_date LIMIT 1)
  SELECT
    (SELECT min(lower(tramo)) FROM tramos),
    (SELECT COALESCE(sum(upper(tramo) - lower(tramo)), 0)::int FROM tramos),
    (SELECT COALESCE(sum(upper(tramo) - lower(tramo)), 0)::int / 30 FROM tramos),
    (SELECT COALESCE((SELECT upper(tramo) - lower(tramo) FROM actual), 0)::int),
    (SELECT COALESCE((SELECT upper(tramo) - lower(tramo) FROM actual), 0)::int / 30),
    (SELECT GREATEST(count(*)::int - 1, 0) FROM tramos);
$$;

DROP FUNCTION IF EXISTS public.mi_antiguedad();
CREATE FUNCTION public.mi_antiguedad()
RETURNS TABLE (socio_desde date, dias_aportados integer, meses_aportados integer,
               racha_dias integer, racha_meses integer, cortes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.antiguedad_socio(auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 6) Permisos: nadie puede preguntar por el acceso de otro
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.acceso_vigente(uuid)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tiene_acceso(uuid)         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.antiguedad_socio(uuid)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proximo_acceso_desde(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acceso_vigente(uuid)       TO service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso(uuid)         TO service_role;
GRANT EXECUTE ON FUNCTION public.antiguedad_socio(uuid)     TO service_role;
GRANT EXECUTE ON FUNCTION public.proximo_acceso_desde(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso()             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_acceso()                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_antiguedad()            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.meses_por_donacion(numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.destino_otorga_acceso(uuid) TO authenticated, service_role;
