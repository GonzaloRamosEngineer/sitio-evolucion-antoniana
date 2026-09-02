-- =====================================================================
-- UNA RENOVACIÓN DE SUSCRIPCIÓN ES UNA CUOTA, NO UNA DONACIÓN
--
-- CÓMO SE ENCONTRÓ. El 2026-09-02 se cobró la PRIMERA cuota real del
-- proyecto (`payment_id` 175967372005, $5.000). El circuito recurrente
-- funcionó de punta a punta por primera vez —la membresía quedó `active`,
-- con `preapproval_id`, `destino_id` y `last_payment_id`— y sin embargo en
-- `/carnet` el socio leía «ORIGEN DEL ACCESO: Donación». Eso destapó tres
-- defectos encadenados, no uno.
--
-- LA CAUSA, QUE ESTÁ EN EL ORDEN DE DOS ESCRITURAS. El webhook
-- (`GonzaloRamosEngineer/mp-supabase-webhook`, `index.js`) hace, en este
-- orden y en transacciones separadas:
--
--   1. INSERT en `donations` con `donation_type = 'suscripción'`
--   2. UPDATE de `memberships.last_payment_id`
--
-- Entrar a `donations` es lo que hace que nazca el aporte, y es deliberado:
-- es la REGLA DE ORO del servicio, que el registro del cobro no se pierda
-- aunque la membresía no se pueda resolver (§10.16 dejó 6 filas de prueba
-- compartiendo `external_reference`, que hacen el match ambiguo).
--
-- Pero el trigger de la donación corre PRIMERO y crea el aporte; después
-- corre el de la membresía, choca contra `referencia_externa` UNIQUE y su
-- `ON CONFLICT DO NOTHING` lo descarta. **No es una carrera que a veces se
-- pierde: se pierde siempre.** Por eso toda renovación entraba como
-- donación, y por eso HISTORIAL §10.16 lo anotó como «imprecisión
-- conocida». No era una imprecisión. Eran tres bugs:
--
-- ---------------------------------------------------------------------
-- BUG 1 — El socio mensual NO tenía los 30 días de gracia
-- ---------------------------------------------------------------------
-- `acceso_vigente()` concede la gracia solo si `origen = 'membresia'`
-- (o `manual` marcado como cuota). Con `origen = 'donacion'` el acceso se
-- corta al día siguiente del vencimiento. Es exactamente lo que §10.17
-- decidió evitar: «un cobro recurrente falla por tarjeta vencida más que
-- por decisión». Verificado en producción: `en_gracia = f`.
--
-- ---------------------------------------------------------------------
-- BUG 2 — El más caro: meses de acceso regalados
-- ---------------------------------------------------------------------
-- `meses_por_donacion()` convierte monto → meses de forma PROPORCIONAL, y
-- eso es correcto para una donación puntual y ruinoso para un cobro
-- mensual. `Collaborate.jsx` ofrece cuotas de $5.000 a $50.000, y
-- `membershipApi.js` fija `frequency: 1, frequency_type: 'months'`, así
-- que UN cobro mensual otorgaba (verificado contra producción):
--
--     $ 5.000/mes  ->  1 mes    <- coincide, y por eso no se vio
--     $15.000/mes  ->  3 meses
--     $25.000/mes  ->  5 meses
--     $50.000/mes  -> 10 meses
--
-- Quien eligiera $50.000/mes acumulaba 10 meses por cada cobro, y al mes
-- siguiente 10 más. Nadie lo sufrió porque la única suscripción viva es de
-- $5.000, donde 1 cuota = 1 mes **por casualidad aritmética**. El defecto
-- estaba a un clic del menú.
--
-- ---------------------------------------------------------------------
-- BUG 3 — El CHECK no admitía la verdad
-- ---------------------------------------------------------------------
-- `aportes_origen_chk` exigía que `origen='membresia'` tuviera
-- `membership_id` **y `donation_id` NULL**. Pero una renovación tiene las
-- dos cosas de verdad: aterriza en `donations` (por la regla de oro) y
-- pertenece a una `memberships`. El CHECK asumía que los dos canales son
-- disjuntos, y para una renovación no lo son. Sin relajarlo, reclasificar
-- obligaba a borrar el `donation_id` — perder el rastro al cobro para
-- arreglar la etiqueta.
--
-- ---------------------------------------------------------------------
-- POR QUÉ SE ARREGLA ACÁ Y NO EN EL WEBHOOK
-- ---------------------------------------------------------------------
-- La tentación era que el webhook no escriba en `donations` para una
-- renovación. Eso rompe la regla de oro: si el match de la membresía es
-- ambiguo —y hoy lo es para 6 filas— el cobro no quedaría registrado en
-- ningún lado. Perder plata para ganar una etiqueta.
--
-- La base, en cambio, tiene los dos datos y puede converger sin importar
-- el orden: cada trigger usa SOLO lo que sabe.
--
--   * `aporte_desde_donacion()` sabe, por `donation_type`, que el cobro es
--     una renovación. No puede resolver CUÁL membresía (el webhook todavía
--     no escribió `last_payment_id`), pero sí puede dejar de aplicar la
--     regla proporcional. Arregla el BUG 2 por sí solo.
--   * `aporte_desde_membresia()` sabe cuál membresía y cuándo es el
--     próximo cobro. En vez de descartar por conflicto, RECLASIFICA la
--     fila. Arregla el BUG 1.
--
-- Y queda ORDEN-INDEPENDIENTE: si algún día el webhook invierte las dos
-- escrituras, el de membresía crea la fila ya bien clasificada y el de
-- donación choca y no hace nada. Los dos órdenes convergen.
--
-- LA REGLA, EN UNA LÍNEA: un cobro recurrente compra UN mes, y solo si
-- llega al piso. Se expresa como `LEAST(1, meses_por_donacion(monto))`
-- justamente para HEREDAR el piso en vez de copiarlo: si mañana sube la
-- cuota de referencia, sube solo, igual que §10.17 decidió para el piso.
-- =====================================================================

SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) El CHECK: una renovación puede tener las dos referencias
-- ---------------------------------------------------------------------
-- Se conserva la intención original ("el origen y las FK cuentan la misma
-- historia") y se prohíben solo las combinaciones incoherentes de verdad:
-- una donación puntual NO pertenece a una membresía, y un aporte cargado a
-- mano no tiene ninguna de las dos. Lo que se admite es lo único que antes
-- estaba mal prohibido: una cuota que además dejó su renglón en `donations`.
ALTER TABLE public.aportes DROP CONSTRAINT IF EXISTS aportes_origen_chk;
ALTER TABLE public.aportes ADD CONSTRAINT aportes_origen_chk CHECK (
  (origen = 'donacion'  AND donation_id IS NOT NULL AND membership_id IS NULL)  OR
  (origen = 'membresia' AND membership_id IS NOT NULL)                          OR
  (origen = 'manual'    AND donation_id IS NULL AND membership_id IS NULL)
);

COMMENT ON CONSTRAINT aportes_origen_chk ON public.aportes IS
  'El origen y las FK cuentan la misma historia. `membresia` admite ademas `donation_id` porque una renovacion aterriza en `donations` por la regla de oro del webhook (§10.16).';

-- ---------------------------------------------------------------------
-- 2) Donaciones: una renovación no se convierte con la regla proporcional
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aporte_desde_donacion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
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

-- ---------------------------------------------------------------------
-- 3) Membresías: en vez de descartar por conflicto, RECLASIFICAR
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aporte_desde_membresia()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
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
