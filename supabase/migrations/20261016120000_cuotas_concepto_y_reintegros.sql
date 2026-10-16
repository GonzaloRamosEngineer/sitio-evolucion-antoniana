-- =====================================================================
-- UNA CUOTA CUBRE UN MES; UNA DONACIÓN SUMA, PERO NO COMPRA MESES
--
-- Auditoría del 2026-10-15 (cuenta real, tres cobros acreditados):
--
--   2/9  cuota      $ 5.000  -> 2/9  al 2/10        (bien)
--   2/10 donación   $20.000  -> 3/10 al 3/2/2027    (4 meses "comprados")
--   2/10 cuota      $ 5.000  -> 4/2  al 4/2/2027    (UN DÍA)
--
-- Tres defectos encadenados, todos en la base:
--
--   1. `meses_por_donacion()` convertía una donación en meses de acceso, y
--      `proximo_acceso_desde()` los encadenaba DETRÁS del último acceso: la
--      donación empujaba las cuotas siguientes al futuro.
--   2. La reclasificación de la cuota calculaba `acceso_hasta` con
--      `next_charge_date`, que el webhook no actualiza al cobrar: con la fecha
--      vieja, `GREATEST(2/10, 4/2)` da un período de un día.
--   3. `antiguedad_socio()` medía "meses aportados" y "racha" en días / 30 de
--      la UNIÓN de períodos, incluida la parte futura. Una donación grande se
--      veía como cinco meses de racha.
--
-- LA REGLA NUEVA (decisión de la Fundación, 2026-10-15):
--   * `cuota_mensual` cubre UN mes, aunque el monto elegido sea mayor.
--   * `donacion_extraordinaria` suma al total aportado y registra a la persona
--     como donante, pero NO da acceso, cuotas ni racha.
--   * `adelanto_cuotas` es una operación explícita y distinta (N meses). El
--     modelo la admite; ninguna pantalla la ofrece todavía.
--   * Beneficios: acceso vigente + (N cuotas efectivas O $X acumulados).
--
-- `origen` NO cambia: sigue siendo el CANAL técnico (donacion | membresia |
-- manual). El significado de negocio va en la columna nueva `concepto`. Antes
-- una sola columna contaba las dos historias y por eso hubo que relajar su CHECK.
--
-- ADEMÁS, TRES COSAS QUE ESTA MIGRACIÓN CIERRA:
--   * Reintegros y contracargos: hasta hoy un `approved -> refunded` dejaba el
--     aporte, el acceso y el acumulado intactos. Ahora anula (sin borrar),
--     descuenta los parciales y reactiva si Mercado Pago vuelve a aprobar.
--   * Idempotencia: UNIQUE en `donations.payment_id` y `memberships.preapproval_id`,
--     y una guarda que impide que un estado viejo de MP pise uno más nuevo.
--   * ⚠️ AGUJERO DE SEGURIDAD: la policy "Insert donations: if own or
--     anonymous" dejaba a CUALQUIER sesión insertar su propia donación
--     `approved`, y el trigger la convertía en acceso y monto acumulado. Lo
--     mismo con `memberships`. Ninguna pantalla escribe esas tablas (lo hace el
--     webhook con service_role), así que se cierran.
--
-- ⚠️ ORDEN DE APLICACIÓN: esta migración y la siguiente (20261016120100) solo
-- definen. Los datos existentes se reclasifican con los scripts de
-- `supabase/data/*reclasificacion_aportes_2026_10.sql`, que traen pre chequeo y
-- reversión. Entre esta migración y ese script, las filas viejas tienen
-- `cuotas_cubiertas = 0` y NO otorgan acceso: correrlos en la misma sesión.
--
-- Idempotente y convergente, como el resto de las migraciones del repo.
-- =====================================================================

SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) aportes: concepto, cuotas, reintegro y anulación
-- ---------------------------------------------------------------------
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS concepto          text;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS cuotas_cubiertas  smallint NOT NULL DEFAULT 0;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS monto_reintegrado numeric  NOT NULL DEFAULT 0;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS anulado_en        timestamptz;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS anulado_motivo    text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_concepto_chk'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE public.aportes ADD CONSTRAINT aportes_concepto_chk CHECK (
      concepto IS NULL
      OR concepto IN ('cuota_mensual','donacion_extraordinaria','adelanto_cuotas'));
  END IF;

  -- `cuotas_cubiertas` es cuántas cuotas CUENTAN, no cuántas se pagaron: una
  -- cuota por debajo del piso, o a un destino que no habilita el club, entra
  -- al libro con 0. Una donación y un aporte sin clasificar, siempre 0.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_cuotas_chk'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE public.aportes ADD CONSTRAINT aportes_cuotas_chk CHECK (
      (concepto = 'cuota_mensual'   AND cuotas_cubiertas IN (0, 1))
      OR (concepto = 'adelanto_cuotas' AND cuotas_cubiertas >= 0)
      OR ((concepto IS NULL OR concepto = 'donacion_extraordinaria') AND cuotas_cubiertas = 0));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_reintegro_chk'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE public.aportes ADD CONSTRAINT aportes_reintegro_chk CHECK (
      monto_reintegrado >= 0 AND monto_reintegrado <= monto);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_anulado_chk'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE public.aportes ADD CONSTRAINT aportes_anulado_chk CHECK (
      (anulado_en IS NULL) = (anulado_motivo IS NULL));
  END IF;

  -- Solo una cuota tiene período. NOT VALID a propósito: las filas de antes de
  -- esta migración (la donación que "compró" 4 meses) lo violan hasta que corra
  -- la reclasificación, y ese script lo VALIDA al terminar. Mientras tanto ya
  -- rige para toda fila nueva o modificada.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_acceso_solo_cuotas_chk'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE public.aportes ADD CONSTRAINT aportes_acceso_solo_cuotas_chk CHECK (
      cuotas_cubiertas > 0 OR acceso_desde IS NULL) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.aportes.concepto IS
  'Significado de negocio: cuota_mensual | donacion_extraordinaria | adelanto_cuotas. NULL = sin clasificar (los manuales importados): no da cuotas ni acceso. `origen` es el canal técnico, otra pregunta.';
