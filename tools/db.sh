#!/usr/bin/env bash
# tools/db.sh — acceso a la base de Supabase para migraciones y verificaciones.
#
# POR QUÉ EXISTE ESTE ARCHIVO
# ---------------------------------------------------------------------------
# La alternativa era habilitarle a Claude Code un permiso `Bash(docker run *)`,
# que permitiría levantar CUALQUIER contenedor. Con este envoltorio el permiso
# se acota a un script que se puede leer y auditar en el repo, y que solo sabe
# hacer dos cosas: aplicar una migración versionada, o correr SQL de consulta.
#
# La contraseña sale de `.env.db` (ignorado por git) y viaja al contenedor por
# variables de entorno: NUNCA aparece en la línea de comandos, así que no queda
# en el historial del shell ni en la lista de procesos.
#
# Uso:
#   tools/db.sh check                      -> prueba la conexión y no toca nada
#   tools/db.sh apply <archivo-migracion>  -> aplica UNA migración, en transacción
#   tools/db.sh sql                        -> corre por stdin el SQL que reciba
#
# Requiere Docker. Usa la imagen de Postgres de Supabase solo como cliente psql.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DB="$RAIZ/.env.db"
IMAGEN="public.ecr.aws/supabase/postgres:17.6.1.158"

if [[ ! -f "$ENV_DB" ]]; then
  echo "ERROR: falta $ENV_DB (PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD)." >&2
  exit 1
fi

# `tr -d '\r'`: si el archivo se guardó en Windows, el \r final se colaría
# DENTRO de PGPASSWORD y la autenticación fallaría con un error que no lo dice.
set -a
# shellcheck disable=SC1090
. <(tr -d '\r' < "$ENV_DB")
set +a

for v in PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD; do
  if [[ -z "${!v:-}" ]]; then
    echo "ERROR: falta $v en .env.db" >&2
    exit 1
  fi
done

psql_docker() {
  docker run --rm -i --entrypoint psql \
    -e PGHOST -e PGPORT -e PGDATABASE -e PGUSER -e PGPASSWORD \
    "$IMAGEN" "$@"
}

comando="${1:-}"

case "$comando" in
  check)
    psql_docker -tAc \
      "select 'OK · '||current_database()||' · PostgreSQL '||current_setting('server_version')"
    ;;

  apply)
    archivo="${2:-}"
    [[ -n "$archivo" ]] || { echo "ERROR: falta la ruta de la migración." >&2; exit 1; }

    # Solo migraciones versionadas del repo. Evita que este script se convierta
    # en una vía para correr SQL suelto contra producción sin quedar registrado.
    ruta_abs="$(cd "$(dirname "$archivo")" && pwd)/$(basename "$archivo")"
    if [[ "$ruta_abs" != "$RAIZ/supabase/migrations/"* ]]; then
      echo "ERROR: solo se aplican archivos de supabase/migrations/." >&2
      exit 1
    fi
    [[ -f "$ruta_abs" ]] || { echo "ERROR: no existe $ruta_abs" >&2; exit 1; }

    echo "Aplicando $(basename "$ruta_abs") en una sola transacción..."
    # -1: todo o nada. Si algo falla a mitad, revierte y no deja el esquema
    #     partido. ON_ERROR_STOP hace que un error corte en vez de seguir.
    psql_docker -1 -v ON_ERROR_STOP=1 < "$ruta_abs"
    echo "Listo."
    ;;

  sql)
    psql_docker -q
    ;;

  *)
    echo "Uso: tools/db.sh {check|apply <migracion>|sql}" >&2
    exit 1
    ;;
esac
