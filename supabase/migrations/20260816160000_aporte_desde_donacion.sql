-- =============================================================================
-- Las donaciones aprobadas entran solas al libro.
--
-- POR QUÉ ESTO EXISTE, Y POR QUÉ NO TOCA EL MICROSERVICIO
--
-- Relevado el 2026-08-16 contra producción:
--   · Las donaciones únicas SÍ llegan a la base: 4 aprobadas, con `payment_id`
--     real de MercadoPago, $7.141 en total.
--   · Las suscripciones NO: las 16 filas tienen `preapproval_id`, pero CERO
--     tienen `last_payment_id` y CERO tienen `payer_email`. Se crean y después
--     nadie las vuelve a tocar (§10.10).
--
-- O sea que el canal de donaciones ya deposita el dato en la base. Lo único que
-- falta es que ese dato entre al libro — y eso se puede resolver del lado de la
-- base, sin depender de un servicio que vive fuera del repo y que nadie testeó.
--
-- ⚠️ LO QUE ESTO **NO** RESUELVE, PARA QUE NADIE LO LEA DE MÁS:
--   · El destino elegido en el checkout sigue sin llegar (el microservicio no
--     reenvía `destino_id`), así que todo cae al destino por defecto. Es una
--     respuesta honesta —"entró plata sin destino específico"—, no la elección
--     del donante.
--   · Las suscripciones siguen sin entrar al libro. No hay de dónde: sin
--     `last_payment_id` no existe el hecho "se cobró un mes". Un trigger sobre
--     la creación de la suscripción registraría una intención, no un cobro, y
--     eso ensuciaría el libro con plata que nunca entró.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

-- =============================================================================
-- 1. El destino por defecto
--
-- Determinista a propósito: `institucional` + `activo`, y entre varios el de
-- menor `orden`. Si la entidad tuviera dos institucionales, la plata iría
-- siempre al mismo y no a uno al azar según el plan de la consulta.
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."destino_por_defecto"()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.destinos
   WHERE tipo = 'institucional' AND estado = 'activo'
   ORDER BY orden, created_at
   LIMIT 1;
$$;

-- =============================================================================
-- 2. El trigger
--
-- ⚠️ REGLA DE ORO DE ESTA FUNCIÓN: **nunca puede hacer fallar el registro de la
-- donación.** Si algo sale mal acá, se pierde un renglón del libro; si en cambio
-- se propaga el error, se pierde el registro del cobro entero y el webhook de
-- MercadoPago recibe un 500 y reintenta para siempre. Un libro incompleto se
-- arregla; una donación que nunca se registró, no.
--
-- Por eso cada salida es un RETURN silencioso con WARNING, y el INSERT va
-- envuelto en un bloque que atrapa cualquier excepción.
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."aporte_desde_donacion"()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_destino uuid;
  v_ref     text;
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

  v_destino := public.destino_por_defecto();
  IF v_destino IS NULL THEN
    RAISE WARNING 'aporte_desde_donacion: no hay destino institucional activo, la donacion % no entra al libro', NEW.id;
    RETURN NULL;
  END IF;

  -- IDEMPOTENCIA, que es lo que hace segura toda esta pieza.
  -- Los webhooks de pago REINTENTAN: sin esto, un mismo cobro entra dos veces al
  -- libro y la rendición queda mal para siempre. `referencia_externa` es UNIQUE,
  -- así que el ON CONFLICT de abajo convierte el reintento en un no-op.
  --
  -- Se prefiere el `payment_id` de MercadoPago porque es la identidad del cobro
  -- del lado de la pasarela. Si faltara, se cae al id de la fila, que también es
  -- estable y único: lo importante es que NUNCA sea NULL, porque un UNIQUE con
  -- NULL no restringe nada y volveríamos a poder duplicar.
  v_ref := COALESCE(NULLIF(NEW.payment_id, ''), 'donacion:' || NEW.id::text);

  BEGIN
    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, donation_id, referencia_externa, notas
    ) VALUES (
      NEW.user_id,
      NEW.amount,
      COALESCE(NEW.created_at, now()),
      v_destino,
      'donacion',
      NEW.id,
      v_ref,
      'Alta automatica desde donations (' || COALESCE(NEW.payment_provider, 'sin proveedor') || ').'
    )
    ON CONFLICT (referencia_externa) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ver la regla de oro del encabezado: se pierde el renglón del libro, no el
    -- registro del cobro. El WARNING queda en los logs de Postgres.
    RAISE WARNING 'aporte_desde_donacion: no se pudo registrar el aporte de la donacion %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS "trg_aporte_desde_donacion" ON "public"."donations";
CREATE TRIGGER "trg_aporte_desde_donacion"
  AFTER INSERT OR UPDATE OF "status", "amount" ON "public"."donations"
  FOR EACH ROW EXECUTE FUNCTION "public"."aporte_desde_donacion"();

-- =============================================================================
-- 3. Backfill de lo que ya está aprobado
--
-- Mismo criterio que el trigger, y con el mismo ON CONFLICT: correr esta
-- migración dos veces no duplica nada.
--
-- Y de eso se sigue una propiedad útil, verificada en Docker: **este bloque
-- sirve además como pase de reparación.** Si el trigger se salteó una donación
-- —porque en ese momento no había destino activo, por ejemplo—, volver a correr
-- esto la incorpora sin tocar las que ya estaban. Es la red que hace que la
-- regla de oro de arriba (nunca hacer fallar la donación) no tenga como precio
-- un libro incompleto para siempre.
--
-- Al 2026-08-16 son 4 donaciones aprobadas por $7.141. Se backfillean —y las
-- suscripciones NO— porque estas son cobros reales verificables con su
-- `payment_id`, mientras que las 16 suscripciones son intenciones sin ningún
-- cobro asociado (§10.10).
-- =============================================================================
DO $$
DECLARE
  v_destino uuid;
  v_insertadas int;
BEGIN
  v_destino := public.destino_por_defecto();
  IF v_destino IS NULL THEN
    RAISE NOTICE 'Backfill omitido: no hay destino institucional activo.';
    RETURN;
  END IF;

  INSERT INTO public.aportes (
    user_id, monto, fecha, destino_id, origen, donation_id, referencia_externa, notas
  )
  SELECT
    d.user_id,
    d.amount,
    COALESCE(d.created_at, now()),
    v_destino,
    'donacion',
    d.id,
    COALESCE(NULLIF(d.payment_id, ''), 'donacion:' || d.id::text),
    'Backfill 2026-08-16 desde donations.'
  FROM public.donations d
  WHERE d.status = 'approved'
    AND COALESCE(d.amount, 0) > 0
  ON CONFLICT (referencia_externa) DO NOTHING;

  GET DIAGNOSTICS v_insertadas = ROW_COUNT;
  RAISE NOTICE 'Backfill: % donaciones aprobadas entraron al libro.', v_insertadas;
END $$;

-- =============================================================================
-- LO QUE SIGUE FALTANDO, Y DÓNDE VIVE
--
-- Esto tapa el agujero del lado de la base, pero el arreglo de fondo es del
-- servicio de pagos (ROADMAP §10.13):
--   · que reenvíe el `destino_id` que ya le manda el front, para que el aporte
--     caiga en el destino que el donante eligió y no en el por defecto;
--   · que escriba `last_payment_id` al cobrar una suscripción, que es lo único
--     que convertiría un cobro recurrente en un aporte;
--   · reconciliación periódica contra la API de MercadoPago, porque los
--     webhooks se pierden y §10.10 ya documentó una desincronización real.
-- =============================================================================
