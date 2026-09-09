-- =============================================================================
-- avatar-check.sql — el aislamiento de la foto de perfil (§10.23.e)
--
-- QUÉ NO PUEDE FALLAR: que nadie vea, pise ni borre la foto de otro. El bucket
-- `avatares` es privado y toda su seguridad se apoya en una sola comparación
-- —la primera carpeta de la ruta contra `auth.uid()`—, así que un error de una
-- línea en esa expresión deja las caras de los socios al alcance de cualquier
-- sesión autenticada.
--
-- ⚠️ ESTE CHECK MONTA UN DOBLE DE `storage`, Y HAY QUE SABERLO AL LEERLO.
-- En un Postgres pelado el schema `storage` no existe (lo crea el servicio
-- storage-api), así que la migración se saltea a propósito su bloque entero con
-- un RAISE NOTICE. Eso deja las policies SIN PROBAR, que es justo lo que no se
-- puede dejar sin probar. Acá se crea `storage.buckets`, `storage.objects` y
-- `storage.foldername()` con las mismas firmas que las reales y se vuelve a
-- aplicar la migración encima, que es idempotente.
--
-- Lo que esto SÍ prueba: las expresiones de las cuatro policies y el aislamiento
-- entre personas. Lo que NO puede probar: que el bucket real quede privado y con
-- su límite de tamaño — eso se ve en el proyecto, con `select id, public from
-- storage.buckets where id='avatares'`.
--
-- Y trae los controles positivos apareados con cada negativo, como manda el
-- README: «nadie puede escribir» y «la tabla es inescribible y la función no
-- anda» se ven idénticos desde afuera.
--
-- ⚠️ CÓMO SE CORRE, que es distinto de los demás checks y por dos motivos:
--
--   docker cp supabase pgtest:/tmp/
--   docker exec -i pgtest psql -U supabase_admin -d postgres -q \
--     -f /tmp/supabase/checks/avatar-check.sql
--
--  1. **`-U supabase_admin`, no `-U postgres`.** En esa imagen `postgres` NO es
--     superusuario y el schema `storage` es de `supabase_admin`, así que crear
--     los dobles con `postgres` da «permission denied for schema storage».
--  2. **Con el árbol copiado adentro y `-f`, no por stdin.** Este archivo hace
--     `\i` de la migración de verdad en lugar de repetir las policies: una
--     copia de las policies en el check probaría la copia, que es el error que
--     este repo ya documentó para el ORDEN de los comprobantes. Y `\i` resuelve
--     rutas relativas al cwd del proceso psql, que vive en el contenedor.
-- =============================================================================

\set ON_ERROR_STOP on
\set A '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set B '''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''

