-- =====================================================================
-- MÓDULO DE APORTES, DESTINOS Y RENDICIÓN — incorporación al repo
--
-- ⚠️ ESTO YA ESTÁ EN PRODUCCIÓN. Esta migración no construye nada nuevo: trae
-- al repo un módulo que se construyó directo en la consola de Supabase y que
-- el esquema versionado no describía (ROADMAP §10.7). Aplicada contra la base
-- productiva converge sin cambios; su valor es que el repo vuelva a poder
-- reconstruir la base desde cero, que es la premisa de la que dependen todas
-- las migraciones siguientes.
--
-- Se generó extrayendo el DDL real de producción (`pg_dump --schema-only` +
-- `pg_get_functiondef`) y transformándolo a forma idempotente, igual que el
-- baseline de julio. No se transcribió a mano.
--
-- Qué trae:
--   * `destinos` — campañas/padrinazgos/institucional, con meta, recaudado,
--     cupos y totales de rendición. Es el `campanas` del §10.2, con más alcance.
--   * `aportes`  — el libro. `origen` ∈ (donacion|membresia|manual),
--     `referencia_externa` UNIQUE como clave de idempotencia,
--     `acceso_desde`/`acceso_hasta` nullables con CHECK de "ambos o ninguno".
--   * `gastos`   — rendición con comprobantes.
--   * `donations.destino_id` y `memberships.destino_id`.
--   * Las seis funciones y sus tres triggers, incluido `aporte_desde_donacion()`,
--     que ya resuelve lo que en el ROADMAP figura como decisión D1 (opción C).
--
-- Lo que NO trae, porque no existe todavía y va en la migración siguiente:
--   la capa de ACCESO (`reglas_acceso`, las funciones `acceso_vigente()` y
--   compañía, `benefits.requiere_acceso` y el trigger de `memberships`).
--   Hoy los aportes tienen `acceso_desde`/`acceso_hasta` en NULL: el libro
--   existe, pero todavía no habilita nada.
-- =====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_min_messages = warning;


-- ---------------------------------------------------------------------
-- 1) Tablas
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.destinos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    nombre text NOT NULL,
    slug text NOT NULL,
    descripcion text,
    imagen_url text,
    meta_monto numeric,
    cupos_totales integer,
    visibilidad_beneficiario text DEFAULT 'anonimizado'::text NOT NULL,
    estado text DEFAULT 'borrador'::text NOT NULL,
    admite_puntual boolean DEFAULT true NOT NULL,
    admite_recurrente boolean DEFAULT false NOT NULL,
    fecha_inicio date,
    fecha_fin date,
    orden integer DEFAULT 0 NOT NULL,
    monto_recaudado numeric DEFAULT 0 NOT NULL,
    cantidad_aportes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    monto_rendido numeric DEFAULT 0 NOT NULL,
    cantidad_gastos_rendidos integer DEFAULT 0 NOT NULL,
    CONSTRAINT destinos_admite_algo_chk CHECK ((admite_puntual OR admite_recurrente)),
    CONSTRAINT destinos_cupos_totales_check CHECK ((cupos_totales > 0)),
    CONSTRAINT destinos_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'activo'::text, 'pausado'::text, 'cerrado'::text]))),
    CONSTRAINT destinos_fechas_chk CHECK (((fecha_fin IS NULL) OR (fecha_inicio IS NULL) OR (fecha_fin >= fecha_inicio))),
    CONSTRAINT destinos_meta_monto_check CHECK ((meta_monto > (0)::numeric)),
    CONSTRAINT destinos_tipo_check CHECK ((tipo = ANY (ARRAY['campana'::text, 'padrinable'::text, 'institucional'::text]))),
    CONSTRAINT destinos_visibilidad_beneficiario_check CHECK ((visibilidad_beneficiario = ANY (ARRAY['publico'::text, 'anonimizado'::text])))
);

