# Migración de rutas públicas estáticas — Etapa 4

**Fecha:** 2026-10-25
**Estado:** completa, publicada y verificada
**Alcance:** rutas públicas estáticas, navegación, canonical, sitemap y Open Graph

## Objetivo

Habilitar URLs públicas en español sin perder enlaces guardados, documentos, códigos QR ni
previews ya compartidas. Esta etapa no modifica autenticación, áreas privadas, slugs, base de
datos ni permisos.

## Mapa aplicado

| Anterior | Canónica |
|---|---|
| `/about` | `/nosotros` |
| `/activities` | `/actividades` |
| `/collaborate` | `/colaborar` |
| `/rendicion` | `/transparencia` |
| `/contact` | `/contacto` |
| `/legal-documents` | `/transparencia/documentacion` |
| `/privacy` | `/privacidad` |
| `/terms` | `/terminos` |
| `/partners` | `/alianzas` |
| `/postular-partner` | `/alianzas/postularse` |
| `/preinscripcion` | `/educacion/preinscripcion` |

## Estrategia de compatibilidad

- `src/config/rutas.js` declara 38 rutas funcionales y 11 aliases estáticos.
- `vercel.json` responde un redirect permanente 308 desde cada alias.
- La SPA conserva redirects equivalentes para desarrollo local y navegación client-side.
- Los redirects locales preservan query string y hash.
- Ningún destino de redirect es a su vez un alias; no existen cadenas.
- Los aliases no tienen canonical ni preview propios: redirigen a la única URL indexable.

## Capas migradas

- router y builders;
- header, footer, navegación mobile y CTAs;
- tarjetas configuradas mediante objetos;
- enlaces absolutos y aperturas en nueva pestaña;
- condiciones visuales dependientes de `pathname`;
- canonical de páginas públicas;
- sitemap estático;
- previews OG estáticas y rewrites para bots;
- generador de tarjetas OG;
- pruebas de componentes y auditoría transversal.

## Fuera de alcance deliberadamente

Las siguientes rutas conservan su forma actual:

- `/activities/:id` y `/partners/:slug`: migran con slugs y aliases en la Etapa 5;
- `/login`, `/register` y callbacks: migran en la Etapa 6;
- `/dashboard`, `/carnet`, `/club` y `/comercio`: migran en la Etapa 6;
- `/admin/*` y `/comision`: continúan como rutas técnicas.

## Gate local

Validado el 2026-10-25:

| Control | Resultado |
|---|---|
| `npm run audit:routes` | 49 patrones clasificados; sin destinos huérfanos |
| `npm test -- --run` | 58 archivos, 661 pruebas correctas |
| `npm run lint` | 0 errores; 37 advertencias preexistentes |
| `npm run build` | Correcto |

Las pruebas verifican además que:

- existen exactamente 11 redirects públicos;
- todos son permanentes y coinciden con el registro central;
- no forman cadenas ni comparten destino;
- las rutas anteriores no conservan rewrites OG;
- sitemap, canonical y OG utilizan las canónicas nuevas;
- las rutas dinámicas permanecen sin cambios.

## Verificación en producción

Publicación funcional: commit `1350205c`, deploy de Vercel completado correctamente el
2026-10-25.

- [x] deploy de Vercel correcto;
- [x] las 11 URLs anteriores responden 308 sin cadena;
- [x] las 11 URLs canónicas responden 200;
- [x] query string preservada en el redirect;
- [x] navegación interna usa las canónicas;
- [x] sitemap contiene las canónicas y excluye los aliases;
- [x] OG y canonical usan la URL nueva;
- [x] el alias entrega 308 también a bots de preview;
- [x] `/activities/:id` y `/partners/:slug` continúan respondiendo 200.

Vercel informó `Deployment has completed`. La Etapa 5 queda habilitada.
