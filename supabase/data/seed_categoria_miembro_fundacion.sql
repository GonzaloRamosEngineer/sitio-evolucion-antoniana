-- =============================================================================
-- La categoría única de la Fundación (decisión del 2026-09-05).
--
-- NO ES UNA MIGRACIÓN: es un dato de ESTE cliente, igual que
-- `seed_destinos_fundacion.sql`. Otra entidad tendrá otras categorías, o varias.
--
-- LA DECISIÓN, Y POR QUÉ ESTA Y NO OTRA
--
-- Se evaluó cargar varios niveles (Activo / Adherente / Protector, con
-- descuentos distintos) y se decidió **una sola, con descuento 0%**. El motivo
-- es que hoy no hay nada que descontar: las 12 actividades son gratuitas
-- (ROADMAP §10.1.d). Inventar tres niveles con porcentajes distintos sobre una
-- oferta que cuesta cero sería una escalera a ninguna parte, y de las que
-- después cuesta bajarse porque ya se comunicaron.
--
-- Cuando exista la primera actividad arancelada, esto se resuelve **cargando
-- filas**, no migrando: se agregan las categorías que hagan falta y se les pone
-- su `descuento_actividades_pct`. La maquinaria ya está.
--
-- ⚠️ `por_defecto = true` NO es un detalle. Sin eso, el alta automática deja
-- `categoria_id` en NULL y esta fila no la tiene nadie: la categoría existiría
-- en un ABM y no gobernaría nada. Es el mismo modo de falla que tuvo
-- `entidad.vocabulario` durante tres semanas (§10.27).
--
-- EL NOMBRE. Dice 'General' y no 'Padrino' a propósito: 'padrino' es la FIGURA
-- —cómo esta entidad llama a quien aporta, y eso vive en
-- `entidad.vocabulario.aportante`— mientras que esto es el NIVEL dentro de esa
-- figura. Llamarla 'Padrino' haría que el carnet mostrara «Padrino» en el badge
-- y «Categoría: Padrino» debajo, que se lee como un error.
--
-- El monto es la cuota vigente ($5.000, la misma de `reglas_acceso`), y es
-- simbólica a propósito: se buscó volumen de aportantes, no margen por aportante.
--
-- Idempotente: se puede correr dos veces.
-- =============================================================================

INSERT INTO public.categorias_miembro
  (nombre, slug, descripcion, cuota_mensual, descuento_actividades_pct, por_defecto, activa, orden)
SELECT 'General',
       'general',
       'Categoría única. La condición que da aportar de forma sostenida.',
       5000,
       0,
       true,
       true,
       0
WHERE NOT EXISTS (SELECT 1 FROM public.categorias_miembro WHERE slug = 'general');

-- Los que ya estaban en el padrón sin categoría. El backfill de la migración
-- corre ANTES que esta semilla —la categoría todavía no existía—, así que sin
-- este UPDATE los primeros miembros quedan sin categoría para siempre.
--
-- Solo toca `categoria_id IS NULL`: una asignación hecha a mano por la comisión
-- no se pisa.
UPDATE public.miembros
   SET categoria_id = public.categoria_miembro_por_defecto()
 WHERE categoria_id IS NULL
   AND public.categoria_miembro_por_defecto() IS NOT NULL;
