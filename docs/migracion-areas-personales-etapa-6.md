# Etapa 6 — Áreas personales, comercios y autenticación

**Inicio:** 2026-10-25

**Estado:** Completa, publicada y verificada; canaries operativos en observación

## 1. Estrategia de despliegue

La etapa se divide para no mezclar rutas internas con callbacks emitidos por Supabase:

1. **Bloque 6A — namespaces personales y de comercios.** No cambia proveedores, RLS,
   tablas ni Edge Functions.
2. **Bloque 6B1 — destinos de autenticación y acciones con token.** Publica primero las
   rutas canónicas y sus aliases, sin cambiar ningún emisor externo.
3. **Bloque 6B2A — allowlist remota.** Respalda la configuración efectiva y amplía únicamente
   los destinos admitidos, conservando los anteriores.
4. **Bloque 6B2B — emisores.** Cambia primero el emisor web, valida una recuperación real y
   recién después despliega las funciones que generan enlaces.

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

## 5. Emisores reservados para el Bloque 6B2B

| Flujo | Emisor actual | Alias todavía emitido |
|---|---|---|
| Recuperación desde web | `src/hooks/useAuth.jsx` | `/update-password` |
| Alta por administrador | `create-user` | `/update-password` |
| Reenvío de verificación | `resend-verification` | `/update-password` |
| Invitación a comercio | `club-invitar-operador` | `/comercio` |
| Confirmación de asistencia | `send-activity-confirmation` | `/confirm-attendance` |

Orden del Bloque 6B2B: cambiar el emisor web, probar una recuperación real, actualizar las
funciones una por una, desplegarlas, comprobar sus enlaces y conservar aliases anteriores.

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
- [x] suite completa: 61 archivos y 686 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y auditoría de 62 rutas correctos;
- [x] preview dinámico de actividades excluye explícitamente la acción personal con token;
- [x] deploy de Vercel completado (`c33eda31`, corrección de preview `0959beef`);
- [x] seis rutas nuevas responden 200 y seis aliases entregan un único 308 en producción;
- [x] parámetros `code` y `token` preservados por los redirects;
- [x] sitemap excluye rutas de auth, acciones, finales de flujo y aliases;
- [x] la acción de asistencia sirve la SPA genérica a bots y las actividades públicas
  conservan su preview dinámica.

Al cerrar el Bloque 6B1 no se había modificado Supabase ni desplegado Edge Functions; esas
acciones quedaron separadas deliberadamente para los subbloques siguientes.

## 8. Gate del Bloque 6B2A

- [x] configuración remota de Auth leída mediante la Management API sin exponer secretos;
- [x] estado previo confirmado: Site URL canónica y dos destinos `/update-password`;
- [x] PATCH limitado a `uri_allow_list`, sin ejecutar `supabase config push`;
- [x] URLs con y sin `www` de `/actualizar-clave` agregadas;
- [x] URLs anteriores de `/update-password` conservadas para compatibilidad;
- [x] lectura posterior confirmó los cuatro destinos de recuperación;
- [x] antes de migrar comercios se agregaron también `/comercio` y `/comercios/panel`,
  con y sin `www`, sin retirar destinos existentes;
- [x] altas, confirmaciones, cambio seguro de email y MFA permanecieron sin cambios;
- [x] al cerrar este gate, frontend y Edge Functions todavía no habían sido modificados.

El gate del Bloque 6B2A queda cerrado. El rollback consiste en volver a enviar únicamente el
valor anterior de `uri_allow_list`; no se modificaron usuarios, sesiones, tablas, RLS ni emails.

## 9. Gate del Bloque 6B2B1 — emisor web

- [x] `sendPasswordResetEmail` usa la ruta central `RUTAS.auth.actualizarClave`;
- [x] prueba automática verifica el `redirectTo` canónico completo;
- [x] suite completa de ese incremento: 61 archivos y 687 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes) y build correcto;
- [x] deploy de Vercel completado (`07f5eb3e`);
- [x] `/recuperar-acceso` responde y el bundle publicado contiene `/actualizar-clave`;
- [x] recuperación real recibida, abierta en `/actualizar-clave` y contraseña actualizada;
- [x] Edge Functions todavía sin cambios.

La prueba real habilita la migración de las funciones. El alias `/update-password` permanece
operativo como rollback inmediato.

## 10. Gate del Bloque 6B2B2 — emisores de servidor

- [x] mapa compartido `supabase/functions/_shared/rutas.ts` creado;
- [x] `create-user` y `resend-verification` apuntan a `/actualizar-clave`;
- [x] `club-invitar-operador` apunta a `/comercios/panel`;
- [x] `send-activity-confirmation` apunta a `/actividades/confirmar-asistencia`;
- [x] `SITE_URL` gobierna los enlaces de recuperación, con fallback productivo actual;
- [x] prueba contractual impide reintroducir literales heredados;
- [x] suite completa: 62 archivos y 689 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y auditoría correctos;
- [x] commit `e381464d` y despliegue individual de las cuatro Edge Functions;
- [x] funciones activas: `create-user` v7, `resend-verification` v6,
  `club-invitar-operador` v2 y `send-activity-confirmation` v17;
- [x] preflight CORS responde 200 en las cuatro funciones;
- [x] POST sin token responde 401 en las cuatro funciones, preservando `verify_jwt`;
- [x] deploy de Vercel asociado completado;
- [ ] validación operativa de emails de alta, reenvío, comercio y asistencia con casos reales.

La verificación operativa pendiente requiere destinatarios y registros reales; no se generan
usuarios, invitaciones ni correos de prueba automáticamente. Los aliases heredados permanecen
activos durante esta observación.

## 11. Cierre de la etapa

La Etapa 6 queda cerrada técnicamente. La recuperación se validó de extremo a extremo y los
restantes emisores comparten el mismo contrato, están activos y preservan su autorización. Sus
próximos usos reales funcionan como canaries operativos no bloqueantes; cualquier enlace
anterior conserva un destino compatible mediante aliases permanentes.

## 12. Rollback de rutas

Revertir los valores canónicos en `src/config/rutas.js` y conservar las rutas nuevas como
aliases temporales. No hay rollback de base de datos porque este bloque no modifica datos,
policies ni esquema.
