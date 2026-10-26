# Arquitectura de rutas y evolución a producto reutilizable

**Estado:** ejecución por etapas; Etapas 0–6 completas y Etapa 7 en curso
**Última actualización:** 2026-10-25
**Alcance de esta versión:** plan maestro y seguimiento transversal de las Etapas 0–9
**No modifica por sí mismo:** rutas, base de datos, permisos ni comportamiento de producción

## Progreso

| Etapa | Estado | Evidencia |
|---|---|---|
| 0. Estándar y mapa | Completa | Este documento |
| 1. Línea base y red de seguridad | Completa | `docs/linea-base-rutas-etapa-1.md` |
| 2. Higiene SEO sin renombrar | Completa, publicada y verificada | `docs/higiene-seo-etapa-2.md` |
| 3. Registro central de rutas | Completa, publicada y verificada | `docs/registro-central-rutas-etapa-3.md` |
| 4. Migración de rutas públicas estáticas | Completa, publicada y verificada | `docs/migracion-rutas-publicas-etapa-4.md` |
| 5. Slugs y aliases dinámicos | Completa, publicada y verificada | `docs/migracion-slugs-etapa-5.md` |
| 6. Áreas personales, comercio y autenticación | Completa, publicada y verificada | `docs/migracion-areas-personales-etapa-6.md` |
| 7. Consistencia transversal de lenguaje | En curso; 7A–7D1 completos y 7D2 preparado | `docs/consistencia-lenguaje-etapa-7.md` |
| 8–9 | Pendientes | Requieren cerrar la Etapa 7 |

La Etapa 3 comenzó centralizando los 38 patrones actuales, sin renombrar URLs. El router,
la navegación global, los guards, el sitemap, las previews estáticas, las herramientas de
auditoría, la navegación pública, la autenticación, el área personal, comisión y administración
ya consumen el registro común. No queda navegación interna literal en páginas o componentes.

## 1. Objetivo

Normalizar las rutas, el lenguaje y la configuración institucional del sistema sin romper
enlaces existentes, accesos guardados, códigos QR, previews sociales, indexación ni flujos
protegidos.

El objetivo de largo plazo es que el sistema pueda utilizarse en otra fundación, asociación,
club, mutual o cámara sin convertir cada instalación en un fork difícil de mantener.

La evolución se hará en este orden:

```text
sitio actual
  → producto coherente
  → producto configurable por entidad
  → segunda implementación piloto
  → decisión informada sobre multi-tenancy
```

No se construirá un SaaS multi-tenant antes de validar una segunda implementación real.

## 2. Decisiones rectoras

1. **Compatibilidad hacia atrás.** Ninguna URL pública existente desaparece. Las rutas
   anteriores quedan como aliases con redirección permanente hacia la URL canónica.
2. **Una sola URL canónica.** Un contenido puede resolverse por slug, UUID o alias, pero
   solo una URL devuelve la versión indexable definitiva.
3. **Español para las rutas humanas.** Se aceptan nombres técnicos universales en espacios
   privados (`/admin`), pero la navegación pública y de usuario se expresa en español.
4. **Lo variable va en datos.** Se conserva la regla de `src/config/entidad.js`: lo que
   cambia entre instituciones es configuración; lo que comparten todas es código.
5. **La marca pública no renombra el dominio técnico.** `club_*` puede seguir siendo un
   nombre interno estable. En UI y comunicación debe mostrarse “Comunidad Evolución” o el
   nombre configurado por la entidad.
6. **Una preocupación por despliegue.** No se mezclan en una misma salida cambios de URLs,
   permisos, esquema, diseño y vocabulario.
7. **Primero seguridad y observabilidad.** Se agregan pruebas, métricas y rollback antes de
   ejecutar una migración visible.
8. **La base decide los slugs persistidos.** El cliente puede anticiparlos, pero la función
   autoritativa y la unicidad viven en PostgreSQL.

## 3. Convención de rutas

### 3.1 Formato

- Minúsculas ASCII, sin tildes ni caracteres especiales.
- Palabras separadas por un único guion.
- Sin barra final.
- Colecciones en plural: `/actividades`, `/alianzas`, `/beneficios`.
- Detalles por slug: `/actividades/:slug`.
- Acciones subordinadas al recurso: `/alianzas/postularse`.
- Área personal bajo `/mi`.
- Operación de comercios bajo `/comercios`.
- Confianza institucional bajo `/transparencia`.
- UUID e ID nunca son URL canónica pública.
- Los query params describen estado de interfaz o filtros; no reemplazan una ruta de
  contenido.

### 3.2 Contrato de slug

