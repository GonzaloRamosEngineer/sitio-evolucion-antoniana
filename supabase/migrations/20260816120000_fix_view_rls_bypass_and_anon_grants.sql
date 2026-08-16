-- =============================================================================
-- Cierra el puenteo de RLS por vistas y recorta los privilegios de `anon`.
--
-- CONTEXTO (auditoría 2026-08-16)
-- --------------------------------------------------------------------------
-- En PostgreSQL una vista se ejecuta con los permisos de SU DUEÑO, no de quien
-- consulta, salvo que se declare `security_invoker = true` (PG15+). Las dos
-- vistas del baseline son OWNER TO postgres y ninguna lo declaraba, así que
-- **puenteaban las RLS de las tablas que leen**.
--
-- Verificado contra producción con la anon key (pidiendo solo conteos):
--
--   anon -> donations            (tabla)  ->  0 filas   RLS funciona
--   anon -> memberships          (tabla)  ->  0 filas   RLS funciona
--   anon -> users                (tabla)  ->  0 filas   RLS funciona
--   anon -> user_support_history (vista)  -> 20 filas   FUGA
--   anon -> fundacion_metrics    (vista)  ->  1 fila    FUGA
--
-- El control es lo concluyente: los MISMOS datos, negados por la tabla y
-- entregados por la vista.
--
-- El razonamiento de ROADMAP §10.1.g ("no es un agujero hoy: RLS está
-- habilitado en las 15 tablas") es correcto PARA TABLAS. Las vistas no son
-- tablas, y son justo los dos objetos donde el argumento no aplicaba.
--
-- Idempotente, como el resto de las migraciones del repo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_support_history: se elimina.
--
--    Es un UNION ALL de donations + memberships que expone, por persona:
--    amount, status, payment_provider, payment_id, preapproval_id,
--    next_charge_date y plan. O sea el historial de pagos completo, incluido
--    el identificador de suscripción de MercadoPago.
--
--    Se buscó en TODO el repo (src/, api/, supabase/): no la consume nadie.
--    Existía solo en el baseline. Estaba filtrando sin prestar servicio.
--    Si alguna vez hace falta, se recrea con security_invoker = true.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS "public"."user_support_history";

-- -----------------------------------------------------------------------------
-- 2. fundacion_metrics: se le quita el acceso a anon, NO se le pone
--    security_invoker.
--
--    OJO, esto es deliberado: la vista agrega SUM/COUNT sobre TODAS las filas
--    a propósito, y el Dashboard (src/pages/Dashboard.jsx:62, vía
--    useFoundationMetrics) la necesita así. Con security_invoker = true las
--    RLS de donations/memberships se aplicarían al invocador y la vista
--    devolvería CERO para todo el mundo: el Dashboard mostraría $0 y 0
--    suscripciones. Sería "seguro" y estaría roto.
--
--    La corrección correcta acá no es cambiar la semántica sino sacar de la
--    audiencia a quien no tiene por qué estar: anon. El total donado y la
--    cantidad de suscripciones activas son la facturación de la entidad.
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE "public"."fundacion_metrics" FROM "anon";
GRANT SELECT ON TABLE "public"."fundacion_metrics" TO "authenticated";

-- -----------------------------------------------------------------------------
-- 3. Causa raíz (ROADMAP §10.1.g): recorte de privilegios de anon.
--
--    El baseline hacía
--      GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ... TO anon
--    sobre las 15 tablas. Hoy no es explotable porque las RLS deniegan por
--    defecto, pero deja el margen de error en cero: cualquier policy nueva mal
--    escrita pasa de "demasiado permisiva" a "destructiva".
--
--    Se recorta a lo que las policies REALMENTE habilitan para anon, que se
--    determinó leyendo las 33 policies del baseline y el inventario de
--    escrituras del cliente (src/).
-- -----------------------------------------------------------------------------

-- 3.a  Nada destructivo para anon, en ninguna tabla.
--      Ninguna policy habilita DELETE ni UPDATE a anon: la única UPDATE que
--      alcanza a anon por no llevar cláusula TO es "Update own profile" sobre
--      users, y exige auth.uid() = id, que anon nunca satisface.
--      TRUNCATE/TRIGGER/REFERENCES no los expone PostgREST, pero no hay razón
--      para tenerlos concedidos.
REVOKE TRUNCATE, TRIGGER, REFERENCES, DELETE, UPDATE
  ON ALL TABLES IN SCHEMA "public" FROM "anon";

-- 3.b  INSERT solo donde hay una policy que lo contempla para anon:
--        - partners                  -> "partners_public_insert_any" TO anon
--                                       (con el CHECK anti auto-publicación:
--                                        no puede setear estado='aprobado')
--        - education_preinscriptions -> "insercion_publica_preinscripciones"
--                                       TO authenticated, anon
--        - donations                 -> "Insert donations: if own or anonymous"
--                                       (sin cláusula TO => alcanza a anon)
--        - registrations             -> se CONSERVA por precaución: sus policies
--                                       son TO authenticated, así que las RLS ya
--                                       bloquean a anon y revocar no agregaría
--                                       seguridad, pero existe un flujo de
--                                       invitado (GuestRegistrationForm) que no
--                                       terminé de trazar. Revocar acá sería
--                                       arriesgar un flujo real a cambio de nada.
REVOKE INSERT ON ALL TABLES IN SCHEMA "public" FROM "anon";

GRANT INSERT ON TABLE "public"."partners"                  TO "anon";
GRANT INSERT ON TABLE "public"."education_preinscriptions" TO "anon";
GRANT INSERT ON TABLE "public"."donations"                 TO "anon";
GRANT INSERT ON TABLE "public"."registrations"             TO "anon";

-- 3.c  SELECT se conserva tal cual.
--      Está probado que las RLS lo filtran bien (el control de arriba: 0 filas
--      en las cinco tablas sensibles) y recortarlo tabla por tabla sin
--      necesidad sería arriesgar las páginas públicas a cambio de nada.

-- 3.d  Que las tablas FUTURAS no nazcan con el problema.
--      El baseline dejó DEFAULT PRIVILEGES amplios para anon; se acotan.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
  REVOKE TRUNCATE, TRIGGER, REFERENCES, DELETE, UPDATE, INSERT ON TABLES FROM "anon";

-- =============================================================================
-- Nota para quien aplique esto a producción:
--
--   - Validar primero en Docker con supabase/checks/ (procedimiento en su
--     README). La verificación de regresión está en checks/rls-check.sql.
--   - `supabase db push` contra producción NO es rutina en este repo: el
--     historial remoto está vacío. Ver ROADMAP §B.
--   - Producción corre PostgreSQL 15; esta migración no usa nada de PG16+.
-- =============================================================================
