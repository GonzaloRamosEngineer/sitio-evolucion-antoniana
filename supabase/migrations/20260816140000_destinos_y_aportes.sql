-- =============================================================================
-- FASE 1: `destinos` y `aportes` — el libro único con destino.
--
-- Implementa ROADMAP §10.7, §10.8 y §10.9. Lo que resuelve, en una línea:
-- **hoy la plata entra y el sistema no sabe para qué.** A partir de acá, cada
-- aporte sabe a dónde fue, y eso es lo que después se puede rendir.
--
-- DECISIÓN CENTRAL (§10.9): campaña, padrinable e institucional no son tres
-- cosas: son tres TIPOS del mismo concepto, el destino. Con una sola tabla la
-- rendición es una sola consulta para los tres; con tres tablas cada consulta
-- del libro necesita tres joins y tres caminos que se desincronizan.
--
-- NADA ACÁ NOMBRA A LA FUNDACIÓN NI ASUME SU RUBRO. El mismo esquema tiene que
-- servir a un refugio de animales, un club o una biblioteca popular. Lo que
-- varía por entidad son datos (§10.9), no columnas.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

-- =============================================================================
-- 1. DESTINOS — a dónde puede ir un aporte
-- =============================================================================
CREATE TABLE IF NOT EXISTS "public"."destinos" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- El discriminador. Ver §10.9 para por qué son tres tipos y no tres tablas.
  --   campana       -> objetivo concreto y finito, con meta. Cierra.
  --   padrinable    -> un sujeto sostenido en el tiempo. No cierra.
  --   institucional -> la entidad misma (cuota social, gastos de estructura).
  "tipo"        text NOT NULL CHECK ("tipo" IN ('campana','padrinable','institucional')),

  "nombre"      text NOT NULL,
  "slug"        text NOT NULL UNIQUE,
  "descripcion" text,
  "imagen_url"  text,

  -- Meta de recaudación. Típica de `campana`, pero NO se restringe por tipo a
  -- propósito: un padrinable con meta ("20 becas") es perfectamente razonable
  -- y no hay motivo para prohibirlo desde el esquema.
  "meta_monto"  numeric CHECK ("meta_monto" > 0),

  -- Cupos, para padrinables. Mismo criterio: sin atarlo al tipo.
  "cupos_totales" integer CHECK ("cupos_totales" > 0),

  -- ⚠️ LA COLUMNA MÁS IMPORTANTE DE ESTA TABLA (§10.9).
  --
  -- En una fundación con chicos el beneficiario NO se puede mostrar: son
  -- menores, y publicar "apadriná a Juan, 12 años" con foto los expone. En un
  -- refugio de animales pasa lo contrario: "Apadriná a Rocky" con foto e
  -- historia es el motor entero de la recaudación.
  --
  -- Por eso es un DATO del destino y no una regla del código. Y el default es
  -- `anonimizado` deliberadamente: si alguien crea un destino y no piensa en
  -- esto, no expone a nadie. **Mostrar un beneficiario tiene que ser un acto
  -- deliberado, nunca un olvido.**
  "visibilidad_beneficiario" text NOT NULL DEFAULT 'anonimizado'
    CHECK ("visibilidad_beneficiario" IN ('publico','anonimizado')),

  "estado"      text NOT NULL DEFAULT 'borrador'
    CHECK ("estado" IN ('borrador','activo','pausado','cerrado')),

  -- Qué formas de aporte admite. Las dos son independientes: una campaña
  -- puntual admite solo puntual, un padrinable normalmente solo recurrente, y
  -- la cuota social podría admitir las dos.
  "admite_puntual"    boolean NOT NULL DEFAULT true,
  "admite_recurrente" boolean NOT NULL DEFAULT false,

  "fecha_inicio" date,
  "fecha_fin"    date,
  "orden"        integer NOT NULL DEFAULT 0,

  -- Contadores desnormalizados, mantenidos por trigger (ver §4).
  -- Existen para que el progreso público se lea de `destinos` y NUNCA haya que
  -- exponer `aportes`, que es la tabla con los datos de cada persona.
  "monto_recaudado"   numeric NOT NULL DEFAULT 0,
  "cantidad_aportes"  integer NOT NULL DEFAULT 0,

  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "destinos_fechas_chk"
    CHECK ("fecha_fin" IS NULL OR "fecha_inicio" IS NULL OR "fecha_fin" >= "fecha_inicio"),

  -- Un destino que no admite ninguna forma de aporte no puede recibir nada:
  -- es un error de carga, no una configuración válida.
  CONSTRAINT "destinos_admite_algo_chk"
    CHECK ("admite_puntual" OR "admite_recurrente")
);

