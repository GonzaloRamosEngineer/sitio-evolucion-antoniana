-- =============================================================================
-- RECLAMO UNIVERSAL DE HUELLAS — ROADMAP §10.1.c, la mitad que faltaba.
--
-- EL NÚMERO QUE JUSTIFICA ESTA MIGRACIÓN (medido el 2026-09-05 contra producción):
--
--   education_preinscriptions   160 filas, 156 emails distintos, feb–mar 2026
--   de esas, con cuenta:          4
--   users:                       23
--   con acceso vigente:           1
--
-- **La base de contactos más grande de la Fundación es siete veces el sistema
-- entero, y el sistema la ve como nadie.** 156 personas levantaron la mano, y
-- si mañana crean una cuenta con el mismo mail, nada las reconoce.
--
-- ⚠️ Y de paso corrige una premisa del ROADMAP: §10.1.c nombra a `registrations`
-- y a educación como si fueran el mismo problema. En la base, `registrations`
-- tiene 5 filas y **0 invitados** — ahí no hay nada que reconciliar. El problema
-- es uno solo y está en educación.
--
-- POR QUÉ UN MECANISMO Y NO UN PARCHE POR TABLA
--
-- §10.19 resolvió esto para `donations` con una función dedicada. Escribir ahora
-- `reclamar_preinscripciones()`, y mañana `reclamar_inscripciones()`, y en el
-- cliente 2 `reclamar_voluntariados()`, es tres veces la misma lógica de
-- seguridad — y la tercera copia es donde se olvida el `email_verificado`.
--
-- Acá la lista de qué se puede reclamar es un DATO (`fuentes_reclamables`). Un
-- cliente nuevo con su propia tabla de huellas inserta una fila, no escribe SQL.
--
-- LA REGLA DE SEGURIDAD NO CAMBIA, Y ES LA DE §10.19: el email es una **pista**,
-- no una credencial. Hacen falta las tres cosas, y ninguna sobra:
--   1. Sesión iniciada  -> `auth.uid()`, nunca un uuid por parámetro.
--   2. Email verificado -> `public.email_verificado()`, o el mail no prueba nada.
--   3. Un acto explícito -> esto no lo llama ningún trigger.
--
-- ⚠️ LO QUE ESTA MIGRACIÓN NO HACE, A PROPÓSITO: no otorga acceso. Vincular una
-- preinscripción es reconocer a una persona, no darle beneficios. Lo único que
-- otorga acceso sigue siendo `reclamar_donaciones()` (§10.19), y se lo invoca
-- desde acá en vez de reimplementarlo — una segunda implementación de "cuánto
-- acceso da esto" es una promesa que en algún momento deja de cumplirse.
--
-- Idempotente en los dos sentidos: la migración se puede aplicar dos veces, y
-- `reclamar_huellas()` se puede llamar dos veces (la segunda no encuentra nada,
-- porque la primera dejó de cumplir el filtro `col_user IS NULL`).
-- =============================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) El registro de fuentes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuentes_reclamables (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Siempre en `public`. No se guarda el schema para que no haya forma de
  -- apuntar esto a `auth` o a `storage`.
  tabla     text NOT NULL UNIQUE,
  col_email text NOT NULL,
  col_user  text NOT NULL,
  col_fecha text,

  -- Cómo se le nombra a la persona lo que va a reclamar. Es la única columna de
  -- texto de cara al público, y va acá y no en `entidad.js` porque depende de la
  -- tabla, no de la entidad: "tu preinscripción a Educación" se dice igual en
  -- una fundación que en un club.
  etiqueta  text NOT NULL,

  -- Columnas a poner en NULL al vincular. Existe por un caso real: el CHECK
  -- `check_registration_type` de `registrations` obliga a que sea `user_id` O
  -- invitado, nunca las dos cosas, así que sin limpiar `guest_name`/`guest_email`
  -- el UPDATE viola la restricción. No se pierde nada: el mail que se borra es
  -- el mismo que está en la cuenta a la que la fila queda apuntando.
  cols_a_limpiar text[] NOT NULL DEFAULT '{}',

  activa    boolean NOT NULL DEFAULT true,
  orden     integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fuentes_reclamables IS
  'Que tablas guardan huellas de personas sin cuenta y se pueden reclamar con email verificado (ROADMAP 10.1.c). Registro, no codigo: un cliente nuevo agrega una fila.';

-- ---------------------------------------------------------------------
-- 2) La validación — por qué el registro no puede tener basura
--
-- Estas identificadores terminan dentro de SQL dinámico. `format(%I)` los cita y
-- eso ya cierra la inyección, pero una tabla inexistente o una columna mal
-- escrita haría fallar el reclamo entero en tiempo de ejecución, para todos.
-- Se valida al INSERTAR, que es cuando hay alguien mirando.
--
-- Y LA LISTA NEGRA, QUE ES LA PARTE IMPORTANTE: hay tablas que **no pueden**
-- reclamarse por este camino porque vincularlas no es reconocer a alguien, es
-- **otorgarle privilegios**. `donations` y `memberships` dan acceso al club;
-- `aportes` es el libro; `miembros` es la condición institucional. Para esas hay
-- un camino propio, con su propia lógica de cuánto acceso corresponde.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fuentes_reclamables_validar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  v_col text;
BEGIN
  IF NEW.tabla IN ('donations','memberships','aportes','miembros','users','club_canjes') THEN
    RAISE EXCEPTION
      'La tabla % no se puede reclamar por este camino: vincularla otorga privilegios, no solo identidad. Las donaciones tienen public.reclamar_donaciones() (ROADMAP 10.19).', NEW.tabla
      USING ERRCODE = '22023';
  END IF;

  IF to_regclass('public.' || quote_ident(NEW.tabla)) IS NULL THEN
    RAISE EXCEPTION 'No existe la tabla public.%', NEW.tabla USING ERRCODE = '42P01';
  END IF;

  FOREACH v_col IN ARRAY (ARRAY[NEW.col_email, NEW.col_user] || NEW.cols_a_limpiar ||
                          CASE WHEN NEW.col_fecha IS NULL THEN '{}'::text[] ELSE ARRAY[NEW.col_fecha] END)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns c
                    WHERE c.table_schema = 'public' AND c.table_name = NEW.tabla
                      AND c.column_name = v_col) THEN
      RAISE EXCEPTION 'public.% no tiene la columna %', NEW.tabla, v_col USING ERRCODE = '42703';
    END IF;
  END LOOP;

  -- `col_user` tiene que ser un uuid nullable: si no es nullable, "sin cuenta"
  -- no se puede representar y la fuente no tiene sentido.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema = 'public' AND c.table_name = NEW.tabla
                    AND c.column_name = NEW.col_user
                    AND c.data_type = 'uuid' AND c.is_nullable = 'YES') THEN
    RAISE EXCEPTION 'public.%.% tiene que ser uuid y nullable para poder representar "sin cuenta".',
      NEW.tabla, NEW.col_user USING ERRCODE = '42804';
  END IF;

  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS trg_fuentes_reclamables_validar ON public.fuentes_reclamables;
