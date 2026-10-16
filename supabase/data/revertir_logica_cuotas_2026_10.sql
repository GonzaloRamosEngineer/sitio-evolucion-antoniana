-- =====================================================================
-- REVERSIÓN DE LÓGICA de la regla 2026-10 (migraciones 20261016120000/120100)
--
-- GENERADO el 2026-10-16 desde PRODUCCIÓN (solo lectura): cada función, trigger,
-- permiso y comentario de abajo es `pg_get_functiondef` / `pg_get_triggerdef` /
-- `proacl` / `obj_description` del estado de producción con la P0 aplicada y
-- SIN la regla de cuotas. No se reconstruyó a mano: es lo que estaba.
-- Ensayado: aplicar la regla y después esto deja la "foto de lógica"
-- (`supabase/data/foto_logica_aportes.sql`) idéntica a la de antes, salvo lo
-- que se conserva a propósito (abajo).
--
-- ⚠️ NO SE CORRE SOLO. Se compone, en UNA transacción y DESPUÉS de revertir los
-- datos, con `tools/cuotas-2026-10.sh revertir` (ver el runbook). Orden seguro:
--   1. webhook a la versión anterior (`417587f`): el nuevo hace upsert por
--      payment_id y este script quita ese UNIQUE;
--   2. frontend a la versión anterior: el nuevo llama a `mi_resumen_aportes()`,
--      que este script borra;
--   3. datos + lógica (esta transacción): primero los datos, porque la reversión
--      de datos usa funciones que este script borra.
--
-- QUÉ NO REVIERTE, A PROPÓSITO (es información, y la lógica vieja la ignora):
--   * las columnas nuevas de `aportes` y `donations` y sus valores (concepto,
--     cuotas_cubiertas, monto_reintegrado, anulado_*, mp_*), con sus CHECK
--     propios, que la lógica vieja respeta (inserta NULL / 0);
--   * la tabla `aportes_correcciones` y su historial;
--   * los índices nuevos;
--   * la P0: los permisos de escritura de `donations`/`memberships` siguen
--     cerrados. Revertir cuotas NO reabre el agujero.
-- =====================================================================
SET client_min_messages = warning;

-- 1) Los triggers nuevos, fuera
DROP TRIGGER IF EXISTS trg_aportes_normalizar      ON public.aportes;
DROP TRIGGER IF EXISTS trg_donations_no_retroceder ON public.donations;

-- 2) Funciones cuya FIRMA cambió (columna `concepto`): se borran y se recrean
DROP FUNCTION IF EXISTS public.mi_acceso();
DROP FUNCTION IF EXISTS public.acceso_vigente(uuid);

-- acceso_vigente(uuid)
CREATE OR REPLACE FUNCTION public.acceso_vigente(p_user_id uuid)
 RETURNS TABLE(tiene_acceso boolean, vence_el date, origen text, en_gracia boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH regla AS (
    SELECT COALESCE(max(dias_gracia), 0) AS dias_gracia
      FROM public.reglas_acceso WHERE vigente
  ),
  -- ¿Esta entidad quita los beneficios al suspender, y esta persona está
  -- suspendida o de baja? Las dos condiciones, o no aplica.
  bloqueo AS (
    SELECT COALESCE(
      (SELECT rm.suspension_corta_acceso FROM public.reglas_membresia rm WHERE rm.vigente LIMIT 1)
      AND EXISTS (SELECT 1 FROM public.miembros m
                   WHERE m.user_id = p_user_id AND m.estado IN ('suspendido','baja')),
      false) AS cortado
  ),
  ultimo AS (
    SELECT a.acceso_hasta,
           a.origen,
           (a.origen = 'membresia'
            OR (a.origen = 'manual' AND a.equivale_a = 'cuota')) AS con_gracia
      FROM public.aportes a
     WHERE a.user_id = p_user_id AND a.acceso_hasta IS NOT NULL
     ORDER BY a.acceso_hasta DESC
     LIMIT 1
  )
  SELECT
    NOT b.cortado AND COALESCE(u.acceso_hasta >= current_date
             OR (u.con_gracia AND u.acceso_hasta + r.dias_gracia >= current_date), false),
    u.acceso_hasta,
    u.origen,
    NOT b.cortado AND COALESCE(u.acceso_hasta < current_date
             AND u.con_gracia
             AND u.acceso_hasta + r.dias_gracia >= current_date, false)
  FROM regla r CROSS JOIN bloqueo b LEFT JOIN ultimo u ON true;
$function$;

-- tiene_acceso(uuid)
CREATE OR REPLACE FUNCTION public.tiene_acceso(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(p_user_id) av), false);
$function$;

