import { describe, it, expect } from 'vitest';
import {
  segundosRestantes,
  formatearCuenta,
  agruparCodigo,
  estadoCanje,
  etiquetaBeneficio,
  mensajeDeError,
  normalizarCodigo,
  esCodigoValido,
} from '@/lib/club';

const ahora = new Date('2026-08-30T12:00:00Z');
const en = (segundos) => new Date(ahora.getTime() + segundos * 1000).toISOString();

describe('segundosRestantes', () => {
  it('cuenta lo que falta y nunca baja de cero', () => {
    expect(segundosRestantes(en(90), ahora)).toBe(90);
    expect(segundosRestantes(en(-30), ahora)).toBe(0);
  });

  it('sin fecha o con basura devuelve 0, no NaN', () => {
    expect(segundosRestantes(null, ahora)).toBe(0);
    expect(segundosRestantes('no-es-una-fecha', ahora)).toBe(0);
  });
});

describe('formatearCuenta', () => {
  it('formatea M:SS con el segundo siempre en dos dígitos', () => {
    expect(formatearCuenta(300)).toBe('5:00');
    expect(formatearCuenta(65)).toBe('1:05');
    expect(formatearCuenta(9)).toBe('0:09');
    expect(formatearCuenta(0)).toBe('0:00');
  });

  it('un valor raro no imprime NaN en la pantalla del socio', () => {
    expect(formatearCuenta(undefined)).toBe('0:00');
    expect(formatearCuenta(-10)).toBe('0:00');
  });
});

describe('agruparCodigo', () => {
  it('parte el código en dos mitades para dictarlo', () => {
    expect(agruparCodigo('ZK4M2P')).toBe('ZK4 M2P');
  });

  it('si no mide 6 lo deja como está, no inventa espacios', () => {
    expect(agruparCodigo('ZK4M')).toBe('ZK4M');
    expect(agruparCodigo('')).toBe('');
  });
});

describe('estadoCanje', () => {
  it('confirmado y anulado ganan sobre el reloj', () => {
    expect(estadoCanje({ estado: 'confirmado', expira_en: en(-500) }, ahora)).toBe('confirmado');
    expect(estadoCanje({ estado: 'anulado', expira_en: en(300) }, ahora)).toBe('anulado');
  });

  // Lo que la persona ve manda: un 'pendiente' con el reloj en cero ya venció,
  // aunque el reaper todavía no haya pasado por la base.
  it('un pendiente con el reloj en cero se muestra como vencido', () => {
    expect(estadoCanje({ estado: 'pendiente', expira_en: en(-1) }, ahora)).toBe('vencido');
  });

  it('avisa cuando queda menos de un minuto', () => {
    expect(estadoCanje({ estado: 'pendiente', expira_en: en(120) }, ahora)).toBe('vigente');
    expect(estadoCanje({ estado: 'pendiente', expira_en: en(45) }, ahora)).toBe('por_vencer');
  });

  it('sin canje no rompe', () => {
    expect(estadoCanje(null, ahora)).toBe('ninguno');
  });
});

describe('etiquetaBeneficio', () => {
  it('arma la etiqueta de cada tipo', () => {
    expect(etiquetaBeneficio({ tipo: 'porcentaje', valor: 30 })).toBe('30% OFF');
    expect(etiquetaBeneficio({ tipo: '2x1' })).toBe('2x1');
    expect(etiquetaBeneficio({ tipo: 'regalo' })).toBe('Regalo');
  });

  it('un porcentaje sin valor no muestra "null% OFF"', () => {
    expect(etiquetaBeneficio({ tipo: 'porcentaje', valor: null })).toBeNull();
    expect(etiquetaBeneficio({})).toBeNull();
  });
});

describe('mensajeDeError', () => {
  it('prefiere el texto que ya redactó la Edge Function', () => {
    expect(mensajeDeError({ error: 'Este beneficio se agotó.' })).toBe('Este beneficio se agotó.');
  });

  // Nunca mostrar el código crudo: 'limite_alcanzado' no le dice nada a nadie.
  it('traduce el código cuando no vino texto', () => {
    expect(mensajeDeError({ codigo_error: 'limite_alcanzado' })).toBe('Ya usaste este beneficio.');
  });

  it('ante algo desconocido cae a un mensaje entendible', () => {
    expect(mensajeDeError({ codigo_error: 'algo_nuevo' })).toBe('No se pudo completar la operación.');
    expect(mensajeDeError(null)).toBe('No se pudo completar la operación.');
  });
});

describe('normalizarCodigo', () => {
  // El rechazo más tonto posible en la caja es que el campo no acepte lo que el
  // cajero escribió tal como se lo dictaron.
  it('acepta minúsculas y espacios y devuelve el código limpio', () => {
    expect(normalizarCodigo('zk4 m2p')).toBe('ZK4M2P');
  });

  it('descarta los caracteres que el alfabeto no usa', () => {
    expect(normalizarCodigo('ZK4-M2P!')).toBe('ZK4M2P');
    expect(normalizarCodigo('O0I1L')).toBe(''); // los ambiguos no existen
  });

  it('no deja pasar más de 6', () => {
    expect(normalizarCodigo('ZK4M2PXYZ')).toBe('ZK4M2P');
  });
});

describe('esCodigoValido', () => {
  it('acepta el alfabeto sin ambiguos y rechaza el resto', () => {
    expect(esCodigoValido('ZK4M2P')).toBe(true);
    expect(esCodigoValido('ZK4M2O')).toBe(false); // O no existe
    expect(esCodigoValido('ZK4M2')).toBe(false);
    expect(esCodigoValido('')).toBe(false);
  });
});
