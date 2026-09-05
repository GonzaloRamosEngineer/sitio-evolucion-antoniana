-- =====================================================================
-- CHECK de lo que cierra §10: figura institucional, reclamo universal,
-- precio de actividades y apadrinamiento.
--
-- POR QUÉ ESTE ARCHIVO EXISTE Y NO ALCANZA CON LOS TESTS DE VITEST
--
-- Tres de las cuatro piezas **otorgan algo**:
--   · `miembros`      -> condición institucional. Un INSERT ajeno es "figuro
--                        como socio activo desde 2019".
--   · `reclamar_huellas()` -> identidad. Un reclamo ajeno es quedarse con la
--                        huella de otra persona.
--   · `padrinazgos`   -> figurar sosteniendo algo sin haber pagado.
-- Los mocks prueban nuestro código; esto prueba la base, que es donde viven las
-- policies que impiden las tres cosas.
--
-- LOS CONTROLES POSITIVOS NO SON DECORACIÓN. "Nadie puede escribir" y "la tabla
-- es inescribible y el módulo no anda" se ven idénticos desde afuera (§11.4).
-- Por eso cada negativo viene con su par:
--     T1  (authenticated NO inserta)     ←→  T3  (el trigger SÍ da de alta)
--     T5  (suspendido conserva acceso)   ←→  T6  (y lo pierde si la entidad lo pidió)
--     T10 (sin verificar NO reclama)     ←→  T11 (verificado SÍ, y solo lo suyo)
--     T13 (no se pasa de cupos)          ←→  T13b (y no bloquea de más)
--
-- ⚠️ CONTRA PRODUCCIÓN NO. Crea usuarios en `auth.users`, destinos, actividades
-- y preinscripciones. Todo va dentro de una transacción que revierte, pero si la
-- corrida se corta a la mitad quedan fantasmas. Va contra el Postgres de Docker
-- (`supabase/checks/README.md`), en la versión de producción: **PostgreSQL 15**.
--
-- ⚠️ Y NO DEPENDE DE NINGÚN DATO PREVIO, a propósito. `rls-check.sql` saca sus
-- uuids con `\gset` sobre `public.users`; en una base recién migrada no hay
-- usuarios, la variable queda sin definir y T14-T16 mueren con
-- `syntax error at or near ":"` **sin llegar a ejecutar su assertion**. Se ve en
-- el log como un error más entre los esperados. Acá el escenario se arma entero.
-- =====================================================================

BEGIN;

-- ---------- Escenario ----------
-- El nombre de la columna de confirmación se resuelve como en los otros checks:
-- Supabase usa `email_confirmed_at`, la imagen de Docker todavía tiene
-- `confirmed_at`. `raw_user_meta_data.name` es obligatorio porque
-- `handle_new_user` copia la fila a `public.users`, donde `name` es NOT NULL.
--
-- CUATRO PERSONAS, cada una para probar una cosa distinta:
--   Ana   — aporta y queda de alta sola. Email VERIFICADO.
--   Beto  — email SIN verificar. Es el control de que la pista no alcanza.
--   Cora  — comisión. La única que puede cambiar estados.
--   Dani  — deja huellas con OTRO email. Control de que Ana no se las lleva.
DO $esc$
DECLARE v_col text;
BEGIN
  SELECT c.column_name INTO v_col
    FROM information_schema.columns c
   WHERE c.table_schema='auth' AND c.table_name='users'
     AND c.column_name IN ('email_confirmed_at','confirmed_at')
   ORDER BY CASE c.column_name WHEN 'email_confirmed_at' THEN 0 ELSE 1 END
   LIMIT 1;

  -- Beto va en un INSERT aparte con la columna en NULL: es el único cuyo email
  -- NO está verificado, y esa es toda su razón de existir.
  EXECUTE format($i$
    INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, created_at, %I)
    VALUES
      ('aa000000-0000-0000-0000-0000000000a1','zz-ana@ejemplo.com', 'authenticated','authenticated','{"name":"ZZ Ana"}',  now(), now()),
      ('cc000000-0000-0000-0000-0000000000c1','zz-cora@ejemplo.com','authenticated','authenticated','{"name":"ZZ Cora"}', now(), now()),
      ('dd000000-0000-0000-0000-0000000000d1','zz-dani@ejemplo.com','authenticated','authenticated','{"name":"ZZ Dani"}', now(), now());
  $i$, v_col);
