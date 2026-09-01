-- =====================================================================
-- CLUB DE BENEFICIOS — FASE 2: el comercio como actor y el canje como hecho
-- (ROADMAP §12.2 a §12.5, orden de §12.8)
--
-- La fase 1 dejó el carnet y el bloqueo del catálogo, pero el club sigue
-- siendo "un listado de cupones" (12.1.a): `benefits.codigo` es un texto fijo,
-- igual para todo el mundo y de lectura pública. Un código así no se puede
-- limitar, ni vencer, ni contar, ni atribuir a nadie.
--
-- Esta migración construye lo que falta para el modelo C (12.2): el comercio
-- existe como contraparte operativa, y cada uso del beneficio deja un registro.
--
-- LAS DOS DECISIONES QUE ORDENAN TODO EL ARCHIVO
--
--   1) El token de canje ES el canje en estado pendiente (12.2). No hay tabla
--      de tokens ni store externo: `club_canjes` nace 'pendiente' con un código
--      de 6 caracteres y un vencimiento, y el cajero lo pasa a 'confirmado'.
--      De regalo quedan registrados los canjes ABANDONADOS, que son la métrica
--      que delata a un comercio que no está usando el sistema.
--
--   2) `club_canjes` es de SOLO LECTURA para todo el mundo (12.5). Es la tabla
--      que otorga valor económico: si el browser pudiera insertar ahí,
--      cualquiera con las devtools abiertas se autogenera canjes confirmados y
--      del otro lado hay un comercio esperando que le paguen. Se escribe
--      únicamente desde las Edge Functions con `service_role`, que bypassean
--      RLS. Por eso abajo NO hay ninguna policy de INSERT/UPDATE/DELETE: su
--      ausencia es la protección, no un olvido.
--
-- PORTABILIDAD (12.7). Todo lleva prefijo `club_`. El módulo no referencia
-- ninguna tabla del proyecto salvo `users(id)` y el `partner_id` OPCIONAL, y
-- nunca pregunta POR QUÉ alguien es elegible: solo llama a
-- `public.tiene_acceso(uuid)`. Cero marca de la entidad acá adentro, y todo
-- parámetro variable vive en `club_config`.
--
-- NO MODIFICA NINGUNA TABLA EXISTENTE (12.4). `benefits` queda intacta y se
-- deprecia después migrando su contenido a `club_beneficios`; romper las
-- páginas públicas de entrada no aporta nada.
-- =====================================================================

SET statement_timeout = 0;
SET client_min_messages = warning;

-- ---------------------------------------------------------------------
-- 1) Parámetros del módulo (12.7 regla 4: ninguna constante mágica)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_config (
  clave       text PRIMARY KEY,
  valor       jsonb NOT NULL,
  descripcion text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.club_config IS
  'Parámetros del club. Cambiar acá no requiere deploy (mismo criterio que 10.5).';

INSERT INTO public.club_config (clave, valor, descripcion) VALUES
  ('canje_ttl_minutos', '5'::jsonb,
   'Cuánto vive un canje pendiente. Corto a propósito: el código se genera EN LA CAJA (12.3).'),
  ('anulacion_ventana_minutos', '30'::jsonb,
   'Ventana para anular una venta ya confirmada. El canje no se borra: pasa a anulado.'),
  ('confirmacion_diferida_horas', '2'::jsonb,
   'Local sin señal (12.3): el cajero rescata códigos de las últimas N horas al recuperar conexión.'),
  ('monto_operacion_obligatorio', 'false'::jsonb,
   'Decisión 12.9.2: opcional. Si se exige de entrada, el cajero lo completa con cualquier número.'),
  -- Postgres corre en UTC. Sin esto, "un canje por día" se reiniciaría a las
  -- 21:00 hora argentina y la misma persona podría canjear dos veces la misma
  -- noche. Es un parámetro del despliegue, no marca de la entidad (12.7 regla 3).
  ('zona_horaria', '"America/Argentina/Buenos_Aires"'::jsonb,
   'Huso en el que se calculan el día, la vigencia, los días de semana y el horario de un beneficio.')
ON CONFLICT (clave) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) El comercio
--
-- POR QUÉ NO SE EXTIENDE `partners` (12.4): hoy `partners` son sponsors
-- institucionales y sus logos van a la Home. Si se mezclan, la primera
-- pizzería que entre al club aparece en la grilla de aliados de la Fundación.
-- Son dos relaciones distintas con la entidad, aunque una empresa pueda ser
-- las dos cosas — de ahí el `partner_id` opcional, que además puede quedar
-- NULL siempre en un fork (12.7 regla 2).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_comercios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  nombre      text NOT NULL CHECK (length(btrim(nombre)) > 0),
  rubro       text,
  cuit        text,
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url    text,
  descripcion text,
  estado      text NOT NULL DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente','activo','pausado','baja')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.club_comercios.estado IS
  'baja = ficha archivada. Sus canjes NO se borran nunca: son el libro contable del club (12.9.3).';