Todo slug público debe cumplir:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Reglas:

- transliterar letras acentuadas (`Fundación` → `fundacion`);
- convertir puntuación y espacios en separadores;
- colapsar y recortar guiones;
- resolver colisiones de forma determinística;
- permanecer estable luego de publicado;
- conservar cada valor anterior como alias si se cambia deliberadamente.

## 4. Taxonomía

| Clase | Ejemplos | Indexación | Compatibilidad |
|---|---|---:|---|
| Institucional pública | `/nosotros`, `/transparencia` | Sí | Redirect desde nombre anterior |
| Colección pública | `/actividades`, `/beneficios` | Sí | Redirect desde nombre anterior |
| Detalle público | `/actividades/:slug` | Sí | Alias de slug e ID |
| Acción pública | `/comercios/sumarse` | Generalmente no | Redirect desde formulario anterior |
| Área personal | `/mi/cuenta`, `/mi/carnet` | No | Conserva destino post-login |
| Portal operativo | `/comercios/panel`, `/comision` | No | Protegido por rol/pertenencia |
| Administración | `/admin/*` | No | Prioridad menor |
| Compatibilidad | `/novedades/uuid/:id` | No | Redirige; no renderiza duplicado |

## 5. Mapa canónico propuesto

Este mapa es el contrato de destino. Antes de implementar cada bloque se vuelve a validar
contra enlaces reales, navegación, autenticación y previews.

### 5.1 Institucional y contenido público

| Ruta actual | Ruta canónica | Tratamiento |
|---|---|---|
| `/` | `/` | Sin cambio |
| `/about` | `/nosotros` | 308 |
| `/activities` | `/actividades` | 308 |
| `/activities/:id` | `/actividades/:slug` | Resolver ID/slug y redirigir |
| `/collaborate` | `/colaborar` | 308 |
| `/rendicion` | `/transparencia` | 308 |
| `/legal-documents` | `/transparencia/documentacion` | 308 |
| `/contact` | `/contacto` | 308 |
| `/partners` | `/alianzas` | 308 |
| `/partners/:slug` | `/alianzas/:slug` | 308 conservando slug/alias |
| `/postular-partner` | `/alianzas/postularse` | 308 |
| `/beneficios` | `/beneficios` | Sin cambio |
| `/beneficios/:slug` | `/beneficios/:slug` | Sin cambio; normalizar slug |
| `/novedades` | `/novedades` | Sin cambio |
| `/novedades/:slug` | `/novedades/:slug` | Sin cambio; normalizar slug |
| `/preinscripcion` | `/educacion/preinscripcion` | 308 |
| `/privacy` | `/privacidad` | 308 |
| `/terms` | `/terminos` | 308 |

### 5.2 Comunidad, usuario y comercios

| Ruta actual | Ruta canónica | Motivo |
|---|---|---|
| — | `/comunidad` | Presentación pública de la propuesta; queda reservada |
| `/club` | `/mi/beneficios` | Es el mostrador personal, no la landing de marca |
| `/club/postular` | `/comercios/sumarse` | Convocatoria específica a comercios |
| `/comercio` | `/comercios/panel` | Portal operativo |
| `/dashboard` | `/mi/cuenta` | Namespace personal |
| `/carnet` | `/mi/carnet` | Namespace personal |

### 5.3 Autenticación y acciones

| Ruta actual | Ruta canónica | Tratamiento |
|---|---|---|
| `/login` | `/ingresar` | 308; preservar retorno seguro |
| `/register` | `/registrarse` | 308 |
| `/request-password-reset` | `/recuperar-acceso` | 308; preservar parámetros válidos |
| `/update-password` | `/actualizar-clave` | 308; verificar callback de Supabase |
| `/confirm-attendance` | `/actividades/confirmar-asistencia` | 308; preservar token |
| `/agradecimiento` | `/aportes/gracias` | 308; mantener `noindex` |

### 5.4 Administración y portales privados

Se mantienen en una primera migración:

- `/admin`
- `/admin/*`
- `/comision`

La traducción de subsecciones es opcional y de baja prioridad:

| Ruta actual | Posible destino futuro |
|---|---|
| `/admin/education` | `/admin/educacion` |
| `/admin/activities/new` | `/admin/actividades/nueva` |
| `/admin/activities/edit/:id` | `/admin/actividades/:id/editar` |

Los valores de `?tab=` son claves técnicas privadas. No se migran junto con las rutas
públicas salvo que exista un beneficio concreto para el usuario.

### 5.5 Rutas de compatibilidad por identificador

Estas rutas dejan de ser páginas alternativas y pasan a ser resolutores:

