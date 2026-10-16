#!/usr/bin/env bash
# =============================================================================
# tools/cuotas-2026-10.sh — la regla 2026-10 en UNA transacción y UNA sesión.
#
# POR QUÉ EXISTE. Aplicar las dos migraciones con `tools/db.sh apply` y después
# la reclasificación deja una VENTANA: entre la primera migración y la
# reclasificación, las filas viejas tienen `cuotas_cubiertas = 0` y nadie tiene
# acceso. Acá todo va en una sola transacción: esquema, funciones y datos, o
# nada. Nadie ve nunca el estado intermedio.
#
#   simular            todo, y ROLLBACK al final: el ensayo en la base real
#   aplicar            todo, y COMMIT
#   simular-reversion  datos + lógica, y ROLLBACK
#   revertir           datos + lógica, y COMMIT (ver el orden seguro abajo)
#   emitir <modo>      imprime el SQL de ese modo sin conectarse (para ensayos)
#
# Los PRE chequeos (solo lectura) van ANTES, por fuera; los POST, DESPUÉS. Ver
# docs/operacion-cuotas-2026-10.md.
#
# Lo verificado (ids de personas y de pagos) NO está en el repo, que es
# público: lo trae VERIFICADO (por defecto, el archivo de BACKUPS).
#
# Bloqueos: ACCESS EXCLUSIVE sobre donations → memberships → aportes, el mismo
# orden en que escribe el webhook. Un aviso de Mercado Pago que llega durante
# la transacción ESPERA (segundos) y entra después: no se pierde.
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERIFICADO="${VERIFICADO:-$HOME/Documents/dev/BACKUPS/evolucion-antoniana/reclasificacion-2026-10-verificado.psql}"
MIG1="$RAIZ/supabase/migrations/20261016120000_cuotas_concepto_y_reintegros.sql"
MIG2="$RAIZ/supabase/migrations/20261016120100_reclasificar_aportes_historicos.sql"
APLICAR="$RAIZ/supabase/data/aplicar_reclasificacion_aportes_2026_10.sql"
REV_LOGICA="$RAIZ/supabase/data/revertir_logica_cuotas_2026_10.sql"
WEBHOOK_HEALTH="https://mp-supabase-webhook.onrender.com/health"
WEBHOOK_VIEJO="2026-08-31.consulta-mp"

for f in "$MIG1" "$MIG2" "$APLICAR" "$REV_LOGICA"; do
  [[ -f "$f" ]] || { echo "ERROR: falta $f" >&2; exit 1; }
done

cuerpo_reclasificacion() {
  # Lo que está entre los marcadores, tal cual: un solo texto, que también usa
  # la aplicación standalone. No hay dos copias que se puedan separar.
  awk '/^-- >>> CUERPO-RECLASIFICACION-2026-10/{d=1} d{print} /^-- <<< CUERPO-RECLASIFICACION-2026-10/{d=0}' "$APLICAR"
}

cabecera() {
  echo '\set ON_ERROR_STOP on'
  echo 'BEGIN;'
  echo "SET LOCAL lock_timeout = '15s';"
  echo 'LOCK TABLE public.donations, public.memberships, public.aportes IN ACCESS EXCLUSIVE MODE;'
}

emitir_aplicar() {  # $1 = COMMIT | ROLLBACK
  [[ -f "$VERIFICADO" ]] || { echo "ERROR: falta lo verificado ($VERIFICADO)." >&2; exit 1; }
  cat "$VERIFICADO"
  cabecera
  echo "\\echo '== 1/3 migración 20261016120000 (esquema y reglas)'"
  cat "$MIG1"
  echo "\\echo '== 2/3 migración 20261016120100 (función de reclasificación)'"
  cat "$MIG2"
  echo "\\echo '== 3/3 reclasificación: verificación, aplicación y post chequeo'"
  cuerpo_reclasificacion
  echo "\\echo '== FIN: $1'"
  echo "$1;"
}