CREATE INDEX IF NOT EXISTS idx_club_comercios_estado ON public.club_comercios (estado);

-- ---------------------------------------------------------------------
-- 3) Sucursales
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_sucursales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id uuid NOT NULL REFERENCES public.club_comercios(id) ON DELETE CASCADE,
  nombre      text NOT NULL CHECK (length(btrim(nombre)) > 0),
  direccion   text,
  lat         numeric CHECK (lat BETWEEN -90 AND 90),
  lng         numeric CHECK (lng BETWEEN -180 AND 180),
  horarios    jsonb,
  telefono    text,
  activa      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_sucursales_comercio ON public.club_sucursales (comercio_id);

-- ---------------------------------------------------------------------
-- 4) Quién opera cada comercio, y la función que lo responde
--
-- NO se agrega un rol 'comercio' al CHECK de `users.role` (12.5): la
-- pertenencia a esta tabla ES el rol. Así una persona puede ser dueña de dos
-- comercios sin romper el modelo, y el redirect post-login se deriva de tener
-- fila acá.
--
-- SECURITY DEFINER por la misma razón que `is_board_member()`: las policies de
-- las otras tablas la llaman, y sin DEFINER la lectura de esta tabla entraría
-- en recursión con su propia policy.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_comercio_usuarios (
  comercio_id uuid NOT NULL REFERENCES public.club_comercios(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rol         text NOT NULL DEFAULT 'cajero' CHECK (rol IN ('dueno','cajero')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comercio_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_comercio_usuarios_user
  ON public.club_comercio_usuarios (user_id);

CREATE OR REPLACE FUNCTION public.is_comercio_member(p_comercio_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_comercio_usuarios
     WHERE comercio_id = p_comercio_id AND user_id = auth.uid()
  );
$$;

-- Para el redirect post-login: ¿esta persona opera algún comercio?
CREATE OR REPLACE FUNCTION public.mis_comercios()
RETURNS TABLE (comercio_id uuid, rol text, nombre text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cu.comercio_id, cu.rol, c.nombre, c.slug
    FROM public.club_comercio_usuarios cu
    JOIN public.club_comercios c ON c.id = cu.comercio_id
   WHERE cu.user_id = auth.uid() AND c.estado <> 'baja';
$$;

-- ---------------------------------------------------------------------
-- 5) El catálogo del club
--
-- `requiere_acceso` es true POR DEFECTO acá, al revés que en `benefits`
-- (donde el default es false para no cambiar el comportamiento al aplicar la
-- fase 1). En el club el sentido se invierte: un beneficio que no distingue a
-- un socio de un visitante no es un beneficio del club, es publicidad.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_beneficios (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comercio_id        uuid NOT NULL REFERENCES public.club_comercios(id) ON DELETE CASCADE,
  titulo             text NOT NULL CHECK (length(btrim(titulo)) > 0),
  descripcion        text,
  terminos           text,
  tipo               text NOT NULL CHECK (tipo IN ('porcentaje','monto_fijo','2x1','regalo')),
  valor              numeric CHECK (valor >= 0),
  requiere_acceso    boolean NOT NULL DEFAULT true,

  -- Límites. Se validan en la Edge Function; la base es red de contención (ver 7).
  limite_por_persona integer CHECK (limite_por_persona > 0),
  ventana            text CHECK (ventana IN ('dia','semana','mes','total')),
  limite_total       integer CHECK (limite_total > 0),
  stock              integer CHECK (stock >= 0),

  vigencia_desde     date,
  vigencia_hasta     date,
  dias_semana        integer[] CHECK (dias_semana <@ ARRAY[0,1,2,3,4,5,6]),
  hora_desde         time,
  hora_hasta         time,

  estado             text NOT NULL DEFAULT 'borrador'
                     CHECK (estado IN ('borrador','activo','pausado','baja')),
  orden              integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- Un porcentaje sin valor, o un 2x1 con valor, es un beneficio mal cargado
  -- que recién se descubriría en el mostrador.
  CONSTRAINT club_beneficios_valor_chk CHECK (
    (tipo IN ('porcentaje','monto_fijo') AND valor IS NOT NULL)
    OR tipo IN ('2x1','regalo')
  ),
  CONSTRAINT club_beneficios_pct_chk CHECK (tipo <> 'porcentaje' OR valor <= 100),
  CONSTRAINT club_beneficios_vigencia_chk CHECK (
    vigencia_desde IS NULL OR vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde
  ),
  -- `ventana` sin `limite_por_persona` no significa nada, y al revés tampoco.
  CONSTRAINT club_beneficios_limite_chk CHECK (
    (limite_por_persona IS NULL AND ventana IS NULL)
    OR (limite_por_persona IS NOT NULL AND ventana IS NOT NULL)
  )
);

COMMENT ON COLUMN public.club_beneficios.estado IS
  'Nace en borrador a propósito: la redacción la controla la entidad junto al comercio (12.3), y ahí se generan casi todos los conflictos de mostrador.';

CREATE INDEX IF NOT EXISTS idx_club_beneficios_comercio ON public.club_beneficios (comercio_id);
CREATE INDEX IF NOT EXISTS idx_club_beneficios_estado   ON public.club_beneficios (estado, orden);

-- ---------------------------------------------------------------------
-- 6) El código: alfabeto sin ambiguos
--
-- Sin 0/O ni 1/I/L (12.4). El código se dicta en voz alta en un mostrador
-- ruidoso y se tipea en el teléfono del cajero: un cero que se lee "o" es un
-- canje fallido y una discusión con el socio.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_nuevo_codigo()
RETURNS text
LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT string_agg(
           substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ', 1 + floor(random() * 31)::int, 1),
           ''
         )
    FROM generate_series(1, 6);
$$;

-- ---------------------------------------------------------------------
-- 7) El libro de canjes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_canjes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id     uuid NOT NULL REFERENCES public.club_beneficios(id) ON DELETE RESTRICT,
  sucursal_id      uuid REFERENCES public.club_sucursales(id) ON DELETE SET NULL,
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

  codigo           text NOT NULL UNIQUE CHECK (codigo ~ '^[2-9A-HJKMNP-Z]{6}$'),
  estado           text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente','confirmado','expirado','anulado')),
  expira_en        timestamptz NOT NULL,

  cajero_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  confirmado_en    timestamptz,
  monto_operacion  numeric CHECK (monto_operacion >= 0),
  ahorro           numeric CHECK (ahorro >= 0),

  anulado_en       timestamptz,
  anulado_por      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  motivo_anulacion text,

  -- Clave de deduplicación del límite por persona. La calcula la Edge Function
  -- desde `ventana` ('dia:2026-08-30', 'mes:2026-08', 'total'…) y la escribe
  -- SOLO cuando `limite_por_persona = 1`. Ver el índice de abajo.
  clave_limite     text,

  created_at       timestamptz NOT NULL DEFAULT now(),

  -- Un canje confirmado sin cajero ni fecha es un registro que no se puede
  -- auditar, y esta tabla es la que le dice al comercio cuánto le deben.
  CONSTRAINT club_canjes_confirmado_chk CHECK (
    estado <> 'confirmado' OR (confirmado_en IS NOT NULL AND cajero_id IS NOT NULL)
  ),
  CONSTRAINT club_canjes_anulado_chk CHECK (
    estado <> 'anulado' OR anulado_en IS NOT NULL
  )
);

