# Etapa 7 — Consistencia transversal de lenguaje

**Inicio:** 2026-10-25

**Estado:** Bloques 7A–7C3 completos, publicados y verificados

## 1. Objetivo

Hacer que la configuración de la entidad gobierne la marca y el vocabulario visible sin
renombrar identificadores técnicos estables ni convertir contenido editorial en configuración.

La meta no es reemplazar palabras mecánicamente. Es distinguir tres clases:

1. **Marca configurable:** nombre, nombre corto, tipo de entidad, dominio, contacto, redes y
   nombre público de programas. Debe salir de configuración.
2. **Vocabulario configurable:** aportante, padrino, aliado, comercio y términos equivalentes
   que otra institución podría expresar de otra forma.
3. **Identificadores técnicos estables:** tablas `partners` y `club_*`, nombres de funciones,
   variables, componentes y claves de API. No son comunicación pública y no se renombran solo
   por estar en inglés o conservar un nombre histórico.

## 2. Línea base del Bloque 7A

Barrido sobre código ejecutable, excluyendo pruebas y archivos minificados:

| Superficie | Archivos con marca o dominio literal | Tratamiento |
|---|---:|---|
| Frontend, fuera de `src/config/entidad.js` | 31 | migrar títulos, metadatos y copy visible |
| Endpoints Vercel de previews | 6 | darles configuración server-side compartida |
| Edge Functions | 4 | separar remitente, dominio y nombre institucional |
| `index.html` y estáticos públicos | 3 | generar o sincronizar desde configuración |
| Páginas con `Partner(s)` en fuente | 7 | medición inicial amplia; clasificar texto visible frente a identificador técnico |
| Literal público “Club de beneficios” | 0 | mantener en cero |

La auditoría consolidada registra 44 archivos runtime con marca o dominio literal: los 31 del
frontend, 6 endpoints, 4 funciones y 3 estáticos.

La existencia de `src/config/entidad.js` es una buena base, pero hoy no gobierna todas las
superficies. En especial, Vercel API y Deno no deberían importar a ciegas un módulo pensado
para el bundle del navegador: primero se definirá un contrato de datos consumible por los tres
runtimes.

## 3. Hallazgos prioritarios

### 3.1 Marca y SEO

- títulos y descripciones de numerosas páginas todavía escriben la Fundación literalmente;
- `index.html`, previews OG y plantillas estáticas duplican nombre, sitio y textos alternativos;
- los endpoints de detalle repiten `og:site_name` y sufijos de título;
- contacto y algunos remitentes de email contienen dominio y marca directamente.

### 3.2 Lenguaje público

- las rutas públicas ya usan `/alianzas`, pero todavía aparecen “Partners evolutivos”,
  “Partner verificado”, “Postular como Partner” y textos equivalentes;
- los nombres técnicos `PartnerDetailPage`, `partners`, `partner_id` y la tabla `partners` no
  constituyen deuda visible y deben conservarse;
- “Comunidad Evolución” ya está configurada y “Club de beneficios” no aparece en runtime;
- comentarios internos con “socio” no se consideran automáticamente un defecto: primero se
  separan de errores y mensajes efectivamente mostrados a personas.

### 3.3 Documentos y piezas comerciales

Los brochures, PDFs y sus generadores se auditan como una superficie propia. Son contenido
editorial institucional y pueden nombrar a la Fundación deliberadamente, pero sus datos de
contacto, sitio, marca y nombre del programa deben tener una fuente identificable.

## 4. Plan de bloques

### Bloque 7A — inventario y reglas

- [x] inventario por runtime y superficie;
- [x] separación entre texto visible e identificadores técnicos;
- [x] confirmación de cero apariciones runtime de “Club de beneficios”;
- [x] orden de migración definido.

### Bloque 7B — contrato y red de seguridad

- [x] contrato v1 con 23 campos requeridos de identidad, programa, contacto y vocabulario;
- [x] validación inmediata de URL, email, logo y campos obligatorios;
- [x] prueba de configuración incompleta con mensajes accionables;
- [x] línea base explícita de archivos con marca o dominio literal;
- [x] línea base explícita de páginas con `Partner(s)` por clasificar;
- [x] auditoría `npm run audit:language` incorporada;
- [x] prueba que impide nueva deuda fuera de la línea base;
- [x] “Club de beneficios” tratado como error sin excepciones;
- [x] suite completa: 64 archivos y 694 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y auditoría de rutas correctos.
- [x] deploy de Vercel completado (`98a98b1f`);
- [x] portada, sitemap y `/mi/beneficios` responden 200 en producción.

La línea base es decreciente: una migración puede eliminar archivos de las listas sin fallar,
pero cualquier archivo nuevo con deuda institucional rompe la auditoría. Después de cada bloque
se recorta la allowlist para que la deuda eliminada no pueda reaparecer.

### Bloque 7C — frontend público

- migrar marca, contacto, SEO y textos públicos a configuración;
- normalizar “Partner(s)” visible a “alianza”, “organización aliada” o la variante definida;
- conservar nombres de componentes, tablas y APIs para evitar una migración técnica sin valor.

#### Bloque 7C1 — vocabulario público de alianzas y SEO

