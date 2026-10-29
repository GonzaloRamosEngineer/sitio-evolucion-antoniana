# «Mi aporte» por WhatsApp — lado de la Fundación

**Estado (2026-10-29):** implementado en la rama `feat/mi-aporte-whatsapp`, probado en un Postgres 15 de Docker,
**sin aplicar la migración ni desplegar la función en producción**. Falta la revisión conjunta.

El bot de la Fundación (MatchBot) puede contestarle a un padrino «¿estoy al día?», «¿hasta cuándo tengo acceso?» o
«¿cuándo fue mi último aporte?» con datos reales de esta base, **sólo por WhatsApp** y **sólo para el número que escribe**. El
lado de MatchBot (alta de la integración, secretos, ajustes de reglas y de contexto) está en el repo de MatchBot:
`docs/MI_APORTE_FUNDACION.md`.

## Qué se agregó

| Pieza | Archivo |
|---|---|
| Función SQL `public.account_status_for_phone(text, uuid[])` | `supabase/migrations/20261029100000_account_status_for_phone.sql` |
| Check en Postgres 15 (60 casos, con sus pares) | `supabase/checks/estado-cuenta-whatsapp-check.sql` |
| Edge Function `estado-de-cuenta` (`verify_jwt = false`) | `supabase/functions/estado-de-cuenta/index.ts` |
| Lógica pura de la función (firma, validación, enlaces) y sus tests | `supabase/functions/_shared/estadoCuenta.ts` · `.test.ts` |
| Destinos `COLABORAR` y `CUENTA` emitidos por las Edge Functions | `supabase/functions/_shared/rutas.ts` |
| Teléfono sólo con dígitos y texto de ayuda en el perfil | `src/components/Dashboard/EditProfileModal.jsx` |

## Cómo decide

El vínculo es **`users.phone`**, que la persona carga al registrarse o edita en su panel. Es texto libre, sin `UNIQUE` y con
formatos mezclados (hoy hay `549…`, `54…` y locales de 10 dígitos): **no es una clave de identidad**, así que la función es estricta:

1. Sólo cuentas con el **email verificado** (`email_verificado`).
2. Ningún usuario coincide → `not_a_client`. **Dos o más → `ambiguous`**: nunca se adivina.
3. Acceso **cortado por la comisión** (suspendido con `suspension_corta_acceso`) → `restricted`: no es una cuota vencida y no se le dice que debe.
4. Un solo usuario → su estado, calculado con las funciones canónicas (`acceso_vigente`, `miembros`, `aportes`, `memberships`).
   La regla de acceso **no se duplica**: la función sólo la lee.

Se comparan las cuatro formas del mismo celular argentino (los 10 dígitos, con `0`, con `54` y con `549`), en las dos direcciones. **No se
reconoce el prefijo `15`.** Nunca se devuelve DNI, email, fecha de nacimiento ni datos de terceros. `EXECUTE` sólo para `service_role`:
abierta a `authenticated` sería un oráculo para preguntar por el estado de cualquier número.

La Edge Function autentica a MatchBot con HMAC (`x-matchbot-timestamp` + `x-matchbot-signature: v1=hex(HMAC-SHA256(secreto,
"<ts>.<cuerpo>"))`, ventana de ±300 s, comparación en tiempo constante, secreto ≥ 32 caracteres; sin secreto responde 503). El enlace de
renovación y el de «Mi cuenta» los arma ella con `rutas.ts` y la identidad de la entidad (`sitioEntidad`): el dominio y las rutas no están
escritos en SQL.

## Despliegue (NO ejecutar sin revisión conjunta)

Orden fijo; cada paso se puede revertir sin perder datos (la función no escribe nada).

1. **Pre chequeo (sólo lectura)** — que existan las piezas de las que depende:
   ```sql
   select count(*) = 4 as ok from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('acceso_vigente', 'email_verificado', 'hoy_local', 'fecha_local');
   ```