CREATE TRIGGER trg_fuentes_reclamables_validar
  BEFORE INSERT OR UPDATE ON public.fuentes_reclamables
  FOR EACH ROW EXECUTE FUNCTION public.fuentes_reclamables_validar();

-- ---------------------------------------------------------------------
-- 3) Las fuentes de este cliente
--
-- Van como datos y no en el baseline porque son configuración, no esquema. Otra
-- entidad tendrá otras.
-- ---------------------------------------------------------------------
INSERT INTO public.fuentes_reclamables (tabla, col_email, col_user, col_fecha, etiqueta, cols_a_limpiar, orden)
SELECT 'education_preinscriptions', 'email', 'user_id', 'created_at', 'Preinscripción a Educación', '{}', 10
WHERE NOT EXISTS (SELECT 1 FROM public.fuentes_reclamables WHERE tabla = 'education_preinscriptions');

INSERT INTO public.fuentes_reclamables (tabla, col_email, col_user, col_fecha, etiqueta, cols_a_limpiar, orden)
SELECT 'registrations', 'guest_email', 'user_id', 'registered_at', 'Inscripción a una actividad',
       ARRAY['guest_name','guest_email'], 20
WHERE NOT EXISTS (SELECT 1 FROM public.fuentes_reclamables WHERE tabla = 'registrations');

