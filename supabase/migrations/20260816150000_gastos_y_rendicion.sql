-- =============================================================================
-- FASE 2: `gastos` — la mitad que faltaba del libro.
--
-- Implementa ROADMAP §10.9 y cierra lo que §10.11 dejó declarado. En una línea:
-- **hasta acá había recaudación con destino declarado; a partir de acá hay
-- rendición.** Saber que entraron $100.000 para "pelotas y conos" no prueba
-- nada si no se puede mostrar en qué se gastaron.
--
--   saldo(destino) = Σ aportes − Σ gastos
--
-- ESTO CORRIGE UNA PROPUESTA ANTERIOR. §10.7 proponía `campanas.rendicion_md`,
-- un campo de texto libre. Es insuficiente: una rendición creíble no es un
-- párrafo escrito a mano, es la suma de gastos reales con comprobante,
-- contrastable contra lo recaudado. Hace falta una tabla, no un campo.
--
-- NADA ACÁ NOMBRA A LA FUNDACIÓN NI ASUME SU RUBRO, igual que en fase 1: el
-- mismo esquema tiene que servir a un refugio, un club o una biblioteca.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

-- =============================================================================
-- 1. GASTOS — los egresos, con comprobante
-- =============================================================================
CREATE TABLE IF NOT EXISTS "public"."gastos" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Mismo criterio que `aportes.destino_id`: NOT NULL y ON DELETE RESTRICT.
  -- Todo gasto sale de algún lado. Si no corresponde a una campaña puntual, sale
  -- del destino `institucional` — que es una respuesta, no un hueco.
  "destino_id" uuid NOT NULL REFERENCES "public"."destinos"("id") ON DELETE RESTRICT,

  "concepto"   text NOT NULL,
  "monto"      numeric NOT NULL CHECK ("monto" > 0),
  "fecha"      date NOT NULL DEFAULT CURRENT_DATE,

  -- Sin CHECK a propósito. Las categorías de gasto varían por rubro
  -- ("veterinaria" en un refugio, "arbitraje" en un club, "honorarios" en una
  -- fundación) y por lo tanto son DATO de la entidad, no estructura. Un CHECK
  -- acá obligaría a una migración por cada cliente nuevo, que es exactamente lo
  -- que el objetivo multi-cliente no puede permitirse (§10.9).
  "categoria"  text,
  "proveedor"  text,

  -- --- Comprobante -----------------------------------------------------------
  -- Vive en el bucket privado `comision-docs`, bajo el prefijo `gastos/`. Se
  -- reusa el bucket de la Comisión en vez de crear uno nuevo: sus cuatro
  -- policies ya restringen todo a `is_board_member()`, así que el archivo queda
  -- protegido sin escribir una sola policy de storage más (§10.9: se reusa, no
  -- se construye).
  --
  -- ⚠️ EL ARCHIVO NO SE PUBLICA, NI SIQUIERA CUANDO EL GASTO SÍ. Una factura
  -- trae CUIT, domicilio y a veces firma de un tercero que no consintió que eso
  -- fuera público. Lo que se publica es el gasto; el comprobante queda para la
  -- comisión, el revisor de cuentas y quien lo pida. `tiene_comprobante` (abajo)
  -- existe para que el público igual pueda ver que existe.
  --
  -- Si alguna entidad quisiera publicar los archivos, eso es una columna
  -- `comprobante_publico` y una policy más. Se difiere a propósito: hoy no hay
  -- ninguna entidad que lo haya pedido, y el default seguro es este.
  "comprobante_path"   text,
  "comprobante_nombre" text,
  "comprobante_mime"   text,
  "comprobante_size"   bigint CHECK ("comprobante_size" IS NULL OR "comprobante_size" > 0),

  -- Derivada, para que el público pueda ver que el comprobante existe sin que se
  -- le entregue la ruta ni el archivo.
  "tiene_comprobante" boolean GENERATED ALWAYS AS ("comprobante_path" IS NOT NULL) STORED,

  -- --- Publicación -----------------------------------------------------------
  -- ⚠️ PUBLICAR UN GASTO LO PUBLICA ENTERO: concepto, monto, fecha, categoría,
  -- proveedor y notas. No hay publicación por columna, y es deliberado — las
  -- RLS filtran filas, no columnas, y fingir lo contrario con grants por columna
  -- produce un modelo que nadie puede razonar y que se rompe en el primer
  -- cambio. La regla, entonces, es simple y verificable:
  --
  --     lo que no pueda ser público NO se escribe en un gasto.
  --
  -- Default `false` por el mismo motivo que `visibilidad_beneficiario` es
  -- `anonimizado`: publicar tiene que ser un acto deliberado, nunca un olvido.
  "publicado" boolean NOT NULL DEFAULT false,

  -- Quién lo cargó. Rendir cuentas puertas adentro también es rendir cuentas.
  "created_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,

  "notas"      text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_gastos_destino"   ON "public"."gastos" ("destino_id", "fecha" DESC);
CREATE INDEX IF NOT EXISTS "idx_gastos_publicado" ON "public"."gastos" ("publicado") WHERE "publicado";

-- =============================================================================
-- 2. Contadores de rendición en `destinos`
--
-- Mismo mecanismo que los de `aportes`: desnormalizados y mantenidos por
-- trigger, para que la rendición pública se lea de `destinos`.
-- =============================================================================
ALTER TABLE "public"."destinos"
  ADD COLUMN IF NOT EXISTS "monto_rendido" numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cantidad_gastos_rendidos" integer NOT NULL DEFAULT 0;

