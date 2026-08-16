-- =============================================================================
-- ⚠️ ESTE ARCHIVO ESTÁ PENSADO PARA UNA BASE DESECHABLE EN DOCKER.
--
-- Los checks T1-T7 **escriben en las tablas reales y FUERA de transacción**:
-- crean partners `ZZ *` y un usuario de prueba, y los borran recién al final
-- (línea ~77). Si la corrida se interrumpe antes de esa limpieza, **la basura
-- queda**. Contra producción eso significa partners fantasma en el sitio
-- público y una fila espuria en `auth.users`.
--
-- Los checks T8-T16, agregados después, siguen la regla contraria y por eso son
-- seguros en cualquier base: **todo dentro de savepoints que se revierten**, y
-- el último verifica que no quedó residuo. Si se agregan checks nuevos, van así.
--
-- Para correr solo la parte segura (T8 en adelante) contra producción:
--   sed -n '/^[\]echo.*T8:/,$p' supabase/checks/rls-check.sql | bash tools/db.sh sql
--
-- Dos detalles del patrón, los dos aprendidos rompiéndolo el 2026-08-16:
--   · El ancla `^` + `echo` es lo que evita que sed matchee ESTA MISMA línea de
--     comentario. Un `/T8:/` a secas devuelve el archivo entero y corren las
--     escrituras — pasó dos veces.
--   · La barra se escribe `[\]` y no `\\`: en BRE, `\\echo` no matchea el
--     literal `\echo`, y sed no avisa, simplemente devuelve vacío.
-- =============================================================================
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
-- ⚠️ `raw_user_meta_data` con `name` NO es opcional. El trigger
-- `on_auth_user_created` corre `handle_new_user()`, que saca el nombre de ahí e
-- inserta en `public.users`, donde `name` es NOT NULL. Sin metadata el INSERT de
-- arriba explota y **T6 entero no llega a correr** — que es exactamente lo que
-- estuvo pasando en silencio hasta el 2026-08-16: el check parecía correr y en
-- realidad moría en la primera línea.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','zz-plain@test.com','x','{"name":"ZZ Plain"}'::jsonb,now(),now())
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

-- =============================================================================
-- T14-T16: la carga manual de aportes (panel de la comisión)
--
-- `aportes` es la tabla que otorga privilegios: quien pueda insertar ahí se
-- autoconcede acceso, y encima mueve el libro contable. Estos tres checks
-- cubren las tres formas de equivocarse, y son las tres que importan.
-- Todo corre dentro de savepoints: no queda nada.
-- =============================================================================
BEGIN;

INSERT INTO public.destinos (tipo, nombre, slug, estado, meta_monto)
VALUES ('campana','ZZ Check','zz-check-aportes','activo', 100000);

SELECT id AS zz_uid_comision FROM public.users
 WHERE role IN ('admin','comision_directiva') LIMIT 1 \gset
SELECT id AS zz_uid_simple FROM public.users WHERE role = 'user' LIMIT 1 \gset

\echo '=== T14: un usuario comun NO puede cargar un aporte ==='
\echo '   (esperado: ERROR violates row-level security policy)'
SAVEPOINT t14;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'zz_uid_simple', true);
INSERT INTO public.aportes (destino_id, origen, monto)
SELECT id, 'manual', 999 FROM public.destinos WHERE slug='zz-check-aportes';
ROLLBACK TO SAVEPOINT t14;

\echo '=== T15: la comision SI puede, y el trigger actualiza el destino ==='
\echo '   (esperado: 40000 / 2, y despues 30000 / 2 al corregir — recalcula,'
\echo '    no vuelve a sumar, que es el bug clasico de un contador por trigger)'
SAVEPOINT t15;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'zz_uid_comision', true);

INSERT INTO public.aportes (destino_id, origen, monto, nombre_aportante)
SELECT id, 'manual', 25000, 'ZZ A' FROM public.destinos WHERE slug='zz-check-aportes';
INSERT INTO public.aportes (destino_id, origen, monto, nombre_aportante)
SELECT id, 'manual', 15000, 'ZZ B' FROM public.destinos WHERE slug='zz-check-aportes';

RESET ROLE;
SELECT monto_recaudado, cantidad_aportes FROM public.destinos WHERE slug='zz-check-aportes';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'zz_uid_comision', true);
UPDATE public.aportes SET monto = 5000 WHERE nombre_aportante = 'ZZ B';
RESET ROLE;
SELECT monto_recaudado, cantidad_aportes FROM public.destinos WHERE slug='zz-check-aportes';
ROLLBACK TO SAVEPOINT t15;

\echo '=== T16: la comision NO puede declarar un origen de pasarela a mano ==='
\echo '   (esperado: ERROR — la policy exige origen = manual, para que nadie'
\echo '    marque como cobrado por MercadoPago algo que MercadoPago nunca vio)'
SAVEPOINT t16;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'zz_uid_comision', true);
INSERT INTO public.aportes (destino_id, origen, monto, donation_id)
SELECT id, 'donacion', 888, NULL FROM public.destinos WHERE slug='zz-check-aportes';
ROLLBACK TO SAVEPOINT t16;

ROLLBACK;

\echo '=== control: los checks T14-T16 no dejaron nada ==='
\echo '   (esperado: 0)'
SELECT count(*) AS residuo FROM public.destinos WHERE slug='zz-check-aportes';
