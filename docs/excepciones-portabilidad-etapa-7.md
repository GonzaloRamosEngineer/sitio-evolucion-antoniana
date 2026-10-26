# Excepciones de lenguaje y portabilidad — Etapa 7

**Fecha:** 2026-10-25

## Regla general

La identidad visible, los datos de contacto y las rutas públicas salen del contrato de entidad.
Una coincidencia literal sólo se conserva cuando pertenece a contenido editorial, datos operativos
de esta instalación o identificadores técnicos cuya modificación rompería compatibilidad.

## Excepciones deliberadas

### Migraciones históricas

Los nombres de tablas, columnas, políticas, triggers y tipos (`partners`, `partner_id`, `club_*`,
`resource_type = 'partner'`) son contratos técnicos estables. Las migraciones ya aplicadas son
historia inmutable y no se reescriben para cambiar terminología visible.

Los comentarios históricos que describen “Club de beneficios” o “Partners” permanecen asociados
al momento en que se diseñó el esquema. No llegan a la interfaz ni definen la marca actual.

### Datos y semillas de esta instalación

Los archivos de `supabase/data/` son operaciones o fixtures identificados para Evolución
Antoniana: destinos, proyectos, aportes y alianzas reales. No forman parte del paquete portable
por defecto. Una instalación nueva debe reemplazarlos o excluirlos; nunca ejecutarlos como datos
genéricos.

### Contenido editorial persistido

Noticias, actividades y descripciones pueden nombrar a la Fundación porque narran hechos de esta
entidad. También pueden usar “club” cuando se refieren al Centro Juventud Antoniana. Es contenido
tenant, no configuración del producto.

El check `supabase/checks/audit-lenguaje-publico.sql` sí exige cero usos públicos de “Club de
beneficios”, “Partner(s)” y aliases de rutas retiradas. Debe ejecutarse contra la base vinculada
antes de cerrar una migración transversal de lenguaje.

### Brochures y otros artefactos

El relato, las métricas, las fotografías y la selección de programas son decisiones editoriales.
Marca, tipo de entidad, programa, logo, sitio, contacto, ubicación y CTA no son excepciones: los
generadores los reciben de `src/config/entidad.js` y `src/config/rutas.js` mediante el archivo
generado `tools/entity-artifacts.generated.json`.

Los nombres de archivo actuales se mantienen por estabilidad documental. No gobiernan el texto
visible ni las URLs contenidas en los PDFs.