CREATE TABLE IF NOT EXISTS public.aportes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email_aportante text,
    nombre_aportante text,
    monto numeric NOT NULL,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    destino_id uuid NOT NULL,
    origen text NOT NULL,
    donation_id uuid,
    membership_id uuid,
    referencia_externa text,
    acceso_desde date,
    acceso_hasta date,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aportes_acceso_chk CHECK ((((acceso_desde IS NULL) AND (acceso_hasta IS NULL)) OR ((acceso_desde IS NOT NULL) AND (acceso_hasta IS NOT NULL) AND (acceso_hasta >= acceso_desde)))),
    CONSTRAINT aportes_monto_check CHECK ((monto > (0)::numeric)),
    CONSTRAINT aportes_origen_check CHECK ((origen = ANY (ARRAY['donacion'::text, 'membresia'::text, 'manual'::text]))),
    CONSTRAINT aportes_origen_chk CHECK ((((origen = 'donacion'::text) AND (donation_id IS NOT NULL) AND (membership_id IS NULL)) OR ((origen = 'membresia'::text) AND (membership_id IS NOT NULL) AND (donation_id IS NULL)) OR ((origen = 'manual'::text) AND (donation_id IS NULL) AND (membership_id IS NULL))))
);

CREATE TABLE IF NOT EXISTS public.gastos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    destino_id uuid NOT NULL,
    concepto text NOT NULL,
    monto numeric NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    categoria text,
    proveedor text,
    comprobante_path text,
    comprobante_nombre text,
    comprobante_mime text,
    comprobante_size bigint,
    tiene_comprobante boolean GENERATED ALWAYS AS ((comprobante_path IS NOT NULL)) STORED,
    publicado boolean DEFAULT false NOT NULL,
    created_by uuid,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gastos_comprobante_size_check CHECK (((comprobante_size IS NULL) OR (comprobante_size > 0))),
    CONSTRAINT gastos_monto_check CHECK ((monto > (0)::numeric))
);


-- Columnas de destino en las tablas de cobro. Van después de `destinos` porque
-- la referencian.

ALTER TABLE public.donations   ADD COLUMN IF NOT EXISTS destino_id uuid;

ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS destino_id uuid;