COMMENT ON COLUMN public.aportes.cuotas_cubiertas IS
  'Cuántas cuotas CUENTAN para acceso, racha y beneficios. 1 por cuota mensual (0 si está bajo el piso o el destino no habilita el club), N por adelanto, 0 en donaciones.';
COMMENT ON COLUMN public.aportes.monto_reintegrado IS
  'Lo que Mercado Pago devolvió de este cobro (reintegro parcial). Se descuenta del total aportado; la cuota sigue contando mientras el pago siga aprobado.';
COMMENT ON COLUMN public.aportes.anulado_en IS
  'Reintegro total, contracargo o cobro caído. La fila NO se borra: deja de contar. Si Mercado Pago vuelve a aprobar, se reactiva sola (ver aportes_correcciones).';
COMMENT ON COLUMN public.aportes.equivale_a IS
  'OBSOLETA desde 20261016120000: reemplazada por `concepto`. Se conserva por los datos; un INSERT manual que solo la traiga se traduce a concepto.';

CREATE INDEX IF NOT EXISTS idx_aportes_user_cuotas
  ON public.aportes (user_id, acceso_hasta DESC) WHERE cuotas_cubiertas > 0 AND anulado_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_aportes_donation ON public.aportes (donation_id);

-- ---------------------------------------------------------------------
-- 2) aportes_correcciones: el rastro de todo lo que se toca después
--
-- La reclasificación histórica, las anulaciones por reintegro y las
-- reactivaciones dejan acá la fila ANTES y DESPUÉS. Revertir es aplicar
-- `antes`; nada se borra.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aportes_correcciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aporte_id    uuid NOT NULL REFERENCES public.aportes(id) ON DELETE RESTRICT,
  lote         text NOT NULL,
  accion       text NOT NULL CHECK (accion IN (
                 'reclasificacion','anulacion','reactivacion','reintegro_parcial','reversion')),
  antes        jsonb,
  despues      jsonb,
  motivo       text,
  revertido_en timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid DEFAULT auth.uid()
);

-- Una reclasificación por aporte y por lote, mientras no se haya revertido:
-- es lo que hace idempotente al script histórico.
CREATE UNIQUE INDEX IF NOT EXISTS uq_correccion_reclasificacion_viva
  ON public.aportes_correcciones (aporte_id, lote)
  WHERE accion = 'reclasificacion' AND revertido_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_correcciones_aporte ON public.aportes_correcciones (aporte_id, created_at);

ALTER TABLE public.aportes_correcciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aportes_correcciones FROM anon, authenticated;
GRANT SELECT ON public.aportes_correcciones TO authenticated;
GRANT ALL ON public.aportes_correcciones TO service_role;
DROP POLICY IF EXISTS correcciones_select_board ON public.aportes_correcciones;
CREATE POLICY correcciones_select_board ON public.aportes_correcciones
  FOR SELECT TO authenticated USING (public.is_board_member());

-- Instantánea de las columnas que esta capa toca. Una sola definición para
-- que `antes` y `despues` siempre sean comparables.
CREATE OR REPLACE FUNCTION public.aporte_foto(a public.aportes)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object(
    'origen', a.origen, 'concepto', a.concepto, 'cuotas_cubiertas', a.cuotas_cubiertas,
    'acceso_desde', a.acceso_desde, 'acceso_hasta', a.acceso_hasta,
    'monto_reintegrado', a.monto_reintegrado,
    'anulado_en', a.anulado_en, 'anulado_motivo', a.anulado_motivo,
    'user_id', a.user_id, 'membership_id', a.membership_id, 'donation_id', a.donation_id);
$$;

-- ---------------------------------------------------------------------
-- 3) donations / memberships: estado crudo, idempotencia y la guarda
-- ---------------------------------------------------------------------
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS mp_status         text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS mp_status_detail  text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS monto_reintegrado numeric NOT NULL DEFAULT 0;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS mp_actualizado_en timestamptz;

COMMENT ON COLUMN public.donations.mp_status IS
  'Estado CRUDO de Mercado Pago (refunded, charged_back, in_mediation...). `status` es el normalizado; este no se pierde.';
COMMENT ON COLUMN public.donations.monto_reintegrado IS
  'payment.transaction_amount_refunded. En un reintegro parcial el pago sigue approved.';