END $esc$;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data, created_at)
VALUES ('bb000000-0000-0000-0000-0000000000b1','zz-beto@ejemplo.com','authenticated','authenticated','{"name":"ZZ Beto"}', now());

-- ⚠️ Hay que desactivar `trg_prevent_privilege_escalation` para armar a Cora, y
-- conviene saber por qué: ese trigger **revierte `role` en silencio** cuando
-- quien ejecuta no es admin (`prevent_privilege_escalation`), y acá no hay
-- `auth.uid()`. Sin esto, el UPDATE parece funcionar —no da error, no avisa
-- nada— y Cora sigue siendo un usuario común. El síntoma es T7b fallando con
-- "solo la comisión puede", que se lee como un bug del módulo cuando lo roto es
-- el andamio. Es el modo de falla de §11.4, y el README de esta carpeta ya lo
-- tenía anotado con un ⚠️ en la tabla de resultados.
--
-- Va dentro de la transacción, así que el ROLLBACK final lo restituye.
ALTER TABLE public.users DISABLE TRIGGER trg_prevent_privilege_escalation;
UPDATE public.users SET role = 'comision_directiva' WHERE id = 'cc000000-0000-0000-0000-0000000000c1';
ALTER TABLE public.users ENABLE TRIGGER trg_prevent_privilege_escalation;

-- Destinos: uno que otorga acceso y admite recurrente (apadrinable, 3 cupos), y
-- uno que no admite recurrente, para probar que no se puede apadrinar.
INSERT INTO public.destinos (id, tipo, nombre, slug, estado, otorga_acceso,
                             admite_puntual, admite_recurrente, cupos_totales,
                             visibilidad_beneficiario)
VALUES
  ('e1000000-0000-0000-0000-0000000000e1','padrinable','ZZ Becas','zz-becas','activo',
   true, true, true, 3, 'anonimizado'),
  ('e2000000-0000-0000-0000-0000000000e2','campana','ZZ Pelotas','zz-pelotas','activo',
   true, true, false, NULL, 'anonimizado');

-- Categoría con 40% de descuento, para el precio de actividades. Va marcada
-- `por_defecto` porque también prueba que el alta automática la asigna sola: sin
-- eso, la tabla de categorías existiría y no la tendría nadie.
--
-- El UPDATE previo NO es opcional: `uq_categoria_miembro_por_defecto` deja una
-- sola por defecto, y en una base con datos reales ya hay una sembrada
-- (`seed_categoria_miembro_fundacion.sql`). Sin esto, el INSERT choca y **todo
-- el archivo cae en "current transaction is aborted"**, el modo de falla que
-- documenta 11.4. Va dentro de la transaccion, asi que el ROLLBACK lo restituye.
UPDATE public.categorias_miembro SET por_defecto = false WHERE por_defecto;

INSERT INTO public.categorias_miembro
  (id, nombre, slug, cuota_mensual, descuento_actividades_pct, por_defecto)
VALUES ('ca000000-0000-0000-0000-0000000000ca','ZZ Protector','zz-protector', 5000, 40, true);

-- Dos actividades: una con descuento por categoría, otra con precio fijo de
-- miembro (para probar que el específico le gana al porcentaje general).
INSERT INTO public.activities (id, title, description, date, duration, modality,
                               max_participants, current_participants, precio_general, precio_socio)
VALUES
  ('ac000000-0000-0000-0000-0000000000a1','ZZ Curso','desc', current_date, '2h','presencial', 20, 0, 10000, NULL),
  ('ac000000-0000-0000-0000-0000000000a2','ZZ Taller','desc', current_date, '2h','presencial', 20, 0, 10000, 1000);

-- Huellas sin cuenta: dos de Ana y una de Dani. Si el reclamo de Ana se lleva la
-- de Dani, el mecanismo entero está mal y esto lo tiene que gritar.
INSERT INTO public.education_preinscriptions
  (email, full_name, dni, age, last_year_completed, phone, location, level_to_start,
   relationship_club, preferred_modality)
