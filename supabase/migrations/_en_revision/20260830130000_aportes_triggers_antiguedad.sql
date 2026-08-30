-- =====================================================================
-- QUIÉN ALIMENTA EL LIBRO + CÓMO SE MIDE LA ANTIGÜEDAD
-- (decisiones D1 y D4 de la Fundación, 2026-08-30)
--
-- D1 — El problema: `20260830120000` creó `aportes`, pero nada lo escribía
-- hacia adelante. El webhook de cobros vive FUERA de este repo
-- (`mp-supabase-webhook.onrender.com`, ver `vercel.json`) y solo actualiza
-- `memberships` / `donations`. Sin esto, el backfill llena el libro una vez y
-- 30 días después TODOS pierden el acceso sin que nadie se entere.
--
-- Se eligió resolverlo con **triggers en la base** (opción C) y no tocando el
-- webhook externo (A) ni con un cron (B):
--   * Funciona sin importar quién escriba el pago: el webhook de Render, un
--     admin cargando a mano, o el proveedor que venga en dos años. Es el
--     desacople que el §10.2 buscaba al crear el libro.
--   * Es instantáneo (el cron tenía hasta 24 h de latencia: pagás hoy, entrás
--     mañana).
--   * Se versiona y se valida acá, como todo lo demás. La opción A dejaba el
--     punto crítico del negocio en un servicio que este repo no controla.
--
-- Idempotencia: MercadoPago **reintenta** los webhooks. Sin clave de dedup, un
-- reintento regala un mes de acceso. Se usa `aportes.payment_id` (índice único)
-- y, para donaciones, `aportes.donation_id`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) La regla de conversión, en un solo lugar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meses_por_donacion(p_monto numeric)
RETURNS integer
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
           WHEN p_monto < COALESCE(r.piso_monto, r.cuota_referencia) THEN 0
           ELSE LEAST(r.meses_maximos,
                      GREATEST(r.meses_minimos,
                               floor(p_monto / r.cuota_referencia)::int))
         END
    FROM public.reglas_acceso r
   WHERE r.vigente
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.meses_por_donacion(numeric) IS
  'Conversión donación → meses de acceso (ROADMAP 10.4.1): proporcional, con piso y topes. Devuelve 0 por debajo del piso. Única fuente de la regla: la usan el trigger y el backfill.';

-- Encadena períodos sin huecos ni solapamientos: si el socio ya tiene acceso
-- pago hasta una fecha futura, el período nuevo arranca al día siguiente; si
-- está vencido, arranca hoy.
CREATE OR REPLACE FUNCTION public.proximo_acceso_desde(p_user_id uuid)
RETURNS date
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT GREATEST(current_date,
                  COALESCE((SELECT max(acceso_hasta) + 1
                              FROM public.aportes
                             WHERE user_id = p_user_id), current_date));
$$;

-- ---------------------------------------------------------------------
-- 2) Trigger de cuotas: un cobro aprobado = un aporte
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_aporte_cuota()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_desde date;
  v_hasta date;
BEGIN
  IF NEW.status <> 'active' OR NEW.last_payment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- El proveedor usa varios nombres para "cobrado". Si no informa nada, se
  -- confía en que status='active' ya significa que el cobro entró.
  IF COALESCE(NEW.last_payment_status, 'approved')
       NOT IN ('approved', 'accredited', 'authorized') THEN
    RETURN NEW;
  END IF;

  -- En UPDATE, solo si el pago es NUEVO (si no, cualquier update de la fila
  -- —una pausa, un cambio de mail— regalaría un mes).
  IF TG_OP = 'UPDATE' AND NEW.last_payment_id IS NOT DISTINCT FROM OLD.last_payment_id THEN
    RETURN NEW;
  END IF;

  -- Idempotencia dura, contra reintentos del webhook.
  IF EXISTS (SELECT 1 FROM public.aportes WHERE payment_id = NEW.last_payment_id) THEN
    RETURN NEW;
  END IF;

  v_desde := public.proximo_acceso_desde(NEW.user_id);
  v_hasta := GREATEST(COALESCE(NEW.next_charge_date, (v_desde + interval '1 month')::date),
                      v_desde);

  INSERT INTO public.aportes
    (user_id, tipo, monto, membership_id, payment_id, acceso_desde, acceso_hasta,
     email_aportante, observaciones)
  VALUES
    (NEW.user_id, 'cuota', NEW.amount, NEW.id, NEW.last_payment_id, v_desde, v_hasta,
     NEW.payer_email, 'Alta automática por cobro de cuota (trigger).');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_aporte_cuota ON public.memberships;
CREATE TRIGGER trg_registrar_aporte_cuota
  AFTER INSERT OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.registrar_aporte_cuota();

