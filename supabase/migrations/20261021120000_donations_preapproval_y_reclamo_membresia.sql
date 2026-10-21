-- =====================================================================
-- 20261021120000_donations_preapproval_y_reclamo_membresia.sql
--
-- 1) Columna `preapproval_id` en `donations`:
--    Permite que cuando entra un cobro de suscripción, se guarde el ID del
--    preapproval que lo originó. Esto resuelve la condición de carrera
--    cuando el aviso de la suscripción (`preapproval`) llega segundos
--    después que el cobro (`payment`), permitiendo enlazar ambos.
--
-- 2) Actualización de `reclamar_donaciones()`:
--    Cuando una persona que aportó sin sesión se registra y verifica su email,
--    al reclamar sus aportes también se asocia su `user_id` a la suscripción
--    (`memberships`) correspondiente, permitiéndole autogestionarla (pausar,
--    cancelar) desde la web.
-- =====================================================================

SET client_min_messages = warning;

-- 1) donations.preapproval_id
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS preapproval_id text;
COMMENT ON COLUMN public.donations.preapproval_id IS
  'ID del preapproval/suscripción de Mercado Pago que originó este pago, si aplica. Permite conciliar pagos y membresías independientemente del orden de llegada de los webhooks.';

CREATE INDEX IF NOT EXISTS idx_donations_preapproval
  ON public.donations (preapproval_id)
  WHERE preapproval_id IS NOT NULL;

-- Backfill puntual del pago del 20/10
UPDATE public.donations
   SET preapproval_id = 'b10d16946643411db98df0ef4dcf776f'
 WHERE payment_id = '184191138745' AND preapproval_id IS NULL;

-- 2) reclamar_donaciones(): vincular también la membresía
CREATE OR REPLACE FUNCTION public.reclamar_donaciones()
RETURNS TABLE (vinculadas integer, meses_nuevos integer, vence_el date)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_don   record;
  a       public.aportes;
  v_desde date;
  v_hasta date;
  v_n     integer := 0;
  v_total integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Hay que iniciar sesión para reclamar un aporte.' USING ERRCODE = '28000';
  END IF;

  SELECT lower(u.email) INTO v_email
    FROM auth.users u WHERE u.id = v_uid AND public.email_verificado(u.id);
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Falta verificar el email de la cuenta antes de reclamar un aporte.' USING ERRCODE = '28000';
  END IF;

  FOR v_don IN
    SELECT d.id FROM public.donations d
     WHERE d.user_id IS NULL AND d.status = 'approved'
       AND d.payer_email IS NOT NULL AND lower(d.payer_email) = v_email
     ORDER BY d.created_at
     FOR UPDATE
  LOOP
    UPDATE public.donations SET user_id = v_uid, reclamado_en = now() WHERE id = v_don.id;

    SELECT * INTO a FROM public.aportes
     WHERE donation_id = v_don.id AND user_id IS NULL FOR UPDATE;

    IF FOUND THEN
      v_desde := NULL; v_hasta := NULL;
      IF a.cuotas_cubiertas > 0 AND a.anulado_en IS NULL THEN
        SELECT p.desde, p.hasta INTO v_desde, v_hasta
          FROM public.periodo_cuota(v_uid, public.fecha_local(a.fecha), a.cuotas_cubiertas, a.id) p;
        v_total := v_total + a.cuotas_cubiertas;
      END IF;
      UPDATE public.aportes
         SET user_id = v_uid, acceso_desde = v_desde, acceso_hasta = v_hasta,
             notas = COALESCE(notas, '') || format(' Reclamado por su titular el %s.', public.hoy_local())
       WHERE id = a.id;

      -- Vincular la membresía si este aporte pertenece a una
      IF a.membership_id IS NOT NULL THEN
        UPDATE public.memberships
           SET user_id = v_uid, updated_at = now()
         WHERE id = a.membership_id AND user_id IS NULL;
      END IF;
    ELSE
      RAISE WARNING 'reclamar_donaciones: la donacion % no tiene aporte propio sin dueño; se vinculó la donación pero no el aporte', v_don.id;
    END IF;
    v_n := v_n + 1;
  END LOOP;

  -- Vincular cualquier otra membresía anónima que comparta el payer_email verificado
  UPDATE public.memberships
     SET user_id = v_uid, updated_at = now()
   WHERE user_id IS NULL AND payer_email IS NOT NULL AND lower(payer_email) = v_email;

  RETURN QUERY
    SELECT v_n, v_total,
           (SELECT max(x.acceso_hasta) FROM public.aportes x
             WHERE x.user_id = v_uid AND x.cuotas_cubiertas > 0 AND x.anulado_en IS NULL);
END $$;

REVOKE ALL ON FUNCTION public.reclamar_donaciones() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_donaciones() TO authenticated, service_role;
COMMENT ON FUNCTION public.reclamar_donaciones() IS
  'Vincula a la sesión actual las donaciones y suscripciones anónimas hechas con su email VERIFICADO, y les otorga el acceso correspondiente desde hoy. Acto explícito de la persona: no lo llama ningún trigger. Idempotente.';
