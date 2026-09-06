// src/lib/importarMovimientos.js
//
// Convertir un extracto pegado en filas del libro — ROADMAP §14.2.
//
// POR QUÉ ESTE ARCHIVO EXISTE
//
// La maquinaria de rendición está desplegada desde el 2026-08-16 y al 2026-09-06
// tenía **cero gastos cargados**. No falló el código: cargar a mano no escala. La
// Fundación tiene extractos de MercadoPago de octubre de 2024 hasta hoy —23
// meses— con impuestos y comisiones incluidos. Eso no se carga de a uno nunca.
//
// LA REGLA QUE ORDENA TODO ESTE MÓDULO: **el importador PROPONE, la persona
// CONFIRMA.** Acá no se escribe nada en la base. Estas funciones son puras:
// reciben texto y devuelven filas propuestas, con lo que dedujeron y por qué.
// Quien decide mira la previsualización y destilda lo que no va.
//
// Es la misma decisión que en `reclamar_donaciones()` (§10.19): un mecanismo que
// interpreta datos ajenos no puede además ejecutar solo. Acá el costo de
// equivocarse no es de seguridad sino contable, y es igual de caro: una
// rendición mal cargada se descubre cuando alguien la cruza con el extracto.

/* ============================
   Números y fechas
   ============================ */

/**
 * `$ -937.776,27` -> -937776.27
 *
 * ⚠️ El formato es el argentino: **punto para miles, coma para decimales**. Un
 * `parseFloat` directo sobre "937.776,27" devuelve **937.776**, y el error no se
 * nota — es un número plausible, mil veces más chico. De los errores posibles al
 * importar un extracto, este es el que menos se ve y más ensucia.
 */
export const aNumero = (texto) => {
  if (typeof texto === 'number') return texto;
  const limpio = String(texto ?? '')
    .replace(/\s/g, '')
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  // ⚠️ `Number('')` es 0, no NaN. Sin esta guarda una celda de importe vacía se
  // convierte en un cero silencioso en vez de en "no se entendió", y un gasto de
  // $0 entra al libro sin que nada avise. Lo atrapó un test.
  if (limpio === '' || limpio === '-') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
};

/** `01-10-2024` o `2024-10-01` -> `2024-10-01`. Devuelve null si no entiende. */
export const aFechaISO = (texto) => {
  const t = String(texto ?? '').trim();

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD-MM-YYYY o DD/MM/YYYY. El orden día-mes es el del extracto argentino; leerlo
  // como mes-día daría fechas válidas y equivocadas, que es lo peor.
  const dmy = t.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  return null;
};

/* ============================
   Clasificación
   ============================ */

/**
 * Reglas para deducir qué es cada movimiento, en orden: gana la primera que
 * matchea.
 *
 * ⚠️ SON HEURÍSTICAS, NO VERDADES. Existen para que la persona destilde tres
 * filas en vez de escribir cuatrocientas, y la previsualización muestra siempre
 * lo que dedujo para que se pueda corregir. Ninguna regla decide sola.
 *
 * Van como DATO y no como cadena de `if` para que agregar el vocabulario de otro
 * banco sea una fila más — que es lo que hace a esto reutilizable fuera de
 * MercadoPago (§10.9: lo que varía va en datos).
 */
export const REGLAS = [
  {
    patron: /impuesto|percepci[oó]n|retenci[oó]n|iva/i,
    categoria: 'Comisiones e impuestos',
    // Los "gastos hormiga": chicos de a uno, pesados en volumen. Agrupados bajo
    // una categoría propia, la rendición los suma en un renglón en vez de
    // enterrar los gastos que la gente quiere ver.
  },
  { patron: /comisi[oó]n|cargo por|costo de/i, categoria: 'Comisiones e impuestos' },
  { patron: /d[eé]bito por deuda|factura vencida|facturas vencidas/i, categoria: 'Deudas y regularizaciones' },
  { patron: /transferencia enviada/i, categoria: 'Transferencias enviadas', tomarContraparte: true },
  { patron: /transferencia recibida/i, categoria: 'Transferencias recibidas', tomarContraparte: true },
  { patron: /liquidaci[oó]n de dinero|acreditaci[oó]n/i, categoria: 'Cobros liquidados' },
];

