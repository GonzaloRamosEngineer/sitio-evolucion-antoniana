import { describe, it, expect } from 'vitest';
import {
  SIN_ACCESO,
  beneficioBloqueado,
  diasHasta,
  estadoAcceso,
  formatearMeses,
} from '@/lib/acceso';

describe('beneficioBloqueado', () => {
  const abierto = { requiere_acceso: false };
  const exclusivo = { requiere_acceso: true };
  const conAcceso = { tiene_acceso: true };

  it('no bloquea un beneficio abierto, aunque no haya sesión', () => {
    expect(beneficioBloqueado(abierto, SIN_ACCESO)).toBe(false);
    expect(beneficioBloqueado(abierto, undefined)).toBe(false);
  });

  it('bloquea un beneficio exclusivo sin acceso vigente', () => {
    expect(beneficioBloqueado(exclusivo, SIN_ACCESO)).toBe(true);
    expect(beneficioBloqueado(exclusivo, undefined)).toBe(true);
  });

  it('no bloquea un beneficio exclusivo con acceso vigente', () => {
    expect(beneficioBloqueado(exclusivo, conAcceso)).toBe(false);
  });

  // El default de `requiere_acceso` en la base es false, pero un beneficio
  // viejo puede llegar sin la propiedad: no debe bloquearse por eso.
  it('trata la ausencia del campo como beneficio abierto', () => {
    expect(beneficioBloqueado({ titulo: 'x' }, SIN_ACCESO)).toBe(false);
  });
});

describe('estadoAcceso', () => {
  it('distingue los cuatro estados', () => {
    expect(estadoAcceso(SIN_ACCESO)).toBe('sin_aportes');
    expect(estadoAcceso(undefined)).toBe('sin_aportes');
    expect(estadoAcceso({ tiene_acceso: true, vence_el: '2030-01-01' })).toBe('vigente');
    expect(estadoAcceso({ tiene_acceso: true, vence_el: '2020-01-01', en_gracia: true })).toBe('gracia');
    expect(estadoAcceso({ tiene_acceso: false, vence_el: '2020-01-01' })).toBe('vencido');
  });

  // Quien aportó y venció NO es lo mismo que quien nunca aportó: uno vuelve y
  // el otro todavía no entró. La pantalla les habla distinto.
  it('separa vencido de sin_aportes por la presencia de vence_el', () => {
    expect(estadoAcceso({ tiene_acceso: false, vence_el: null })).toBe('sin_aportes');
  });
});

describe('diasHasta', () => {
  const hoy = new Date(2026, 7, 30); // 30-08-2026, mes 0-indexado

  it('cuenta los días que faltan', () => {
    expect(diasHasta('2026-09-09', hoy)).toBe(10);
  });

  it('devuelve negativo si ya pasó', () => {
    expect(diasHasta('2026-08-20', hoy)).toBe(-10);
  });

  it('devuelve 0 el mismo día', () => {
    expect(diasHasta('2026-08-30', hoy)).toBe(0);
  });

  it('tolera null y fechas inválidas', () => {
    expect(diasHasta(null, hoy)).toBeNull();
    expect(diasHasta('no-es-fecha', hoy)).toBeNull();
  });
});

describe('formatearMeses', () => {
  it('usa singular, plural y años', () => {
    expect(formatearMeses(0)).toBe('menos de un mes');
    expect(formatearMeses(1)).toBe('1 mes');
    expect(formatearMeses(7)).toBe('7 meses');
    expect(formatearMeses(12)).toBe('1 año');
    expect(formatearMeses(19)).toBe('1 año y 7 meses');
    expect(formatearMeses(24)).toBe('2 años');
    expect(formatearMeses(25)).toBe('2 años y 1 mes');
  });

  it('tolera undefined', () => {
    expect(formatearMeses(undefined)).toBe('menos de un mes');
  });
});
