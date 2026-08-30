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

-- =============================================================================
-- T17-T20: gastos y rendición (fase 2, migración 20260816150000)
--
-- `gastos` es la tabla que hace pública la plata: lo que entra ahí y se publica
-- lo ve cualquiera. Los cuatro checks cubren las cuatro formas de equivocarse.
-- Todo dentro de savepoints: no queda nada.
-- =============================================================================
BEGIN;

INSERT INTO public.destinos (tipo, nombre, slug, estado)
VALUES ('campana','ZZ Activo','zz-g-activo','activo'),
       ('campana','ZZ Borrador','zz-g-borrador','borrador');

INSERT INTO public.gastos (destino_id, concepto, monto, publicado)
SELECT id,'ZZ publicado',10000,true  FROM public.destinos WHERE slug='zz-g-activo';
INSERT INTO public.gastos (destino_id, concepto, monto, publicado)
SELECT id,'ZZ sin publicar',7000,false FROM public.destinos WHERE slug='zz-g-activo';
INSERT INTO public.gastos (destino_id, concepto, monto, publicado)
SELECT id,'ZZ en borrador',5000,true  FROM public.destinos WHERE slug='zz-g-borrador';

SELECT id AS zz_g_board FROM public.users
 WHERE role IN ('admin','comision_directiva') LIMIT 1 \gset
SELECT id AS zz_g_plain FROM public.users WHERE role = 'user' LIMIT 1 \gset

\echo '=== T17: anon ve SOLO gastos publicados de destinos activos ==='
\echo '   (esperado: 1 fila, "ZZ publicado". Ni el sin publicar, ni el que'
\echo '    cuelga de un destino en borrador — ese es el atajo por la puerta'
\echo '    de atras que la policy cierra pidiendo estado=activo explicito)'
SAVEPOINT t17;
SET LOCAL ROLE anon;
SELECT concepto, monto FROM public.gastos WHERE concepto LIKE 'ZZ %' ORDER BY concepto;
ROLLBACK TO SAVEPOINT t17;

\echo '=== T18: publicar mueve la rendicion, y despublicar la devuelve ==='
\echo '   (esperado: 10000/1, luego 0/0, luego 10000/1 — el contador'
\echo '    RECALCULA; si sumara deltas quedaria inflado para siempre)'
SAVEPOINT t18;
SELECT monto_rendido, cantidad_gastos_rendidos FROM public.destinos WHERE slug='zz-g-activo';
UPDATE public.gastos SET publicado=false WHERE concepto='ZZ publicado';
SELECT monto_rendido, cantidad_gastos_rendidos FROM public.destinos WHERE slug='zz-g-activo';
UPDATE public.gastos SET publicado=true WHERE concepto='ZZ publicado';
SELECT monto_rendido, cantidad_gastos_rendidos FROM public.destinos WHERE slug='zz-g-activo';
ROLLBACK TO SAVEPOINT t18;

\echo '=== T19a: un usuario comun no puede CARGAR un gasto ==='
\echo '   (esperado: ERROR violates row-level security policy)'
SAVEPOINT t19a;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'zz_g_plain', true) \g /dev/null
INSERT INTO public.gastos (destino_id, concepto, monto)
SELECT id,'ZZ colado',1 FROM public.destinos WHERE slug='zz-g-activo';
ROLLBACK TO SAVEPOINT t19a;

-- ⚠️ Savepoint APARTE, y no es cosmético: el ERROR de T19a aborta la
-- transacción, y todo lo que siguiera dentro del mismo savepoint devolvería
-- "current transaction is aborted" en vez de ejecutarse. Un check que no corre
-- se lee igual que uno que pasa. Pasó acá el 2026-08-16.
\echo '=== T19b: un usuario comun no puede PUBLICAR un gasto ==='
\echo '   (esperado: 0 — el UPDATE no falla, simplemente no alcanza ninguna fila)'
SAVEPOINT t19b;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'zz_g_plain', true) \g /dev/null
WITH a AS (UPDATE public.gastos SET publicado=true WHERE concepto='ZZ sin publicar' RETURNING 1)
SELECT count(*) AS filas_que_pudo_publicar FROM a;
ROLLBACK TO SAVEPOINT t19b;

