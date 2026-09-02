-- Bootstrap de lo que la imagen 15 espera de `supabase start` y no trae sola.
-- Todo tolera ausencias: un ALTER/GRANT a secas sobre algo inexistente tumba
-- el contenedor entero y el error se lee recien en `docker logs`.
DO $$
DECLARE r text; s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['auth','storage','extensions','realtime','graphql_public','pgbouncer']
  LOOP EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', s); END LOOP;

  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','supabase_admin',
                           'supabase_auth_admin','supabase_storage_admin',
                           'supabase_functions_admin','authenticator','dashboard_user',
                           'pgbouncer','supabase_read_only_user','supabase_replication_admin']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT', r);
    END IF;
    EXECUTE format('ALTER USER %I WITH PASSWORD %L', r, 'postgres');
  END LOOP;
END $$;

-- Stub: la imagen 15 trae una migracion que le cambia el owner a esta funcion,
-- y la funcion la crea `supabase start`. Sin ella el contenedor no arranca.
CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
RETURNS TABLE (username text, password text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT rolname::text, rolpassword::text FROM pg_authid WHERE rolname = p_usename;
$$;

-- Stubs de storage: la imagen tiene migraciones que hacen REVOKE sobre estas
-- tablas, que normalmente crea el servicio de storage.
CREATE TABLE IF NOT EXISTS storage.migrations (
  id integer PRIMARY KEY, name varchar(100) UNIQUE, hash varchar(40),
  executed_at timestamp DEFAULT now());
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, owner uuid, public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  metadata jsonb);

-- Las tablas de version de cada servicio, que el REVOKE de la imagen tambien toca.
CREATE TABLE IF NOT EXISTS auth.schema_migrations (version varchar(255) PRIMARY KEY);
CREATE TABLE IF NOT EXISTS realtime.schema_migrations (
  version bigint PRIMARY KEY, inserted_at timestamp);

-- ---------------------------------------------------------------------
-- auth: lo que normalmente crea GoTrue. Sin esto ninguna migracion con RLS
-- aplica, porque casi toda policy del repo llama a auth.uid().
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  confirmed_at       timestamptz,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_app_meta_data  jsonb DEFAULT '{}'::jsonb,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- Leen el JWT que PostgREST pone en la conexion. Con `current_setting(..., true)`
-- devuelven NULL fuera de una request, que es lo que un check necesita para
-- poder simular "nadie" y "alguien" cambiando una sola variable.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(coalesce(
    current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  ), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  ), '')::text;
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(coalesce(
    current_setting('request.jwt.claim.email', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  ), '')::text;
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;

-- `buckets` real tiene mas columnas que el stub minimo; la migracion de
-- comision_docs las usa. Se agregan aca para que esa migracion tambien aplique.
ALTER TABLE storage.buckets
  ADD COLUMN IF NOT EXISTS file_size_limit   bigint,
  ADD COLUMN IF NOT EXISTS allowed_mime_types text[],
  ADD COLUMN IF NOT EXISTS avif_autodetection boolean DEFAULT false;

-- Columnas que los checks de supabase/checks/ le insertan a auth.users.
ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS aud         varchar(255),
  ADD COLUMN IF NOT EXISTS role        varchar(255),
  ADD COLUMN IF NOT EXISTS instance_id uuid,
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_at  timestamptz,
  ADD COLUMN IF NOT EXISTS banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- En Supabase real `service_role` tiene rolbypassrls. Sin esto, el control
-- POSITIVO de los checks (T12: "service_role SI escribe") falla y se lee como
-- si el modulo estuviera roto, cuando lo roto es el andamio.
ALTER ROLE service_role BYPASSRLS;
ALTER ROLE supabase_admin BYPASSRLS;