-- ---------------------------------------------------------------------
-- 2) Constraints (guardadas: `ADD CONSTRAINT` no acepta IF NOT EXISTS)
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_pkey'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE ONLY public.aportes ADD CONSTRAINT aportes_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_referencia_externa_key'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE ONLY public.aportes ADD CONSTRAINT aportes_referencia_externa_key UNIQUE (referencia_externa);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinos_pkey'
                   AND conrelid = 'public.destinos'::regclass) THEN
    ALTER TABLE ONLY public.destinos ADD CONSTRAINT destinos_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'destinos_slug_key'
                   AND conrelid = 'public.destinos'::regclass) THEN
    ALTER TABLE ONLY public.destinos ADD CONSTRAINT destinos_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gastos_pkey'
                   AND conrelid = 'public.gastos'::regclass) THEN
    ALTER TABLE ONLY public.gastos ADD CONSTRAINT gastos_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_destino_id_fkey'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE ONLY public.aportes ADD CONSTRAINT aportes_destino_id_fkey FOREIGN KEY (destino_id) REFERENCES public.destinos(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_donation_id_fkey'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE ONLY public.aportes ADD CONSTRAINT aportes_donation_id_fkey FOREIGN KEY (donation_id) REFERENCES public.donations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_membership_id_fkey'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE ONLY public.aportes ADD CONSTRAINT aportes_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aportes_user_id_fkey'
                   AND conrelid = 'public.aportes'::regclass) THEN
    ALTER TABLE ONLY public.aportes ADD CONSTRAINT aportes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_destino_id_fkey'
                   AND conrelid = 'public.donations'::regclass) THEN
    ALTER TABLE ONLY public.donations ADD CONSTRAINT donations_destino_id_fkey FOREIGN KEY (destino_id) REFERENCES public.destinos(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gastos_created_by_fkey'
                   AND conrelid = 'public.gastos'::regclass) THEN
    ALTER TABLE ONLY public.gastos ADD CONSTRAINT gastos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gastos_destino_id_fkey'
                   AND conrelid = 'public.gastos'::regclass) THEN
    ALTER TABLE ONLY public.gastos ADD CONSTRAINT gastos_destino_id_fkey FOREIGN KEY (destino_id) REFERENCES public.destinos(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_destino_id_fkey'
                   AND conrelid = 'public.memberships'::regclass) THEN
    ALTER TABLE ONLY public.memberships ADD CONSTRAINT memberships_destino_id_fkey FOREIGN KEY (destino_id) REFERENCES public.destinos(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3) Índices
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_aportes_destino ON public.aportes USING btree (destino_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_aportes_email ON public.aportes USING btree (lower(email_aportante));

CREATE INDEX IF NOT EXISTS idx_aportes_user_acceso ON public.aportes USING btree (user_id, acceso_hasta DESC);

CREATE INDEX IF NOT EXISTS idx_destinos_estado_tipo ON public.destinos USING btree (estado, tipo);

CREATE INDEX IF NOT EXISTS idx_destinos_slug ON public.destinos USING btree (slug);

CREATE INDEX IF NOT EXISTS idx_gastos_destino ON public.gastos USING btree (destino_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_gastos_publicado ON public.gastos USING btree (publicado) WHERE publicado;

CREATE INDEX IF NOT EXISTS idx_donations_destino ON public.donations USING btree (destino_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_membresia_viva_por_destino ON public.memberships USING btree (user_id, destino_id) WHERE ((status = ANY (ARRAY['pending'::text, 'active'::text, 'paused'::text])) AND (user_id IS NOT NULL) AND (destino_id IS NOT NULL));


-- ---------------------------------------------------------------------
-- 4) Funciones (tal como están en producción)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.destino_por_defecto()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.destinos
   WHERE tipo = 'institucional' AND estado = 'activo'
   ORDER BY orden, created_at
   LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.aporte_desde_donacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_destino uuid;
  v_ref     text;
BEGIN
  -- Solo el dinero que efectivamente entró. Una donación `pending` es una
  -- intención de pago, no un aporte.
  IF COALESCE(NEW.status, '') <> 'approved' THEN
    RETURN NULL;
  END IF;

  -- `aportes.monto` tiene CHECK (monto > 0). Sin esta guarda, una fila rara en
  -- `donations` haría fallar el trigger y con él la donación entera.
  IF COALESCE(NEW.amount, 0) <= 0 THEN
    RAISE WARNING 'aporte_desde_donacion: donacion % con monto invalido (%), no entra al libro', NEW.id, NEW.amount;
    RETURN NULL;
  END IF;

  -- ⬅️ EL CAMBIO. Si el canal informó destino, se respeta; si no, institucional.
  --
  -- Ojo con el orden: `destino_por_defecto()` solo se evalúa cuando hace falta,
  -- pero igual se valida el resultado, porque un `destino_id` que apunte a un
  -- destino borrado quedaría en NULL por el ON DELETE SET NULL y volvería acá.
  v_destino := COALESCE(NEW.destino_id, public.destino_por_defecto());
  IF v_destino IS NULL THEN
    RAISE WARNING 'aporte_desde_donacion: no hay destino institucional activo, la donacion % no entra al libro', NEW.id;
    RETURN NULL;
  END IF;

  -- IDEMPOTENCIA. Los webhooks de pago REINTENTAN: sin esto, un mismo cobro
  -- entra dos veces al libro y la rendición queda mal para siempre.
  v_ref := COALESCE(NULLIF(NEW.payment_id, ''), 'donacion:' || NEW.id::text);

  BEGIN
    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, donation_id, referencia_externa, notas
    ) VALUES (
      NEW.user_id,
      NEW.amount,
      COALESCE(NEW.created_at, now()),
      v_destino,
      'donacion',
      NEW.id,
      v_ref,
      'Alta automatica desde donations (' || COALESCE(NEW.payment_provider, 'sin proveedor') || ').'
    )
    -- ⚠️ DO NOTHING y NO "DO UPDATE SET destino_id", que era la tentación obvia.
    --
    -- Con DO UPDATE, cada reintento del webhook pisaría el destino del aporte. Y
    -- como la comisión puede re-imputar un aporte mal dirigido desde el panel,
    -- el próximo reintento le desharía la corrección en silencio. Entre "el
    -- trigger crea y nunca modifica" y "el trigger sincroniza", la primera es la
    -- única que deja que una corrección humana sobreviva.
    ON CONFLICT (referencia_externa) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ver la regla de oro: se pierde el renglón del libro, no el registro del
    -- cobro. El WARNING queda en los logs de Postgres.
    RAISE WARNING 'aporte_desde_donacion: no se pudo registrar el aporte de la donacion %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.recalcular_totales_destino(p_destino_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.destinos d
     SET monto_recaudado  = COALESCE(t.suma, 0),
         cantidad_aportes = COALESCE(t.cuenta, 0),
         updated_at       = now()
    FROM (
      SELECT COALESCE(SUM(monto), 0) AS suma, COUNT(*) AS cuenta
        FROM public.aportes WHERE destino_id = p_destino_id
    ) t
   WHERE d.id = p_destino_id;
$function$
;

CREATE OR REPLACE FUNCTION public.recalcular_rendicion_destino(p_destino_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.destinos d
     SET monto_rendido            = COALESCE(t.suma, 0),
         cantidad_gastos_rendidos = COALESCE(t.cuenta, 0),
         updated_at               = now()
    FROM (
      SELECT COALESCE(SUM(monto), 0) AS suma, COUNT(*) AS cuenta
        FROM public.gastos
       WHERE destino_id = p_destino_id
         AND publicado
    ) t
   WHERE d.id = p_destino_id;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_aportes_totales()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- En UPDATE el aporte puede haber cambiado de destino: hay que recalcular
  -- los dos, si no el viejo queda inflado para siempre.
  IF TG_OP IN ('UPDATE','DELETE') THEN
    PERFORM public.recalcular_totales_destino(OLD.destino_id);
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalcular_totales_destino(NEW.destino_id);
  END IF;
  RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.trg_gastos_totales()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- En UPDATE el gasto puede haber cambiado de destino: hay que recalcular los
  -- dos, si no el viejo queda inflado para siempre. Es el mismo cuidado que en
  -- `trg_aportes_totales`, y el motivo por el que se recalcula en vez de sumar
  -- deltas: un contador que suma deltas se desincroniza en el primer UPDATE.
  IF TG_OP IN ('UPDATE','DELETE') THEN
    PERFORM public.recalcular_rendicion_destino(OLD.destino_id);
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalcular_rendicion_destino(NEW.destino_id);
  END IF;
  RETURN NULL;
END $function$
;


-- ---------------------------------------------------------------------
-- 5) Triggers
-- ---------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_aporte_desde_donacion ON public.donations;
CREATE TRIGGER trg_aporte_desde_donacion AFTER INSERT OR UPDATE OF status, amount, destino_id ON public.donations FOR EACH ROW EXECUTE FUNCTION public.aporte_desde_donacion();

DROP TRIGGER IF EXISTS trg_aportes_totales ON public.aportes;
CREATE TRIGGER trg_aportes_totales AFTER INSERT OR DELETE OR UPDATE ON public.aportes FOR EACH ROW EXECUTE FUNCTION public.trg_aportes_totales();

DROP TRIGGER IF EXISTS trg_gastos_totales ON public.gastos;
CREATE TRIGGER trg_gastos_totales AFTER INSERT OR DELETE OR UPDATE ON public.gastos FOR EACH ROW EXECUTE FUNCTION public.trg_gastos_totales();


-- ---------------------------------------------------------------------
-- 6) RLS y policies
-- ---------------------------------------------------------------------

