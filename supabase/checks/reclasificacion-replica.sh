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
# Uso:  supabase/checks/reclasificacion-replica.sh
# Requiere Docker. Usa su propio contenedor (pgreplica15, puerto 55464).
# =============================================================================
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
C=pgreplica15
FALLAS=0
psqlc() { docker exec -i "$C" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
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
    if [[ "$1" == viejas && "$n" > "20261016" ]]; then continue; fi
    if [[ "$1" == nuevas && "$n" < "20261016" ]]; then continue; fi
    out=$(psqlc < "$f" 2>&1) || {
      # pg_cron y el bucket de avatares no existen en un Postgres pelado (ver README).
      case "$n" in *club_cron_reaper*|*avatar_socio*) ;; *) mal "migración $n: $(echo "$out" | grep ERROR | head -1)";; esac; }
  done
}

aplicar_migraciones viejas

# ---- la foto -----------------------------------------------------------------
psqlc <<'SQL' >/dev/null
INSERT INTO auth.users (id, email, created_at, email_confirmed_at, raw_user_meta_data) VALUES
  ('c3becdd9-5974-4735-8270-134cdbcd9d48','replica-cuenta-auditada@test.invalid', now(), now(), '{"name":"Replica Auditada"}'),
  ('20fa6658-37fd-49de-877d-84cb93d6483f','replica-donante@test.invalid',        now(), now(), '{"name":"Replica Donante"}');

ALTER TABLE public.donations   DISABLE TRIGGER USER;
ALTER TABLE public.memberships DISABLE TRIGGER USER;
ALTER TABLE public.aportes     DISABLE TRIGGER USER;

INSERT INTO public.memberships (id, user_id, plan, amount, payment_method, status, preapproval_id,
                                last_payment_id, last_payment_status, next_charge_date, external_reference)
VALUES ('d51fc640-317c-429f-8b9b-04a4cf10031a','c3becdd9-5974-4735-8270-134cdbcd9d48','Replica',5000,
        'mercadopago','active','replica-preapproval','181067329409','approved','2026-10-02',
        'user:c3becdd9-5974-4735-8270-134cdbcd9d48:suscripcion');

INSERT INTO public.donations (id, user_id, amount, donation_type, payment_id, status, created_at) VALUES
  ('a6844bb5-e7bb-4e28-bee8-6ee8796d88fd', NULL, 75,'única','130390758084','approved','2025-10-01 12:00+00'),
  ('5de9f6f1-675b-49f1-972f-f39d2b99534a','20fa6658-37fd-49de-877d-84cb93d6483f',1916,'única','130390961370','approved','2025-10-01 13:00+00'),
  ('6da6f87c-8c93-4e7b-ae9c-90d763a8d1b7', NULL,5000,'única','133434832051','approved','2025-11-01 12:00+00'),
  ('5ba013d6-7fda-43de-9737-cbd6b6f6cdfc', NULL, 150,'única','141942388060','approved','2026-01-10 12:00+00'),
  ('ddf70dc1-713e-49d0-b5d3-0695c52edab2', NULL, 100,'única','174204153506','approved','2026-08-16 12:00+00'),
  ('53523291-4fdc-4c34-b15c-5c8aa2171686','c3becdd9-5974-4735-8270-134cdbcd9d48',5000,'suscripción','175967372005','approved','2026-09-02 20:23:00+00'),
  ('726686ca-1635-4d39-8c89-cd7576f06985','c3becdd9-5974-4735-8270-134cdbcd9d48',20000,'única','181921612108','approved','2026-10-02 00:50:51+00'),
  ('0ad914ed-a166-435b-ac8e-027c9673f9bc','c3becdd9-5974-4735-8270-134cdbcd9d48',5000,'suscripción','181067329409','approved','2026-10-02 21:09:04+00');

