# Etapa 7 — Consistencia transversal de lenguaje

**Inicio:** 2026-10-25

**Estado:** Bloques 7A y 7B completos; Bloque 7C pendiente

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
| Páginas con `Partner(s)` en fuente | 7 | clasificar texto visible frente a identificador técnico |
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

La línea base es decreciente: una migración puede eliminar archivos de las listas sin fallar,
pero cualquier archivo nuevo con deuda institucional rompe la auditoría. Después de cada bloque
se recorta la allowlist para que la deuda eliminada no pueda reaparecer.

### Bloque 7C — frontend público

- migrar marca, contacto, SEO y textos públicos a configuración;
- normalizar “Partner(s)” visible a “alianza”, “organización aliada” o la variante definida;
- conservar nombres de componentes, tablas y APIs para evitar una migración técnica sin valor.

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
