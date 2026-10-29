-- =============================================================================
-- «Mi aporte» por WhatsApp: estado de cuenta de QUIEN ESCRIBE, para MatchBot
-- =============================================================================
-- MatchBot (el bot del WhatsApp de la entidad) consulta el estado de cuenta de la
-- persona que le escribe con el número que da Meta (`from`), firmado y verificado
-- por Meta; NUNCA con un número escrito en el mensaje. Este es el mismo contrato
-- (`account_status_http`) que ya usa DMG Ops para cobranza.
--
-- QUÉ HACE. Dado un teléfono, encuentra la cuenta y devuelve un JSON compatible
-- con `parseAccountStatus` de MatchBot, alimentado de las funciones canónicas de
-- esta base (`acceso_vigente`, `antiguedad_socio`'s fuentes: `aportes`, `miembros`,
-- `memberships`). No decide nada propio sobre quién tiene acceso.
--
-- EL VÍNCULO ES `public.users.phone`. Lo carga la persona al registrarse o lo edita
-- en su panel. Es texto libre, sin UNIQUE y con formatos mezclados (hoy hay
-- `549…`, `54…` y locales de 10 dígitos), así que NO es una clave de identidad. Por
-- eso la función es deliberadamente estricta:
--
--   · sólo cuentas con el email VERIFICADO (`email_verificado`);
--   · 0 coincidencias  → { found:false, reason:'not_a_client' };
--   · 2 o más          → { found:false, reason:'ambiguous' }  (nunca se adivina);
--   · cuenta con el acceso CORTADO por la comisión → { found:false, reason:'restricted' }
--     (no es una cuota vencida: no se le dice que «debe» algo; MatchBot lo trata como
--     «sin datos» y deriva a una persona);
--   · nunca se devuelve DNI, email, domicilio, fecha de nacimiento ni datos de terceros.
--
-- ⚠️ SEGURIDAD. SECURITY DEFINER con `search_path = ''` (todo calificado). Sólo
-- `service_role` la ejecuta: abierta a `authenticated`, sería un oráculo para
-- preguntar por el estado de la cuenta de cualquier teléfono. La llama la Edge
-- Function `estado-de-cuenta`, que autentica a MatchBot con HMAC.
--
-- TELÉFONOS ARGENTINOS. Meta manda el celular como `549` + 10 dígitos (o `54` + 10);
-- en `users.phone` hay de todo. Se comparan las cuatro formas del mismo número:
-- los 10 dígitos nacionales, con `0`, con `54` y con `549`. Los números de otro
-- país se comparan tal cual. NO se contempla el prefijo `15` (387 15 xxxxxx): es una
-- limitación conocida y está en el check.
--
-- Idempotente: CREATE OR REPLACE con la misma firma. No toca datos.
-- =============================================================================

