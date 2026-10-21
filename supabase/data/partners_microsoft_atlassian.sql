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
    'Microsoft for Nonprofits brinda a organizaciones elegibles acceso a donaciones y descuentos en herramientas de productividad, nube y colaboración.',
    '<p>La Fundación Evolución Antoniana fue validada por Microsoft como organización sin fines de lucro el 11 de octubre de 2026.</p><p>Esta aprobación nos permite acceder a las ofertas de Microsoft for Nonprofits y fortalecer nuestra gestión con tecnología para la productividad, la colaboración y el trabajo en la nube. Cada producto o licencia se activa de acuerdo con su disponibilidad y sus condiciones específicas.</p>',
    'admin@evolucionantoniana.com',
    'https://www.microsoft.com/nonprofits',
    '/img/partners/microsoft-for-nonprofits.svg',
    'aprobado',
    5
  ),
  (
    '2606f0fc-7349-40d8-8665-fab264ed8e32',
    'Atlassian Social Impact',
    'La Social Impact License de Atlassian acerca herramientas de planificación, documentación y colaboración a organizaciones que trabajan por el impacto social.',
    '<p>La Fundación Evolución Antoniana fue aprobada para la Social Impact License de Atlassian, validada a través de Goodstack.</p><p>El programa nos otorgó un descuento del 100% en la suscripción anual de Teamwork Collection Premium para el tramo de 16 a 25 usuarios, con vigencia hasta septiembre de 2027. La colección incluye Jira, Confluence y Loom.</p><p>Este beneficio nos ayuda a organizar proyectos, compartir conocimiento y coordinar el trabajo del equipo en un mismo entorno, destinando más tiempo y recursos a nuestra misión social.</p>',
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
