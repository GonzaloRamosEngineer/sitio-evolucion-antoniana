// Lo que fijan estos tests es lo que hace confiable a una importación, y son
// tres cosas que se descubrieron mirando un extracto real de MercadoPago
// (octubre 2024, Fundación Evolución Antoniana):
//
//  1. **El formato argentino de número.** `parseFloat("937.776,27")` devuelve
//     937.776 — un número plausible, mil veces más chico, que nadie nota.
//  2. **El impuesto comparte el id de operación con su transferencia.** Con la
//     clave siendo solo el id, el impuesto se rechazaría como duplicado y no
//     entraría NUNCA. Un gasto que desaparece en silencio es peor que uno
//     duplicado, porque nadie lo busca.
//  3. **Una línea rara no puede voltear el lote.** Con 400 movimientos, cortar
//     en la primera obliga a limpiar el archivo a ciegas.
import { describe, it, expect } from 'vitest';
import {
  aNumero, aFechaISO, clasificar, referenciaDe, parsearExtracto, resumirLote,
} from '@/lib/importarMovimientos';

// Extracto real, recortado. El encabezado es el que trae MercadoPago.
const EXTRACTO = [
  'Fecha\tDescripción\tID de la operación\tValor\tSaldo',
  '09-10-2024\tLiquidación de dinero\t89189491908\t$ 3.451,60\t$ 1.943.402,93',
  '10-10-2024\tTransferencia enviada Centro Juventud Antoniana\t90165423466\t$ -937.776,27\t$ 1.005.626,66',
  '10-10-2024\tImpuesto por extracción\t90165423466\t$ -5.626,66\t$ 1.000.000,00',
  '14-10-2024\tDébito por deuda Facturas vencidas de Mercado Libre\t1516483272\t$ -4.639,50\t$ 995.360,50',
  '15-10-2024\tTransferencia enviada Fundacion Evolucion Antoniana\t90311294637\t$ -53.989,20\t$ 921.251,30',
].join('\n');

describe('aNumero — el formato argentino', () => {
  it('🔒 lee punto como miles y coma como decimales', () => {
    // El bug silencioso: parseFloat daría 937.776 y nadie lo notaría.
    expect(aNumero('$ -937.776,27')).toBe(-937776.27);
    expect(aNumero('$ 1.943.402,93')).toBe(1943402.93);
    expect(aNumero('$ 3.451,60')).toBe(3451.6);
  });

  it('sobrevive a espacios, signos y a que ya sea un número', () => {
    expect(aNumero(' $  -120,00 ')).toBe(-120);
    expect(aNumero(1234.5)).toBe(1234.5);
  });

  it('devuelve null en vez de NaN cuando no entiende', () => {
    expect(aNumero('total')).toBeNull();
    expect(aNumero('')).toBeNull();
    expect(aNumero(null)).toBeNull();
  });
});

describe('aFechaISO', () => {
  it('lee DD-MM-YYYY como día-mes, que es el orden del extracto', () => {
    // Leerlo como mes-día daría "2024-01-10": una fecha VÁLIDA y equivocada.
    expect(aFechaISO('10-10-2024')).toBe('2024-10-10');
    expect(aFechaISO('01-10-2024')).toBe('2024-10-01');
    expect(aFechaISO('15/10/2024')).toBe('2024-10-15');
  });

  it('acepta ISO tal cual y rechaza lo que no entiende', () => {
    expect(aFechaISO('2024-10-10')).toBe('2024-10-10');
    expect(aFechaISO('ayer')).toBeNull();
  });
});

describe('referenciaDe — la clave de idempotencia', () => {
  it('🔒 distingue el impuesto de la transferencia que comparte su id', () => {
    const transferencia = referenciaDe('mp', '90165423466', -937776.27);
    const impuesto = referenciaDe('mp', '90165423466', -5626.66);

    expect(transferencia).not.toBe(impuesto);
    expect(impuesto).toBe('mp:90165423466:-5626.66');
  });

  it('es determinística: reimportar da la misma clave', () => {
    expect(referenciaDe('mp', '123', -100)).toBe(referenciaDe('mp', '123', -100.0));
  });
});

