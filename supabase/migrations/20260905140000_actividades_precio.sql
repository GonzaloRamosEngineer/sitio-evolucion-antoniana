-- =============================================================================
-- PRECIO EN ACTIVIDADES — ROADMAP §10.1.d, la mitad NO hecha de la fase 2.
--
-- ⚠️ PRIMERO, LO QUE ESTA MIGRACIÓN **NO** VA A LOGRAR HOY, PARA QUE NADIE LO
-- DESCUBRA DESPUÉS Y CREA QUE ALGO SE ROMPIÓ.
--
-- §10.1.d dice que la distinción entre actividades gratis y pagas "es la mitad
-- del valor de ser socio". Medido contra producción el 2026-09-05: hay **12
-- actividades y ninguna menciona arancel, precio ni cuota** en su descripción.
-- Son todas gratuitas de hecho. Así que al aplicar esto, `precio_general`
-- arranca en 0 en las doce y **en la pantalla no cambia nada**.
--
-- Entonces, ¿por qué se construye igual? Por dos razones, y conviene que estén
-- escritas:
--
--   1. **La primera actividad arancelada no puede esperar a una migración.** El
--      día que la Fundación quiera cobrar un curso, el esquema tiene que estar,
--      porque si no ese día se cobra por afuera y el sistema se entera nunca.
--   2. **Es la pieza que el cliente 2 sí usa desde el día uno.** Un club con
--      escuelita y una cámara con capacitaciones cobran distinto al socio y al
--      externo; ahí `precio_socio` es el producto, no una columna dormida.
--
-- Lo que NO se hace, también a propósito: no se inventan precios. Las doce
-- actividades quedan en 0 = gratis, que es lo que son.
--
-- EL DESCUENTO SALE DE LA CATEGORÍA, NO DE UNA CONSTANTE. `precio_socio` NULL
-- significa "aplicá el descuento que le corresponda a esta persona", y ese
-- porcentaje vive en `categorias_miembro` (20260905120000). Un número escrito en
-- el código sería exactamente lo que §10.5 mandó no hacer.
--
-- Idempotente.
-- =============================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Las columnas
-- ---------------------------------------------------------------------

-- 0 = gratuita. Es el default, así que aplicar esto no vuelve paga ninguna de
-- las que ya existen.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS precio_general numeric NOT NULL DEFAULT 0;

-- NULL = "no hay precio especial fijo, aplicá el descuento de la categoría".
-- Se distingue de 0 a propósito: 0 significa **gratis para el miembro**, que es
-- una decisión distinta y perfectamente común ("los socios entran sin cargo").
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS precio_socio numeric;

DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_precio_general_chk'
                   AND conrelid = 'public.activities'::regclass) THEN
    ALTER TABLE public.activities ADD CONSTRAINT activities_precio_general_chk
      CHECK (precio_general >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_precio_socio_chk'
                   AND conrelid = 'public.activities'::regclass) THEN
    ALTER TABLE public.activities ADD CONSTRAINT activities_precio_socio_chk
      CHECK (precio_socio IS NULL OR precio_socio >= 0);
  END IF;

  -- Un precio de socio MAYOR que el general es siempre un error de carga: nadie
  -- decide que ser miembro salga más caro. Atajarlo en el esquema evita que la
  -- pantalla tenga que preguntarse qué mostrar.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_precio_orden_chk'
                   AND conrelid = 'public.activities'::regclass) THEN
    ALTER TABLE public.activities ADD CONSTRAINT activities_precio_orden_chk
      CHECK (precio_socio IS NULL OR precio_socio <= precio_general);
  END IF;
END $mig$;

COMMENT ON COLUMN public.activities.precio_general IS
  'Precio para quien no es miembro. 0 = actividad gratuita (ROADMAP 10.1.d).';
COMMENT ON COLUMN public.activities.precio_socio IS
  'Precio fijo para miembros. NULL = aplicar el descuento de su categoria (categorias_miembro.descuento_actividades_pct). 0 = gratis para miembros.';

