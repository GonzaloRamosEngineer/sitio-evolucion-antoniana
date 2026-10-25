# Higiene SEO — Etapa 2

**Fecha:** 2026-10-24
**Estado:** completa; pendiente de publicación
**Alcance:** corregir indexación y canonicals sin renombrar rutas

## Cambios

### Robots

`public/robots.txt` pasa a ser un archivo real, servido directamente como texto. Permite el
rastreo general y anuncia el sitemap canónico.

No se usan reglas `Disallow` como sustituto de seguridad ni de `noindex`: bloquear el
rastreo puede impedir que el buscador vea la directiva de no indexación. Las fronteras de
seguridad siguen siendo autenticación, Edge Functions y RLS.

### Sitemap

`/sitemap.xml` se sirve mediante `api/sitemap.js` e incluye:

- páginas institucionales públicas;
- actividades con slug;
- novedades con slug;
- alianzas con slug;
- beneficios activos con slug.

La función usa el dominio de `src/config/entidad.js`, deduplica URLs y no publica una
versión parcial si alguna consulta falla. El resultado se cachea en el edge durante una
hora y admite `GET` y `HEAD`.

No se incluyen auth, portales privados, paneles, rutas de compatibilidad ni el mostrador
personal `/club`.

### Canonicals

Se completan los faltantes en:

- listado de beneficios;
- detalle de beneficio;
- detalle de alianza;
- detalle de actividad;
- postulación institucional;
- postulación de comercios.

Los canonicals se construyen contra `entidad.sitio`, nunca contra
`window.location.origin`, para que un preview de Vercel no se declare canónico.

### Compatibilidad dinámica

Cuando un recurso se abre mediante ID, UUID o un fallback anterior y ya tiene slug, la SPA
reemplaza la URL por la canónica sin agregar una entrada al historial. Esto se aplica a:

- actividades;
- novedades;
- beneficios;
- alianzas resueltas por fallback de nombre.

Las funciones de preview social ya resuelven ID/UUID a slug y continúan operando igual.
Los redirects HTTP permanentes por historial de slug quedan para la Etapa 5, porque
requieren aliases persistidos en base de datos.

### Noindex

- `/admin/*` queda explícitamente no indexable también en el panel general.
- `/club` queda no indexable: es el mostrador personal de canje, no la vidriera pública.
- Las rutas heredadas por ID/UUID declaran `noindex, follow` mientras resuelven al slug.

## Gate

- [x] `robots.txt` real y cubierto por prueba.
- [x] sitemap dinámico y cubierto por prueba.
- [x] páginas estáticas privadas excluidas del sitemap.
- [x] contenidos dinámicos incluidos por slug.
- [x] canonicals faltantes incorporados.
- [x] aliases dinámicos apuntan al slug canónico desde la SPA.
- [x] gaps de `noindex` corregidos.
- [x] auditoría de rutas correcta — 38 rutas y 126 destinos internos.
- [x] suite completa correcta — 57 archivos y 654 pruebas.
- [x] lint sin errores — conserva 37 warnings del backlog existente.
- [x] build de producción correcto.
- [x] verificación local del build: `/robots.txt` respondió `200`,
  `Content-Type: text/plain` y el contenido esperado.

El gate técnico queda cerrado. La publicación y la comprobación del dominio real son una
acción separada: hasta entonces, producción conserva el comportamiento anterior.
