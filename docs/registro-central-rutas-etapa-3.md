# Registro central de rutas — Etapa 3

**Fecha:** 2026-10-24
**Estado:** en ejecución
**Restricción:** no cambia ninguna URL pública

## Objetivo

Evitar que router, navegación, autenticación, sitemap y previews sociales mantengan copias
independientes de las mismas URLs.

## Fuente única

`src/config/rutas.js` contiene:

- `ROUTE_PATHS`: los 38 patrones actuales;
- `ROUTE_MANIFEST`: clasificación de superficie, acceso, SEO y preview;
- `RUTAS`: builders para navegación y detalles dinámicos;
- `withQuery`: construcción consistente de query strings.

El archivo no importa React ni APIs del navegador. Por eso puede consumirse desde:

- la SPA;
- funciones serverless;
- scripts de herramientas;
- Vitest y auditorías de Node.

## Primer incremento migrado

- `src/App.jsx`;
- header;
- footer;
- navegación inferior mobile;
- `ProtectedRoute`;
- aterrizaje por rol y links de `LoginPage`;
- páginas estáticas del sitemap;
- claves de `api/share/pagina.js`;
- auditoría de rutas;
- generador de `llms.txt`.

Este incremento centraliza la definición y los consumidores transversales de mayor riesgo.
Los links propios de cada página quedan deliberadamente para el siguiente bloque: así el
cambio puede revisarse en lotes pequeños sin mezclar navegación global y decenas de CTAs.

## Garantías

- Cambiar un patrón en el manifiesto cambia el router que lo registra.
- Los builders escapan parámetros dinámicos.
- Un parámetro ausente falla de forma explícita.
- El catch-all no vuelve válidos enlaces inexistentes.
- Las pruebas de OG y Vercel siguen cruzando todas las rutas públicas.

## Pendiente para cerrar la etapa

- [x] crear manifiesto y builders;
- [x] migrar `App.jsx`;
- [x] migrar shell de navegación;
- [x] migrar guards y aterrizajes por rol;
- [x] conectar sitemap y previews estáticas;
- [x] adaptar herramientas y pruebas que leían literales de `App.jsx`;
- [ ] migrar CTAs y links internos de páginas de mayor tráfico;
- [ ] medir literales internos restantes y clasificarlos;
- [x] auditoría de rutas correcta: 38 rutas y 90 destinos estáticos verificados;
- [x] suite completa correcta: 58 archivos y 659 pruebas;
- [x] lint sin errores (37 advertencias preexistentes);
- [x] build de producción correcto.

La migración de links internos se hará por grupos funcionales. Los callbacks externos
registrados en la Etapa 1 no se cambian todavía: sus rutas siguen teniendo exactamente los
mismos valores.

## Gate del primer incremento

Validado localmente el 2026-10-24:

| Control | Resultado |
|---|---|
| `npm run audit:routes` | Correcto; sin destinos estáticos huérfanos |
| `npm test -- --run` | 58 archivos, 659 pruebas correctas |
| `npm run lint` | 0 errores; 37 advertencias preexistentes |
| `npm run build` | Correcto |

Este gate valida el núcleo, pero no cierra la Etapa 3. Para cerrarla se deben migrar los CTAs
por dominio funcional, medir los literales restantes y repetir estos cuatro controles.