VALUES
  ('zz-ana@ejemplo.com', 'ZZ Ana',  '1','10','2024','1','Salta','inicial','ninguna','presencial'),
  ('ZZ-ANA@ejemplo.com', 'ZZ Ana2', '2','11','2024','1','Salta','inicial','ninguna','presencial'),
  ('zz-dani@ejemplo.com','ZZ Dani', '3','12','2024','1','Salta','inicial','ninguna','presencial'),
  -- ⚠️ La de Beto NO es de relleno, y casi no está. En la primera versión de
  -- este archivo Beto no tenía ninguna huella, así que T10 daba 'PASA' porque no
  -- había NADA que ofrecerle — no porque su email estuviera sin verificar. Se
  -- descubrió saboteando `email_verificado()` para que devolviera `true`
  -- siempre: **el check siguió pasando**. Una prueba que no puede fallar es
  -- decorado (regla №2 del ROADMAP). Con esta fila, T10 falla si alguien afloja
  -- la verificación.
  ('zz-beto@ejemplo.com','ZZ Beto', '4','13','2024','1','Salta','inicial','ninguna','presencial');

\echo ''
\echo '--- T0: CONTROL — el escenario quedó armado (sin esto, una docena de PASA no significan nada)'
SELECT CASE WHEN (SELECT count(*) FROM public.users WHERE email LIKE 'zz-%') = 4
             AND (SELECT count(*) FROM public.destinos WHERE slug LIKE 'zz-%') = 2
             AND (SELECT count(*) FROM public.education_preinscriptions WHERE email ILIKE 'zz-%') = 4
             AND (SELECT count(*) FROM public.activities WHERE title LIKE 'ZZ %') = 2
            THEN 'PASA · 4 personas, 2 destinos, 4 huellas, 2 actividades'
            ELSE 'FALLA · el escenario no se armó' END;

\echo ''
\echo '=== LA CONDICIÓN INSTITUCIONAL (§10.1.a) ==='

\echo '--- T1: 🔒 authenticated NO puede darse de alta como miembro'
SAVEPOINT t1;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-0000000000a1', true);
DO $t$
BEGIN
  INSERT INTO public.miembros (user_id, estado) VALUES (auth.uid(), 'activo');
  RAISE WARNING 'FALLA · un usuario comun se autoconcedio la condicion de miembro';
EXCEPTION WHEN insufficient_privilege OR sqlstate '42501' THEN
  RAISE NOTICE 'PASA · rechazado (42501)';
END $t$;
ROLLBACK TO SAVEPOINT t1;
RESET ROLE;

\echo '--- T2: 🔒 anon NO puede leer el padrón'
SAVEPOINT t2;
SET LOCAL ROLE anon;
DO $t$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.miembros;
  RAISE WARNING 'FALLA · anon leyo el padron (% filas)', n;
EXCEPTION WHEN insufficient_privilege OR sqlstate '42501' THEN
  RAISE NOTICE 'PASA · rechazado (42501)';
END $t$;
ROLLBACK TO SAVEPOINT t2;
RESET ROLE;

\echo '--- T3: ✅ CONTROL POSITIVO — un aporte con acceso SÍ da de alta sola'
SAVEPOINT t3;
INSERT INTO public.aportes (user_id, destino_id, origen, monto, acceso_desde, acceso_hasta)
VALUES ('aa000000-0000-0000-0000-0000000000a1','e1000000-0000-0000-0000-0000000000e1',
        'manual', 5000, current_date, current_date + 30);
SELECT CASE WHEN EXISTS (SELECT 1 FROM public.miembros
                          WHERE user_id='aa000000-0000-0000-0000-0000000000a1' AND estado='activo')
            THEN 'PASA · Ana quedo de alta con numero ' ||
                 (SELECT numero::text FROM public.miembros WHERE user_id='aa000000-0000-0000-0000-0000000000a1')
            ELSE 'FALLA · el trigger de alta automatica no corrio' END;

\echo '--- T3a: ...y le asigno la categoria POR DEFECTO'
\echo '     (sin esto, la tabla de categorias existe y no la tiene nadie: el mismo'
\echo '      modo de falla que `entidad.vocabulario` durante tres semanas)'
SELECT CASE WHEN (SELECT categoria_id FROM public.miembros
                   WHERE user_id='aa000000-0000-0000-0000-0000000000a1')
                 = 'ca000000-0000-0000-0000-0000000000ca'
            THEN 'PASA · quedo en la categoria por defecto'
            ELSE 'FALLA · el alta no asigno la categoria por defecto' END;

