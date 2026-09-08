-- =============================================================================
-- IMPORTAR MOVIMIENTOS — ROADMAP §14.2, la pieza que decide si esto se usa.
--
-- POR QUÉ AHORA Y NO COMO MEJORA LINDA
--
-- La maquinaria de rendición está desplegada desde el 2026-08-16 y al 2026-09-06
-- tiene **cero gastos cargados**. No falló el código: nadie se sentó a cargar.
-- Y el volumen real recién apareció: la Fundación tiene extractos de MercadoPago
-- **de octubre de 2024 hasta hoy — 23 meses**. Cargar eso a mano, con los
-- impuestos y comisiones incluidos, no va a pasar. Nunca.
--
-- LO QUE FALTABA, Y ES UNA SOLA COSA: `gastos` NO TIENE CLAVE DE IDEMPOTENCIA.
--
-- `aportes.referencia_externa` existe desde §10.11 y es UNIQUE, pero por otro
-- motivo: que un reintento del webhook de MercadoPago no metiera el mismo cobro
-- dos veces. Los gastos nunca la necesitaron porque se cargaban de a uno, a
-- mano, mirando la pantalla.
--
-- Con una importación eso se da vuelta. Reimportar un período que se solapa con
-- otro ya cargado —o simplemente apretar dos veces— **duplica todos los gastos**,
-- y la rendición queda mal para siempre sin que nada avise. Es el mismo peligro
-- que §10.15 documentó para los aportes, en la tabla que quedó sin la red.
--
-- LA FORMA DE LA CLAVE, Y POR QUÉ NO ES SOLO EL ID DE LA OPERACIÓN
--
-- En el extracto de MercadoPago **el impuesto comparte el ID de operación con la
-- transferencia que lo generó**. Del extracto de octubre de 2024:
--
--     10-10-2024  Transferencia enviada Centro Juventud Antoniana  90165423466  -937.776,27
--     10-10-2024  Impuesto por extracción                          90165423466    -5.626,66
--
-- Dos movimientos distintos, un solo id. Con `referencia_externa = id` el
-- segundo se rechazaría como duplicado y **el impuesto no entraría nunca** — un
-- gasto que desaparece en silencio, que es peor que uno duplicado.
--
-- Por eso la clave es `<fuente>:<id>:<monto>`, p. ej. `mp:90165423466:-5626.66`.
-- Determinística (reimportar da la misma clave y el duplicado se rechaza solo) y
-- suficiente para distinguir el impuesto de su transferencia.
--
-- ⚠️ Su límite, declarado: dos movimientos con el mismo id Y el mismo monto se
-- verían como uno. No se encontró un caso así en los extractos y el costo de
-- equivocarse es un gasto no cargado, no uno duplicado — pero conviene saberlo
-- antes de que aparezca.
--
-- Idempotente.
-- =============================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) La clave
--
-- UNIQUE con NULL permitido, igual que en `aportes`: los gastos cargados a mano
-- no vienen de ningún extracto y no tienen referencia. En Postgres los NULL no
-- colisionan entre sí, así que cien gastos manuales conviven sin problema.
-- ---------------------------------------------------------------------
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS referencia_externa text;

DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gastos_referencia_externa_key'
                   AND conrelid = 'public.gastos'::regclass) THEN
    ALTER TABLE public.gastos ADD CONSTRAINT gastos_referencia_externa_key
      UNIQUE (referencia_externa);
  END IF;
END $mig$;

COMMENT ON COLUMN public.gastos.referencia_externa IS
  'Clave de idempotencia de una importacion: <fuente>:<id de operacion>:<monto>. NULL en los gastos cargados a mano. UNIQUE para que reimportar un periodo no duplique nada.';

-- ---------------------------------------------------------------------
-- 2) De dónde salió cada fila
--
-- No es trazabilidad decorativa. Cuando la rendición no cuadre —y en algún
-- momento no va a cuadrar— la primera pregunta es si esa fila la escribió una
-- persona mirando un comprobante o un importador leyendo un extracto. Es la
-- misma razón por la que existen `miembros.alta_origen` (§10.1.a) y
-- `donations.reclamado_en` (§10.19).
-- ---------------------------------------------------------------------
DO $mig$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['aportes','gastos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS carga_origen text', t);

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = t || '_carga_origen_chk'
                      AND conrelid = ('public.' || t)::regclass) THEN
      EXECUTE format($chk$
        ALTER TABLE public.%I ADD CONSTRAINT %I
          CHECK (carga_origen IS NULL OR carga_origen IN ('manual','importacion','webhook'))
      $chk$, t, t || '_carga_origen_chk');
    END IF;

    EXECUTE format($c$
      COMMENT ON COLUMN public.%I.carga_origen IS
        'Como entro la fila: manual (una persona), importacion (un extracto) o webhook. NULL = anterior a esta migracion.'
    $c$, t);
  END LOOP;
END $mig$;

-- ---------------------------------------------------------------------
-- 3) Qué de un lote ya está cargado
--
-- La pregunta que la pantalla de importación tiene que poder hacer ANTES de
-- escribir: de estas 400 referencias, ¿cuáles ya existen?
--
-- POR QUÉ UNA FUNCIÓN Y NO 400 CONSULTAS. Preguntar de a una es 400 viajes y
-- una pantalla que parece colgada. Y sobre todo: **una previsualización que no
-- puede mostrar los duplicados obliga a confiar en que el UNIQUE los rechace**,
-- y ahí el resultado es un import a medias con un error críptico en vez de una
-- lista clara de qué se va a saltear.
--
-- Devuelve solo las que YA están. Lo que no vuelve, entra.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.referencias_ya_cargadas(p_refs text[])
RETURNS TABLE (referencia_externa text, tabla text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.referencia_externa, 'aportes'::text
    FROM public.aportes a
   WHERE a.referencia_externa = ANY(p_refs)
  UNION ALL
  SELECT g.referencia_externa, 'gastos'::text
    FROM public.gastos g
   WHERE g.referencia_externa = ANY(p_refs);
$$;

COMMENT ON FUNCTION public.referencias_ya_cargadas(text[]) IS
  'De un lote de referencias, cuales ya existen en el libro. Para previsualizar una importacion sin escribir nada.';

-- Solo la comisión. Abierta sería un oráculo para preguntar si un id de
-- operación de MercadoPago está en el libro de esta entidad.
REVOKE ALL ON FUNCTION public.referencias_ya_cargadas(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referencias_ya_cargadas(text[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4) Índices
--
-- El lookup del paso 3 va por la clave única, que ya tiene índice. Este es para
-- la otra consulta que la importación hace seguido: "qué se cargó de este
-- extracto", que filtra por prefijo.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gastos_referencia_prefijo
  ON public.gastos (referencia_externa text_pattern_ops)
  WHERE referencia_externa IS NOT NULL;
