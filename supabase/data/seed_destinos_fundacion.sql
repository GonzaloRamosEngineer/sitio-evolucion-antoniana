-- =============================================================================
-- CARGA DE DATOS (no es migración de esquema) — Destinos de la Fundación
-- =============================================================================
-- POR QUÉ ESTO NO ES UNA MIGRACIÓN
-- Las migraciones son el ESQUEMA, y el esquema se comparte entre clientes. Los
-- destinos son DATOS de esta entidad en particular (ROADMAP §10.9). Meterlos en
-- una migración le cargaría las campañas de la Fundación a un refugio de
-- animales el día que se levante el segundo cliente.
--
-- TODO ENTRA EN `borrador`, A PROPÓSITO
-- Un destino en borrador NO se muestra en el sitio: las RLS solo le dan a `anon`
-- los `activo`. Así la comisión revisa, ajusta textos, define metas y recién
-- entonces publica lo que quiera, desde el panel. Nada sale al aire por el solo
-- hecho de correr este archivo.
--
-- ⚠️ LO QUE ESTE ARCHIVO NO PUEDE COMPLETAR, Y NO SE INVENTA
-- `meta_monto` y `cupos_totales` quedan en NULL. Son decisiones de la entidad
-- que dependen de precios reales (cuánto sale un kit, cuánto una cuota, cuántos
-- chicos hay). Poner números plausibles sería fabricar objetivos financieros de
-- una organización real, y además el primer donante que compare vería que no
-- cierran. Se cargan desde el panel, destino por destino.
--
-- ⚠️ MENORES — LA RESTRICCIÓN QUE ATRAVIESA TODO (§10.8)
-- Los beneficiarios son chicos. Por eso, sin excepción:
--   · `visibilidad_beneficiario` = 'anonimizado' en TODOS los destinos.
--   · Ninguna descripción nombra, describe ni individualiza a un chico.
--   · El apadrinamiento va por CUPO o por CATEGORÍA, nunca por persona
--     identificada (ver el bloque de "Apadriná una categoría" abajo).
--   · Las campañas de profesionales financian HORAS DE SERVICIO. Los resultados
--     clínicos —mediciones, diagnósticos, informes— NO entran a este sistema
--     bajo ninguna forma: son datos sensibles de salud de menores (Ley 25.326)
--     y acá no hay dónde guardarlos con las garantías que exigen.
--
-- IDEMPOTENTE: `on conflict (slug) do nothing`. Correrlo dos veces no duplica
-- nada y no pisa los cambios que la comisión haya hecho desde el panel.
-- =============================================================================

insert into public.destinos
  (tipo, nombre, slug, descripcion, estado, visibilidad_beneficiario,
   admite_puntual, admite_recurrente, orden)
values

-- =============================================================================
-- 1. CAMPAÑAS PUNTUALES — una cosa concreta y finita
-- =============================================================================

-- Lo que el dueño relevó primero. Es el destino más fácil de explicar y el que
-- mejor funciona para estrenar la rendición: se compra, se sube la factura, se
-- publica. El circuito completo en una semana.
('campana',
 'Equipamiento deportivo',
 'equipamiento-deportivo',
 'Pelotas, conos, pecheras y redes: lo que hace que un entrenamiento sea un entrenamiento. Es material que se gasta con el uso y hay que reponer todos los años.',
 'borrador', 'anonimizado', true, false, 10),

-- Unidad clara = donación clara. "Un kit" es una decisión más fácil de tomar que
-- "un monto", y permite al donante ver exactamente qué hizo su plata.
('campana',
 'Kit del jugador',
 'kit-del-jugador',
 'Botines, medias y canilleras para que ningún chico deje de entrenar por no tener con qué. Cada aporte se traduce en kits completos.',
 'borrador', 'anonimizado', true, false, 20),

-- No estaba en el relevamiento y es de las barreras más comunes y menos
-- visibles: el chico quiere ir y no tiene cómo llegar. Admite las dos formas
-- porque el costo es mensual pero también se puede cubrir de una.
('campana',
 'Traslados a entrenamientos y partidos',
 'traslados',
 'Pasajes para que llegar al entrenamiento no dependa de si ese día hay para el colectivo. Es una de las razones más frecuentes por las que un chico deja de venir.',
 'borrador', 'anonimizado', true, true, 30),

-- Toca el tema nutrición SIN tocar datos de salud: financia comida, no
-- mediciones. Es la forma segura de trabajar ese eje.
('campana',
 'Merienda después del entrenamiento',
 'merienda',
 'Una merienda al terminar la práctica. Para muchos chicos es una comida que de otro modo no está, y sostenerla cambia el rendimiento y la asistencia.',
 'borrador', 'anonimizado', true, true, 40),

