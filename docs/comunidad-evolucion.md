# Comunidad Evolución

Documento base de identidad, mensajes y alcance del programa de beneficios de la
Fundación Evolución Antoniana. Sirve como fuente para el sitio, presentaciones,
piezas comerciales y el futuro brochure para comercios.

## Identidad

- **Nombre:** Comunidad Evolución
- **Propuesta:** Beneficios con propósito
- **Descripción corta:** Una red que conecta a quienes sostienen la Fundación con
  comercios comprometidos.
- **Idea central:** cada aporte sostiene una misión y, al mismo tiempo, acerca
  beneficios cotidianos a la comunidad que la hace posible.

No se presenta como un club cerrado ni como una devolución económica por donar.
Se presenta como una comunidad que genera valor compartido: la Fundación fortalece
su misión, las personas acceden a beneficios y los comercios se vinculan con una red
local con propósito.

## Públicos y propuesta de valor

### Personas que sostienen la Fundación

- Acceden a descuentos y ventajas en comercios aliados.
- Generan un código personal al momento de usar un beneficio.
- Pueden consultar sus canjes y el estado de su acceso.
- Su aporte sigue teniendo como destino principal la misión de la Fundación.

### Comercios aliados

- Llegan a una comunidad local comprometida.
- Obtienen difusión dentro del sitio y las comunicaciones de la Fundación.
- Validan códigos desde un teléfono, sin instalar un sistema propio.
- Acceden a métricas de canjes, personas alcanzadas y consumo declarado cuando el
  comercio carga el monto de la operación.

### Fundación Evolución Antoniana

- Fortalece la continuidad de los aportes.
- Construye vínculos medibles con comercios de Salta.
- Ofrece valor a su comunidad sin desdibujar su propósito social.
- Registra cada canje y puede rendir resultados a las partes involucradas.

## Mensajes principales

### Para comunicación general

**Comunidad Evolución. Beneficios con propósito.**

Una red de comercios aliados y personas que sostienen la misión de la Fundación
Evolución Antoniana.

### Para convocar comercios

**Sumá tu comercio a una red que transforma.**

Ofrecé un beneficio, acercate a una comunidad comprometida y conocé con datos
claros cuántas personas llegaron a tu comercio a través de la red.

### Para personas aportantes

**Tu aporte sostiene una misión y te conecta con beneficios para todos los días.**

## Vocabulario

| Evitar | Usar |
|---|---|
| Club de beneficios | Comunidad Evolución |
| El club | La comunidad / la red |
| Socios | Padrinos, personas aportantes o quienes sostienen la Fundación |
| Beneficios para socios | Beneficios para personas con aporte vigente |
| Sumá tu comercio al club | Sumá tu comercio a nuestra red |
| El club te trajo clientes | La red acercó personas a tu comercio |

“Club Atlético Antoniano” y “Vínculo con el Club” pertenecen al contexto deportivo
y educativo de la institución. No forman parte de este cambio de marca.

## Mapa funcional y técnico

El cambio de identidad es público y editorial. Los nombres técnicos se conservan
para evitar migraciones y enlaces rotos.

| Función | Ubicación pública | Nombre técnico que se conserva |
|---|---|---|
| Catálogo público | `/beneficios` | `BenefitsPage`, tabla `club_beneficios` |
| Canje y canjes propios | `/club` | `ClubPage`, funciones `club-*` |
| Postulación de comercios | `/club/postular` | `club_postulaciones` |
| Mostrador del comercio | `/comercio` | `ComercioPanel`, `club_comercio_usuarios` |
| Administración | `/admin`, sección Comunidad Evolución | `ClubAdmin`, APIs `clubApi` y `clubAdminApi` |

También se mantienen los nombres de carpetas, claves de caché, tablas, políticas,
migraciones y Edge Functions. Son implementación interna, no marca visible.

## Estructura sugerida para el brochure comercial

1. Portada: Comunidad Evolución — Beneficios con propósito.
2. Qué es: una explicación breve de la red y su vínculo con la Fundación.
3. Por qué sumarse: comunidad, difusión, impacto local y métricas.
4. Cómo funciona: propuesta, acuerdo del beneficio, publicación y validación.
5. Qué recibe el comercio: presencia de marca, nuevos vínculos y reporte.
6. Qué se espera del comercio: un beneficio claro, cumplible y bien comunicado.
7. Ejemplos de beneficios: descuento, 2x1, precio especial o regalo.
8. Cierre y contacto: formulario de postulación y canales institucionales.

## Activos de comunicación

- Tarjeta social del catálogo: `public/img/og/beneficios-1200x630.png`.
- Tarjeta social de la comunidad: `public/img/og/club-1200x630.png`.
- Tarjeta social para comercios: `public/img/og/club-postular-1200x630.png`.
- Metadatos compartibles: `api/share/pagina.js`.
- Generador de tarjetas: `tools/generate-og-images.mjs`.
- Identidad central del programa: `src/config/entidad.js`.
