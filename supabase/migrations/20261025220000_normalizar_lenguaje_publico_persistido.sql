-- Etapa 7E: normaliza vocabulario y rutas en contenido editorial persistido.
-- Los identificadores técnicos (`partners`, `club_*`) no se renombran.

UPDATE public.benefits
   SET descripcion = replace(descripcion, 'partner tecnológico', 'aliado tecnológico'),
       instrucciones = replace(
         instrucciones,
         'Este beneficio se migró al club. Ver /beneficios.',
         'Este beneficio forma parte de Comunidad Evolución. Ver /beneficios.'
       )
 WHERE id = '87530408-9f5e-4f44-aed0-64be7f9ff142';

UPDATE public.club_beneficios
   SET instrucciones = replace(
         instrucciones,
         'Generá tu código desde el club',
         'Generá tu código desde Comunidad Evolución'
       )
 WHERE id = 'dc100000-0000-4000-8000-000000000003';

UPDATE public.news
   SET body_md = replace(
         body_md,
         'https://www.evolucionantoniana.com/preinscripcion',
         'https://www.evolucionantoniana.com/educacion/preinscripcion'
       )
 WHERE id = '6a342e3a-4cc9-41fb-9de7-94cfb745f3aa';