COMMENT ON TABLE public.club_canjes IS
  'El libro del club, y a la vez el store de tokens (12.2). SOLO LECTURA para anon y authenticated: se escribe únicamente desde las Edge Functions con service_role. Los canjes no se borran nunca, ni siquiera los de un comercio dado de baja (12.9.3).';

COMMENT ON COLUMN public.club_canjes.estado IS
  'expirado = el cajero no confirmó a tiempo. NO es un error: es la métrica de adopción del comercio (12.3).';

CREATE INDEX IF NOT EXISTS idx_club_canjes_user     ON public.club_canjes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_canjes_benef    ON public.club_canjes (beneficio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_canjes_sucursal ON public.club_canjes (sucursal_id, created_at DESC);
-- Para el reaper y para el rescate de códigos del cajero sin señal.
CREATE INDEX IF NOT EXISTS idx_club_canjes_pendientes
  ON public.club_canjes (expira_en) WHERE estado = 'pendiente';

-- RED DE CONTENCIÓN del límite por persona (12.5).
--
-- El doble clic en un celular lento es más frecuente que el atacante, y la
-- Edge Function valida-y-después-inserta, que es una carrera. Este índice la
-- cierra en la base.
--
-- ALCANCE, explícito para que nadie le crea de más: cubre únicamente los
-- beneficios con `limite_por_persona = 1`, que es cuando "ya usaste este
-- beneficio en esta ventana" equivale a "existe una fila". El ROADMAP pedía el
-- caso 'uno por día'; `clave_limite` lo generaliza a las cuatro ventanas con el
-- mismo mecanismo. Con límite > 1 hay que CONTAR, y eso queda en la Edge
-- Function sin red debajo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_canjes_limite_persona
  ON public.club_canjes (user_id, beneficio_id, clave_limite)
  WHERE clave_limite IS NOT NULL AND estado IN ('pendiente','confirmado');

-- ---------------------------------------------------------------------
-- 8) El reaper de pendientes vencidos
--
-- Mismo patrón que el de `memberships` (20260816130000). Sin esto, un canje
-- abandonado queda 'pendiente' para siempre y bloquea el índice de arriba: la
-- persona no podría volver a generar ese beneficio nunca más.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.club_expirar_canjes()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_filas integer;
BEGIN
  UPDATE public.club_canjes
     SET estado = 'expirado'
   WHERE estado = 'pendiente' AND expira_en < now();
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  RETURN v_filas;
END;
$$;

