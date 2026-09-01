import { describe, it, expect } from 'vitest';
import {
  claveLimite,
  ventanaDesde,
  disponibleAhora,
  calcularAhorro,
  inicioVentanaUTC,
  type Beneficio,
} from './club-reglas.ts';

const ZONA = 'America/Argentina/Buenos_Aires';

const base: Beneficio = {
  tipo: 'porcentaje',
  valor: 30,
  limite_por_persona: 1,
  ventana: 'dia',
  vigencia_desde: null,
  vigencia_hasta: null,
  dias_semana: null,
  hora_desde: null,
  hora_hasta: null,
};

describe('claveLimite', () => {
  it('sin límite de a uno no pone red: devuelve null', () => {
    expect(claveLimite({ limite_por_persona: null, ventana: null }, new Date(), ZONA)).toBeNull();
    // Con límite 3 hay que CONTAR, y eso no lo puede hacer un índice único.
    expect(claveLimite({ limite_por_persona: 3, ventana: 'dia' }, new Date(), ZONA)).toBeNull();
  });

  it('arma la clave de cada ventana', () => {
    const t = new Date('2026-08-30T15:00:00Z'); // 12:00 en Buenos Aires
    expect(claveLimite({ limite_por_persona: 1, ventana: 'dia' }, t, ZONA)).toBe('dia:2026-08-30');
    expect(claveLimite({ limite_por_persona: 1, ventana: 'mes' }, t, ZONA)).toBe('mes:2026-08');
    expect(claveLimite({ limite_por_persona: 1, ventana: 'total' }, t, ZONA)).toBe('total');
  });

  // ESTE ES EL TEST QUE JUSTIFICA TODO EL MANEJO DE HUSO HORARIO.
  // Si la clave se calculara en UTC, el "día" se reiniciaría a las 21:00 hora
  // argentina y la misma persona podría canjear dos veces la misma noche.
  it('21:30 hora local sigue siendo el MISMO día que las 20:30, aunque en UTC ya cambió', () => {
    const antes = new Date('2026-08-30T23:30:00Z'); // 20:30 local, 30/08
    const despues = new Date('2026-08-31T00:30:00Z'); // 21:30 local, TODAVÍA 30/08

    expect(antes.toISOString().slice(0, 10)).not.toBe(despues.toISOString().slice(0, 10)); // en UTC son distintos
    expect(claveLimite(base, antes, ZONA)).toBe('dia:2026-08-30');
    expect(claveLimite(base, despues, ZONA)).toBe('dia:2026-08-30'); // en local, el mismo
  });

  it('la semana ISO arranca el lunes, y el domingo pertenece a la semana que termina', () => {
    const domingo = new Date('2026-08-30T15:00:00Z'); // domingo 30/08 local
    const lunes = new Date('2026-08-31T15:00:00Z'); // lunes 31/08 local
    expect(claveLimite({ limite_por_persona: 1, ventana: 'semana' }, domingo, ZONA))
      .toBe('semana:2026-08-24');
    expect(claveLimite({ limite_por_persona: 1, ventana: 'semana' }, lunes, ZONA))
      .toBe('semana:2026-08-31');
  });
});

describe('ventanaDesde', () => {
  it('da el piso de cada ventana para poder contar', () => {
    const t = new Date('2026-08-30T15:00:00Z');
    expect(ventanaDesde('dia', t, ZONA)).toBe('2026-08-30');
    expect(ventanaDesde('semana', t, ZONA)).toBe('2026-08-24');
    expect(ventanaDesde('mes', t, ZONA)).toBe('2026-08-01');
    expect(ventanaDesde('total', t, ZONA)).toBeNull();
  });
});

