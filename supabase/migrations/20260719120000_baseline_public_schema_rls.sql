-- =====================================================================
-- BASELINE del esquema público + RLS (auditoría 2026-07-19, ítem 2.4 del ROADMAP)
--
-- Origen: `supabase db dump --schema public` contra el proyecto productivo,
-- transformado para ser idempotente:
--   * CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE FUNCTION|VIEW|TRIGGER
--   * constraints guardadas con chequeo en pg_constraint
--   * políticas RLS como DROP POLICY IF EXISTS + CREATE POLICY
--
-- Esto documenta y versiona la seguridad real del sitio: toda escritura del
-- browser sale con la anon key, por lo que estas políticas SON la barrera.
-- Las tablas del portal de Comisión (projects/tasks/documents/document_versions)
-- ya estaban versionadas en migraciones previas; acá aparecen igualmente como
-- snapshot completo (las sentencias son convergentes, no destructivas).
--
-- NOTA: la base productiva YA está en este estado; esta migración no necesita
-- aplicarse ahí (si se aplica, converge sin cambios). Sirve para auditoría y
-- para recrear el proyecto desde cero.
-- Al final se incluyen los triggers sobre auth.users que el dump de public
-- no captura (alta de perfil y verificación de email).
-- =====================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE SCHEMA IF NOT EXISTS "public";
ALTER SCHEMA "public" OWNER TO "pg_database_owner";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE OR REPLACE FUNCTION "public"."add_document_version"("p_document_id" "uuid", "p_file_path" "text", "p_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_notes" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_next integer;
begin
  if not public.is_board_member() then
    raise exception 'No autorizado';
  end if;
  select coalesce(max(version_number), 0) + 1
    into v_next
    from public.document_versions
    where document_id = p_document_id;
  insert into public.document_versions
    (document_id, version_number, file_path, file_name, mime_type, size_bytes, uploaded_by, notes)
  values
    (p_document_id, v_next, p_file_path, p_file_name, p_mime_type, p_size_bytes, auth.uid(), p_notes);
  update public.documents
    set current_version = v_next
    where id = p_document_id;
  return v_next;
end;
$$;
ALTER FUNCTION "public"."add_document_version"("p_document_id" "uuid", "p_file_path" "text", "p_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_notes" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;
ALTER FUNCTION "public"."check_is_admin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."confirm_guest_attendance"("p_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.registrations
  SET 
    is_confirmed = true,
    confirmation_token = NULL -- Invalidar el token después de su uso
  WHERE confirmation_token = p_token
    AND is_confirmed = false;
  IF NOT FOUND THEN
    -- Si no se encontró ninguna fila para actualizar, significa que el token no es válido,
    -- la asistencia ya estaba confirmada (y el token ya podría ser NULL o is_confirmed era true).
    RAISE EXCEPTION 'No se pudo confirmar tu asistencia. Revisa si ya la habías confirmado o el link expiró.';
  END IF;
  -- No es necesario retornar nada, la ausencia de error implica éxito.
  -- El trigger on_registration_confirmed se encargará de actualizar current_participants.
END;
$$;
ALTER FUNCTION "public"."confirm_guest_attendance"("p_token" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_benefit_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  base text;
  candidate text;
  i int := 1;
begin
  -- si viene slug manual, normalizamos y validamos unicidad
  if new.slug is not null and length(trim(new.slug)) > 0 then
    base := lower(regexp_replace(trim(new.slug), '\s+', '-', 'g'));
    base := regexp_replace(base, '[^a-z0-9\-]+', '', 'g');
  else
    -- si no, lo generamos desde el título
    base := lower(coalesce(new.titulo, ''));
    base := trim(base);
    base := regexp_replace(base, '\s+', '-', 'g');
    base := regexp_replace(base, '[^a-z0-9\-]+', '', 'g');
  end if;
  if base is null or length(base) = 0 then
    base := encode(gen_random_bytes(4), 'hex'); -- fallback
  end if;
  candidate := base;
  -- Asegurar unicidad (permite reintentos con -2, -3, ...)
  while exists(select 1 from public.benefits b
               where b.slug = candidate
                 and (tg_op = 'INSERT' or b.id <> new.id)) loop
    i := i + 1;
    candidate := base || '-' || i::text;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;
ALTER FUNCTION "public"."generate_benefit_slug"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_news_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  base_slug text;
  tmp_slug  text;
  tries     int := 0;
BEGIN
  -- si viene vacío, usar título
  base_slug := lower(regexp_replace(coalesce(NEW.slug, NEW.title, ''), '\s+', '-', 'g'));
  -- limpiar caracteres no válidos
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]+', '', 'g');
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'nota';
  END IF;
  tmp_slug := base_slug;
  -- garantizar unicidad (máx. 10 intentos con sufijo md5 cortito)
  WHILE EXISTS (SELECT 1 FROM public.news n WHERE n.slug = tmp_slug AND n.id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000')) LOOP
    tries := tries + 1;
    tmp_slug := base_slug || '-' || substr(md5(random()::text), 1, 6);
    EXIT WHEN tries >= 10;
  END LOOP;
  NEW.slug := tmp_slug;
  -- setear created_at si está faltando (por si acaso)
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."generate_news_slug"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."generate_partner_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- forzar defaults seguros
  IF NEW.estado IS NULL THEN
    NEW.estado := 'pendiente';
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  -- slug desde el nombre
  NEW.slug := lower(regexp_replace(COALESCE(NEW.nombre, ''), '\s+', '-', 'g'));
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."generate_partner_slug"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_donation_update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_donation_update_timestamp"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_email_confirmed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Solo actúa cuando email_confirmed_at pasa de NULL a un valor concreto
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.users
    set is_verified = true
    where id = new.id;
  end if;
  return new;
end;
$$;
ALTER FUNCTION "public"."handle_email_confirmed"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, role, is_verified, created_at, birth_date, dni, gender)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::text,
    COALESCE((NEW.raw_user_meta_data->>'is_verified')::boolean, false),
    NEW.created_at,
    (NEW.raw_user_meta_data->>'birth_date')::date,
    NEW.raw_user_meta_data->>'dni',
    NEW.raw_user_meta_data->>'gender'
  );
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."increment_activity_participants_on_confirmation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.is_confirmed = TRUE AND OLD.is_confirmed = FALSE THEN
    UPDATE public.activities
    SET current_participants = current_participants + 1
    WHERE id = NEW.activity_id;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."increment_activity_participants_on_confirmation"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_board_member"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'comision_directiva')
  );
