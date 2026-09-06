# Bootstrap para validar en PostgreSQL **15** (la versión de producción)

Producción corre PostgreSQL **15.8**, no 17. §11.7.8 ya lo advirtió, y también
que *«la imagen de PG15 no arranca sola»*: su entrypoint espera objetos que
normalmente inyecta `supabase start`, y `supabase start` no funciona en esta
máquina (§12.10.12). El resultado era que **la validación seria se hacía en 17 y
la producción es 15.**

`99-roles.sql` es lo que faltaba. Se monta y la imagen 15 arranca sola.

## Cómo se usa

```bash
docker run -d --name pgtest15 -e POSTGRES_PASSWORD=postgres -p 55433:5432 \
  -v "$(cygpath -m supabase/checks/pg15-bootstrap)":/docker-entrypoint-initdb.d/init-scripts \
  public.ecr.aws/supabase/postgres:15.8.1.094 postgres

# ⚠️ uuid-ossp NO viene instalada en el schema `extensions` de esta imagen, y el
#    baseline la usa. Sin esto, la PRIMERA migración falla y las otras 14 caen
#    en cascada con errores que no dicen la causa.
docker exec pgtest15 psql -U postgres -q \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;' \
  -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;'

for f in supabase/migrations/*.sql; do
  docker exec -i pgtest15 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "$f"
done
```

## Qué resuelve, y por qué cada cosa

Cada una se descubrió porque el contenedor **moría sin decir por qué**: el error
solo aparece en `docker logs`, y `docker run -d` devuelve éxito igual. Si algo
falla, mirar el log antes de suponer.

| Falta | Síntoma | Por qué |
|---|---|---|
| schemas `auth`, `storage`, `realtime`, … | `schema "auth" does not exist` | Las migraciones propias de la imagen les hacen `GRANT` |
| los roles `anon`/`authenticated`/… | el `ALTER USER` tumba el contenedor | Un `ALTER` sobre un rol ausente es fatal, no un warning |
| `pgbouncer.get_auth()` | `could not find a function named` | Una migración de la imagen le cambia el owner |
| `storage.migrations`, `buckets`, `objects` | `relation ... does not exist` | Hay `REVOKE` sobre ellas |
| `auth.schema_migrations` | idem | idem |
| `auth.users` + `auth.uid()`/`role()`/`email()` | `function auth.uid() does not exist` | **Casi toda policy del repo llama a `auth.uid()`** |
| columnas `aud`, `role`, `instance_id` en `auth.users` | `column "aud" does not exist` | Los checks de esta carpeta las insertan |
| `file_size_limit` en `storage.buckets` | `column ... does not exist` | La usa `20260719140000_comision_docs_storage.sql` |
| `BYPASSRLS` en `service_role` | **un `FALLA` engañoso** | Sin eso, el control POSITIVO de `club-check` (T12, «service_role SÍ escribe») falla y se lee como si el módulo estuviera roto, cuando lo roto es el andamio. Es el modo de falla de §11.4 otra vez |

## ✅ Lo que esto corrige de lo que decía §11.7.8

Ese cierre afirmaba que **`20260719140000_comision_docs_storage.sql` siempre
falla en PG15 pelado** y lo daba por aceptable. Con el stub de `storage.buckets`
completo, **ya no falla**: al 2026-09-02 las **15 migraciones aplican desde
cero en PG15, convergen al reaplicarse, y los cinco checks dan la misma salida
que en 17**. No queda ninguna excepción declarada.

⚠️ **Esto no reemplaza al stack real.** Son stubs: `auth.users` no tiene los
constraints de GoTrue y `storage` no tiene lógica. Sirve para **las policies, el
DDL y los triggers** —que es el 100% de lo que este repo versiona— y no para
probar PostgREST ni la autenticación. Para eso siguen estando los
`*.integration.test.js`, esperando que `supabase start` funcione.


## ⚠️ `pg_cron` necesita arrancar el contenedor con un flag (2026-09-06)

`20260906150000_club_cron_reaper.sql` hace `CREATE EXTENSION pg_cron`, y en un contenedor
pelado eso falla de **dos** maneras distintas. Las dos son del entorno, no del esquema:

| Falla | Por qué | Cómo se resuelve acá |
|---|---|---|
| `pg_cron can only be loaded via shared_preload_libraries` | La imagen arranca sin precargarla; **producción sí la trae precargada** (verificado en `shared_preload_libraries`) | Arrancar con `postgres -c shared_preload_libraries=pg_cron` |
| `permission denied to create extension` | En esta imagen `postgres` **no es superusuario** — el superusuario es `supabase_admin`. En producción, en cambio, Supabase le permite a `postgres` crear las extensiones de su lista | Aplicar **esa** migración con `-U supabase_admin` |

```bash
docker run -d --name pgtest15 -e POSTGRES_PASSWORD=postgres -p 55433:5432 \n  -v "$(cygpath -m supabase/checks/pg15-bootstrap)":/docker-entrypoint-initdb.d/init-scripts \n  public.ecr.aws/supabase/postgres:15.8.1.094 postgres -c shared_preload_libraries=pg_cron

# ... las demás migraciones como siempre, y esta con el otro rol:
docker exec -i pgtest15 psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q \n  < supabase/migrations/20260906150000_club_cron_reaper.sql
```

**Por qué la migración va en un archivo aparte y no junto a las otras tres cosas del
cierre de §12**: así el error dice exactamente qué pasó, en vez de tumbar una transacción
que traía además la tabla de postulaciones y las funciones de reporte.

Verificado el 2026-09-06: reaplicar la migración **converge** —`cron.schedule` con un
`jobname` que ya existe reemplaza el job en vez de duplicarlo— y queda **1 sola fila** en
`cron.job`.
