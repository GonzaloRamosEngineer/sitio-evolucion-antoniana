import { describe, it, expect, vi } from 'vitest';
import { validarGasto, aPayloadGasto, balanceDestino, hoyISO } from './gastosApi';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const base = {
  destino_id: 'd1',
  concepto: 'Pelotas',
  monto: '30000',
  fecha: '2026-08-16',
  categoria: '',
  proveedor: '',
  notas: '',
  publicado: false,
};

// `validarGasto` espeja los CHECK de la base para que el usuario vea un mensaje
// claro en vez del error de Postgres. La base sigue siendo la que manda.
describe('validarGasto', () => {
  it('acepta un gasto minimo valido', () => {
    expect(validarGasto(base)).toEqual({});
  });

  // gastos.destino_id es NOT NULL: todo gasto sale de algun lado.
  it('exige destino', () => {
    expect(validarGasto({ ...base, destino_id: '' }).destino_id).toBeTruthy();
  });

  it('exige concepto', () => {
    expect(validarGasto({ ...base, concepto: '   ' }).concepto).toBeTruthy();
  });

  // Espeja el CHECK `monto > 0`.
  it('rechaza monto cero, negativo o no numerico', () => {
    expect(validarGasto({ ...base, monto: '0' }).monto).toBeTruthy();
    expect(validarGasto({ ...base, monto: '-5' }).monto).toBeTruthy();
    expect(validarGasto({ ...base, monto: '' }).monto).toBeTruthy();
    expect(validarGasto({ ...base, monto: 'mil' }).monto).toBeTruthy();
  });

  it('exige fecha', () => {
    expect(validarGasto({ ...base, fecha: '' }).fecha).toBeTruthy();
  });
});

describe('aPayloadGasto', () => {
  it('convierte el monto a numero', () => {
    expect(aPayloadGasto(base).monto).toBe(30000);
  });

  // Una cadena vacia en la base es un dato que parece existir y no existe.
  it('manda null en vez de cadena vacia', () => {
    const p = aPayloadGasto({ ...base, categoria: '  ', proveedor: '', notas: '' });
    expect(p.categoria).toBeNull();
    expect(p.proveedor).toBeNull();
    expect(p.notas).toBeNull();
  });

  // El default de la base es `false` para que publicar sea un acto deliberado.
  // El payload no puede convertirlo en un `undefined` que la base reinterprete.
  it('publicado siempre viaja como booleano', () => {
    expect(aPayloadGasto(base).publicado).toBe(false);
    expect(aPayloadGasto({ ...base, publicado: true }).publicado).toBe(true);
    expect(aPayloadGasto({ ...base, publicado: undefined }).publicado).toBe(false);
  });

  // El comprobante NO se toca desde el formulario: se adjunta aparte, con su
  // propia subida al bucket privado. Mandarlo acá lo borraria al corregir.
  it('no toca los campos del comprobante', () => {
    const p = aPayloadGasto(base);
    expect(p).not.toHaveProperty('comprobante_path');
    expect(p).not.toHaveProperty('comprobante_nombre');
  });
});

describe('balanceDestino', () => {
  it('calcula saldo y porcentaje rendido', () => {
    const b = balanceDestino({ monto_recaudado: 100000, monto_rendido: 25000 });
    expect(b.saldo).toBe(75000);
    expect(b.porcentajeRendido).toBe(25);
  });

  // Un destino sin nada recaudado no tiene contra que medirse: 0% comunicaria
  // que no se rindio nada, cuando en realidad no habia nada que rendir.
  it('sin recaudacion el porcentaje es null, no cero', () => {
    expect(balanceDestino({ monto_recaudado: 0, monto_rendido: 0 }).porcentajeRendido).toBeNull();
  });

  // Puede pasar: se gasto mas de lo recaudado para ese destino (lo cubrio la
  // entidad). El saldo negativo es informacion real y no se recorta...
  it('el saldo puede ser negativo y se informa tal cual', () => {
    expect(balanceDestino({ monto_recaudado: 10000, monto_rendido: 15000 }).saldo).toBe(-5000);
  });

  // ...pero la barra sí se recorta, porque una barra al 150% se sale de la caja.
  it('el porcentaje se recorta en 100', () => {
    expect(balanceDestino({ monto_recaudado: 10000, monto_rendido: 15000 }).porcentajeRendido).toBe(100);
  });

  it('tolera un destino sin datos', () => {
    const b = balanceDestino(null);
    expect(b.saldo).toBe(0);
    expect(b.porcentajeRendido).toBeNull();
  });
});

describe('hoyISO', () => {
  it('devuelve el formato que espera un input date', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
