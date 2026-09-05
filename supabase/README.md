# Supabase — esquema y funciones versionadas

Esta carpeta versiona el esquema de la base (`migrations/`) y las Edge Functions
(`functions/`) del proyecto. Antes no existía: el esquema y las RLS se
administraban a mano en la consola. A partir del portal de Comisión Directiva,
todo cambio de backend queda acá documentado.

## Estructura

```
supabase/
  config.toml                  # project_id público (sin secretos)
  migrations/                  # SQL en orden por timestamp (YYYYMMDDHHMMSS_*.sql)
  data/                        # cargas de datos de ESTE cliente. NO son migraciones
  checks/                      # verificación de las RLS contra un Postgres real
  functions/
    _shared/cors.ts            # helpers CORS reutilizables
    _shared/club-reglas.ts     # la lógica que DECIDE del club (pura, testeable)
    create-user/index.ts       # alta de usuarios con rol (service_role)
```

**`migrations/` vs `data/` — la distinción importa y se confunde fácil.** En
`migrations/` va lo que es igual para toda entidad: tablas, funciones, policies.
En `data/` va lo que es de la Fundación y de nadie más: sus destinos, su
categoría de miembro. Es la regla de ROADMAP §10.9 —*lo que varía por entidad va
en datos*— aplicada a la carpeta.

Consecuencia práctica: **`tools/db.sh apply` se niega a aplicar algo que no esté
en `migrations/`**, a propósito. Las cargas de `data/` van por
`cat archivo.sql | tools/db.sh sql`, y son idempotentes igual.

⚠️ Al levantar una entidad nueva, `migrations/` se aplica entero y `data/`
**no**: ahí está el contenido del primer cliente.

## Aplicar las migraciones

**Opción A — consola (rápida, sin instalar nada):**
Pegar el contenido de cada archivo de `migrations/` en el **SQL Editor** de
Supabase, en orden de timestamp. Son idempotentes (se pueden re-correr).

**Opción B — CLI (recomendada para versionar de verdad):**
```bash
supabase login
supabase link --project-ref lbtyxnbyetsvngsxczkt
supabase db push            # aplica las migraciones pendientes al proyecto remoto
```

## Verificar las RLS antes de aplicar

`checks/` prueba que las policies se comporten como el código asume — los tests con
mocks no pueden: prueban nuestro código, no la base. **Toda migración que toque una
tabla que otorga algo** (`aportes`, `club_canjes`, `miembros`, `padrinazgos`) va con su
check. Ver `checks/README.md`, que explica cómo correrlos en la versión de producción
(**PostgreSQL 15**, no 17) y dos trampas que ya costaron tiempo.

## Base local para probar (Docker) y tests de integración

El stack local recrea la base desde `migrations/`, así que sirve para probar
escrituras reales **sin tocar producción**. Es lo que usan los
`*.integration.test.js` (ver `vitest.integration.config.js`).

```bash
npx supabase start          # levanta el stack (necesita Docker corriendo)
npm run test:integration    # corre los tests contra la base local
npx supabase stop           # baja el stack (--no-backup para borrar los datos)
```

`npm run test:integration` toma las credenciales de `supabase status -o env`;
no hay que setear nada a mano. Si el stack no está levantado, avisa y corta.

**Por qué existen estos tests además de los unitarios:** los tests normales
mockean Supabase, así que prueban que la capa de datos use bien sus helpers, pero
no pueden probar que las **RLS reales** hagan lo que asumimos. Los de integración
corren el código real contra un Postgres real con estas políticas aplicadas.

⚠️ **Guardarraíl:** `src/lib/supabase.js` cae a las credenciales de PRODUCCIÓN
cuando no hay env vars, y estos tests escriben. Por eso tanto el runner
(`tools/run-integration-tests.mjs`) como el propio test abortan si la URL no es
`127.0.0.1`/`localhost`. No relajar eso.

### Requisitos de disco

El stack son ~10 imágenes (postgres, kong, gotrue, postgrest, realtime, storage,
studio, logflare, vector, edge-runtime): contá **~8-10 GB libres** en el disco de
Docker. Con poco espacio, Docker Desktop falla con
`Docker Desktop is unable to start` y los pulls quedan a medias.
Para bajar el consumo se pueden excluir los servicios que estos tests no usan:

```bash
npx supabase start -x studio,logflare,vector,imgproxy,mailpit,realtime,storage-api,edge-runtime
```

Eso deja solo db + auth + rest + kong, que es lo que necesitan los tests.

## Deploy de la Edge Function

```bash
supabase functions deploy create-user
supabase secrets list       # verificar que SUPABASE_SERVICE_ROLE_KEY exista (se inyecta sola)
```

La `service_role` key la inyecta la plataforma en runtime; **no** hay que setearla
a mano ni commitearla.

## Qué NO se commitea

- `.env*` (excepto `.env.example`).
- La `service_role` key ni el JWT secret, en ningún archivo.
- La anon key SÍ es pública por diseño (ya está en `src/lib/supabase.js`).
