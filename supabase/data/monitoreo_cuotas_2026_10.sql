-- =====================================================================
-- Monitoreo de la regla 2026-10 (cuotas, donaciones, reintegros) — SOLO LECTURA
--
-- Uso:  bash tools/db.sh sql < supabase/data/monitoreo_cuotas_2026_10.sql
--
-- Qué tiene que dar, siempre:
--   * aprobadas_sin_aporte = 0           (ningún cobro perdido del libro)
--   * periodos_de_un_dia = 0             (el defecto que motivó todo)
--   * donaciones_con_periodo = 0         (una donación no compra meses)
--   * manuales_con_efecto = 0            (los manuales siguen sin clasificar)
--   * cuotas_sin_periodo_con_titular = 0 (una cuota con dueño siempre tiene su mes)
-- Y en el próximo cobro real (renovación ≈ 2/11): una fila nueva arriba de la
-- lista con concepto cuota_mensual, 1 cuota y un período de ~30 días.
-- No imprime datos de personas.
-- =====================================================================
BEGIN TRANSACTION READ ONLY;
\pset footer off

SELECT now() AS consultado_en;

SELECT
  (SELECT count(*) FROM public.donations d
    WHERE d.status = 'approved' AND COALESCE(d.amount, 0) > 0
      AND NOT EXISTS (SELECT 1 FROM public.aportes a WHERE a.donation_id = d.id))      AS aprobadas_sin_aporte,
  (SELECT count(*) FROM public.aportes
    WHERE cuotas_cubiertas > 0 AND acceso_hasta - acceso_desde < 27)                    AS periodos_de_un_dia,
  (SELECT count(*) FROM public.aportes
    WHERE concepto = 'donacion_extraordinaria' AND acceso_desde IS NOT NULL)            AS donaciones_con_periodo,
  (SELECT count(*) FROM public.aportes
    WHERE origen = 'manual' AND concepto IS NULL
      AND (cuotas_cubiertas <> 0 OR acceso_desde IS NOT NULL))                          AS manuales_con_efecto,
  (SELECT count(*) FROM public.aportes
    WHERE cuotas_cubiertas > 0 AND user_id IS NOT NULL AND anulado_en IS NULL
      AND acceso_desde IS NULL)                                                         AS cuotas_sin_periodo_con_titular;

SELECT origen, COALESCE(concepto, 'sin clasificar') AS concepto, count(*) AS filas,
       sum(cuotas_cubiertas) AS cuotas, count(*) FILTER (WHERE anulado_en IS NOT NULL) AS anuladas,
       sum(monto_reintegrado) AS reintegrado
  FROM public.aportes GROUP BY 1, 2 ORDER BY 1, 2;

-- Los últimos 10 aportes automáticos: qué concepto, cuántas cuotas y cuánto dura el período.
SELECT a.created_at AS registrado, a.origen, a.concepto, a.cuotas_cubiertas AS cuotas, a.monto,
       a.acceso_desde, a.acceso_hasta,
       CASE WHEN a.acceso_desde IS NOT NULL THEN a.acceso_hasta - a.acceso_desde + 1 END AS dias,
       (a.anulado_en IS NOT NULL) AS anulado, (a.user_id IS NOT NULL) AS con_titular
  FROM public.aportes a
 WHERE a.origen <> 'manual'
 ORDER BY a.created_at DESC
 LIMIT 10;

-- Reintegros, anulaciones y reactivaciones automáticas de Mercado Pago.
SELECT accion, count(*) AS veces, max(created_at) AS ultima
  FROM public.aportes_correcciones GROUP BY 1 ORDER BY 1;

ROLLBACK;
