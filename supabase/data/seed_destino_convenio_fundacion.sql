-- =============================================================================
-- El fondo del convenio 2024 — dato de ESTE cliente, no esquema.
--
-- NO ES UNA MIGRACIÓN. La capacidad de expresar un fondo restringido es código
-- y vive en `migrations/20260906120000_fondos_restringidos.sql`. Este fondo
-- concreto, con su monto y su historia, es de la Fundación y de nadie más.
--
-- QUÉ ES
--
-- ⚠️ CORREGIDO EL 2026-09-06 CONTRA LOS DOCUMENTOS. La primera versión de este
-- archivo decía que la institución deportiva «dejó $1.000.000» y que la
-- Fundación «recibió un aporte único». **Los documentos dicen otra cosa, y la
-- diferencia importa para la credibilidad de la rendición.**
--
-- Lo que pasó: entre julio de 2021 y septiembre de 2024 la Fundación administró
-- los ingresos del Centro Juventud Antoniana **en sus propias cuentas** —cuotas
-- sociales, polideportivo, indumentaria— según el acuerdo del 7 de febrero de
-- 2024. Al rescindirse el convenio (efectivo el 30/09/2024), el Acta de
-- Finalización del 09/10/2024 dispuso un **resguardo de fondos de $1.000.000**
-- para cerrar la gestión: balances 2024, copias de respaldo, saldar el
-- descubierto de Santander y cualquier otro egreso necesario.
--
-- O sea: **NADIE TRANSFIRIÓ UN MILLÓN.** La plata ya estaba en la cuenta —era
-- mayormente del club— y al liquidar se devolvió el resto y se retuvo el millón.
--
-- Y esto se verifica al peso en el extracto de MercadoPago de octubre de 2024:
--
--     08-10  saldo                                            1.933.533,58
--            ↑ es el monto exacto que el Acta declara disponible
--     10-10  Transferencia enviada Centro Juventud Antoniana    -937.776,27
--     10-10  Impuesto por extracción (misma operación)            -5.626,66
--            → saldo 1.000.000,00 EXACTO
--
-- La transferencia se calculó para que, después del impuesto, quedara el millón
-- redondo. Y el descubierto de Santander que el Acta nombra con centavos
-- ($53.989,20) aparece pagado el 15-10.
--
-- POR QUÉ IMPORTA DECIRLO ASÍ: si la rendición dice «recibimos un aporte de
-- $1.000.000», quien vaya al extracto **no va a encontrar ningún ingreso de
-- $1.000.000** — y se vería mal justo ante quien lo revisa en serio. El término
-- correcto es el que usa el Acta: **resguardo de fondos**.
--
-- Respaldo: Acta de Finalización del Convenio de Cooperación Institucional,
-- firmas certificadas en Foja de Actuación Especial N° E 00405399, Salta,
-- 10/10/2024, Registro Notarial N° 220.
--
-- POR QUÉ VA APARTE Y NO AL DESTINO `institucional`
--
-- El objeto del gasto ES institucional —balances y contadores son estructura—,
-- así que la tentación de mezclarlo es razonable. Lo que decide no es en qué se
-- gasta, sino **si se puede gastar en otra cosa**: la cuota social se aplica a
-- lo que la entidad necesite, y este millón no.
--
-- Mezclados, «Disponible: $192.000» deja de significar algo: nadie puede saber
-- cuánto de eso todavía le debe al propósito del convenio, y la Fundación no
-- puede **demostrar** que respetó la restricción. Separado, la restricción queda
-- verificable — que es justo lo que un convenio firmado ante escribano por dos
-- instituciones necesita poder mostrar.
--
-- LA CONFIGURACIÓN, CAMPO POR CAMPO
--   tipo = campana        -> es finito y termina cuando se agota. No es la
--                            entidad misma ni un sujeto sostenido en el tiempo.
--   estado = activo       -> SIN ESTO NO SE RINDE. La policy
--                            `gastos_public_read_publicados` exige destino
--                            activo; en `cerrado` la rendición desaparece.
--   admite_* = false      -> llegó completo. No recibe aportes nuevos y no tiene
--                            que aparecer en el checkout. Esta combinación es
--                            posible desde 20260906120000.
--   otorga_acceso = false -> ⚠️ el default es `true`. Ese millón NO puede
--                            habilitarle el club de beneficios a nadie: lo
--                            aportó una institución, no una persona.
--   meta_monto = NULL     -> con meta diría «$1.000.000 de $1.000.000», que se
--                            lee como si se hubiera recaudado de donantes. La
--                            historia real la cuentan recaudado/rendido/saldo.
--
-- ⚠️ EL REMANENTE NO ES «DISPONIBLE» Y LA DESCRIPCIÓN LO DICE. Al 2026-09-06
-- quedan **$95.083,30** reservados para el trámite de Personería Jurídica, cuyo costo
-- todavía no se conoce. Publicarlos como disponibles invitaría a leer «tienen
-- plata guardada». La distinción contable entre comprometido y disponible está
-- anotada como pendiente en el ROADMAP; mientras no exista, se dice con palabras.
--
-- ⚠️ ESTA CIFRA DECÍA «~$180.000» Y ERA FALSA, por confundir el saldo de la
-- CUENTA con el saldo del FONDO. Al imputar los 22 resúmenes movimiento por
-- movimiento (2026-09-08) los $189.117,71 que hay en MercadoPago se reparten así:
--
--     fondo del convenio                      95.083,30
--     aportes nuevos (institucional)          95.462,41
--     regularización de fondos de terceros    -1.428,00
--                                            ───────────
--                                            189.117,71  ← el extracto, al peso
--
-- O sea que el fondo tiene **la mitad** de lo que el repo venía diciendo. Es
-- exactamente el error que este destino existe para evitar: mirar el saldo de la
-- cuenta y creer que es el del fondo.
--
-- Idempotente: se puede correr dos veces.
-- =============================================================================

