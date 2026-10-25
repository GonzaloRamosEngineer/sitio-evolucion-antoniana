# Registro central de rutas — Etapa 3

**Fecha:** 2026-10-24
**Última actualización:** 2026-10-25
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

## Segundo incremento migrado

Se centralizó la navegación de toda la superficie pública y de Comunidad Evolución:

- inicio, actividades y detalles de actividad;
- novedades y detalles de novedad;
- beneficios, cards y detalles de beneficio;
- alianzas, perfiles y postulación de aliados;
- vidriera, mostrador, postulación y canje de Comunidad Evolución;
- colaboración, transparencia, documentación legal y páginas legales;
- página de agradecimiento y página no encontrada;
- redirects canónicos, retornos post-login y URLs canónicas de esas superficies.

La auditoría bajó de 90 a 39 destinos internos escritos como literales. Los restantes están
clasificados y concentrados en autenticación, área personal, comisión y administración; no
quedaron literales de navegación en la superficie pública migrada.

## Tercer incremento migrado

Se centralizaron los flujos que dependen de sesión o retorno seguro:

- registro, recuperación y actualización de contraseña;
- confirmación de asistencia y su regreso al panel;
- dashboard y enlaces a actividades registradas;
- carnet, acceso a beneficios y contacto;
- cabecera del área personal.

La auditoría bajó de 39 a 18 destinos internos literales. Los restantes están limitados a
comisión y administración. También se corrigió el control positivo de la auditoría: ya no
exige conservar una cantidad mínima de literales, sino que demuestra con un destino sintético
inválido que la detección de enlaces rotos continúa activa.

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
- [x] migrar CTAs y links internos de páginas públicas y de mayor tráfico;
- [x] medir literales internos restantes y clasificarlos;
- [x] migrar autenticación y acciones con retorno protegido;
- [x] migrar área personal y componentes de dashboard;
- [ ] migrar comisión y administración;
- [x] auditoría de rutas correcta: 38 rutas y 18 destinos estáticos verificados;
- [x] suite completa correcta: 58 archivos y 658 pruebas;
- [x] lint sin errores (37 advertencias preexistentes);
- [x] build de producción correcto.

La migración de links internos se hará por grupos funcionales. Los callbacks externos
registrados en la Etapa 1 no se cambian todavía: sus rutas siguen teniendo exactamente los
mismos valores.

## Gate del primer incremento

Validado localmente nuevamente el 2026-10-25:

| Control | Resultado |
|---|---|
| `npm run audit:routes` | Correcto; sin destinos estáticos huérfanos |
| `npm test -- --run` | 58 archivos, 658 pruebas correctas |
| `npm run lint` | 0 errores; 37 advertencias preexistentes |
| `npm run build` | Correcto |

Este gate valida el núcleo y la superficie pública, pero no cierra la Etapa 3. Para cerrarla
se deben migrar los grupos protegidos ya identificados y repetir estos cuatro controles.