/**
 * El nombre que viene después del tipo de movimiento.
 * «Transferencia enviada Centro Juventud Antoniana» -> «Centro Juventud Antoniana»
 */
const contraparte = (descripcion) =>
  String(descripcion ?? '')
    .replace(/^.*?transferencia (enviada|recibida)\s*/i, '')
    .trim() || null;

export const clasificar = (descripcion) => {
  for (const regla of REGLAS) {
    if (regla.patron.test(descripcion ?? '')) {
      return {
        categoria: regla.categoria,
        contraparte: regla.tomarContraparte ? contraparte(descripcion) : null,
      };
    }
  }
  return { categoria: null, contraparte: null };
};

/* ============================
   La clave de idempotencia
   ============================ */

/**
 * `mp:90165423466:-5626.66`
 *
 * ⚠️ POR QUÉ LLEVA EL MONTO Y NO ES SOLO EL ID. En el extracto de MercadoPago
 * **el impuesto comparte el id de operación con la transferencia que lo generó**:
 *
 *     10-10-2024  Transferencia enviada Centro Juventud Antoniana  90165423466  -937.776,27
 *     10-10-2024  Impuesto por extracción                          90165423466    -5.626,66
 *
 * Con la clave siendo solo el id, el segundo se rechazaría como duplicado y **el
 * impuesto no entraría nunca** — un gasto que desaparece en silencio, que es
 * peor que uno duplicado porque nadie lo busca.
 */
export const referenciaDe = (fuente, id, monto) =>
  `${fuente}:${String(id ?? '').trim()}:${Number(monto).toFixed(2)}`;

/* ============================
   El parseo
   ============================ */

/** Separador dominante de la primera línea con datos: tab, punto y coma o coma. */
const detectarSeparador = (lineas) => {
  const muestra = lineas.slice(0, 5).join('\n');
  const cuenta = (c) => (muestra.match(new RegExp(`\\${c}`, 'g')) || []).length;
  const tabs = cuenta('\t');
  const puntoYComa = cuenta(';');
  // La coma va última a propósito: en un extracto argentino aparece dentro de
  // CADA importe («937.776,27»), así que gana por cantidad sin ser el separador.
  if (tabs >= puntoYComa && tabs > 0) return '\t';
  if (puntoYComa > 0) return ';';
  return ',';
};