SET lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.account_status_for_phone(
  p_phone       text,
  p_charge_ids  uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Cómo se llama a quien aporta en las respuestas de esta entidad. Es la misma
  -- palabra que `entidad.vocabulario.aportante` (src/config/entidad.js): otra
  -- entidad la cambia acá, en un solo lugar.
  c_rol      CONSTANT text := 'Padrino';
  c_cuota    CONSTANT text := 'Renovación de cuota mensual';

  v_digits    text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_nat       text;
  v_variants  text[];
  v_ids       uuid[];
  v_user      public.users;
  v_av        record;
  v_gracia    integer;
  v_hoy       date := public.hoy_local();
  v_numero    bigint;
  v_monto     numeric;
  v_nombre    text;
  v_last      jsonb;
  v_open      jsonb := '[]'::jsonb;
  v_summary   jsonb;
  v_en_gracia boolean;
  v_vencida   boolean;
  v_tuvo      boolean;
BEGIN
  IF length(v_digits) NOT BETWEEN 10 AND 15 THEN
    RETURN jsonb_build_object('found', false, 'reason', 'invalid_phone');
  END IF;

  -- Argentina: 549 + 10, 54 + 10, 0 + 10 o los 10 nacionales.
  v_nat := CASE
    WHEN v_digits ~ '^549\d{10}$' THEN substr(v_digits, 4)
    WHEN v_digits ~ '^54\d{10}$'  THEN substr(v_digits, 3)
    WHEN v_digits ~ '^0\d{10}$'   THEN substr(v_digits, 2)
    WHEN v_digits ~ '^\d{10}$'    THEN v_digits
  END;
  v_variants := CASE
    WHEN v_nat IS NOT NULL THEN ARRAY[v_nat, '0' || v_nat, '54' || v_nat, '549' || v_nat]
    ELSE ARRAY[v_digits]
  END;

  SELECT array_agg(u.id) INTO v_ids
    FROM public.users u
   WHERE u.phone IS NOT NULL
     AND length(regexp_replace(u.phone, '\D', '', 'g')) >= 10
     AND regexp_replace(u.phone, '\D', '', 'g') = ANY (v_variants)
     AND public.email_verificado(u.id);

  IF v_ids IS NULL THEN
    RETURN jsonb_build_object('found', false, 'reason', 'not_a_client');
  END IF;
  IF cardinality(v_ids) > 1 THEN
    RETURN jsonb_build_object('found', false, 'reason', 'ambiguous');
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_ids[1];

  SELECT * INTO v_av FROM public.acceso_vigente(v_user.id);
  v_gracia := COALESCE((SELECT max(r.dias_gracia) FROM public.reglas_acceso r WHERE r.vigente), 0);
  v_tuvo   := v_av.vence_el IS NOT NULL;

  -- Acceso cortado por la comisión (suspendido/baja con `suspension_corta_acceso`):
  -- `acceso_vigente` da falso aunque la cuota esté dentro de la gracia. No es una cuota
  -- vencida y no se le dice que debe nada.
  IF NOT v_av.tiene_acceso AND v_tuvo AND v_av.vence_el + v_gracia >= v_hoy THEN
    RETURN jsonb_build_object('found', false, 'reason', 'restricted');
  END IF;

  SELECT m.numero INTO v_numero
    FROM public.miembros m WHERE m.user_id = v_user.id AND m.estado = 'activo';

  v_nombre := coalesce(nullif(btrim(v_user.name), ''), 'Persona registrada');

  -- Importe de referencia: la membresía activa; si no, su última cuota; si no, la regla.
  v_monto := COALESCE(
    (SELECT mb.amount FROM public.memberships mb
      WHERE mb.user_id = v_user.id AND mb.status = 'active'
      ORDER BY mb.created_at DESC LIMIT 1),
    (SELECT a.monto - COALESCE(a.monto_reintegrado, 0) FROM public.aportes a
      WHERE a.user_id = v_user.id AND a.concepto = 'cuota_mensual' AND a.anulado_en IS NULL
      ORDER BY a.fecha DESC, a.created_at DESC LIMIT 1),
    (SELECT max(r.cuota_referencia) FROM public.reglas_acceso r WHERE r.vigente),
    0);

  -- Último aporte efectivo (no anulado, neto de reintegros).
  SELECT jsonb_build_object(
           'service', CASE a.concepto
                        WHEN 'cuota_mensual'            THEN 'Cuota mensual'
                        WHEN 'donacion_extraordinaria'  THEN 'Donación extraordinaria'
                        WHEN 'adelanto_cuotas'          THEN 'Adelanto de cuotas'
                        ELSE 'Aporte' END,
           'amount', a.monto - COALESCE(a.monto_reintegrado, 0),
           'currency', 'ARS',
           'paid_at', public.fecha_local(a.fecha)::text,
           'confirmed_by', CASE
                             WHEN a.donation_id IS NOT NULL OR a.membership_id IS NOT NULL
                               OR a.origen IN ('membresia', 'donacion', 'mercadopago', 'mp')
                             THEN 'mercado_pago' ELSE 'registro_del_equipo' END)
    INTO v_last
    FROM public.aportes a
   WHERE a.user_id = v_user.id AND a.anulado_en IS NULL
     AND a.monto - COALESCE(a.monto_reintegrado, 0) > 0
   ORDER BY a.fecha DESC, a.created_at DESC
   LIMIT 1;

  v_en_gracia := v_av.tiene_acceso AND COALESCE(v_av.en_gracia, false);
  v_vencida   := NOT v_av.tiene_acceso AND v_tuvo;

  IF v_av.tiene_acceso AND NOT v_en_gracia THEN
    -- A. Cobertura al día.
    v_summary := jsonb_build_object(
      'overdue_count', 0, 'pending_count', 0,
      'next_due', jsonb_build_object(
        'service', 'Cobertura de cuota mensual vigente', 'amount', v_monto,
        'currency', 'ARS', 'due_date', v_av.vence_el::text));
  ELSIF v_en_gracia OR v_vencida THEN
    -- B. En período de gracia, o vencida fuera de la gracia: un ítem a renovar.
    --    El enlace de pago lo completa la Edge Function (usa las rutas y el dominio
    --    de la entidad), así que acá va null y la base no conoce el sitio.
    v_open := jsonb_build_array(jsonb_build_object(
      'service', CASE WHEN v_en_gracia THEN c_cuota || ' (en período de gracia)' ELSE c_cuota END,
      'amount', v_monto, 'currency', 'ARS', 'due_date', v_av.vence_el::text,
      'overdue', v_vencida, 'payment_url', NULL, 'payment_details', NULL));
    v_summary := jsonb_build_object(
      'overdue_count', CASE WHEN v_vencida THEN 1 ELSE 0 END,
      'pending_count', 1,
      'next_due', CASE WHEN v_en_gracia THEN jsonb_build_object(
        'service', c_cuota, 'amount', v_monto, 'currency', 'ARS',
        'due_date', v_av.vence_el::text) ELSE NULL END);
  ELSE
    -- C. Cuenta registrada sin cuotas (donante puntual o sin aportes todavía).
    v_summary := jsonb_build_object('overdue_count', 0, 'pending_count', 0, 'next_due', NULL);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'client_name', v_nombre || CASE WHEN v_numero IS NOT NULL
                                    THEN ' (' || c_rol || ' N° ' || v_numero || ')' ELSE '' END,
    'contact_name', v_nombre,
    'open_charges', v_open,
    'last_payment', v_last,
    'summary', v_summary,
    'referenced_charges', '[]'::jsonb,
    'payment_in_review', false,
    'payment_in_process', EXISTS (
      SELECT 1 FROM public.memberships mb
       WHERE mb.user_id = v_user.id AND mb.status = 'pending'
         AND mb.created_at > now() - interval '3 days'));
END;
$$;

COMMENT ON FUNCTION public.account_status_for_phone(text, uuid[]) IS
  'Estado de cuenta de la persona dueña de un teléfono, para MatchBot («Mi aporte» por WhatsApp). Sólo cuentas con email verificado; 0 coincidencias = not_a_client, 2 o más = ambiguous, acceso cortado = restricted. Nunca devuelve DNI, email ni datos de terceros. Sólo service_role.';

REVOKE ALL ON FUNCTION public.account_status_for_phone(text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_status_for_phone(text, uuid[]) TO service_role;
