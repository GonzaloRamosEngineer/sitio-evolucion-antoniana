-- =====================================================================
-- PRE CHEQUEO de la reclasificación de aportes (2026-10) — SOLO LECTURA
--
-- Correrlo ANTES de `aplicar_reclasificacion_aportes_2026_10.sql`. Se puede
-- correr incluso antes de las migraciones 20261016120000/120100: en ese caso
-- verifica el estado y avisa que la simulación todavía no está disponible.
--
-- Informa, como NOTICE, cada cambio esperado. FALLA si aparece cualquier
-- aporte, estado o importe fuera de lo verificado en la auditoría.
--
-- No escribe nada: la transacción es READ ONLY y termina en ROLLBACK.
-- =====================================================================
BEGIN TRANSACTION READ ONLY;

-- >>> BLOQUE-VERIFICACION-2026-10
-- ⚠️ Este bloque está COPIADO, idéntico, en el pre chequeo y en el script que
-- aplica. `src/lib/reclasificacion-2026-10.test.js` falla si se separan.
--
-- Qué verifica, contra lo relevado en producción el 2026-10-15/16:
--   1. Los 8 aportes automáticos existen con el mismo origen, importe,
--      referencia de Mercado Pago, titular, vínculo a donación/membresía, y
--      su cobro sigue `approved` con el mismo tipo.
--   2. Cada uno está en su estado PREVIO o ya en el FINAL (re-correr es válido).
--   3. No hay NINGÚN otro aporte automático.
--   4. Los manuales son exactamente 135 por $1.238.997,77, sin titular, sin
--      vínculo, sin período, sin cuotas y sin clasificar.
--   5. `donations` tiene exactamente esas 8 filas, todas approved.
--   6. Si la reclasificación ya está instalada, la SIMULACIÓN propone
--      exactamente el estado final esperado, fila por fila.
-- Cualquier diferencia ABORTA con la lista de motivos.
DO $verif$
DECLARE
  esperado jsonb := $json$[
    {"id":"041cb69e-0930-4cc3-91f4-35be232a371f","origen":"donacion","monto":75,"ref":"130390758084","donation_id":"a6844bb5-e7bb-4e28-bee8-6ee8796d88fd","membership_id":null,"user_id":null,"tipo":"única","antes":[null,null],"concepto":"donacion_extraordinaria","cuotas":0,"despues":[null,null]},
    {"id":"459310e8-f07e-4c42-ac93-b5567b3d8d21","origen":"donacion","monto":1916,"ref":"130390961370","donation_id":"5de9f6f1-675b-49f1-972f-f39d2b99534a","membership_id":null,"user_id":"20fa6658-37fd-49de-877d-84cb93d6483f","tipo":"única","antes":[null,null],"concepto":"donacion_extraordinaria","cuotas":0,"despues":[null,null]},
    {"id":"e8b98821-3785-4280-a402-08ecb8c19095","origen":"donacion","monto":5000,"ref":"133434832051","donation_id":"6da6f87c-8c93-4e7b-ae9c-90d763a8d1b7","membership_id":null,"user_id":null,"tipo":"única","antes":[null,null],"concepto":"donacion_extraordinaria","cuotas":0,"despues":[null,null]},
    {"id":"1c4d57c0-8376-40b4-9c9b-e2d0c61de267","origen":"donacion","monto":150,"ref":"141942388060","donation_id":"5ba013d6-7fda-43de-9737-cbd6b6f6cdfc","membership_id":null,"user_id":null,"tipo":"única","antes":[null,null],"concepto":"donacion_extraordinaria","cuotas":0,"despues":[null,null]},
    {"id":"bde58fb8-5145-4d8b-a669-eb31cd4834e8","origen":"donacion","monto":100,"ref":"174204153506","donation_id":"ddf70dc1-713e-49d0-b5d3-0695c52edab2","membership_id":null,"user_id":null,"tipo":"única","antes":[null,null],"concepto":"donacion_extraordinaria","cuotas":0,"despues":[null,null]},
    {"id":"394db8cc-25af-48dd-a12e-849833b1207e","origen":"membresia","monto":5000,"ref":"175967372005","donation_id":"53523291-4fdc-4c34-b15c-5c8aa2171686","membership_id":"d51fc640-317c-429f-8b9b-04a4cf10031a","user_id":"c3becdd9-5974-4735-8270-134cdbcd9d48","tipo":"suscripción","antes":["2026-09-02","2026-10-02"],"concepto":"cuota_mensual","cuotas":1,"despues":["2026-09-02","2026-10-01"]},
    {"id":"f1be2fa3-a67d-40a0-ba62-7f143b92e4bd","origen":"donacion","monto":20000,"ref":"181921612108","donation_id":"726686ca-1635-4d39-8c89-cd7576f06985","membership_id":null,"user_id":"c3becdd9-5974-4735-8270-134cdbcd9d48","tipo":"única","antes":["2026-10-03","2027-02-03"],"concepto":"donacion_extraordinaria","cuotas":0,"despues":[null,null]},
    {"id":"fc38049b-d97a-4db4-82cb-d746a84f7c1a","origen":"membresia","monto":5000,"ref":"181067329409","donation_id":"0ad914ed-a166-435b-ac8e-027c9673f9bc","membership_id":"d51fc640-317c-429f-8b9b-04a4cf10031a","user_id":"c3becdd9-5974-4735-8270-134cdbcd9d48","tipo":"suscripción","antes":["2027-02-04","2027-02-04"],"concepto":"cuota_mensual","cuotas":1,"despues":["2026-10-02","2026-11-01"]}
  ]$json$;
  e        jsonb;
  a        jsonb;
  fallas   text[] := '{}';
  v_n      integer;
  v_suma   numeric;
  v_prev   boolean;
  v_final  boolean;
  sim      record;
BEGIN
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
  IF v_n <> 135 OR v_suma <> 1238997.77 THEN
    fallas := fallas || format('manuales: se esperaban 135 por 1238997.77 y hay %s por %s', v_n, v_suma);
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
  IF v_n <> 8 THEN
    fallas := fallas || format('donations: se esperaban 8 filas y hay %s', v_n);
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
  RAISE NOTICE 'PRE CHEQUEO OK: 8 aportes automáticos y 8 cobros verificados; 135 manuales sin clasificar y sin efecto de cuota.';
END $verif$;
-- <<< BLOQUE-VERIFICACION-2026-10

ROLLBACK;
