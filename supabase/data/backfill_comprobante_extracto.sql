-- =============================================================================
-- Declarar el extracto como respaldo de los gastos ya importados.
--
-- NO ES UNA MIGRACIÓN: es una corrección puntual de datos. El comportamiento
-- nuevo vive en `src/api/importarApi.js`, que desde el 2026-09-08 declara
-- `tipo_comprobante = 'extracto'` al importar. Este archivo alcanza a las filas
-- que entraron ANTES de ese cambio.
--
-- QUÉ PROBLEMA RESUELVE
--
-- Los 25 gastos del fondo del convenio salieron a la rendición pública diciendo
-- **«Sin comprobante»** cuando el sistema tenía guardado, desde el momento de
-- importarlos, el id exacto de la operación bancaria en `referencia_externa`:
--
--     mp:90165423466:-5626.66
--        └──────────┘
--        el id de operación de MercadoPago
--
-- O sea que era un hueco de **presentación**, no de documentación. Lo notó el
-- dueño: «¿para qué queremos subir el comprobante, si tenemos la propia
-- transacción?».
--
-- POR QUÉ `extracto` Y NO `transferencia`
--
-- No todos los movimientos importados son transferencias: hay impuestos, débitos
-- por deuda y liquidaciones. Lo que respalda a todos por igual es el resumen de
-- cuenta, y `extracto` ya existía en `TIPOS_COMPROBANTE` con ese label exacto
-- («Extracto de cuenta»). Declarar «transferencia» en un impuesto sería preciso
-- en la forma y falso en el contenido.
--
-- ⚠️ ESTO NO REEMPLAZA A LA FACTURA, Y LA DISTINCIÓN NO ES BUROCRÁTICA.
--
-- El id de operación prueba **que la plata se movió y a quién**. La factura o el
-- recibo del profesional prueban **qué se facturó y por qué**. Son dos
-- afirmaciones distintas, y una rendición de cuentas necesita las dos: con sólo
-- la primera se puede demostrar el pago y no su legitimidad.
--
-- Por eso esto NO toca `comprobante_path`: el archivo sigue faltando y
-- `tiene_comprobante` sigue en false. La pantalla ahora distingue tres estados
-- —con archivo / declarado sin archivo / nada— en vez de dos, así que la
-- diferencia queda visible en lugar de disimulada.
--
-- ALCANCE, acotado a propósito:
--   · sólo `carga_origen = 'importacion'` (lo que cargó el importador)
--   · sólo `tipo_comprobante IS NULL` (no pisa nada declarado a mano)
--   · sólo referencias con la forma `mp:<id>:<monto>`
--
-- Idempotente: se puede correr dos veces. La segunda no encuentra nada.
-- =============================================================================

UPDATE public.gastos
   SET tipo_comprobante   = 'extracto',
       comprobante_numero = split_part(referencia_externa, ':', 2),
       updated_at         = now()
 WHERE carga_origen = 'importacion'
   AND tipo_comprobante IS NULL
   AND referencia_externa LIKE 'mp:%:%'
   AND split_part(referencia_externa, ':', 2) <> '';

-- Los aportes importados tienen el mismo respaldo y el mismo hueco. `aportes` no
-- tiene columnas de comprobante propias hasta `20260906120000`, que se las
-- agregó justamente para esto.
UPDATE public.aportes
   SET tipo_comprobante   = 'extracto',
       comprobante_numero = split_part(referencia_externa, ':', 2)
 WHERE carga_origen = 'importacion'
   AND tipo_comprobante IS NULL
   AND referencia_externa LIKE 'mp:%:%'
   AND split_part(referencia_externa, ':', 2) <> '';

-- Control: cuántos quedaron declarados y cuántos siguen sin nada.
SELECT 'gastos' AS tabla,
       count(*) FILTER (WHERE tipo_comprobante IS NOT NULL) AS declarados,
       count(*) FILTER (WHERE tipo_comprobante IS NULL)     AS sin_declarar,
       count(*) FILTER (WHERE comprobante_path IS NOT NULL) AS con_archivo
  FROM public.gastos
UNION ALL
SELECT 'aportes',
       count(*) FILTER (WHERE tipo_comprobante IS NOT NULL),
       count(*) FILTER (WHERE tipo_comprobante IS NULL),
       count(*) FILTER (WHERE comprobante_path IS NOT NULL)
  FROM public.aportes;