INSERT INTO public.aportes (id, user_id, monto, fecha, destino_id, origen, donation_id, membership_id,
                            referencia_externa, acceso_desde, acceso_hasta) VALUES
  ('041cb69e-0930-4cc3-91f4-35be232a371f', NULL, 75,'2025-10-01 12:00+00', public.destino_por_defecto(),'donacion','a6844bb5-e7bb-4e28-bee8-6ee8796d88fd',NULL,'130390758084',NULL,NULL),
  ('459310e8-f07e-4c42-ac93-b5567b3d8d21','20fa6658-37fd-49de-877d-84cb93d6483f',1916,'2025-10-01 13:00+00', public.destino_por_defecto(),'donacion','5de9f6f1-675b-49f1-972f-f39d2b99534a',NULL,'130390961370',NULL,NULL),
  ('e8b98821-3785-4280-a402-08ecb8c19095', NULL,5000,'2025-11-01 12:00+00', public.destino_por_defecto(),'donacion','6da6f87c-8c93-4e7b-ae9c-90d763a8d1b7',NULL,'133434832051',NULL,NULL),
  ('1c4d57c0-8376-40b4-9c9b-e2d0c61de267', NULL, 150,'2026-01-10 12:00+00', public.destino_por_defecto(),'donacion','5ba013d6-7fda-43de-9737-cbd6b6f6cdfc',NULL,'141942388060',NULL,NULL),
  ('bde58fb8-5145-4d8b-a669-eb31cd4834e8', NULL, 100,'2026-08-16 12:00+00', public.destino_por_defecto(),'donacion','ddf70dc1-713e-49d0-b5d3-0695c52edab2',NULL,'174204153506',NULL,NULL),
  ('394db8cc-25af-48dd-a12e-849833b1207e','c3becdd9-5974-4735-8270-134cdbcd9d48',5000,'2026-09-02 20:23:00+00', public.destino_por_defecto(),'membresia','53523291-4fdc-4c34-b15c-5c8aa2171686','d51fc640-317c-429f-8b9b-04a4cf10031a','175967372005','2026-09-02','2026-10-02'),
  ('f1be2fa3-a67d-40a0-ba62-7f143b92e4bd','c3becdd9-5974-4735-8270-134cdbcd9d48',20000,'2026-10-02 00:50:51+00', public.destino_por_defecto(),'donacion','726686ca-1635-4d39-8c89-cd7576f06985',NULL,'181921612108','2026-10-03','2027-02-03'),
  ('fc38049b-d97a-4db4-82cb-d746a84f7c1a','c3becdd9-5974-4735-8270-134cdbcd9d48',5000,'2026-10-02 21:09:04+00', public.destino_por_defecto(),'membresia','0ad914ed-a166-435b-ac8e-027c9673f9bc','d51fc640-317c-429f-8b9b-04a4cf10031a','181067329409','2027-02-04','2027-02-04');

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
out=$(psqlc < "$RAIZ/supabase/data/precheck_reclasificacion_aportes_2026_10.sql" 2>&1)
echo "$out" | grep -q 'PRE CHEQUEO OK' && echo "$out" | grep -q 'todavía no está instalada' \
  && ok "pre chequeo sobre el esquema de hoy (antes de migrar)" || mal "pre chequeo antes de migrar: $out"

# ---- 3. migraciones nuevas + pre chequeo ------------------------------------
aplicar_migraciones nuevas
out=$(psqlc < "$RAIZ/supabase/data/precheck_reclasificacion_aportes_2026_10.sql" 2>&1)
if echo "$out" | grep -q 'PRE CHEQUEO OK'; then
  ok "pre chequeo con la reclasificación instalada"
  echo "$out" | grep 'CAMBIO ESPERADO' | sed 's/^.*NOTICE: */      /'
  [ "$(echo "$out" | grep -c 'CAMBIO ESPERADO')" -eq 8 ] && ok "informa 8 cambios esperados" || mal "cantidad de cambios esperados"
else mal "pre chequeo después de migrar: $out"; fi
[ "$(foto)" == "$FOTO_ORIGINAL" ] || true   # (las columnas nuevas cambian la foto: se compara al revertir)
FOTO_MIGRADA=$(foto)

# ---- 4. aplicar --------------------------------------------------------------
out=$(psqlc < "$RAIZ/supabase/data/aplicar_reclasificacion_aportes_2026_10.sql" 2>&1)
echo "$out" | grep -q 'POST CHEQUEO OK' && ok "aplicar" || mal "aplicar: $out"