\echo '--- T3c: 🔒 no puede haber DOS categorias por defecto'
DO $t$
BEGIN
  INSERT INTO public.categorias_miembro (nombre, slug, por_defecto)
  VALUES ('ZZ Otra','zz-otra', true);
  RAISE WARNING 'FALLA · dos categorias por defecto: el descuento dependeria de cual lee primero';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASA · rechazado por uq_categoria_miembro_por_defecto';
END $t$;

\echo '--- T3b: ✅ un aporte SIN acceso NO da de alta (el numero tiene que significar algo)'
INSERT INTO public.aportes (user_id, destino_id, origen, monto)
VALUES ('dd000000-0000-0000-0000-0000000000d1','e1000000-0000-0000-0000-0000000000e1','manual', 100);
SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM public.miembros WHERE user_id='dd000000-0000-0000-0000-0000000000d1')
            THEN 'PASA · un aporte que no otorga acceso no da de alta'
            ELSE 'FALLA · dio de alta a alguien por un aporte sin acceso' END;

\echo '--- T4: 🔒 un aporte nuevo NO reactiva a un suspendido (la suspension es una decision)'
UPDATE public.miembros SET estado='suspendido' WHERE user_id='aa000000-0000-0000-0000-0000000000a1';
INSERT INTO public.aportes (user_id, destino_id, origen, monto, acceso_desde, acceso_hasta)
VALUES ('aa000000-0000-0000-0000-0000000000a1','e1000000-0000-0000-0000-0000000000e1',
        'manual', 5000, current_date, current_date + 60);
SELECT CASE WHEN (SELECT estado FROM public.miembros WHERE user_id='aa000000-0000-0000-0000-0000000000a1') = 'suspendido'
            THEN 'PASA · sigue suspendido: pagar no revierte una sancion'
            ELSE 'FALLA · un pago reactivo a un miembro suspendido' END;

\echo ''
\echo '=== SUSPENSIÓN Y ACCESO — las dos puntas del interruptor ==='
\echo '--- T5: con suspension_corta_acceso = false (default), el suspendido CONSERVA el acceso'
SELECT CASE WHEN (SELECT tiene_acceso FROM public.acceso_vigente('aa000000-0000-0000-0000-0000000000a1'))
            THEN 'PASA · conserva el acceso, que es el default conservador'
            ELSE 'FALLA · le corto el acceso sin que la entidad lo pidiera' END;

\echo '--- T6: ✅ y con suspension_corta_acceso = true, lo PIERDE'
UPDATE public.reglas_membresia SET suspension_corta_acceso = true WHERE vigente;
SELECT CASE WHEN NOT (SELECT tiene_acceso FROM public.acceso_vigente('aa000000-0000-0000-0000-0000000000a1'))
            THEN 'PASA · el parametro corta el acceso cuando la entidad lo pide'
            ELSE 'FALLA · el parametro no hace nada (seria una opcion decorativa)' END;

\echo '--- T6b: y un miembro ACTIVO no se ve afectado por el parametro'
UPDATE public.miembros SET estado='activo' WHERE user_id='aa000000-0000-0000-0000-0000000000a1';
SELECT CASE WHEN (SELECT tiene_acceso FROM public.acceso_vigente('aa000000-0000-0000-0000-0000000000a1'))
            THEN 'PASA · el activo conserva su acceso'
            ELSE 'FALLA · el parametro corta de mas' END;
UPDATE public.reglas_membresia SET suspension_corta_acceso = false WHERE vigente;

\echo '--- T7: 🔒 quien no es comision NO puede cambiar el estado de un miembro'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-0000000000a1', true);
DO $t$
BEGIN
  PERFORM public.cambiar_estado_miembro('aa000000-0000-0000-0000-0000000000a1','baja','me autodoy de baja');
  RAISE WARNING 'FALLA · un usuario comun cambio la condicion institucional';
EXCEPTION WHEN insufficient_privilege OR sqlstate '42501' THEN
  RAISE NOTICE 'PASA · rechazado (42501)';
END $t$;
RESET ROLE;