-- tiene_acceso()
CREATE OR REPLACE FUNCTION public.tiene_acceso()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT av.tiene_acceso FROM public.acceso_vigente(auth.uid()) av), false);
$function$;

-- mi_acceso()
CREATE OR REPLACE FUNCTION public.mi_acceso()
 RETURNS TABLE(tiene_acceso boolean, vence_el date, origen text, en_gracia boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.acceso_vigente(auth.uid());
$function$;

-- 3) Funciones con la misma firma: vuelven a su cuerpo de producción

-- aporte_desde_donacion()
CREATE OR REPLACE FUNCTION public.aporte_desde_donacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_destino  uuid;
  v_ref      text;
  v_meses    integer;
  v_desde    date;
  v_hasta    date;
  v_es_cuota boolean;
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

  -- Si el canal informó destino, se respeta; si no, institucional.
  v_destino := COALESCE(NEW.destino_id, public.destino_por_defecto());
  IF v_destino IS NULL THEN
    RAISE WARNING 'aporte_desde_donacion: no hay destino institucional activo, la donacion % no entra al libro', NEW.id;
    RETURN NULL;
  END IF;

  -- IDEMPOTENCIA. Los webhooks de pago REINTENTAN: sin esto, un mismo cobro
  -- entra dos veces al libro y la rendición queda mal para siempre.
  v_ref := COALESCE(NULLIF(NEW.payment_id, ''), 'donacion:' || NEW.id::text);

  -- ⬅️ ¿Es la renovación de una suscripción? `donations.donation_type` es el
  --    único dato disponible acá: lo escribe el webhook y vale 'suscripción'
  --    en una renovación y 'única' en una donación puntual.
  --
  --    ⚠️ La columna es TEXTO LIBRE, sin CHECK (verificado en producción), así
  --    que se aceptan las dos grafías. Escribir solo la acentuada dejaría el
  --    BUG 2 abierto para cualquier futuro escritor que mande 'suscripcion'.
  v_es_cuota := lower(COALESCE(NEW.donation_type, '')) IN ('suscripción', 'suscripcion');

  -- Período de acceso. Sin `user_id` no hay a quién habilitar, y un destino
  -- marcado como que no otorga acceso tampoco. En esos casos el aporte entra
  -- al libro igual, con las dos fechas en NULL — que es lo que el CHECK
  -- `aportes_acceso_chk` ya contemplaba.
  v_meses := 0;
  IF NEW.user_id IS NOT NULL AND public.destino_otorga_acceso(v_destino) THEN
    IF v_es_cuota THEN
      -- UN mes, no meses proporcionales al monto: es un cobro MENSUAL
      -- (`frequency: 1, frequency_type: 'months'` en `membershipApi.js`).
      -- `LEAST(1, ...)` en vez de un `1` pelado para HEREDAR el piso: un
      -- monto por debajo de la cuota de referencia sigue dando 0.
      v_meses := LEAST(1, public.meses_por_donacion(NEW.amount));
    ELSE
      v_meses := public.meses_por_donacion(NEW.amount);
    END IF;
  END IF;

  IF v_meses > 0 THEN
    v_desde := public.proximo_acceso_desde(NEW.user_id);
    v_hasta := (v_desde + (v_meses * interval '1 month'))::date;
  END IF;

  BEGIN
    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, donation_id, referencia_externa,
      acceso_desde, acceso_hasta, notas
    ) VALUES (
      NEW.user_id,
      NEW.amount,
      COALESCE(NEW.created_at, now()),
      v_destino,
      'donacion',
      NEW.id,
      v_ref,
      v_desde,
      v_hasta,
      'Alta automatica desde donations (' || COALESCE(NEW.payment_provider, 'sin proveedor') || ')'
        || CASE WHEN v_meses > 0 THEN format('. Otorga %s mes(es) de acceso.', v_meses)
                ELSE '. No otorga acceso.' END
        || CASE WHEN v_es_cuota THEN ' Cobro recurrente: pendiente de reclasificar como cuota.'
                ELSE '' END
    )
    -- ⚠️ DO NOTHING y NO "DO UPDATE SET destino_id", que era la tentación obvia.
    --
    -- Con DO UPDATE, cada reintento del webhook pisaría el destino del aporte. Y
    -- como la comisión puede re-imputar un aporte mal dirigido desde el panel,
    -- el próximo reintento le desharía la corrección en silencio. Entre "el
    -- trigger crea y nunca modifica" y "el trigger sincroniza", la primera es la
    -- única que deja que una corrección humana sobreviva.
    --
    -- Y esto es también lo que hace ORDEN-INDEPENDIENTE al arreglo: si el
    -- trigger de la membresía llegó primero, la fila ya está bien clasificada
    -- y acá no se toca nada.
    ON CONFLICT (referencia_externa) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ver la regla de oro: se pierde el renglón del libro, no el registro del
    -- cobro. El WARNING queda en los logs de Postgres.
    RAISE WARNING 'aporte_desde_donacion: no se pudo registrar el aporte de la donacion %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $function$;