-- ---------------------------------------------------------------------
-- 4) Auditoría
--
-- El equivalente genérico de `donations.reclamado_en` (§10.19). No se puede
-- agregar una columna a cada tabla del registro —son de otro dueño y el registro
-- es abierto—, así que la traza vive acá.
--
-- Sirve para la pregunta que aparece cuando algo sale mal: "¿esta fila la
-- vinculó el formulario o alguien la reclamó después, y cuándo?".
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reclamos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tabla      text NOT NULL,
  cantidad   integer NOT NULL CHECK (cantidad >= 0),
  email_usado text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reclamos_user ON public.reclamos (user_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 5) Qué habría para reclamar
--
-- Sin efectos: es lo que la pantalla consulta para decidir si ofrece algo. Si el
-- email no está verificado devuelve vacío, y eso es correcto — no hay que
-- mostrarle a nadie algo que todavía no puede reclamar.
--
-- El bloque `EXCEPTION WHEN OTHERS` no es pereza: una fuente rota (tabla
-- renombrada, columna borrada) no puede dejar sin reclamo a las demás. Se avisa
-- con WARNING y se sigue, que es lo contrario de fallar en silencio.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.huellas_reclamables()
RETURNS TABLE (tabla text, etiqueta text, cantidad integer, desde date, hasta date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_f     record;
  v_sql   text;
  v_row   record;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT lower(u.email) INTO v_email
    FROM auth.users u
   WHERE u.id = v_uid AND public.email_verificado(u.id);

  IF v_email IS NULL THEN RETURN; END IF;

  FOR v_f IN SELECT * FROM public.fuentes_reclamables WHERE activa ORDER BY orden, tabla
  LOOP
    BEGIN
      v_sql := format(
        'SELECT count(*)::int AS n, %s AS desde, %s AS hasta
           FROM public.%I
          WHERE %I IS NULL AND lower(%I) = $1',
        CASE WHEN v_f.col_fecha IS NULL THEN 'NULL::date'
             ELSE format('min(%I)::date', v_f.col_fecha) END,
        CASE WHEN v_f.col_fecha IS NULL THEN 'NULL::date'
             ELSE format('max(%I)::date', v_f.col_fecha) END,
        v_f.tabla, v_f.col_user, v_f.col_email);

      EXECUTE v_sql INTO v_row USING v_email;

      IF v_row.n > 0 THEN
        tabla := v_f.tabla; etiqueta := v_f.etiqueta;
        cantidad := v_row.n; desde := v_row.desde; hasta := v_row.hasta;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'huellas_reclamables: la fuente % fallo y se salteo: %', v_f.tabla, SQLERRM;
    END;
  END LOOP;
END $fn$;

COMMENT ON FUNCTION public.huellas_reclamables() IS
  'Huellas sin cuenta que coinciden con el email VERIFICADO de la sesion actual. Solo informa: no vincula nada. Vacio si el email no esta verificado.';

-- ---------------------------------------------------------------------
-- 6) El reclamo
--
-- `reclamar_donaciones()` PRIMERO y por separado: es la única parte que otorga
-- acceso, ya está probada (`reclamar-check.sql`) y no se toca. Acá se la invoca,
-- no se la copia.
--
-- Si esa llamada falla —típicamente porque el email no está verificado— falla
-- todo, y está bien: las dos mitades exigen exactamente lo mismo, así que un
-- reclamo a medias sería un estado que nadie sabría interpretar.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reclamar_huellas()
RETURNS TABLE (tabla text, etiqueta text, vinculadas integer, meses_nuevos integer, vence_el date)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_f     record;
  v_sql   text;
  v_n     integer;
  v_don   record;
  v_set   text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Hay que iniciar sesion para reclamar.' USING ERRCODE = '28000';
  END IF;

  SELECT lower(u.email) INTO v_email
    FROM auth.users u
   WHERE u.id = v_uid AND public.email_verificado(u.id);

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Falta verificar el email de la cuenta antes de reclamar.' USING ERRCODE = '28000';
  END IF;

  -- a) Los aportes, con su acceso. Camino propio, sin cambios.
  SELECT * INTO v_don FROM public.reclamar_donaciones();
  IF COALESCE(v_don.vinculadas, 0) > 0 THEN
    tabla := 'donations'; etiqueta := 'Donación';
    vinculadas := v_don.vinculadas; meses_nuevos := v_don.meses_nuevos; vence_el := v_don.vence_el;
    RETURN NEXT;
  END IF;

  -- b) Las huellas del registro: identidad, sin acceso.
  FOR v_f IN SELECT * FROM public.fuentes_reclamables WHERE activa ORDER BY orden, tabla
  LOOP
    BEGIN
      -- Las columnas a limpiar se arman con %I una por una. `array_to_string`
      -- sobre los nombres crudos sería el agujero que `%I` está evitando.
      v_set := '';
      IF array_length(v_f.cols_a_limpiar, 1) IS NOT NULL THEN
        SELECT string_agg(format(', %I = NULL', c), '')
          INTO v_set FROM unnest(v_f.cols_a_limpiar) c;
      END IF;

      v_sql := format(
        'WITH tocadas AS (
           UPDATE public.%I SET %I = $1 %s
            WHERE %I IS NULL AND lower(%I) = $2
            RETURNING 1)
         SELECT count(*)::int FROM tocadas',
        v_f.tabla, v_f.col_user, COALESCE(v_set, ''), v_f.col_user, v_f.col_email);

      EXECUTE v_sql INTO v_n USING v_uid, v_email;

      IF v_n > 0 THEN
        INSERT INTO public.reclamos (user_id, tabla, cantidad, email_usado)
        VALUES (v_uid, v_f.tabla, v_n, v_email);

        tabla := v_f.tabla; etiqueta := v_f.etiqueta;
        vinculadas := v_n; meses_nuevos := 0; vence_el := NULL;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Una fuente rota no puede hacer perder el reclamo de las otras, ni el de
      -- las donaciones, que es el que tiene valor económico.
      RAISE WARNING 'reclamar_huellas: la fuente % fallo y se salteo: %', v_f.tabla, SQLERRM;
    END;
  END LOOP;