INSERT INTO public.destinos
  (tipo, nombre, slug, descripcion, estado,
   otorga_acceso, admite_puntual, admite_recurrente,
   meta_monto, visibilidad_beneficiario, orden, fecha_inicio)
SELECT
  'campana',
  'Fondo de ordenamiento institucional — convenio 2024',
  'fondo-convenio-2024',
  'Entre 2021 y 2024 la Fundación administró los ingresos del Centro Juventud '
  || 'Antoniana en sus propias cuentas, en el marco de un convenio de cooperación '
  || 'institucional. Al finalizar ese convenio, el acta de cierre —con firmas '
  || 'certificadas ante escribano público— dispuso un resguardo de $1.000.000 para '
  || 'dejar la gestión en orden: los balances 2024, los honorarios profesionales, las '
  || 'copias de respaldo y la cancelación de un descubierto bancario. Este fondo no '
  || 'recibe aportes nuevos y no puede aplicarse a otros fines. El remanente está '
  || 'afectado al trámite de Personería Jurídica, que se encuentra en curso.',
  'activo',
  false,   -- no habilita el club a nadie
  false,   -- cerrado a aportes puntuales
  false,   -- cerrado a aportes recurrentes
  NULL,    -- sin meta: no se recaudó, llegó completo
  'anonimizado',
  5,
  -- ⚠️ LA FECHA DESDE LA QUE SE RINDE, y no es cosmética. El fondo se constituyó
  -- el 10/10/2024, cuando el saldo quedó en el millón exacto. Todo lo anterior en
  -- esa cuenta era administración de plata de un TERCERO y no le corresponde a la
  -- rendición de la Fundación. Sin esta fecha, cualquiera que compare el libro
  -- con el extracto completo va a encontrar movimientos que faltan.
  DATE '2024-10-10'
WHERE NOT EXISTS (SELECT 1 FROM public.destinos WHERE slug = 'fondo-convenio-2024');

-- ---------------------------------------------------------------------
-- Convergencia desde la versión anterior de este archivo
--
-- El `WHERE NOT EXISTS` de arriba no toca una fila que ya existe, así que la
-- descripción incorrecta —la que decía «se recibió un aporte único»— ya está en
-- producción y no se corrige sola. Es exactamente lo que advierte `CLAUDE.md`:
-- «los datos semilla que cambien de valor van con un UPDATE acotado a la firma
-- del valor viejo».
--
-- El filtro busca la frase equivocada: si alguien ya editó la descripción a mano
-- desde el ABM, esto no la pisa.
-- ---------------------------------------------------------------------
UPDATE public.destinos
   SET descripcion =
         'Entre 2021 y 2024 la Fundación administró los ingresos del Centro Juventud '
         || 'Antoniana en sus propias cuentas, en el marco de un convenio de cooperación '
         || 'institucional. Al finalizar ese convenio, el acta de cierre —con firmas '
         || 'certificadas ante escribano público— dispuso un resguardo de $1.000.000 para '
         || 'dejar la gestión en orden: los balances 2024, los honorarios profesionales, las '
         || 'copias de respaldo y la cancelación de un descubierto bancario. Este fondo no '
         || 'recibe aportes nuevos y no puede aplicarse a otros fines. El remanente está '
         || 'afectado al trámite de Personería Jurídica, que se encuentra en curso.',
       fecha_inicio = COALESCE(fecha_inicio, DATE '2024-10-10')
 WHERE slug = 'fondo-convenio-2024'
   AND descripcion LIKE '%se recibió un aporte único%';
