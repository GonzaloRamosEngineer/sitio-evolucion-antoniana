\set ON_ERROR_STOP off
\pset pager off

-- Semilla como superusuario (RLS no aplica a superuser por defecto).
INSERT INTO public.partners (nombre, descripcion, contacto_email, estado)
VALUES ('ZZ Aprobado','x','a@t.com','aprobado'),
       ('ZZ Pendiente','x','b@t.com','pendiente');

\echo '=== T1: el anon solo ve partners aprobados ==='
BEGIN;
SET LOCAL ROLE anon;
SELECT nombre, estado FROM public.partners WHERE nombre LIKE 'ZZ %' ORDER BY nombre;
ROLLBACK;

\echo '=== T2: anon INSERT con estado pendiente -> DEBE permitir ==='
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.partners (nombre, descripcion, contacto_email, estado)
VALUES ('ZZ AnonPendiente','x','c@t.com','pendiente');
\echo '   (si no hubo ERROR arriba, el insert paso)'
ROLLBACK;

\echo '=== T3: anon INSERT con estado aprobado -> DEBE rechazar (42501) ==='
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.partners (nombre, descripcion, contacto_email, estado)
VALUES ('ZZ AnonAprobado','x','d@t.com','aprobado');
ROLLBACK;

\echo '=== T4: anon NO puede leer de vuelta su propia fila pendiente ==='
\echo '   (por esto addPartner no pide .select())'
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.partners (nombre, descripcion, contacto_email, estado)
VALUES ('ZZ NoLeible','x','e@t.com','pendiente');
SELECT count(*) AS filas_visibles FROM public.partners WHERE nombre = 'ZZ NoLeible';
ROLLBACK;

\echo '=== T5: anon DELETE -> ahora falla FUERTE (permission denied) ==='
\echo '   OJO: este test cambio de comportamiento el 2026-08-16.'
\echo '   ANTES: anon tenia el GRANT de DELETE, asi que Postgres dejaba correr la'
\echo '   sentencia y las RLS la filtraban -> "DELETE 0", exito silencioso.'
\echo '   AHORA: la migracion 20260816120000 le revoco el GRANT, asi que corta'
\echo '   antes de llegar a las RLS -> ERROR 42501. Fallar ruidoso es mejor:'
\echo '   el borrado silencioso es indistinguible de "no habia nada que borrar".'
BEGIN;
SET LOCAL ROLE anon;
DELETE FROM public.partners WHERE nombre = 'ZZ Aprobado';
\echo '   ^ esperado: ERROR permission denied for table partners'
ROLLBACK;

\echo '=== T6: el trigger revierte role en silencio si el caller no es admin ==='
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','zz-plain@test.com','x',now(),now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, name, email, role)
VALUES ('11111111-1111-1111-1111-111111111111','ZZ Plain','zz-plain@test.com','user')
ON CONFLICT (id) DO UPDATE SET role='user';

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', true);
UPDATE public.users SET role='admin' WHERE id='11111111-1111-1111-1111-111111111111';
\echo '   ^ el UPDATE dice 1 fila...'
SELECT role AS rol_final FROM public.users WHERE id='11111111-1111-1111-1111-111111111111';
\echo '   ^ ...pero el rol NO cambio: error null + cero cambios'
ROLLBACK;

\echo '=== T7: benefits y news son de lectura publica? ==='
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS benefits_visibles FROM public.benefits;
SELECT count(*) AS news_visibles FROM public.news;
ROLLBACK;

-- Limpieza
DELETE FROM public.partners WHERE nombre LIKE 'ZZ %';
DELETE FROM public.users WHERE id='11111111-1111-1111-1111-111111111111';
DELETE FROM auth.users WHERE id='11111111-1111-1111-1111-111111111111';

-- =============================================================================
-- T8-T10: regresión del puenteo de RLS por vistas (auditoría 2026-08-16)
--
-- La fuga original: una vista OWNER TO postgres SIN security_invoker corre con
-- los permisos del dueño y devuelve filas que las RLS de la tabla de origen
-- niegan. Estos checks fallan si alguien recrea una vista con ese patrón.
-- =============================================================================

\echo '=== T8: NINGUNA vista de public puede quedar sin security_invoker ==='
\echo '   (esperado: 0 filas — cualquier fila listada es una fuga potencial)'
SELECT c.relname AS vista_sin_security_invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('v','m')
  AND COALESCE(
        (SELECT option_value
           FROM pg_options_to_table(c.reloptions)
          WHERE option_name = 'security_invoker'),
        'false') <> 'true'
  -- fundacion_metrics es la excepción DELIBERADA: agrega sobre todas las filas
  -- para el Dashboard. Se la protege revocándole el acceso a anon (ver T9),
  -- no con security_invoker, que la dejaría en cero.
  AND c.relname <> 'fundacion_metrics';

\echo '=== T9: anon NO puede leer fundacion_metrics (es la facturacion) ==='
\echo '   (esperado: ERROR de permiso denegado)'
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) FROM public.fundacion_metrics;
ROLLBACK;

\echo '=== T10: anon no conserva privilegios destructivos en ninguna tabla ==='
\echo '   (esperado: 0 filas)'
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema = 'public'
  AND privilege_type IN ('DELETE','UPDATE','TRUNCATE','REFERENCES','TRIGGER')
ORDER BY table_name, privilege_type;

-- =============================================================================
-- T11-T13: destinos y aportes (fase 1, migración 20260816140000)
-- =============================================================================

\echo '=== T11: anon NO puede leer aportes (es la tabla que otorga privilegios) ==='
\echo '   (esperado: ERROR permission denied)'
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) FROM public.aportes;
ROLLBACK;

\echo '=== T12: anon ve solo destinos activos, nunca borradores ==='
\echo '   (esperado: 0 filas — ningun destino no-activo visible para anon)'
BEGIN;
SET LOCAL ROLE anon;
SELECT nombre, estado FROM public.destinos WHERE estado <> 'activo';
ROLLBACK;

\echo '=== T13: el progreso publico sale de destinos, sin tocar aportes ==='
\echo '   (esperado: la consulta funciona; asi se dibuja la barra sin exponer'
\echo '    los datos de cada persona, que fue el error de las vistas)'
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS destinos_con_progreso_visible
FROM public.destinos WHERE estado='activo' AND monto_recaudado >= 0;
ROLLBACK;
