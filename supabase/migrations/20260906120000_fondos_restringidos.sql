-- =============================================================================
-- FONDOS RESTRINGIDOS — la otra mitad del modelo de ingresos.
--
-- QUÉ APARECIÓ, Y POR QUÉ NO ES UN CASO RARO DE ESTE CLIENTE
--
-- Hasta hoy `destinos` sabía expresar plata que se **junta**: una campaña con
-- meta, un padrinable con cupos, la cuota social que entra todos los meses. Todo
-- abierto a recibir.
--
-- Lo que no sabía expresar es plata que **llega completa y atada a un fin**. La
-- Fundación tiene el caso: al cerrarse un convenio de cooperación en 2024, la
-- institución con la que trabajaba dejó $1.000.000 destinado exclusivamente a
-- dejar cubierto el ordenamiento contable y legal —balances, honorarios de
-- contadores, certificación del colegio profesional—. Ese dinero **no se puede
-- aplicar a otra cosa**, no admite aportes nuevos, y sin embargo tiene que
-- rendirse públicamente como cualquier otro peso.
--
-- ⚠️ **Y NO ES UNA PARTICULARIDAD: es una de las dos grandes categorías de
-- ingreso de cualquier entidad sin fines de lucro.** Plata de libre
-- disponibilidad (la cuota social) contra plata con destino específico
-- —subsidio estatal, convenio, donación con cargo, legado, beca financiada por
-- una empresa—. En contabilidad de organizaciones sociales esa separación es un
-- concepto central. El modelo expresaba bien una sola de las dos.
--
-- POR QUÉ IMPORTA SEPARARLAS, Y NO ES PRESENTACIÓN. Si el fondo restringido y
-- la cuota social comparten destino, «Disponible: $192.000» deja de significar
-- algo: nadie puede saber cuánto de eso todavía le debe al propósito del
-- convenio, y la entidad no puede **demostrar** que respetó la restricción.
-- Separados, la restricción queda verificable — que es justamente lo que un
-- convenio firmado ante escribano por dos instituciones necesita poder mostrar.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Un destino puede estar CERRADO a aportes nuevos y seguir siendo rendible
--
-- ⚠️ ESTO RELAJA UNA RESTRICCIÓN EXISTENTE, ASÍ QUE VA CON SU MOTIVO.
--
-- `destinos_admite_algo_chk` exigía `admite_puntual OR admite_recurrente`, con
-- este comentario en 20260816140000:
--
--     «Un destino que no admite ninguna forma de aporte no puede recibir nada:
--      es un error de carga, no una configuración válida.»
--
-- Era **cierto para los tres casos que existían entonces**. Un fondo de convenio
-- lo rompe: llegó completo, está cerrado a aportes nuevos, y aun así tiene que
-- publicar su rendición. Con la restricción vigente, la única forma de sacarlo
-- del checkout era ponerlo en `estado = 'cerrado'` — y la policy de lectura
-- pública de `gastos` exige `estado = 'activo'`, así que la rendición
-- desaparecía. O sea: se podía elegir entre no ofrecerlo o poder rendirlo, y
-- hacen falta las dos.
--
-- Verificado en el código antes de tocar nada: `Collaborate.jsx:60-64` filtra
-- por `admite_puntual` / `admite_recurrente`, y la policy `gastos_public_read_publicados`
-- (20260816150000) exige `estado = 'activo'`.
--
-- LO QUE SE PIERDE: ya no hay red contra el error de carga de crear un destino
-- que no puede recibir nada por descuido. Se acepta a propósito — el ABM avisa
-- (`destinosApi.js:76`), y una restricción que impide expresar un caso legítimo
-- cuesta más que el error que evita.
-- ---------------------------------------------------------------------
ALTER TABLE public.destinos DROP CONSTRAINT IF EXISTS destinos_admite_algo_chk;

