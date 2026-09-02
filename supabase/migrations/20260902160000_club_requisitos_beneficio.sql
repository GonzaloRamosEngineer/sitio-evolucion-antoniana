-- =====================================================================
-- CLUB — REQUISITOS POR BENEFICIO: que el umbral sea proporcional al valor
-- (ROADMAP §12.11)
--
-- EL PROBLEMA, CON LOS NÚMEROS REALES. La regla de acceso es una sola para
-- todo: $5.000 (`cuota_referencia`) dan un mes. El beneficio de DigitalMatch es
-- 30% sobre desarrollo web, y una cotización va de $150.000 a $500.000. O sea
-- que **$5.000 desbloquean entre $45.000 y $150.000**, y el límite es
-- `1/total`: un canje por persona en la vida.
--
-- La estrategia óptima del socio era: aportar $5.000 una vez, canjear, e irse.
-- **El club premiaba irse**, que es exactamente lo contrario de lo que §10.7
-- identificó como el motivo más fuerte para aportar (la pertenencia sostenida).
--
-- POR QUÉ NO SE ARREGLA SUBIENDO LA CUOTA. Decisión de la entidad (§12.11): la
-- cuota se mantiene simbólica —$5.000— porque el objetivo es VOLUMEN de socios,
-- no margen por socio. Una cuota de $25.000 no llegaría ni al 10% del alcance.
-- Así que el beneficio caro no se protege encareciendo la entrada: se protege
-- **pidiendo tiempo**. Entrada baratísima para maximizar socios, y antigüedad
-- para desbloquear lo caro.
--
-- POR QUÉ NO SE ARREGLA PARTIENDO EL DESCUENTO. Se evaluó que el comercio diera
-- 10% a la persona y donara 20% a la Fundación. El instinto es correcto —el
-- valor debería volver en parte a la entidad— pero el mecanismo convierte un
-- DESCUENTO (el comercio resigna margen, no se mueve plata) en una COBRANZA CON
-- RENDICIÓN: el comercio factura el total, tributa sobre el total y transfiere.
-- La Fundación pasa a ser acreedora de cada comercio, y **obliga a reabrir
-- §12.9.2**, que dejó el monto opcional justamente porque exigirlo hace que el
-- cajero lo complete con cualquier número. La misma economía se consigue acá,
-- sin que se mueva un peso entre las partes.
--
-- LAS TRES COLUMNAS SON NULLABLE Y NO CAMBIAN NADA POR SÍ SOLAS. Un beneficio
-- sin requisitos se comporta igual que antes. Los números son DATOS y se editan
-- desde el ABM: es la regla de §11.4 —lo que varía por entidad va en datos— y
-- la de §12.6 —los umbrales se fijan con datos reales, no antes—.
-- =====================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

ALTER TABLE public.club_beneficios
  ADD COLUMN IF NOT EXISTS antiguedad_minima_meses integer,
  ADD COLUMN IF NOT EXISTS aporte_minimo_acumulado numeric(12,2),
  ADD COLUMN IF NOT EXISTS ahorro_maximo           numeric(12,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'club_beneficios_requisitos_chk') THEN
    ALTER TABLE public.club_beneficios ADD CONSTRAINT club_beneficios_requisitos_chk CHECK (
      (antiguedad_minima_meses IS NULL OR antiguedad_minima_meses >= 0)
      AND (aporte_minimo_acumulado IS NULL OR aporte_minimo_acumulado >= 0)
      AND (ahorro_maximo IS NULL OR ahorro_maximo > 0)
    );
  END IF;
END $$;

COMMENT ON COLUMN public.club_beneficios.antiguedad_minima_meses IS
  'Meses APORTADOS (acumulados, no racha) que hacen falta. Se usa meses_aportados y NO racha_meses a propósito: la racha castigaría un cobro fallido por tarjeta vencida, que es justo lo que §10.4.3 dice evitar. NULL = sin requisito.';

COMMENT ON COLUMN public.club_beneficios.aporte_minimo_acumulado IS
  'Camino alternativo a la antigüedad, para quien aporta de una sola vez en lugar de mes a mes. Se cumple con CUALQUIERA de los dos (OR, no AND): pedir los dos dejaría afuera al donante grande, que es el que más aporta.';

COMMENT ON COLUMN public.club_beneficios.ahorro_maximo IS
  'Tope en pesos del ahorro por canje. "30% OFF hasta $30.000". Acota la exposición del comercio, que es lo que hace que un tercero acepte entrar. NULL = sin tope. ⚠️ Alimenta el `ahorro` de club_canjes, que es la métrica de nivel de §12.6: poner topes cambia esos números.';

-- ---------------------------------------------------------------------
-- Los HECHOS de la persona, para que el club no tenga que saber por qué.
--
-- §12.7 regla 1: "el club NUNCA sabe POR QUÉ alguien es elegible: pregunta y
-- punto". Se respeta: esta función devuelve tres NÚMEROS y no una decisión. Si
-- cumple o no lo decide `cumpleRequisitos()` en `club-reglas.ts`, que es puro y
-- se puede testear sin desplegar — lo único testeable según §12.10.12.
--
-- En otro proyecto sin capa de aportes, esto es `select true, 999, 999999`.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.elegibilidad_club(uuid);
CREATE FUNCTION public.elegibilidad_club(p_user_id uuid)
RETURNS TABLE (tiene_acceso boolean, meses_aportados integer, aporte_acumulado numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.tiene_acceso(p_user_id),
    COALESCE((SELECT a.meses_aportados FROM public.antiguedad_socio(p_user_id) a), 0),
    COALESCE((SELECT sum(ap.monto) FROM public.aportes ap WHERE ap.user_id = p_user_id), 0);
$$;

-- Con parámetro: solo `service_role`, igual que `tiene_acceso(uuid)`. Sin esto,
-- cualquier usuario logueado podría averiguar cuánto aportó otra persona.
REVOKE ALL ON FUNCTION public.elegibilidad_club(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elegibilidad_club(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.elegibilidad_club(uuid) TO service_role;

-- Sin parámetro: la que puede llamar el browser. Solo por sí misma.
DROP FUNCTION IF EXISTS public.mi_elegibilidad_club();
CREATE FUNCTION public.mi_elegibilidad_club()
RETURNS TABLE (tiene_acceso boolean, meses_aportados integer, aporte_acumulado numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.elegibilidad_club(auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.mi_elegibilidad_club() TO authenticated;
