-- Alta idempotente de los programas tecnológicos aprobados para la Fundación.
--
-- Evidencia recibida el 2026-10-21:
--   - Microsoft aprobó a Fundación Evolución Antoniana como organización sin
--     fines de lucro, con vigencia desde el 2026-10-11.
--   - Atlassian aprobó la Social Impact License y otorgó un descuento del 100%
--     sobre Teamwork Collection Premium para el tramo de 16 a 25 usuarios, con
--     vigencia hasta septiembre de 2027.
--
-- Se describen como programas de apoyo tecnológico. La redacción no afirma
-- patrocinio económico ni un partnership comercial más amplio que lo probado.

INSERT INTO public.partners (
  id,
  nombre,
  descripcion,
  colaboracion_detalle,
  contacto_email,
  sitio_web,
  logo_url,
  estado,
  orden
)
VALUES
  (
    'cbc25402-ac08-45c6-ae11-e31fae1fc939',
    'Microsoft for Nonprofits',
    'Microsoft for Nonprofits impulsa a organizaciones sociales con herramientas de productividad, colaboración y nube que fortalecen su gestión y amplían su impacto.',
    '<p>Microsoft for Nonprofits potencia la transformación digital de la Fundación y nos acerca herramientas que fortalecen nuestra capacidad de gestión.</p><p>Sus soluciones de productividad, colaboración y nube nos permiten organizar mejor el trabajo, resguardar la información y conectar a nuestros equipos, incluso cuando participan desde distintos lugares.</p><p>Esta alianza convierte la tecnología en una aliada de nuestra misión: optimizamos recursos, sostenemos proyectos con mayor eficiencia y podemos concentrar más energía en crear oportunidades para la comunidad.</p>',
    'admin@evolucionantoniana.com',
    'https://www.microsoft.com/nonprofits',
    '/img/partners/microsoft-for-nonprofits.svg',
    'aprobado',
    5
  ),
  (
    '2606f0fc-7349-40d8-8665-fab264ed8e32',
    'Atlassian Social Impact',
    'La Social Impact License de Atlassian acompaña a organizaciones sin fines de lucro con herramientas para planificar proyectos, compartir conocimiento y coordinar equipos.',
    '<p>Atlassian Social Impact fortalece la manera en que transformamos ideas en proyectos concretos y sostenibles.</p><p>Con herramientas como Jira, Confluence y Loom podemos planificar iniciativas, coordinar responsabilidades y reunir en un mismo lugar la información y los aprendizajes de cada equipo.</p><p>Esta alianza aporta claridad, continuidad y colaboración a nuestro trabajo. Nos ayuda a acompañar mejor cada proyecto, preservar el conocimiento institucional y ampliar nuestro impacto sin perder de vista a las personas que están detrás de cada acción.</p>',
    'admin@evolucionantoniana.com',
    'https://www.atlassian.com/nonprofits',
    '/img/partners/atlassian-social-impact.svg',
    'aprobado',
    6
  )
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  colaboracion_detalle = EXCLUDED.colaboracion_detalle,
  contacto_email = EXCLUDED.contacto_email,
  sitio_web = EXCLUDED.sitio_web,
  logo_url = EXCLUDED.logo_url,
  estado = EXCLUDED.estado,
  orden = EXCLUDED.orden;
