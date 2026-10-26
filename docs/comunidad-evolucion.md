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
- Obtienen presencia dentro del sitio y una presentación institucional de la alianza.
- Validan códigos desde un teléfono, sin instalar un sistema propio.
- Acceden a métricas de canjes, personas alcanzadas y consumo declarado cuando el
  comercio carga el monto de la operación.
- Pueden coordinar activaciones especiales que generen visibilidad, conversación e
  impacto compartido.

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

## Reciprocidad: qué brinda la Fundación

La propuesta debe presentarse como una relación de cooperación y no como un pedido
unilateral de descuentos. La Fundación también aporta activos, acompañamiento y
capacidad de comunicación.

### Base de toda alianza

- Ficha pública del comercio con marca, beneficio, condiciones y contacto.
- Presentación institucional de bienvenida a la red.
- Acompañamiento para lanzar, explicar y ajustar la propuesta.
- Reporte de uso con la información disponible en el sistema.

### Activaciones que pueden coordinarse

- **Comercio aliado del mes:** perfil destacado sobre el comercio, su historia y el
  compromiso que sostiene la alianza.
- **Contenido conjunto:** historias, reels, testimonios o piezas colaborativas.
- **Sorteos con propósito:** una propuesta aportada o construida entre ambas partes,
  con reglas y objetivos claros.
- **Campañas temáticas:** acciones vinculadas con fechas especiales, educación,
  deporte, salud o comunidad.
- **Experiencias y encuentros:** talleres, visitas, demostraciones o actividades que
  acerquen la marca y la misión a las personas.
- **Aportes en especie o conocimiento:** productos, servicios o experiencia
  profesional aplicada a una iniciativa concreta.

Las acciones especiales no se prometen de forma automática. Se acuerdan por escrito
según el objetivo, la disponibilidad editorial, el calendario institucional y la
capacidad de ambas partes. No se prometen cantidades de alcance, seguidores, ventas
ni publicaciones permanentes.

## Principios de comunicación de las alianzas

- Mostrar primero el valor compartido y luego el descuento.
- Contar historias reales, evitando piezas puramente publicitarias.
- Dar claridad sobre vigencia, condiciones, canales y responsabilidades.
- Pedir autorización de uso de marca, imágenes y testimonios.
- Medir para aprender y optimizar, no para inflar resultados.
- Priorizar acciones sostenibles y repetibles por encima de campañas aisladas.

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
4. Qué brinda la Fundación: base de la alianza y activaciones a coordinar.
5. Ideas de activación: aliado del mes, contenidos, sorteos, campañas y encuentros.
6. Cómo funciona: propuesta, acuerdo del beneficio, publicación y validación.
7. Qué se espera del comercio: un beneficio claro, cumplible y bien comunicado.
8. Medición: canjes, personas, consumo declarado y aprendizaje.
9. Cierre y contacto: formulario de postulación y canales institucionales.

## Arquitectura de materiales para alianzas

No conviene que una persona directiva reciba como primer contacto el documento
comercial detallado. La comunicación se organiza en dos niveles:

1. **Propuesta ejecutiva de cooperación institucional:** pieza breve de cuatro
   páginas para dirección, empresas e instituciones. Presenta capacidad instalada,
   frentes de trabajo, necesidad, propuesta de valor mutua y una invitación a
   conversar. Comunidad Evolución aparece como una vía de colaboración, no como la
   totalidad de la propuesta.
2. **Brochure operativo de Comunidad Evolución:** documento de profundidad para la
   segunda conversación. Explica activaciones, funcionamiento, beneficios posibles,
   medición y adhesión de comercios.

La propuesta ejecutiva utiliza una voz deliberadamente franca: la Fundación necesita
recursos, conocimiento y alcance para ampliar y visibilizar su trabajo; a cambio,
ofrece programas en marcha, capacidad digital, presencia territorial, comunicación,
activaciones y rendición verificable.

## Activos de comunicación

- Tarjeta social del catálogo: `public/img/og/beneficios-1200x630.png`.
- Tarjeta social de la comunidad: `public/img/og/club-1200x630.png`.
- Tarjeta social para comercios: `public/img/og/club-postular-1200x630.png`.
- Metadatos compartibles: `api/share/pagina.js`.
- Generador de tarjetas: `tools/generate-og-images.mjs`.
- Identidad central del programa: `src/config/entidad.js`.