END $fn$;

COMMENT ON FUNCTION public.reclamar_huellas() IS
  'Vincula a la sesion actual toda huella dejada con su email VERIFICADO. Delega las donaciones en reclamar_donaciones() (lo unico que otorga acceso). Acto explicito: no lo llama ningun trigger. Idempotente.';

-- ---------------------------------------------------------------------
-- 7) La vista de la entidad: a quiénes NO reconoce el sistema
--
-- DECISIÓN DE PRODUCTO (2026-09-05): la entidad ve quiénes son y decide ella si
-- los contacta. El sistema **no manda nada solo**.
--
-- Y ese "no manda nada solo" no es prudencia genérica. Las 156 personas de
-- educación dejaron su email en un formulario de preinscripción a un programa,
-- entre febrero y marzo. Escribirles por otra cosa es una decisión de la
-- entidad —que es la responsable de esos datos—, no un efecto lateral de haber
-- construido la cañería.
--
-- POR QUÉ ES UN RESUMEN Y NO UN LISTADO DE EMAILS. La comisión necesita saber
-- **cuántos hay y de dónde salieron** para decidir; para eso no hace falta
-- volcarle 156 direcciones a una pantalla que después alguien copia y pega. El
-- detalle nominal ya está en el ABM de cada módulo, con su propia RLS.
--
-- ⚠️ `is_board_member()` adentro y no solo en la policy: es SECURITY DEFINER, y
-- sin el chequeo cualquiera con sesión podría contar las huellas de la entidad.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.huellas_sin_cuenta()
RETURNS TABLE (
  tabla         text,
  etiqueta      text,
  total         integer,
  emails_unicos integer,
  con_cuenta    integer,
  desde         date,
  hasta         date
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_f   record;
  v_sql text;
  v_row record;
BEGIN
  IF NOT public.is_board_member() THEN
    RAISE EXCEPTION 'Solo la comision puede ver el resumen de huellas sin cuenta.'
      USING ERRCODE = '42501';
  END IF;

  FOR v_f IN SELECT * FROM public.fuentes_reclamables WHERE activa ORDER BY orden, tabla
  LOOP
    BEGIN
      -- `con_cuenta` es el dato que convierte el número en una decisión: 160
      -- huellas de las que 4 ya tienen usuario significa que hay 152 personas
      -- que el sistema no conoce, no 160.
      v_sql := format(
        'SELECT count(*)::int AS total,
                count(DISTINCT lower(%I))::int AS emails,
                count(*) FILTER (
                  WHERE EXISTS (SELECT 1 FROM public.users u
                                 WHERE lower(u.email) = lower(t.%I)))::int AS con_cuenta,
                %s AS desde, %s AS hasta
           FROM public.%I t
          WHERE t.%I IS NULL AND t.%I IS NOT NULL',
        v_f.col_email, v_f.col_email,
        CASE WHEN v_f.col_fecha IS NULL THEN 'NULL::date'
             ELSE format('min(t.%I)::date', v_f.col_fecha) END,
        CASE WHEN v_f.col_fecha IS NULL THEN 'NULL::date'
             ELSE format('max(t.%I)::date', v_f.col_fecha) END,
        v_f.tabla, v_f.col_user, v_f.col_email);

      EXECUTE v_sql INTO v_row;

      IF v_row.total > 0 THEN
        tabla := v_f.tabla;   etiqueta := v_f.etiqueta;
        total := v_row.total; emails_unicos := v_row.emails;
        con_cuenta := v_row.con_cuenta;
        desde := v_row.desde; hasta := v_row.hasta;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'huellas_sin_cuenta: la fuente % fallo y se salteo: %', v_f.tabla, SQLERRM;
    END;
  END LOOP;
END $fn$;

COMMENT ON FUNCTION public.huellas_sin_cuenta() IS
  'Resumen por fuente de las huellas sin cuenta, para la comision. Cuenta, no lista: la decision de contactar es de la entidad y no necesita 156 emails en pantalla.';

-- ---------------------------------------------------------------------
-- 8) Permisos
-- ---------------------------------------------------------------------
ALTER TABLE public.fuentes_reclamables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamos            ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.fuentes_reclamables FROM anon, authenticated;
REVOKE ALL ON public.reclamos            FROM anon, authenticated;
GRANT SELECT ON public.reclamos TO authenticated;

DROP POLICY IF EXISTS fuentes_reclamables_board_all ON public.fuentes_reclamables;
CREATE POLICY fuentes_reclamables_board_all ON public.fuentes_reclamables
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

DROP POLICY IF EXISTS reclamos_self_read ON public.reclamos;
CREATE POLICY reclamos_self_read ON public.reclamos
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_board_member());

-- `anon` no ejecuta ninguna: sin sesión no hay nada que reclamar, y abiertas
-- convertirían `huellas_reclamables()` en un oráculo para preguntar si un email
-- dado dejó huellas — un dato que no le corresponde a nadie sin sesión.
REVOKE ALL ON FUNCTION public.huellas_reclamables() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reclamar_huellas()    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fuentes_reclamables_validar() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.huellas_sin_cuenta()  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.huellas_reclamables() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reclamar_huellas()    TO authenticated, service_role;
-- `authenticated` la puede EJECUTAR, pero la función rechaza a quien no es
-- comisión. Es el mismo reparto que `cambiar_estado_miembro()`: el GRANT deja
-- llamar, la función decide.
GRANT EXECUTE ON FUNCTION public.huellas_sin_cuenta()  TO authenticated, service_role;