-- aporte_desde_membresia()
CREATE OR REPLACE FUNCTION public.aporte_desde_membresia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_destino uuid;
  v_ref     text;
  v_desde   date;
  v_hasta   date;
BEGIN
  IF COALESCE(NEW.status, '') <> 'active' OR NEW.last_payment_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- El proveedor usa varios nombres para "cobrado". Si no informa nada, se
  -- confía en que status='active' ya significa que el cobro entró.
  IF COALESCE(NEW.last_payment_status, 'approved')
       NOT IN ('approved', 'accredited', 'authorized') THEN
    RETURN NULL;
  END IF;

  -- En UPDATE, solo si el pago es NUEVO. Si no, cualquier update de la fila
  -- —una pausa, un cambio de mail— regalaría un mes.
  IF TG_OP = 'UPDATE' AND NEW.last_payment_id IS NOT DISTINCT FROM OLD.last_payment_id THEN
    RETURN NULL;
  END IF;

  IF COALESCE(NEW.amount, 0) <= 0 THEN
    RAISE WARNING 'aporte_desde_membresia: membresia % con monto invalido (%), no entra al libro', NEW.id, NEW.amount;
    RETURN NULL;
  END IF;

  v_destino := COALESCE(NEW.destino_id, public.destino_por_defecto());
  IF v_destino IS NULL THEN
    RAISE WARNING 'aporte_desde_membresia: no hay destino institucional activo, la membresia % no entra al libro', NEW.id;
    RETURN NULL;
  END IF;

  v_ref := COALESCE(NULLIF(NEW.last_payment_id, ''),
                    'membresia:' || NEW.id::text || ':' || COALESCE(NEW.next_charge_date::text, 'sin-fecha'));

  -- ⬅️ El piso también acá, y por consistencia con el punto 2: una cuota por
  --    debajo de la cuota de referencia no otorga acceso. Antes esta rama no
  --    miraba el piso, así que una suscripción de $1 armada contra la API
  --    —el menú de `Collaborate.jsx` arranca en $5.000, pero la API no lo
  --    valida— habilitaba el club igual.
  IF NEW.user_id IS NOT NULL AND public.destino_otorga_acceso(v_destino)
     AND public.meses_por_donacion(NEW.amount) > 0 THEN
    v_desde := public.proximo_acceso_desde(NEW.user_id);
    -- Hasta el próximo cobro. El GREATEST evita un rango invertido si el
    -- proveedor manda una `next_charge_date` en el pasado.
    v_hasta := GREATEST(COALESCE(NEW.next_charge_date, (v_desde + interval '1 month')::date), v_desde);
  END IF;

  BEGIN
    INSERT INTO public.aportes (
      user_id, monto, fecha, destino_id, origen, membership_id, referencia_externa,
      acceso_desde, acceso_hasta, email_aportante, notas
    ) VALUES (
      NEW.user_id, NEW.amount, now(), v_destino, 'membresia', NEW.id, v_ref,
      v_desde, v_hasta, NEW.payer_email,
      'Alta automatica por cobro de cuota (' || COALESCE(NEW.payment_method, 'sin metodo') || ').'
    )
    -- ⬅️ ACÁ ESTABA EL BUG 1. Este `ON CONFLICT` era `DO NOTHING`, y el
    --    conflicto NO es una excepción rara: es el caso NORMAL, porque el
    --    webhook escribe la donación antes que la membresía. Descartar acá
    --    era descartar la única escritura que sabe que esto es una cuota.
    --
    --    Ahora reclasifica. Tres cuidados que no son opcionales:
    --
    --    a) NO se usa `EXCLUDED.acceso_desde`. Está ENVENENADO: se calculó con
    --       `proximo_acceso_desde()` cuando la fila del conflicto YA existía,
    --       así que devuelve el día siguiente al acceso que esa misma fila
    --       otorga. Usarlo empujaría el período un mes al futuro. Se conserva
    --       el `acceso_desde` de la fila existente y se recalcula solo el
    --       `acceso_hasta` a partir de él y de `NEW.next_charge_date`.
    --
    --    b) El WHERE deja sobrevivir cualquier corrección humana. Solo se toca
    --       una fila que siga siendo `donacion` sin membresía: si la comisión
    --       la pasó a `manual`, o si el trigger ya corrió, no se pisa nada. Es
    --       la misma regla de §10.16, y hace la operación idempotente.
    --
    --    c) Acortar el acceso acá es el ARREGLO, no una regresión: si el
    --       trigger de la donación había otorgado 10 meses por un cobro de
    --       $50.000 (BUG 2), esto lo corrige a "hasta el próximo cobro". Con
    --       el punto 2 aplicado ya no debería pasar, pero la reclasificación
    --       tiene que ser correcta también sobre las filas viejas.
    ON CONFLICT (referencia_externa) DO UPDATE
      SET origen          = 'membresia',
          membership_id   = NEW.id,
          email_aportante = COALESCE(aportes.email_aportante, NEW.payer_email),
          acceso_hasta    = CASE
                              WHEN aportes.acceso_desde IS NULL THEN aportes.acceso_hasta
                              ELSE GREATEST(
                                     COALESCE(NEW.next_charge_date,
                                              (aportes.acceso_desde + interval '1 month')::date),
                                     aportes.acceso_desde)
                            END,
          notas           = COALESCE(aportes.notas, '')
                            || ' Reclasificado como cuota de la membresia ' || NEW.id::text
                            || ': el cobro recurrente aterriza en donations por la regla de oro del webhook.'
      WHERE aportes.origen = 'donacion' AND aportes.membership_id IS NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'aporte_desde_membresia: no se pudo registrar el aporte de la membresia %: %', NEW.id, SQLERRM;
  END;

  RETURN NULL;
