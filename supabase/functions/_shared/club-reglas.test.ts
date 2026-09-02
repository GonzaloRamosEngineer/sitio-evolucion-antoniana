import { describe, it, expect } from 'vitest';
import {
  claveLimite,
  ventanaDesde,
  disponibleAhora,
  calcularAhorro,
  inicioVentanaUTC,
  cumpleRequisitos,
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

/* ============================================================
   REQUISITOS POR BENEFICIO (§12.11)

   Lo que fijan estas pruebas es la economía del club, no un detalle: con el
   umbral único de acceso, $5.000 desbloqueaban un descuento de $45.000 a
   $150.000, y como el límite es 1/total la estrategia óptima era **aportar
   una vez, canjear e irse**. Los casos de abajo son los números REALES de la
   cuota ($5.000) y de una cotización de desarrollo web.
   ============================================================ */
describe('cumpleRequisitos', () => {
  const sinRequisitos = { antiguedad_minima_meses: null, aporte_minimo_acumulado: null };
  const pideSeisMeses = { antiguedad_minima_meses: 6, aporte_minimo_acumulado: null };
  const pideTreintaMil = { antiguedad_minima_meses: null, aporte_minimo_acumulado: 30000 };
  const pideAmbos = { antiguedad_minima_meses: 6, aporte_minimo_acumulado: 30000 };

  const eleg = (meses: number, monto: number) => ({
    tiene_acceso: true,
    meses_aportados: meses,
    aporte_acumulado: monto,
  });

  it('sin requisitos declarados no verifica nada — el comportamiento de antes', () => {
    expect(cumpleRequisitos(sinRequisitos, eleg(0, 0)).ok).toBe(true);
    expect(cumpleRequisitos(sinRequisitos, null).ok).toBe(true);
  });

  it('EL CASO QUE MOTIVA TODO: un aporte de $5.000 no alcanza para el beneficio caro', () => {
    // Un mes de cuota, $5.000 acumulados. Antes esto desbloqueaba $45.000.
    const r = cumpleRequisitos(pideAmbos, eleg(1, 5000));
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe('requisitos');
  });

  it('los dos caminos son OR: la antigüedad sola alcanza', () => {
    // 6 meses de cuota simbólica = $30.000, pero lo que se mide es el tiempo.
    expect(cumpleRequisitos(pideAmbos, eleg(6, 30000)).ok).toBe(true);
    expect(cumpleRequisitos(pideSeisMeses, eleg(6, 0)).ok).toBe(true);
  });

  it('los dos caminos son OR: el monto solo también alcanza, sin esperar meses', () => {
    // El donante que pone $30.000 de una no tiene que esperar medio año: es
    // el que MÁS aporta, y pedirle las dos cosas lo dejaría afuera.
    expect(cumpleRequisitos(pideAmbos, eleg(1, 30000)).ok).toBe(true);
    expect(cumpleRequisitos(pideTreintaMil, eleg(0, 30000)).ok).toBe(true);
  });

  it('dice QUÉ falta y por cuál camino, no solo que no se puede', () => {
    const r = cumpleRequisitos(pideAmbos, eleg(2, 10000));
    expect(r.ok).toBe(false);
    expect(r.faltan_meses).toBe(4);
    expect(r.falta_monto).toBe(20000);
    expect(r.motivo).toMatch(/4 meses/);
    expect(r.motivo).toMatch(/20.000/);
  });

  it('el borde exacto cumple: 6 de 6 y $30.000 de $30.000', () => {
    expect(cumpleRequisitos(pideSeisMeses, eleg(6, 0)).ok).toBe(true);
    expect(cumpleRequisitos(pideTreintaMil, eleg(0, 30000)).ok).toBe(true);
    // Y uno menos, no.
    expect(cumpleRequisitos(pideSeisMeses, eleg(5, 0)).ok).toBe(false);
    expect(cumpleRequisitos(pideTreintaMil, eleg(0, 29999)).ok).toBe(false);
  });

  it('sin elegibilidad (sin sesión) no cumple, y no explota', () => {
    for (const e of [null, undefined]) {
      expect(cumpleRequisitos(pideAmbos, e).ok).toBe(false);
    }
  });

  it('singular/plural: "1 mes", no "1 meses"', () => {
    expect(cumpleRequisitos(pideSeisMeses, eleg(5, 0)).motivo).toMatch(/1 mes de/);
  });
});

describe('calcularAhorro con tope (§12.11)', () => {
  const treintaPorCiento = { tipo: 'porcentaje' as const, valor: 30, ahorro_maximo: 30000 };
  const sinTope = { tipo: 'porcentaje' as const, valor: 30, ahorro_maximo: null };

  it('sin tope, un 30% sobre $500.000 son $150.000 del bolsillo del comercio', () => {
    expect(calcularAhorro(sinTope, 500000)).toBe(150000);
  });

  it('con tope, ese mismo canje le cuesta $30.000 — es lo que hace que acepte entrar', () => {
    expect(calcularAhorro(treintaPorCiento, 500000)).toBe(30000);
    expect(calcularAhorro(treintaPorCiento, 150000)).toBe(30000); // 45.000 topado
  });

  it('por debajo del tope el descuento es el real, no el tope', () => {
    // 30% de $50.000 = $15.000. El tope NO debe inflar nada.
    expect(calcularAhorro(treintaPorCiento, 50000)).toBe(15000);
  });

  it('el tope se aplica al AHORRO y no al monto de la operación', () => {
    // Si se topara el monto antes, seria 30% de $30.000 = $9.000. Es otra cosa.
    expect(calcularAhorro(treintaPorCiento, 200000)).toBe(30000);
    expect(calcularAhorro(treintaPorCiento, 200000)).not.toBe(9000);
  });

  it('monto_fijo también respeta el tope, y sigue sin poder superar lo gastado', () => {
    const fijo = { tipo: 'monto_fijo' as const, valor: 50000, ahorro_maximo: 20000 };
    expect(calcularAhorro(fijo, 100000)).toBe(20000);
    expect(calcularAhorro(fijo, 10000)).toBe(10000); // no se ahorra mas que el gasto
  });

  it('2x1 y regalo siguen dando null: un tope no los vuelve calculables', () => {
    // Un 0 mentiria en el reporte al comercio (§11.7.12).
    expect(calcularAhorro({ tipo: '2x1', valor: null, ahorro_maximo: 30000 }, 100000)).toBeNull();
    expect(calcularAhorro({ tipo: 'regalo', valor: null, ahorro_maximo: 30000 }, 100000)).toBeNull();
  });
});
