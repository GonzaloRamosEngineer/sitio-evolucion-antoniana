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
  verificarSaldoCorrido, verificarTotales, verificarCadena, consolidarArchivos, anterioresA, delDiaDelInicio,
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


// El CSV REAL de MercadoPago, tal cual sale de Reportes → Resumen de cuenta.
// Comprobado contra el archivo del período 10/2024 el 2026-09-06.
//
// Dos cosas que no se podían adivinar y que la primera versión del parser no
// manejaba:
//   · **Los encabezados vienen en INGLÉS**, aunque el PDF del mismo resumen esté
//     en castellano. No reconocía ni la descripción ni el id — y el id es el que
//     da la idempotencia, así que se habría cargado todo sin referencia y
//     reimportar habría duplicado.
//   · **El archivo tiene DOS bloques**: los totales declarados arriba, una línea
//     en blanco, y recién después los movimientos.
const CSV_REAL = [
  'INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE',
  '1.698.607,63;244.795,30;-1.022.151,63;921.251,30',
  '',
  'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
  '01-10-2024;Liquidación de dinero ;88205823663;6.845,60;1.705.453,23',
  '01-10-2024;Transferencia recibida HERRERA RAUL ANTONIO;89063933653;10.934,00;1.716.387,23',
].join('\n');

describe('el CSV real de MercadoPago', () => {
  const r = parsearExtracto(CSV_REAL);

  it('reconoce las cinco columnas pese a estar en inglés', () => {
    expect(r.errores).toEqual([]);
    expect(r.columnas).toEqual({ fecha: 0, descripcion: 1, id: 2, monto: 3, saldo: 4 });
  });

  it('🔒 saca el id, que es lo que da la idempotencia', () => {
    // Sin esto todo entraría sin referencia y reimportar duplicaría.
    expect(r.filas.every((f) => f.referencia)).toBe(true);
    expect(r.filas[1].referencia).toBe('mp:89063933653:10934.00');
  });

  it('salta el bloque de totales y no lo confunde con un movimiento', () => {
    expect(r.filas).toHaveLength(2);
    expect(r.filas[0].descripcion).toMatch(/Liquidación/);
  });

  it('captura los totales declarados: son la suma de control', () => {
    expect(r.declarado).toEqual({
      saldoInicial: 1698607.63,
      entradas: 244795.3,
      salidas: -1022151.63,
      saldoFinal: 921251.3,
    });
  });

  it('clasifica y saca la contraparte de una transferencia recibida', () => {
    expect(r.filas[1].categoria).toBe('Transferencias recibidas');
    expect(r.filas[1].contraparte).toBe('HERRERA RAUL ANTONIO');
  });
});

describe('las tres verificaciones (§14.3)', () => {
  const { filas, declarado } = parsearExtracto(CSV_REAL);

  it('nivel 1 — el saldo corrido cuadra con el declarado por el banco', () => {
    const v = verificarSaldoCorrido(filas, declarado.saldoInicial);
    expect(v.ok).toBe(true);
    expect(v.desvios).toEqual([]);
  });

  it('🔒 nivel 1 atrapa un importe mal leído, que es el error peligroso', () => {
    // `6.845,60` interpretado como `684,56`: un número plausible que nadie mira
    // dos veces y que arrastra toda la rendición.
    const rotas = filas.map((f, i) => (i === 0 ? { ...f, monto: 684.56 } : f));
    const v = verificarSaldoCorrido(rotas, declarado.saldoInicial);
    expect(v.ok).toBe(false);
    expect(v.desvios).toHaveLength(1);
  });

  it('nivel 2 — lo extraído contra los totales del encabezado', () => {
    // Con solo dos de los 27 movimientos, NO tiene que cuadrar. Que no cuadre es
    // el resultado correcto: significa que el archivo está incompleto.
    const v = verificarTotales(filas, declarado);
    expect(v.ok).toBe(false);
    expect(v.entradas.declarado).toBe(244795.3);
  });

  it('🔒 nivel 3 atrapa un mes que falta entre dos resúmenes', () => {
    const v = verificarCadena([
      { nombre: 'oct', declarado: { saldoInicial: 1698607.63, saldoFinal: 921251.3 } },
      { nombre: 'dic', declarado: { saldoInicial: 500000, saldoFinal: 400000 } },
    ]);
    expect(v.ok).toBe(false);
    expect(v.huecos[0].entre).toEqual(['oct', 'dic']);
    expect(v.huecos[0].diferencia).toBeCloseTo(-421251.3, 2);
  });

  it('nivel 3 no se queja cuando la cadena cierra', () => {
    const v = verificarCadena([
      { nombre: 'oct', declarado: { saldoInicial: 1698607.63, saldoFinal: 921251.3 } },
      { nombre: 'nov', declarado: { saldoInicial: 921251.3, saldoFinal: 800000 } },
    ]);
    expect(v.ok).toBe(true);
  });
});

/*
  Varios archivos de una vez. Lo que se fija acá es lo que aparece SOLO al
  juntarlos: el orden, la renumeración de índices y el mismo archivo elegido dos
  veces. Con 23 extractos, los tres son cuestión de tiempo.
*/
const CSV_OCT = [
  'INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE',
  '1.000,00;500,00;-300,00;1.200,00',
  '',
  'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
  '05-10-2024;Liquidación de dinero;111;500,00;1.500,00',
  '20-10-2024;Impuesto por extracción;222;-300,00;1.200,00',
].join('\n');