- `/beneficios/id/:id`
- `/novedades/id/:id`
- `/novedades/uuid/:id`

Respuesta esperada:

```text
identificador heredado
  → buscar recurso
  → obtener slug canónico actual
  → redirección permanente
  → página canónica
```

## 6. Fuente única de rutas

La meta es reducir la duplicación actual entre React Router, links, canonicals, Vercel,
previews sociales y pruebas.

Se propone una capa central con dos piezas:

1. Un manifiesto de rutas públicas con metadatos declarativos.
2. Constructores JavaScript para consumo del frontend.

Ejemplo conceptual:

```js
RUTAS.actividades.lista
RUTAS.actividades.detalle(slug)
RUTAS.alianzas.postularse
RUTAS.mi.carnet
```

El manifiesto debería poder declarar como mínimo:

```text
clave
ruta canónica
aliases estáticos
tipo de recurso
indexable
requiere autenticación
preview social
canonical
aparece en sitemap
```

No se pretende generar todo `App.jsx` automáticamente en la primera versión. Primero se
centralizan constantes y validaciones; la automatización de `vercel.json`, sitemap y OG
se evalúa después de estabilizar el contrato.

## 7. Política de compatibilidad

### 7.1 Rutas estáticas

- Redirección permanente en el edge antes de cargar la SPA.
- La navegación interna usa inmediatamente la URL nueva.
- La URL vieja se conserva indefinidamente mientras tenga costo operativo despreciable.
- No se implementa compatibilidad solamente con `<Navigate>`: los bots y clientes sin JS
  también deben recibir una redirección real.

### 7.2 Slugs dinámicos

Crear un registro de aliases o historial equivalente:

```text
resource_type
resource_id
previous_slug
created_at
```

El esquema final puede ser una tabla compartida o tablas por recurso. La decisión se toma
al diseñar la migración, considerando RLS, unicidad y resolución desde las funciones OG.

### 7.3 Retiro de compatibilidad

No se elimina un alias por antigüedad solamente. Para considerar su retiro deben cumplirse
simultáneamente:

- cero uso observado durante un período acordado;
- ningún QR, email o documento vigente lo utiliza;
- no aparece en resultados de búsqueda relevantes;
- existe respaldo del mapa histórico;
- su retiro reduce una complejidad real.

## 8. Plan de ejecución y gates

Cada etapa termina en un gate. No se inicia la siguiente si la anterior no está verificada.

### Etapa 0 — Estándar y mapa

**Objetivo:** documentar decisiones antes de tocar comportamiento.

Entregables:

- este documento;
- mapa actual → canónico;
- convención de nombres y slugs;
- política de compatibilidad;
- definición de etapas y responsables de validación.

**Gate:** aprobación del mapa y ausencia de cambios funcionales.

### Etapa 1 — Línea base y red de seguridad

**Objetivo:** saber con precisión qué funciona antes de migrar.

Acciones:

- prueba automática de todas las rutas declaradas;
- prueba de links internos y CTAs;
- smoke tests por rol;
- inventario de callbacks externos y URLs configuradas en Supabase/MercadoPago;
- línea base de 404 y rutas antiguas utilizadas;
- checklist de previews sociales;
- respaldo lógico antes de cualquier migración de datos.

**Gate:** build, lint y tests correctos; checklist de rutas actuales archivado.

**Rollback:** no aplica; esta etapa no cambia comportamiento.

### Etapa 2 — Higiene SEO sin renombrar

**Objetivo:** corregir defectos actuales sin cambiar URLs públicas.

Acciones:

- publicar `robots.txt` válido;
- publicar `sitemap.xml` válido;
- agregar canonicals faltantes en detalles;
- verificar `noindex` en auth, áreas privadas y aliases;
- comprobar tipos MIME y contenido en producción;
- agregar pruebas que impidan que robots y sitemap caigan al HTML de la SPA.

**Gate:** buscadores reciben archivos válidos y cada contenido indexable declara una sola
URL canónica.

**Rollback:** revertir el despliegue; no hay migración de datos.

### Etapa 3 — Registro central de rutas

**Objetivo:** evitar URLs escritas manualmente en múltiples capas.

Acciones:

- crear constantes y builders;
- migrar navegación y CTAs sin cambiar sus destinos;
- clasificar cada ruta pública/privada/indexable;
- cruzar manifiesto, `App.jsx`, Vercel, OG y tests.

**Gate:** cero regresiones y ninguna ruta pública sin clasificación.

**Rollback:** revertir el refactor; las URLs siguen siendo las actuales.

### Etapa 4 — Migración de rutas públicas estáticas

