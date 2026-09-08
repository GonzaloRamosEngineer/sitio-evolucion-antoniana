-- =============================================================================
-- El reporte al comercio decía «$0 de ahorro» cuando el ahorro NO ES CALCULABLE
-- =============================================================================
-- LO ENCONTRÓ CORRER EL REPORTE CONTRA LOS DATOS REALES, no un test. Las
-- assertions de `club-check.sql` usan un beneficio de tipo 'porcentaje', que
-- siempre tiene ahorro; el único canje real de producción es de tipo 'regalo',
-- que NO lo tiene. El caso que rompía era justo el que ningún test tocaba.
--
-- QUÉ ESTABA MAL. Las tres funciones traían `COALESCE(sum(ahorro), 0)`. Para un
-- comercio cuyos canjes son 2x1 o regalo eso convierte «no calculable» en
-- «cero», y el panel le muestra al comercio **«Ahorro que diste: $0»** después
-- de que regaló algo de verdad.
--
-- Y es exactamente lo que el propio ROADMAP declara que no puede pasar, en la
-- lista de «lo que NO es deuda, aunque lo parezca»:
--
--     `ahorro` en NULL para 2x1 y regalo no es un dato faltante: es
--     «no calculable», y un 0 mentiría en el reporte al comercio (§11.7.12).
--
-- El COALESCE lo escribí yo tres horas antes de leer esa línea. La regla estaba
-- escrita, verificada y a la vista — y el error entró igual, porque el `sum()`
-- de una columna que puede ser NULL *parece* que necesita un COALESCE.
--
-- CÓMO SE ARREGLA, y por qué no alcanza con sacar el COALESCE. Devolver NULL a
-- secas dejaría al panel sin poder distinguir «este comercio no tuvo canjes» de
-- «los tuvo y su ahorro no se puede calcular». Se agrega `canjes_con_ahorro`,
-- que es el mismo patrón que ya usa `canjes_con_monto` para el consumo: **el
-- número viaja con su cobertura**, y la pantalla decide qué decir.
--
--   canjes_con_ahorro = 0  y confirmados > 0  -> «no calculable» (2x1 / regalo)
--   canjes_con_ahorro < confirmados           -> el total es parcial, avisarlo
--   canjes_con_ahorro = confirmados           -> el total es el total
-- =============================================================================

-- ⚠️ HAY QUE DROPEAR ANTES. `CREATE OR REPLACE FUNCTION` **no puede cambiar el
-- tipo de retorno**: falla con «cannot change return type of existing function».
-- Y acá el RETURNS TABLE cambia, porque suma la columna `canjes_con_ahorro`.
-- Sin estos DROP la migración aborta entera y las funciones quedan como estaban
-- —o sea, mintiendo— sin que nada más falle.
DROP FUNCTION IF EXISTS public.club_reporte_comercio(uuid, date, date);
DROP FUNCTION IF EXISTS public.club_reporte_comercio_por_beneficio(uuid, date, date);
DROP FUNCTION IF EXISTS public.club_reporte_comercio_por_mes(uuid, integer);

