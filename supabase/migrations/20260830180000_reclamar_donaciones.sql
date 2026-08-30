-- =============================================================================
-- Reclamar una donación anónima: el email como pista, la persona como decisión.
--
-- POR QUÉ ESTO NO ES UNA TAREA DE PLOMERÍA
--
-- `donations.payer_email` (20260830170000) guarda el email de quien paga. La
-- tentación obvia es cerrar el círculo solo: emparejar ese email con
-- `auth.users.email` y completar `user_id` automáticamente. **Sería un error de
-- seguridad**, porque completar `user_id` no es anotar un dato: es **otorgar
-- acceso al club**, con su antigüedad y sus beneficios.
--
-- El email del checkout lo escribe quien paga, en el sitio de MercadoPago, sin
-- que nadie lo verifique contra nada. Quien escriba ahí el mail de otra
-- persona —por error o a propósito— le estaría transfiriendo el aporte.
--
-- DE AHÍ LA REGLA: el email es una **pista**, no una credencial. Habilita a
-- ofrecer; nunca a otorgar. Quien otorga es la persona que **demuestra
-- controlar la cuenta** y que además **decide hacerlo**.
--
-- Tres cosas hacen falta para que un reclamo prospere, y ninguna sobra:
--   1. Sesión iniciada  → `auth.uid()`, nunca un uuid por parámetro.
--   2. Email verificado → `email_confirmed_at`, o el mail no prueba nada.
--   3. Un acto explícito → esta función no la llama ningún trigger.
--
-- LA 1 NO ES COSMÉTICA. Es la misma lección que dejó `tiene_acceso()` en
-- §10.17: con una sola versión que reciba el uuid por parámetro y sea SECURITY
-- DEFINER, cualquier usuario logueado podría reclamar los aportes de otro. Acá
-- **no existe** la variante con parámetro, y por eso no hay forma de pedirla
-- para un tercero.
--
-- Idempotente en los dos sentidos: la migración se puede aplicar dos veces, y
-- `reclamar_donaciones()` se puede llamar dos veces —la segunda no encuentra
-- nada, porque la primera dejó de cumplirse el filtro `user_id IS NULL`.
-- =============================================================================

SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Trazabilidad
--
-- `user_id` solo dice a quién quedó atribuida la donación; no dice si la
-- atribuyó el webhook (porque había sesión) o una persona reclamándola después.
-- Cuando haya que auditar un acceso que alguien no debería tener, esa
-- diferencia es la primera pregunta.
-- ---------------------------------------------------------------------
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS reclamado_en timestamptz;

COMMENT ON COLUMN public.donations.reclamado_en IS
  'Cuándo el titular reclamó esta donación anónima (public.reclamar_donaciones). NULL = el user_id vino del pago mismo, o no hay user_id.';

-- ---------------------------------------------------------------------
-- 2) "¿Este email está verificado?", en un solo lugar
--
-- POR QUÉ ESTO NO ES UNA COMPARACIÓN INLINE
--
-- Supabase produce `auth.users.email_confirmed_at`. La imagen de Postgres con
-- la que se validan las migraciones en Docker (`supabase/checks/README.md`)
-- trae un `auth.users` de una versión anterior de GoTrue: tiene `confirmed_at`
-- y **no** tiene `email_confirmed_at`. Con la columna escrita a mano en cada
-- consulta, esta migración **no se puede aplicar en Docker** — y una migración
-- que solo se puede probar contra producción es exactamente lo que el repo
-- decidió no tener.
--
-- El nombre de la columna se resuelve UNA VEZ, al aplicar, y queda fijo en el
-- cuerpo de la función. Si no existiera ninguna de las dos, la migración falla
-- ruidosamente en vez de crear una función que diga "verificado" siempre.
-- ---------------------------------------------------------------------
DO $mig$
DECLARE
  v_col text;
