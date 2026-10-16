-- =====================================================================
-- APLICA la reclasificación de aportes (2026-10)
--
-- Requiere las migraciones 20261016120000 y 20261016120100. Todo en UNA
-- transacción: si cualquier verificación falla, no queda nada aplicado.
--
--   1. Bloquea `aportes` y `donations` (un aviso de Mercado Pago espera).
--   2. Repite el PRE CHEQUEO completo (mismo bloque, copiado).
--   3. Aplica: cada fila cambiada deja ANTES/DESPUÉS en `aportes_correcciones`
--      con el lote '2026-10-cuotas-v2'.
--   4. Verifica: una segunda simulación no propone nada, y el resultado de la
--      cuenta auditada es el esperado.
--   5. VALIDA el CHECK `aportes_acceso_solo_cuotas_chk`.
--
-- Idempotente: re-correrlo no cambia nada. Para deshacer:
-- `revertir_reclasificacion_aportes_2026_10.sql`.
-- =====================================================================
BEGIN;

-- Mismo orden en que escribe el webhook (donations → memberships → aportes, por
-- el trigger): tomarlos al revés puede trabar en deadlock un cobro que llega
-- justo ahora, y que Postgres aborte el INSERT del cobro.
SET LOCAL lock_timeout = '15s';
LOCK TABLE public.donations, public.memberships, public.aportes IN SHARE ROW EXCLUSIVE MODE;

-- >>> CUERPO-RECLASIFICACION-2026-10
-- (lo que `tools/cuotas-2026-10.sh` toma tal cual para la aplicación atómica)
SET client_min_messages = notice;
-- >>> BLOQUE-VERIFICACION-2026-10
-- ⚠️ Este bloque está COPIADO, idéntico, en el pre chequeo y en el script que
-- aplica. `src/lib/reclasificacion-2026-10.test.js` falla si se separan.
--
-- LO VERIFICADO NO ESTÁ EN ESTE ARCHIVO: el repo es público y son ids de
-- personas y de pagos. Vive fuera del repo y se antepone por la entrada:
--   cat "$D/reclasificacion-2026-10-verificado.psql" <este script> | bash tools/db.sh sql
-- Sin él, el pre chequeo FALLA (no hay contra qué comparar).
--
-- Qué verifica, contra lo relevado en producción el 2026-10-15/16:
--   1. Los aportes automáticos verificados existen con el mismo origen, importe,
--      referencia de Mercado Pago, titular, vínculo a donación/membresía, y
--      su cobro sigue `approved` con el mismo tipo.
--   2. Cada uno está en su estado PREVIO o ya en el FINAL (re-correr es válido).
--   3. No hay NINGÚN otro aporte automático.
--   4. Los manuales son exactamente los verificados (cantidad y suma), sin
--      titular, sin vínculo, sin período, sin cuotas y sin clasificar.
--   5. `donations` tiene exactamente las filas verificadas, todas approved.
--   6. Si la reclasificación ya está instalada, la SIMULACIÓN propone
--      exactamente el estado final esperado, fila por fila.
-- Cualquier diferencia ABORTA con la lista de motivos.
\if :{?verificado}
-- Solo informa SI se cargó: imprimir el valor mostraría ids de personas.
SELECT set_config('reclasif.verificado', :'verificado', false) <> '' AS verificado_cargado;
\else
SELECT set_config('reclasif.verificado', '', false) <> '' AS verificado_cargado;
\endif
DO $verif$
DECLARE
  verificado jsonb := NULLIF(current_setting('reclasif.verificado', true), '')::jsonb;
  esperado jsonb;
  e        jsonb;
  a        jsonb;
  fallas   text[] := '{}';
  v_n      integer;
  v_suma   numeric;
  v_prev   boolean;
  v_final  boolean;
  sim      record;
