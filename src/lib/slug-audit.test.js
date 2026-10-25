import { describe, expect, it } from 'vitest';
import { auditRows, normalizePublicSlug } from '../../tools/audit-slugs.mjs';

describe('normalizePublicSlug', () => {
  it('aplica el contrato comun a tildes, puntuacion y guiones', () => {
    expect(normalizePublicSlug('  Educación, Ciencia — y Tecnología  ')).toBe(
      'educacion-ciencia-y-tecnologia',
    );
  });

  it('colapsa separadores y conserva numeros', () => {
    expect(normalizePublicSlug('30% --- Beneficio #2')).toBe('30-beneficio-2');
  });
});

describe('auditRows', () => {
  it('informa cambios y colisiones antes de migrar', () => {
    const report = auditRows({
      resourceType: 'partner',
      titleField: 'nombre',
      rows: [
        { id: '1', nombre: 'Café Uno', slug: 'café-uno' },
        { id: '2', nombre: 'Cafe Uno', slug: 'cafe--uno' },
      ],
    });

    expect(report.invalid).toHaveLength(2);
    expect(report.changes).toHaveLength(2);
    expect(report.collisions).toEqual([
      {
        normalized: 'cafe-uno',
        matches: [
          { id: '1', current: 'café-uno' },
          { id: '2', current: 'cafe--uno' },
        ],
      },
    ]);
  });
});