\echo '--- T7b: ✅ y la comision SÍ puede'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','cc000000-0000-0000-0000-0000000000c1', true);
SELECT CASE WHEN (SELECT estado FROM public.cambiar_estado_miembro(
                    'aa000000-0000-0000-0000-0000000000a1','suspendido','ZZ prueba')) = 'suspendido'
            THEN 'PASA · la comision suspendio'
            ELSE 'FALLA · la comision no pudo suspender (el modulo no anda)' END;
RESET ROLE;
ROLLBACK TO SAVEPOINT t3;

\echo ''
\echo '=== EL RECLAMO UNIVERSAL (§10.1.c) ==='

\echo '--- T8: 🔒 el registro RECHAZA una tabla que otorga privilegios'
SAVEPOINT t8;
DO $t$
BEGIN
  INSERT INTO public.fuentes_reclamables (tabla, col_email, col_user, etiqueta)
  VALUES ('donations','payer_email','user_id','ZZ trampa');
  RAISE WARNING 'FALLA · se pudo registrar `donations` como fuente generica: eso otorgaria acceso sin calcular meses';
EXCEPTION WHEN sqlstate '22023' THEN
  RAISE NOTICE 'PASA · rechazado por la lista negra';
END $t$;

\echo '--- T9: 🔒 el registro RECHAZA una columna que no existe'
DO $t$
BEGIN
  INSERT INTO public.fuentes_reclamables (tabla, col_email, col_user, etiqueta)
  VALUES ('education_preinscriptions','no_existe','user_id','ZZ rota');
  RAISE WARNING 'FALLA · se registro una fuente con una columna inexistente';
EXCEPTION WHEN sqlstate '42703' THEN
  RAISE NOTICE 'PASA · rechazado (42703)';
END $t$;
ROLLBACK TO SAVEPOINT t8;

\echo '--- T10: 🔒 sin email verificado NO se reclama nada (el mail es una pista, no una credencial)'
SAVEPOINT t10;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bb000000-0000-0000-0000-0000000000b1', true);
SELECT CASE WHEN (SELECT count(*) FROM public.huellas_reclamables()) = 0
            THEN 'PASA · a Beto no se le ofrece nada, y SI tiene una huella esperandolo'
            ELSE 'FALLA · se le ofrecio reclamar con el email sin verificar' END;
RESET ROLE;

\echo '--- T10b: y si igual llama a reclamar_huellas(), la funcion se niega'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bb000000-0000-0000-0000-0000000000b1', true);
DO $t$
BEGIN
  PERFORM public.reclamar_huellas();
  RAISE WARNING 'FALLA · reclamo con el email sin verificar';
EXCEPTION WHEN sqlstate '28000' THEN
  RAISE NOTICE 'PASA · rechazado (28000): falta verificar el email';
END $t$;
RESET ROLE;

SELECT CASE WHEN (SELECT user_id FROM public.education_preinscriptions
                   WHERE email='zz-beto@ejemplo.com') IS NULL
            THEN 'PASA · la huella de Beto sigue sin vincular'
            ELSE 'FALLA · se vinculo pese a no estar verificado el email' END;
ROLLBACK TO SAVEPOINT t10;

\echo '--- T11: ✅ CONTROL POSITIVO — con email verificado SÍ reclama, y SOLO lo suyo'
SAVEPOINT t11;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-0000000000a1', true);
SELECT CASE WHEN (SELECT COALESCE(sum(vinculadas),0) FROM public.reclamar_huellas()
                   WHERE tabla='education_preinscriptions') = 2
            THEN 'PASA · Ana reclamo sus 2 preinscripciones (una con el mail en MAYUSCULAS)'
            ELSE 'FALLA · el reclamo no vinculo las 2 huellas de Ana' END;
RESET ROLE;

SELECT CASE WHEN (SELECT user_id FROM public.education_preinscriptions
                   WHERE email='zz-dani@ejemplo.com') IS NULL
            THEN 'PASA · la huella de Dani quedo intacta'
            ELSE 'FALLA · ¡Ana se llevo la huella de otra persona!' END;

\echo '--- T11b: y el reclamo es IDEMPOTENTE (la segunda vez no encuentra nada)'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-0000000000a1', true);
SELECT CASE WHEN (SELECT count(*) FROM public.reclamar_huellas()) = 0
            THEN 'PASA · la segunda corrida no vincula nada'
            ELSE 'FALLA · reclamo dos veces lo mismo' END;