ALTER TABLE public.destinos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.aportes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aportes_insert_board_manual ON public.aportes;
CREATE POLICY aportes_insert_board_manual ON public.aportes FOR INSERT TO authenticated WITH CHECK ((public.is_board_member() AND (origen = 'manual'::text)));

DROP POLICY IF EXISTS aportes_select_board ON public.aportes;
CREATE POLICY aportes_select_board ON public.aportes FOR SELECT TO authenticated USING (public.is_board_member());

DROP POLICY IF EXISTS aportes_select_propio ON public.aportes;
CREATE POLICY aportes_select_propio ON public.aportes FOR SELECT TO authenticated USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS aportes_update_board ON public.aportes;
CREATE POLICY aportes_update_board ON public.aportes FOR UPDATE TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

DROP POLICY IF EXISTS destinos_board_all ON public.destinos;
CREATE POLICY destinos_board_all ON public.destinos TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

DROP POLICY IF EXISTS destinos_public_read_activos ON public.destinos;
CREATE POLICY destinos_public_read_activos ON public.destinos FOR SELECT USING ((estado = 'activo'::text));

DROP POLICY IF EXISTS gastos_board_all ON public.gastos;
CREATE POLICY gastos_board_all ON public.gastos TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

DROP POLICY IF EXISTS gastos_public_read_publicados ON public.gastos;
CREATE POLICY gastos_public_read_publicados ON public.gastos FOR SELECT USING ((publicado AND (EXISTS ( SELECT 1
   FROM public.destinos d
  WHERE ((d.id = gastos.destino_id) AND (d.estado = 'activo'::text))))));