CREATE INDEX IF NOT EXISTS "idx_destinos_estado_tipo" ON "public"."destinos" ("estado", "tipo");
CREATE INDEX IF NOT EXISTS "idx_destinos_slug"        ON "public"."destinos" ("slug");

-- =============================================================================
-- 2. APORTES — el libro único
-- =============================================================================
CREATE TABLE IF NOT EXISTS "public"."aportes" (
  "id"       uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quién aportó. Nullable porque se puede aportar sin cuenta.
  "user_id"  uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,

  -- Identidad de respaldo (§10.1.c): hoy la misma persona puede figurar con
  -- tres emails distintos entre MercadoPago y la base. Guardar con qué datos
  -- aportó es lo que después permite reconciliar; sin esto, no hay forma.
  "email_aportante"  text,
  "nombre_aportante" text,

  "monto"  numeric NOT NULL CHECK ("monto" > 0),
  "fecha"  timestamptz NOT NULL DEFAULT now(),

  -- ⚠️ NOT NULL a propósito: es la consecuencia que faltaba (§10.7).
  -- Todo aporte sabe a dónde fue. Si no hay un destino específico, va al
  -- destino `institucional` — que es una respuesta, no un hueco. Permitir NULL
  -- sería volver a `donation_type`: un campo que nadie llena y no significa nada.
  --
  -- ON DELETE RESTRICT: no se borra un destino que ya recibió plata. Es un
  -- invariante contable, no una preferencia.
  "destino_id" uuid NOT NULL REFERENCES "public"."destinos"("id") ON DELETE RESTRICT,

  -- De dónde viene. `manual` desde el día uno y no es un extra: una entidad
  -- recibe efectivo, transferencias y cheques, y el día que entre otra pasarela
  -- además de MercadoPago, `aportes` no cambia (§10.2).
  "origen" text NOT NULL CHECK ("origen" IN ('donacion','membresia','manual')),

  "donation_id"   uuid REFERENCES "public"."donations"("id")   ON DELETE SET NULL,
  "membership_id" uuid REFERENCES "public"."memberships"("id") ON DELETE SET NULL,

  -- Idempotencia del webhook. Los webhooks de pago REINTENTAN: sin esto, un
  -- mismo cobro entra dos veces al libro y la rendición queda mal para siempre.
  -- UNIQUE con NULLs permitidos: los aportes manuales no tienen referencia.
  "referencia_externa" text UNIQUE,

  -- Acceso que otorga este aporte. NULLABLE a propósito: cuánto acceso da un
  -- aporte es una regla de la entidad (§10.4, §10.5) que todavía no se decidió.
  -- Poner NOT NULL acá obligaría a inventar una política ahora y a migrarla
  -- después. NULL significa "este aporte no otorga acceso", que es un estado
  -- legítimo.
  "acceso_desde" date,
  "acceso_hasta" date,

  "notas"      text,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  -- El origen y las FK tienen que contar la misma historia.
  CONSTRAINT "aportes_origen_chk" CHECK (
    ("origen" = 'donacion'  AND "donation_id" IS NOT NULL AND "membership_id" IS NULL)  OR
    ("origen" = 'membresia' AND "membership_id" IS NOT NULL AND "donation_id" IS NULL)  OR
    ("origen" = 'manual'    AND "donation_id" IS NULL AND "membership_id" IS NULL)
  ),

  CONSTRAINT "aportes_acceso_chk" CHECK (
    ("acceso_desde" IS NULL AND "acceso_hasta" IS NULL) OR
    ("acceso_desde" IS NOT NULL AND "acceso_hasta" IS NOT NULL AND "acceso_hasta" >= "acceso_desde")
  )
);

