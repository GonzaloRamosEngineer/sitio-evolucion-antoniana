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

\echo '=== T5: anon DELETE sin policy -> 0 filas, SIN error (exito silencioso) ==='
BEGIN;
SET LOCAL ROLE anon;
DELETE FROM public.partners WHERE nombre = 'ZZ Aprobado';
\echo '   ^ mirar el DELETE 0: no hay error, simplemente no borro nada'
ROLLBACK;

\echo '=== T6: el trigger revierte role en silencio si el caller no es admin ==='
-- `raw_user_meta_data` con `name`: el trigger `handle_new_user` lo copia a
-- `public.users.name`, que es NOT NULL. Sin esto la semilla tira un ERROR
-- ruidoso (el test seguía andando por el INSERT explícito de abajo, pero el
-- error confundía la lectura de la salida).
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at, raw_user_meta_data)
VALUES ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','zz-plain@test.com','x',now(),now(),'{"name":"ZZ Plain"}')
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