-- ---------------------------------------------------------------------
-- 9) RLS
--
-- Lectura: el socio ve lo suyo, el comercio lo de su comercio, admin y
-- comisión todo, `anon` solo el catálogo activo y NADA de canjes (12.5: no
-- repetir el patrón de GRANTs amplios de 10.1.g).
-- ---------------------------------------------------------------------
ALTER TABLE public.club_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_comercios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_sucursales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_comercio_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_beneficios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_canjes            ENABLE ROW LEVEL SECURITY;

-- --- club_config: lectura para quien está logueado; escribe la comisión ---
DROP POLICY IF EXISTS club_config_read  ON public.club_config;
DROP POLICY IF EXISTS club_config_board ON public.club_config;
CREATE POLICY club_config_read  ON public.club_config FOR SELECT TO authenticated USING (true);
CREATE POLICY club_config_board ON public.club_config FOR ALL TO authenticated
  USING (public.is_board_member()) WITH CHECK (public.is_board_member());

-- --- club_comercios ---
DROP POLICY IF EXISTS club_comercios_publico ON public.club_comercios;
DROP POLICY IF EXISTS club_comercios_propio  ON public.club_comercios;
DROP POLICY IF EXISTS club_comercios_board   ON public.club_comercios;
CREATE POLICY club_comercios_publico ON public.club_comercios FOR SELECT
  TO anon, authenticated USING (estado = 'activo');
CREATE POLICY club_comercios_propio ON public.club_comercios FOR SELECT
  TO authenticated USING (public.is_comercio_member(id));
CREATE POLICY club_comercios_board ON public.club_comercios FOR ALL
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

-- --- club_sucursales ---
DROP POLICY IF EXISTS club_sucursales_publico ON public.club_sucursales;
DROP POLICY IF EXISTS club_sucursales_propio  ON public.club_sucursales;
DROP POLICY IF EXISTS club_sucursales_board   ON public.club_sucursales;
CREATE POLICY club_sucursales_publico ON public.club_sucursales FOR SELECT
  TO anon, authenticated USING (
    activa AND EXISTS (SELECT 1 FROM public.club_comercios c
                        WHERE c.id = comercio_id AND c.estado = 'activo')
  );
CREATE POLICY club_sucursales_propio ON public.club_sucursales FOR ALL
  TO authenticated USING (public.is_comercio_member(comercio_id))
  WITH CHECK (public.is_comercio_member(comercio_id));
CREATE POLICY club_sucursales_board ON public.club_sucursales FOR ALL
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

-- --- club_comercio_usuarios: quién opera dónde ---
-- El alta la hace la comisión. Un dueño que pudiera agregarse gente solo
-- podría sumar a cualquiera al panel donde se confirman canjes.
DROP POLICY IF EXISTS club_comercio_usuarios_propio ON public.club_comercio_usuarios;
DROP POLICY IF EXISTS club_comercio_usuarios_board  ON public.club_comercio_usuarios;
CREATE POLICY club_comercio_usuarios_propio ON public.club_comercio_usuarios FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_comercio_member(comercio_id));
CREATE POLICY club_comercio_usuarios_board ON public.club_comercio_usuarios FOR ALL
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