CREATE INDEX IF NOT EXISTS "idx_aportes_user_acceso" ON "public"."aportes" ("user_id", "acceso_hasta" DESC);
CREATE INDEX IF NOT EXISTS "idx_aportes_destino"     ON "public"."aportes" ("destino_id", "fecha" DESC);
CREATE INDEX IF NOT EXISTS "idx_aportes_email"       ON "public"."aportes" (lower("email_aportante"));

-- =============================================================================
-- 3. memberships.destino_id + EL ÍNDICE ÚNICO CONTRA EL DOBLE COBRO
-- =============================================================================
ALTER TABLE "public"."memberships"
  ADD COLUMN IF NOT EXISTS "destino_id" uuid REFERENCES "public"."destinos"("id") ON DELETE SET NULL;

-- Acá sí. La restricción es sobre el PAR (user_id, destino_id), no sobre
-- user_id solo: un padrino que sostiene dos becas —o dos animales en un
-- refugio— son dos suscripciones legítimas de la misma persona, y un UNIQUE
-- sobre user_id las volvería imposibles (por eso no entró en 20260816130000).
--
-- Lo que sí es un error es suscribirse DOS VECES AL MISMO destino: eso es el
-- doble clic que en producción generó cuatro suscripciones idénticas el mismo
-- día (§10.10.c). Si se hubieran activado, se le cobraba cuatro veces.
--
-- Parcial sobre los estados vivos: cancelled y expired no estorban, así que
-- alguien puede volver a suscribirse a un destino que dio de baja.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_membresia_viva_por_destino"
  ON "public"."memberships" ("user_id", "destino_id")
  WHERE "status" IN ('pending','active','paused')
    AND "user_id" IS NOT NULL
    AND "destino_id" IS NOT NULL;

