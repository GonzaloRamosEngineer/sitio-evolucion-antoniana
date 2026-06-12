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
  functions/
    _shared/cors.ts            # helpers CORS reutilizables
    create-user/index.ts       # alta de usuarios con rol (service_role)
```

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
