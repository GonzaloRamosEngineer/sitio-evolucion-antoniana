import { describe, it, expect } from 'vitest';
import {
  ESTADOS_MEMBRESIA,
  ESTADOS_HISTORIAL,
  describirEstado,
} from './estadosPago';

describe('describirEstado', () => {
  it('traduce los estados conocidos', () => {
    expect(describirEstado(ESTADOS_MEMBRESIA, 'active').label).toBe('Activa');
    expect(describirEstado(ESTADOS_MEMBRESIA, 'paused').label).toBe('Pausada');
    expect(describirEstado(ESTADOS_HISTORIAL, 'approved').label).toBe('Validado');
    expect(describirEstado(ESTADOS_HISTORIAL, 'refunded').label).toBe('Reintegrado');
  });

  it('no distingue mayúsculas', () => {
    expect(describirEstado(ESTADOS_MEMBRESIA, 'ACTIVE').label).toBe('Activa');
    expect(describirEstado(ESTADOS_MEMBRESIA, 'Pending').label).toBe('Pendiente');
  });

  // El bug del 2026-08-16: `pending` caía en un `else` que decía "Cancelada",
  // así que a alguien que acababa de suscribirse se le informaba que su
  // suscripción estaba cancelada.
  it('pending NO es cancelada — es el bug que originó este módulo', () => {
    const pendiente = describirEstado(ESTADOS_MEMBRESIA, 'pending');
    expect(pendiente.label).toBe('Pendiente');
    expect(pendiente.tono).toBe('curso');
    expect(pendiente.label).not.toBe('Cancelada');
  });

  it('cancelled no es "en curso": no debe mostrarse como si avanzara', () => {
    expect(describirEstado(ESTADOS_HISTORIAL, 'cancelled').tono).toBe('cerrado');
    expect(describirEstado(ESTADOS_HISTORIAL, 'rejected').tono).toBe('cerrado');
  });

  it('un estado desconocido se devuelve crudo, no se disfraza', () => {
    const raro = describirEstado(ESTADOS_MEMBRESIA, 'charged_back');
    expect(raro.label).toBe('charged_back');
    expect(raro.tono).toBe('desconocido');
  });

  it('tolera null, undefined y vacío', () => {
    for (const v of [null, undefined, '']) {
      expect(describirEstado(ESTADOS_MEMBRESIA, v)).toEqual({
        label: 'sin estado',
        tono: 'desconocido',
      });
    }
  });
});

describe('cobertura de los estados del esquema', () => {
  // El CHECK de `memberships` en el baseline permite exactamente estos cuatro.
  // Si alguien agrega uno en la migración y no acá, el badge lo mostraría como
  // 'desconocido' — este test obliga a mantener las dos cosas juntas.
  it('ESTADOS_MEMBRESIA cubre los 4 del CHECK de memberships', () => {
    expect(Object.keys(ESTADOS_MEMBRESIA).sort()).toEqual(
      ['active', 'cancelled', 'paused', 'pending'].sort()
    );
  });

  it('todo estado de membresía también se entiende en el historial', () => {
    for (const estado of Object.keys(ESTADOS_MEMBRESIA)) {
      expect(describirEstado(ESTADOS_HISTORIAL, estado).tono).not.toBe('desconocido');
    }
  });

  it('ningún tono queda fuera de los cuatro que las vistas saben pintar', () => {
    const validos = ['ok', 'curso', 'cerrado', 'desconocido'];
    for (const mapa of [ESTADOS_MEMBRESIA, ESTADOS_HISTORIAL]) {
      for (const { tono } of Object.values(mapa)) {
        expect(validos).toContain(tono);
      }
    }
  });
});
