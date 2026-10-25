# Etapa 6 — Áreas personales, comercios y autenticación

**Inicio:** 2026-10-25

**Estado:** Bloque 6A completo; Bloque 6B1 preparado para publicación; Bloque 6B2 pendiente

## 1. Estrategia de despliegue

La etapa se divide para no mezclar rutas internas con callbacks emitidos por Supabase:

1. **Bloque 6A — namespaces personales y de comercios.** No cambia proveedores, RLS,
   tablas ni Edge Functions.
2. **Bloque 6B1 — destinos de autenticación y acciones con token.** Publica primero las
   rutas canónicas y sus aliases, sin cambiar ningún emisor externo.
3. **Bloque 6B2 — proveedores y emisores.** Amplía la allowlist remota de Supabase y recién
   después cambia y despliega las funciones que generan enlaces.

Las funciones continúan generando temporalmente `/comercio`, `/update-password` y
`/confirm-attendance`. Esos destinos siguen funcionando mediante un único 308; no se cambia
el emisor hasta que la URL nueva esté publicada y admitida por el proveedor.

## 2. Mapa del Bloque 6A

| Ruta anterior | Ruta canónica | Acceso | Tratamiento |
|---|---|---|---|
| `/dashboard` | `/mi/cuenta` | sesión | 308 + fallback SPA |
| `/carnet` | `/mi/carnet` | sesión | 308 + fallback SPA |
| `/club` | `/mi/beneficios` | lectura pública; acción protegida | 308 + fallback SPA |
| `/club/postular` | `/comercios/sumarse` | público | 308 + fallback SPA |
| `/comercio` | `/comercios/panel` | sesión y pertenencia | 308 + fallback SPA |

No cambia la frontera de seguridad:

- `ProtectedRoute` sigue siendo solamente una barrera de interfaz;
- cuenta y carnet dependen de sus RLS/RPC actuales;
- pertenencia al panel se decide en `club_comercio_usuarios` y en las Edge Functions;
- generar o confirmar un canje continúa validándose en servidor.

## 3. Destinos post-login

| Rol técnico | Destino canónico |
|---|---|
| `admin` | `/admin` |
| `comision_directiva` | `/comision` |
| `documentacion_lectura` | `/comision?tab=documents` |
| `educacion_manager` | `/admin/education` |
| usuario general | `/mi/cuenta` |

Si el login proviene de una ruta protegida, ese retorno tiene precedencia. El resolutor ahora:

- conserva `pathname`, query string y hash;
- rechaza destinos absolutos, protocol-relative, backslashes y caracteres de control;
- evita volver a una pantalla de autenticación;
- cae al destino del rol ante cualquier valor inválido.

El operador de comercio no es un valor de `users.role`: su autoridad proviene de la relación
con el comercio. Una invitación sigue aterrizando inicialmente en el alias `/comercio`, que
redirige a `/comercios/panel`; el Bloque 6B actualizará el emisor.

## 4. Mapa del Bloque 6B1

| Ruta anterior | Ruta canónica | Condición preservada |
|---|---|---|
| `/login` | `/ingresar` | retorno post-login interno y validado |
| `/register` | `/registrarse` | acceso anónimo |
| `/request-password-reset` | `/recuperar-acceso` | acceso anónimo |
| `/update-password` | `/actualizar-clave` | query/hash de recuperación |
| `/confirm-attendance` | `/actividades/confirmar-asistencia` | token de asistencia |
| `/agradecimiento` | `/aportes/gracias` | página final no indexable |

Cada ruta anterior queda como alias con un único redirect permanente y fallback client-side.
Las rutas de autenticación anteriores también se bloquean como posibles destinos post-login
para impedir bucles desde marcadores o estados de navegación viejos.

`supabase/config.toml` incorpora los destinos de `/actualizar-clave` para el dominio con y sin
`www`, conservando los anteriores. Este archivo local **no se empuja en 6B1**: la CLI enlazada
no ofrece una lectura o diff remoto previo y `config push` reemplaza la configuración completa.

## 5. Emisores reservados para el Bloque 6B2

| Flujo | Emisor actual | Alias todavía emitido |
|---|---|---|
| Recuperación desde web | `src/hooks/useAuth.jsx` | `/update-password` |
| Alta por administrador | `create-user` | `/update-password` |
| Reenvío de verificación | `resend-verification` | `/update-password` |
| Invitación a comercio | `club-invitar-operador` | `/comercio` |
| Confirmación de asistencia | `send-activity-confirmation` | `/confirm-attendance` |

Orden del Bloque 6B2: verificar y ampliar la allowlist, cambiar emisores, desplegar funciones,
probar enlaces reales y conservar aliases anteriores.

## 6. Gate del Bloque 6A

- [x] cinco rutas canónicas declaradas en el registro central;
- [x] cinco aliases con redirect permanente y fallback client-side;
- [x] navegación interna consume las rutas nuevas mediante `RUTAS`;
- [x] matriz de aterrizaje por rol cubierta por pruebas;
- [x] retorno post-login interno, completo y validado;
- [x] callbacks externos no modificados prematuramente;
- [x] RLS, tablas y Edge Functions sin cambios;
- [x] suite completa: 61 archivos y 685 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y auditoría de 56 rutas correctos;
- [x] deploy de Vercel completado (`75d2347e`);
- [x] cinco rutas nuevas responden y cinco aliases entregan un único 308;
- [x] query string preservada por el redirect de cuenta;
- [x] previews de `/mi/beneficios` y `/comercios/sumarse` usan su canonical nueva;
- [x] sitemap incluye `/comercios/sumarse` y excluye los aliases.

El gate del Bloque 6A queda cerrado. No se modificaron Supabase, RLS ni funciones desplegadas.

## 7. Gate del Bloque 6B1

- [x] seis rutas canónicas declaradas en el registro central;
- [x] seis aliases con redirect permanente y fallback client-side;
- [x] query string y hash preservados por el mecanismo de compatibilidad;
- [x] aliases viejos de auth excluidos como retornos post-login;
- [x] emisores y Edge Functions todavía sin cambios;
- [x] allowlist nueva preparada localmente, sin `config push` remoto;
- [x] suite completa: 61 archivos y 685 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y auditoría de 62 rutas correctos;
- [ ] deploy de Vercel completado;
- [ ] seis rutas nuevas y seis redirects verificados en producción;
- [ ] sitemap y previews verificados.

## 8. Rollback

Revertir los valores canónicos en `src/config/rutas.js` y conservar las rutas nuevas como
aliases temporales. No hay rollback de base de datos porque este bloque no modifica datos,
policies ni esquema.