-- ---------------------------------------------------------------------
-- 3) Trigger de donaciones: una donación aprobada = un aporte proporcional
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_aporte_donacion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_meses integer;
  v_desde date;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;  -- ya estaba aprobada, no es un hecho nuevo
  END IF;

  IF EXISTS (SELECT 1 FROM public.aportes WHERE donation_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_meses := public.meses_por_donacion(NEW.amount);

  -- Por debajo del piso (= el precio de la cuota, decisión D3) se agradece la
  -- donación pero NO otorga acceso. No es un error: es la regla.
  IF v_meses <= 0 THEN
    RETURN NEW;
  END IF;

  v_desde := public.proximo_acceso_desde(NEW.user_id);

  INSERT INTO public.aportes
    (user_id, tipo, monto, donation_id, payment_id, acceso_desde, acceso_hasta, observaciones)
  VALUES
    (NEW.user_id, 'donacion', NEW.amount, NEW.id, NEW.payment_id,
     v_desde, (v_desde + (v_meses * interval '1 month'))::date,
     format('Alta automática por donación aprobada (%s meses de acceso).', v_meses));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_aporte_donacion ON public.donations;
CREATE TRIGGER trg_registrar_aporte_donacion
  AFTER INSERT OR UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.registrar_aporte_donacion();

-- ---------------------------------------------------------------------
-- 4) ANTIGÜEDAD (D4)
--
-- La pregunta era: si empiezo hoy, pago un año, dejo de pagar el siguiente y
-- vuelvo al tercero, ¿cuánta antigüedad tengo?
--
-- La respuesta es que **no es un número, son tres**, y las tres salen del mismo
-- libro sin guardar nada extra:
--
--   socio_desde     — la fecha del primer aporte. NUNCA se reinicia. Es la
--                     identidad ("socio desde 2026"), lo que va en el carnet.
--   meses_aportados — la suma real de tiempo cubierto, sin contar dos veces los
--                     solapamientos (un doble pago no vale doble). Es lo que
--                     debe DAR DERECHOS: quien no pagó un año no cobra
--                     beneficios por ese año.
--   racha_meses     — el tramo continuo actual, sin cortes. Es lo que conviene
--                     premiar si se quiere incentivar no interrumpir.
--
-- Además `cortes` = cuántas veces se interrumpió.
--
-- Se calcula con `range_agg` sobre los períodos de acceso: Postgres une los
-- rangos solapados y deja los huecos a la vista. Hacer esto a mano con sumas de
-- fechas es donde aparecen los errores de doble conteo.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.antiguedad_socio(uuid);
CREATE FUNCTION public.antiguedad_socio(p_user_id uuid)
RETURNS TABLE (
  socio_desde     date,
  dias_aportados  integer,
  meses_aportados integer,
  racha_dias      integer,
  racha_meses     integer,
  cortes          integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH unido AS (
    SELECT range_agg(daterange(acceso_desde, acceso_hasta, '[]')) AS mr
      FROM public.aportes
     WHERE user_id = p_user_id
  ),
  tramos AS (
    SELECT unnest(mr) AS tramo FROM unido WHERE mr IS NOT NULL
  ),
  actual AS (
    SELECT tramo FROM tramos WHERE tramo @> current_date LIMIT 1
  )
  SELECT
    (SELECT min(lower(tramo)) FROM tramos),
    (SELECT COALESCE(sum(upper(tramo) - lower(tramo)), 0)::int FROM tramos),
    (SELECT COALESCE(sum(upper(tramo) - lower(tramo)), 0)::int / 30 FROM tramos),
    (SELECT COALESCE((SELECT upper(tramo) - lower(tramo) FROM actual), 0)::int),
    (SELECT COALESCE((SELECT upper(tramo) - lower(tramo) FROM actual), 0)::int / 30),
    (SELECT GREATEST(count(*)::int - 1, 0) FROM tramos);
$$;

COMMENT ON FUNCTION public.antiguedad_socio(uuid) IS
  'Antigüedad en tres números (decisión D4): socio_desde no se reinicia nunca, meses_aportados es lo que otorga derechos, racha_meses premia la continuidad.';

DROP FUNCTION IF EXISTS public.mi_antiguedad();
CREATE FUNCTION public.mi_antiguedad()
RETURNS TABLE (
  socio_desde     date,
  dias_aportados  integer,
  meses_aportados integer,
  racha_dias      integer,
  racha_meses     integer,
  cortes          integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.antiguedad_socio(auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 5) Permisos (mismo criterio que 20260830120000: nadie espía a nadie)
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.antiguedad_socio(uuid)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.proximo_acceso_desde(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.antiguedad_socio(uuid)     TO service_role;
GRANT EXECUTE ON FUNCTION public.proximo_acceso_desde(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mi_antiguedad()            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.meses_por_donacion(numeric) TO anon, authenticated, service_role;
