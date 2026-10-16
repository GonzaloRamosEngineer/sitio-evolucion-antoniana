-- =====================================================================
-- RECLASIFICACIÓN HISTÓRICA DE `aportes` — SOLO LA DEFINICIÓN
--
-- Esta migración NO toca datos. Define la función que lleva las filas
-- existentes a la regla de 20261016120000, y la deja lista para dos usos:
--
--   reclasificar_aportes_v2(false) -> SIMULA: devuelve qué cambiaría.
--   reclasificar_aportes_v2(true)  -> APLICA y deja cada fila ANTES/DESPUÉS
--                                     en `aportes_correcciones`.
--
-- POR QUÉ NO SE EJECUTA ACÁ. Correr esto sobre producción tiene que ir
-- precedido de un pre chequeo que compare la base con los IDs, estados e
-- importes verificados en la auditoría, y fallar si aparece algo nuevo. Esos
-- IDs son de UNA entidad: no pueden vivir en una migración que también corre
-- en una base vacía o en la de otra entidad. El pre chequeo, la aplicación y
-- la reversión están en `supabase/data/*reclasificacion_aportes_2026_10.sql`.
--
-- LA REGLA, fila por fila (solo origen donacion/membresia):
--   * cuota (donation_type de suscripción, u origen membresia) -> cuota_mensual,
--     1 cuota si llega al piso y el destino habilita el club, si no 0.
--   * el resto -> donacion_extraordinaria, 0 cuotas, sin período.
--   * cobro que ya no está aprobado en `donations` -> anulado (la fila queda).
--   * períodos: por persona, en orden de fecha, encadenados SOLO entre cuotas
--     (el fin de la anterior se lleva en una variable: la tabla todavía tiene
--     los valores viejos y leerla daría el mismo encadenamiento roto).
--
-- Los aportes `manual` quedan SIN CLASIFICAR (concepto NULL) y sin efecto de
-- cuota: lo decidió la Fundación hasta revisarlos uno por uno. Si alguno
-- tuviera período o cuotas, se le quitan (en producción, verificado: ninguno).
--
-- IDEMPOTENTE: solo propone cambios donde el valor actual difiere del
-- deseado. Correrla dos veces no hace nada la segunda vez.
-- =====================================================================

SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION public.reclasificar_aportes_v2(
  p_aplicar boolean DEFAULT false,
  p_lote    text    DEFAULT '2026-10-cuotas-v2')
RETURNS TABLE (aporte_id uuid, user_id uuid, accion text, antes jsonb, despues jsonb)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r          record;
  v_user     uuid := NULL;
  v_previo   date;
  v_concepto text;
  v_cuotas   smallint;
  v_desde    date;
  v_hasta    date;
  v_anulado  timestamptz;
  v_motivo   text;
  v_nuevo    public.aportes;