const CSV_NOV = [
  'INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE',
  '1.200,00;100,00;0,00;1.300,00',
  '',
  'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
  '03-11-2024;Liquidación de dinero;333;100,00;1.300,00',
].join('\n');

describe('consolidarArchivos — varios extractos en un lote', () => {
  // Los nombres están elegidos para que el orden alfabético dé el orden CONTRARIO
  // al cronológico: si esto pasa ordenando por nombre, el test falla.
  const elegidos = [
    { nombre: 'account_statement-aaa.csv', texto: CSV_NOV },
    { nombre: 'account_statement-zzz.csv', texto: CSV_OCT },
  ];

  it('🔒 ordena por el primer movimiento, no por el nombre del archivo', () => {
    const { resumenes } = consolidarArchivos(elegidos);
    expect(resumenes.map((r) => r.nombre)).toEqual([
      'account_statement-zzz.csv',
      'account_statement-aaa.csv',
    ]);
  });

  it('🔒 renumera los índices de corrido: por archivo se pisarían', () => {
    const { filas } = consolidarArchivos(elegidos);
    expect(filas.map((f) => f.indice)).toEqual([0, 1, 2]);
    expect(filas.map((f) => f.fecha)).toEqual(['2024-10-05', '2024-10-20', '2024-11-03']);
  });

  it('lleva el archivo de origen en cada fila, para poder señalarlo', () => {
    const { filas } = consolidarArchivos(elegidos);
    expect(filas[0].archivo).toBe('account_statement-zzz.csv');
    expect(filas[2].archivo).toBe('account_statement-aaa.csv');
  });

  it('🔒 detecta el mismo extracto elegido dos veces', () => {
    const { filas } = consolidarArchivos([
      { nombre: 'octubre.csv', texto: CSV_OCT },
      { nombre: 'octubre (1).csv', texto: CSV_OCT },
    ]);
    const sanas = filas.filter((f) => !f.problema);
    expect(sanas).toHaveLength(2);
    expect(filas.filter((f) => f.problema)).toHaveLength(2);
    // Cuál de los dos archivos queda como el bueno lo decide el desempate por
    // nombre y da igual; lo que importa es que sobreviva UNO SOLO entero y que
    // el aviso señale cuál, para que la persona sepa qué archivo sacar.
    expect(new Set(sanas.map((f) => f.archivo)).size).toBe(1);
    expect(filas[2].problema).toContain(sanas[0].archivo);
  });

  it('NO marca una referencia repetida dentro de un mismo archivo', () => {
    // Ahí sí puede ser legítima, y marcarla dejaría afuera un movimiento real.
    const dosIguales = [
      'RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE',
      '05-10-2024;Comisión;111;-10,00;90,00',
      '05-10-2024;Comisión;111;-10,00;80,00',
    ].join('\n');
    const { filas } = consolidarArchivos([{ nombre: 'x.csv', texto: dosIguales }]);
    expect(filas.every((f) => !f.problema)).toBe(true);
  });

  it('dice de qué archivo es cada error', () => {
    const { errores } = consolidarArchivos([{ nombre: 'roto.csv', texto: 'una;cosa\n1;2' }]);
    expect(errores[0]).toMatch(/^roto\.csv: /);
  });

  it('lo consolidado alimenta la verificación de cadena sin retoques', () => {
    const { resumenes } = consolidarArchivos(elegidos);
    expect(verificarCadena(resumenes).ok).toBe(true);
  });
});

describe('anterioresA — el corte por fecha de inicio del destino', () => {
  const { filas } = consolidarArchivos([
    { nombre: 'oct.csv', texto: CSV_OCT },
    { nombre: 'nov.csv', texto: CSV_NOV },
  ]);

  it('🔒 marca lo que pasó antes de que el fondo existiera', () => {
    // El caso real: el fondo del convenio arranca el 10/10/2024 y el extracto de
    // octubre trae también movimientos de la etapa anterior.
    expect([...anterioresA(filas, '2024-10-10')]).toEqual([0]);
  });

  it('sin fecha de inicio no marca nada, en vez de marcar todo', () => {
    expect(anterioresA(filas, null).size).toBe(0);
  });

  it('no marca el movimiento del día mismo del inicio', () => {
    expect(anterioresA(filas, '2024-10-05').size).toBe(0);
  });
});

describe('delDiaDelInicio — el borde que la fecha sola no resuelve', () => {
  const { filas } = consolidarArchivos([{ nombre: 'oct.csv', texto: CSV_OCT }]);

  it('🔒 marca los movimientos del día del inicio, que `anterioresA` no ve', () => {
    // El caso real: el 10/10/2024 la cuenta hizo la transferencia de cierre del
    // convenio y pagó su impuesto, y RECIÉN DESPUÉS el resto pasó a ser el fondo.
    // El saldo inicial cargado ya está neto de esos dos: importarlos los cuenta
    // dos veces.
    expect([...anterioresA(filas, '2024-10-05')]).toEqual([]);
    expect([...delDiaDelInicio(filas, '2024-10-05')]).toEqual([0]);
  });

  it('no marca nada sin fecha de inicio', () => {
    expect(delDiaDelInicio(filas, null).size).toBe(0);
  });
});
