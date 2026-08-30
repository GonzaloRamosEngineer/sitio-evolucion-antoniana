# Verificación de las RLS contra un Postgres real

`rls-check.sql` y `aportes-check.sql` prueban que las políticas versionadas en
`../migrations/` se comporten como el código asume. Los tests con mocks no pueden
hacerlo: prueban nuestro código, no la base.

- **`rls-check.sql`** — partners, benefits, news, users (escalada de privilegios).
- **`aportes-check.sql`** — `aportes`, `reglas_acceso` y las funciones de acceso
  (ROADMAP §10 fase 1). Es el check más importante del repo: `aportes` es la tabla
  que **otorga** privilegios.
- **`triggers-aportes-check.sql`** — los triggers que alimentan el libro y las
  funciones de antigüedad (decisiones D1 y D4). Cubre lo que más caro sale si falla:
  que un reintento del webhook de MercadoPago no regale un mes de acceso.

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
docker exec -i pgtest psql -U postgres -d postgres -q < supabase/checks/aportes-check.sql
docker exec -i pgtest psql -U postgres -d postgres -q < supabase/checks/triggers-aportes-check.sql

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


## Qué confirmó `aportes-check.sql` (2026-08-30)

| Comprobación | Resultado |
|---|---|
| A1 — cuota vigente → con acceso | ✅ |
| A1 — cuota vencida hace 10 días → **con acceso** y `en_gracia=true` (gracia 30 d) | ✅ |
| A1 — cuota vencida hace 40 días → sin acceso | ✅ |
| A1 — **donación** vencida hace 10 días → sin acceso (la gracia NO aplica a donaciones) | ✅ |
| A1 — usuario sin aportes → sin acceso, `vence_el` NULL | ✅ |
| A2 — `anon` SELECT sobre `aportes` | ✅ rechazado, 42501 |
| A3 — `anon` INSERT sobre `aportes` | ✅ rechazado, 42501 |
| A4 — `authenticated` INSERT (autoconcederse acceso) | ✅ rechazado, 42501 |
| A5 — el socio ve solo sus propios aportes | ✅ 1 de 4 |
| A6 — `tiene_acceso()` sin parámetro resuelve por `auth.uid()` | ✅ |
| A7 — `tiene_acceso(uuid)` de otra persona | ✅ rechazado, 42501 |
| A8 — `reglas_acceso`: lectura pública sí, UPDATE anónimo no | ✅ 42501 |
| A9a — aporte manual en efectivo (sin membership ni donation) | ✅ permitido |
| A9b — mezclar orígenes (cuota con `donation_id`) | ✅ rechazado, 23514 |

Dos diferencias con el cuadro de `rls-check.sql` que vale la pena notar, porque son
mejoras deliberadas y no accidentes:

1. **`aportes` responde `permission denied`, no "0 filas en silencio".** En `partners`
   un DELETE sin policy devuelve 0 filas sin error (ver arriba), lo que obliga a que el
   caller no confíe en `error === null`. Acá no hay GRANT para `anon`, así que el rechazo
   es explícito. Es el recorte de permisos que pedía 10.1.g, aplicado desde el principio
   en la tabla que más importa.
2. **Preguntar por el acceso de otra persona falla con 42501.** El diseño original
   (§10.2) tenía una sola `tiene_acceso(uuid)` con `SECURITY DEFINER`, y eso habría
   dejado que cualquier usuario logueado averiguara si otro paga la cuota. Se partió en
   `tiene_acceso()` (usuarios y policies) y `tiene_acceso(uuid)` (solo `service_role`,
   para las Edge Functions del club).

**Detalle al sembrar:** el trigger `handle_new_user` copia `NEW.created_at` y
`raw_user_meta_data->>'name'` a columnas NOT NULL de `public.users`. Un INSERT en
`auth.users` sin esos dos campos falla. En Supabase real siempre los pone GoTrue; a mano
hay que pasarlos (ver la cabecera de `aportes-check.sql`).


## Qué confirmó `triggers-aportes-check.sql` (2026-08-30)

| Comprobación | Resultado |
|---|---|
| T1 — alta de membresía con cobro → genera el aporte sola | ✅ 1 |
| T2 — update de la membresía **sin** pago nuevo (cambio de mail) → no genera nada | ✅ 1 |
| T3 — **reintento del webhook con el mismo `payment_id`** → no duplica | ✅ 1 |
| T4 — cobro nuevo → período encadenado, sin hueco ni solape | ✅ 30/09 arranca justo tras el 29/09 |
| T5 — donación de $15.000 con cuota $5.000 → 3 meses | ✅ |
| T6 — donación de $3.000 (bajo el piso) → **no** otorga acceso | ✅ 0 |
| T7 — donación ya aprobada que se vuelve a editar → no duplica | ✅ 1 |
| T8 — antigüedad con un corte de un año y un doble pago solapado | ✅ ver abajo |

**T8 en detalle**, porque es el caso que motivó la decisión D4. Un socio con 12 meses en
2024, un año sin pagar, y 7 meses hasta hoy — más un pago duplicado que solapa con el
período vigente:

```
socio_desde | dias_aportados | meses_aportados | racha_dias | racha_meses | cortes
2024-01-01  |            577 |              19 |        211 |           7 |      1
```

El doble pago **no cuenta dos veces** (577 días, no 668): `range_agg` une los rangos
solapados. Si esto se sumara a mano, un socio que pagó dos veces el mismo mes figuraría
con el doble de antigüedad.

## El traspaso backfill → triggers

El punto más frágil de la puesta en producción, y está verificado: el backfill copia
`memberships.last_payment_id` a `aportes.payment_id`. Cuando el webhook vuelve a informar
ese mismo cobro —cosa que va a pasar—, el trigger lo reconoce como ya registrado y no
otorga un período extra. Sin esa copia, todo socio activo recibía un mes de regalo el día
del despliegue.