describe('clasificar', () => {
  it('manda los impuestos a su propia categoría — son los gastos hormiga', () => {
    expect(clasificar('Impuesto por extracción').categoria).toBe('Comisiones e impuestos');
  });

  it('saca la contraparte de una transferencia', () => {
    const r = clasificar('Transferencia enviada Centro Juventud Antoniana');
    expect(r.categoria).toBe('Transferencias enviadas');
    expect(r.contraparte).toBe('Centro Juventud Antoniana');
  });

  it('no inventa categoría cuando no reconoce nada', () => {
    // Preferible a encasillar mal: la pantalla lo muestra vacío y alguien decide.
    expect(clasificar('Movimiento raro').categoria).toBeNull();
  });
});

describe('parsearExtracto', () => {
  const { filas, errores } = parsearExtracto(EXTRACTO);

  it('no reporta errores con el encabezado real de MercadoPago', () => {
    expect(errores).toEqual([]);
    expect(filas).toHaveLength(5);
  });

  it('el signo decide el tipo, y es lo único que lo decide', () => {
    expect(filas[0].tipo).toBe('aporte'); // +3.451,60
    expect(filas[1].tipo).toBe('gasto'); // -937.776,27
  });

  it('🔒 el impuesto y su transferencia son dos filas con claves distintas', () => {
    const mismaOperacion = filas.filter((f) => f.id === '90165423466');
    expect(mismaOperacion).toHaveLength(2);
    expect(new Set(mismaOperacion.map((f) => f.referencia)).size).toBe(2);
  });

  it('recupera los montos exactos del extracto real', () => {
    expect(filas[1].monto).toBe(-937776.27);
    expect(filas[4].monto).toBe(-53989.2); // el descubierto que nombra el acta
  });

  it('🔒 una línea rota no voltea el lote: se marca y las demás siguen', () => {
    const conBasura = [
      'Fecha\tDescripción\tID de la operación\tValor\tSaldo',
      '10-10-2024\tBuena\t111\t$ -100,00\t$ 0,00',
      'esto no es un movimiento',
      '11-10-2024\tOtra buena\t222\t$ -200,00\t$ 0,00',
    ].join('\n');

    const r = parsearExtracto(conBasura);
    expect(r.filas).toHaveLength(3);
    expect(r.filas[1].problema).toBeTruthy();
    expect(r.filas[2].problema).toBeFalsy();
  });

  it('avisa cuando falta el id, en vez de rechazar la fila', () => {
    const sinId = [
      'Fecha\tDescripción\tValor',
      '10-10-2024\tAlgo\t$ -100,00',
    ].join('\n');
    const r = parsearExtracto(sinId);
    expect(r.filas[0].referencia).toBeNull();
    expect(r.filas[0].aviso).toMatch(/duplicar/i);
  });

  it('avisa si el encabezado no se reconoce, en vez de devolver basura', () => {
    const r = parsearExtracto('una\tcosa\tcualquiera\nmas\tdatos\tsueltos');
    expect(r.errores.length).toBeGreaterThan(0);
    expect(r.filas).toEqual([]);
  });
});

describe('resumirLote', () => {
  const { filas } = parsearExtracto(EXTRACTO);

  it('cuenta aportes y gastos, y los gastos en positivo', () => {
    const r = resumirLote(filas);
    expect(r.aportes).toBe(1);
    expect(r.gastos).toBe(4);
    // 937.776,27 + 5.626,66 + 4.639,50 + 53.989,20
    expect(r.montoGastos).toBeCloseTo(1002031.63, 2);
    expect(r.montoAportes).toBeCloseTo(3451.6, 2);
  });

  it('🔒 descuenta lo que ya está cargado — el punto entero de reimportar sin miedo', () => {
    const yaCargadas = new Set([filas[1].referencia, filas[2].referencia]);
    const r = resumirLote(filas, yaCargadas);
    expect(r.duplicadas).toBe(2);
    expect(r.aportes + r.gastos).toBe(3);
  });
});
