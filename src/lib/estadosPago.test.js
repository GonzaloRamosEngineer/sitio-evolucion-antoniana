import { describe, it, expect } from 'vitest';
import {
  ESTADOS_MEMBRESIA,
  ESTADOS_HISTORIAL,
  TONOS,
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
  // El CHECK de `memberships` permite exactamente estos cinco tras la
  // migración 20260816130000. Si alguien agrega uno en una migración y no acá,
  // el badge lo mostraría como 'desconocido' — este test obliga a mantener las
  // dos cosas juntas, y ya cumplió su función una vez: al sumar `expired`
  // falló, que es exactamente lo que tenía que hacer.
  it('ESTADOS_MEMBRESIA cubre los 5 del CHECK de memberships', () => {
    expect(Object.keys(ESTADOS_MEMBRESIA).sort()).toEqual(
      ['active', 'cancelled', 'expired', 'paused', 'pending'].sort()
    );
  });

  it('expired no es cancelled: se recupera, por eso pide atención', () => {
    expect(describirEstado(ESTADOS_MEMBRESIA, 'expired').tono).toBe('atencion');
    expect(describirEstado(ESTADOS_MEMBRESIA, 'cancelled').tono).toBe('cerrado');
  });

  it('todo estado de membresía también se entiende en el historial', () => {
    for (const estado of Object.keys(ESTADOS_MEMBRESIA)) {
      expect(describirEstado(ESTADOS_HISTORIAL, estado).tono).not.toBe('desconocido');
    }
  });

  // Las vistas tienen un mapa tono -> estilo. Un tono que no esté en TONOS
  // llegaría a ese mapa como `undefined` y rompería el render, así que esto
  // ata las dos puntas.
  it('ningún tono queda fuera de los que las vistas saben pintar', () => {
    for (const mapa of [ESTADOS_MEMBRESIA, ESTADOS_HISTORIAL]) {
      for (const { tono } of Object.values(mapa)) {
        expect(TONOS).toContain(tono);
      }
    }
  });

  it('describirEstado nunca devuelve un tono fuera de TONOS', () => {
    expect(TONOS).toContain(describirEstado(ESTADOS_MEMBRESIA, 'charged_back').tono);
    expect(TONOS).toContain(describirEstado(ESTADOS_MEMBRESIA, null).tono);
  });
});
