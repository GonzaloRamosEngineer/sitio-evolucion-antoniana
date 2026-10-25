import { describe, expect, it } from 'vitest';
import {
  LEGACY_DYNAMIC_REDIRECTS,
  LEGACY_PUBLIC_REDIRECTS,
  ROUTE_MANIFEST,
  ROUTE_PATHS,
  RUTAS,
  withQuery,
} from '@/config/rutas';

describe('registro central de rutas', () => {
  it('declara una sola entrada por patrón y conserva la línea base completa', () => {
    expect(ROUTE_MANIFEST).toHaveLength(56);
    expect(new Set(ROUTE_MANIFEST.map(({ path }) => path)).size).toBe(56);
    expect(ROUTE_MANIFEST.map(({ path }) => path)).toEqual(Object.values(ROUTE_PATHS));
  });

  it('declara los dos aliases dinamicos de la etapa 5', () => {
    expect(LEGACY_DYNAMIC_REDIRECTS).toEqual({
      '/activities/:id': '/actividades/:id',
      '/partners/:slug': '/alianzas/:slug',
    });
  });

  it('declara dieciseis aliases públicos sin cadenas de redirects', () => {
    expect(Object.keys(LEGACY_PUBLIC_REDIRECTS)).toHaveLength(16);
    expect(
      Object.values(LEGACY_PUBLIC_REDIRECTS).filter((destino) =>
        Object.prototype.hasOwnProperty.call(LEGACY_PUBLIC_REDIRECTS, destino),
      ),
    ).toEqual([]);
  });

  it('construye detalles escapando slugs e IDs', () => {
    expect(RUTAS.actividades.detalle('actividad uno')).toBe('/actividades/actividad%20uno');
    expect(RUTAS.alianzas.detalle('aliado/extra')).toBe('/alianzas/aliado%2Fextra');
    expect(RUTAS.beneficios.porId('abc-123')).toBe('/beneficios/id/abc-123');
    expect(RUTAS.admin.actividadEditar('uuid')).toBe('/admin/activities/edit/uuid');
  });

  it('falla ruidosamente si falta un parámetro obligatorio', () => {
    expect(() => RUTAS.beneficios.detalle('')).toThrow('Falta el parámetro :slug');
    expect(() => RUTAS.novedades.porUuid(null)).toThrow('Falta el parámetro :id');
  });

  it('centraliza query strings sin interpolación manual', () => {
    expect(RUTAS.comision.documentos).toBe('/comision?tab=documents');
    expect(RUTAS.comision.tab('projects')).toBe('/comision?tab=projects');
    expect(RUTAS.admin.actividades).toBe('/admin?tab=activities');
    expect(RUTAS.admin.tab('legal_documents')).toBe('/admin?tab=legal_documents');
    expect(withQuery(RUTAS.comision.inicio, { tab: 'projects', filtro: 'en curso' })).toBe(
      '/comision?tab=projects&filtro=en+curso',
    );
  });

  it('deriva la entrada de admin desde el patrón splat', () => {
    expect(ROUTE_PATHS.ADMIN).toBe('/admin/*');
    expect(RUTAS.admin.inicio).toBe('/admin');
  });
});