-- ---------------------------------------------------------------------
-- 2) El precio que le corresponde a una persona
--
-- Una sola función, por el mismo motivo que hay una sola `tiene_acceso()`: si el
-- cálculo se reparte entre la card, el detalle y el checkout, en algún momento
-- muestran tres números distintos. Es literalmente el bug de §10.23.
--
-- El orden de las reglas importa y es el que se lee de arriba a abajo:
--   1. Si la actividad es gratis para todos, no hay nada que calcular.
--   2. Si no es miembro activo, paga el general. (Tener acceso vigente no
--      alcanza: el precio de socio es un derecho de la CONDICIÓN, no del pago
--      suelto. Es la separación de §10.2.)
--   3. Si la actividad fija un `precio_socio`, ese manda: es la decisión más
--      específica y le gana al porcentaje general de la categoría.
--   4. Si no, se aplica el descuento de la categoría.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.precio_actividad_para(uuid, uuid);
CREATE FUNCTION public.precio_actividad_para(p_activity_id uuid, p_user_id uuid)
RETURNS TABLE (
  precio_general numeric,
  precio_final   numeric,
  descuento_pct  integer,
  es_gratis      boolean,
  motivo         text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH act AS (
    SELECT a.precio_general AS pg, a.precio_socio AS ps
      FROM public.activities a WHERE a.id = p_activity_id
  ),
  quien AS (
    SELECT public.es_miembro(p_user_id) AS miembro,
           public.descuento_actividades(p_user_id) AS pct
  ),
  calc AS (
    SELECT act.pg,
           quien.miembro,
           quien.pct,
           CASE
             WHEN act.pg = 0            THEN 0
             WHEN NOT quien.miembro     THEN act.pg
             WHEN act.ps IS NOT NULL    THEN act.ps
             ELSE round(act.pg * (100 - quien.pct) / 100.0, 2)
           END AS final,
           CASE
             WHEN act.pg = 0            THEN 'Actividad gratuita'
             WHEN NOT quien.miembro     THEN 'Precio general'
             WHEN act.ps IS NOT NULL    THEN 'Precio para miembros'
             WHEN quien.pct > 0         THEN format('Descuento de miembro: %s%%', quien.pct)
             ELSE 'Precio general'
           END AS por_que
      FROM act CROSS JOIN quien
  )
  SELECT c.pg,
         c.final,
         -- El porcentaje EFECTIVO, no el de la categoría: si la actividad fijó
         -- un `precio_socio`, el descuento real puede no ser el de la categoría,
         -- y mostrar el de la categoría sería mentirle a la pantalla.
         CASE WHEN c.pg > 0 THEN round((c.pg - c.final) * 100 / c.pg)::int ELSE 0 END,
         c.final = 0,
         c.por_que
    FROM calc c;
$$;

COMMENT ON FUNCTION public.precio_actividad_para(uuid, uuid) IS
  'Precio que le corresponde a una persona en una actividad. Unica fuente del calculo: la card, el detalle y el checkout la consultan y no reimplementan nada.';

-- La versión de la sesión. No existe forma de preguntar por el precio de otro
-- con sesión de usuario, por la misma razón que `tiene_acceso(uuid)` no la tiene.
DROP FUNCTION IF EXISTS public.mi_precio_actividad(uuid);
CREATE FUNCTION public.mi_precio_actividad(p_activity_id uuid)
RETURNS TABLE (
  precio_general numeric,
  precio_final   numeric,
  descuento_pct  integer,
  es_gratis      boolean,
  motivo         text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.precio_actividad_para(p_activity_id, auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 3) Permisos
--
-- La de dos parámetros, solo `service_role`: con SECURITY DEFINER y un uuid
-- ajeno sería un oráculo para saber si otra persona es miembro y de qué
-- categoría — se deduce del precio que le devuelve.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.precio_actividad_para(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.precio_actividad_para(uuid, uuid) TO service_role;

-- Esta sí para todos: `anon` la llama con `auth.uid()` NULL y recibe el precio
-- general, que es exactamente lo que le corresponde ver a quien no inició sesión.
GRANT EXECUTE ON FUNCTION public.mi_precio_actividad(uuid) TO anon, authenticated, service_role;
