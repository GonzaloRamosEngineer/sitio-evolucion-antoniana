# Etapa 6 — Áreas personales, comercios y autenticación

**Inicio:** 2026-10-25

**Estado:** Bloque 6A preparado; pendiente de publicación y verificación

## 1. Estrategia de despliegue

La etapa se divide para no mezclar rutas internas con callbacks emitidos por Supabase:

1. **Bloque 6A — namespaces personales y de comercios.** No cambia proveedores, RLS,
   tablas ni Edge Functions.
2. **Bloque 6B — autenticación y acciones con token.** Se coordina con la allowlist remota
   de Supabase y con las funciones que emiten enlaces.

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

## 4. Callbacks reservados para el Bloque 6B

| Flujo | Emisor actual | Alias todavía emitido |
|---|---|---|
| Recuperación desde web | `src/hooks/useAuth.jsx` | `/update-password` |
| Alta por administrador | `create-user` | `/update-password` |
| Reenvío de verificación | `resend-verification` | `/update-password` |
| Invitación a comercio | `club-invitar-operador` | `/comercio` |
| Confirmación de asistencia | `send-activity-confirmation` | `/confirm-attendance` |

Orden del Bloque 6B: publicar destinos nuevos, ampliar allowlist, cambiar emisores, desplegar
funciones, probar enlaces reales y conservar aliases anteriores.

## 5. Gate del Bloque 6A

- [x] cinco rutas canónicas declaradas en el registro central;
- [x] cinco aliases con redirect permanente y fallback client-side;
- [x] navegación interna consume las rutas nuevas mediante `RUTAS`;
- [x] matriz de aterrizaje por rol cubierta por pruebas;
- [x] retorno post-login interno, completo y validado;
- [x] callbacks externos no modificados prematuramente;
- [x] RLS, tablas y Edge Functions sin cambios;
- [x] suite completa: 61 archivos y 685 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y auditoría de 56 rutas correctos;
- [ ] deploy de Vercel completado;
- [ ] rutas nuevas y anteriores verificadas en producción.

## 6. Rollback

Revertir los valores canónicos en `src/config/rutas.js` y conservar las rutas nuevas como
aliases temporales. No hay rollback de base de datos porque este bloque no modifica datos,
policies ni esquema.
