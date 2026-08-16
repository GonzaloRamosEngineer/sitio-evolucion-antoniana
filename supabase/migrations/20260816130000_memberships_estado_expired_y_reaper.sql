-- =============================================================================
-- Robustece `memberships`: agrega el estado `expired`, limpia los `pending`
-- fósiles y saca un índice duplicado.
--
-- CONTEXTO (ROADMAP §10.10, evidencia de producción del 2026-08-16)
-- --------------------------------------------------------------------------
-- Contrastando el panel de MercadoPago contra la base aparecieron 7
-- suscripciones, ninguna activa, y tres problemas:
--
--   1. El webhook no sincroniza el estado de vuelta: la base dice `pending`
--      desde noviembre de 2025 para suscripciones que MercadoPago da por
--      canceladas. El estado refleja el momento de creación, no lo que pasó.
--   2. MercadoPago tiene el estado `Vencida` (falló el cobro repetidamente) y
--      el CHECK del esquema no lo contempla: no hay dónde guardarlo.
--   3. Cuatro suscripciones idénticas del mismo usuario el mismo día.
--
-- Esta migración ataca (2) y limpia el rastro de (1). El índice único que
-- resuelve (3) NO está acá y el motivo está documentado abajo — es una
-- decisión de diseño, no un olvido.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. `expired` entra al CHECK.
--
--    Es una AMPLIACIÓN: todo lo que era válido antes lo sigue siendo, así que
--    no puede fallar por datos existentes. `expired` = MercadoPago dejó de
--    cobrarla porque el medio de pago falló repetidamente. Es distinto de
--    `cancelled`, que es una decisión de la persona, y la diferencia importa:
--    a quien se le venció la tarjeta se le escribe para que la actualice; a
--    quien canceló, no.
-- -----------------------------------------------------------------------------
ALTER TABLE "public"."memberships"
  DROP CONSTRAINT IF EXISTS "memberships_status_chk";

ALTER TABLE "public"."memberships"
  ADD CONSTRAINT "memberships_status_chk"
  CHECK ("status" = ANY (ARRAY[
    'pending'::text,    -- creada, esperando que MercadoPago la autorice
    'active'::text,     -- cobrando
    'paused'::text,     -- pausada por la persona
    'cancelled'::text,  -- cancelada por la persona o por la entidad
    'expired'::text     -- MercadoPago dejó de cobrar: fallo de medio de pago
  ]));

-- -----------------------------------------------------------------------------
-- 2. Reaper de `pending` fósiles.
--
--    Un preapproval de MercadoPago que nunca se autorizó no queda pendiente
--    para siempre: o se autoriza en minutos, o no se autoriza nunca. Un
--    `pending` de hace nueve meses no es una suscripción en trámite, es basura
--    que quedó porque el webhook no escribió el desenlace.
--
--    Ventana deliberadamente conservadora (30 días). Nada legítimo tarda eso:
--    con 7 días alcanzaría de sobra. Se eligió 30 para que esta migración no
--    pueda tocar por error algo que todavía estaba vivo.
--
--    ⚠️ Esto NO reemplaza arreglar el webhook. Es limpiar el rastro, no la
--    causa. Mientras el webhook no sincronice, van a volver a acumularse.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_afectadas integer;
BEGIN
  UPDATE public.memberships
     SET status = 'expired',
         updated_at = now()
   WHERE status = 'pending'
     AND created_at < now() - interval '30 days';

  GET DIAGNOSTICS v_afectadas = ROW_COUNT;
  RAISE NOTICE 'Reaper: % suscripciones pending de mas de 30 dias marcadas como expired', v_afectadas;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Índice duplicado.
--
--    El baseline crea DOS índices btree idénticos sobre (user_id):
--    `idx_memberships_user` e `idx_memberships_user_id`. Uno de los dos es
--    puro costo de escritura. Se conserva `idx_memberships_user`.
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS "public"."idx_memberships_user_id";

-- =============================================================================
-- POR QUÉ EL ÍNDICE ÚNICO CONTRA EL DOBLE COBRO NO ESTÁ EN ESTA MIGRACIÓN
-- =============================================================================
-- El problema (3) de arriba —cuatro suscripciones idénticas— pide una
-- restricción de unicidad. La obvia sería:
--
--     CREATE UNIQUE INDEX ... ON memberships (user_id)
--       WHERE status IN ('active','paused','pending');
--
-- **Y sería un error hacerlo ahora**, porque prohíbe algo que el modelo de
-- §10.8/§10.9 necesita: que una misma persona sostenga MÁS DE UN destino a la
-- vez. Un padrino que apadrina dos becas, o dos animales en un refugio, son
-- dos suscripciones legítimas del mismo usuario. Un UNIQUE sobre `user_id`
-- solo las vuelve imposibles, y después hay que deshacerlo.
--
-- La restricción correcta es sobre el PAR (user_id, destino_id), y `destino_id`
-- todavía no existe: llega con `destinos` en la migración siguiente. Ahí va,
-- junto con la columna, en una sola pieza coherente.
--
-- Se puede esperar sin riesgo porque **hoy no hay ninguna suscripción activa**
-- (verificado contra el panel de MercadoPago el 2026-08-16): no existe la
-- posibilidad de un doble cobro real en la ventana entre esta migración y la
-- que viene.
--
-- Es el mismo criterio de todo el repo: una restricción que hay que revertir
-- en dos semanas es peor que la que se puso a tiempo en el lugar correcto.
-- =============================================================================