COMMENT ON COLUMN public.donations.mp_actualizado_en IS
  'payment.date_last_updated. Un UPDATE con un valor MÁS VIEJO que el guardado se descarta: dos avisos procesados fuera de orden no pueden devolver un reintegro a "aprobado".';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_monto_reintegrado_chk'
                   AND conrelid = 'public.donations'::regclass) THEN
    ALTER TABLE public.donations ADD CONSTRAINT donations_monto_reintegrado_chk
      CHECK (monto_reintegrado >= 0);
  END IF;
  -- UNIQUE completo (no parcial) para que el webhook pueda hacer
  -- `upsert(..., { onConflict: 'payment_id' })`. Varios NULL siguen permitidos.
  -- Si hubiera duplicados, esto falla RUIDOSO, que es lo que corresponde.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_payment_id_key'
                   AND conrelid = 'public.donations'::regclass) THEN
    ALTER TABLE public.donations ADD CONSTRAINT donations_payment_id_key UNIQUE (payment_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_preapproval_id_key'
                   AND conrelid = 'public.memberships'::regclass) THEN
    ALTER TABLE public.memberships ADD CONSTRAINT memberships_preapproval_id_key UNIQUE (preapproval_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.donations_no_retroceder()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.mp_actualizado_en IS NOT NULL AND NEW.mp_actualizado_en IS NOT NULL
     AND NEW.mp_actualizado_en < OLD.mp_actualizado_en THEN
    RAISE WARNING 'donations: se descarta un estado de MP más viejo para el pago % (% < %)',
      NEW.payment_id, NEW.mp_actualizado_en, OLD.mp_actualizado_en;
    RETURN NULL;   -- el UPDATE no ocurre, y los triggers AFTER tampoco
  END IF;

  -- Una donación ya vinculada a una persona (por el pago con sesión, o porque
  -- la reclamó desde /carnet) NO se desvincula con un aviso de MP: la
  -- referencia de una donación anónima viene sin titular, y el upsert del
  -- webhook la volvía a dejar anónima. El webhook ya no manda `user_id` vacío;
  -- esto es la misma guarda del lado de la base, para cualquier versión.
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := OLD.user_id;
    NEW.reclamado_en := OLD.reclamado_en;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_donations_no_retroceder ON public.donations;
CREATE TRIGGER trg_donations_no_retroceder
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.donations_no_retroceder();

-- ⚠️ El agujero. Nada del sitio inserta en estas tablas (verificado: el único
-- `insert` sobre `memberships` está en `useMembership.jsx`, sin consumidores).
-- Las escribe solo el webhook con service_role, que no pasa por RLS.
DROP POLICY IF EXISTS "Insert donations: if own or anonymous" ON public.donations;
DROP POLICY IF EXISTS "Insert memberships: only own"          ON public.memberships;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.donations   FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.memberships FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) La regla del período, en un solo lugar
-- ---------------------------------------------------------------------

