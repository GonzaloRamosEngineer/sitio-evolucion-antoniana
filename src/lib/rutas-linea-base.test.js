import { describe, expect, it } from 'vitest';
import {
  auditRoutes,
  CURRENT_ROUTE_BASELINE,
  findBrokenStaticTargets,
  routePatternMatches,
} from '../../tools/route-audit-lib.mjs';

describe('línea base ejecutable de rutas', () => {
  const report = auditRoutes();

  it('cruza exactamente las rutas del router con el registro central', () => {
    expect(report.appRoutes).toHaveLength(56);
    expect(report.missingFromBaseline).toEqual([]);
    expect(report.missingFromApp).toEqual([]);
    expect(report.duplicateAppRoutes).toEqual([]);
    expect(report.duplicateBaselineRoutes).toEqual([]);
  });

  it('cada ruta tiene política de acceso, SEO y preview explícita', () => {
    for (const route of CURRENT_ROUTE_BASELINE) {
      expect(route.surface, route.path).toBeTruthy();
      expect(route.access, route.path).toBeTruthy();
      expect(route.seo, route.path).toBeTruthy();
      expect(route.preview, route.path).toBeTruthy();
    }
  });

  it('ningún destino interno estático apunta al catch-all', () => {
    // El catch-all se excluye deliberadamente del matcher: si contara como una
    // ruta válida, cualquier typo pasaría esta prueba y terminaría en el 404.
    expect(report.brokenTargets).toEqual([]);
    expect(routePatternMatches('*', '/ruta-inventada')).toBe(false);
    expect(
      findBrokenStaticTargets(report.appRoutes, [
        { file: 'control.jsx', kind: 'to', target: '/ruta-inventada' },
      ]),
    ).toHaveLength(1);
  });

  it('el matcher entiende parámetros, query strings y el splat de admin', () => {
    expect(routePatternMatches('/beneficios/:slug', '/beneficios/ejemplo')).toBe(true);
    expect(routePatternMatches('/admin/*', '/admin?tab=users')).toBe(true);
    expect(routePatternMatches('/admin/*', '/admin/otra-seccion')).toBe(true);
    expect(routePatternMatches('/activities/:id', '/activities')).toBe(false);
  });

  it('toda ruta de compatibilidad está marcada como alias no indexable', () => {
    const compatibilityRoutes = CURRENT_ROUTE_BASELINE.filter(
      ({ surface }) => surface === 'compatibilidad',
    );
    expect(compatibilityRoutes.map(({ path }) => path)).toEqual([
      '/activities/:id',
      '/partners/:slug',
      '/beneficios/id/:id',
      '/novedades/id/:id',
      '/novedades/uuid/:id',
    ]);
    expect(
      compatibilityRoutes.every(({ seo }) => ['alias-noindex', 'redirect-noindex'].includes(seo)),
    ).toBe(true);
  });
});