-- ⚠️ EL NOMBRE ES "RENDIDO" Y NO "GASTADO", Y LA DIFERENCIA IMPORTA:
-- estos contadores suman SOLO los gastos publicados. Si sumaran todos, el
-- público vería un total que no coincide con la lista de gastos que puede ver,
-- y un total que no cierra con lo que se muestra se lee como que algo se
-- esconde — justo lo contrario de lo que esta tabla existe para lograr.
--
-- La comisión, que ve todas las filas, obtiene su total real sumando `gastos`.
COMMENT ON COLUMN "public"."destinos"."monto_rendido" IS
  'Suma de gastos PUBLICADOS. No es el total gastado: es el total rendido públicamente.';
COMMENT ON COLUMN "public"."destinos"."cantidad_gastos_rendidos" IS
  'Cantidad de gastos publicados. Coincide siempre con las filas de gastos que ve el público.';

CREATE OR REPLACE FUNCTION "public"."recalcular_rendicion_destino"("p_destino_id" uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.destinos d
     SET monto_rendido            = COALESCE(t.suma, 0),
         cantidad_gastos_rendidos = COALESCE(t.cuenta, 0),
         updated_at               = now()
    FROM (
      SELECT COALESCE(SUM(monto), 0) AS suma, COUNT(*) AS cuenta
        FROM public.gastos
       WHERE destino_id = p_destino_id
         AND publicado
    ) t
   WHERE d.id = p_destino_id;
$$;

CREATE OR REPLACE FUNCTION "public"."trg_gastos_totales"()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- En UPDATE el gasto puede haber cambiado de destino: hay que recalcular los
  -- dos, si no el viejo queda inflado para siempre. Es el mismo cuidado que en
  -- `trg_aportes_totales`, y el motivo por el que se recalcula en vez de sumar
  -- deltas: un contador que suma deltas se desincroniza en el primer UPDATE.
  IF TG_OP IN ('UPDATE','DELETE') THEN
    PERFORM public.recalcular_rendicion_destino(OLD.destino_id);
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalcular_rendicion_destino(NEW.destino_id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS "trg_gastos_totales" ON "public"."gastos";
CREATE TRIGGER "trg_gastos_totales"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."gastos"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_gastos_totales"();

-- =============================================================================
-- 3. RLS
-- =============================================================================
ALTER TABLE "public"."gastos" ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo gastos PUBLICADOS de destinos ACTIVOS. La subconsulta a
-- `destinos` no puede filtrarse sola por RLS (corre dentro de esta policy), así
-- que el estado se exige explícitamente: un destino en borrador no filtra sus
-- gastos por la puerta de atrás.
DROP POLICY IF EXISTS "gastos_public_read_publicados" ON "public"."gastos";
CREATE POLICY "gastos_public_read_publicados" ON "public"."gastos"
  FOR SELECT USING (
    "publicado"
    AND EXISTS (
      SELECT 1 FROM "public"."destinos" d
       WHERE d."id" = "destino_id" AND d."estado" = 'activo'
    )
  );

DROP POLICY IF EXISTS "gastos_board_all" ON "public"."gastos";
CREATE POLICY "gastos_board_all" ON "public"."gastos"
  TO "authenticated"
  USING ("public"."is_board_member"())
  WITH CHECK ("public"."is_board_member"());

-- ⚠️ NO hay policy de DELETE para nadie, igual que en `aportes`: un libro
-- contable no se borra. Un gasto mal cargado se corrige con UPDATE y queda el
-- rastro. `service_role` puede borrar (puentea RLS) si hiciera falta una
-- corrección excepcional, y que sea excepcional es justamente el punto.
--
-- Nótese que `gastos_board_all` es FOR ALL, que incluiría DELETE: por eso se
-- revoca el privilegio a nivel GRANT abajo. La policy permite, el grant niega,
-- y para borrar hacen falta las dos cosas.

-- --- GRANTS -----------------------------------------------------------------
-- Mínimos y acompañando a las policies, como en fase 1.
REVOKE ALL ON TABLE "public"."gastos" FROM "anon", "authenticated";

GRANT SELECT                 ON TABLE "public"."gastos" TO "anon";
GRANT SELECT, INSERT, UPDATE ON TABLE "public"."gastos" TO "authenticated";
GRANT ALL                    ON TABLE "public"."gastos" TO "service_role";

-- =============================================================================
-- LO QUE NO ESTÁ ACÁ, Y ES A PROPÓSITO
--
-- - `comprobante_publico`. Ver la nota de la columna: hoy el archivo es siempre
--   de la comisión. Agregarlo es una columna y una policy el día que una
--   entidad lo pida.
--
-- - Publicar un gasto NO exige comprobante. Se evaluó exigirlo y se descartó:
--   hay gastos legítimos sin comprobante (un pago chico en efectivo), y
--   obligar empujaría a no publicarlos, que es peor que publicarlos marcados
--   como "sin comprobante". Mostrar el hueco es más transparente que esconder
--   la fila — para eso existe `tiene_comprobante`.
--
-- - El saldo no se guarda. Es `monto_recaudado - monto_rendido`, y un tercer
--   contador desnormalizado es un tercer lugar donde desincronizarse.
-- =============================================================================
