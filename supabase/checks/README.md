# Verificación de las RLS contra un Postgres real

`rls-check.sql` prueba que las políticas versionadas en `../migrations/` se comporten
como el código asume. Los tests con mocks no pueden hacerlo: prueban nuestro código,
no la base.

## Por qué no usa `supabase start`

En la máquina donde se armó esto, `npx supabase start` falla con
`LegacyDbSetupError: error running container: exit 255` en el paso "Initialising
schema" — con Docker sano (la misma imagen de postgres corre bien a mano) y con
config completa. Así que esta verificación usa **Postgres pelado + psql**, que
alcanza para probar las políticas y no depende de que el stack entero levante.

Los `src/**/*.integration.test.js` sí necesitan el stack completo (PostgREST +
GoTrue) y quedan listos para cuando arranque; se corren con `npm run test:integration`.

## Cómo correrlo

```bash
# 1. Postgres pelado con la imagen de Supabase (trae los roles anon/authenticated,
#    los schemas auth/extensions/storage y uuid-ossp ya instalados)
docker run -d --name pgtest -e POSTGRES_PASSWORD=postgres -p 55432:5432 \
  public.ecr.aws/supabase/postgres:17.6.1.158 postgres

# 2. Aplicar TODAS las migraciones, en orden por nombre (= por timestamp)
for f in supabase/migrations/*.sql; do
  docker exec -i pgtest psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "$f"
done

# 3. Verificar las políticas
docker exec -i pgtest psql -U postgres -d postgres -q < supabase/checks/rls-check.sql

# 4. Limpiar
docker rm -f pgtest
```

✅ **Orden de las migraciones (resuelto el 2026-08-16, §10 fase 0).** Antes había que
aplicar **solo el baseline**, porque las 5 migraciones de junio lo precedían por
timestamp y fallaban con `relation "public.users" does not exist`. Ya no: se eliminaron
—su contenido estaba íntegro en el baseline— y el set completo se aplica en orden.

Dos cosas a tener en cuenta al correr esto:

1. **Esperar a que el contenedor termine de inicializar**, no solo a `pg_isready`. La
   imagen corre scripts de setup después de aceptar conexiones, y aplicar el baseline
   en el medio falla con un `could not open relation with OID …` que no tiene nada que
   ver con las migraciones. Señal confiable: el **segundo**
   `database system is ready to accept connections` en `docker logs`.
2. **`20260719140000_comision_docs_storage.sql` se saltea acá y está bien.** Emite un
   `NOTICE` y no hace nada porque `storage.buckets` no existe: esas tablas las crea el
   servicio storage-api, no la imagen de Postgres. En un proyecto Supabase real sí
   aplica.

## Qué confirmó (2026-08-14)

| Comprobación | Resultado |
|---|---|
| `partners`: el anon solo ve los aprobados | ✅ |
| `partners`: INSERT anónimo con `estado='pendiente'` | ✅ permitido |
| `partners`: INSERT anónimo con `estado='aprobado'` | ✅ rechazado, SQLSTATE 42501 |
| **El anon no puede leer la fila que acaba de insertar** | ✅ 0 filas |
| `benefits`: el anon solo ve `estado='activo'` | ✅ |
| `news`: lectura pública sí, escritura anónima no (42501) | ✅ |
| DELETE sin policy | ⚠️ 0 filas **sin error** |
| `trg_prevent_privilege_escalation` | ⚠️ revierte `role` **en silencio** |

Las dos filas con ⚠️ son propiedades del modelo de seguridad, no bugs introducidos:
Postgres no las reporta como error, así que **`error === null` no alcanza para afirmar
"el cambio se aplicó"** en un DELETE ni en un cambio de `role`. En la práctica solo
afectan a un caller sin permiso, que no llega a esas pantallas.

El hallazgo más útil es el de la fila en negrita: **prueba** que `addPartner` no debe
pedir `.select()`. Con `.select()`, el formulario público de postulación habría fallado
en producción, y ningún test con mocks lo habría detectado.