-- --- El doble de `storage` -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  -- La real tiene este UNIQUE, y sin él el doble deja meter dos veces la misma
  -- ruta: los `ON CONFLICT DO NOTHING` del fixture no hacen nada y las
  -- aserciones que cuentan filas empiezan a contar de más.
  UNIQUE (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Misma semántica que la real: parte por '/' y devuelve todo menos el último.
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
  LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE partes text[];
BEGIN
  partes := string_to_array(name, '/');
  RETURN partes[1:array_length(partes,1)-1];
END
$fn$;

\echo ''
\echo '=== A0: el doble de storage.foldername se comporta como el real ==='
SELECT (storage.foldername('aaaa/avatar.webp'))[1] = 'aaaa' AS debe_ser_true,
       (storage.foldername('avatar.webp'))[1] IS NULL       AS sin_carpeta_es_null;
\echo '   ^ los dos true, o el resto del archivo no prueba lo que dice probar'

-- --- Limpieza de entrada ------------------------------------------------------
-- ⚠️ VA AL PRINCIPIO Y TAMBIÉN AL FINAL, a propósito. La de abajo no corre si el
-- archivo aborta a mitad, y entonces la corrida siguiente arranca con las filas
-- de la anterior: la primera vez que pasó, A5 dio FALLA porque contaba dos
-- fotos de Ana en lugar de una. Un check que solo limpia al final se envenena a
-- sí mismo, y el falso negativo aparece en la corrida en que uno ya está
-- buscando otra cosa.
DELETE FROM storage.objects WHERE bucket_id = 'avatares';
DELETE FROM public.users WHERE email IN ('zz-a@test.com', 'zz-b@test.com');
DELETE FROM auth.users  WHERE email IN ('zz-a@test.com', 'zz-b@test.com');

-- --- Las policies, aplicadas por la migración de verdad ------------------------
\echo ''
\echo '=== A1: con storage presente, la migracion SI crea sus cuatro policies ==='
\i /tmp/supabase/migrations/20260909020000_avatar_socio.sql
SELECT count(*) AS policies_creadas FROM pg_policies
 WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'avatares%';
\echo '   ^ tiene que decir 4 (select/insert/update/delete)'

SELECT public AS bucket_privado, file_size_limit FROM storage.buckets WHERE id='avatares';
\echo '   ^ privado = f. Si dice t, la foto de todos quedo en internet abierto'

-- --- Dos personas y una foto de cada una --------------------------------------
-- ⚠️ La fila de `public.users` NO se inserta a mano: el trigger
-- `handle_new_user` sobre `auth.users` ya la crea, y toma el nombre de
-- `raw_user_meta_data->>'name'`. Sin ese metadato el trigger inserta
-- `name = NULL` y revienta contra el NOT NULL — el andamio falla y la culpa
-- parece de la policy, que es la trampa que el README ya avisa para el rol de
-- la comisión en `club-check.sql`.
-- `created_at` va explícito por lo mismo: el trigger lo copia de
-- `auth.users.created_at`, que acá no tiene default.
INSERT INTO auth.users (id, email, created_at, raw_user_meta_data) VALUES
  (:A, 'zz-a@test.com', now(), '{"name":"ZZ Ana"}'::jsonb),
  (:B, 'zz-b@test.com', now(), '{"name":"ZZ Beto"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('avatares', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatar.webp'),
  ('avatares', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/avatar.webp')
ON CONFLICT DO NOTHING;

\echo ''
\echo '=== A2: control POSITIVO — Ana ve su propia foto ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
SELECT CASE WHEN count(*) = 1 THEN 'OK' ELSE 'FALLA' END AS ana_ve_la_suya
  FROM storage.objects WHERE bucket_id='avatares';
\echo '   ^ OK = ve UNA sola: la suya. Sin esto el modulo no anda.'
ROLLBACK;

\echo ''
\echo '=== A3: control NEGATIVO — Ana NO ve la foto de Beto ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
SELECT CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FALLA' END AS ana_no_ve_la_de_beto
  FROM storage.objects
 WHERE bucket_id='avatares' AND name LIKE 'bbbbbbbb%';
ROLLBACK;

\echo ''
\echo '=== A4: Ana NO puede PISAR la foto de Beto (el update del upsert) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
WITH intento AS (
  UPDATE storage.objects SET name = name
   WHERE bucket_id='avatares' AND name LIKE 'bbbbbbbb%'
  RETURNING 1
)
SELECT CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FALLA' END AS no_pisa_la_de_beto FROM intento;
ROLLBACK;

\echo ''
\echo '=== A5: control POSITIVO — Ana SI puede pisar la suya (upsert al cambiarla) ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
WITH intento AS (
  UPDATE storage.objects SET name = name
   WHERE bucket_id='avatares' AND name LIKE 'aaaaaaaa%'
  RETURNING 1
)
SELECT CASE WHEN count(*) = 1 THEN 'OK' ELSE 'FALLA' END AS si_pisa_la_suya FROM intento;
\echo '   ^ sin la policy de UPDATE la primera foto entra y la segunda falla'
ROLLBACK;

\echo ''
\echo '=== A6: Ana NO puede escribir en la carpeta de Beto ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
-- La aserción se AUTOEVALÚA en vez de dejar un ERROR para que alguien lo lea:
-- un `ERROR` esperado y un `ERROR` por un andamio roto se ven igual, y con
-- ON_ERROR_STOP el primero además corta el archivo antes de A7.
DO $chk$
BEGIN
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('avatares', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/avatar.webp');
  RAISE NOTICE 'FALLA: Ana escribio en la carpeta de Beto';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: la RLS bloqueo la escritura en carpeta ajena';
END
$chk$;
ROLLBACK;

\echo ''
\echo '=== A7: Ana NO puede BORRAR la foto de Beto ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
WITH intento AS (
  DELETE FROM storage.objects WHERE bucket_id='avatares' AND name LIKE 'bbbbbbbb%' RETURNING 1
)
SELECT CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FALLA' END AS no_borra_la_de_beto FROM intento;
ROLLBACK;

\echo ''
\echo '=== A8: un socio SI puede guardar su propia avatar_path ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
UPDATE public.users SET avatar_path='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatar.webp' WHERE id=:A;
SELECT CASE WHEN avatar_path IS NOT NULL THEN 'OK' ELSE 'FALLA' END AS guarda_su_ruta
  FROM public.users WHERE id=:A;
\echo '   ^ el trigger anti-escalacion pisa role/is_verified, no esta columna'
ROLLBACK;

\echo ''
\echo '=== A9: y NO puede escribir la de otro ==='
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \g /dev/null
WITH intento AS (
  UPDATE public.users SET avatar_path='hackeado' WHERE id=:B RETURNING 1
)
SELECT CASE WHEN count(*) = 0 THEN 'OK' ELSE 'FALLA' END AS no_escribe_la_de_beto FROM intento;
ROLLBACK;

-- Limpieza
DELETE FROM storage.objects WHERE bucket_id='avatares';
DELETE FROM public.users WHERE id IN (:A, :B);
DELETE FROM auth.users WHERE id IN (:A, :B);
\echo ''
-- ⚠️ Esta línea NO dice la palabra que se busca con grep, a propósito: el
-- README verifica con `grep -E 'FALLA|^ERROR'` y espera SIN SALIDA cuando todo
-- está bien. Un cartel de cierre que contenga esa palabra se autodelata y da
-- una alarma falsa en cada corrida.
\echo '=== fin del check: toda linea de resultado de arriba tiene que decir OK ==='