CREATE OR REPLACE FUNCTION public.club_reporte_comercio(
  p_comercio_id uuid,
  p_desde       date DEFAULT NULL,
  p_hasta       date DEFAULT NULL
)
RETURNS TABLE (
  canjes_confirmados   integer,
  personas             integer,
  personas_recurrentes integer,
  -- ⚠️ NULL = «no calculable», y NO es lo mismo que 0. Ver la cabecera.
  ahorro_total         numeric,
  canjes_con_ahorro    integer,
  consumo_declarado    numeric,
  canjes_con_monto     integer,
  canjes_generados     integer,
  canjes_pendientes    integer,
  canjes_expirados     integer,
  canjes_anulados      integer,
  primer_canje         timestamptz,
  ultimo_canje         timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (public.is_comercio_member(p_comercio_id) OR public.is_board_member()) THEN
    RAISE EXCEPTION 'No autorizado: este comercio no es tuyo'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.*
      FROM public.club_canjes c
      JOIN public.club_beneficios b ON b.id = c.beneficio_id
     WHERE b.comercio_id = p_comercio_id
       AND (p_desde IS NULL OR c.created_at >= p_desde::timestamptz)
       -- `< hasta + 1 dia`: con `<=` se pierde todo lo del ultimo dia.
       AND (p_hasta IS NULL OR c.created_at < (p_hasta + 1)::timestamptz)
  ),
  confirmados AS (SELECT * FROM base WHERE estado = 'confirmado'),
  por_persona AS (
    SELECT user_id, count(*) AS veces FROM confirmados GROUP BY user_id
  )
  SELECT
    (SELECT count(*) FROM confirmados)::integer,
    (SELECT count(*) FROM por_persona)::integer,
    (SELECT count(*) FROM por_persona WHERE veces >= 2)::integer,
    -- `sum()` sobre cero filas no-nulas devuelve NULL, y acá eso es la
    -- respuesta correcta, no un descuido.
    (SELECT sum(ahorro) FROM confirmados)::numeric,
    (SELECT count(*) FROM confirmados WHERE ahorro IS NOT NULL)::integer,
    -- El consumo SÍ se coalesce a 0: un monto sin cargar es un dato que
    -- falta, no una magnitud que no exista. Son dos NULL distintos.
    COALESCE((SELECT sum(monto_operacion) FROM confirmados), 0)::numeric,
    (SELECT count(*) FROM confirmados WHERE monto_operacion IS NOT NULL)::integer,
    (SELECT count(*) FROM base)::integer,
    (SELECT count(*) FROM base WHERE estado = 'pendiente')::integer,
    (SELECT count(*) FROM base WHERE estado = 'expirado')::integer,
    (SELECT count(*) FROM base WHERE estado = 'anulado')::integer,
    (SELECT min(created_at) FROM confirmados),
    (SELECT max(created_at) FROM confirmados);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.club_reporte_comercio_por_beneficio(
  p_comercio_id uuid,
  p_desde       date DEFAULT NULL,
  p_hasta       date DEFAULT NULL
)
RETURNS TABLE (
  beneficio_id      uuid,
  titulo            text,
  confirmados       integer,
  personas          integer,
  ahorro_total      numeric,   -- NULL = no calculable
  canjes_con_ahorro integer,
  consumo           numeric,
  sin_confirmar     integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (public.is_comercio_member(p_comercio_id) OR public.is_board_member()) THEN
    RAISE EXCEPTION 'No autorizado: este comercio no es tuyo'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.titulo,
    count(*) FILTER (WHERE c.estado = 'confirmado')::integer,
    count(DISTINCT c.user_id) FILTER (WHERE c.estado = 'confirmado')::integer,
    sum(c.ahorro) FILTER (WHERE c.estado = 'confirmado')::numeric,
    count(*) FILTER (WHERE c.estado = 'confirmado' AND c.ahorro IS NOT NULL)::integer,
    COALESCE(sum(c.monto_operacion) FILTER (WHERE c.estado = 'confirmado'), 0)::numeric,
    count(*) FILTER (WHERE c.estado IN ('pendiente','expirado'))::integer
    FROM public.club_beneficios b
    -- LEFT JOIN a propósito: un beneficio publicado con CERO canjes es el dato
    -- más accionable del reporte, y un INNER JOIN lo haría desaparecer.
    LEFT JOIN public.club_canjes c
           ON c.beneficio_id = b.id
          AND (p_desde IS NULL OR c.created_at >= p_desde::timestamptz)
          AND (p_hasta IS NULL OR c.created_at < (p_hasta + 1)::timestamptz)
   WHERE b.comercio_id = p_comercio_id
   GROUP BY b.id, b.titulo, b.orden
   ORDER BY 3 DESC, b.orden;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.club_reporte_comercio_por_mes(
  p_comercio_id uuid,
  p_meses       integer DEFAULT 12
)
RETURNS TABLE (
  mes          date,
  confirmados  integer,
  personas     integer,
  ahorro_total numeric,   -- NULL = no calculable
  consumo      numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (public.is_comercio_member(p_comercio_id) OR public.is_board_member()) THEN
    RAISE EXCEPTION 'No autorizado: este comercio no es tuyo'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  -- La serie se genera completa y los canjes se le enganchan con LEFT JOIN: un
  -- mes sin canjes tiene que aparecer con 0, no faltar. Un gráfico que saltea
  -- los meses vacíos dibuja una línea plana donde hubo un derrumbe.
  WITH meses AS (
    SELECT generate_series(
             date_trunc('month', now()) - make_interval(months => GREATEST(p_meses, 1) - 1),
             date_trunc('month', now()),
             interval '1 month'
           )::date AS mes
  )
  SELECT
    m.mes,
    count(c.id) FILTER (WHERE c.estado = 'confirmado')::integer,
    count(DISTINCT c.user_id) FILTER (WHERE c.estado = 'confirmado')::integer,
    sum(c.ahorro) FILTER (WHERE c.estado = 'confirmado')::numeric,
    COALESCE(sum(c.monto_operacion) FILTER (WHERE c.estado = 'confirmado'), 0)::numeric
    FROM meses m
    LEFT JOIN public.club_beneficios b ON b.comercio_id = p_comercio_id
    LEFT JOIN public.club_canjes c
           ON c.beneficio_id = b.id
          AND date_trunc('month', c.created_at)::date = m.mes
   GROUP BY m.mes
   ORDER BY m.mes;
END;
$fn$;

-- Los GRANT se vuelven a declarar: la función se dropeó y se creó de nuevo, así
-- que los permisos viejos se fueron con ella. Sin esto, el panel del comercio
-- recibiría un `permission denied` en vez de sus números.
REVOKE ALL ON FUNCTION public.club_reporte_comercio(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.club_reporte_comercio_por_beneficio(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.club_reporte_comercio_por_mes(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_reporte_comercio(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_reporte_comercio_por_beneficio(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_reporte_comercio_por_mes(uuid, integer) TO authenticated;
