#!/usr/bin/env bash
# =============================================================================
# Ensayo de la reclasificación histórica (2026-10) sobre una RÉPLICA de
# producción, en un Postgres 15 descartable. No se conecta a producción.
#
# La réplica es una FOTO de lo relevado el 2026-10-16 (mismos IDs, importes,
# referencias de Mercado Pago y períodos; sin emails ni nombres reales):
# 8 cobros aprobados, 8 aportes automáticos —incluido el período de UN DÍA—
# y 135 aportes manuales por $1.238.997,77.
#
# Recorre, en orden, lo que se haría en producción:
#   1. migraciones hasta 20261013 (el esquema de hoy) + la foto
#   2. pre chequeo ANTES de las migraciones nuevas      -> debe pasar
#   3. migraciones nuevas + pre chequeo                 -> debe pasar e informar
#   4. aplicar                                          -> debe pasar
#   5. aplicar de nuevo                                 -> 0 cambios
#   6. revertir                                         -> la foto exacta
#   7. aplicar otra vez                                 -> mismo resultado
#   8. control NEGATIVO: un aporte no verificado        -> el pre chequeo FALLA
#
# Los ids de la foto son SINTÉTICOS (el repo es público): mismas formas,
# importes, fechas y períodos que producción, otros identificadores. Lo
# verificado se arma acá y se antepone por la entrada a los scripts, igual que
# hace el operador con el archivo que vive fuera del repo.
#
# Uso:  supabase/checks/reclasificacion-replica.sh
# Requiere Docker. Usa su propio contenedor (pgreplica15, puerto 55464).
# =============================================================================
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
C=pgreplica15
FALLAS=0
psqlc() { docker exec -i "$C" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
VERIFICADO="$(mktemp)"; trap 'rm -f "$VERIFICADO"' EXIT
cat > "$VERIFICADO" <<'JSON'
\set verificado '{"aportes": [{"id": "5e5e000c-0000-4000-8000-00000000000c", "origen": "donacion", "monto": 75, "ref": "replica-pago-02", "donation_id": "5e5e0004-0000-4000-8000-000000000004", "membership_id": null, "user_id": null, "tipo": "única", "antes": [null, null], "concepto": "donacion_extraordinaria", "cuotas": 0, "despues": [null, null]}, {"id": "5e5e000d-0000-4000-8000-00000000000d", "origen": "donacion", "monto": 1916, "ref": "replica-pago-03", "donation_id": "5e5e0005-0000-4000-8000-000000000005", "membership_id": null, "user_id": "5e5e0002-0000-4000-8000-000000000002", "tipo": "única", "antes": [null, null], "concepto": "donacion_extraordinaria", "cuotas": 0, "despues": [null, null]}, {"id": "5e5e000e-0000-4000-8000-00000000000e", "origen": "donacion", "monto": 5000, "ref": "replica-pago-04", "donation_id": "5e5e0006-0000-4000-8000-000000000006", "membership_id": null, "user_id": null, "tipo": "única", "antes": [null, null], "concepto": "donacion_extraordinaria", "cuotas": 0, "despues": [null, null]}, {"id": "5e5e000f-0000-4000-8000-00000000000f", "origen": "donacion", "monto": 150, "ref": "replica-pago-05", "donation_id": "5e5e0007-0000-4000-8000-000000000007", "membership_id": null, "user_id": null, "tipo": "única", "antes": [null, null], "concepto": "donacion_extraordinaria", "cuotas": 0, "despues": [null, null]}, {"id": "5e5e0010-0000-4000-8000-000000000010", "origen": "donacion", "monto": 100, "ref": "replica-pago-06", "donation_id": "5e5e0008-0000-4000-8000-000000000008", "membership_id": null, "user_id": null, "tipo": "única", "antes": [null, null], "concepto": "donacion_extraordinaria", "cuotas": 0, "despues": [null, null]}, {"id": "5e5e0011-0000-4000-8000-000000000011", "origen": "membresia", "monto": 5000, "ref": "replica-pago-07", "donation_id": "5e5e0009-0000-4000-8000-000000000009", "membership_id": "5e5e0003-0000-4000-8000-000000000003", "user_id": "5e5e0001-0000-4000-8000-000000000001", "tipo": "suscripción", "antes": ["2026-09-02", "2026-10-02"], "concepto": "cuota_mensual", "cuotas": 1, "despues": ["2026-09-02", "2026-10-01"]}, {"id": "5e5e0012-0000-4000-8000-000000000012", "origen": "donacion", "monto": 20000, "ref": "replica-pago-08", "donation_id": "5e5e000a-0000-4000-8000-00000000000a", "membership_id": null, "user_id": "5e5e0001-0000-4000-8000-000000000001", "tipo": "única", "antes": ["2026-10-03", "2027-02-03"], "concepto": "donacion_extraordinaria", "cuotas": 0, "despues": [null, null]}, {"id": "5e5e0013-0000-4000-8000-000000000013", "origen": "membresia", "monto": 5000, "ref": "replica-pago-01", "donation_id": "5e5e000b-0000-4000-8000-00000000000b", "membership_id": "5e5e0003-0000-4000-8000-000000000003", "user_id": "5e5e0001-0000-4000-8000-000000000001", "tipo": "suscripción", "antes": ["2027-02-04", "2027-02-04"], "concepto": "cuota_mensual", "cuotas": 1, "despues": ["2026-10-02", "2026-11-01"]}], "manuales": {"cantidad": 135, "suma": 1238997.77}, "donaciones": 8, "cuenta_control": {"user_id": "5e5e0001-0000-4000-8000-000000000001", "cuotas": 2, "acumulado": 30000}}'
JSON
# Un script de supabase/data con lo verificado antepuesto.
con_verificado() { cat "$VERIFICADO" "$RAIZ/supabase/data/$1" | psqlc 2>&1; }
ok()    { echo "PASA  · $1"; }
mal()   { echo "FALLA · $1"; FALLAS=$((FALLAS + 1)); }

docker rm -f "$C" >/dev/null 2>&1
docker run -d --name "$C" -e POSTGRES_PASSWORD=postgres -p 55464:5432 \
  -v "$RAIZ/supabase/checks/pg15-bootstrap":/docker-entrypoint-initdb.d/init-scripts \
  public.ecr.aws/supabase/postgres:15.8.1.094 postgres >/dev/null || exit 1
for _ in $(seq 1 90); do
  docker exec "$C" psql -U postgres -tAc "select 1 from pg_roles where rolname='authenticated'" 2>/dev/null | grep -q 1 && break
  sleep 2
done
sleep 5
psqlc -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;' \
      -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;' >/dev/null 2>&1

aplicar_migraciones() {  # $1 = filtro: "viejas" | "nuevas"
  for f in "$RAIZ"/supabase/migrations/*.sql; do
    n=$(basename "$f")
    if [[ "$1" == viejas && "$n" > "20261016120000" ]]; then continue; fi
    if [[ "$1" == nuevas && "$n" < "20261016120000" ]]; then continue; fi
    out=$(psqlc < "$f" 2>&1) || {
      # pg_cron y el bucket de avatares no existen en un Postgres pelado (ver README).
      case "$n" in *club_cron_reaper*|*avatar_socio*) ;; *) mal "migración $n: $(echo "$out" | grep ERROR | head -1)";; esac; }
  done
}

aplicar_migraciones viejas

# ---- la foto -----------------------------------------------------------------
psqlc <<'SQL' >/dev/null
INSERT INTO auth.users (id, email, created_at, email_confirmed_at, raw_user_meta_data) VALUES
  ('5e5e0001-0000-4000-8000-000000000001','replica-cuenta-auditada@test.invalid', now(), now(), '{"name":"Replica Auditada"}'),
  ('5e5e0002-0000-4000-8000-000000000002','replica-donante@test.invalid',        now(), now(), '{"name":"Replica Donante"}');

ALTER TABLE public.donations   DISABLE TRIGGER USER;
ALTER TABLE public.memberships DISABLE TRIGGER USER;
ALTER TABLE public.aportes     DISABLE TRIGGER USER;

INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status, preapproval_id,
                                last_payment_id, last_payment_status, next_charge_date, external_reference)
VALUES ('5e5e0003-0000-4000-8000-000000000003','5e5e0001-0000-4000-8000-000000000001','Replica',5000,
        'mercadopago','active','replica-preapproval','replica-pago-01','approved','2026-10-02',
        'user:5e5e0001-0000-4000-8000-000000000001:suscripcion');

INSERT INTO public.donations (id, user_id, amount, donation_type, payment_id, status, created_at) VALUES
  ('5e5e0004-0000-4000-8000-000000000004', NULL, 75,'única','replica-pago-02','approved','2025-10-01 12:00+00'),
  ('5e5e0005-0000-4000-8000-000000000005','5e5e0002-0000-4000-8000-000000000002',1916,'única','replica-pago-03','approved','2025-10-01 13:00+00'),
  ('5e5e0006-0000-4000-8000-000000000006', NULL,5000,'única','replica-pago-04','approved','2025-11-01 12:00+00'),
  ('5e5e0007-0000-4000-8000-000000000007', NULL, 150,'única','replica-pago-05','approved','2026-01-10 12:00+00'),
  ('5e5e0008-0000-4000-8000-000000000008', NULL, 100,'única','replica-pago-06','approved','2026-08-16 12:00+00'),
  ('5e5e0009-0000-4000-8000-000000000009','5e5e0001-0000-4000-8000-000000000001',5000,'suscripción','replica-pago-07','approved','2026-09-02 20:23:00+00'),
  ('5e5e000a-0000-4000-8000-00000000000a','5e5e0001-0000-4000-8000-000000000001',20000,'única','replica-pago-08','approved','2026-10-02 00:50:51+00'),
  ('5e5e000b-0000-4000-8000-00000000000b','5e5e0001-0000-4000-8000-000000000001',5000,'suscripción','replica-pago-01','approved','2026-10-02 21:09:04+00');

INSERT INTO public.aportes (id, user_id, monto, fecha, destino_id, origen, donation_id, membership_id,
                            referencia_externa, acceso_desde, acceso_hasta) VALUES
  ('5e5e000c-0000-4000-8000-00000000000c', NULL, 75,'2025-10-01 12:00+00', public.destino_por_defecto(),'donacion','5e5e0004-0000-4000-8000-000000000004',NULL,'replica-pago-02',NULL,NULL),
  ('5e5e000d-0000-4000-8000-00000000000d','5e5e0002-0000-4000-8000-000000000002',1916,'2025-10-01 13:00+00', public.destino_por_defecto(),'donacion','5e5e0005-0000-4000-8000-000000000005',NULL,'replica-pago-03',NULL,NULL),
  ('5e5e000e-0000-4000-8000-00000000000e', NULL,5000,'2025-11-01 12:00+00', public.destino_por_defecto(),'donacion','5e5e0006-0000-4000-8000-000000000006',NULL,'replica-pago-04',NULL,NULL),
  ('5e5e000f-0000-4000-8000-00000000000f', NULL, 150,'2026-01-10 12:00+00', public.destino_por_defecto(),'donacion','5e5e0007-0000-4000-8000-000000000007',NULL,'replica-pago-05',NULL,NULL),
  ('5e5e0010-0000-4000-8000-000000000010', NULL, 100,'2026-08-16 12:00+00', public.destino_por_defecto(),'donacion','5e5e0008-0000-4000-8000-000000000008',NULL,'replica-pago-06',NULL,NULL),
  ('5e5e0011-0000-4000-8000-000000000011','5e5e0001-0000-4000-8000-000000000001',5000,'2026-09-02 20:23:00+00', public.destino_por_defecto(),'membresia','5e5e0009-0000-4000-8000-000000000009','5e5e0003-0000-4000-8000-000000000003','replica-pago-07','2026-09-02','2026-10-02'),
  ('5e5e0012-0000-4000-8000-000000000012','5e5e0001-0000-4000-8000-000000000001',20000,'2026-10-02 00:50:51+00', public.destino_por_defecto(),'donacion','5e5e000a-0000-4000-8000-00000000000a',NULL,'replica-pago-08','2026-10-03','2027-02-03'),
  ('5e5e0013-0000-4000-8000-000000000013','5e5e0001-0000-4000-8000-000000000001',5000,'2026-10-02 21:09:04+00', public.destino_por_defecto(),'membresia','5e5e000b-0000-4000-8000-00000000000b','5e5e0003-0000-4000-8000-000000000003','replica-pago-01','2027-02-04','2027-02-04');

-- 135 manuales por $1.238.997,77, como en producción: sin titular ni período.
INSERT INTO public.aportes (monto, fecha, destino_id, origen, referencia_externa)
SELECT CASE WHEN g = 135 THEN 1238997.77 - 134 * 9000 ELSE 9000 END,
       '2026-08-01'::timestamptz + g * interval '1 day', public.destino_por_defecto(), 'manual',
       'replica-extracto:' || g
  FROM generate_series(1, 135) g;

ALTER TABLE public.donations   ENABLE TRIGGER USER;
ALTER TABLE public.memberships ENABLE TRIGGER USER;
ALTER TABLE public.aportes     ENABLE TRIGGER USER;
SQL

foto() {
  psqlc -At -c "select id, concepto_o_nada, cuotas, acceso_desde, acceso_hasta, anulado
                  from (select id, coalesce(to_jsonb(a)->>'concepto','-') concepto_o_nada,
                               coalesce(to_jsonb(a)->>'cuotas_cubiertas','0') cuotas,
                               acceso_desde, acceso_hasta,
                               coalesce(to_jsonb(a)->>'anulado_en','-') anulado
                          from public.aportes a) x order by id"
}
FOTO_ORIGINAL=$(foto)

# ---- 2. pre chequeo antes de las migraciones nuevas ----------------------------
out=$(con_verificado precheck_reclasificacion_aportes_2026_10.sql)
echo "$out" | grep -q 'PRE CHEQUEO OK' && echo "$out" | grep -q 'todavía no está instalada' \
  && ok "pre chequeo sobre el esquema de hoy (antes de migrar)" || mal "pre chequeo antes de migrar: $out"

# ---- 2b. sin lo verificado, el pre chequeo NO puede aprobar nada --------------
out=$(psqlc < "$RAIZ/supabase/data/precheck_reclasificacion_aportes_2026_10.sql" 2>&1)
echo "$out" | grep -q 'falta lo verificado' && ! echo "$out" | grep -q 'PRE CHEQUEO OK' \
  && ok "sin el archivo de lo verificado, el pre chequeo FALLA" || mal "pre chequeo sin verificado: $out"

# ---- 3. migraciones nuevas + pre chequeo ------------------------------------
aplicar_migraciones nuevas
out=$(con_verificado precheck_reclasificacion_aportes_2026_10.sql)
if echo "$out" | grep -q 'PRE CHEQUEO OK'; then
  ok "pre chequeo con la reclasificación instalada"
  echo "$out" | grep 'CAMBIO ESPERADO' | sed 's/^.*NOTICE: */      /'
  [ "$(echo "$out" | grep -c 'CAMBIO ESPERADO')" -eq 8 ] && ok "informa 8 cambios esperados" || mal "cantidad de cambios esperados"
else mal "pre chequeo después de migrar: $out"; fi
[ "$(foto)" == "$FOTO_ORIGINAL" ] || true   # (las columnas nuevas cambian la foto: se compara al revertir)
FOTO_MIGRADA=$(foto)

# ---- 4. aplicar --------------------------------------------------------------
out=$(con_verificado aplicar_reclasificacion_aportes_2026_10.sql)
echo "$out" | grep -q 'POST CHEQUEO OK' && ok "aplicar" || mal "aplicar: $out"

r=$(psqlc -At -F'|' -c "select concepto, cuotas_cubiertas, acceso_desde, acceso_hasta from public.aportes where id in
     ('5e5e0011-0000-4000-8000-000000000011','5e5e0012-0000-4000-8000-000000000012','5e5e0013-0000-4000-8000-000000000013')
     order by fecha")
esperado=$'cuota_mensual|1|2026-09-02|2026-10-01\ndonacion_extraordinaria|0||\ncuota_mensual|1|2026-10-02|2026-11-01'
[ "$r" == "$esperado" ] && ok "cuenta auditada: 2/9–1/10, donación sin período, 2/10–1/11" || mal "cuenta auditada quedó: $r"

r=$(psqlc -At -c "select count(*) from public.aportes where origen='manual' and (concepto is not null or cuotas_cubiertas<>0 or acceso_desde is not null)")
[ "$r" == "0" ] && ok "los 135 manuales siguen sin clasificar y sin efecto de cuota" || mal "manuales con efecto: $r"

r=$(psqlc -At -c "select count(*) from public.aportes_correcciones where lote='2026-10-cuotas-v2' and accion='reclasificacion'")
[ "$r" == "8" ] && ok "8 correcciones con ANTES/DESPUÉS" || mal "correcciones: $r"

r=$(psqlc -At -c "select convalidated from pg_constraint where conname='aportes_acceso_solo_cuotas_chk'")
[ "$r" == "t" ] && ok "CHECK de períodos validado" || mal "CHECK sin validar"

r=$(psqlc -At -F'|' -c "select meses_aportados, aporte_acumulado from public.elegibilidad_club('5e5e0001-0000-4000-8000-000000000001')")
[ "$r" == "2|30000" ] && ok "elegibilidad: 2 cuotas efectivas, \$30.000" || mal "elegibilidad: $r"

FOTO_APLICADA=$(foto)

# ---- 5. idempotencia ---------------------------------------------------------
out=$(con_verificado aplicar_reclasificacion_aportes_2026_10.sql)
echo "$out" | grep -q 'POST CHEQUEO OK' && [ "$(foto)" == "$FOTO_APLICADA" ] \
  && [ "$(psqlc -At -c "select count(*) from public.aportes_correcciones where lote='2026-10-cuotas-v2'")" == "8" ] \
  && ok "re-aplicar no cambia nada" || mal "re-aplicar: $out"

# ---- 6. revertir -------------------------------------------------------------
out=$(psqlc < "$RAIZ/supabase/data/revertir_reclasificacion_aportes_2026_10.sql" 2>&1)
echo "$out" | grep -q ERROR && mal "revertir: $(echo "$out" | grep ERROR | head -1)"
[ "$(foto)" == "$FOTO_MIGRADA" ] && ok "revertir devuelve la foto exacta (incluido el período de un día)" \
  || { mal "revertir"; diff <(echo "$FOTO_MIGRADA") <(foto); }
r=$(psqlc -At -c "select count(*) from public.aportes_correcciones where lote='2026-10-cuotas-v2'")
[ "$r" == "16" ] && ok "revertir no borra: 8 reclasificaciones marcadas + 8 reversiones" || mal "correcciones tras revertir: $r"

# ---- 7. aplicar otra vez -----------------------------------------------------
out=$(con_verificado aplicar_reclasificacion_aportes_2026_10.sql)
echo "$out" | grep -q 'POST CHEQUEO OK' && [ "$(foto)" == "$FOTO_APLICADA" ] \
  && ok "aplicar después de revertir da el mismo resultado" || mal "re-aplicar tras revertir: $out"

# ---- 8. control negativo -----------------------------------------------------
psqlc -c "INSERT INTO public.donations (id, user_id, amount, donation_type, payment_id, status)
          VALUES ('99999999-0000-0000-0000-000000000001', NULL, 777, 'única', 'replica-intruso', 'approved');" >/dev/null
out=$(con_verificado precheck_reclasificacion_aportes_2026_10.sql)
echo "$out" | grep -q 'PRE CHEQUEO FALLÓ' && echo "$out" | grep -q 'aporte automático NO verificado' \
  && ok "un aporte no verificado hace FALLAR el pre chequeo" || mal "control negativo no falló: $out"
out=$(con_verificado aplicar_reclasificacion_aportes_2026_10.sql)
ANTES_INTRUSO=$(psqlc -At -c "select count(*) from public.aportes_correcciones")
echo "$out" | grep -q 'PRE CHEQUEO FALLÓ' \
  && [ "$(psqlc -At -c "select count(*) from public.aportes_correcciones")" == "$ANTES_INTRUSO" ] \
  && ok "y aplicar se niega (no deja nada a medias)" || mal "aplicar con intruso: $out"

psqlc -c "UPDATE public.aportes SET monto = monto + 1 WHERE origen='manual' AND referencia_externa='replica-extracto:1';" >/dev/null 2>&1
psqlc -c "DELETE FROM public.aportes WHERE referencia_externa='replica-intruso';" >/dev/null 2>&1
psqlc -c "DELETE FROM public.donations WHERE payment_id='replica-intruso';" >/dev/null 2>&1
out=$(con_verificado precheck_reclasificacion_aportes_2026_10.sql)
echo "$out" | grep -q 'manuales: se esperaban 135 por 1238997.77' \
  && ok "un importe manual distinto también hace FALLAR el pre chequeo" || mal "control negativo de importe: $out"

docker rm -f "$C" >/dev/null 2>&1
echo
echo "RESULTADO: $FALLAS falla/s"
exit $FALLAS