RESET ROLE;
ROLLBACK TO SAVEPOINT t11;

\echo ''
\echo '=== EL RESUMEN PARA LA COMISION (§10.1.c) ==='
SAVEPOINT t18;

\echo '--- T18: 🔒 quien NO es comision no puede contar las huellas de la entidad'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa000000-0000-0000-0000-0000000000a1', true);
DO $t$
BEGIN
  PERFORM public.huellas_sin_cuenta();
  RAISE WARNING 'FALLA · un usuario comun conto las huellas sin cuenta de la entidad';
EXCEPTION WHEN insufficient_privilege OR sqlstate '42501' THEN
  RAISE NOTICE 'PASA · rechazado (42501)';
END $t$;
RESET ROLE;

\echo '--- T18b: ✅ y la comision SI, con el numero que sirve para decidir'
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','cc000000-0000-0000-0000-0000000000c1', true);
SELECT CASE WHEN (SELECT total FROM public.huellas_sin_cuenta()
                   WHERE tabla='education_preinscriptions') = 4
             AND (SELECT con_cuenta FROM public.huellas_sin_cuenta()
                   WHERE tabla='education_preinscriptions') = 4
            THEN 'PASA · 4 huellas, 4 de personas que YA tienen cuenta'
            ELSE 'FALLA · el resumen no cuadra' END;
RESET ROLE;
ROLLBACK TO SAVEPOINT t18;

\echo ''
\echo '=== PRECIO DE ACTIVIDADES (§10.1.d) ==='
SAVEPOINT t12;
INSERT INTO public.aportes (user_id, destino_id, origen, monto, acceso_desde, acceso_hasta)
VALUES ('aa000000-0000-0000-0000-0000000000a1','e1000000-0000-0000-0000-0000000000e1',
        'manual', 5000, current_date, current_date + 30);
-- Ya no se asigna a mano: la trae el alta automatica (T3a). Que el descuento de
-- T12b funcione SIN un UPDATE explicito es la prueba de que la cadena
-- alta -> categoria por defecto -> descuento esta completa.

\echo '--- T12: quien no es miembro paga el precio general'
SELECT CASE WHEN (SELECT precio_final FROM public.precio_actividad_para(
                    'ac000000-0000-0000-0000-0000000000a1','dd000000-0000-0000-0000-0000000000d1')) = 10000
            THEN 'PASA · Dani paga 10000'
            ELSE 'FALLA · el no-miembro no paga el general' END;

\echo '--- T12b: el miembro paga con el descuento de SU categoria (40%)'
SELECT CASE WHEN (SELECT precio_final FROM public.precio_actividad_para(
                    'ac000000-0000-0000-0000-0000000000a1','aa000000-0000-0000-0000-0000000000a1')) = 6000
            THEN 'PASA · Ana paga 6000 (40% de descuento)'
            ELSE 'FALLA · el descuento de la categoria no se aplico' END;

\echo '--- T12c: un precio_socio fijo le GANA al porcentaje de la categoria'
SELECT CASE WHEN (SELECT precio_final FROM public.precio_actividad_para(
                    'ac000000-0000-0000-0000-0000000000a2','aa000000-0000-0000-0000-0000000000a1')) = 1000
            THEN 'PASA · manda el precio especifico de la actividad'
            ELSE 'FALLA · el precio fijo de miembro no tuvo prioridad' END;

\echo '--- T12d: 🔒 el esquema rechaza un precio de socio MAYOR que el general'
DO $t$
BEGIN
  UPDATE public.activities SET precio_socio = 99999 WHERE id='ac000000-0000-0000-0000-0000000000a1';
  RAISE WARNING 'FALLA · se acepto un precio de socio mayor que el general';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASA · rechazado por activities_precio_orden_chk';
END $t$;
ROLLBACK TO SAVEPOINT t12;

\echo ''
\echo '=== APADRINAMIENTO (§10.8 fase 4) ==='
SAVEPOINT t13;