r=$(psqlc -At -F'|' -c "select concepto, cuotas_cubiertas, acceso_desde, acceso_hasta from public.aportes where id in
     ('394db8cc-25af-48dd-a12e-849833b1207e','f1be2fa3-a67d-40a0-ba62-7f143b92e4bd','fc38049b-d97a-4db4-82cb-d746a84f7c1a')
     order by fecha")
esperado=$'cuota_mensual|1|2026-09-02|2026-10-01\ndonacion_extraordinaria|0||\ncuota_mensual|1|2026-10-02|2026-11-01'
[ "$r" == "$esperado" ] && ok "cuenta auditada: 2/9–1/10, donación sin período, 2/10–1/11" || mal "cuenta auditada quedó: $r"

r=$(psqlc -At -c "select count(*) from public.aportes where origen='manual' and (concepto is not null or cuotas_cubiertas<>0 or acceso_desde is not null)")
[ "$r" == "0" ] && ok "los 135 manuales siguen sin clasificar y sin efecto de cuota" || mal "manuales con efecto: $r"

r=$(psqlc -At -c "select count(*) from public.aportes_correcciones where lote='2026-10-cuotas-v2' and accion='reclasificacion'")
[ "$r" == "8" ] && ok "8 correcciones con ANTES/DESPUÉS" || mal "correcciones: $r"

r=$(psqlc -At -c "select convalidated from pg_constraint where conname='aportes_acceso_solo_cuotas_chk'")
[ "$r" == "t" ] && ok "CHECK de períodos validado" || mal "CHECK sin validar"

r=$(psqlc -At -F'|' -c "select meses_aportados, aporte_acumulado from public.elegibilidad_club('c3becdd9-5974-4735-8270-134cdbcd9d48')")
[ "$r" == "2|30000" ] && ok "elegibilidad: 2 cuotas efectivas, \$30.000" || mal "elegibilidad: $r"

FOTO_APLICADA=$(foto)

# ---- 5. idempotencia ---------------------------------------------------------
out=$(psqlc < "$RAIZ/supabase/data/aplicar_reclasificacion_aportes_2026_10.sql" 2>&1)
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
out=$(psqlc < "$RAIZ/supabase/data/aplicar_reclasificacion_aportes_2026_10.sql" 2>&1)
echo "$out" | grep -q 'POST CHEQUEO OK' && [ "$(foto)" == "$FOTO_APLICADA" ] \
  && ok "aplicar después de revertir da el mismo resultado" || mal "re-aplicar tras revertir: $out"

# ---- 8. control negativo -----------------------------------------------------
psqlc -c "INSERT INTO public.donations (id, user_id, amount, donation_type, payment_id, status)
          VALUES ('99999999-0000-0000-0000-000000000001', NULL, 777, 'única', 'replica-intruso', 'approved');" >/dev/null
out=$(psqlc < "$RAIZ/supabase/data/precheck_reclasificacion_aportes_2026_10.sql" 2>&1)
echo "$out" | grep -q 'PRE CHEQUEO FALLÓ' && echo "$out" | grep -q 'aporte automático NO verificado' \
  && ok "un aporte no verificado hace FALLAR el pre chequeo" || mal "control negativo no falló: $out"
out=$(psqlc < "$RAIZ/supabase/data/aplicar_reclasificacion_aportes_2026_10.sql" 2>&1)
ANTES_INTRUSO=$(psqlc -At -c "select count(*) from public.aportes_correcciones")
echo "$out" | grep -q 'PRE CHEQUEO FALLÓ' \
  && [ "$(psqlc -At -c "select count(*) from public.aportes_correcciones")" == "$ANTES_INTRUSO" ] \
  && ok "y aplicar se niega (no deja nada a medias)" || mal "aplicar con intruso: $out"

psqlc -c "UPDATE public.aportes SET monto = monto + 1 WHERE origen='manual' AND referencia_externa='replica-extracto:1';" >/dev/null 2>&1
psqlc -c "DELETE FROM public.aportes WHERE referencia_externa='replica-intruso';" >/dev/null 2>&1
psqlc -c "DELETE FROM public.donations WHERE payment_id='replica-intruso';" >/dev/null 2>&1
out=$(psqlc < "$RAIZ/supabase/data/precheck_reclasificacion_aportes_2026_10.sql" 2>&1)
echo "$out" | grep -q 'manuales: se esperaban 135 por 1238997.77' \
  && ok "un importe manual distinto también hace FALLAR el pre chequeo" || mal "control negativo de importe: $out"

docker rm -f "$C" >/dev/null 2>&1
echo
echo "RESULTADO: $FALLAS falla/s"
exit $FALLAS
