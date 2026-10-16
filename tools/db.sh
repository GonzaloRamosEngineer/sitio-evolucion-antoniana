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
#   tools/db.sh dump <archivo-destino>     -> backup del schema public (datos incluidos)
#
# SOBRE `dump`: existe porque "aplicar con un backup a mano" era un paso manual
# que nadie podía repetir igual dos veces. El archivo que produce contiene DATOS
# REALES DE PERSONAS (emails, donaciones), así que NUNCA va dentro del repo: el
# script exige una ruta fuera de $RAIZ y se niega si le pasan una adentro.
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
#
# ⚠️ NO usar `. <(...)`: en el bash 3.2 que trae macOS, hacer `source` de una
# sustitución de proceso no lee NADA y las variables quedan vacías sin ningún
# error (auditoría 2026-10-15: "falta PGHOST en .env.db" con el archivo bien).
#
# Se normaliza a un archivo temporal y se hace `source` de ESE archivo:
#   * funciona igual en bash 3.2 y en 5.x, y no pasa el contenido por `eval`;
#   * `mktemp` lo crea con permisos 0600 (solo el usuario), y el `trap` lo
#     borra al salir por CUALQUIER camino: éxito, `exit 1` de una validación o
#     un error con `set -e`. La contraseña no queda en disco más que lo que
#     dura la corrida;
#   * no se imprime nada de su contenido, ni siquiera ante un error.
env_normalizado="$(mktemp "${TMPDIR:-/tmp}/db-env.XXXXXX")"
trap 'rm -f "$env_normalizado"' EXIT
tr -d '\r' < "$ENV_DB" > "$env_normalizado"
set -a
# shellcheck disable=SC1090
. "$env_normalizado"
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

pgdump_docker() {
  docker run --rm --entrypoint pg_dump \
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

  dump)
    destino="${2:-}"
    [[ -n "$destino" ]] || { echo "ERROR: falta la ruta del backup." >&2; exit 1; }

    # El dump lleva datos personales. Si cae dentro del repo, un `git add -A`
    # distraído lo publica. Se rechaza antes de generarlo, no después.
    dir_destino="$(cd "$(dirname "$destino")" 2>/dev/null && pwd)" || {
      echo "ERROR: no existe el directorio de $destino" >&2; exit 1; }
    if [[ "$dir_destino" == "$RAIZ"* ]]; then
      echo "ERROR: el backup tiene datos personales y no puede ir dentro del repo." >&2
      echo "       Elegí una ruta fuera de $RAIZ" >&2
      exit 1
    fi

    ruta_final="$dir_destino/$(basename "$destino")"
    echo "Volcando el schema public a $ruta_final ..."
    # --schema=public: el resto (auth, storage) lo maneja Supabase y no es
    #   nuestro para restaurar.
    # --no-owner --no-privileges: el rol dueño en producción no existe en un
    #   Postgres pelado, y con ellos el restore falla en la primera línea —
    #   que es justo cuando hace falta que funcione.
    pgdump_docker --schema=public --no-owner --no-privileges > "$ruta_final"

    if [[ ! -s "$ruta_final" ]]; then
      echo "ERROR: el backup salió vacío. NO aplicar nada." >&2
      exit 1
    fi
    echo "Listo: $(wc -c < "$ruta_final") bytes."
    echo "⚠️  Un backup sin restaurar no es un backup. Probalo antes de confiar en él."
    ;;

  *)
    echo "Uso: tools/db.sh {check|apply <migracion>|sql|dump <destino>}" >&2
    exit 1
    ;;
esac