-- Los profesionales que relevó el dueño (nutricionista, psicólogo, preparador
-- físico, acompañamiento docente), agrupados en un solo destino.
--
-- ⚠️ La descripción habla de HORAS DE ACOMPAÑAMIENTO y no de "chicos que
-- necesitan tratamiento", y no enumera las especialidades. Es deliberado: en una
-- entidad chica, decir públicamente "financiamos al psicólogo" con un grupo de
-- chicos identificable estigmatiza, aunque ningún nombre aparezca. Lo que se
-- financia es la disponibilidad del profesional.
('campana',
 'Acompañamiento profesional',
 'acompanamiento-profesional',
 'Horas de profesionales que acompañan la formación integral de los chicos, dentro y fuera de la cancha. Cada aporte se traduce en horas de trabajo disponibles para el grupo.',
 'borrador', 'anonimizado', true, true, 50),

-- Estacional y predecible: se planifica en diciembre, se ejecuta en febrero.
-- Una campaña con fecha propia rinde más que un pedido genérico todo el año.
('campana',
 'Vuelta a clases',
 'vuelta-a-clases',
 'Útiles y apoyo escolar al empezar el año. La escuela y el deporte se sostienen juntos: acá no se elige entre una cosa y la otra.',
 'borrador', 'anonimizado', true, false, 60),

-- Poco glamorosa y absolutamente necesaria. Publicar los gastos aburridos es lo
-- que hace creíbles a los lindos.
('campana',
 'Seguros y aptos médicos',
 'seguros-y-aptos-medicos',
 'La cobertura y los aptos que exige cualquier competencia oficial. Sin esto no se puede jugar, y es de los costos que nadie ve hasta que falta.',
 'borrador', 'anonimizado', true, false, 70),

-- Tampoco estaba en el relevamiento. Apunta al donante que piensa en
-- estructura: no financia una compra, financia capacidad instalada.
('campana',
 'Formación de entrenadores',
 'formacion-entrenadores',
 'Cursos y certificaciones para quienes están todos los días con los chicos. Formar a un entrenador mejora la experiencia de todos los grupos que va a tener por delante.',
 'borrador', 'anonimizado', true, false, 80),

-- =============================================================================
-- 2. PADRINABLES — sostenidos en el tiempo
-- =============================================================================

-- El apadrinamiento que relevó el dueño: cubrir la cuota de un chico.
--
-- ⚠️ SE APADRINA UN CUPO, NO UN CHICO. Es la regla de §10.8 y no es negociable:
-- nada de "apadriná a Juan, 12 años, foto". Los `cupos_totales` los carga la
-- comisión, y el reporte al padrino va anonimizado y agregado.
('padrinable',
 'Beca formativa',
 'beca-formativa',
 'Sostené la cuota mensual de un cupo en la escuelita o en las inferiores. Tu aporte mantiene a un chico entrenando todo el año, sin que su familia tenga que elegir.',
 'borrador', 'anonimizado', false, true, 90),

-- ⚠️ ESTA ES LA IDEA QUE MÁS RECOMIENDO MIRAR.
--
-- El apadrinamiento tiene una tensión de raíz: funciona emocionalmente porque es
-- concreto ("apadriná a alguien"), y justamente por eso empuja a exponer a un
-- menor. Apadrinar una CATEGORÍA la resuelve entera:
--   · El padrino tiene un vínculo concreto y seguible ("la 2014 es mía").
--   · No hay ningún individuo expuesto, ni siquiera anonimizado.
--   · Se puede contar todo lo que pasa —cuántos entrenaron, qué torneos
--     jugaron— sin un solo dato personal.
--   · Escala: una categoría admite varios padrinos sin sentirse repartida.
('padrinable',
 'Apadriná una categoría',
 'apadrina-una-categoria',
 'Sostené a un grupo completo durante el año: sus entrenamientos, sus traslados y su participación en torneos. Recibís el seguimiento de cómo le va a la categoría, sin datos personales de ningún chico.',
 'borrador', 'anonimizado', true, true, 100)

on conflict (slug) do nothing;

-- =============================================================================
-- 3. El institucional YA EXISTE
--
-- Lo creó la migración 20260816140000 como 'Sostenimiento institucional', y es
-- el que recibe todo aporte sin destino específico — incluidas hoy las
-- donaciones que entran por MercadoPago (§10.13).
--
-- Es también la "cuota social" que relevó el dueño: administración, alquiler y
-- equipo de trabajo. Si la comisión prefiere llamarlo "Cuota social", se
-- renombra desde el panel; el slug puede quedar como está, no se muestra.
-- =============================================================================

-- Resumen de lo cargado.
do $$
declare
  v_borradores int;
  v_activos    int;
begin
  select count(*) into v_borradores from public.destinos where estado = 'borrador';
  select count(*) into v_activos    from public.destinos where estado = 'activo';
  raise notice 'Destinos: % en borrador (a revisar y publicar desde el panel), % activos.',
    v_borradores, v_activos;
  raise notice 'Falta cargar, destino por destino: meta_monto y cupos_totales.';
end $$;
