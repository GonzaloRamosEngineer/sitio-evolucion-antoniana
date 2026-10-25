# Línea base de rutas — Etapa 1

**Fecha:** 2026-10-24
**Estado:** completa
**Propósito:** registrar el comportamiento previo a cualquier renombrado

## 1. Artefactos ejecutables

- `tools/route-audit-lib.mjs`: inventario clasificado y utilidades de auditoría.
- `tools/audit-routes.mjs`: comando reproducible de verificación.
- `src/lib/rutas-linea-base.test.js`: defensa permanente dentro de Vitest.
- `npm run audit:routes`: auditoría manual o de CI.

La línea base contiene los 38 patrones declarados actualmente en `src/App.jsx`. Para cada
uno registra superficie, acceso, política SEO pretendida y tipo de preview social. La
primera ejecución verificó 126 destinos internos estáticos.

El auditor también cruza los destinos internos estáticos encontrados en `to="..."`,
`navigate("...")` y objetos `href: "..."` contra las rutas reales. El catch-all `*` se
excluye deliberadamente: de lo contrario cualquier typo parecería una ruta válida.

### Límite conocido

Los destinos construidos con template strings o variables no pueden validarse solamente
con análisis estático por regex. Deben quedar cubiertos por la prueba específica del módulo
que produce la URL. La Etapa 3 reemplazará gradualmente esas construcciones por builders.

## 2. Matriz de acceso actual

| Área | Ruta | Acceso frontend | Autoridad real |
|---|---|---|---|
| Cuenta personal | `/dashboard` | Sesión | RLS por usuario |
| Carnet | `/carnet` | Sesión | RPC/RLS de membresía y acceso |
| Comunidad | `/club` | Lectura pública; canje con sesión | Edge Functions + RLS |
| Comercio | `/comercio` | Sesión | Pertenencia en `club_comercio_usuarios` + Edge Functions |
| Educación | `/admin/education` | `admin` o `educacion_manager` | RLS correspondiente |
| Comisión | `/comision` | `admin`, `comision_directiva` o `documentacion_lectura` | RLS + `is_board_member()` según módulo |
| Administración general | `/admin/*` | `admin` | RLS y funciones autoritativas |

`ProtectedRoute` es una barrera de experiencia, no de seguridad. Una migración de rutas no
debe modificar policies ni asumir que ocultar una pantalla protege los datos.

## 3. Destino posterior al login

| Rol | Destino actual |
|---|---|
| `admin` | `/admin` |
| `comision_directiva` | `/comision` |
| `documentacion_lectura` | `/comision?tab=documents` |
| `educacion_manager` | `/admin/education` |
| usuario general | `/dashboard` |

Si el usuario llegó desde una ruta protegida, `location.state.from.pathname` tiene
precedencia. Antes de migrar auth se debe comprobar además si corresponde preservar query
string y hash, hoy no incluidos en `from`.

## 4. Callbacks y URLs externas que bloquean un renombrado directo

| Flujo | Fuente actual | Destino actual | Riesgo |
|---|---|---|---|
| Recuperación solicitada desde la web | `src/hooks/useAuth.jsx` | `<origin>/update-password` | Medio |
| Allowlist local de Supabase | `supabase/config.toml` | dominios www/apex + `/update-password` | Alto |
| Alta por administrador | `supabase/functions/create-user` | dominio www + `/update-password` | Alto |
| Reenvío de verificación | `supabase/functions/resend-verification` | dominio www + `/update-password` | Alto |
| Invitación a operador de comercio | `club-invitar-operador` | `<Origin o SITE_URL>/comercio` | Alto |
| Confirmación de asistencia | `send-activity-confirmation` | `<SITE_URL>/confirm-attendance?token=…` | Alto |

Antes de cambiar esas rutas deben actualizarse en un despliegue coordinado:

1. la ruta nueva ya debe responder;
2. la ruta anterior debe seguir aceptando el token;
3. la allowlist del proveedor debe admitir ambas;
4. las funciones emisoras empiezan a generar la nueva;
5. se verifica un enlace real de cada flujo;
6. recién después se evalúa retirar la anterior.

### Pendientes de inventario externo

- configuración remota de Auth en el dashboard de Supabase;
- variables `SITE_URL` desplegadas en funciones;
- URLs registradas en MercadoPago y en el servicio de webhook externo;
- enlaces en campañas, emails, PDFs, QR y perfiles sociales;
- reglas de dominio www/apex en Vercel.

Que un valor no aparezca en el repositorio no prueba que no exista: estos puntos requieren
verificación en el servicio correspondiente antes de la Etapa 4.

## 5. Línea base SEO detectada

### Cubierto actualmente

- canonicals en varias páginas institucionales y legales;
- `noindex` explícito en autenticación y varios portales privados;
- previews diferenciados para páginas públicas y detalles;
- pruebas que cruzan `App.jsx`, `api/share/pagina.js` y `vercel.json`.

### Gaps que pasan a la Etapa 2

- `robots.txt` y `sitemap.xml` caen al HTML de la SPA en producción;
- detalle de actividad sin canonical;
- detalle de alianza sin canonical;
- listado y detalle de beneficios sin canonical;
- rutas heredadas por ID/UUID que pueden renderizar contenido duplicado;
- páginas públicas adicionales sin canonical uniforme;
- algunos portales dependen de la ausencia de indexación por inaccesibilidad, en vez de
  declarar siempre `noindex`.

Esta etapa registra esos gaps y no los corrige todavía.

## 6. Checklist de smoke test previo a una migración

### Público

- [ ] Home, Nosotros, Actividades, Colaborar, Transparencia y Contacto cargan.
- [ ] Listados y detalles funcionan por acceso directo, no sólo navegando desde el listado.
- [ ] Los formularios públicos envían y muestran su estado final.
- [ ] Los links de header, footer y navegación mobile no terminan en 404.
- [ ] Un recurso inexistente muestra el 404 y no una pantalla vacía.

### Autenticación

- [ ] Registro.
- [ ] Inicio de sesión por cada rol.
- [ ] Retorno a una página protegida.
- [ ] Solicitud y consumo de recuperación de contraseña.
- [ ] Sesión vencida.

### Portales

- [ ] Usuario general: dashboard y carnet.
- [ ] Miembro habilitado: generar canje.
- [ ] Operador de comercio: ingresar y validar canje.
- [ ] Educación: acceso permitido y denegado.
- [ ] Comisión: proyectos y documentos según rol.
- [ ] Admin: panel y edición de actividades.

### SEO y sharing

- [ ] Canonical y robots esperados.
- [ ] Preview de página estática.
- [ ] Preview de actividad, novedad, alianza y beneficio.
- [ ] `og:url` apunta a la URL humana.
- [ ] `robots.txt` y `sitemap.xml` tienen contenido y MIME válidos.

## 7. Gate de Etapa 1

Para cerrar la etapa:

- [x] inventario ejecutable de rutas;
- [x] prueba contra altas, bajas y duplicados en `App.jsx`;
- [x] prueba de destinos internos estáticos;
- [x] matriz de acceso y aterrizaje por rol;
- [x] inventario local de callbacks;
- [x] checklist reproducible;
- [x] `npm run audit:routes` correcto — 38 rutas y 126 destinos verificados;
- [x] `npm test` correcto — 55 archivos y 646 pruebas;
- [x] `npm run lint` sin errores — conserva 37 warnings del backlog existente;
- [x] `npm run build` correcto.

La Etapa 1 queda cerrada. La próxima unidad habilitada es la Etapa 2, que corrige higiene
SEO sin renombrar ninguna ruta.
