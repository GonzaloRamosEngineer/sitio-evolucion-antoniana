-- =============================================================================
-- Club de beneficios — cierre de la deuda de §12.10 y la fase 3 de §12.8
-- =============================================================================
-- Tres cosas distintas, y ninguna toca una tabla fuera del prefijo `club_`
-- (§12.7 regla 2), así que el módulo sigue siendo copiable a otro proyecto:
--
--   1) `permitir_autoconfirmacion` — la clave de config que cierra §12.10.1.
--      La regla vive en la Edge Function; acá vive el parámetro, porque §12.7
--      regla 4 no admite constantes mágicas en código.
--   2) `club_postulaciones` — el formulario público de §12.10.5. Es tabla
--      propia y NO `club_comercios` a propósito: ver el bloque de abajo.
--   3) El reporte al comercio — la fase 3 de §12.8, «lo que hace que el
--      comercio renueve».
--
-- El cron del reaper (§12.10.11) va aparte, en `20260906150000`, porque
-- depende de una extensión que no está en todos lados y conviene que su falla
-- sea legible sola.
-- =============================================================================

-- ---------------------------------------------------------------------
-- 1) §12.10.1 — que el mismo usuario no genere y confirme su propio canje
--
-- Hoy `club-confirmar-canje` verifica que quien confirma pertenezca al
-- comercio, pero no que sea distinto de quien generó. Con los niveles de la
-- fase 4 —donde el ahorro generado define un premio— eso es exactamente el
-- vector de inflación que §12.6 advierte: el comercio fabrica sus propios
-- canjes.
--
-- Es una CLAVE DE CONFIG y no una regla fija porque el modo «probar solo/a» es
-- legítimo mientras un comercio se da de alta: se prende, se prueba el
-- circuito, se apaga. Por defecto va en `false`, que es la postura segura.
-- ---------------------------------------------------------------------
INSERT INTO public.club_config (clave, valor)
VALUES ('permitir_autoconfirmacion', 'false'::jsonb)
ON CONFLICT (clave) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) §12.10.5 — el formulario público de postulación
--
-- POR QUÉ UNA TABLA PROPIA Y NO INSERTAR EN `club_comercios` COMO HACE
-- `partners`. El patrón de `partners_public_insert_any` deja que `anon`
-- inserte en la tabla real con `estado <> 'aprobado'`. Acá no sirve, y la
-- diferencia importa:
--
--   * `club_comercios` tiene `slug UNIQUE`, y un slug lo genera la entidad al
--     aprobar. Con inserts públicos, el primero que se postule como «la
--     pizzeria» se queda con el slug bueno.
--   * Una postulación trae datos de contacto de una persona (nombre, mail,
--     teléfono) que NO tienen por qué vivir en la tabla del catálogo público.
--   * Un comercio pendiente en `club_comercios` es una fila a la que después
--     hay que atarle beneficios y operadores. Una postulación rechazada, no.
--
-- Y la diferencia de permisos con `partners` es deliberada: `anon` recibe
-- INSERT **y nada más**. Sin SELECT no se puede leer lo que se postuló otro
-- —que trae mail y teléfono—, que es justo lo que un GRANT amplio regala
-- (§12.5, «no repetir el patrón de 10.1.g»).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_postulaciones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL CHECK (length(btrim(nombre)) > 0),
  rubro             text,
  contacto_nombre   text,
  contacto_email    text NOT NULL CHECK (position('@' IN contacto_email) > 1),
  contacto_telefono text,
  sitio_web         text,
  direccion         text,
  propuesta         text NOT NULL CHECK (length(btrim(propuesta)) >= 20),
  estado            text NOT NULL DEFAULT 'nueva'
                    CHECK (estado IN ('nueva','en_conversacion','aprobada','rechazada')),
  -- Se completa al aprobar: deja el rastro de qué postulación originó qué
  -- comercio, que es lo que después permite contestar «¿de dónde salió éste?».
  comercio_id       uuid REFERENCES public.club_comercios(id) ON DELETE SET NULL,
  notas             text,
  revisada_en       timestamptz,
  revisada_por      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_postulaciones_estado
  ON public.club_postulaciones (estado, created_at DESC);

ALTER TABLE public.club_postulaciones ENABLE ROW LEVEL SECURITY;

-- La postulación entra SIEMPRE como 'nueva' y sin los campos de revisión. Sin
-- este WITH CHECK, cualquiera se autoaprueba escribiendo `estado='aprobada'`,
-- que es el mismo agujero que `partners` cierra con su `IS DISTINCT FROM`.
DROP POLICY IF EXISTS club_postulaciones_publico ON public.club_postulaciones;
CREATE POLICY club_postulaciones_publico ON public.club_postulaciones
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    estado = 'nueva'
    AND comercio_id IS NULL
    AND notas IS NULL
    AND revisada_en IS NULL
    AND revisada_por IS NULL
  );