COMMENT ON COLUMN public.destinos.admite_puntual IS
  'Acepta aportes puntuales. FALSE en los dos flags = destino cerrado a aportes nuevos: llego completo (un fondo de convenio, un subsidio) y solo falta rendirlo. Sigue siendo publico y rendible.';
COMMENT ON COLUMN public.destinos.admite_recurrente IS
  'Acepta aportes recurrentes. Ver admite_puntual para el caso de los dos en FALSE.';

-- ---------------------------------------------------------------------
-- 2) Comprobante en `aportes` — la asimetría que quedaba
--
-- `gastos` puede adjuntar comprobante desde 20260816150000. `aportes` no podía
-- adjuntar **nada**: solo tenía `notas`, un texto libre.
--
-- Eso deja la rendición coja de un lado. Se apoya en dos columnas —lo que entró
-- y lo que salió— y hasta hoy **la de ingresos no se podía documentar**. Se ve
-- crudo en el caso que originó esta migración: el ingreso más grande de la
-- historia de la Fundación está respaldado por documentación certificada ante
-- escribano con firmas de autoridades de las dos instituciones, y no había
-- dónde ponerla.
--
-- Y es genérico: quien recibe un subsidio tiene que poder probar que lo recibió,
-- normalmente ante el mismo organismo que se lo dio.
--
-- MISMO MECANISMO QUE `gastos`, NO UNO NUEVO: el bucket privado `comision-docs`,
-- bajo el prefijo `aportes/`. Sus policies ya están escritas sobre
-- `is_board_member()`, así que esto **no agrega una sola policy de storage**
-- (§10.9: se reusa, no se construye).
-- ---------------------------------------------------------------------
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS comprobante_path   text;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS comprobante_nombre text;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS comprobante_mime   text;
ALTER TABLE public.aportes ADD COLUMN IF NOT EXISTS comprobante_size   bigint;

DO $mig$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_comprobante_size_chk'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE public.aportes ADD CONSTRAINT aportes_comprobante_size_chk
      CHECK (comprobante_size IS NULL OR comprobante_size > 0);
  END IF;
END $mig$;

-- Derivada, igual que en `gastos`: permite decir «este ingreso está documentado»
-- sin exponer el archivo ni su ruta. Es el dato que le da credibilidad a un
-- fondo restringido sin publicar un convenio firmado.
ALTER TABLE public.aportes
  ADD COLUMN IF NOT EXISTS tiene_comprobante boolean
  GENERATED ALWAYS AS (comprobante_path IS NOT NULL) STORED;

COMMENT ON COLUMN public.aportes.comprobante_path IS
  'Ruta en el bucket privado `comision-docs`, prefijo `aportes/`. NUNCA es publico: lo que se publica es que el comprobante existe (tiene_comprobante), no el archivo.';

-- ---------------------------------------------------------------------
-- 3) Qué clase de comprobante es
--
-- ⚠️ POR QUÉ ESTE CAMPO EXISTE, Y NO ES BUROCRACIA.
--
-- Sin él, todo es «un comprobante» y se asume que todo son facturas. Cuando
-- alguien mira y descubre que aquel gasto tenía un recibo simple, la confianza
-- se rompe — no por el recibo, sino por haberlo dejado implícito. **Ser
-- explícito juega a favor:** «Recibo de escribano — certificación de firmas» es
-- más creíble que un comprobante sin nombre.
--
-- POR QUÉ LOS VALORES SON GENÉRICOS Y NO 'factura_a' / 'factura_b' / 'factura_c':
-- esa clasificación es de la normativa argentina, y este esquema no puede
-- asumir un país (§10.9). Las siete categorías de abajo existen en cualquier
-- jurisdicción. El detalle fiscal —letra, punto de venta, CAE— es un dato del
-- documento y va en `comprobante_numero`, que es texto libre justamente porque
-- su formato cambia por país.
-- ---------------------------------------------------------------------
DO $mig$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['aportes','gastos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tipo_comprobante text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS comprobante_numero text', t);

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = t || '_tipo_comprobante_chk'
                      AND conrelid = ('public.' || t)::regclass) THEN
      EXECUTE format($chk$
        ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
          %I IS NULL OR %I IN
            ('factura','recibo','escritura','transferencia','ticket','extracto','otro')
        )$chk$, t, t || '_tipo_comprobante_chk', 'tipo_comprobante', 'tipo_comprobante');
    END IF;

    EXECUTE format($c$
      COMMENT ON COLUMN public.%I.tipo_comprobante IS
        'Que clase de respaldo documental es. NULL = no se declaro. Generico a proposito: la letra de la factura es normativa argentina y va en comprobante_numero.'
    $c$, t);
  END LOOP;
