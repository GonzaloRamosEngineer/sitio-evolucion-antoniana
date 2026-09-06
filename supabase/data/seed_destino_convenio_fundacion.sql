-- =============================================================================
-- El fondo del convenio 2024 — dato de ESTE cliente, no esquema.
--
-- NO ES UNA MIGRACIÓN. La capacidad de expresar un fondo restringido es código
-- y vive en `migrations/20260906120000_fondos_restringidos.sql`. Este fondo
-- concreto, con su monto y su historia, es de la Fundación y de nadie más.
--
-- QUÉ ES
-- Entre 2022 y 2024 la Fundación destinó prácticamente toda su energía a
-- colaborar con una institución deportiva. Al cerrarse el convenio de
-- cooperación, esa institución dejó $1.000.000 con un destino estipulado:
-- dejar cubierto el ordenamiento contable y legal —balances, honorarios de
-- contadores y certificación del colegio profesional—. El acuerdo está
-- respaldado por documentación certificada ante escribano, con firmas de
-- autoridades de las dos instituciones.
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
-- quedan ~$180.000 reservados para el trámite de Personería Jurídica, cuyo costo
-- todavía no se conoce. Publicarlos como disponibles invitaría a leer «tienen
-- plata guardada». La distinción contable entre comprometido y disponible está
-- anotada como pendiente en el ROADMAP; mientras no exista, se dice con palabras.
--
-- Idempotente: se puede correr dos veces.
-- =============================================================================

INSERT INTO public.destinos
  (tipo, nombre, slug, descripcion, estado,
   otorga_acceso, admite_puntual, admite_recurrente,
   meta_monto, visibilidad_beneficiario, orden)
SELECT
  'campana',
  'Fondo de ordenamiento institucional — convenio 2024',
  'fondo-convenio-2024',
  'Al cerrarse el convenio de cooperación con la institución deportiva con la que '
  || 'trabajamos entre 2022 y 2024, se recibió un aporte único destinado exclusivamente '
  || 'a dejar cubierto el ordenamiento contable y legal de la Fundación: balances, '
  || 'honorarios profesionales y certificación del colegio de contadores. El acuerdo '
  || 'está respaldado por documentación certificada ante escribano con firmas de '
  || 'autoridades de ambas instituciones. Este fondo no recibe aportes nuevos y no '
  || 'puede aplicarse a otros fines. El remanente está afectado al trámite de '
  || 'Personería Jurídica, que se encuentra en curso.',
  'activo',
  false,   -- no habilita el club a nadie
  false,   -- cerrado a aportes puntuales
  false,   -- cerrado a aportes recurrentes
  NULL,    -- sin meta: no se recaudó, llegó completo
  'anonimizado',
  5
WHERE NOT EXISTS (SELECT 1 FROM public.destinos WHERE slug = 'fondo-convenio-2024');