$$;
ALTER FUNCTION "public"."is_board_member"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."mark_user_verified"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.users
  set is_verified = true
  where id = auth.uid();
end;
$$;
ALTER FUNCTION "public"."mark_user_verified"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."prevent_privilege_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Si quien ejecuta NO es admin, ignorar cualquier cambio a role/is_verified
  if not public.check_is_admin() then
    new.role        := old.role;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;
ALTER FUNCTION "public"."prevent_privilege_escalation"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_default_confirmation_data"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    IF NEW.is_confirmed IS NULL THEN
      NEW.is_confirmed := false;
    END IF;
    IF NEW.confirmation_token IS NULL THEN
      NEW.confirmation_token := gen_random_uuid()::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."set_default_confirmation_data"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_activity_participants_on_register"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.activities
  SET current_participants = current_participants + 1
  WHERE id = NEW.activity_id;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_activity_participants_on_register"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_activity_participants_on_unregister"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.is_confirmed = TRUE THEN
    UPDATE public.activities
    SET current_participants = GREATEST(0, current_participants - 1)
    WHERE id = OLD.activity_id;
  END IF;
  RETURN OLD;
END;
$$;
ALTER FUNCTION "public"."update_activity_participants_on_unregister"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "date" "date" NOT NULL,
    "duration" "text" NOT NULL,
    "modality" "text" NOT NULL,
    "max_participants" integer NOT NULL,
    "current_participants" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'Abierta'::"text",
    "image_detail_url" "text",
    "instagram_url" "text",
    "facebook_url" "text",
    "linkedin_url" "text",
    "twitter_url" "text"
);
ALTER TABLE "public"."activities" OWNER TO "postgres";
COMMENT ON COLUMN "public"."activities"."status" IS 'Estado de la actividad (ej: Próximamente, Abierta, Cerrada, Finalizada)';
CREATE TABLE IF NOT EXISTS "public"."benefits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "imagen_url" "text",
    "partner_id" "uuid",
    "fecha_inicio" "date",
    "fecha_fin" "date",
    "estado" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "instrucciones" "text",
    "terminos" "text",
    "codigo" "text",
    "codigo_descuento" "text",
    "descuento" "text",
    "sitio_web" "text",
    "contacto_email" "text",
    "orden" integer,
    CONSTRAINT "benefits_estado_check" CHECK (("estado" = ANY (ARRAY['activo'::"text", 'inactivo'::"text"])))
);
ALTER TABLE "public"."benefits" OWNER TO "postgres";
COMMENT ON TABLE "public"."benefits" IS 'Beneficios para miembros/usuarios. Escritura: admin. Lectura pública: solo activos.';
CREATE TABLE IF NOT EXISTS "public"."document_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "file_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "uploaded_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."document_versions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text",
    "description" "text",
    "current_version" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."documents" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."donations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "amount" numeric NOT NULL,
    "donation_type" "text" NOT NULL,
    "payment_provider" "text" DEFAULT 'mercadopago'::"text",
    "payment_id" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);
