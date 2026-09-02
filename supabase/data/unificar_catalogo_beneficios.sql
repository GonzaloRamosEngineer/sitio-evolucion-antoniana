-- =====================================================================
-- UNIFICAR EL CATÁLOGO — cerrar la fuga y dejar UNA sola fuente
-- (ROADMAP §12.10.13, §12.10.14, §12.10.8)
--
-- NO ES UNA MIGRACIÓN y por eso vive acá: son datos de la entidad, no esquema.
-- Requiere que la migración `20260902120000_club_beneficios_vidriera.sql` esté
-- aplicada (agrega `slug`, `instrucciones` e `imagen_url`).
--
--   bash tools/db.sh sql < supabase/data/unificar_catalogo_beneficios.sql
--
-- QUÉ ARREGLA, EN CONCRETO. Al 2026-09-02 el mismo 30% de DigitalMatch estaba
-- publicado dos veces con reglas opuestas, y el código `DMGlobal` era visible
-- sin sesión en una página indexable. **Nadie necesitaba ser socio.**
--
-- ⚠️ EL ORDEN IMPORTA Y NO ES INTERCAMBIABLE:
--
--   1. Aplicar la migración (columnas nuevas).
--   2. Correr ESTE archivo (contenido a la tabla nueva + baja de la vieja).
--   3. Recién entonces desplegar el front.
--
-- Si se despliega el front antes del paso 1, `/beneficios` pide columnas que no
-- existen y el catálogo queda vacío. Si se corre el paso 2 sin el 3, el sitio
-- viejo se queda sin catálogo. Es la única secuencia sin ventana rota.
--
-- IDEMPOTENTE: `WHERE` por id fijo y valores absolutos, no incrementos.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) El beneficio real hereda la URL de la página vieja.
--
-- El slug se copia TAL CUAL de `benefits` a propósito: esa URL está indexada y
-- pudo compartirse por WhatsApp. Cambiarla por una más linda rompería los
-- enlaces que ya existen, y el beneficio de un slug prolijo no paga ese costo.
-- ---------------------------------------------------------------------
UPDATE public.club_beneficios cb
   SET slug          = b.slug,
       imagen_url    = b.imagen_url,
       -- Las instrucciones se reescriben SIN el código. El texto original
       -- terminaba en "Usá el código DMGlobal para aplicar el 30% OFF", que es
       -- la tercera vía por la que se filtraba (§12.10.13): blindar la columna
       -- `codigo` no alcanzaba porque el código también viajaba acá adentro.
       instrucciones = 'Generá tu código desde el club, ingresá al sitio de '
                       || 'DigitalMatch Global y completá el formulario '
                       || 'indicando que sos parte de la Fundación Evolución '
                       || 'Antoniana. El código es personal y de un solo uso.'
  FROM public.benefits b
 WHERE cb.id = 'dc100000-0000-4000-8000-000000000003'
   AND b.slug = '30-de-descuento-en-desarrollo-de-sitios-web-o-landing-pages';

-- ---------------------------------------------------------------------
-- 2) La fila vieja se archiva. NO se borra.
--
-- Se archiva y no se elimina por el mismo criterio de 12.9.3: es el registro de
-- lo que estuvo publicado. Y `codigo` se vacía además del estado porque un
-- `estado = 'baja'` protege la PÁGINA, no la API: la columna seguiría siendo
-- legible para `anon` mientras la fila exista.
-- ---------------------------------------------------------------------
-- ⚠️ 'inactivo', NO 'baja'. El CHECK de `benefits.estado` solo admite
-- 'activo'|'inactivo' — es una tabla mas vieja, con otro vocabulario que
-- `club_beneficios` ('borrador'|'activo'|'pausado'|'baja'). Este archivo decia
-- 'baja' y habria abortado la transaccion entera contra produccion. Lo
-- encontro validar en Docker, no leerlo.
UPDATE public.benefits
   SET estado           = 'inactivo',
       codigo           = NULL,
       codigo_descuento = NULL,
       instrucciones    = 'Este beneficio se migró al club. Ver /beneficios.'
 WHERE slug = '30-de-descuento-en-desarrollo-de-sitios-web-o-landing-pages';

-- ---------------------------------------------------------------------
-- 3) El beneficio de prueba se archiva (§12.10.10).
--
-- Se cargó para validar el circuito y quedó activo: lo ve cualquier visitante
-- de /club. Ya cumplió — el canje real del 2026-09-02 lo ejercitó (§11.7.12).
-- ---------------------------------------------------------------------
UPDATE public.club_beneficios
   SET estado = 'baja'
 WHERE id = 'dc100000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------------
-- 4) CONTROL. Si algo de esto no da lo esperado, ROLLBACK y revisar.
--    Esperado: un solo beneficio activo, con slug, sin 'DMGlobal' en ningún
--    campo de texto, y cero filas activas en el catálogo viejo.
-- ---------------------------------------------------------------------
\echo '--- activos en el catalogo nuevo (esperado: 1, con slug) ---'
SELECT titulo, slug, estado, requiere_acceso
  FROM public.club_beneficios WHERE estado = 'activo';

\echo '--- fuga de DMGlobal en cualquier texto publico (esperado: 0 y 0) ---'
SELECT count(*) AS fuga_en_club
  FROM public.club_beneficios
 WHERE estado = 'activo'
   AND concat_ws(' ', titulo, descripcion, terminos, instrucciones) ILIKE '%DMGlobal%';
SELECT count(*) AS activos_en_catalogo_viejo
  FROM public.benefits WHERE estado = 'activo';

COMMIT;