-- La Fundación está en Argentina: un pago de las 22 h no es "del día siguiente".
CREATE OR REPLACE FUNCTION public.fecha_local(p_ts timestamptz)
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (p_ts AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
$$;

CREATE OR REPLACE FUNCTION public.hoy_local()
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT public.fecha_local(now());
$$;

-- ¿Esta cuota CUENTA? Llega al piso (la cuota de referencia) y el destino
-- habilita el club. Hereda el piso de `meses_por_donacion` en vez de copiarlo.
CREATE OR REPLACE FUNCTION public.cuota_cuenta(p_monto numeric, p_destino uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT public.destino_otorga_acceso(p_destino)
     AND COALESCE(public.meses_por_donacion(p_monto), 0) > 0;
$$;

-- El período de N cuotas, dado el fin de la cuota anterior. PURA a propósito:
-- la usan el trigger (con el anterior leído de la tabla) y la reclasificación
-- histórica (con el anterior llevado en una variable, porque las filas de la
-- tabla todavía tienen los valores viejos).
--
-- [desde, hasta] inclusivo, un mes MENOS UN DÍA: 2/9 -> 1/10, 2/10 -> 1/11. La
-- versión anterior hacía `desde + 1 mes` y corría un día por mes.
CREATE OR REPLACE FUNCTION public.periodo_desde_previo(p_previo date, p_fecha date, p_n integer)
RETURNS TABLE (desde date, hasta date) LANGUAGE sql IMMUTABLE AS $$
  SELECT d, (d + make_interval(months => GREATEST(p_n, 1)) - interval '1 day')::date
    FROM (SELECT GREATEST(p_fecha, COALESCE(p_previo + 1, p_fecha)) AS d) x;
$$;

-- Encadena SOLO contra cuotas vigentes (no anuladas). Una donación ya no
-- empuja nada. NO usa `next_charge_date`: el webhook no la actualiza al cobrar
-- y era la causa del período de un día.
CREATE OR REPLACE FUNCTION public.periodo_cuota(p_user_id uuid, p_fecha date, p_n integer,
                                                p_excluir uuid DEFAULT NULL)
RETURNS TABLE (desde date, hasta date) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT p.desde, p.hasta
    FROM public.periodo_desde_previo(
           (SELECT max(a.acceso_hasta) FROM public.aportes a
             WHERE a.user_id = p_user_id AND a.cuotas_cubiertas > 0
               AND a.anulado_en IS NULL AND a.acceso_hasta IS NOT NULL
               AND a.id IS DISTINCT FROM p_excluir),
           p_fecha, p_n) p;
$$;

-- ---------------------------------------------------------------------
-- 5) Reintegro, contracargo, anulación y reactivación
--
-- La llama el trigger de `donations` en cada cambio. Recibe el estado ya
-- normalizado por el webhook. Cada cambio deja su renglón en correcciones.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_estado_cobro(p_ref text, p_status text,
                                                       p_reintegrado numeric, p_detalle text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a       public.aportes;
  v_antes jsonb;
  v_reint numeric;
BEGIN
  SELECT * INTO a FROM public.aportes WHERE referencia_externa = p_ref FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  v_antes := public.aporte_foto(a);

  IF p_status IN ('refunded','charged_back','cancelled','rejected') THEN
    IF a.anulado_en IS NULL THEN
      UPDATE public.aportes
         SET anulado_en = now(),
             anulado_motivo = format('Mercado Pago: %s%s', p_status,
                                     CASE WHEN p_detalle IS NOT NULL THEN ' (' || p_detalle || ')' ELSE '' END),
             monto_reintegrado = CASE WHEN p_status = 'refunded'
                                      THEN LEAST(GREATEST(COALESCE(NULLIF(p_reintegrado, 0), a.monto), 0), a.monto)
                                      ELSE a.monto_reintegrado END
       WHERE id = a.id RETURNING * INTO a;
      INSERT INTO public.aportes_correcciones (aporte_id, lote, accion, antes, despues, motivo)
      VALUES (a.id, 'mp:' || p_ref, 'anulacion', v_antes, public.aporte_foto(a), a.anulado_motivo);
    END IF;

  ELSIF p_status = 'approved' THEN
    -- Reactivación: SOLO lo que anuló Mercado Pago. Una anulación de la
    -- comisión es una decisión humana y un aviso del proveedor no la deshace.
    IF a.anulado_en IS NOT NULL AND a.anulado_motivo LIKE 'Mercado Pago:%' THEN
      UPDATE public.aportes SET anulado_en = NULL, anulado_motivo = NULL
       WHERE id = a.id RETURNING * INTO a;
      INSERT INTO public.aportes_correcciones (aporte_id, lote, accion, antes, despues, motivo)
      VALUES (a.id, 'mp:' || p_ref, 'reactivacion', v_antes, public.aporte_foto(a),
              'Mercado Pago informó el pago aprobado en un aviso más reciente.');
      v_antes := public.aporte_foto(a);
    END IF;

    -- Reintegro parcial: el pago sigue aprobado, la cuota sigue contando, y
    -- solo se descuenta lo devuelto.
    v_reint := LEAST(GREATEST(COALESCE(p_reintegrado, 0), 0), a.monto);
    IF v_reint IS DISTINCT FROM a.monto_reintegrado THEN
      UPDATE public.aportes SET monto_reintegrado = v_reint WHERE id = a.id RETURNING * INTO a;
      INSERT INTO public.aportes_correcciones (aporte_id, lote, accion, antes, despues, motivo)
      VALUES (a.id, 'mp:' || p_ref, 'reintegro_parcial', v_antes, public.aporte_foto(a),
              format('Reintegro parcial de %s informado por Mercado Pago.', v_reint));
    END IF;
  END IF;
  -- pending / in_process / in_mediation: no se toca nada hasta que se resuelva.
END $$;

REVOKE ALL ON FUNCTION public.aplicar_estado_cobro(text, text, numeric, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6) Trigger de donaciones
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aporte_desde_donacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_destino  uuid;
  v_ref      text;
  v_es_cuota boolean;
  v_cuotas   smallint := 0;
  v_desde    date;
  v_hasta    date;
BEGIN
  v_ref := COALESCE(NULLIF(NEW.payment_id, ''), 'donacion:' || NEW.id::text);

  -- REGLA DE ORO, intacta: nada de esto puede hacer fallar el registro del
  -- cobro. Se pierde, a lo sumo, un renglón del libro (queda el WARNING).
  BEGIN
    -- (a) Un cobro que ya está en el libro cambió de estado o de reintegro.
    IF TG_OP = 'UPDATE' THEN
      PERFORM public.aplicar_estado_cobro(v_ref, NEW.status, NEW.monto_reintegrado, NEW.mp_status_detail);
    END IF;

    -- (b) Alta en el libro: solo dinero que efectivamente entró.
    IF COALESCE(NEW.status, '') <> 'approved' THEN
      RETURN NULL;
    END IF;
    IF COALESCE(NEW.amount, 0) <= 0 THEN
      RAISE WARNING 'aporte_desde_donacion: donacion % con monto invalido (%), no entra al libro', NEW.id, NEW.amount;
      RETURN NULL;
    END IF;

    v_destino := COALESCE(NEW.destino_id, public.destino_por_defecto());
    IF v_destino IS NULL THEN
      RAISE WARNING 'aporte_desde_donacion: no hay destino institucional activo, la donacion % no entra al libro', NEW.id;
      RETURN NULL;
    END IF;

    -- `donation_type` lo escribe el webhook: 'suscripción' en el cobro de una
    -- cuota, 'única' en una donación. Texto libre: se aceptan las dos grafías.
    v_es_cuota := lower(COALESCE(NEW.donation_type, '')) IN ('suscripción', 'suscripcion');

    IF v_es_cuota AND public.cuota_cuenta(NEW.amount, v_destino) THEN
      v_cuotas := 1;
      IF NEW.user_id IS NOT NULL THEN
        SELECT p.desde, p.hasta INTO v_desde, v_hasta
          FROM public.periodo_cuota(NEW.user_id, public.fecha_local(COALESCE(NEW.created_at, now())), 1) p;
      END IF;
    END IF;

    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, donation_id, referencia_externa,
      concepto, cuotas_cubiertas, acceso_desde, acceso_hasta, monto_reintegrado, notas
    ) VALUES (
      NEW.user_id, NEW.amount, COALESCE(NEW.created_at, now()), v_destino, 'donacion', NEW.id, v_ref,
      CASE WHEN v_es_cuota THEN 'cuota_mensual' ELSE 'donacion_extraordinaria' END,
      v_cuotas, v_desde, v_hasta,
      LEAST(GREATEST(COALESCE(NEW.monto_reintegrado, 0), 0), NEW.amount),
      'Alta automatica desde donations (' || COALESCE(NEW.payment_provider, 'sin proveedor') || '). '
        || CASE WHEN v_es_cuota AND v_cuotas > 0 THEN 'Cuota mensual: cubre un mes.'
                WHEN v_es_cuota THEN 'Cuota mensual que no cuenta (bajo el piso o destino sin acceso).'
                ELSE 'Donacion extraordinaria: suma al total, no da cuotas ni acceso.' END
    )
    -- El trigger crea y no modifica (una corrección humana sobrevive). La única
    -- excepción: si la fila la creó primero el trigger de la membresía (orden
    -- inverso), se le completa el vínculo a esta donación.
    ON CONFLICT (referencia_externa) DO UPDATE
       SET donation_id = EXCLUDED.donation_id
     WHERE aportes.donation_id IS NULL AND aportes.origen = 'membresia';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'aporte_desde_donacion: no se pudo registrar el aporte de la donacion %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $function$;

DROP TRIGGER IF EXISTS trg_aporte_desde_donacion ON public.donations;
CREATE TRIGGER trg_aporte_desde_donacion
  AFTER INSERT OR UPDATE OF status, amount, destino_id, monto_reintegrado, mp_status, mp_actualizado_en
  ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.aporte_desde_donacion();

-- ---------------------------------------------------------------------
-- 7) Trigger de membresías: vincula, ya no calcula el período
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aporte_desde_membresia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_destino uuid;
  v_ref     text;
  v_cuotas  smallint := 0;
  v_desde   date;
  v_hasta   date;
