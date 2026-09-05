// Lo que fijan estos tests, en una línea: **la condición institucional y el
// acceso a beneficios son cosas distintas, y el vocabulario es un dato.**
//
// Las dos cosas se pagaron caro antes. La primera es la separación de §10.2 —
// un miembro suspendido por la comisión no es lo mismo que uno atrasado en el
// pago— y la segunda es lo que evita que el primer cliente se lleve puesto al
// segundo: una fundación no tiene "socios", y escribir esa palabra a mano en
// las pantallas es lo que convierte cada cliente nuevo en un fork (§10.9).
import { describe, it, expect } from 'vitest';
import {
  SIN_MEMBRESIA,
  figura,
  figuraPlural,
  Figura,
  etiquetaNumero,
  estadoMembresia,
  etiquetaEstado,
  fraseEstado,
  formatearAntiguedad,
  resumenPertenencia,
  ofreceSolicitud,
} from '@/lib/miembro';

const miembro = (extra = {}) => ({ ...SIN_MEMBRESIA, es_miembro: true, estado: 'activo', numero: 7, ...extra });

describe('vocabulario — lo que varía por entidad sale de entidad.js', () => {
  it('usa la figura declarada por la entidad, no "socio" escrito a mano', () => {
    // La Fundación es una fundación: no tiene asociados ni asamblea. Su
    // `entidad.vocabulario.aportante` dice 'padrino'. Si este test empieza a
    // fallar porque alguien escribió 'socio' en el config, está bien que falle:
    // significa que cambió el vocabulario de la entidad, que es el punto.
    expect(figura()).toBe('padrino');
    expect(figuraPlural()).toBe('padrinos');
  });

  it('capitaliza para arrancar frases y arma la etiqueta del número', () => {
    expect(Figura()).toBe('Padrino');
    expect(etiquetaNumero()).toBe('Número de padrino');
  });
});

describe('estadoMembresia', () => {
  it('"no es miembro" no es un error ni un estado degradado', () => {
    // En una entidad de alta automática es simplemente alguien que no aportó.
    expect(estadoMembresia(null)).toBe('no_es_miembro');
    expect(estadoMembresia(SIN_MEMBRESIA)).toBe('no_es_miembro');
    expect(etiquetaEstado(SIN_MEMBRESIA)).toBeNull();
  });

  it('distingue los cuatro estados institucionales', () => {
    expect(estadoMembresia(miembro())).toBe('activo');
    expect(estadoMembresia(miembro({ estado: 'pendiente' }))).toBe('pendiente');
    expect(estadoMembresia(miembro({ estado: 'suspendido' }))).toBe('suspendido');
    expect(estadoMembresia(miembro({ estado: 'baja' }))).toBe('baja');
  });

  it('🔒 la frase de "suspendido" aclara que NO es un problema de pago', () => {
    // Es la confusión exacta que la separación de §10.2 existe para evitar:
    // quien lee "suspendido" asume que debe plata, y suele estar al día.
    const frase = fraseEstado(miembro({ estado: 'suspendido' }));
    expect(frase).toMatch(/no es un tema de pagos/i);
  });

  it('el badge del activo usa la figura de la entidad', () => {
    expect(etiquetaEstado(miembro())).toBe('Padrino');
  });
});

describe('formatearAntiguedad', () => {
  const hoy = new Date(2026, 8, 5); // 2026-09-05

  it('cuenta días cuando todavía no hay un mes', () => {
    expect(formatearAntiguedad('2026-09-05', hoy)).toBe('desde hoy');
    expect(formatearAntiguedad('2026-08-25', hoy)).toBe('11 días');
  });

  it('cuenta meses, y solo cuenta el mes en curso si ya se cumplió el día', () => {
    expect(formatearAntiguedad('2026-08-05', hoy)).toBe('1 mes');
    // Entró el 30 de agosto: al 5 de septiembre NO cumplió un mes.
    expect(formatearAntiguedad('2026-08-30', hoy)).toMatch(/días/);
    expect(formatearAntiguedad('2026-04-05', hoy)).toBe('5 meses');
  });

  it('pasa a años, con el resto en meses', () => {
    expect(formatearAntiguedad('2025-09-05', hoy)).toBe('1 año');
    expect(formatearAntiguedad('2023-07-05', hoy)).toBe('3 años y 2 meses');
  });

  it('devuelve null si no hay fecha o si es basura, en vez de "NaN meses"', () => {
    expect(formatearAntiguedad(null, hoy)).toBeNull();
    expect(formatearAntiguedad('no-es-fecha', hoy)).toBeNull();
  });
});

describe('resumenPertenencia — la consecuencia que faltaba (§10.7)', () => {
  it('no devuelve nada cuando no hay aportes: "aportaste 0 veces" es peor que nada', () => {
    expect(resumenPertenencia({ membresia: miembro(), aportes: [] })).toBeNull();
    expect(resumenPertenencia()).toBeNull();
  });

  it('cuenta aportes, suma montos y cuenta destinos distintos', () => {
    const r = resumenPertenencia({
      membresia: miembro({ socio_desde: '2025-09-05', racha_meses: 12 }),
      aportes: [
        { monto: 5000, destino_id: 'd1' },
        { monto: 7500, destino_id: 'd1' },
        { monto: 2000, destino_id: 'd2' },
      ],
    });

    expect(r.cantidad).toBe(3);
    expect(r.total).toBe(14500);
    // Tres aportes, DOS destinos: "sostuviste 2 cosas" es el dato que importa.
    expect(r.destinos).toBe(2);
    expect(r.racha).toBe(12);
  });

  it('esconde la racha cuando es corta: "racha: 1 mes" no premia, subraya', () => {
    const r = resumenPertenencia({
      membresia: miembro({ racha_meses: 1 }),
      aportes: [{ monto: 5000, destino_id: 'd1' }],
    });
    expect(r.racha).toBeNull();
  });
});

describe('ofreceSolicitud', () => {
  it('no ofrece solicitar el alta en una entidad de alta automática', () => {
    // La Fundación: se es padrino por aportar, no por trámite. Un botón
    // "solicitar" acá sería un trámite inventado.
    expect(ofreceSolicitud({ modo_alta: 'automatica' }, SIN_MEMBRESIA)).toBe(false);
  });

  it('sí la ofrece en una entidad que exige aprobación, y solo a quien no es miembro', () => {
    expect(ofreceSolicitud({ modo_alta: 'aprobacion' }, SIN_MEMBRESIA)).toBe(true);
    expect(ofreceSolicitud({ modo_alta: 'aprobacion' }, miembro())).toBe(false);
    expect(ofreceSolicitud({ modo_alta: 'aprobacion' }, miembro({ estado: 'pendiente' }))).toBe(false);
  });

  it('sin reglas cargadas no ofrece nada, en vez de asumir', () => {
    expect(ofreceSolicitud(null, SIN_MEMBRESIA)).toBe(false);
  });
});