-- =============================================================================
-- 4. Contadores del destino, por trigger
--
-- Se mantienen desnormalizados para que la barra de progreso pública salga de
-- `destinos` y NUNCA haya que darle acceso a `aportes`. Después de lo que pasó
-- con las vistas (20260816120000), la regla es: los datos por persona no se
-- exponen ni siquiera agregados desde su propia tabla.
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."recalcular_totales_destino"("p_destino_id" uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.destinos d
     SET monto_recaudado  = COALESCE(t.suma, 0),
         cantidad_aportes = COALESCE(t.cuenta, 0),
         updated_at       = now()
    FROM (
      SELECT COALESCE(SUM(monto), 0) AS suma, COUNT(*) AS cuenta
        FROM public.aportes WHERE destino_id = p_destino_id
    ) t
   WHERE d.id = p_destino_id;
$$;

CREATE OR REPLACE FUNCTION "public"."trg_aportes_totales"()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;

DROP TRIGGER IF EXISTS "trg_aportes_totales" ON "public"."aportes";
CREATE TRIGGER "trg_aportes_totales"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."aportes"
  FOR EACH ROW EXECUTE FUNCTION "public"."trg_aportes_totales"();

-- =============================================================================
-- 5. RLS
--
-- `aportes` es la tabla que otorga privilegios: si alguien puede insertar ahí,
-- se autoconcede acceso. Se aplica lo aprendido en la auditoría (§C):
-- permisos mínimos, anon sin nada, y los GRANT acompañando a las policies en
-- vez de ser anchos "por las dudas".
-- =============================================================================
ALTER TABLE "public"."destinos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."aportes"  ENABLE ROW LEVEL SECURITY;

-- --- destinos ---------------------------------------------------------------
-- Lectura pública SOLO de los activos: un borrador no se muestra.
DROP POLICY IF EXISTS "destinos_public_read_activos" ON "public"."destinos";
CREATE POLICY "destinos_public_read_activos" ON "public"."destinos"
  FOR SELECT USING ("estado" = 'activo');

DROP POLICY IF EXISTS "destinos_board_all" ON "public"."destinos";
CREATE POLICY "destinos_board_all" ON "public"."destinos"
  TO "authenticated"
  USING ("public"."is_board_member"())
  WITH CHECK ("public"."is_board_member"());

-- --- aportes ----------------------------------------------------------------
-- Cada quien ve lo suyo.
DROP POLICY IF EXISTS "aportes_select_propio" ON "public"."aportes";
CREATE POLICY "aportes_select_propio" ON "public"."aportes"
  FOR SELECT TO "authenticated"
  USING ("user_id" = "auth"."uid"());

-- La comisión y admin ven todo.
DROP POLICY IF EXISTS "aportes_select_board" ON "public"."aportes";
CREATE POLICY "aportes_select_board" ON "public"."aportes"
  FOR SELECT TO "authenticated"
  USING ("public"."is_board_member"());

-- Carga manual (efectivo, transferencia): solo admin/comisión.
DROP POLICY IF EXISTS "aportes_insert_board_manual" ON "public"."aportes";
CREATE POLICY "aportes_insert_board_manual" ON "public"."aportes"
  FOR INSERT TO "authenticated"
  WITH CHECK ("public"."is_board_member"() AND "origen" = 'manual');

DROP POLICY IF EXISTS "aportes_update_board" ON "public"."aportes";
CREATE POLICY "aportes_update_board" ON "public"."aportes"
  FOR UPDATE TO "authenticated"
  USING ("public"."is_board_member"())
  WITH CHECK ("public"."is_board_member"());

-- ⚠️ NO hay policy de DELETE sobre `aportes`, y es deliberado: un libro
-- contable no se borra. Si un aporte se cargó mal se corrige con UPDATE y
-- queda el rastro. `service_role` puede borrar (puentea RLS) si hiciera falta
-- una corrección excepcional.

-- --- GRANTS -----------------------------------------------------------------
-- Mínimos, y acompañando a las policies. NADA para anon: el progreso público
-- se lee de `destinos`, nunca de `aportes`.
REVOKE ALL ON TABLE "public"."aportes"  FROM "anon", "authenticated";
REVOKE ALL ON TABLE "public"."destinos" FROM "anon", "authenticated";

GRANT SELECT                   ON TABLE "public"."destinos" TO "anon";
GRANT SELECT, INSERT, UPDATE   ON TABLE "public"."destinos" TO "authenticated";
GRANT SELECT, INSERT, UPDATE   ON TABLE "public"."aportes"  TO "authenticated";
GRANT ALL                      ON TABLE "public"."destinos" TO "service_role";
GRANT ALL                      ON TABLE "public"."aportes"  TO "service_role";

-- =============================================================================
-- 6. Destino institucional inicial
--
-- Tiene que existir desde el arranque porque `aportes.destino_id` es NOT NULL:
-- es la respuesta a "entró plata sin destino específico". El nombre es
-- genérico a propósito — cada entidad lo renombra desde el panel.
-- =============================================================================
INSERT INTO "public"."destinos" ("tipo","nombre","slug","descripcion","estado","admite_puntual","admite_recurrente")
VALUES (
  'institucional',
  'Sostenimiento institucional',
  'sostenimiento-institucional',
  'Aportes que sostienen el funcionamiento de la entidad: administración, espacio físico y equipo de trabajo.',
  'activo', true, true
)
ON CONFLICT ("slug") DO NOTHING;

-- =============================================================================
-- LO QUE NO ESTÁ ACÁ, Y ES A PROPÓSITO
--
-- - `gastos` (los egresos). Es la fase 2 y es la mitad que falta del libro:
--   sin ella no hay rendición posible, solo recaudación con destino. Va sola
--   porque trae la reutilización del Storage privado para los comprobantes.
--
-- - El backfill de `donations`/`memberships` a `aportes`. Va aparte y con
--   criterio explícito: hoy hay 7 suscripciones, ninguna activa y todas con
--   pinta de prueba (§10.10), así que probablemente lo correcto sea NO
--   backfillearlas. Esa es una decisión de la entidad, no del esquema.
--
-- - La regla de conversión aporte -> meses de acceso (§10.4.1). Depende de las
--   cinco decisiones de negocio que siguen abiertas. Por eso `acceso_desde` y
--   `acceso_hasta` son nullable: el libro ya puede registrar, y la política se
--   aplica cuando exista.
-- =============================================================================