ALTER TABLE "public"."donations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."education_preinscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "dni" "text" NOT NULL,
    "age" integer NOT NULL,
    "last_year_completed" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "location" "text" NOT NULL,
    "level_to_start" "text" NOT NULL,
    "interest_area" "text",
    "relationship_club" "text" NOT NULL,
    "preferred_modality" "text" NOT NULL,
    "preferred_schedule" "text",
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."education_preinscriptions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."email_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "activity_title" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "registration_id" "uuid"
);
ALTER TABLE "public"."email_log" OWNER TO "postgres";
COMMENT ON COLUMN "public"."email_log"."status" IS 'Status of the email sending process';
CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "plan" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "payment_method" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "preapproval_id" "text",
    "external_reference" "text",
    "payer_email" "text",
    "next_charge_date" "date",
    "last_payment_id" "text",
    "last_payment_status" "text",
    "paused_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "provider_subscription_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "memberships_status_chk" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'paused'::"text", 'cancelled'::"text"])))
);
ALTER TABLE "public"."memberships" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."fundacion_metrics" AS
 SELECT ( SELECT COALESCE("sum"("donations"."amount"), (0)::numeric) AS "coalesce"
           FROM "public"."donations"
          WHERE ("donations"."status" = 'approved'::"text")) AS "total_donado",
    ( SELECT "count"(*) AS "count"
           FROM "public"."memberships"
          WHERE ("memberships"."status" = 'active'::"text")) AS "total_suscripciones_activas";