describe('inicioVentanaUTC', () => {
  const t = new Date('2026-08-30T15:00:00Z'); // domingo 30/08, 12:00 en Buenos Aires

  // Argentina es UTC-3: la medianoche local del 30 es las 03:00 UTC del 30.
  // Si esto devolviera '2026-08-30T00:00:00Z' estaríamos contando desde las
  // 21:00 del 29 hora local, y se colarían canjes del día anterior.
  it('devuelve la medianoche LOCAL expresada en UTC, no la medianoche UTC', () => {
    expect(inicioVentanaUTC('dia', t, ZONA)).toBe('2026-08-30T03:00:00.000Z');
    expect(inicioVentanaUTC('mes', t, ZONA)).toBe('2026-08-01T03:00:00.000Z');
  });

  it('en UTC no hay corrección que hacer', () => {
    expect(inicioVentanaUTC('dia', t, 'UTC')).toBe('2026-08-30T00:00:00.000Z');
  });

  it("'total' cuenta desde siempre", () => {
    expect(inicioVentanaUTC('total', t, ZONA)).toBeNull();
  });
});

describe('disponibleAhora', () => {
  const t = new Date('2026-08-30T15:00:00Z'); // domingo 30/08, 12:00 local

  it('sin restricciones, está disponible', () => {
    expect(disponibleAhora(base, t, ZONA)).toEqual({ ok: true });
  });

  it('respeta la vigencia por los dos lados', () => {
    expect(disponibleAhora({ ...base, vigencia_desde: '2026-09-01' }, t, ZONA).ok).toBe(false);
    expect(disponibleAhora({ ...base, vigencia_hasta: '2026-08-29' }, t, ZONA).ok).toBe(false);
    expect(disponibleAhora({ ...base, vigencia_desde: '2026-08-01', vigencia_hasta: '2026-08-31' }, t, ZONA).ok).toBe(true);
  });

  it('respeta los días de la semana (domingo = 0)', () => {
    expect(disponibleAhora({ ...base, dias_semana: [1, 2, 3, 4, 5] }, t, ZONA).ok).toBe(false);
    expect(disponibleAhora({ ...base, dias_semana: [0, 6] }, t, ZONA).ok).toBe(true);
  });

  it('respeta la franja horaria y acepta HH:MM o HH:MM:SS', () => {
    expect(disponibleAhora({ ...base, hora_desde: '14:00' }, t, ZONA).ok).toBe(false);
    expect(disponibleAhora({ ...base, hora_hasta: '11:00:00' }, t, ZONA).ok).toBe(false);
    expect(disponibleAhora({ ...base, hora_desde: '09:00', hora_hasta: '18:00' }, t, ZONA).ok).toBe(true);
  });

  it('el motivo es texto para mostrarle a la persona, no un código', () => {
    const r = disponibleAhora({ ...base, hora_desde: '14:00' }, t, ZONA);
    expect(r.motivo).toContain('14:00');
  });
});

describe('calcularAhorro', () => {
  it('porcentaje sobre el monto', () => {
    expect(calcularAhorro({ tipo: 'porcentaje', valor: 30 }, 1000)).toBe(300);
  });

  it('el monto fijo nunca supera lo que se gastó', () => {
    expect(calcularAhorro({ tipo: 'monto_fijo', valor: 500 }, 1200)).toBe(500);
    expect(calcularAhorro({ tipo: 'monto_fijo', valor: 500 }, 300)).toBe(300);
  });

  // null NO es cero: es "no calculable". Un 0 mentiría en el reporte al comercio.
  it('2x1 y regalo no son calculables, y sin monto tampoco', () => {
    expect(calcularAhorro({ tipo: '2x1', valor: null }, 1000)).toBeNull();
    expect(calcularAhorro({ tipo: 'regalo', valor: null }, 1000)).toBeNull();
    expect(calcularAhorro({ tipo: 'porcentaje', valor: 30 }, null)).toBeNull();
    expect(calcularAhorro({ tipo: 'porcentaje', valor: 30 }, undefined)).toBeNull();
  });

  it('un monto inválido no se convierte en un ahorro inventado', () => {
    expect(calcularAhorro({ tipo: 'porcentaje', valor: 30 }, -50)).toBeNull();
    expect(calcularAhorro({ tipo: 'porcentaje', valor: 30 }, NaN)).toBeNull();
  });
});
