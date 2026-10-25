import { describe, expect, it } from 'vitest';
import { ROUTE_MANIFEST, ROUTE_PATHS, RUTAS, withQuery } from '@/config/rutas';

describe('registro central de rutas', () => {
  it('declara una sola entrada por patrón y conserva la línea base completa', () => {
    expect(ROUTE_MANIFEST).toHaveLength(38);
    expect(new Set(ROUTE_MANIFEST.map(({ path }) => path)).size).toBe(38);
    expect(ROUTE_MANIFEST.map(({ path }) => path)).toEqual(Object.values(ROUTE_PATHS));
  });

  it('construye detalles escapando slugs e IDs', () => {
    expect(RUTAS.actividades.detalle('actividad uno')).toBe('/activities/actividad%20uno');
    expect(RUTAS.alianzas.detalle('aliado/extra')).toBe('/partners/aliado%2Fextra');
    expect(RUTAS.beneficios.porId('abc-123')).toBe('/beneficios/id/abc-123');
    expect(RUTAS.admin.actividadEditar('uuid')).toBe('/admin/activities/edit/uuid');
  });

  it('falla ruidosamente si falta un parámetro obligatorio', () => {
    expect(() => RUTAS.beneficios.detalle('')).toThrow('Falta el parámetro :slug');
    expect(() => RUTAS.novedades.porUuid(null)).toThrow('Falta el parámetro :id');
  });

  it('centraliza query strings sin interpolación manual', () => {
    expect(RUTAS.comision.documentos).toBe('/comision?tab=documents');
    expect(withQuery(RUTAS.comision.inicio, { tab: 'projects', filtro: 'en curso' })).toBe(
      '/comision?tab=projects&filtro=en+curso',
    );
  });

  it('deriva la entrada de admin desde el patrón splat', () => {
    expect(ROUTE_PATHS.ADMIN).toBe('/admin/*');
    expect(RUTAS.admin.inicio).toBe('/admin');
  });
});