ALTER VIEW "public"."fundacion_metrics" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."legal_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "url_starts_with_https" CHECK (("url" ~* '^https://'::"text"))
);
ALTER TABLE "public"."legal_documents" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text" NOT NULL,
    "body_md" "text"
);
ALTER TABLE "public"."news" OWNER TO "postgres";
COMMENT ON TABLE "public"."news" IS 'Novedades/Noticias del sitio. Escritura: admin. Lectura pública: todo.';
CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text" NOT NULL,
    "logo_url" "text",
    "sitio_web" "text",
    "contacto_email" "text" NOT NULL,
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "colaboracion_detalle" "text",
    "orden" integer,
    CONSTRAINT "partners_estado_check" CHECK (("estado" = ANY (ARRAY['pendiente'::"text", 'aprobado'::"text", 'rechazado'::"text"])))
);
ALTER TABLE "public"."partners" OWNER TO "postgres";
COMMENT ON TABLE "public"."partners" IS 'Partners de la fundación. Escritura: admin. Lectura pública: solo aprobados.';
CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'activo'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['activo'::"text", 'en_pausa'::"text", 'cerrado'::"text"])))
);
ALTER TABLE "public"."projects" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."registrations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "activity_id" "uuid",
    "registered_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "guest_name" "text",
    "guest_email" "text",
    "is_confirmed" boolean DEFAULT false,
    "confirmation_token" "text",
    CONSTRAINT "check_registration_type" CHECK (((("user_id" IS NOT NULL) AND ("guest_name" IS NULL) AND ("guest_email" IS NULL)) OR (("user_id" IS NULL) AND ("guest_name" IS NOT NULL) AND ("guest_email" IS NOT NULL))))
);
ALTER TABLE "public"."registrations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "assignee_id" "uuid",
    "due_date" "date",
    "position" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status_label" "text",
    "assignee_text" "text",
    "priority" "text",
    CONSTRAINT "tasks_priority_check" CHECK ((("priority" IS NULL) OR ("priority" = ANY (ARRAY['alta'::"text", 'media'::"text", 'baja'::"text"])))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pendiente'::"text", 'en_progreso'::"text", 'hecho'::"text"])))
);
ALTER TABLE "public"."tasks" OWNER TO "postgres";
CREATE OR REPLACE VIEW "public"."user_support_history" AS
 SELECT "d"."user_id",
    'donation'::"text" AS "kind",
    "d"."id" AS "record_id",
    "d"."amount",
    "d"."status",
    "d"."payment_provider",
    "d"."payment_id",
    "d"."created_at",
    NULL::"date" AS "next_charge_date",
    NULL::"text" AS "plan",
    NULL::"text" AS "preapproval_id"
   FROM "public"."donations" "d"
UNION ALL
 SELECT "m"."user_id",
    'membership'::"text" AS "kind",
    "m"."id" AS "record_id",
    "m"."amount",
    "m"."status",
    "m"."payment_method" AS "payment_provider",
    "m"."last_payment_id" AS "payment_id",
    "m"."created_at",
    "m"."next_charge_date",
    "m"."plan",
    "m"."preapproval_id"
   FROM "public"."memberships" "m";
