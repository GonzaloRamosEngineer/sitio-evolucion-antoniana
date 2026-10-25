# Etapa 5 — Slugs públicos y aliases dinámicos

**Fecha de preparación:** 2026-10-25

**Estado:** completa, publicada y verificada

**Migración:** `supabase/migrations/20261025120000_slugs_publicos_y_aliases.sql`

## 1. Objetivo y alcance

Esta etapa lleva los detalles públicos a un contrato transversal sin perder URLs ya
compartidas:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Incluye `activities`, `news`, `partners` y `club_beneficios`. La tabla `benefits` no se
incluye porque dejó de ser la fuente de la vidriera y está vacía; incorporarla crearía un
segundo espacio de nombres para `/beneficios/:slug`.

Las rutas canónicas pasan a ser:

- `/actividades/:slug`;
- `/alianzas/:slug`;
- `/novedades/:slug`;
- `/beneficios/:slug`.

`/activities/:id`, `/partners/:slug` y las rutas heredadas por UUID continúan como
compatibilidad y terminan en la URL canónica.

## 2. Foto previa reproducible

Comando read-only:

```bash
npm run audit:slugs
```

Resultado del 2026-10-25:

| Recurso | Filas | Faltantes | Fuera del contrato | Cambios | Colisiones |
|---|---:|---:|---:|---:|---:|
| Actividades | 12 | 0 | 0 | 0 | 0 |
| Novedades | 3 | 0 | 0 | 0 | 0 |
| Alianzas | 9 | 0 | 2 | 2 | 0 |
| Beneficios | 1 | 0 | 0 | 0 | 0 |

Los únicos cambios previstos son determinísticos:

1. `ministerio-de-educación,-cultura,-ciencia-y-tecnología-–-gobierno-de-la-provincia-de-salta`
   → `ministerio-de-educacion-cultura-ciencia-y-tecnologia-gobierno-de-la-provincia-de-salta`;
2. `facultad-de-ciencias-económicas---universidad-de-buenos-aires-(uba)`
   → `facultad-de-ciencias-economicas-universidad-de-buenos-aires-uba`.

No se decide ningún nombre editorial a mano y no hay colisiones.

## 3. Decisiones cerradas

- PostgreSQL es la autoridad del slug persistido.
- Se usa `public.normalize_public_slug(text)` para los cuatro recursos.
- Las colisiones nuevas reciben sufijos determinísticos `-2`, `-3`, etc.
- Un cambio de título o nombre no altera una URL ya publicada.
- Un cambio deliberado de slug guarda el valor anterior.
- El historial vive en una tabla compartida, `public.public_slug_aliases`, con clave
  `(resource_type, previous_slug)`.
- `public.resolve_public_slug(type, lookup)` acepta UUID, slug canónico o alias.
- El resolutor es `SECURITY INVOKER`: las RLS del contenido siguen decidiendo qué puede ver
  cada rol.
- Un beneficio en borrador puede conservar `slug = NULL`, como permitía el modelo previo.

## 4. Orden de despliegue sin ventana de rotura

1. Publicar el código con fallback temporal al lookup directo.
2. Verificar nuevas y antiguas rutas contra la base todavía sin migrar.
3. Repetir `npm run audit:slugs`.
4. Aplicar únicamente la migración versionada, en una transacción:

   ```bash
   bash tools/db.sh apply supabase/migrations/20261025120000_slugs_publicos_y_aliases.sql
   ```

5. Verificar contrato, aliases, RLS, redirects, canonical, OG y sitemap.

El fallback solo se usa si PostgREST informa `PGRST202` (RPC inexistente). Otros errores no
se ocultan.

## 5. Validaciones realizadas antes de publicar

- auditoría real read-only: sin faltantes ni colisiones;
- migración completa ejecutada contra el esquema real dentro de `BEGIN … ROLLBACK`;
- prueba transaccional de normalización, archivo del slug anterior y resolución por alias;
- suite completa: 60 archivos y 669 pruebas aprobadas;
- lint: 0 errores (advertencias preexistentes);
- build de producción aprobado;
- auditoría de rutas: 51 patrones clasificados, sin destinos huérfanos.

## 6. Gate de producción

- [x] deploy de código completado (`9fd92624`);
- [x] nuevas URLs dinámicas respondieron antes del cambio de datos;
- [x] precheck repetido inmediatamente antes de migrar;
- [x] respaldo previo generado fuera del repositorio;
- [x] migración aplicada en una sola transacción;
- [x] todos los slugs canónicos cumplen el contrato;
- [x] los dos slugs anteriores resuelven al UUID original;
- [x] anon no resuelve aliases de alianzas pendientes;
- [x] `/activities/:id` y `/partners/:slug` entregan un único 308;
- [x] canonical, OG y sitemap publican solo `/actividades/:slug` y `/alianzas/:slug`;
- [x] un navegador real reemplaza el alias por la URL canónica;
- [x] no hay dos URLs indexables para el mismo contenido.

La aplicación en producción modificó exactamente dos filas de `partners` y creó exactamente
dos aliases. El postcheck volvió a informar 12 actividades, 3 novedades, 9 alianzas y 1
beneficio, todos dentro del contrato, sin faltantes ni colisiones.

## 7. Rollback

El rollback preferido es corregir hacia adelante: la tabla de aliases permite cambiar el slug
canónico otra vez sin perder ninguno de los anteriores. Si fuera necesario revertir el código,
primero se mantiene el resolutor compatible o se restauran los dos slugs desde
`public.public_slug_aliases`; nunca se borra la tabla de historial. La aplicación de la
migración es atómica, por lo que un error durante el apply revierte esquema y datos juntos.