**Objetivo:** habilitar las URLs en español.

Orden interno:

1. Crear rutas nuevas.
2. Mantener las anteriores funcionando.
3. Agregar redirects de edge.
4. Cambiar navegación interna.
5. Cambiar canonicals y OG.
6. Regenerar sitemap.
7. Desplegar y verificar nueva y vieja URL.

**Gate:** cada ruta vieja redirige una sola vez a una ruta nueva que responde; ninguna
URL interna sigue apuntando a la anterior.

**Rollback:** volver a servir las rutas antiguas como canónicas manteniendo las nuevas
como aliases temporales.

### Etapa 5 — Slugs y aliases dinámicos

**Objetivo:** aplicar un único contrato de slug sin perder enlaces publicados.

Acciones:

- implementar una función SQL común;
- auditar colisiones y mostrar un reporte previo;
- crear historial de aliases;
- normalizar noticias, alianzas y beneficios afectados;
- mantener las rutas de ID/UUID como resolutores;
- enseñar a frontend y funciones OG a resolver aliases;
- ejecutar el backfill dentro de una migración controlada.

**Gate:** todos los slugs canónicos cumplen la regex; cada slug anterior resuelve y
redirige; no existen dos URLs indexables para el mismo contenido.

**Rollback:** restaurar slugs desde el mapa previo y conservar la tabla de aliases.

### Etapa 6 — Áreas personales, comercio y autenticación

**Objetivo:** ordenar namespaces privados sin romper sesiones ni permisos.

Acciones:

- introducir `/mi/*` y `/comercios/*`;
- migrar destinos post-login por rol;
- revisar `returnTo`/redirects para evitar redirecciones abiertas;
- revisar callbacks de recuperación de contraseña;
- actualizar emails y accesos desde carnet/dashboard;
- verificar RLS y Edge Functions sin modificar su frontera de seguridad.

**Gate:** matriz de roles aprobada y flujos críticos completos en preview y producción.

**Rollback:** reactivar los destinos anteriores; ninguna tabla cambia en esta etapa.

### Etapa 7 — Consistencia transversal de lenguaje

**Objetivo:** hacer que el vocabulario configurado gobierne toda la experiencia.

Auditar:

- páginas y componentes;
- paneles internos;
- emails;
- errores y estados vacíos;
- previews sociales;
- PDFs y documentos;
- datos semilla;
- eventos de analítica;
- títulos y descripciones SEO.

**Gate:** ninguna cadena específica de la Fundación permanece fuera de configuración salvo
contenido editorial deliberado y documentado.

### Etapa 8 — Instalación configurable

**Objetivo:** poder levantar una segunda entidad con su propio despliegue y Supabase.

Acciones:

- completar `src/config/entidad.js` y sus consumidores;
- separar marca y contenido de `api/share/*`;
- parametrizar dominio, SEO, contacto, cobros y vocabulario;
- definir módulos habilitables;
- documentar bootstrap, variables, migraciones, storage y funciones;
- agregar validación que falle si una entidad nueva está incompleta;
- probar reconstrucción desde cero en un proyecto aislado.

**Gate:** una instalación nueva se levanta con configuración y datos, sin editar componentes
ni apuntar accidentalmente a la base de Evolución Antoniana.

### Etapa 9 — Segundo piloto y decisión de producto

**Objetivo:** validar portabilidad con una institución real.

Medir:

- cambios de código requeridos;
- configuración faltante;
- diferencias jurídicas y de vocabulario;
- esfuerzo de soporte y actualización;
- necesidad real de compartir usuarios, infraestructura o administración.

Sólo después del piloto se decide entre:

- instalaciones independientes mantenidas desde el mismo código;
- distribución versionada del producto;
- arquitectura multi-tenant.

## 9. Matriz de verificación por despliegue

### Técnica

- `npm run build`
- `npm run lint`
- `npm test`
- `git diff --check`
- prueba directa de URLs nuevas y heredadas
- prueba sin JavaScript cuando corresponda
- verificación de headers, código HTTP y MIME

### Navegación

- header, footer y navegación mobile
- CTAs dentro de páginas
- compartir por WhatsApp
- acceso directo desde una URL guardada
- back/forward del navegador
- página 404 real

### Autenticación y roles

- visitante
- usuario autenticado
- administrador
- comisión directiva
- responsable de educación
- operador de comercio
- sesión vencida
- recuperación de contraseña

### SEO y sharing

- title y description
- canonical
- robots/noindex
- sitemap
- Open Graph
- URL humana en `og:url`
- preview nueva y cacheada

## 10. Observabilidad y criterio de éxito