2. **Migración** (SQL Editor, como las demás; `lock_timeout` de 5 s, sólo `CREATE OR REPLACE` y permisos):
   `supabase/migrations/20261029100000_account_status_for_phone.sql`. Después, sin datos personales:
   ```sql
   select has_function_privilege('anon', 'public.account_status_for_phone(text,uuid[])', 'EXECUTE')          as anon_no,
          has_function_privilege('authenticated', 'public.account_status_for_phone(text,uuid[])', 'EXECUTE') as auth_no,
          has_function_privilege('service_role', 'public.account_status_for_phone(text,uuid[])', 'EXECUTE')  as service_si,
          public.account_status_for_phone('5493875559999') as desconocido;   -- not_a_client
   ```
   Tiene que dar `false, false, true` y `{"found": false, "reason": "not_a_client"}`.
3. **Secreto** (nunca en el chat ni en el repo): `openssl rand -hex 32` y
   `supabase secrets set ESTADO_CUENTA_SECRET=… --project-ref lbtyxnbyetsvngsxczkt`. El mismo valor va en MatchBot como
   `MATCHBOT_CONNECTOR_FUNDACION_CUENTA_SECRET`.
4. **Función:** `supabase functions deploy estado-de-cuenta` (`verify_jwt = false` ya está en `supabase/config.toml`).
5. **Prueba firmada** con un número que **no existe** (no expone a nadie):
   ```bash
   URL="https://lbtyxnbyetsvngsxczkt.supabase.co/functions/v1/estado-de-cuenta"
   TS=$(date +%s); BODY='{"action":"account_status","phone":"5493875559999"}'
   SIG="v1=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$ESTADO_CUENTA_SECRET" | awk '{print $NF}')"
   curl -s -X POST "$URL" -H 'content-type: application/json' -H "x-matchbot-timestamp: $TS" \
        -H "x-matchbot-signature: $SIG" -d "$BODY"
   # → {"ok":true,"tool":"account.status","status":{"found":false,"reason":"not_a_client"}}
   ```
   Y los negativos: sin cabeceras → `401`; `GET` → `405`; con el secreto mal → `401`.
6. **MatchBot:** alta apagada, `account_test`, ajustes del tenant y recién ahí encender. Ver `docs/MI_APORTE_FUNDACION.md` de MatchBot.

**Reversión:** apagar la integración en MatchBot (`enabled = false`) alcanza para que el bot deje de consultar. Para quitar lo de este lado:
`supabase functions delete estado-de-cuenta`, `drop function public.account_status_for_phone(text, uuid[]);` y borrar el secreto.

## Cómo se verifica

```bash
# Postgres 15 con el esquema real (ver supabase/checks/pg15-bootstrap/README.md) y las migraciones aplicadas:
docker exec -i <contenedor> psql -U postgres -d postgres < supabase/checks/estado-cuenta-whatsapp-check.sql 2>&1 | grep -E 'FALLA|^ERROR'
#   sin salida = todo bien (60 PASA)
npx vitest run supabase/functions/_shared/estadoCuenta.test.ts src/components/Dashboard/EditProfileModal.test.jsx
```

El check trae un par para cada negativo (email sin verificar ↔ verificado, dos cuentas ↔ una, acceso cortado ↔ sin corte, `anon`/`authenticated`
↔ `service_role`) y **se sabotea a propósito** (2026-10-29): sin la exigencia de email verificado, adivinando en la ambigüedad, con `EXECUTE`
para `authenticated`, sin el caso `restricted` y sin la variante `549`, falla cada vez. No corre contra producción: crea usuarios y
donaciones (todo dentro de una transacción con `ROLLBACK`).

## Límites y riesgos conocidos

- **`users.phone` es texto libre.** Quien guarde por error el número de otra persona le mostraría a esa persona su nombre y el estado de
  su aporte. Lo acotan el email verificado y el `ambiguous` (hoy ya hay un teléfono repetido en dos cuentas). La salida de fondo, si
  preocupa, es un «Vincular mi WhatsApp» con código de un solo uso; no está hecho ni es necesario para encender esto.
- **El período de gracia se informa como «al día»** (`overdue:false`, rotulado «en período de gracia»), según la definición de acceso del
  sistema. Es una decisión de texto/producto revisable (ver el documento de MatchBot, §4).
- **Sólo WhatsApp** (Instagram no entrega el teléfono) y **sin prefijo `15`**.
- **La función es pública** (`verify_jwt = false`): la defensa es el HMAC. No tiene límite de pedidos propio.
- **El perfil guarda sólo dígitos** desde ahora; los teléfonos ya guardados con símbolos se reconocen igual (la comparación los limpia).