END $function$;

-- antiguedad_socio(uuid)
CREATE OR REPLACE FUNCTION public.antiguedad_socio(p_user_id uuid)
 RETURNS TABLE(socio_desde date, dias_aportados integer, meses_aportados integer, racha_dias integer, racha_meses integer, cortes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH unido AS (
    SELECT range_agg(daterange(acceso_desde, acceso_hasta, '[]')) AS mr
      FROM public.aportes
     WHERE user_id = p_user_id AND acceso_desde IS NOT NULL AND acceso_hasta IS NOT NULL
  ),
  tramos AS (SELECT unnest(mr) AS tramo FROM unido WHERE mr IS NOT NULL),
  actual AS (SELECT tramo FROM tramos WHERE tramo @> current_date LIMIT 1)
  SELECT
    (SELECT min(lower(tramo)) FROM tramos),
    (SELECT COALESCE(sum(upper(tramo) - lower(tramo)), 0)::int FROM tramos),
    (SELECT COALESCE(sum(upper(tramo) - lower(tramo)), 0)::int / 30 FROM tramos),
    (SELECT COALESCE((SELECT upper(tramo) - lower(tramo) FROM actual), 0)::int),
    (SELECT COALESCE((SELECT upper(tramo) - lower(tramo) FROM actual), 0)::int / 30),
    (SELECT GREATEST(count(*)::int - 1, 0) FROM tramos);
$function$;

-- elegibilidad_club(uuid)
CREATE OR REPLACE FUNCTION public.elegibilidad_club(p_user_id uuid)
 RETURNS TABLE(tiene_acceso boolean, meses_aportados integer, aporte_acumulado numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.tiene_acceso(p_user_id),
    COALESCE((SELECT a.meses_aportados FROM public.antiguedad_socio(p_user_id) a), 0),
    COALESCE((SELECT sum(ap.monto) FROM public.aportes ap WHERE ap.user_id = p_user_id), 0);
$function$;

-- donaciones_reclamables()
CREATE OR REPLACE FUNCTION public.donaciones_reclamables()
 RETURNS TABLE(donation_id uuid, fecha timestamp with time zone, monto numeric, meses_estimados integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- reclamar_donaciones()
CREATE OR REPLACE FUNCTION public.reclamar_donaciones()
 RETURNS TABLE(vinculadas integer, meses_nuevos integer, vence_el date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;

-- 4) El trigger de donaciones vuelve a sus columnas de producción

DROP TRIGGER IF EXISTS trg_aporte_desde_donacion ON public.donations;
CREATE TRIGGER trg_aporte_desde_donacion AFTER INSERT OR UPDATE OF status, amount, destino_id ON public.donations FOR EACH ROW EXECUTE FUNCTION aporte_desde_donacion();

-- 5) Permisos EXACTOS de producción sobre cada función restaurada (proacl)
REVOKE ALL ON FUNCTION public.acceso_vigente(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acceso_vigente(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.antiguedad_socio(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.antiguedad_socio(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.aporte_desde_donacion() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aporte_desde_donacion() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.aporte_desde_donacion() TO anon;
GRANT EXECUTE ON FUNCTION public.aporte_desde_donacion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aporte_desde_donacion() TO service_role;
REVOKE ALL ON FUNCTION public.aporte_desde_membresia() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aporte_desde_membresia() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.aporte_desde_membresia() TO anon;
GRANT EXECUTE ON FUNCTION public.aporte_desde_membresia() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aporte_desde_membresia() TO service_role;
REVOKE ALL ON FUNCTION public.donaciones_reclamables() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.donaciones_reclamables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.donaciones_reclamables() TO service_role;
REVOKE ALL ON FUNCTION public.elegibilidad_club(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.elegibilidad_club(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.mi_acceso() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mi_acceso() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.mi_acceso() TO anon;
GRANT EXECUTE ON FUNCTION public.mi_acceso() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_acceso() TO service_role;
REVOKE ALL ON FUNCTION public.reclamar_donaciones() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reclamar_donaciones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reclamar_donaciones() TO service_role;
REVOKE ALL ON FUNCTION public.tiene_acceso() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.tiene_acceso() TO anon;
GRANT EXECUTE ON FUNCTION public.tiene_acceso() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tiene_acceso() TO service_role;
REVOKE ALL ON FUNCTION public.tiene_acceso(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tiene_acceso(uuid) TO service_role;

-- 6) Las funciones que la regla 2026-10 agregó (después de los triggers que las usan)
DROP FUNCTION IF EXISTS public.aportes_normalizar();
DROP FUNCTION IF EXISTS public.donations_no_retroceder();
DROP FUNCTION IF EXISTS public.aplicar_estado_cobro(text, text, numeric, text);
DROP FUNCTION IF EXISTS public.mi_resumen_aportes();
DROP FUNCTION IF EXISTS public.periodo_cuota(uuid, date, integer, uuid);
DROP FUNCTION IF EXISTS public.periodo_desde_previo(date, date, integer);
DROP FUNCTION IF EXISTS public.cuota_cuenta(numeric, uuid);
DROP FUNCTION IF EXISTS public.hoy_local();
DROP FUNCTION IF EXISTS public.fecha_local(timestamptz);
DROP FUNCTION IF EXISTS public.reclasificar_aportes_v2(boolean, text);
DROP FUNCTION IF EXISTS public.revertir_reclasificacion_aportes(text);
DROP FUNCTION IF EXISTS public.aporte_foto(public.aportes);

-- 7) Restricciones que la lógica vieja no cumple, o que producción no tenía.
--    Los UNIQUE solo se pueden quitar con el webhook viejo ya desplegado.
ALTER TABLE public.aportes     DROP CONSTRAINT IF EXISTS aportes_acceso_solo_cuotas_chk;
ALTER TABLE public.donations   DROP CONSTRAINT IF EXISTS donations_payment_id_key;
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_preapproval_id_key;

-- 8) Comentarios de producción

COMMENT ON FUNCTION public.meses_por_donacion(numeric) IS 'Conversión donación → meses de acceso: proporcional, con piso y topes. 0 = no otorga acceso. Única fuente de la regla: la usan los triggers y el backfill.';
COMMENT ON FUNCTION public.donaciones_reclamables() IS 'Donaciones anónimas que coinciden con el email VERIFICADO de la sesión actual. Solo informa: no vincula nada. Vacío si el email no está verificado.';
COMMENT ON FUNCTION public.reclamar_donaciones() IS 'Vincula a la sesión actual las donaciones anónimas hechas con su email VERIFICADO, y les otorga el acceso correspondiente desde hoy. Acto explícito de la persona: no lo llama ningún trigger. Idempotente.';
COMMENT ON COLUMN public.aportes.equivale_a IS 'Solo para origen=manual: si ese aporte equivale a una cuota (con gracia) o a una donación (sin gracia). NULL en los automáticos, que ya se distinguen por `origen`.';
