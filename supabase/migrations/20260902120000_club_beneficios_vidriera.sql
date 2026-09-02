-- =====================================================================
-- CLUB — LA VIDRIERA: unificar el catálogo en una sola fuente
-- (ROADMAP §12.10.13, §12.10.14, §12.10.15; cierra el prerrequisito de §12.10.8)
--
-- EL PROBLEMA QUE RESUELVE, Y NO ES ESTÉTICO. Al 2026-09-02 el mismo 30% de
-- DigitalMatch vive en los DOS catálogos con reglas opuestas: `benefits` con
-- `requiere_acceso = false` y `club_beneficios` con `true`. El público anula al
-- gateado, así que **hoy nadie necesita ser socio para tener el descuento**, y
-- el código `DMGlobal` está impreso en una página pública e indexable.
--
-- La fase 2 ya trae la protección real —el código se emite por persona y de un
-- solo uso— pero la página que la gente encuentra no la usa. Lo que falta no es
-- seguridad nueva: es que el catálogo público lea la tabla nueva.
--
-- POR QUÉ SOLO TRES COLUMNAS. `/beneficios` renderiza siete cosas que
-- `club_beneficios` no tenía. Cuatro de ellas NO hacen falta acá, y eso es una
-- señal de que el modelo nuevo está mejor normalizado que el viejo:
--
--   `categoria`       -> ya existe como `club_comercios.rubro`
--   logo              -> `partners.logo_url` vía `club_comercios.partner_id`
--   `sitio_web`       -> idem
--   `contacto_email`  -> idem
--
-- En `benefits` esos cuatro eran columnas repetidas en cada beneficio del mismo
-- comercio. Copiarlas para acá sería importar la desnormalización que el modelo
-- nuevo ya había corregido.
--
-- ⚠️ OJO CON EL LOGO. `club_comercios.logo_url` está en NULL para el único
-- comercio cargado, así que el logo hay que traerlo de `partners` con un embed
-- ANIDADO (`club_comercios -> partners`). Si la consulta se escribe plana, la
-- vidriera sale sin logo y no falla: simplemente no se ve. De ahí que
-- `imagen_url` de abajo sea un override y no la fuente principal.
--
-- ES ADITIVA Y NO TOCA NADA. Tres columnas nullable y un índice. No modifica
-- `benefits` —esa fila se archiva por datos, no por DDL— ni ninguna policy: las
-- de `club_beneficios` ya dejan leer el catálogo activo a `anon` (§12.5), que es
-- exactamente lo que una vidriera pública necesita.
-- =====================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

ALTER TABLE public.club_beneficios
  ADD COLUMN IF NOT EXISTS slug          text,
  ADD COLUMN IF NOT EXISTS instrucciones text,
  ADD COLUMN IF NOT EXISTS imagen_url    text;

-- El slug es la URL indexable. Es nullable a propósito: un beneficio nace en
-- `estado = 'borrador'` (§12.3, la redacción la controla la entidad junto al
-- comercio) y en ese momento todavía no tiene por qué tener URL pública.
COMMENT ON COLUMN public.club_beneficios.slug IS
  'URL pública del beneficio en /beneficios/:slug. Nullable: un borrador no necesita URL. Único entre los que lo tienen (12.10.15).';

COMMENT ON COLUMN public.club_beneficios.instrucciones IS
  'El bloque "¿Cómo acceder?" de la vidriera. ⚠️ NUNCA debe contener un código de descuento: en el modelo de canje el código se emite por persona (12.10.13, donde el texto libre filtró DMGlobal).';

COMMENT ON COLUMN public.club_beneficios.imagen_url IS
  'Override opcional de la imagen. Si es NULL, la vidriera cae al logo del comercio (club_comercios.logo_url y, si también es NULL, partners.logo_url).';

-- Único entre los que tienen slug: dos beneficios activos con la misma URL
-- harían que la página muestre uno de los dos según el orden del planner, que
-- es la clase de bug que aparece en producción y no en Docker.
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_beneficios_slug
  ON public.club_beneficios (slug) WHERE slug IS NOT NULL;

-- Para el detalle: se busca por slug y se pide el activo.
CREATE INDEX IF NOT EXISTS idx_club_beneficios_slug_estado
  ON public.club_beneficios (slug, estado) WHERE slug IS NOT NULL;