BEGIN
  SELECT c.column_name INTO v_col
    FROM information_schema.columns c
   WHERE c.table_schema = 'auth' AND c.table_name = 'users'
     AND c.column_name IN ('email_confirmed_at', 'confirmed_at')
   ORDER BY CASE c.column_name WHEN 'email_confirmed_at' THEN 0 ELSE 1 END
   LIMIT 1;

  IF v_col IS NULL THEN
    RAISE EXCEPTION 'auth.users no tiene ni email_confirmed_at ni confirmed_at: no hay forma de saber si un email está verificado, y sin eso reclamar un aporte sería inseguro.';
  END IF;

  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public.email_verificado(p_user_id uuid)
    RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $body$
      SELECT EXISTS (
        SELECT 1 FROM auth.users u
         WHERE u.id = p_user_id AND u.%I IS NOT NULL AND u.email IS NOT NULL
      );
    $body$;
  $f$, v_col);
END $mig$;

COMMENT ON FUNCTION public.email_verificado(uuid) IS
  'true si la cuenta tiene el email confirmado. La columna (email_confirmed_at o confirmed_at) se resuelve al aplicar la migración, para que esto se pueda validar en el Postgres de Docker y no solo contra producción.';

-- Solo para uso interno de las funciones de este archivo. Abierta, sería un
-- oráculo para preguntar por el estado de la cuenta de otra persona.
REVOKE ALL ON FUNCTION public.email_verificado(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Qué habría para reclamar
--
-- Sin efectos: es lo que la pantalla consulta para decidir si ofrece algo. Si
-- el email no está verificado devuelve vacío, y eso es correcto — no hay que
-- mostrarle a nadie una donación que todavía no puede reclamar.
--
-- Devuelve `meses_estimados` con la MISMA función que usa el trigger
-- (`meses_por_donacion`), no una copia de la regla. Una segunda implementación
-- de la conversión es una promesa que en algún momento deja de cumplirse.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.donaciones_reclamables()
RETURNS TABLE (
  donation_id     uuid,
  fecha           timestamptz,
  monto           numeric,
  meses_estimados integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id,
         d.created_at,
         d.amount,
         CASE WHEN public.destino_otorga_acceso(
                     COALESCE(d.destino_id, public.destino_por_defecto()))
              THEN public.meses_por_donacion(d.amount)
              ELSE 0
         END
    FROM public.donations d
    JOIN auth.users u
      ON u.id = auth.uid()
     AND public.email_verificado(u.id)
     AND lower(u.email) = lower(d.payer_email)
   WHERE d.user_id IS NULL
     AND d.status = 'approved'
     AND d.payer_email IS NOT NULL
   ORDER BY d.created_at;
$$;

COMMENT ON FUNCTION public.donaciones_reclamables() IS
  'Donaciones anónimas que coinciden con el email VERIFICADO de la sesión actual. Solo informa: no vincula nada. Vacío si el email no está verificado.';

-- ---------------------------------------------------------------------
-- 4) El reclamo
--
-- DOS DECISIONES QUE CONVIENE DEJAR ESCRITAS:
--
-- a) **El acceso corre desde hoy, no desde la fecha de la donación.**
--    `proximo_acceso_desde()` devuelve `current_date` cuando no hay acceso
--    previo. Contar desde la fecha original sería aritméticamente más "fiel" y
--    en la práctica inútil: una donación de 2025 daría un mes vencido en 2025,
--    o sea nada. Si la entidad decidió que ese aporte otorga un mes, la persona
--    tiene que poder usarlo.
--
-- b) **Se actualiza el aporte que ya existe; no se crea uno nuevo.**
--    El trigger ya lo creó, con `user_id` NULL y sin acceso. Insertar otro
--    duplicaría la plata en la rendición. Y no alcanza con tocar `donations`:
--    el trigger tiene `ON CONFLICT (referencia_externa) DO NOTHING` a propósito
--    (§10.15, para que un reintento del webhook no pise una corrección de la
--    comisión), así que **completar el user_id de la donación no actualiza el
--    aporte por sí solo**. Por eso este UPDATE es explícito.
--
-- `FOR UPDATE` sobre las donaciones no es decorativo: sin él, dos pestañas
-- reclamando a la vez podrían leer las mismas filas y encadenar dos veces el
-- mismo período de acceso.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reclamar_donaciones()
RETURNS TABLE (
  vinculadas   integer,
  meses_nuevos integer,
  vence_el     date
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_email   text;
  v_don     record;
  v_destino uuid;
  v_meses   integer;
  v_desde   date;
  v_hasta   date;
  v_n       integer := 0;
  v_total   integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Hay que iniciar sesión para reclamar un aporte.'
      USING ERRCODE = '28000';
  END IF;

  SELECT lower(u.email) INTO v_email
    FROM auth.users u
   WHERE u.id = v_uid AND public.email_verificado(u.id);

  -- Mensaje distinto del anterior a propósito: "no tenés sesión" y "tu mail no
  -- está verificado" se resuelven de formas distintas, y un error genérico
  -- manda a la persona a adivinar.
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Falta verificar el email de la cuenta antes de reclamar un aporte.'
      USING ERRCODE = '28000';
  END IF;

  FOR v_don IN
    SELECT d.id, d.amount, d.destino_id
      FROM public.donations d
     WHERE d.user_id IS NULL
       AND d.status = 'approved'
       AND d.payer_email IS NOT NULL
       AND lower(d.payer_email) = v_email
     ORDER BY d.created_at
     FOR UPDATE
  LOOP
    UPDATE public.donations
       SET user_id = v_uid, reclamado_en = now()
     WHERE id = v_don.id;

    v_destino := COALESCE(v_don.destino_id, public.destino_por_defecto());

    v_meses := 0;
    IF public.destino_otorga_acceso(v_destino) THEN
      v_meses := public.meses_por_donacion(v_don.amount);
    END IF;

    v_desde := NULL;
    v_hasta := NULL;
    IF v_meses > 0 THEN
      -- Se recalcula en CADA vuelta, y por eso encadena: el UPDATE de la vuelta
      -- anterior ya escribió su `acceso_hasta`.
      v_desde := public.proximo_acceso_desde(v_uid);
      v_hasta := (v_desde + (v_meses * interval '1 month'))::date;
    END IF;

    -- Solo si el aporte sigue sin dueño. Si la comisión ya lo atribuyó a mano,
    -- su corrección manda — la misma regla que protege el `DO NOTHING`.
    UPDATE public.aportes a
       SET user_id       = v_uid,
           acceso_desde  = v_desde,
           acceso_hasta  = v_hasta,
           notas         = COALESCE(a.notas, '') ||
                           format(' Reclamado por su titular el %s.', current_date)
     WHERE a.donation_id = v_don.id
       AND a.user_id IS NULL;

    IF FOUND THEN
      v_total := v_total + v_meses;
    ELSE
      -- La donación queda vinculada igual: el dato es cierto aunque el libro no
      -- tenga el renglón (el trigger pudo haber fallado por la regla de oro).
      RAISE WARNING 'reclamar_donaciones: la donacion % no tiene aporte propio sin dueño; se vinculó la donación pero no se otorgó acceso', v_don.id;
    END IF;

    v_n := v_n + 1;
  END LOOP;

  RETURN QUERY
    SELECT v_n,
           v_total,
           (SELECT max(a.acceso_hasta) FROM public.aportes a WHERE a.user_id = v_uid);
END $$;

COMMENT ON FUNCTION public.reclamar_donaciones() IS
  'Vincula a la sesión actual las donaciones anónimas hechas con su email VERIFICADO, y les otorga el acceso correspondiente desde hoy. Acto explícito de la persona: no lo llama ningún trigger. Idempotente.';

-- ---------------------------------------------------------------------
-- 5) Permisos
--
-- `anon` no ejecuta ninguna de las dos: sin sesión no hay nada que reclamar, y
-- dejarlas abiertas convertiría `donaciones_reclamables()` en un oráculo para
-- preguntar si un email dado tiene donaciones — un dato que no le corresponde
-- a nadie sin sesión.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.donaciones_reclamables() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reclamar_donaciones()   FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.donaciones_reclamables() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reclamar_donaciones()    TO authenticated, service_role;
