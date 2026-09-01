-- =====================================================================
-- ALTA DEL COMERCIO PILOTO DEL CLUB — DigitalMatch Global (ROADMAP §12.9.1)
--
-- NO ES UNA MIGRACIÓN y por eso vive acá: son datos de la entidad, no esquema.
-- Se ejecuta a mano, una vez, con `bash tools/db.sh sql < este-archivo`.
--
-- Se carga por SQL solo porque es el primero. Desde el 2026-09-01 existe el ABM
-- en `/admin → Club de beneficios` (§11.7.9) y los que sigan se dan de alta
-- desde ahí, sin desarrollador. Este archivo queda como referencia de qué
-- significa cada campo.
--
-- IDEMPOTENTE: usa UUIDs fijos y `ON CONFLICT DO NOTHING`, así que correrlo dos
-- veces no duplica nada.
--
-- DOS COSAS QUE NO SON OBVIAS
--
--  1. El comercio se cuelga del partner que YA EXISTE (`partner_id`). Son dos
--     relaciones distintas con la entidad: el partner es un logo en la Home, el
--     comercio es una contraparte del mostrador (12.4). Que sean la misma
--     empresa es un caso previsto, no una duplicación.
--
--  2. El beneficio de prueba nace en 'borrador' A PROPÓSITO. Para probar el
--     circuito hay que ponerlo en 'activo', y mientras lo esté va a ser
--     VISIBLE PARA CUALQUIER VISITANTE del sitio, porque no requiere acceso.
--     Se deja apagado para que la ventana de exposición la decida una persona
--     —desde el ABM, que además es la pantalla que nunca se vio renderizada— y
--     no este script.
-- =====================================================================

SET client_min_messages = warning;

BEGIN;

-- ---------------------------------------------------------------------
-- 1) El comercio
-- ---------------------------------------------------------------------
INSERT INTO public.club_comercios (id, partner_id, nombre, rubro, slug, estado, descripcion)
VALUES (
  'dc100000-0000-4000-8000-000000000001',
  -- DigitalMatchGlobal, ya aprobado en `partners`.
  'fd8c79ed-60dc-466e-afe0-875b7514da0f',
  'DigitalMatch Global',
  'Tecnología',
  'digitalmatch-global',
  'activo',
  'Desarrollo de sitios web y landing pages.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) La sucursal
--
-- Un servicio web no tiene mostrador. «Online» existe igual porque el canje se
-- atribuye a una sucursal para el reporte por local (12.6), y sin ninguna el
-- dato queda en NULL para siempre.
-- ---------------------------------------------------------------------
INSERT INTO public.club_sucursales (id, comercio_id, nombre, activa)
VALUES (
  'dc100000-0000-4000-8000-000000000002',
  'dc100000-0000-4000-8000-000000000001',
  'Online',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3) El beneficio real
--
-- `limite_por_persona = 1` con `ventana = 'total'`: un descuento en desarrollo
-- web no se usa todos los meses. Esa combinación hace que la Edge Function
-- escriba `clave_limite = 'total'` y que el índice único de la base actúe de
-- red contra el doble clic.
--
-- `requiere_acceso = true`: hoy NADIE tiene acceso vigente (0 de 23), así que
-- este beneficio va a aparecer bloqueado para todo el mundo. Es correcto, y es
-- justamente el control negativo del circuito.
-- ---------------------------------------------------------------------
INSERT INTO public.club_beneficios (
  id, comercio_id, titulo, descripcion, terminos,
  tipo, valor, requiere_acceso, limite_por_persona, ventana, estado, orden
)
VALUES (
  'dc100000-0000-4000-8000-000000000003',
  'dc100000-0000-4000-8000-000000000001',
  '30% de descuento en desarrollo de sitios web o landing pages',
  'Para socios con aporte vigente.',
  'Aplica sobre presupuestos nuevos de desarrollo de sitios web o landing pages. '
    || 'No es acumulable con otras promociones ni aplicable a presupuestos ya aprobados. '
    || 'No incluye rediseños de sitios existentes ni mantenimiento. '
    || 'Válido una sola vez por persona. El código se valida al momento de contratar.',
  'porcentaje',
  30,
  true,
  1,
  'total',
  'activo',
  0
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4) El beneficio de prueba — APAGADO
--
-- Existe para validar el camino feliz, que con el beneficio real no se puede
-- ejercitar porque nadie tiene acceso vigente. Sin este, todas las pruebas
-- darían "bloqueado" y no se distinguiría «bloquea a quien no aportó» de
-- «bloquea a todos» (§11.6.3, cuarta vez que se escribe esa regla).
--
-- Para usarlo: ponerlo en 'activo' desde /admin → Club de beneficios, hacer el
-- canje, y volverlo a 'baja'. Mientras esté activo lo ve cualquier visitante.
-- ---------------------------------------------------------------------
INSERT INTO public.club_beneficios (
  id, comercio_id, titulo, descripcion, terminos,
  tipo, valor, requiere_acceso, estado, orden
)
VALUES (
  'dc100000-0000-4000-8000-000000000004',
  'dc100000-0000-4000-8000-000000000001',
  'Prueba interna del sistema de canje',
  'No es un beneficio real. Sirve para verificar que el circuito de canje funciona de punta a punta.',
  'Sin valor comercial. Se activa solo durante una prueba y se archiva al terminar.',
  'regalo',
  NULL,
  false,   -- abierto: es el control POSITIVO del bloqueo
  'borrador',
  99
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5) Quién valida en el mostrador
--
-- No es un rol de `users`: la fila en esta tabla ES lo que abre /comercio
-- (§12.5). Se ata la cuenta de administración porque DigitalMatch es un
-- comercio propio y esto es el piloto.
-- ---------------------------------------------------------------------
INSERT INTO public.club_comercio_usuarios (comercio_id, user_id, rol)
VALUES (
  'dc100000-0000-4000-8000-000000000001',
  '77a05526-5870-4a40-9cab-c321f0203a9e',  -- info@evolucionantoniana.com
  'dueno'
)
ON CONFLICT (comercio_id, user_id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
\echo ''
\echo '=== El comercio ==='
SELECT nombre, slug, rubro, estado, partner_id IS NOT NULL AS colgado_del_partner
  FROM public.club_comercios WHERE slug = 'digitalmatch-global';

\echo '=== Sucursales ==='
SELECT nombre, activa FROM public.club_sucursales
 WHERE comercio_id = 'dc100000-0000-4000-8000-000000000001';

\echo '=== Beneficios (el real activo, el de prueba en borrador) ==='
SELECT titulo, tipo, valor, requiere_acceso, limite_por_persona, ventana, estado
  FROM public.club_beneficios
 WHERE comercio_id = 'dc100000-0000-4000-8000-000000000001' ORDER BY orden;

\echo '=== Quién valida ==='
SELECT u.email, cu.rol FROM public.club_comercio_usuarios cu
  JOIN public.users u ON u.id = cu.user_id
 WHERE cu.comercio_id = 'dc100000-0000-4000-8000-000000000001';

\echo '=== Lo que va a ver un VISITANTE en /club (solo activos de comercios activos) ==='
SELECT b.titulo, b.requiere_acceso
  FROM public.club_beneficios b JOIN public.club_comercios c ON c.id = b.comercio_id
 WHERE b.estado = 'activo' AND c.estado = 'activo';