const partir = (linea, sep) => {
  // Respeta comillas: un concepto con el separador adentro no parte la fila.
  const campos = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i += 1) {
    const c = linea[i];
    if (c === '"') {
      entreComillas = !entreComillas;
    } else if (c === sep && !entreComillas) {
      campos.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos.map((c) => c.trim());
};

/**
 * Nombres de columna que se reconocen, por rol.
 *
 * ⚠️ **Los del CSV real de MercadoPago están EN INGLÉS**, aunque el PDF del mismo
 * resumen esté en castellano. Comprobado contra el archivo del período
 * 10/2024 el 2026-09-06:
 *
 *     RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE
 *
 * La primera versión de estos patrones era solo castellana y **no reconocía ni
 * la descripción ni el id** — que es justo el que da la idempotencia. El
 * importador habría cargado todo sin referencia y reimportar habría duplicado.
 */
const COLUMNAS = {
  fecha: /^fecha|date/i,
  descripcion: /^descripci|detalle|concepto|description|transaction_type/i,
  id: /^id\b|operaci[oó]n|operation|referencia|reference/i,
  monto: /^valor|monto|importe|amount/i,
  saldo: /^saldo|balance/i,
};

/**
 * Encabezado del bloque de totales que MercadoPago pone ARRIBA del de movimientos:
 *
 *     INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE
 *     1.698.607,63;244.795,30;-1.022.151,63;921.251,30
 *
 *     RELEASE_DATE;TRANSACTION_TYPE;...
 *
 * No es ruido a saltear: **son los totales declarados por el banco**, y compararlos
 * contra la suma de lo que uno extrajo es una verificación gratis que no depende
 * de que le creamos al parser (ROADMAP §14.3).
 */
const TOTALES = {
  saldoInicial: /initial_balance|saldo.?inicial/i,
  entradas: /^credits|entradas/i,
  salidas: /^debits|salidas/i,
  saldoFinal: /final_balance|saldo.?final/i,
};

/**
 * Parsea el texto pegado a filas propuestas.
 *
 * @returns {{filas: Array, columnas: object, errores: string[]}}
 *
 * NO TIRA NUNCA. Una línea que no se entiende se devuelve marcada con su motivo
 * en vez de romper el lote: con cuatrocientos movimientos, cortar en el primero
 * raro obliga a limpiar el archivo a ciegas.
 */
export const parsearExtracto = (texto, { fuente = 'mp' } = {}) => {
  const lineas = String(texto ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lineas.length) return { filas: [], columnas: {}, errores: ['No se pegó nada.'] };

  const sep = detectarSeparador(lineas);

  // ¿La primera línea es el bloque de totales? Si sí, se guarda y el bloque de
  // movimientos empieza más abajo.
  let declarado = null;
  let desde = 0;
  const primera = partir(lineas[0], sep);
  if (primera.some((c) => TOTALES.saldoInicial.test(c))) {
    const valores = partir(lineas[1] ?? '', sep);
    declarado = {};
    primera.forEach((nombre, i) => {
      for (const [clave, patron] of Object.entries(TOTALES)) {
        if (patron.test(nombre)) declarado[clave] = aNumero(valores[i]);
      }
    });
    // El encabezado de movimientos es la siguiente línea que tenga una columna de
    // fecha. Buscarlo así, y no asumir "línea 3", aguanta que MercadoPago agregue
    // o saque una fila entre los dos bloques.
    desde = lineas.findIndex((l, i) => i > 1 && partir(l, sep).some((c) => COLUMNAS.fecha.test(c)));
    if (desde < 0) return { filas: [], columnas: {}, declarado, errores: ['No se encontró el bloque de movimientos.'] };
  }

  const cabecera = partir(lineas[desde], sep);

  const columnas = {};
  cabecera.forEach((nombre, i) => {
    for (const [rol, patron] of Object.entries(COLUMNAS)) {
      if (columnas[rol] === undefined && patron.test(nombre)) columnas[rol] = i;
    }
  });

  const errores = [];
  const faltan = ['fecha', 'monto'].filter((r) => columnas[r] === undefined);
  if (faltan.length) {
    errores.push(
      `No se reconocieron las columnas: ${faltan.join(', ')}. ` +
        'La primera línea tiene que ser el encabezado del extracto.'
    );
    return { filas: [], columnas, declarado, errores };
  }

  const filas = lineas.slice(desde + 1).map((linea, indice) => {
    const campos = partir(linea, sep);
    const monto = aNumero(campos[columnas.monto]);
    const fecha = aFechaISO(campos[columnas.fecha]);
    const descripcion = columnas.descripcion !== undefined ? campos[columnas.descripcion] : '';
    const id = columnas.id !== undefined ? campos[columnas.id] : '';

    const base = { indice, linea, descripcion, id };

    if (monto === null || monto === 0) {
      return { ...base, problema: 'No se entendió el importe, o es cero.' };
    }
    if (!fecha) {
      return { ...base, problema: 'No se entendió la fecha.' };
    }
    if (!id) {
      // Sin id no hay clave de idempotencia, y sin clave reimportar duplica. Se
      // deja entrar igual, marcado: a veces el extracto no la trae y cargarlo a
      // mano después es peor. Pero la persona tiene que saberlo.
      return {
        ...base,
        fecha,
        monto,
        ...clasificar(descripcion),
        tipo: monto > 0 ? 'aporte' : 'gasto',
        referencia: null,
        aviso: 'Sin id de operación: si reimportás este período, esta fila se va a duplicar.',
      };
    }

    return {
      ...base,
      fecha,
      monto,
      saldo: columnas.saldo !== undefined ? aNumero(campos[columnas.saldo]) : null,
      ...clasificar(descripcion),
      // El signo decide, y es lo único que decide: plata que entra es un aporte,
      // plata que sale es un gasto. No hay heurística que pueda mejorar eso.
      tipo: monto > 0 ? 'aporte' : 'gasto',
      referencia: referenciaDe(fuente, id, monto),
    };
  });

  return { filas, columnas, declarado, errores };
};

/* ============================
   Las verificaciones (§14.3)
   ============================
   Las tres salen de datos que el propio resumen trae. No dependen de que le
   creamos al parser: son la forma de que un cambio de formato se convierta en un
   aviso claro en vez de en datos silenciosamente mal cargados. */

/**
 * Nivel 1 — el saldo corrido.
 *
 * Cada fila trae el saldo que quedó después de ella. Recalcularlo y compararlo
 * atrapa **el error más peligroso de todos**: un importe mal leído. Es peligroso
 * porque es plausible — `937.776,27` interpretado como `937,78` es un número que
 * nadie mira dos veces, y arrastra la rendición entera.
 */
export const verificarSaldoCorrido = (filas, saldoInicial) => {
  if (saldoInicial == null) return null;
  let saldo = saldoInicial;
  const desvios = [];
  for (const f of filas) {
    if (f.problema || f.monto == null) continue;
    saldo += f.monto;
    if (f.saldo != null && Math.abs(saldo - f.saldo) > 0.01) {
      desvios.push({ fila: f, calculado: saldo, declarado: f.saldo });
      saldo = f.saldo; // se resincroniza para no arrastrar el desvío a todas las siguientes
    }
  }
  return { ok: desvios.length === 0, desvios, saldoFinal: saldo };
};

/**
 * Nivel 2 — los totales del encabezado.
 *
 * Atrapa una fila que se perdió o se duplicó al parsear: el saldo corrido puede
 * cerrar y aun así faltar un movimiento si el archivo venía cortado.
 */
export const verificarTotales = (filas, declarado) => {
  if (!declarado) return null;
  const utiles = filas.filter((f) => !f.problema && f.monto != null);
  const entradas = utiles.filter((f) => f.monto > 0).reduce((s, f) => s + f.monto, 0);
  const salidas = utiles.filter((f) => f.monto < 0).reduce((s, f) => s + f.monto, 0);

  const cerca = (a, b) => a == null || b == null || Math.abs(a - b) < 0.01;
  return {
    ok: cerca(entradas, declarado.entradas) && cerca(salidas, declarado.salidas),
    entradas: { extraido: entradas, declarado: declarado.entradas },
    salidas: { extraido: salidas, declarado: declarado.salidas },
  };
};

/**
 * Nivel 3 — la cadena entre resúmenes.
 *
 * El saldo final de un mes tiene que ser el inicial del siguiente. **Atrapa un mes
 * que falta**, que con 23 archivos es el error probable — y el único que ninguna
 * verificación dentro de un archivo puede ver.
 *
 * @param {Array<{nombre: string, declarado: object}>} resumenes en orden cronológico
 */
export const verificarCadena = (resumenes) => {
  const huecos = [];
  for (let i = 1; i < resumenes.length; i += 1) {
    const previo = resumenes[i - 1]?.declarado;
    const actual = resumenes[i]?.declarado;
    if (!previo || !actual) continue;
    if (Math.abs((previo.saldoFinal ?? 0) - (actual.saldoInicial ?? 0)) > 0.01) {
      huecos.push({
        entre: [resumenes[i - 1].nombre, resumenes[i].nombre],
        cierra: previo.saldoFinal,
        abre: actual.saldoInicial,
        diferencia: (actual.saldoInicial ?? 0) - (previo.saldoFinal ?? 0),
      });
    }
  }
  return { ok: huecos.length === 0, huecos };
};

/** Resumen del lote, para decidir sin contar a mano. */
export const resumirLote = (filas, yaCargadas = new Set()) => {
  const utiles = filas.filter((f) => !f.problema);
  const nuevas = utiles.filter((f) => !f.referencia || !yaCargadas.has(f.referencia));
  const aportes = nuevas.filter((f) => f.tipo === 'aporte');
  const gastos = nuevas.filter((f) => f.tipo === 'gasto');

  return {
    total: filas.length,
    conProblema: filas.length - utiles.length,
    duplicadas: utiles.length - nuevas.length,
    aportes: aportes.length,
    gastos: gastos.length,
    montoAportes: aportes.reduce((s, f) => s + f.monto, 0),
    // En valor absoluto: un gasto viene negativo del extracto y "total gastos:
    // -$78.748" se lee mal al lado de "total aportes: $1.000.000".
    montoGastos: Math.abs(gastos.reduce((s, f) => s + f.monto, 0)),
  };
};