DROP POLICY IF EXISTS club_postulaciones_board ON public.club_postulaciones;
CREATE POLICY club_postulaciones_board ON public.club_postulaciones
  FOR ALL TO authenticated
  USING (public.is_board_member()) WITH CHECK (public.is_board_member());

REVOKE ALL ON TABLE public.club_postulaciones FROM anon, authenticated;
GRANT INSERT ON TABLE public.club_postulaciones TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE public.club_postulaciones TO authenticated;
GRANT ALL ON TABLE public.club_postulaciones TO service_role;

-- ---------------------------------------------------------------------
-- 3) Fase 3 de §12.8 — el reporte al comercio
--
-- §12.6 lo dice sin vueltas: «el premio que más vale no está en la tabla de
-- niveles: es el reporte con sus propios números». Es lo que el dueño le
-- muestra al contador para justificar seguir un año más.
--
-- POR QUÉ ES UNA FUNCIÓN Y NO UNA CONSULTA DEL FRONT. Las lecturas del club
-- van directas con RLS (§12.5), y `club_canjes` ya tiene su policy por
-- comercio, así que el front PODRÍA traerse las filas y agregar en JavaScript.
-- No conviene por dos motivos:
--
--   * `personas` y `personas_recurrentes` son `count(distinct user_id)`. Para
--     calcularlas en el browser hay que bajarse el `user_id` de cada canje —o
--     sea, quién consumió qué— cuando el comercio solo necesita el número.
--     La función devuelve el agregado y no la identidad.
--   * Un reporte que se arma en dos lugares (el panel y el mail trimestral)
--     termina dando dos números distintos. Acá hay una sola definición.
--
-- La autorización se lee de la base y no del parámetro: `is_comercio_member()`
-- resuelve por `auth.uid()`, así que pasarle el uuid de otro comercio no
-- alcanza para verlo.
--
-- ⚠️ VENTANA: se filtra por `created_at` y no por `confirmado_en`, incluso
-- para los confirmados. Es a propósito: el reporte tiene que poder decir
-- «de los N códigos que se generaron en tu local este trimestre, se
-- confirmaron M», y eso solo cierra si el numerador y el denominador miran la
-- misma fecha. Con `confirmado_en` un canje generado el 31 y confirmado el 1
-- caería en dos trimestres distintos según la métrica.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_reporte_comercio(
  p_comercio_id uuid,
  p_desde       date DEFAULT NULL,
  p_hasta       date DEFAULT NULL
)
RETURNS TABLE (
  canjes_confirmados   integer,
  personas             integer,
  personas_recurrentes integer,
  ahorro_total         numeric,
  consumo_declarado    numeric,
  canjes_con_monto     integer,
  canjes_generados     integer,
  canjes_pendientes    integer,
  canjes_expirados     integer,
  canjes_anulados      integer,
  primer_canje         timestamptz,
  ultimo_canje         timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (public.is_comercio_member(p_comercio_id) OR public.is_board_member()) THEN
    RAISE EXCEPTION 'No autorizado: este comercio no es tuyo'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.*
      FROM public.club_canjes c
      JOIN public.club_beneficios b ON b.id = c.beneficio_id
     WHERE b.comercio_id = p_comercio_id
       AND (p_desde IS NULL OR c.created_at >= p_desde::timestamptz)
       -- `< hasta + 1 dia`: con `<=` se pierde todo lo del ultimo dia, que es
       -- el error clasico de comparar un timestamptz contra una date.
       AND (p_hasta IS NULL OR c.created_at < (p_hasta + 1)::timestamptz)
  ),
  confirmados AS (SELECT * FROM base WHERE estado = 'confirmado'),
  por_persona AS (
    SELECT user_id, count(*) AS veces FROM confirmados GROUP BY user_id
  )
  SELECT
    (SELECT count(*) FROM confirmados)::integer,
    (SELECT count(*) FROM por_persona)::integer,
    (SELECT count(*) FROM por_persona WHERE veces >= 2)::integer,
    COALESCE((SELECT sum(ahorro) FROM confirmados), 0)::numeric,
    COALESCE((SELECT sum(monto_operacion) FROM confirmados), 0)::numeric,
    (SELECT count(*) FROM confirmados WHERE monto_operacion IS NOT NULL)::integer,
    (SELECT count(*) FROM base)::integer,
    (SELECT count(*) FROM base WHERE estado = 'pendiente')::integer,
    (SELECT count(*) FROM base WHERE estado = 'expirado')::integer,
    (SELECT count(*) FROM base WHERE estado = 'anulado')::integer,
    (SELECT min(created_at) FROM confirmados),
    (SELECT max(created_at) FROM confirmados);