BEGIN
  IF COALESCE(NEW.status, '') <> 'active' OR NEW.last_payment_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF COALESCE(NEW.last_payment_status, 'approved') NOT IN ('approved', 'accredited', 'authorized') THEN
    RETURN NULL;
  END IF;
  -- En UPDATE, solo si el pago es NUEVO: una pausa o un cambio de mail no es un cobro.
  IF TG_OP = 'UPDATE' AND NEW.last_payment_id IS NOT DISTINCT FROM OLD.last_payment_id THEN
    RETURN NULL;
  END IF;
  IF COALESCE(NEW.amount, 0) <= 0 THEN
    RAISE WARNING 'aporte_desde_membresia: membresia % con monto invalido (%), no entra al libro', NEW.id, NEW.amount;
    RETURN NULL;
  END IF;

  v_destino := COALESCE(NEW.destino_id, public.destino_por_defecto());
  IF v_destino IS NULL THEN
    RAISE WARNING 'aporte_desde_membresia: no hay destino institucional activo, la membresia % no entra al libro', NEW.id;
    RETURN NULL;
  END IF;

  v_ref := COALESCE(NULLIF(NEW.last_payment_id, ''),
                    'membresia:' || NEW.id::text || ':' || COALESCE(NEW.next_charge_date::text, 'sin-fecha'));

  -- Solo se usa si la fila NO existe (el webhook escribió la membresía antes
  -- que la donación). El período sale de la fecha de hoy, nunca de
  -- `next_charge_date`.
  IF public.cuota_cuenta(NEW.amount, v_destino) THEN
    v_cuotas := 1;
    IF NEW.user_id IS NOT NULL THEN
      SELECT p.desde, p.hasta INTO v_desde, v_hasta
        FROM public.periodo_cuota(NEW.user_id, public.hoy_local(), 1) p;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, membership_id, referencia_externa,
      concepto, cuotas_cubiertas, acceso_desde, acceso_hasta, email_aportante, notas
    ) VALUES (
      NEW.user_id, NEW.amount, now(), v_destino, 'membresia', NEW.id, v_ref,
      'cuota_mensual', v_cuotas, v_desde, v_hasta, NEW.payer_email,
      'Alta automatica por cobro de cuota (' || COALESCE(NEW.payment_method, 'sin metodo') || ').'
    )
    -- El caso NORMAL: la donación llegó primero y la fila ya existe, con su
    -- concepto y su período bien calculados. Acá solo se VINCULA a la
    -- membresía: el período NO se toca (antes se recalculaba con
    -- `next_charge_date` y eso daba el período de un día).
    ON CONFLICT (referencia_externa) DO UPDATE
      SET origen          = 'membresia',
          membership_id   = NEW.id,
          email_aportante = COALESCE(aportes.email_aportante, NEW.payer_email),
          notas           = COALESCE(aportes.notas, '')
                            || ' Vinculado a la membresia ' || NEW.id::text || '.'
      WHERE aportes.origen = 'donacion' AND aportes.membership_id IS NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'aporte_desde_membresia: no se pudo registrar el aporte de la membresia %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $function$;