END $mig$;

-- ---------------------------------------------------------------------
-- 4) El reporte público dice si el ingreso está documentado
--
-- `aportes` no es legible por `anon` —es la tabla con los datos de cada
-- persona— y no va a serlo. Pero el AGREGADO sí puede salir: cuántos aportes
-- recibió el destino y cuántos tienen respaldo documental.
--
-- Es exactamente lo que un fondo restringido necesita mostrar: «este millón
-- entró y está documentado», sin publicar el convenio ni quién lo firmó.
--
-- Se agrega a `reporte_destino()`, que ya es SECURITY DEFINER y pública, en vez
-- de crear una función nueva.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reporte_destino(text);
CREATE FUNCTION public.reporte_destino(p_slug text)
RETURNS TABLE (
  destino_id           uuid,
  nombre               text,
  tipo                 text,
  descripcion          text,
  meta_monto           numeric,
  recaudado            numeric,
  cupos_totales        integer,
  cupos_ocupados       integer,
  cupos_libres         integer,
  aportantes           integer,
  aportes_totales      integer,
  aportes_documentados integer,
  abierto_a_aportes    boolean,
  hitos                jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.nombre, d.tipo, d.descripcion, d.meta_monto, d.monto_recaudado,
         d.cupos_totales, d.cupos_ocupados,
         CASE WHEN d.cupos_totales IS NULL THEN NULL
              ELSE GREATEST(d.cupos_totales - d.cupos_ocupados, 0) END,
         (SELECT count(DISTINCT p.user_id)::int FROM public.padrinazgos p
           WHERE p.destino_id = d.id AND p.estado = 'activo'),
         -- Cuántos aportes y cuántos con respaldo. Sin decir de quién: son
         -- conteos, no una lista.
         (SELECT count(*)::int FROM public.aportes a WHERE a.destino_id = d.id),
         (SELECT count(*)::int FROM public.aportes a
           WHERE a.destino_id = d.id AND a.tiene_comprobante),
         -- Para que la pantalla sepa si ofrecer un botón de aportar. Un fondo
         -- cerrado con un CTA que no lleva a ningún lado es peor que sin CTA.
         (d.admite_puntual OR d.admite_recurrente),
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'fecha', h.fecha, 'titulo', h.titulo, 'descripcion', h.descripcion,
                    'cantidad', h.cantidad, 'unidad', h.unidad) ORDER BY h.fecha DESC)
             FROM public.hitos_destino h
            WHERE h.destino_id = d.id AND h.publicado), '[]'::jsonb)
    FROM public.destinos d
   WHERE d.slug = p_slug AND d.estado IN ('activo','pausado','cerrado');
$$;

COMMENT ON FUNCTION public.reporte_destino(text) IS
  'Reporte publico y AGREGADO de un destino: plata, cupos, respaldo documental e hitos. No devuelve ningun dato de personas ni de beneficiarios.';

REVOKE ALL ON FUNCTION public.reporte_destino(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reporte_destino(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5) Permisos de las columnas nuevas
--
-- No hace falta ningún GRANT nuevo: `aportes` ya está cerrada a `anon` desde
-- §10.11 y las columnas heredan eso. Se deja el REVOKE explícito como red, con
-- el mismo criterio de 10.1.g — el margen de error en cero.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.aportes FROM anon;