ALTER VIEW "public"."user_support_history" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "text" DEFAULT 'user'::"text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "birth_date" "date",
    "dni" "text",
    "gender" "text",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'educacion_manager'::"text", 'comision_directiva'::"text"])))
);
ALTER TABLE "public"."users" OWNER TO "postgres";
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activities_pkey' AND conrelid = 'public.activities'::regclass) THEN
    ALTER TABLE ONLY "public"."activities" ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'benefits_pkey' AND conrelid = 'public.benefits'::regclass) THEN
    ALTER TABLE ONLY "public"."benefits" ADD CONSTRAINT "benefits_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_document_id_version_number_key' AND conrelid = 'public.document_versions'::regclass) THEN
    ALTER TABLE ONLY "public"."document_versions" ADD CONSTRAINT "document_versions_document_id_version_number_key" UNIQUE ("document_id", "version_number");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_pkey' AND conrelid = 'public.document_versions'::regclass) THEN
    ALTER TABLE ONLY "public"."document_versions" ADD CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_pkey' AND conrelid = 'public.documents'::regclass) THEN
    ALTER TABLE ONLY "public"."documents" ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_pkey' AND conrelid = 'public.donations'::regclass) THEN
    ALTER TABLE ONLY "public"."donations" ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'education_preinscriptions_pkey' AND conrelid = 'public.education_preinscriptions'::regclass) THEN
    ALTER TABLE ONLY "public"."education_preinscriptions" ADD CONSTRAINT "education_preinscriptions_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_log_pkey' AND conrelid = 'public.email_log'::regclass) THEN
    ALTER TABLE ONLY "public"."email_log" ADD CONSTRAINT "email_log_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legal_documents_pkey' AND conrelid = 'public.legal_documents'::regclass) THEN
    ALTER TABLE ONLY "public"."legal_documents" ADD CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_pkey' AND conrelid = 'public.memberships'::regclass) THEN
    ALTER TABLE ONLY "public"."memberships" ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'news_pkey' AND conrelid = 'public.news'::regclass) THEN
    ALTER TABLE ONLY "public"."news" ADD CONSTRAINT "news_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'news_slug_unique' AND conrelid = 'public.news'::regclass) THEN
    ALTER TABLE ONLY "public"."news" ADD CONSTRAINT "news_slug_unique" UNIQUE ("slug");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_pkey' AND conrelid = 'public.partners'::regclass) THEN
    ALTER TABLE ONLY "public"."partners" ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partners_slug_key' AND conrelid = 'public.partners'::regclass) THEN
    ALTER TABLE ONLY "public"."partners" ADD CONSTRAINT "partners_slug_key" UNIQUE ("slug");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_pkey' AND conrelid = 'public.projects'::regclass) THEN
    ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_confirmation_token_key' AND conrelid = 'public.registrations'::regclass) THEN
    ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "registrations_confirmation_token_key" UNIQUE ("confirmation_token");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_pkey' AND conrelid = 'public.registrations'::regclass) THEN
    ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_pkey' AND conrelid = 'public.tasks'::regclass) THEN
    ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_guest_registration_for_activity' AND conrelid = 'public.registrations'::regclass) THEN
    ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "unique_guest_registration_for_activity" UNIQUE ("guest_email", "activity_id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_registration_for_activity' AND conrelid = 'public.registrations'::regclass) THEN
    ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "unique_user_registration_for_activity" UNIQUE ("user_id", "activity_id");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key' AND conrelid = 'public.users'::regclass) THEN
    ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey' AND conrelid = 'public.users'::regclass) THEN
    ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "idx_benefits_categoria" ON "public"."benefits" USING "btree" ("categoria");
CREATE INDEX IF NOT EXISTS "idx_benefits_created_at" ON "public"."benefits" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_benefits_estado" ON "public"."benefits" USING "btree" ("estado");
CREATE INDEX IF NOT EXISTS "idx_benefits_partner_id" ON "public"."benefits" USING "btree" ("partner_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_benefits_slug_unique" ON "public"."benefits" USING "btree" ("slug");
CREATE INDEX IF NOT EXISTS "idx_doc_versions_doc" ON "public"."document_versions" USING "btree" ("document_id");
CREATE INDEX IF NOT EXISTS "idx_donations_status" ON "public"."donations" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_donations_user" ON "public"."donations" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_donations_user_id" ON "public"."donations" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_log_registration_id" ON "public"."email_log" USING "btree" ("registration_id");
CREATE INDEX IF NOT EXISTS "idx_memberships_preapproval" ON "public"."memberships" USING "btree" ("preapproval_id");
CREATE INDEX IF NOT EXISTS "idx_memberships_status" ON "public"."memberships" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_memberships_user" ON "public"."memberships" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_memberships_user_id" ON "public"."memberships" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_news_created_at" ON "public"."news" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_news_slug" ON "public"."news" USING "btree" ("slug");
CREATE INDEX IF NOT EXISTS "idx_partners_created_at" ON "public"."partners" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_partners_estado" ON "public"."partners" USING "btree" ("estado");
CREATE INDEX IF NOT EXISTS "idx_registrations_activity_id" ON "public"."registrations" USING "btree" ("activity_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_assignee" ON "public"."tasks" USING "btree" ("assignee_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_project" ON "public"."tasks" USING "btree" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "news_slug_unique_idx" ON "public"."news" USING "btree" ("slug");
CREATE OR REPLACE TRIGGER "benefits_generate_slug" BEFORE INSERT OR UPDATE OF "titulo", "slug" ON "public"."benefits" FOR EACH ROW EXECUTE FUNCTION "public"."generate_benefit_slug"();
CREATE OR REPLACE TRIGGER "news_generate_slug" BEFORE INSERT OR UPDATE OF "title", "slug" ON "public"."news" FOR EACH ROW EXECUTE FUNCTION "public"."generate_news_slug"();
CREATE OR REPLACE TRIGGER "on_donation_update" BEFORE UPDATE ON "public"."donations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_donation_update_timestamp"();
CREATE OR REPLACE TRIGGER "on_registration_confirmed" AFTER UPDATE OF "is_confirmed" ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."increment_activity_participants_on_confirmation"();
CREATE OR REPLACE TRIGGER "on_registration_delete" AFTER DELETE ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_activity_participants_on_unregister"();
CREATE OR REPLACE TRIGGER "partners_generate_slug" BEFORE INSERT OR UPDATE OF "nombre" ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."generate_partner_slug"();
CREATE OR REPLACE TRIGGER "trg_documents_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "trg_prevent_privilege_escalation" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_privilege_escalation"();
CREATE OR REPLACE TRIGGER "trg_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
CREATE OR REPLACE TRIGGER "trg_set_default_confirmation_data" BEFORE INSERT ON "public"."registrations" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_confirmation_data"();
CREATE OR REPLACE TRIGGER "trg_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'benefits_partner_id_fkey' AND conrelid = 'public.benefits'::regclass) THEN
    ALTER TABLE ONLY "public"."benefits" ADD CONSTRAINT "benefits_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_document_id_fkey' AND conrelid = 'public.document_versions'::regclass) THEN
    ALTER TABLE ONLY "public"."document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_uploaded_by_fkey' AND conrelid = 'public.document_versions'::regclass) THEN
    ALTER TABLE ONLY "public"."document_versions" ADD CONSTRAINT "document_versions_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_created_by_fkey' AND conrelid = 'public.documents'::regclass) THEN
    ALTER TABLE ONLY "public"."documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_user_id_fkey' AND conrelid = 'public.donations'::regclass) THEN
    ALTER TABLE ONLY "public"."donations" ADD CONSTRAINT "donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'education_preinscriptions_user_id_fkey' AND conrelid = 'public.education_preinscriptions'::regclass) THEN
    ALTER TABLE ONLY "public"."education_preinscriptions" ADD CONSTRAINT "education_preinscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_registration_id' AND conrelid = 'public.email_log'::regclass) THEN
    ALTER TABLE ONLY "public"."email_log" ADD CONSTRAINT "fk_registration_id" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_user_id_fkey' AND conrelid = 'public.memberships'::regclass) THEN
    ALTER TABLE ONLY "public"."memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_created_by_fkey' AND conrelid = 'public.projects'::regclass) THEN
    ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_activity_id_fkey' AND conrelid = 'public.registrations'::regclass) THEN
    ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "registrations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_user_id_fkey' AND conrelid = 'public.registrations'::regclass) THEN
    ALTER TABLE ONLY "public"."registrations" ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignee_id_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_created_by_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_project_id_fkey' AND conrelid = 'public.tasks'::regclass) THEN
    ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
  END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage legal documents" ON "public"."legal_documents";
CREATE POLICY "Admins can manage legal documents" ON "public"."legal_documents" TO "authenticated" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));
DROP POLICY IF EXISTS "Authenticated users can register" ON "public"."registrations";
CREATE POLICY "Authenticated users can register" ON "public"."registrations" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("guest_name" IS NULL) AND ("guest_email" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "registrations"."activity_id") AND (("a"."current_participants" IS NULL) OR ("a"."current_participants" < "a"."max_participants")))))));
DROP POLICY IF EXISTS "Authenticated users can view only own or admin everything" ON "public"."registrations";
CREATE POLICY "Authenticated users can view only own or admin everything" ON "public"."registrations" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = 'admin'::"text"))))));
DROP POLICY IF EXISTS "Delete activities: only admin" ON "public"."activities";
CREATE POLICY "Delete activities: only admin" ON "public"."activities" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."role" = 'admin'::"text"))));
DROP POLICY IF EXISTS "Insert activities: only admin" ON "public"."activities";
CREATE POLICY "Insert activities: only admin" ON "public"."activities" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."role" = 'admin'::"text"))));
DROP POLICY IF EXISTS "Insert donations: if own or anonymous" ON "public"."donations";
CREATE POLICY "Insert donations: if own or anonymous" ON "public"."donations" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR ("user_id" IS NULL)));
DROP POLICY IF EXISTS "Insert memberships: only own" ON "public"."memberships";
CREATE POLICY "Insert memberships: only own" ON "public"."memberships" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
DROP POLICY IF EXISTS "Public can read legal documents" ON "public"."legal_documents";
CREATE POLICY "Public can read legal documents" ON "public"."legal_documents" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Select activities: open to public" ON "public"."activities";
CREATE POLICY "Select activities: open to public" ON "public"."activities" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Update activities: only admin" ON "public"."activities";
CREATE POLICY "Update activities: only admin" ON "public"."activities" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."role" = 'admin'::"text")))) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."role" = 'admin'::"text"))));
DROP POLICY IF EXISTS "Update own profile" ON "public"."users";
CREATE POLICY "Update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));
DROP POLICY IF EXISTS "Update registration: only admin or token confirmation" ON "public"."registrations";
CREATE POLICY "Update registration: only admin or token confirmation" ON "public"."registrations" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = 'admin'::"text")))) OR (("confirmation_token" IS NOT NULL) AND ("is_confirmed" = false)))) WITH CHECK ((("is_confirmed" = true) AND ("confirmation_token" IS NULL)));
DROP POLICY IF EXISTS "acceso_restringido_gestion_educativa" ON "public"."education_preinscriptions";
CREATE POLICY "acceso_restringido_gestion_educativa" ON "public"."education_preinscriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role" = 'admin'::"text") OR ("users"."role" = 'educacion_manager'::"text"))))));
ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_insert_email_logs" ON "public"."email_log";
CREATE POLICY "allow_insert_email_logs" ON "public"."email_log" FOR INSERT TO "service_role" WITH CHECK (true);
ALTER TABLE "public"."benefits" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "benefits_admin_all" ON "public"."benefits";
CREATE POLICY "benefits_admin_all" ON "public"."benefits" TO "authenticated" USING ((( SELECT "u"."role"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "u"."role"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())) = 'admin'::"text"));
DROP POLICY IF EXISTS "benefits_public_read_active" ON "public"."benefits";
CREATE POLICY "benefits_public_read_active" ON "public"."benefits" FOR SELECT USING (("estado" = 'activo'::"text"));
ALTER TABLE "public"."document_versions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_versions_board_all" ON "public"."document_versions";
CREATE POLICY "document_versions_board_all" ON "public"."document_versions" TO "authenticated" USING ("public"."is_board_member"()) WITH CHECK ("public"."is_board_member"());
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_board_all" ON "public"."documents";
CREATE POLICY "documents_board_all" ON "public"."documents" TO "authenticated" USING ("public"."is_board_member"()) WITH CHECK ("public"."is_board_member"());
ALTER TABLE "public"."donations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donations_admin_select_all" ON "public"."donations";
CREATE POLICY "donations_admin_select_all" ON "public"."donations" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."check_is_admin"()));
ALTER TABLE "public"."education_preinscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_log" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insercion_publica_preinscripciones" ON "public"."education_preinscriptions";
CREATE POLICY "insercion_publica_preinscripciones" ON "public"."education_preinscriptions" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);
ALTER TABLE "public"."legal_documents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manager_puede_actualizar_estado" ON "public"."education_preinscriptions";
CREATE POLICY "manager_puede_actualizar_estado" ON "public"."education_preinscriptions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role" = 'admin'::"text") OR ("users"."role" = 'educacion_manager'::"text"))))));
ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "memberships_admin_select_all" ON "public"."memberships";
CREATE POLICY "memberships_admin_select_all" ON "public"."memberships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."check_is_admin"()));
ALTER TABLE "public"."news" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "news_admin_all" ON "public"."news";
CREATE POLICY "news_admin_all" ON "public"."news" TO "authenticated" USING ((( SELECT "u"."role"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "u"."role"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())) = 'admin'::"text"));
DROP POLICY IF EXISTS "news_public_read" ON "public"."news";
CREATE POLICY "news_public_read" ON "public"."news" FOR SELECT USING (true);
ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partners_admin_all" ON "public"."partners";
CREATE POLICY "partners_admin_all" ON "public"."partners" TO "authenticated" USING ((( SELECT "u"."role"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT "u"."role"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"())) = 'admin'::"text"));
DROP POLICY IF EXISTS "partners_auth_insert_any" ON "public"."partners";
CREATE POLICY "partners_auth_insert_any" ON "public"."partners" FOR INSERT TO "authenticated" WITH CHECK (("estado" IS DISTINCT FROM 'aprobado'::"text"));
DROP POLICY IF EXISTS "partners_public_insert_any" ON "public"."partners";
CREATE POLICY "partners_public_insert_any" ON "public"."partners" FOR INSERT TO "anon" WITH CHECK (("estado" IS DISTINCT FROM 'aprobado'::"text"));
DROP POLICY IF EXISTS "partners_public_read" ON "public"."partners";
CREATE POLICY "partners_public_read" ON "public"."partners" FOR SELECT USING (("estado" = 'aprobado'::"text"));
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_board_all" ON "public"."projects";
CREATE POLICY "projects_board_all" ON "public"."projects" TO "authenticated" USING ("public"."is_board_member"()) WITH CHECK ("public"."is_board_member"());
ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_board_all" ON "public"."tasks";
CREATE POLICY "tasks_board_all" ON "public"."tasks" TO "authenticated" USING ("public"."is_board_member"()) WITH CHECK ("public"."is_board_member"());
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_board_select" ON "public"."users";
CREATE POLICY "users_board_select" ON "public"."users" FOR SELECT TO "authenticated" USING (("public"."is_board_member"() AND ("role" = ANY (ARRAY['admin'::"text", 'comision_directiva'::"text"]))));
DROP POLICY IF EXISTS "users_read_policy" ON "public"."users";
CREATE POLICY "users_read_policy" ON "public"."users" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."check_is_admin"()));
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
REVOKE ALL ON FUNCTION "public"."add_document_version"("p_document_id" "uuid", "p_file_path" "text", "p_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_document_version"("p_document_id" "uuid", "p_file_path" "text", "p_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_document_version"("p_document_id" "uuid", "p_file_path" "text", "p_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_document_version"("p_document_id" "uuid", "p_file_path" "text", "p_file_name" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_notes" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."confirm_guest_attendance"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_guest_attendance"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_guest_attendance"("p_token" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_benefit_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_benefit_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_benefit_slug"() TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_news_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_news_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_news_slug"() TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_partner_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_partner_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_partner_slug"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_donation_update_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_donation_update_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_donation_update_timestamp"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_email_confirmed"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_email_confirmed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_email_confirmed"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_activity_participants_on_confirmation"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_activity_participants_on_confirmation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_activity_participants_on_confirmation"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."is_board_member"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_board_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_board_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_board_member"() TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_user_verified"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_user_verified"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_user_verified"() TO "service_role";
GRANT ALL ON FUNCTION "public"."prevent_privilege_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_privilege_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_privilege_escalation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_default_confirmation_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_confirmation_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_confirmation_data"() TO "service_role";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_activity_participants_on_register"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_activity_participants_on_register"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_activity_participants_on_register"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_activity_participants_on_unregister"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_activity_participants_on_unregister"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_activity_participants_on_unregister"() TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activities" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activities" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activities" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."benefits" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."benefits" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."benefits" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."document_versions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."document_versions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."document_versions" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."documents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."documents" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."documents" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."donations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."donations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."donations" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."education_preinscriptions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."education_preinscriptions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."education_preinscriptions" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_log" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_log" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."email_log" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."memberships" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."memberships" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."memberships" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fundacion_metrics" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fundacion_metrics" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."fundacion_metrics" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."legal_documents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."legal_documents" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."legal_documents" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."news" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."news" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."news" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."partners" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."partners" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."partners" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."projects" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."projects" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."projects" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."registrations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."registrations" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."registrations" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tasks" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tasks" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tasks" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_support_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_support_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_support_history" TO "service_role";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";

-- ---------------------------------------------------------------------
-- Triggers sobre auth.users (no aparecen en el dump del esquema public)
-- ---------------------------------------------------------------------

CREATE OR REPLACE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

CREATE OR REPLACE TRIGGER "on_auth_user_email_confirmed"
  AFTER UPDATE ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_email_confirmed"();