\echo '=== T20: NADIE borra un gasto, ni la comision ==='
\echo '   (esperado: ERROR permission denied. La policy board es FOR ALL e'
\echo '    incluiria DELETE: lo que lo impide es el GRANT revocado, y hacen'
\echo '    falta las dos cosas para borrar)'
SAVEPOINT t20;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'zz_g_board', true) \g /dev/null
DELETE FROM public.gastos WHERE concepto='ZZ publicado';
ROLLBACK TO SAVEPOINT t20;

ROLLBACK;

\echo '=== control: los checks T17-T20 no dejaron nada ==='
\echo '   (esperado: 0)'
SELECT count(*) AS residuo FROM public.destinos WHERE slug LIKE 'zz-g-%';

-- =============================================================================
-- T21-T23: las donaciones entran solas al libro (migración 20260816160000)
--
-- La pieza más delicada del trigger no es que funcione, sino que **no pueda
-- hacer fallar el registro de una donación**: si se propagara el error, se
-- perdería el cobro entero y MercadoPago reintentaría para siempre. Un libro
-- incompleto se repara; una donación que nunca se registró, no.
-- Todo dentro de savepoints: no queda nada.
-- =============================================================================
BEGIN;

\echo '=== T21: una donacion aprobada entra sola al libro, y una pending no ==='
\echo '   (esperado: 0 aportes con la pending; 1 al aprobarla)'
SAVEPOINT t21;
INSERT INTO public.donations (amount, donation_type, payment_provider, payment_id, status)
VALUES (1234,'unica','mercadopago','ZZ-PAY-1','pending');
SELECT count(*) AS aportes_con_pending FROM public.aportes WHERE referencia_externa='ZZ-PAY-1';
UPDATE public.donations SET status='approved' WHERE payment_id='ZZ-PAY-1';
SELECT count(*) AS aportes_tras_aprobar FROM public.aportes WHERE referencia_externa='ZZ-PAY-1';

\echo '=== T22: IDEMPOTENCIA — el webhook reintenta y no duplica ==='
\echo '   (esperado: 1, no 3. referencia_externa es UNIQUE y el ON CONFLICT'
\echo '    convierte el reintento en un no-op)'
UPDATE public.donations SET status='approved' WHERE payment_id='ZZ-PAY-1';
UPDATE public.donations SET status='approved' WHERE payment_id='ZZ-PAY-1';
SELECT count(*) AS aportes_tras_3_reintentos FROM public.aportes WHERE referencia_externa='ZZ-PAY-1';
ROLLBACK TO SAVEPOINT t21;

\echo '=== T23: LA REGLA DE ORO — si el trigger no puede, la donacion igual se registra ==='
\echo '   (esperado: la donacion existe (1) y el aporte no (0), con un WARNING.'
\echo '    Se prueba dejando sin destino institucional activo, que es el modo de'
\echo '    fallo mas probable en una entidad recien configurada)'
SAVEPOINT t23;
UPDATE public.destinos SET estado='pausado' WHERE tipo='institucional';
INSERT INTO public.donations (amount, donation_type, payment_provider, payment_id, status)
VALUES (4321,'unica','mercadopago','ZZ-PAY-2','approved');
SELECT count(*) AS la_donacion_se_registro FROM public.donations WHERE payment_id='ZZ-PAY-2';
SELECT count(*) AS el_aporte_no FROM public.aportes WHERE referencia_externa='ZZ-PAY-2';
ROLLBACK TO SAVEPOINT t23;

ROLLBACK;

\echo '=== control: los checks T21-T23 no dejaron nada ==='
\echo '   (esperado: 0 y 0)'
SELECT count(*) AS donaciones_residuo FROM public.donations WHERE payment_id LIKE 'ZZ-PAY-%';
SELECT count(*) AS aportes_residuo FROM public.aportes WHERE referencia_externa LIKE 'ZZ-PAY-%';