emitir_revertir() {  # $1 = COMMIT | ROLLBACK
  cabecera
  echo "\\echo '== 1/2 datos: cada fila a su ANTES (aportes_correcciones)'"
  echo "SELECT public.revertir_reclasificacion_aportes('2026-10-cuotas-v2') AS filas_revertidas;"
  echo "\\echo '== 2/2 lógica: funciones, triggers, permisos y comentarios de producción'"
  cat "$REV_LOGICA"
  cat <<'SQL'
SET client_min_messages = notice;
DO $post$
DECLARE
  v_fallas text[] := '{}';
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.aportes_normalizar()', 'public.donations_no_retroceder()',
    'public.aplicar_estado_cobro(text,text,numeric,text)', 'public.mi_resumen_aportes()',
    'public.periodo_cuota(uuid,date,integer,uuid)', 'public.periodo_desde_previo(date,date,integer)',
    'public.cuota_cuenta(numeric,uuid)', 'public.hoy_local()', 'public.fecha_local(timestamptz)',
    'public.reclasificar_aportes_v2(boolean,text)', 'public.revertir_reclasificacion_aportes(text)']
  LOOP
    IF to_regprocedure(f) IS NOT NULL THEN v_fallas := v_fallas || ('sigue existiendo ' || f); END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname IN ('trg_aportes_normalizar', 'trg_donations_no_retroceder')) THEN
    v_fallas := v_fallas || 'sigue algún trigger nuevo'::text;
  END IF;
  IF (SELECT count(*) FROM pg_proc p, unnest(p.proallargtypes) WITH ORDINALITY x
       WHERE p.oid = 'public.acceso_vigente(uuid)'::regprocedure) <> 5 THEN
    v_fallas := v_fallas || 'acceso_vigente no volvió a su firma anterior (uuid -> 4 columnas)'::text;
  END IF;
  IF EXISTS (SELECT 1 FROM public.aportes_correcciones WHERE lote = '2026-10-cuotas-v2'
               AND accion = 'reclasificacion' AND revertido_en IS NULL) THEN
    v_fallas := v_fallas || 'quedan reclasificaciones sin revertir'::text;
  END IF;
  -- La P0 NO se toca: revertir cuotas no reabre la escritura de pagos.
  IF has_table_privilege('authenticated', 'public.donations', 'INSERT')
     OR has_table_privilege('anon', 'public.donations', 'INSERT') THEN
    v_fallas := v_fallas || 'la escritura de donations quedó ABIERTA (la P0 no debía tocarse)'::text;
  END IF;
  IF array_length(v_fallas, 1) > 0 THEN
    RAISE EXCEPTION E'POST REVERSIÓN FALLÓ:\n- %', array_to_string(v_fallas, E'\n- ');
  END IF;
  RAISE NOTICE 'POST REVERSIÓN OK: datos y lógica como antes de la regla 2026-10; la P0 sigue cerrada.';
END $post$;
SQL
  echo "\\echo '== FIN: $1'"
  echo "$1;"
}

exigir_webhook_viejo() {
  # Revertir quita el UNIQUE de payment_id: con el webhook NUEVO desplegado, su
  # upsert fallaría y se perderían cobros. Se verifica, no se confía.
  local v
  v="$(curl -s -m 60 "$WEBHOOK_HEALTH" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
  if [[ "$v" != "$WEBHOOK_VIEJO" ]]; then
    echo "ERROR: el webhook desplegado es '$v'. Revertir exige '$WEBHOOK_VIEJO' (ver el orden seguro)." >&2
    echo "       Para un ensayo deliberado: FORZAR_SIN_WEBHOOK=1" >&2
    [[ "${FORZAR_SIN_WEBHOOK:-}" == "1" ]] || exit 1
  fi
}

correr() { bash "$RAIZ/tools/db.sh" sql; }

case "${1:-}" in
  emitir)
    case "${2:-}" in
      aplicar)            emitir_aplicar COMMIT ;;
      simular)            emitir_aplicar ROLLBACK ;;
      revertir)           emitir_revertir COMMIT ;;
      simular-reversion)  emitir_revertir ROLLBACK ;;
      *) echo "Uso: $0 emitir {aplicar|simular|revertir|simular-reversion}" >&2; exit 1 ;;
    esac ;;
  simular)            emitir_aplicar ROLLBACK | correr ;;
  aplicar)            emitir_aplicar COMMIT   | correr ;;
  simular-reversion)  emitir_revertir ROLLBACK | correr ;;
  revertir)           exigir_webhook_viejo; emitir_revertir COMMIT | correr ;;
  *)
    echo "Uso: $0 {simular|aplicar|simular-reversion|revertir|emitir <modo>}" >&2
    exit 1 ;;
esac