BEGIN
  FOR r IN
    SELECT a.*, d.status AS d_status, d.donation_type AS d_tipo
      FROM public.aportes a
      LEFT JOIN public.donations d ON d.id = a.donation_id
     -- Sin FOR UPDATE: la simulación tiene que poder correr en una transacción
     -- READ ONLY. El script que aplica bloquea `aportes` y `donations` antes.
     ORDER BY a.user_id NULLS LAST, a.fecha, a.created_at, a.id
  LOOP
    IF r.user_id IS DISTINCT FROM v_user THEN
      v_user := r.user_id;
      v_previo := NULL;
    END IF;

    -- ---- deseado ----
    v_anulado := r.anulado_en;
    v_motivo  := r.anulado_motivo;
    v_desde   := NULL;
    v_hasta   := NULL;

    IF r.origen = 'manual' THEN
      v_concepto := NULL;
      v_cuotas   := 0;
    ELSE
      IF r.origen = 'membresia'
         OR lower(COALESCE(r.d_tipo, '')) IN ('suscripción', 'suscripcion') THEN
        v_concepto := 'cuota_mensual';
        v_cuotas   := CASE WHEN public.cuota_cuenta(r.monto, r.destino_id) THEN 1 ELSE 0 END;
      ELSE
        v_concepto := 'donacion_extraordinaria';
        v_cuotas   := 0;
      END IF;

      IF r.donation_id IS NOT NULL AND COALESCE(r.d_status, '') <> 'approved'
         AND r.anulado_en IS NULL THEN
        v_anulado := now();
        v_motivo  := format('Reclasificación %s: el cobro figura %s en donations', p_lote,
                            COALESCE(r.d_status, 'sin estado'));
      END IF;

      IF v_cuotas > 0 AND r.user_id IS NOT NULL AND v_anulado IS NULL THEN
        SELECT p.desde, p.hasta INTO v_desde, v_hasta
          FROM public.periodo_desde_previo(v_previo, public.fecha_local(r.fecha), v_cuotas) p;
        v_previo := v_hasta;
      END IF;
    END IF;

    -- ---- ¿difiere? ----
    IF r.concepto        IS NOT DISTINCT FROM v_concepto
       AND r.cuotas_cubiertas = v_cuotas
       AND r.acceso_desde IS NOT DISTINCT FROM v_desde
       AND r.acceso_hasta IS NOT DISTINCT FROM v_hasta
       AND r.anulado_en   IS NOT DISTINCT FROM v_anulado THEN
      CONTINUE;
    END IF;

    SELECT a.* INTO v_nuevo FROM public.aportes a WHERE a.id = r.id;
    v_nuevo.concepto         := v_concepto;
    v_nuevo.cuotas_cubiertas := v_cuotas;
    v_nuevo.acceso_desde     := v_desde;
    v_nuevo.acceso_hasta     := v_hasta;
    v_nuevo.anulado_en       := v_anulado;
    v_nuevo.anulado_motivo   := v_motivo;

    aporte_id := r.id;
    user_id   := r.user_id;
    accion    := 'reclasificacion';
    SELECT public.aporte_foto(a) INTO antes FROM public.aportes a WHERE a.id = r.id;
    despues   := public.aporte_foto(v_nuevo);

    IF p_aplicar THEN
      INSERT INTO public.aportes_correcciones (aporte_id, lote, accion, antes, despues, motivo)
      VALUES (r.id, p_lote, 'reclasificacion', antes, despues,
              'Regla 2026-10: una cuota cubre un mes; una donación suma pero no da cuotas ni acceso.');

      UPDATE public.aportes a
         SET concepto = v_concepto, cuotas_cubiertas = v_cuotas,
             acceso_desde = v_desde, acceso_hasta = v_hasta,
             anulado_en = v_anulado, anulado_motivo = v_motivo
       WHERE a.id = r.id;
    END IF;

    RETURN NEXT;
  END LOOP;
END $$;

-- Revierte un lote: cada fila vuelve EXACTAMENTE a su `antes`. No borra nada:
-- la corrección queda marcada `revertido_en` y se agrega un renglón
-- 'reversion' con el estado previo a revertir.
CREATE OR REPLACE FUNCTION public.revertir_reclasificacion_aportes(p_lote text)
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c   record;
  v_n integer := 0;
BEGIN
  -- Las filas viejas violan la regla "solo una cuota tiene período", y un
  -- CHECK NOT VALID igual rige para las filas que se ACTUALIZAN. Se suelta
  -- mientras se restaura y se repone NOT VALID al final (no revisa lo viejo).
  ALTER TABLE public.aportes DROP CONSTRAINT IF EXISTS aportes_acceso_solo_cuotas_chk;

  FOR c IN
    SELECT * FROM public.aportes_correcciones
     WHERE lote = p_lote AND accion = 'reclasificacion' AND revertido_en IS NULL
     ORDER BY created_at DESC
     FOR UPDATE
  LOOP
    INSERT INTO public.aportes_correcciones (aporte_id, lote, accion, antes, despues, motivo)
    SELECT a.id, p_lote, 'reversion', public.aporte_foto(a), c.antes,
           'Reversión del lote ' || p_lote
      FROM public.aportes a WHERE a.id = c.aporte_id;

    UPDATE public.aportes a
       SET concepto         = c.antes->>'concepto',
           cuotas_cubiertas = (c.antes->>'cuotas_cubiertas')::smallint,
           acceso_desde     = (c.antes->>'acceso_desde')::date,
           acceso_hasta     = (c.antes->>'acceso_hasta')::date,
           anulado_en       = (c.antes->>'anulado_en')::timestamptz,
           anulado_motivo   = c.antes->>'anulado_motivo'
     WHERE a.id = c.aporte_id;

    UPDATE public.aportes_correcciones SET revertido_en = now() WHERE id = c.id;
    v_n := v_n + 1;
  END LOOP;

  ALTER TABLE public.aportes ADD CONSTRAINT aportes_acceso_solo_cuotas_chk
    CHECK (cuotas_cubiertas > 0 OR acceso_desde IS NULL) NOT VALID;
  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION public.reclasificar_aportes_v2(boolean, text)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revertir_reclasificacion_aportes(text)   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclasificar_aportes_v2(boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revertir_reclasificacion_aportes(text) TO service_role;