BEGIN
  IF verificado IS NULL THEN
    RAISE EXCEPTION E'PRE CHEQUEO FALLÓ: falta lo verificado. Anteponer el archivo de fuera del repo:\n  cat "$D/reclasificacion-2026-10-verificado.psql" <script> | bash tools/db.sh sql';
  END IF;
  esperado := verificado->'aportes';
  -- 1 y 2
  FOR e IN SELECT * FROM jsonb_array_elements(esperado) LOOP
    SELECT to_jsonb(x) || jsonb_build_object('d_status', d.status, 'd_tipo', d.donation_type)
      INTO a
      FROM public.aportes x LEFT JOIN public.donations d ON d.id = x.donation_id
     WHERE x.id = (e->>'id')::uuid;

    IF a IS NULL THEN
      fallas := fallas || format('falta el aporte %s', e->>'id');
      CONTINUE;
    END IF;

    IF a->>'origen' <> e->>'origen'
       OR (a->>'monto')::numeric <> (e->>'monto')::numeric
       OR a->>'referencia_externa' IS DISTINCT FROM e->>'ref'
       OR a->>'donation_id' IS DISTINCT FROM e->>'donation_id'
       OR a->>'membership_id' IS DISTINCT FROM e->>'membership_id'
       OR a->>'user_id' IS DISTINCT FROM e->>'user_id'
       OR a->>'d_status' IS DISTINCT FROM 'approved'
       OR a->>'d_tipo' IS DISTINCT FROM e->>'tipo' THEN
      fallas := fallas || format('el aporte %s no coincide con lo verificado (origen/importe/referencia/titular/vinculo/estado del cobro): %s',
                                 e->>'id', a - 'notas');
      CONTINUE;
    END IF;

    v_prev := a->>'acceso_desde' IS NOT DISTINCT FROM e->'antes'->>0
          AND a->>'acceso_hasta' IS NOT DISTINCT FROM e->'antes'->>1
          AND a->>'concepto' IS NULL
          AND COALESCE((a->>'cuotas_cubiertas')::int, 0) = 0
          AND a->>'anulado_en' IS NULL;
    v_final := a->>'acceso_desde' IS NOT DISTINCT FROM e->'despues'->>0
          AND a->>'acceso_hasta' IS NOT DISTINCT FROM e->'despues'->>1
          AND a->>'concepto' IS NOT DISTINCT FROM e->>'concepto'
          AND (a->>'cuotas_cubiertas')::int IS NOT DISTINCT FROM (e->>'cuotas')::int
          AND a->>'anulado_en' IS NULL;
    IF NOT (v_prev OR v_final) THEN
      fallas := fallas || format('el aporte %s no está ni en el estado previo ni en el final: desde=%s hasta=%s concepto=%s cuotas=%s anulado=%s',
        e->>'id', a->>'acceso_desde', a->>'acceso_hasta', a->>'concepto', a->>'cuotas_cubiertas', a->>'anulado_en');
    END IF;
  END LOOP;

  -- 3
  FOR a IN
    SELECT jsonb_build_object('id', x.id, 'origen', x.origen, 'monto', x.monto, 'ref', x.referencia_externa)
      FROM public.aportes x
     WHERE x.origen <> 'manual'
       AND x.id NOT IN (SELECT (j->>'id')::uuid FROM jsonb_array_elements(esperado) j)
  LOOP
    fallas := fallas || format('aporte automático NO verificado: %s', a);
  END LOOP;

  -- 4
  SELECT count(*), COALESCE(sum(monto), 0) INTO v_n, v_suma FROM public.aportes WHERE origen = 'manual';
  IF v_n <> (verificado->'manuales'->>'cantidad')::int OR v_suma <> (verificado->'manuales'->>'suma')::numeric THEN
    fallas := fallas || format('manuales: se esperaban %s por %s y hay %s por %s',
                               verificado->'manuales'->>'cantidad', verificado->'manuales'->>'suma', v_n, v_suma);
  END IF;
  SELECT count(*) INTO v_n FROM public.aportes x
   WHERE x.origen = 'manual'
     AND (x.user_id IS NOT NULL OR x.donation_id IS NOT NULL OR x.membership_id IS NOT NULL
          OR x.acceso_desde IS NOT NULL OR x.acceso_hasta IS NOT NULL
          OR to_jsonb(x)->>'concepto' IS NOT NULL
          OR COALESCE((to_jsonb(x)->>'cuotas_cubiertas')::int, 0) <> 0);
  IF v_n > 0 THEN
    fallas := fallas || format('%s aportes manuales tienen titular, vínculo, período, cuotas o concepto', v_n);
  END IF;

  -- 5
  SELECT count(*) INTO v_n FROM public.donations;
  IF v_n <> (verificado->>'donaciones')::int THEN
    fallas := fallas || format('donations: se esperaban %s filas y hay %s', verificado->>'donaciones', v_n);
  END IF;
  SELECT count(*) INTO v_n FROM public.donations
   WHERE status IS DISTINCT FROM 'approved'
      OR id NOT IN (SELECT (j->>'donation_id')::uuid FROM jsonb_array_elements(esperado) j);
  IF v_n > 0 THEN
    fallas := fallas || format('donations: %s filas fuera de lo verificado o no aprobadas', v_n);
  END IF;

  -- 6
  IF to_regprocedure('public.reclasificar_aportes_v2(boolean,text)') IS NULL THEN
    RAISE NOTICE 'La reclasificación todavía no está instalada (faltan las migraciones 20261016120000/120100): solo se verificó el estado actual.';
  ELSE
    FOR sim IN SELECT * FROM public.reclasificar_aportes_v2(false) LOOP
      SELECT j INTO e FROM jsonb_array_elements(esperado) j WHERE (j->>'id')::uuid = sim.aporte_id;
      IF e IS NULL THEN
        fallas := fallas || format('la simulación propone cambiar un aporte no verificado: %s', sim.aporte_id);
      ELSIF sim.despues->>'concepto' IS DISTINCT FROM e->>'concepto'
         OR (sim.despues->>'cuotas_cubiertas')::int IS DISTINCT FROM (e->>'cuotas')::int
         OR sim.despues->>'acceso_desde' IS DISTINCT FROM e->'despues'->>0
         OR sim.despues->>'acceso_hasta' IS DISTINCT FROM e->'despues'->>1
         OR sim.despues->>'anulado_en' IS NOT NULL THEN
        fallas := fallas || format('la simulación propone para %s algo distinto de lo esperado: %s', sim.aporte_id, sim.despues);
      ELSE
        RAISE NOTICE 'CAMBIO ESPERADO % : concepto % -> %, cuotas % -> %, periodo [%..%] -> [%..%]',
          sim.aporte_id,
          COALESCE(sim.antes->>'concepto', 'sin clasificar'), sim.despues->>'concepto',
          sim.antes->>'cuotas_cubiertas', sim.despues->>'cuotas_cubiertas',
          COALESCE(sim.antes->>'acceso_desde', '-'), COALESCE(sim.antes->>'acceso_hasta', '-'),
          COALESCE(sim.despues->>'acceso_desde', '-'), COALESCE(sim.despues->>'acceso_hasta', '-');
      END IF;
    END LOOP;
  END IF;

  IF array_length(fallas, 1) > 0 THEN
    RAISE EXCEPTION E'PRE CHEQUEO FALLÓ (% motivo/s):\n- %', array_length(fallas, 1), array_to_string(fallas, E'\n- ');
  END IF;
  RAISE NOTICE 'PRE CHEQUEO OK: % aportes automáticos y % cobros verificados; % manuales sin clasificar y sin efecto de cuota.',
    jsonb_array_length(esperado), verificado->>'donaciones', verificado->'manuales'->>'cantidad';