END;
$fn$;

-- Desglose por beneficio: responde «cuál de mis beneficios trae gente», que es
-- la decisión que el comercio toma cuando renueva —sacar el que no mueve y
-- reforzar el que sí—.
CREATE OR REPLACE FUNCTION public.club_reporte_comercio_por_beneficio(
  p_comercio_id uuid,
  p_desde       date DEFAULT NULL,
  p_hasta       date DEFAULT NULL
)
RETURNS TABLE (
  beneficio_id  uuid,
  titulo        text,
  confirmados   integer,
  personas      integer,
  ahorro_total  numeric,
  consumo       numeric,
  sin_confirmar integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (public.is_comercio_member(p_comercio_id) OR public.is_board_member()) THEN
    RAISE EXCEPTION 'No autorizado: este comercio no es tuyo'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.titulo,
    count(*) FILTER (WHERE c.estado = 'confirmado')::integer,
    count(DISTINCT c.user_id) FILTER (WHERE c.estado = 'confirmado')::integer,
    COALESCE(sum(c.ahorro) FILTER (WHERE c.estado = 'confirmado'), 0)::numeric,
    COALESCE(sum(c.monto_operacion) FILTER (WHERE c.estado = 'confirmado'), 0)::numeric,
    count(*) FILTER (WHERE c.estado IN ('pendiente','expirado'))::integer
    FROM public.club_beneficios b
    -- LEFT JOIN a propósito: un beneficio publicado con CERO canjes es el dato
    -- más accionable del reporte, y un INNER JOIN lo haría desaparecer.
    LEFT JOIN public.club_canjes c
           ON c.beneficio_id = b.id
          AND (p_desde IS NULL OR c.created_at >= p_desde::timestamptz)
          AND (p_hasta IS NULL OR c.created_at < (p_hasta + 1)::timestamptz)
   WHERE b.comercio_id = p_comercio_id
   GROUP BY b.id, b.titulo, b.orden
   ORDER BY 3 DESC, b.orden;
END;
$fn$;

-- La serie mensual: es lo que convierte «te mandamos 47 personas» en «y venís
-- creciendo». Sin la serie, un número suelto no dice si el club está andando.
CREATE OR REPLACE FUNCTION public.club_reporte_comercio_por_mes(
  p_comercio_id uuid,
  p_meses       integer DEFAULT 12
)
RETURNS TABLE (
  mes          date,
  confirmados  integer,
  personas     integer,
  ahorro_total numeric,
  consumo      numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (public.is_comercio_member(p_comercio_id) OR public.is_board_member()) THEN
    RAISE EXCEPTION 'No autorizado: este comercio no es tuyo'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  -- La serie se genera completa y los canjes se le enganchan con LEFT JOIN:
  -- un mes sin canjes tiene que aparecer con 0, no faltar. Un gráfico que
  -- saltea los meses vacíos dibuja una línea plana donde hubo un derrumbe.
  WITH meses AS (
    SELECT generate_series(
             date_trunc('month', now()) - make_interval(months => GREATEST(p_meses, 1) - 1),
             date_trunc('month', now()),
             interval '1 month'
           )::date AS mes
  )
  SELECT
    m.mes,
    count(c.id) FILTER (WHERE c.estado = 'confirmado')::integer,
    count(DISTINCT c.user_id) FILTER (WHERE c.estado = 'confirmado')::integer,
    COALESCE(sum(c.ahorro) FILTER (WHERE c.estado = 'confirmado'), 0)::numeric,
    COALESCE(sum(c.monto_operacion) FILTER (WHERE c.estado = 'confirmado'), 0)::numeric
    FROM meses m
    LEFT JOIN public.club_beneficios b ON b.comercio_id = p_comercio_id
    LEFT JOIN public.club_canjes c
           ON c.beneficio_id = b.id
          AND date_trunc('month', c.created_at)::date = m.mes
   GROUP BY m.mes
   ORDER BY m.mes;
END;
$fn$;

REVOKE ALL ON FUNCTION public.club_reporte_comercio(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.club_reporte_comercio_por_beneficio(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.club_reporte_comercio_por_mes(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_reporte_comercio(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_reporte_comercio_por_beneficio(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_reporte_comercio_por_mes(uuid, integer) TO authenticated;
