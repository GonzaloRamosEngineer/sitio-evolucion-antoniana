-- =====================================================================
-- REQUISITOS DEL BENEFICIO DE DIGITALMATCH (ROADMAP §12.11)
--
-- NO ES UNA MIGRACIÓN: son parámetros de la entidad, editables desde
-- `/admin → Club de beneficios → DigitalMatch Global`. Este archivo existe
-- para dejar asentado CON QUÉ NÚMEROS se arrancó y por qué.
--
--   bash tools/db.sh sql < supabase/data/requisitos_beneficio_digitalmatch.sql
--
-- LA CUENTA, con la cuota de $5.000 que la entidad decidió mantener simbólica
-- para maximizar cantidad de socios:
--
--   ANTES:  aporte $5.000  ->  30% de $150.000 = $45.000 de ahorro
--           La persona gana $40.000 netos, la Fundación recibe $5.000, el
--           comercio pone $45.000. Y con `limite_por_persona = 1/total`, no le
--           queda ninguna razón para volver a aportar: el club premiaba irse.
--
--   AHORA:  6 meses de cuota ($30.000) O $30.000 acumulados de una vez,
--           y el ahorro topado en $30.000.
--           La persona aporta $30.000 y ahorra $30.000 -> queda a la par, y
--           sostuvo la Fundación medio año en el camino, que es el punto.
--           La Fundación recibe 6x más. El comercio pone un tercio.
--
-- POR QUÉ 6 Y NO 12. Doce meses ($60.000 de aporte contra $30.000 de ahorro)
-- dejaría el beneficio en pérdida para el socio, y entonces no es un beneficio.
-- Seis lo deja a la par: la reciprocidad no es el motivo por el que alguien
-- sostiene una fundación (§10.7 la pone última de cinco), pero tampoco puede
-- ser un mal negocio explícito.
--
-- POR QUÉ LOS DOS CAMINOS SON "O" Y NO "Y". Quien pone $30.000 de una vez es
-- quien MÁS aporta: pedirle además que espere medio año lo dejaría afuera.
--
-- ⚠️ ESTOS NÚMEROS SON PROVISORIOS Y ESTÁ BIEN QUE LO SEAN. §12.6 ya fijó el
-- criterio para los niveles: los umbrales se fijan con datos reales. Hoy hay
-- 0 personas con acceso vigente, así que no hay datos: son la mejor estimación
-- posible y se revisan cuando haya socios. Por eso viven en la base y no en el
-- código, y se editan desde el panel sin desplegar nada.
-- =====================================================================

BEGIN;

UPDATE public.club_beneficios
   SET antiguedad_minima_meses = 6,
       aporte_minimo_acumulado = 30000,
       ahorro_maximo           = 30000,
       -- Los términos tienen que decir lo mismo que hace el sistema. Un
       -- descuento topado que no lo aclara es un conflicto de mostrador
       -- esperando (§12.3, los casos borde se resuelven antes).
       terminos = 'Aplica sobre presupuestos nuevos de desarrollo de sitios web o '
                  || 'landing pages. Para socios con seis meses de aporte o $30.000 '
                  || 'acumulados. El descuento del 30% se aplica con un tope de '
                  || '$30.000. No es acumulable con otras promociones ni aplicable a '
                  || 'presupuestos ya aprobados. No incluye rediseños de sitios '
                  || 'existentes ni mantenimiento. Válido una sola vez por persona. '
                  || 'El código se valida al momento de contratar.'
 WHERE id = 'dc100000-0000-4000-8000-000000000003';

\echo '--- control: los tres requisitos cargados (esperado: 6 | 30000 | 30000) ---'
SELECT titulo, antiguedad_minima_meses, aporte_minimo_acumulado, ahorro_maximo
  FROM public.club_beneficios WHERE estado = 'activo';

\echo '--- y que los terminos digan el tope (esperado: t) ---'
SELECT terminos ILIKE '%tope de $30.000%' AS los_terminos_avisan_del_tope
  FROM public.club_beneficios WHERE id = 'dc100000-0000-4000-8000-000000000003';

COMMIT;