-- ---------------------------------------------------------------------
-- 7) Comentarios
-- ---------------------------------------------------------------------

COMMENT ON COLUMN public.destinos.monto_rendido IS 'Suma de gastos PUBLICADOS. No es el total gastado: es el total rendido públicamente.';

COMMENT ON COLUMN public.destinos.cantidad_gastos_rendidos IS 'Cantidad de gastos publicados. Coincide siempre con las filas de gastos que ve el público.';

COMMENT ON COLUMN public.donations.destino_id IS 'Destino elegido por quien dona, si el canal lo informó. NULL = no lo informó (p. ej. el link directo de MercadoPago); el trigger cae al destino institucional.';

-- ---------------------------------------------------------------------
-- 8) Restos del baseline de julio que producción ya no tiene
--
-- Sin esto, una base recreada desde cero NO es igual a la productiva, que es
-- justo el problema que esta migración viene a cerrar. Contra producción las
-- dos sentencias son no-ops.
-- ---------------------------------------------------------------------

-- La vista unía `memberships` y `donations` para armar el historial de aportes
-- de una persona. Es exactamente lo que `aportes` hace mejor y con destino, así
-- que se reemplazó. Verificado el 2026-08-30: no la consulta ningún archivo de
-- `src/` ni de `api/`.
DROP VIEW IF EXISTS public.user_support_history;

-- Redundante con `uq_membresia_viva_por_destino`, que lleva `user_id` como
-- primera columna. Si alguna consulta por membresías canceladas llega a
-- necesitarlo, se agrega — pero en las dos bases, no en una sola.
DROP INDEX IF EXISTS public.idx_memberships_user_id;

-- ---------------------------------------------------------------------
-- 9) GRANTs — el paso que un `pg_dump --no-privileges` no trae
--
-- ⚠️ Sin esto, una base recreada desde cero queda MUCHO más permisiva que
-- producción: las tablas nuevas heredan el `GRANT ALL` a `anon` y
-- `authenticated` del default de Supabase, y `anon` termina con INSERT/UPDATE/
-- DELETE sobre el libro de aportes, sostenido solo por las policies. Producción
-- los tiene recortados a mano; el repo tiene que decir lo mismo.
--
-- Es el mismo problema que el ítem 10.1.g, pero en la tabla que otorga
-- privilegios: acá el margen de error tiene que ser cero.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.aportes  FROM anon, authenticated;
REVOKE ALL ON public.destinos FROM anon, authenticated;
REVOKE ALL ON public.gastos   FROM anon, authenticated;

-- `anon` no ve el libro: quién aportó y cuánto no es público.
GRANT SELECT, INSERT, UPDATE ON public.aportes  TO authenticated;

-- Los destinos y los gastos publicados sí son públicos: son la rendición de
-- cuentas de la Fundación. Qué fila se ve lo deciden las policies.
GRANT SELECT ON public.destinos TO anon;
GRANT SELECT ON public.gastos   TO anon;
GRANT SELECT, INSERT, UPDATE ON public.destinos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gastos   TO authenticated;
