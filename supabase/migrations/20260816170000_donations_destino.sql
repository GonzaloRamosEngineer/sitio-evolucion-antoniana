-- =============================================================================
-- `donations.destino_id`: el casillero que faltaba para que el destino aterrice.
--
-- POR QUÉ ESTO VA ANTES QUE CUALQUIER TRABAJO SOBRE EL SERVICIO DE PAGOS
--
-- El front ya manda `destino_id` al crear la preferencia (§10.11), y
-- `memberships.destino_id` existe desde la fase 1. Pero `donations` **no tenía
-- dónde guardarlo**. O sea que aunque el servicio de pagos reenviara el destino
-- perfectamente, no habría casillero donde ponerlo, y el trigger
-- `aporte_desde_donacion` seguiría imputando todo al institucional.
--
-- Mover el servicio a Vercel sin esta columna sería construir la cañería y
-- dejarla desembocando en el mismo lugar de siempre.
--
-- NULLABLE, a diferencia de `aportes.destino_id` que es NOT NULL. No es
-- inconsistencia: son dos cosas distintas.
--   · `donations` registra lo que informó la pasarela. Puede llegar sin destino,
--     y de hecho llega: el link directo de MercadoPago que la entidad publica
--     (`entidad.pagos.mercadoPagoDonacion`) no pasa por el checkout del sitio y
--     no sabe que los destinos existen.
--   · `aportes` es el libro, y ahí todo aporte tiene destino sí o sí. NULL en
--     `donations` significa "el canal no lo informó", y el trigger lo resuelve
--     cayendo al institucional — que es una respuesta, no un hueco.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

ALTER TABLE "public"."donations"
  ADD COLUMN IF NOT EXISTS "destino_id" uuid
    REFERENCES "public"."destinos"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."donations"."destino_id" IS
  'Destino elegido por quien dona, si el canal lo informó. NULL = no lo informó (p. ej. el link directo de MercadoPago); el trigger cae al destino institucional.';

CREATE INDEX IF NOT EXISTS "idx_donations_destino" ON "public"."donations" ("destino_id");

-- =============================================================================
-- El trigger ahora respeta el destino elegido
--
-- Único cambio respecto de 20260816160000: `COALESCE(NEW.destino_id, ...)`.
-- Todo lo demás se conserva idéntico, incluida LA REGLA DE ORO — nunca puede
-- hacer fallar el registro de una donación —, porque sigue siendo lo que
-- protege el cobro.
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

  -- ⬅️ EL CAMBIO. Si el canal informó destino, se respeta; si no, institucional.
  --
  -- Ojo con el orden: `destino_por_defecto()` solo se evalúa cuando hace falta,
  -- pero igual se valida el resultado, porque un `destino_id` que apunte a un
  -- destino borrado quedaría en NULL por el ON DELETE SET NULL y volvería acá.
  v_destino := COALESCE(NEW.destino_id, public.destino_por_defecto());
  IF v_destino IS NULL THEN
    RAISE WARNING 'aporte_desde_donacion: no hay destino institucional activo, la donacion % no entra al libro', NEW.id;
    RETURN NULL;
  END IF;

  -- IDEMPOTENCIA. Los webhooks de pago REINTENTAN: sin esto, un mismo cobro
  -- entra dos veces al libro y la rendición queda mal para siempre.
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
END $$;

-- Se agrega `destino_id` a las columnas que disparan el trigger: si una donación
-- llega sin destino y después se le asigna uno (corrección, o un webhook que
-- completa el dato en un segundo evento), el aporte tiene que poder crearse.
DROP TRIGGER IF EXISTS "trg_aporte_desde_donacion" ON "public"."donations";
CREATE TRIGGER "trg_aporte_desde_donacion"
  AFTER INSERT OR UPDATE OF "status", "amount", "destino_id" ON "public"."donations"
  FOR EACH ROW EXECUTE FUNCTION "public"."aporte_desde_donacion"();

-- =============================================================================
-- LO QUE FALTA PARA QUE ESTA COLUMNA SE LLENE
--
-- El servicio de pagos tiene que tomar el `destino_id` que el front ya le manda
-- y guardarlo en la fila de `donations`. Eso es §10.13, y es el motivo por el
-- que esta migración existe primero: sin el casillero, ese trabajo no tendría
-- dónde depositar el resultado.
--
-- Para las suscripciones el casillero ya existe (`memberships.destino_id`,
-- fase 1), pero falta lo de más atrás: sin `last_payment_id` no hay forma de
-- saber que se cobró un mes, y sin eso no hay aporte que registrar (§10.13).
-- =============================================================================
