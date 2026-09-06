-- =============================================================================
-- §12.10.11 — el reaper de canjes deja de depender de que alguien genere uno
-- =============================================================================
-- QUÉ ARREGLA. Desde §11.7.13, `club-generar-canje` llama a
-- `club_expirar_canjes()` al arrancar, y eso hace el sistema auto-reparable.
-- Pero si NADIE genera, nada expira: los canjes abandonados se quedan en
-- 'pendiente' para siempre. Y eso no es cosmético —ensucia la única métrica de
-- adopción que tiene el club (§12.3: «los pendientes que nunca se confirman
-- son la señal de que el local no está usando el sistema»)— y además ocupan el
-- índice único del límite por persona, que es lo que puede dejar a alguien sin
-- un beneficio de por vida.
--
-- ⚠️ LA PREMISA QUE ERA FALSA. §12.10.11 declaraba esto «deuda consciente»
-- porque «el plan Free de Supabase no trae cron». Verificado el 2026-09-06
-- contra la base de producción: `pg_cron 1.6` figura en
-- `pg_available_extensions` Y en `shared_preload_libraries`. Lo que el plan
-- Free no trae es el programador de Edge Functions del panel; el cron de
-- Postgres, que es el que hace falta acá, está disponible.
--
-- POR QUÉ VA EN SU PROPIA MIGRACIÓN. `CREATE EXTENSION pg_cron` falla en un
-- Postgres que no la tenga en `shared_preload_libraries`, y esa falla es de
-- ENTORNO, no del esquema. En un archivo aparte, el error dice exactamente qué
-- pasó en vez de tumbar una transacción que traía otras tres cosas.
-- Para validarla en Docker hay que arrancar el contenedor con:
--   ... postgres -c shared_preload_libraries=pg_cron
-- (ver `supabase/checks/pg15-bootstrap/README.md`).
--
-- POR QUÉ NO SE BORRA LA LLAMADA DE `club-generar-canje`. Son dos redes, no
-- una duplicada: el cron cubre el hueco de «nadie generó en horas» y la
-- llamada en la función cubre el hueco de «el cron está caído o alguien lo
-- desprogramó». La segunda es la que garantiza que el socio nunca vea
-- «ya usaste este beneficio» por un canje que no usó, y esa garantía no puede
-- depender de infraestructura externa.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pg_cron crea su propio schema `cron` y ahí viven `schedule`/`unschedule`.
-- El GRANT es para que el rol de la plataforma pueda administrar los jobs
-- desde el SQL Editor; sin esto, cambiar la frecuencia obliga a superusuario.
GRANT USAGE ON SCHEMA cron TO postgres;

-- Cada 15 minutos, no una vez por día.
--
-- El TTL de un canje es de 5 minutos (`canje_ttl_minutos`) y la ventana de
-- rescate diferido de 2 horas. Con un cron diario, un canje abandonado a la
-- mañana sigue diciendo 'pendiente' —y ocupando el índice del límite— hasta el
-- día siguiente. Con 15 minutos, la peor espera es de 15 minutos y el UPDATE
-- corre sobre un índice parcial de pendientes: es barato hasta con órdenes de
-- magnitud más de canjes de los que este club va a tener.
--
-- ⚠️ Expirar NO impide el rescate diferido: `club-confirmar-canje` acepta
-- 'expirado' dentro de `confirmacion_diferida_horas`. El estado 'expirado' es
-- lo que ve el socio; la ventana de rescate la mide el cajero contra
-- `created_at`. Si esto cambiara, el local sin señal deja de poder confirmar.
--
-- `cron.schedule` con un nombre que ya existe REEMPLAZA el job (pg_cron >= 1.4),
-- así que reaplicar esta migración converge en vez de duplicar el trabajo.
SELECT cron.schedule(
  'club-expirar-canjes',
  '*/15 * * * *',
  $job$SELECT public.club_expirar_canjes()$job$
);
