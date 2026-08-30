-- =====================================================================
-- QUE LOS APORTES OTORGUEN ACCESO
--
-- `aporte_desde_donacion()` ya existía y ya resolvía bien lo difícil: el
-- destino por defecto, la idempotencia por `referencia_externa` y el
-- `ON CONFLICT DO NOTHING` que evita pisar una corrección hecha a mano por la
-- comisión. **Acá NO se reescribe esa lógica**: se le agrega el cálculo del
-- período de acceso, que es lo único que le faltaba.
--
-- Y se agrega el trigger equivalente para `memberships`, que no existía: hoy
-- solo las donaciones entran al libro. Con 0 membresías activas eso no se
-- notaba, pero el día que alguien se suscriba, su cuota no habilitaría nada.
--
-- Reglas del acceso, en un solo lugar:
--   * Solo otorga acceso un aporte con `user_id` — el acceso es de una persona,
--     y un aporte anónimo no tiene a quién habilitar.
--   * Solo si el destino tiene `otorga_acceso` (decisión de la Fundación: todos
--     sí por defecto, las excepciones se marcan).
--   * Donación: meses proporcionales al monto, 0 por debajo del piso.
--   * Membresía: hasta el próximo cobro.
--   * Los períodos se encadenan con `proximo_acceso_desde()`: quien paga por
--     adelantado suma, no pisa.
-- =====================================================================

SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Donaciones: se conserva el cuerpo original y se le suma el acceso
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aporte_desde_donacion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_destino uuid;
  v_ref     text;
  v_meses   integer;
  v_desde   date;
  v_hasta   date;
BEGIN
  -- Solo el dinero que efectivamente entró. Una donación `pending` es una
  -- intención de pago, no un aporte.
  IF COALESCE(NEW.status, '') <> 'approved' THEN
    RETURN NULL;
  END IF;

  -- `aportes.monto` tiene CHECK (monto > 0). Sin esta guarda, una fila rara en
  -- `donations` haría fallar el trigger y con él la donación entera.
  IF COALESCE(NEW.amount, 0) <= 0 THEN
    RAISE WARNING 'aporte_desde_donacion: donacion % con monto invalido (%), no entra al libro', NEW.id, NEW.amount;
    RETURN NULL;
  END IF;

  -- Si el canal informó destino, se respeta; si no, institucional.
  v_destino := COALESCE(NEW.destino_id, public.destino_por_defecto());
  IF v_destino IS NULL THEN
    RAISE WARNING 'aporte_desde_donacion: no hay destino institucional activo, la donacion % no entra al libro', NEW.id;
    RETURN NULL;
  END IF;

  -- IDEMPOTENCIA. Los webhooks de pago REINTENTAN: sin esto, un mismo cobro
  -- entra dos veces al libro y la rendición queda mal para siempre.
  v_ref := COALESCE(NULLIF(NEW.payment_id, ''), 'donacion:' || NEW.id::text);

  -- ⬅️ NUEVO: período de acceso. Sin `user_id` no hay a quién habilitar, y un
  -- destino marcado como que no otorga acceso tampoco. En esos casos el aporte
  -- entra al libro igual, con las dos fechas en NULL — que es lo que el CHECK
  -- `aportes_acceso_chk` ya contemplaba.
  v_meses := 0;
  IF NEW.user_id IS NOT NULL AND public.destino_otorga_acceso(v_destino) THEN
    v_meses := public.meses_por_donacion(NEW.amount);
  END IF;

  IF v_meses > 0 THEN
    v_desde := public.proximo_acceso_desde(NEW.user_id);
    v_hasta := (v_desde + (v_meses * interval '1 month'))::date;
  END IF;

  BEGIN
    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, donation_id, referencia_externa,
      acceso_desde, acceso_hasta, notas
    ) VALUES (
      NEW.user_id,
      NEW.amount,
      COALESCE(NEW.created_at, now()),
      v_destino,
      'donacion',
      NEW.id,
      v_ref,
      v_desde,
      v_hasta,
      'Alta automatica desde donations (' || COALESCE(NEW.payment_provider, 'sin proveedor') || ')'
        || CASE WHEN v_meses > 0 THEN format('. Otorga %s mes(es) de acceso.', v_meses)
                ELSE '. No otorga acceso.' END
    )
    -- ⚠️ DO NOTHING y NO "DO UPDATE SET destino_id", que era la tentación obvia.
    --
    -- Con DO UPDATE, cada reintento del webhook pisaría el destino del aporte. Y
    -- como la comisión puede re-imputar un aporte mal dirigido desde el panel,
    -- el próximo reintento le desharía la corrección en silencio. Entre "el
    -- trigger crea y nunca modifica" y "el trigger sincroniza", la primera es la
    -- única que deja que una corrección humana sobreviva.
    ON CONFLICT (referencia_externa) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ver la regla de oro: se pierde el renglón del libro, no el registro del
    -- cobro. El WARNING queda en los logs de Postgres.
    RAISE WARNING 'aporte_desde_donacion: no se pudo registrar el aporte de la donacion %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $function$;

-- ---------------------------------------------------------------------
-- 2) Membresías: el trigger que faltaba
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aporte_desde_membresia()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_destino uuid;
  v_ref     text;
  v_desde   date;
  v_hasta   date;
BEGIN
  IF COALESCE(NEW.status, '') <> 'active' OR NEW.last_payment_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- El proveedor usa varios nombres para "cobrado". Si no informa nada, se
  -- confía en que status='active' ya significa que el cobro entró.
  IF COALESCE(NEW.last_payment_status, 'approved')
       NOT IN ('approved', 'accredited', 'authorized') THEN
    RETURN NULL;
  END IF;

  -- En UPDATE, solo si el pago es NUEVO. Si no, cualquier update de la fila
  -- —una pausa, un cambio de mail— regalaría un mes.
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

  IF NEW.user_id IS NOT NULL AND public.destino_otorga_acceso(v_destino) THEN
    v_desde := public.proximo_acceso_desde(NEW.user_id);
    -- Hasta el próximo cobro. El GREATEST evita un rango invertido si el
    -- proveedor manda una `next_charge_date` en el pasado.
    v_hasta := GREATEST(COALESCE(NEW.next_charge_date, (v_desde + interval '1 month')::date), v_desde);
  END IF;

  BEGIN
    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, membership_id, referencia_externa,
      acceso_desde, acceso_hasta, email_aportante, notas
    ) VALUES (
      NEW.user_id, NEW.amount, now(), v_destino, 'membresia', NEW.id, v_ref,
      v_desde, v_hasta, NEW.payer_email,
      'Alta automatica por cobro de cuota (' || COALESCE(NEW.payment_method, 'sin metodo') || ').'
    )
    ON CONFLICT (referencia_externa) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'aporte_desde_membresia: no se pudo registrar el aporte de la membresia %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $function$;

DROP TRIGGER IF EXISTS trg_aporte_desde_membresia ON public.memberships;
CREATE TRIGGER trg_aporte_desde_membresia
  AFTER INSERT OR UPDATE OF status, last_payment_id, last_payment_status, next_charge_date, destino_id
  ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.aporte_desde_membresia();