-- --- club_beneficios ---
DROP POLICY IF EXISTS club_beneficios_publico ON public.club_beneficios;
DROP POLICY IF EXISTS club_beneficios_propio  ON public.club_beneficios;
DROP POLICY IF EXISTS club_beneficios_board   ON public.club_beneficios;
CREATE POLICY club_beneficios_publico ON public.club_beneficios FOR SELECT
  TO anon, authenticated USING (
    estado = 'activo' AND EXISTS (SELECT 1 FROM public.club_comercios c
                                   WHERE c.id = comercio_id AND c.estado = 'activo')
  );
CREATE POLICY club_beneficios_propio ON public.club_beneficios FOR ALL
  TO authenticated USING (public.is_comercio_member(comercio_id))
  WITH CHECK (public.is_comercio_member(comercio_id));
CREATE POLICY club_beneficios_board ON public.club_beneficios FOR ALL
  TO authenticated USING (public.is_board_member()) WITH CHECK (public.is_board_member());

-- --- club_canjes: SOLO SELECT, y para nadie más que los tres interesados ---
-- No hay policy de INSERT/UPDATE/DELETE, y eso es deliberado (ver cabecera).
DROP POLICY IF EXISTS club_canjes_socio    ON public.club_canjes;
DROP POLICY IF EXISTS club_canjes_comercio ON public.club_canjes;
DROP POLICY IF EXISTS club_canjes_board    ON public.club_canjes;
CREATE POLICY club_canjes_socio ON public.club_canjes FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY club_canjes_comercio ON public.club_canjes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.club_beneficios b
             WHERE b.id = beneficio_id AND public.is_comercio_member(b.comercio_id))
  );
CREATE POLICY club_canjes_board ON public.club_canjes FOR SELECT
  TO authenticated USING (public.is_board_member());

-- ---------------------------------------------------------------------
-- 10) GRANTs
--
-- Explícitos y acotados. `anon` no toca canjes, ni config, ni la tabla que
-- dice quién opera cada comercio.
-- ---------------------------------------------------------------------
REVOKE ALL ON public.club_config            FROM anon, authenticated;
REVOKE ALL ON public.club_comercios         FROM anon, authenticated;
REVOKE ALL ON public.club_sucursales        FROM anon, authenticated;
REVOKE ALL ON public.club_comercio_usuarios FROM anon, authenticated;
REVOKE ALL ON public.club_beneficios        FROM anon, authenticated;
REVOKE ALL ON public.club_canjes            FROM anon, authenticated;

GRANT SELECT ON public.club_comercios  TO anon, authenticated;
GRANT SELECT ON public.club_sucursales TO anon, authenticated;
GRANT SELECT ON public.club_beneficios TO anon, authenticated;

GRANT SELECT ON public.club_config            TO authenticated;
GRANT SELECT ON public.club_comercio_usuarios TO authenticated;
GRANT SELECT ON public.club_canjes            TO authenticated;

-- Escrituras del panel admin y del panel del comercio. Quién puede hacer qué
-- lo deciden las policies de arriba; el GRANT solo abre la puerta.
GRANT INSERT, UPDATE, DELETE ON public.club_config            TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.club_comercios         TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.club_sucursales        TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.club_comercio_usuarios TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.club_beneficios        TO authenticated;

GRANT ALL ON public.club_config            TO service_role;
GRANT ALL ON public.club_comercios         TO service_role;
GRANT ALL ON public.club_sucursales        TO service_role;
GRANT ALL ON public.club_comercio_usuarios TO service_role;
GRANT ALL ON public.club_beneficios        TO service_role;
GRANT ALL ON public.club_canjes            TO service_role;

-- Las funciones de pertenencia las usan las policies; `club_nuevo_codigo` y el
-- reaper son de servicio y no tienen por qué estar al alcance del browser.
REVOKE ALL ON FUNCTION public.club_nuevo_codigo()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.club_expirar_canjes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_nuevo_codigo()      TO service_role;
GRANT EXECUTE ON FUNCTION public.club_expirar_canjes()    TO service_role;
GRANT EXECUTE ON FUNCTION public.is_comercio_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mis_comercios()          TO authenticated, service_role;
