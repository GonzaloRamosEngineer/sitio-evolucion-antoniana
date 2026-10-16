-- =====================================================================
-- REVIERTE la reclasificación de aportes (lote '2026-10-cuotas-v2')
--
-- Cada fila vuelve EXACTAMENTE a su estado `antes`, guardado en
-- `aportes_correcciones`. No se borra nada: las correcciones quedan marcadas
-- `revertido_en` y se agrega un renglón 'reversion' por fila.
--
-- ⚠️ Esto revierte los DATOS, no la lógica. Con las funciones de 20261016120000
-- instaladas, las filas restauradas (cuotas_cubiertas = 0) no otorgan acceso.
-- Para volver al comportamiento anterior completo habría que reinstalar además
-- las versiones previas de las funciones (20260902180000, 20260905120000,
-- 20260902160000, 20260830180000).
--
-- Re-correr la aplicación después de revertir vuelve a reclasificar (el índice
-- único solo cuenta correcciones no revertidas).
-- =====================================================================
BEGIN;

LOCK TABLE public.aportes   IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.donations IN SHARE ROW EXCLUSIVE MODE;

SELECT public.revertir_reclasificacion_aportes('2026-10-cuotas-v2') AS filas_revertidas;

COMMIT;
