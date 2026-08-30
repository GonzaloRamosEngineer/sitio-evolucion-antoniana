-- =============================================================================
-- `donations.payer_email`: el dato que hoy se pierde en cada donación anónima.
--
-- POR QUÉ ESTA COLUMNA, Y POR QUÉ AHORA
--
-- §10.17 cerró la capa de acceso y el backfill dio **0 personas con acceso
-- vigente**: 4 de las 5 donaciones aprobadas no tienen `user_id`. El ROADMAP
-- atribuyó eso a que "el vínculo se pierde en algún punto entre el sitio y el
-- webhook". **Es falso, y el código lo prueba**: `Collaborate.jsx` manda
-- `user?.id`, `preferencia.controller.js` lo codifica en el
-- `external_reference` y el webhook lo lee de vuelta con
-- `parseExternalReference`. La cañería está entera.
--
-- Lo que pasa es más simple y no tiene arreglo técnico: **se dona sin sesión
-- iniciada**. `user?.id || null` es null porque no hay usuario, no porque se
-- haya perdido. La donación del 2026-08-16 —la que demostró el circuito de
-- punta a punta— también entró anónima, y sí trae destino: la prueba de que el
-- canal nuevo funciona y de que igual no alcanza.
--
-- ⚠️ CORRIGE UNA AFIRMACIÓN DE §10.17. Decía que un aporte anónimo es
-- "inatribuible por construcción" porque `donations` no tiene columna de email.
-- La columna faltaba, sí, pero el dato **existe**: MercadoPago informa
-- `payer.email` en cada `payment` y lo conserva. Lo que había era un casillero
-- ausente, no un dato inexistente — el mismo hallazgo que motivó
-- `donations.destino_id` (20260816170000), y por eso esta migración lo copia:
-- primero el casillero, después la cañería que lo llena.
--
-- Es el prerrequisito de los tres caminos de §10.17 y no compromete ninguno:
-- sin este dato guardado, ninguna reconciliación posterior es posible.
--
-- NULLABLE y sin UNIQUE, a propósito:
--   · El link directo de MercadoPago no pasa por el checkout del sitio, así que
--     hay donaciones que van a seguir llegando sin email.
--   · Una misma persona dona más de una vez. UNIQUE rechazaría la segunda
--     donación, y perder el registro de un cobro es siempre peor.
--
-- LO QUE ESTA MIGRACIÓN NO HACE, DELIBERADAMENTE: **no vincula el email a una
-- cuenta**. Emparejar `payer_email` con `auth.users.email` y completar
-- `user_id` otorga acceso al club, y por lo tanto es una decisión con
-- consecuencias de seguridad (quien escribe el email de otra persona en el
-- checkout le estaría regalando —o robando— la antigüedad). Guardar el dato es
-- reversible e inocuo; vincularlo no. Van en migraciones separadas para que la
-- segunda se pueda revisar sola.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

ALTER TABLE "public"."donations"
  ADD COLUMN IF NOT EXISTS "payer_email" text;

COMMENT ON COLUMN "public"."donations"."payer_email" IS
  'Email que MercadoPago informa del pagador (payment.payer.email). Es el único rastro de identidad de una donación sin sesión iniciada. NULL = el canal no lo informó. NO vincula por sí solo a una cuenta: ver §10.18.';

-- El índice es para la reconciliación: "¿qué donaciones anónimas corresponden a
-- esta cuenta?" es una búsqueda por email, y va a correrse sobre cada alta de
-- usuario si alguna vez se automatiza. `lower(...)` porque los emails no
-- distinguen mayúsculas en la práctica y MercadoPago no garantiza cómo los
-- normaliza.
CREATE INDEX IF NOT EXISTS "idx_donations_payer_email"
  ON "public"."donations" (lower("payer_email"))
  WHERE "payer_email" IS NOT NULL;

-- =============================================================================
-- LO QUE FALTA PARA QUE ESTA COLUMNA SE LLENE
--
-- 1. El servicio de pagos (repo `mp-supabase-webhook`) tiene que tomar
--    `pago.payer.email` del payment que ya consulta y guardarlo acá. Va en el
--    mismo commit que esta migración.
--
-- 2. Las 5 donaciones que ya están en producción se pueden completar hacia
--    atrás: sus `payment_id` están en la tabla y MercadoPago devuelve el
--    `payer.email` de cada uno. Requiere `MP_ACCESS_TOKEN`, que vive en Render.
--    Eso es un backfill, no una migración, y por eso no está acá.
--
-- 3. La vinculación email → cuenta, que es la decisión de §10.18.
-- =============================================================================