END $verif$;
-- <<< BLOQUE-VERIFICACION-2026-10

SELECT aporte_id, accion, antes->>'concepto' AS concepto_antes, despues->>'concepto' AS concepto_despues,
       antes->>'acceso_desde' AS desde_antes, antes->>'acceso_hasta' AS hasta_antes,
       despues->>'acceso_desde' AS desde_despues, despues->>'acceso_hasta' AS hasta_despues
  FROM public.reclasificar_aportes_v2(true, '2026-10-cuotas-v2');

DO $post$
DECLARE
  v_n integer;
  v   record;
  c   jsonb;
BEGIN
  SELECT count(*) INTO v_n FROM public.reclasificar_aportes_v2(false, '2026-10-cuotas-v2');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'POST CHEQUEO: la simulación todavía propone % cambio/s', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.aportes
   WHERE origen = 'manual' AND (concepto IS NOT NULL OR cuotas_cubiertas <> 0 OR acceso_desde IS NOT NULL);
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'POST CHEQUEO: % aportes manuales quedaron con efecto de cuota', v_n;
  END IF;

  -- La cuenta de control también sale de lo verificado (fuera del repo).
  c := NULLIF(current_setting('reclasif.verificado', true), '')::jsonb -> 'cuenta_control';
  SELECT * INTO v FROM public.elegibilidad_club((c->>'user_id')::uuid);
  IF v.meses_aportados <> (c->>'cuotas')::int OR v.aporte_acumulado <> (c->>'acumulado')::numeric THEN
    RAISE EXCEPTION 'POST CHEQUEO: la cuenta de control quedó con % cuotas y % acumulados (se esperaban % y %)',
      v.meses_aportados, v.aporte_acumulado, c->>'cuotas', c->>'acumulado';
  END IF;
  RAISE NOTICE 'POST CHEQUEO OK: cuenta de control con % cuotas efectivas y $% acumulados; acceso=% (depende de la fecha de hoy)',
    v.meses_aportados, v.aporte_acumulado, v.tiene_acceso;
END $post$;

ALTER TABLE public.aportes VALIDATE CONSTRAINT aportes_acceso_solo_cuotas_chk;
-- <<< CUERPO-RECLASIFICACION-2026-10

COMMIT;