-- ---------------------------------------------------------------------
-- 8) Aportes manuales y protección de las columnas que dan privilegios
--
-- Un aporte manual (efectivo, transferencia) lo carga la comisión. Su período
-- ya NO se escribe a mano: sale del concepto y de la fecha, con la misma regla
-- que los automáticos. Y nadie desde el navegador puede tocar el período, las
-- cuotas o la anulación de un aporte automático.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aportes_normalizar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_n integer;
BEGIN
  -- Lo que llega desde una sesión del sitio (`authenticated`). Los triggers y
  -- funciones SECURITY DEFINER corren como su dueño y no entran acá.
  IF current_user = 'authenticated' AND TG_OP = 'UPDATE' AND OLD.origen <> 'manual'
     AND (NEW.acceso_desde      IS DISTINCT FROM OLD.acceso_desde
       OR NEW.acceso_hasta      IS DISTINCT FROM OLD.acceso_hasta
       OR NEW.cuotas_cubiertas  IS DISTINCT FROM OLD.cuotas_cubiertas
       OR NEW.concepto          IS DISTINCT FROM OLD.concepto
       OR NEW.monto_reintegrado IS DISTINCT FROM OLD.monto_reintegrado
       OR NEW.anulado_en        IS DISTINCT FROM OLD.anulado_en
       OR NEW.user_id           IS DISTINCT FROM OLD.user_id
       OR NEW.monto             IS DISTINCT FROM OLD.monto) THEN
    RAISE EXCEPTION 'Un aporte automático solo cambia por Mercado Pago o por la reclasificación auditada; se puede reimputar el destino o adjuntar comprobante.'
      USING ERRCODE = '42501';
  END IF;

  -- Los automáticos no se normalizan acá. Tampoco un UPDATE de un manual hecho
  -- por el sistema (la reclasificación auditada, su reversión).
  IF NEW.origen <> 'manual' OR (current_user <> 'authenticated' AND TG_OP = 'UPDATE') THEN
    RETURN NEW;
  END IF;

  -- Compatibilidad: la columna vieja se traduce (solo al crear).
  IF TG_OP = 'INSERT' AND NEW.concepto IS NULL AND NEW.equivale_a IS NOT NULL THEN
    NEW.concepto := CASE NEW.equivale_a WHEN 'cuota' THEN 'cuota_mensual'
                                        ELSE 'donacion_extraordinaria' END;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.concepto  IS NOT DISTINCT FROM OLD.concepto
     AND NEW.fecha     IS NOT DISTINCT FROM OLD.fecha
     AND NEW.user_id   IS NOT DISTINCT FROM OLD.user_id
     AND NEW.monto     IS NOT DISTINCT FROM OLD.monto
     AND NEW.destino_id IS NOT DISTINCT FROM OLD.destino_id
     AND NEW.anulado_en IS NOT DISTINCT FROM OLD.anulado_en THEN
    -- Nada que cambie el período: se conserva el calculado, venga lo que venga.
    NEW.cuotas_cubiertas := OLD.cuotas_cubiertas;
    NEW.acceso_desde     := OLD.acceso_desde;
    NEW.acceso_hasta     := OLD.acceso_hasta;
    RETURN NEW;
  END IF;

  IF NEW.concepto IN ('cuota_mensual', 'adelanto_cuotas')
     AND public.cuota_cuenta(NEW.monto / GREATEST(
           CASE WHEN NEW.concepto = 'adelanto_cuotas' THEN GREATEST(NEW.cuotas_cubiertas, 1) ELSE 1 END, 1),
           NEW.destino_id) THEN
    v_n := CASE WHEN NEW.concepto = 'adelanto_cuotas' THEN GREATEST(NEW.cuotas_cubiertas, 1) ELSE 1 END;
    NEW.cuotas_cubiertas := v_n;
    IF NEW.user_id IS NOT NULL AND NEW.anulado_en IS NULL THEN
      SELECT p.desde, p.hasta INTO NEW.acceso_desde, NEW.acceso_hasta
        FROM public.periodo_cuota(NEW.user_id, public.fecha_local(NEW.fecha), v_n,
                                  CASE WHEN TG_OP = 'UPDATE' THEN OLD.id END) p;
    ELSE
      NEW.acceso_desde := NULL;
      NEW.acceso_hasta := NULL;
    END IF;
  ELSE
    -- Sin clasificar, donación, o cuota que no cuenta: sin efecto de cuota.
    NEW.cuotas_cubiertas := 0;
    NEW.acceso_desde := NULL;
    NEW.acceso_hasta := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_aportes_normalizar ON public.aportes;
CREATE TRIGGER trg_aportes_normalizar
  BEFORE INSERT OR UPDATE ON public.aportes
  FOR EACH ROW EXECUTE FUNCTION public.aportes_normalizar();

-- ---------------------------------------------------------------------
-- 9) Consultas: acceso, antigüedad, elegibilidad, resumen
-- ---------------------------------------------------------------------

-- Ahora solo cuentan las cuotas vigentes. La gracia aplica a todas: ya no hay
-- períodos que no sean cuotas. Agrega `concepto` al final (el front deja de
-- traducir `origen`, que es el canal).
DROP FUNCTION IF EXISTS public.mi_acceso();
DROP FUNCTION IF EXISTS public.acceso_vigente(uuid);
CREATE FUNCTION public.acceso_vigente(p_user_id uuid)
RETURNS TABLE (tiene_acceso boolean, vence_el date, origen text, en_gracia boolean, concepto text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH regla AS (
    SELECT COALESCE(max(dias_gracia), 0) AS dias_gracia FROM public.reglas_acceso WHERE vigente
  ),
  bloqueo AS (
    SELECT COALESCE(
      (SELECT rm.suspension_corta_acceso FROM public.reglas_membresia rm WHERE rm.vigente LIMIT 1)
      AND EXISTS (SELECT 1 FROM public.miembros m
                   WHERE m.user_id = p_user_id AND m.estado IN ('suspendido','baja')),
      false) AS cortado
  ),
  ultimo AS (
    SELECT a.acceso_hasta, a.origen, a.concepto
      FROM public.aportes a
     WHERE a.user_id = p_user_id AND a.cuotas_cubiertas > 0
       AND a.anulado_en IS NULL AND a.acceso_hasta IS NOT NULL
     ORDER BY a.acceso_hasta DESC
     LIMIT 1
  ),
  hoy AS (SELECT public.hoy_local() AS d)
  SELECT
    NOT b.cortado AND COALESCE(u.acceso_hasta + r.dias_gracia >= h.d, false),
    u.acceso_hasta,
    u.origen,
    NOT b.cortado AND COALESCE(u.acceso_hasta < h.d AND u.acceso_hasta + r.dias_gracia >= h.d, false),
    u.concepto
  FROM regla r CROSS JOIN bloqueo b CROSS JOIN hoy h LEFT JOIN ultimo u ON true;
$$;

CREATE OR REPLACE FUNCTION public.tiene_acceso(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(p_user_id) av), false);
$$;