Registrar, cuando la infraestructura lo permita:

- solicitudes por ruta heredada;
- redirects por alias;
- 404 y recurso no encontrado;
- errores de resolución de slug;
- callback de autenticación fallido;
- rutas canónicas indexadas;
- previews sociales que devuelven error.

La migración se considera exitosa cuando:

- la navegación pública utiliza solamente rutas canónicas;
- los enlaces anteriores continúan funcionando;
- cada recurso tiene una única URL indexable;
- no hay slugs fuera del contrato;
- no hay rutas humanas mezclando idiomas;
- marca, dominio y vocabulario salen de configuración;
- una segunda instalación puede construirse sin modificar lógica compartida.

## 11. Riesgos que no deben subestimarse

1. Los callbacks de Supabase y MercadoPago pueden depender de URLs exactas.
2. WhatsApp y otras redes cachean previews por URL.
3. Un redirect sólo en React no protege SEO ni clientes sin JavaScript.
4. Corregir un slug sin alias rompe enlaces ya compartidos.
5. Traducir rutas privadas puede romper el retorno post-login.
6. Un sitio configurable que conserva dominio, cobro o credenciales de la Fundación es
   más peligroso que un sitio que falla al iniciar.
7. Multi-tenant implica aislamiento de datos, RLS por organización, roles por entidad,
   storage, dominios y operación compartida; no es solamente agregar `organization_id`.

## 12. Registro de decisiones

Las decisiones aplicables a cada etapa se cierran antes de modificar comportamiento. Las que
pertenecen a etapas posteriores permanecen visibles, pero no bloquean la migración estática.

- [x] Confirmar `/transparencia` como destino canónico de la rendición.
- [x] Confirmar `/alianzas` como término público en lugar de `/partners`.
- [ ] Definir contenido y alcance de la futura landing `/comunidad` (Etapa 7).
- [x] Confirmar `/mi/beneficios` como reemplazo operativo de `/club` (Etapa 6).
- [x] Mantener técnicas las rutas administrativas en esta migración.
- [x] Elegir tabla de aliases compartida para los recursos públicos (Etapa 5).
- [ ] Definir fuente de métricas de rutas heredadas y 404.
- [x] Inventariar callbacks externos antes de migrar autenticación (Etapa 1).

## 13. Próximo incremento

La Etapa 5 está publicada y verificada. El gate comprobó que:

1. los 25 contenidos públicos auditados cumplen el contrato de slug;
2. los dos valores anteriores quedaron preservados como aliases;
3. UUID, slug actual y slug histórico convergen en una sola URL canónica;
4. las RLS siguen ocultando los recursos no públicos;
5. redirects, navegador, previews OG y sitemap usan las nuevas rutas dinámicas en español.

La **Etapa 6 — Áreas personales, comercio y autenticación** está en curso. El Bloque 6A
normalizó y verificó `/mi/*` y `/comercios/*` sin modificar callbacks externos. El Bloque 6B1
ya publicó y verificó los destinos en español y sus aliases antes de tocar proveedores. El
Bloque 6B2A amplió solamente la allowlist remota, conservando los destinos anteriores y sin
alterar el resto de Auth. Su evidencia está en `docs/migracion-areas-personales-etapa-6.md`.
La **Etapa 6** quedó completa: el emisor web se validó con una recuperación real, las cuatro
Edge Functions se desplegaron individualmente y mantienen su frontera JWT. Los próximos usos
reales actúan como canaries no bloqueantes y los aliases se conservan como rollback.

La **Etapa 7 — Consistencia transversal de lenguaje** ya completó inventario, contrato v1 y
auditoría ejecutable. El Bloque 7C1 normalizó el vocabulario público de alianzas, alineó su SEO y
previews, redujo la deuda institucional de 44 a 37 archivos y dejó en cero las frases públicas
con `Partner(s)`. El Bloque 7C2 migró las restantes páginas públicas de contenido y contacto al
contrato de entidad, reduciendo la línea base a 21 archivos. El Bloque 7C3 completó autenticación,
áreas privadas y administración, normalizó también el vocabulario interno de alianzas y dejó la
línea base en 12 archivos, todos fuera del frontend. El Bloque 7D1 conectó los cinco endpoints de
previews de Vercel al contrato y redujo la línea base a siete archivos. El Bloque 7D2 agregó una
sincronización verificable para los tres estáticos y dejó solo cuatro Edge Functions pendientes.
Su evidencia está en `docs/consistencia-lenguaje-etapa-7.md`. El siguiente incremento seguro es
7D3: parametrizar las funciones remotas sin alterar su frontera JWT.