- [x] portada, listado, detalle, postulación y navegación administrativa expresan “alianzas” u
  “organizaciones aliadas” en el texto visible;
- [x] títulos de página y metadatos del frontend consumen el contrato de entidad;
- [x] previews estáticas y dinámicas de alianzas usan el mismo vocabulario y marca;
- [x] imágenes OG de `/alianzas` y `/alianzas/postularse` regeneradas y revisadas visualmente;
- [x] identificadores técnicos `partners`, `partner_id` y nombres de componentes preservados;
- [x] auditoría refinada para medir frases públicas, sin confundir rutas, archivos ni código;
- [x] deuda de marca o dominio reducida de 44 a 37 archivos;
- [x] términos públicos `Partner(s)` y “Club de beneficios” en cero;
- [x] suite completa: 64 archivos y 696 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y ambas auditorías correctos;
- [x] deploy de Vercel completado (`e3f32e0d`);
- [x] portada, `/alianzas`, `/alianzas/postularse`, preview dinámico y ambas imágenes OG
  responden 200 en producción;
- [x] títulos, descripciones, canonicals y `og:site_name` verificados con User-Agent de
  WhatsApp, sin `Partner(s)` visible.

La cifra inicial de siete páginas con `Partner(s)` se obtuvo con una expresión deliberadamente
amplia y también incluía identificadores o comentarios. Desde 7C1 la auditoría controla frases
que podrían llegar a la interfaz y exige cero coincidencias. Esto permite conservar el dominio
técnico estable sin ocultar deuda de comunicación pública.

La verificación de producción detectó que el rewrite dinámico `/alianzas/:slug` capturaba la
palabra reservada `postularse` antes que su preview estático. El patrón ahora la excluye de forma
explícita y una prueba de regresión protege esa precedencia.

#### Bloque 7C2 — contenido público y contacto

- [x] catorce páginas públicas migradas a `entidad` y `tituloPagina`;
- [x] formularios públicos de colaboración y educación conectados al contacto configurado;
- [x] teléfono, WhatsApp, email y ubicación visibles derivados del contrato de entidad;
- [x] navegación pública renombrada de “Partners” a “Alianzas”;
- [x] fallback visible del modal de colaboración expresado como “organización aliada”;
- [x] auditoría de vocabulario ampliada a componentes públicos;
- [x] deuda de marca o dominio reducida de 37 a 21 archivos;
- [x] frontend público de contenido sin marca ni dominio literales;
- [x] términos públicos `Partner(s)` y “Club de beneficios” en cero;
- [x] suite completa: 64 archivos y 696 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y ambas auditorías correctos;
- [x] deploy de Vercel completado (`a71a77c1`);
- [x] nueve rutas representativas responden 200 en producción;
- [x] títulos configurados verificados en navegador real para Nosotros, Contacto, Privacidad,
  Términos, Novedades, Documentación oficial y Preinscripción;
- [x] teléfono y contenido institucional configurados verificados visualmente.

#### Bloque 7C3 — autenticación, áreas privadas y administración

- [x] nueve pantallas internas migradas a `entidad` y `tituloPagina`;
- [x] login, registro, carnet, panel personal, comisión y administración sin marca literal;
- [x] gestión interna normalizada de “Partners” a “alianzas” en métricas, estados, formularios y
  avisos;
- [x] identificadores técnicos `partners`, `partner_id` y nombres de componentes preservados;
- [x] auditoría ampliada para impedir que el vocabulario interno visible vuelva a divergir;
- [x] deuda de marca o dominio reducida de 21 a 12 archivos;
- [x] frontend completo sin marca ni dominio literales fuera de `src/config/entidad.js`;
- [x] términos visibles `Partner(s)` y “Club de beneficios” en cero;
- [x] suite completa: 64 archivos y 696 pruebas aprobadas;
- [x] lint sin errores (37 advertencias preexistentes), build y ambas auditorías correctos;
- [x] deploy de Vercel completado (`82200b3f`);
- [x] login y registro renderizan los títulos configurados en producción;
- [x] `/mi/carnet` y `/admin` sin sesión conservan la redirección segura a `/ingresar`.

Los 12 archivos restantes pertenecen exclusivamente a los otros runtimes: cinco endpoints de
previews, tres estáticos y cuatro Edge Functions. Con 7C3 se cierra el frontend del Bloque 7C. El
próximo incremento seguro es 7D1, para compartir identidad con los previews de Vercel antes de
modificar estáticos o correo.

### Bloque 7D — servidor y estáticos

- compartir identidad con `api/share/*` y Edge Functions;
- parametrizar remitentes y URLs públicas;
- sincronizar `index.html`, plantillas estáticas y metadatos sin perder previews.

### Bloque 7E — documentos, datos y cierre

- auditar PDFs, generadores, semillas, textos persistidos y eventos;
- documentar excepciones editoriales deliberadas;
- ejecutar el gate transversal y verificar producción.

## 5. Gate de la etapa

La Etapa 7 se cerrará cuando ninguna cadena específica de la Fundación aparezca fuera del
contrato de configuración o de una excepción editorial documentada, y cuando el vocabulario
público sea coherente en web, emails, previews y documentos.
