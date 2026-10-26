-- Etapa 7E: el resultado esperado es cero filas.
-- Audita sólo contenido que puede publicarse; excluye datos personales, operación
-- interna e identificadores técnicos estables como tablas `partners` y `club_*`.

WITH contenido_publico (superficie, id, valor) AS (
  SELECT 'activities', id::text, concat_ws(' ', title, description)
    FROM public.activities
  UNION ALL
  SELECT 'benefits', id::text,
         concat_ws(' ', titulo, descripcion, instrucciones, terminos, categoria, descuento, sitio_web)
    FROM public.benefits
  UNION ALL
  SELECT 'club_beneficios', id::text,
         concat_ws(' ', titulo, descripcion, instrucciones, terminos, tipo)
    FROM public.club_beneficios
  UNION ALL
  SELECT 'club_comercios', id::text, concat_ws(' ', nombre, descripcion, rubro)
    FROM public.club_comercios
  UNION ALL
  SELECT 'destinos', id::text, concat_ws(' ', nombre, descripcion, tipo)
    FROM public.destinos
  UNION ALL
  SELECT 'hitos_destino', id::text, concat_ws(' ', titulo, descripcion, unidad)
    FROM public.hitos_destino
  UNION ALL
  SELECT 'news', id::text, concat_ws(' ', title, body_md, content)
    FROM public.news
  UNION ALL
  SELECT 'partners', id::text, concat_ws(' ', nombre, descripcion, colaboracion_detalle, sitio_web)
    FROM public.partners
  UNION ALL
  SELECT 'projects', id::text, concat_ws(' ', name, description)
    FROM public.projects
),
reglas (regla, patron) AS (
  VALUES
    ('termino_club_de_beneficios', 'club de beneficios'),
    ('termino_partner_visible', '\mPartners?\M'),
    (
      'ruta_publica_heredada',
      '(^|https?://[^/]+|["''<[:space:]])/(about|activities|collaborate|rendicion|contact|legal-documents|privacy|terms|partners|postular-partner|preinscripcion|carnet|club|comercio|dashboard|confirm-attendance|agradecimiento|login|register|request-password-reset|update-password)([/?"''<[:space:]]|$)'
    )
)
SELECT contenido.superficie, contenido.id, reglas.regla
  FROM contenido_publico contenido
 CROSS JOIN reglas
 WHERE contenido.valor ~* reglas.patron
 ORDER BY contenido.superficie, contenido.id, reglas.regla;