CREATE OR REPLACE FUNCTION public.tiene_acceso()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(auth.uid()) av), false);
$$;

CREATE FUNCTION public.mi_acceso()
RETURNS TABLE (tiene_acceso boolean, vence_el date, origen text, en_gracia boolean, concepto text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.acceso_vigente(auth.uid());
$$;

-- MISMA FIRMA que antes (la consumen `mi_membresia()` y el carnet), contenido nuevo:
--   socio_desde     — primer aporte no anulado, de cualquier concepto.
--   meses_aportados — CUOTAS EFECTIVAS: suma de `cuotas_cubiertas` no anuladas.
--                     Un número entero de cuotas, no días / 30.
--   racha_meses     — cuotas seguidas hasta la última ya empezada, tolerando
--                     huecos de hasta `dias_gracia` (un cobro que llega tarde no
--                     corta). 0 si la última venció y pasó la gracia. Un adelanto
--                     cuenta solo los meses ya transcurridos.
--   cortes          — cuántas veces se cortó la continuidad.
CREATE OR REPLACE FUNCTION public.antiguedad_socio(p_user_id uuid)
RETURNS TABLE (socio_desde date, dias_aportados integer, meses_aportados integer,
               racha_dias integer, racha_meses integer, cortes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH regla AS (
    SELECT COALESCE(max(dias_gracia), 0) AS gracia FROM public.reglas_acceso WHERE vigente
  ),
  hoy AS (SELECT public.hoy_local() AS d),
  c AS (
    SELECT a.acceso_desde AS desde, a.acceso_hasta AS hasta,
           LEAST(a.cuotas_cubiertas,
                 (extract(year  FROM age(h.d, a.acceso_desde)) * 12
                + extract(month FROM age(h.d, a.acceso_desde)))::int + 1) AS cuotas_transcurridas
      FROM public.aportes a CROSS JOIN hoy h
     WHERE a.user_id = p_user_id AND a.cuotas_cubiertas > 0 AND a.anulado_en IS NULL
       AND a.acceso_desde IS NOT NULL AND a.acceso_desde <= h.d
  ),
  marcado AS (
    SELECT c.*,
           CASE WHEN c.desde - lag(c.hasta) OVER (ORDER BY c.desde) - 1 > (SELECT gracia FROM regla)
                THEN 1 ELSE 0 END AS corte
      FROM c
  ),
  grupos AS (
    SELECT m.*, sum(m.corte) OVER (ORDER BY m.desde ROWS UNBOUNDED PRECEDING) AS g FROM marcado m
  ),
  ultimo AS (
    SELECT g, min(desde) AS desde, max(hasta) AS hasta, sum(cuotas_transcurridas)::int AS n
      FROM grupos GROUP BY g ORDER BY g DESC LIMIT 1
  ),
  viva AS (
    SELECT u.* FROM ultimo u, regla r, hoy h WHERE u.hasta + r.gracia >= h.d
  )
  SELECT
    (SELECT min(public.fecha_local(a.fecha)) FROM public.aportes a
      WHERE a.user_id = p_user_id AND a.anulado_en IS NULL),
    (SELECT COALESCE(sum(LEAST(c.hasta, h.d) - c.desde + 1), 0)::int FROM c CROSS JOIN hoy h),
    (SELECT COALESCE(sum(a.cuotas_cubiertas), 0)::int FROM public.aportes a
      WHERE a.user_id = p_user_id AND a.cuotas_cubiertas > 0 AND a.anulado_en IS NULL),
    (SELECT COALESCE((SELECT LEAST(v.hasta, h.d) - v.desde + 1 FROM viva v CROSS JOIN hoy h), 0)::int),
    (SELECT COALESCE((SELECT v.n FROM viva v), 0)),
    (SELECT COALESCE(sum(corte), 0)::int FROM marcado);
$$;

-- MISMA FIRMA (la consume la Edge Function `club-generar-canje`, que así no
-- hay que redesplegar): `meses_aportados` = cuotas efectivas; el acumulado
-- excluye lo anulado y descuenta los reintegros parciales.
CREATE OR REPLACE FUNCTION public.elegibilidad_club(p_user_id uuid)
RETURNS TABLE (tiene_acceso boolean, meses_aportados integer, aporte_acumulado numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.tiene_acceso(p_user_id),
    COALESCE((SELECT a.meses_aportados FROM public.antiguedad_socio(p_user_id) a), 0),
    COALESCE((SELECT sum(ap.monto - ap.monto_reintegrado) FROM public.aportes ap
               WHERE ap.user_id = p_user_id AND ap.anulado_en IS NULL), 0);
$$;

-- Lo que el carnet y el panel necesitan para decir "Donante" sin pedir una
-- fila en `memberships` ni en `miembros`: una persona que solo donó queda
-- registrada por sus aportes.
CREATE OR REPLACE FUNCTION public.mi_resumen_aportes()
RETURNS TABLE (total_aportado numeric, cuotas_efectivas integer, donaciones integer, es_donante boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(a.monto - a.monto_reintegrado), 0),
         COALESCE(sum(a.cuotas_cubiertas), 0)::int,
         count(*) FILTER (WHERE a.concepto = 'donacion_extraordinaria')::int,
         count(*) FILTER (WHERE a.concepto = 'donacion_extraordinaria') > 0
    FROM public.aportes a
   WHERE a.user_id = auth.uid() AND a.anulado_en IS NULL;
$$;

-- ---------------------------------------------------------------------
-- 10) Reclamo de donaciones anónimas: respeta el concepto
--
-- Antes convertía TODO con la regla proporcional (incluida una cuota
-- anónima) y fechaba el período desde hoy. Ahora una donación se vincula sin
-- período, y una cuota cubre el mes de su pago.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.donaciones_reclamables()
RETURNS TABLE (donation_id uuid, fecha timestamptz, monto numeric, meses_estimados integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.created_at, d.amount,
         COALESCE((SELECT a.cuotas_cubiertas::int FROM public.aportes a
                    WHERE a.donation_id = d.id AND a.anulado_en IS NULL LIMIT 1), 0)
    FROM public.donations d
    JOIN auth.users u
      ON u.id = auth.uid()
     AND public.email_verificado(u.id)
     AND lower(u.email) = lower(d.payer_email)
   WHERE d.user_id IS NULL
     AND d.status = 'approved'
     AND d.payer_email IS NOT NULL
   ORDER BY d.created_at;
$$;

CREATE OR REPLACE FUNCTION public.reclamar_donaciones()
RETURNS TABLE (vinculadas integer, meses_nuevos integer, vence_el date)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_don   record;
  a       public.aportes;
  v_desde date;
  v_hasta date;
  v_n     integer := 0;
  v_total integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Hay que iniciar sesión para reclamar un aporte.' USING ERRCODE = '28000';
  END IF;

  SELECT lower(u.email) INTO v_email
    FROM auth.users u WHERE u.id = v_uid AND public.email_verificado(u.id);
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Falta verificar el email de la cuenta antes de reclamar un aporte.' USING ERRCODE = '28000';
  END IF;

  FOR v_don IN
    SELECT d.id FROM public.donations d
     WHERE d.user_id IS NULL AND d.status = 'approved'
       AND d.payer_email IS NOT NULL AND lower(d.payer_email) = v_email
     ORDER BY d.created_at
     FOR UPDATE
  LOOP
    UPDATE public.donations SET user_id = v_uid, reclamado_en = now() WHERE id = v_don.id;

    SELECT * INTO a FROM public.aportes
     WHERE donation_id = v_don.id AND user_id IS NULL FOR UPDATE;

    IF FOUND THEN
      v_desde := NULL; v_hasta := NULL;
      IF a.cuotas_cubiertas > 0 AND a.anulado_en IS NULL THEN
        SELECT p.desde, p.hasta INTO v_desde, v_hasta
          FROM public.periodo_cuota(v_uid, public.fecha_local(a.fecha), a.cuotas_cubiertas, a.id) p;
        v_total := v_total + a.cuotas_cubiertas;
      END IF;
      UPDATE public.aportes
         SET user_id = v_uid, acceso_desde = v_desde, acceso_hasta = v_hasta,
             notas = COALESCE(notas, '') || format(' Reclamado por su titular el %s.', public.hoy_local())
       WHERE id = a.id;
    ELSE
      RAISE WARNING 'reclamar_donaciones: la donacion % no tiene aporte propio sin dueño; se vinculó la donación pero no el aporte', v_don.id;
    END IF;
    v_n := v_n + 1;
  END LOOP;

  RETURN QUERY
    SELECT v_n, v_total,
           (SELECT max(x.acceso_hasta) FROM public.aportes x
             WHERE x.user_id = v_uid AND x.cuotas_cubiertas > 0 AND x.anulado_en IS NULL);
END $$;

-- ---------------------------------------------------------------------
-- 11) Permisos
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.acceso_vigente(uuid)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tiene_acceso(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.antiguedad_socio(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.elegibilidad_club(uuid)     FROM PUBLIC, anon, authenticated;
-- `periodo_cuota` corre con los permisos de quien llama (no es SECURITY DEFINER):
-- la usa el trigger de aportes manuales cuando carga la comisión, y la RLS de
-- `aportes` limita lo que lee.
REVOKE ALL ON FUNCTION public.periodo_cuota(uuid, date, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mi_resumen_aportes()        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mi_acceso()                 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acceso_vigente(uuid)     TO service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso(uuid)       TO service_role;
GRANT EXECUTE ON FUNCTION public.antiguedad_socio(uuid)   TO service_role;
GRANT EXECUTE ON FUNCTION public.elegibilidad_club(uuid)  TO service_role;
GRANT EXECUTE ON FUNCTION public.periodo_cuota(uuid, date, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso()           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_acceso()              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_resumen_aportes()     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fecha_local(timestamptz) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hoy_local()              TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.meses_por_donacion(numeric) IS
  'Desde 20261016120000 ya NO convierte donaciones en meses. Solo se usa como PISO de una cuota (cuota_cuenta): 0 = bajo la cuota de referencia. reglas_acceso.meses_minimos/maximos no gobiernan nada hasta que exista el adelanto de cuotas.';
