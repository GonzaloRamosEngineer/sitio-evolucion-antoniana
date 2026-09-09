-- =============================================================================
-- Regularización de fondos de terceros — dato de ESTE cliente, no esquema.
--
-- NO ES UNA MIGRACIÓN. La capacidad de expresar un destino cerrado a aportes y
-- rendible igual es código, y vive en
-- `migrations/20260906120000_fondos_restringidos.sql`. Este caso concreto es de
-- la Fundación.
--
-- QUÉ ES, Y POR QUÉ NECESITA UN DESTINO PROPIO
--
-- Ocho transferencias de una misma persona entraron por error a la cuenta de
-- MercadoPago de la Fundación entre el 25/11/2025 y el 14/05/2026: eran cuotas
-- sociales del Centro Juventud Antoniana. La Fundación las detectó en un control
-- interno de movimientos —el pedido original mencionaba tres; el control
-- encontró ocho—, consultó al club por escrito, el club confirmó que la persona
-- era socia, y la Fundación transfirió el total a la cuenta del club el
-- 15/05/2026 dejando constancia del motivo.
--
-- ⚠️ ESO NO ES NI UN INGRESO NI UN GASTO DE LA FUNDACIÓN. Es **dinero de un
-- tercero en tránsito**: entró, no le pertenecía, y salió. Si las ocho entradas
-- se cargan como aportes y la salida como gasto de cualquier otro destino, la
-- rendición muestra $118.286 que la Fundación nunca recaudó y $119.714 que nunca
-- gastó — las dos puntas infladas, y el porcentaje rendido distorsionado.
--
-- Y ESCONDERLO TAMPOCO SIRVE: quien cruce la rendición con el extracto va a ver
-- salir $119.714 sin ninguna explicación, que es peor que verlo explicado. Por
-- eso va a un destino propio: el movimiento queda **rendido y contado aparte**,
-- que es exactamente lo que la maquinaria de fondos restringidos sabe hacer.
--
-- LOS NÚMEROS, Y POR QUÉ NO NETEAN A CERO
--
--   entradas (8, netas de comisión)     +118.286,00
--   salida al club (15/05/2026)         -119.714,00
--                                       ────────────
--   efecto en la cuenta                   -1.428,00
--
-- El detalle: el control identificó **$119.000 brutos**; MercadoPago retuvo $714
-- de comisión, así que acreditó $118.286. Y la Fundación transfirió $119.714, o
-- sea $714 por encima del bruto. Entre las dos puntas, **devolver plata que no
-- era suya le costó $1.428 de fondos propios.**
--
-- Esa diferencia es el dato más honesto de este destino y por eso está en la
-- descripción pública: es chica, es verificable contra el extracto, y explicarla
-- vale más que redondearla.
--
-- LA CONFIGURACIÓN, CAMPO POR CAMPO
--   tipo = campana        -> es finito: se abre por un hecho y se cierra cuando
--                            se devolvió. No es la entidad ni un sujeto sostenido.
--   estado = activo       -> SIN ESTO NO SE RINDE: la policy
--                            `gastos_public_read_publicados` exige destino activo.
--   admite_* = false      -> ⚠️ nadie puede «aportar» a esto desde el sitio. Lo
--                            que entra acá entra por error, no por voluntad, y
--                            ofrecerlo en el checkout sería absurdo.
--   otorga_acceso = false -> ⚠️ el default es `true`. Plata que entró por error
--                            NO puede habilitarle el club de beneficios a nadie
--                            — y menos a quien la mandó por equivocación.
--   meta_monto = NULL     -> no hay nada que recaudar.
--   fecha_inicio          -> el 25/11/2025, la primera de las ocho. Antes de esa
--                            fecha este destino no existía y no le corresponde
--                            ningún movimiento.
--
-- Respaldo documental: intercambio de correos del 15/05/2026 entre la Fundación
-- y Comunicaciones del Centro Juventud Antoniana, con la confirmación del club
-- de que la remitente es socia, y el comprobante de la transferencia. Se adjunta
-- al gasto desde `/admin → Gastos y rendición → Adjuntar comprobante`.
--
-- ⚠️ EL NOMBRE DE LA REMITENTE NO VA EN NINGÚN CAMPO PÚBLICO. Es una persona
-- física ajena a la Fundación que cometió un error de tipeo; publicarlo sería
-- exponerla sin ninguna necesidad. La regla del proyecto ya lo cubre —«lo que no
-- pueda ser público no se escribe en un gasto»— y acá se aplica con más razón.
-- El vínculo con las ocho operaciones queda por `referencia_externa`, que apunta
-- a la línea exacta del extracto.
--
-- Idempotente: se puede correr dos veces.
-- =============================================================================

INSERT INTO public.destinos
  (tipo, nombre, slug, descripcion, estado,
   otorga_acceso, admite_puntual, admite_recurrente,
   meta_monto, visibilidad_beneficiario, orden, fecha_inicio)
SELECT
  'campana',
  'Regularización de fondos de terceros',
  'fondos-terceros-regularizacion',
  'Entre noviembre de 2025 y mayo de 2026, ocho transferencias entraron por error '
  || 'a la cuenta de la Fundación: correspondían a cuotas sociales de otra '
  || 'institución. Se detectaron en un control interno de movimientos, se consultó '
  || 'por escrito a la institución destinataria, y una vez confirmado el vínculo de '
  || 'la persona con esa entidad se transfirió el total a su cuenta el 15 de mayo de '
  || '2026, dejando constancia del motivo. Este destino existe para que ese dinero '
  || 'quede contado aparte y no se confunda con los aportes recibidos por la '
  || 'Fundación: no era suyo y no lo usó. La diferencia entre lo que ingresó neto de '
  || 'comisiones ($118.286) y lo que se transfirió ($119.714) la absorbió la '
  || 'Fundación con fondos propios.',
  'activo',
  false,   -- plata que entró por error no habilita beneficios a nadie
  false,   -- nadie puede aportar acá desde el sitio
  false,   -- ni de forma recurrente
  NULL,    -- no hay nada que recaudar
  'anonimizado',
  6,
  DATE '2025-11-25'
WHERE NOT EXISTS (
  SELECT 1 FROM public.destinos WHERE slug = 'fondos-terceros-regularizacion'
);