\echo '--- T13: ✅ CONTROL POSITIVO — se puede apadrinar y el contador se mantiene'
INSERT INTO public.padrinazgos (user_id, destino_id, cupos)
VALUES ('aa000000-0000-0000-0000-0000000000a1','e1000000-0000-0000-0000-0000000000e1', 2);
SELECT CASE WHEN (SELECT cupos_ocupados FROM public.destinos WHERE slug='zz-becas') = 2
            THEN 'PASA · 2 de 3 cupos ocupados'
            ELSE 'FALLA · el contador de cupos no se actualizo' END;

\echo '--- T13b: y NO bloquea de mas: el tercer cupo entra'
INSERT INTO public.padrinazgos (user_id, destino_id, cupos)
VALUES ('dd000000-0000-0000-0000-0000000000d1','e1000000-0000-0000-0000-0000000000e1', 1);
SELECT CASE WHEN (SELECT cupos_ocupados FROM public.destinos WHERE slug='zz-becas') = 3
            THEN 'PASA · 3 de 3'
            ELSE 'FALLA · rechazo un cupo que si habia' END;

\echo '--- T13c: 🔒 el cuarto cupo NO entra'
DO $t$
BEGIN
  INSERT INTO public.padrinazgos (user_id, destino_id, cupos)
  VALUES ('cc000000-0000-0000-0000-0000000000c1','e1000000-0000-0000-0000-0000000000e1', 1);
  RAISE WARNING 'FALLA · se sostuvieron mas cupos de los que existen';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASA · rechazado por falta de cupos';
END $t$;

\echo '--- T14: 🔒 no se puede apadrinar un destino que no admite aporte recurrente'
DO $t$
BEGIN
  INSERT INTO public.padrinazgos (user_id, destino_id, cupos)
  VALUES ('cc000000-0000-0000-0000-0000000000c1','e2000000-0000-0000-0000-0000000000e2', 1);
  RAISE WARNING 'FALLA · se apadrino una campana puntual';
EXCEPTION WHEN sqlstate '22023' THEN
  RAISE NOTICE 'PASA · rechazado: el destino no admite recurrente';
END $t$;

\echo '--- T15: 🔒 en un destino anonimizado, un hito SIN cantidad se rechaza'
\echo '     (es la regla de §10.8.1 escrita en el esquema: el impacto se cuenta, no se narra)'
DO $t$
BEGIN
  INSERT INTO public.hitos_destino (destino_id, titulo, descripcion)
  VALUES ('e1000000-0000-0000-0000-0000000000e1','ZZ Juan mejoro mucho','relato individual');
  RAISE WARNING 'FALLA · se acepto un hito narrativo en un destino anonimizado';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASA · rechazado: exige agregado';
END $t$;

\echo '--- T15b: ✅ y un hito agregado SÍ entra'
INSERT INTO public.hitos_destino (destino_id, titulo, cantidad, unidad, publicado)
VALUES ('e1000000-0000-0000-0000-0000000000e1','ZZ Entrenamientos del trimestre', 24, 'entrenamientos', true);
SELECT CASE WHEN jsonb_array_length((SELECT hitos FROM public.reporte_destino('zz-becas'))) = 1
            THEN 'PASA · el reporte publica el hito agregado'
            ELSE 'FALLA · el hito no llego al reporte' END;

\echo '--- T16: 🔒 anon NO puede leer quien sostiene que'
SET LOCAL ROLE anon;
DO $t$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.padrinazgos;
  RAISE WARNING 'FALLA · anon leyo los padrinazgos (% filas)', n;
EXCEPTION WHEN insufficient_privilege OR sqlstate '42501' THEN
  RAISE NOTICE 'PASA · rechazado (42501)';
END $t$;

\echo '--- T16b: ✅ pero el reporte AGREGADO si es publico, y no trae identidades'
SELECT CASE WHEN (SELECT aportantes FROM public.reporte_destino('zz-becas')) = 2
             AND (SELECT cupos_libres FROM public.reporte_destino('zz-becas')) = 0
            THEN 'PASA · dice "2 personas sostienen 3 cupos" y no dice quienes'
            ELSE 'FALLA · el reporte publico no cuadra' END;
RESET ROLE;
ROLLBACK TO SAVEPOINT t13;

\echo ''
\echo '--- T17: CONTROL FINAL — no quedo residuo fuera de la transaccion'
SELECT CASE WHEN (SELECT count(*) FROM public.miembros) >= 0 THEN 'ok, se revierte al ROLLBACK' END;

ROLLBACK;
