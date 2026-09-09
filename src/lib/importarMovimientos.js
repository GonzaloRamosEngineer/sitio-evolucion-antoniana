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

/**
 * La descripción del banco SIN el nombre de la contraparte.
 *
 * ⚠️ POR QUÉ ESTO NO ES COSMÉTICA. `gastos` tiene lectura pública de las filas
 * publicadas, y publicar un gasto **lo publica entero** — concepto, categoría,
 * proveedor y notas. La migración `20260816150000` dejó la regla escrita:
 *
 *     lo que no pueda ser público NO se escribe en un gasto.
 *
 * El importador la estaba violando: metía la descripción literal del extracto
 * como `concepto` y la contraparte como `proveedor`, así que «Transferencia
 * enviada Maria Alejandra Torrado» quedaba a un click de ser público, con el
 * nombre repetido en los dos campos. Con 23 meses de extractos eso son cientos
 * de filas, y basta que alguien publique una sin leerla.
 *
 * El nombre no se pierde: `referencia_externa` (`mp:<id>:<monto>`) apunta a la
 * línea exacta del extracto, que es el respaldo documental de todos modos.
 *
 * `aportes` es otra historia y por eso ahí sí se guarda el nombre: **no tiene
 * policy de lectura pública**, solo el propio aportante y la comisión.
 */
export const conceptoGenerico = (descripcion, contraparte) => {
  const d = String(descripcion ?? '').trim();
  if (!contraparte) return d;
  const sin = d.endsWith(contraparte) ? d.slice(0, -contraparte.length).trim() : d;
  // Si sacar el nombre deja la cadena vacía, se devuelve la original: un concepto
  // en blanco es peor que uno con nombre, porque la fila deja de ser legible y
  // `concepto` es NOT NULL.
  return sin || d;
};

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
      const clase = clasificar(descripcion);
      return {
        ...base,
        fecha,
        monto,
        ...clase,
        concepto: conceptoGenerico(descripcion, clase.contraparte),
        tipo: monto > 0 ? 'aporte' : 'gasto',
        referencia: null,
        aviso: 'Sin id de operación: si reimportás este período, esta fila se va a duplicar.',
      };
    }

    const clase = clasificar(descripcion);
    return {
      ...base,
      fecha,
      monto,
      saldo: columnas.saldo !== undefined ? aNumero(campos[columnas.saldo]) : null,
      ...clase,
      // Sin el nombre de la contraparte: es lo que va a `gastos.concepto`, que es
      // público en cuanto alguien publica la fila. Ver `conceptoGenerico`.
      concepto: conceptoGenerico(descripcion, clase.contraparte),
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

/* ============================
   Varios archivos de una vez (§14.3)
   ============================ */

/** La fecha del primer movimiento que se entendió. Sirve para ordenar archivos. */
const primeraFecha = (filas) => filas.find((f) => f.fecha)?.fecha ?? null;

const cercaDe = (a, b) => a != null && b != null && Math.abs(a - b) < 0.01;

/**
 * Ordena los resúmenes cronológicamente.
 *
 * ⚠️ NO ALCANZA CON ORDENAR POR FECHA, Y LO DESCUBRIÓ UN CASO REAL.
 *
 * Un mes puede no tener **ningún** movimiento —pasó tres veces en los 22
 * resúmenes de la Fundación: 02/2025, 03/2025 y 05/2025—. Sin movimientos no hay
 * fecha que leer, y el archivo **no trae el período en ninguna parte**: el bloque
 * de totales sólo tiene saldos. Ordenando por fecha, esos tres se iban al
 * principio y la verificación de cadena reportaba **dos huecos que no existían**.
 *
 * La salida es que un mes vacío **abre y cierra con el mismo saldo**, así que se
 * ubica solo: va donde el mes anterior cerró con ese número. Se encadena por
 * saldo, que es un dato que el archivo sí trae siempre.
 *
 * Si alguno no encaja en ninguna parte, va al final **visible** en vez de
 * escondido: que la cadena lo marque es la respuesta correcta, no acomodarlo.
 */
const ordenarResumenes = (resumenes) => {
  const conFecha = resumenes
    .filter((r) => r.desde)
    .sort((a, b) => a.desde.localeCompare(b.desde) || a.nombre.localeCompare(b.nombre));
  const sinFecha = resumenes.filter((r) => !r.desde);

  const orden = [];
  const encajarVacios = (saldo) => {
    let i = sinFecha.findIndex((v) => cercaDe(v.declarado?.saldoInicial, saldo));
    while (i >= 0) {
      orden.push(sinFecha.splice(i, 1)[0]);
      // El saldo no se mueve: un mes vacío cierra donde abrió, así que dos
      // vacíos consecutivos encajan uno detrás del otro con el mismo número.
      i = sinFecha.findIndex((v) => cercaDe(v.declarado?.saldoInicial, saldo));
    }
  };

  // Un mes vacío puede estar antes del primero con movimientos.
  encajarVacios(conFecha[0]?.declarado?.saldoInicial);
  for (const r of conFecha) {
    orden.push(r);
    encajarVacios(r.declarado?.saldoFinal);
  }
  return [...orden, ...sinFecha];
};

/**
 * Junta varios extractos en un solo lote, ordenado cronológicamente.
 *
 * POR QUÉ ESTO NO ES "PARSEAR EN UN `for`". Hay 23 meses de extractos, y cargarlos
 * de a uno es la misma trampa que cargar movimientos de a uno: se abandona a la
 * mitad. Pero juntarlos trae **dos problemas que un archivo solo no tiene**, y
 * los dos se resuelven acá:
 *
 *  1. **El orden.** La verificación de cadena (nivel 3) compara el saldo final de
 *     un período contra el inicial del siguiente, así que sin ordenar da huecos
 *     falsos. Se ordena por el primer movimiento, **no por el nombre del
 *     archivo**: los de MercadoPago se llaman `account_statement-<uuid>.csv` y no
 *     dicen nada del período.
 *  2. **El mismo archivo elegido dos veces.** Con 23 archivos en un diálogo es
 *     cuestión de tiempo. Se detecta por `referencia` repetida **entre archivos
 *     distintos**: dos extractos son períodos disjuntos, así que un movimiento
 *     que aparece en dos es siempre el mismo archivo cargado dos veces.
 *     Repetida *dentro* de un archivo no se toca — ahí sí puede ser legítima.
 *
 * Los índices se renumeran de corrido: son la identidad de la fila en la
 * previsualización, y por archivo se pisarían entre sí.
 *
 * @param {Array<{nombre: string, texto: string}>} archivos
 */
export const consolidarArchivos = (archivos, opciones = {}) => {
  const resumenes = ordenarResumenes(
    archivos.map(({ nombre, texto }) => {
      const { filas, declarado, errores } = parsearExtracto(texto, opciones);
      return { nombre, filas, declarado, errores, desde: primeraFecha(filas) };
    })
  );

  const vistas = new Map(); // referencia -> archivo donde apareció primero
  const filas = [];
  resumenes.forEach((r) => {
    r.filas = r.filas.map((f) => {
      const fila = { ...f, indice: filas.length, archivo: r.nombre };
      const antes = fila.referencia ? vistas.get(fila.referencia) : null;
      if (antes && antes !== r.nombre) {
        fila.problema = `Este movimiento ya viene en «${antes}»: los dos archivos se pisan.`;
      } else if (fila.referencia && !antes) {
        vistas.set(fila.referencia, r.nombre);
      }
      filas.push(fila);
      return fila;
    });
  });

  return {
    resumenes,
    filas,
    // El nombre del archivo va adelante del error: con 23 archivos, "no se
    // reconocieron las columnas" sin decir de cuál no se puede accionar.
    errores: resumenes.flatMap((r) => r.errores.map((e) => `${r.nombre}: ${e}`)),
  };
};

/**
 * Los movimientos anteriores al inicio del destino.
 *
 * POR QUÉ IMPORTA. Un fondo restringido empieza un día concreto —el del convenio,
 * el de la resolución del subsidio— y el extracto del mes **trae también lo de
 * antes**. Al fondo del millón le entran así dos movimientos del 10/10/2024 que
 * son de la etapa anterior: imputados al fondo, la rendición muestra gastos que
 * ese fondo nunca hizo, que es exactamente lo que un fondo restringido tiene que
 * poder desmentir.
 *
 * Devuelve los índices para que la pantalla los **destilde sola**. No los bloquea:
 * la fecha de inicio puede estar mal cargada, y un dato de configuración no puede
 * impedir cargar un movimiento que existió.
 */
export const anterioresA = (filas, fechaISO) => {
  if (!fechaISO) return new Set();
  // Las fechas ISO se comparan como texto: `2024-10-09` < `2024-10-10`.
  return new Set(filas.filter((f) => f.fecha && f.fecha < fechaISO).map((f) => f.indice));
};

/**
 * Los movimientos del día mismo en que arranca el destino.
 *
 * ⚠️ POR QUÉ ESTO EXISTE APARTE DE `anterioresA`, Y POR QUÉ NO DESTILDA SOLO.
 *
 * `fecha_inicio` es una fecha, no un instante, y **un fondo puede arrancar a
 * mitad de un día**. Es el caso real del fondo del convenio: el 10/10/2024 la
 * cuenta hizo la transferencia de cierre y pagó su impuesto, y **recién después**
 * el saldo que quedó pasó a ser el fondo. Esos dos movimientos son de la etapa
 * anterior y comparten fecha con el primer día del fondo, así que `fecha < inicio`
 * no los alcanza — y encima son los peligrosos: el saldo inicial cargado ya está
 * neto de ellos, así que importarlos los contaría dos veces.
 *
 * Se marcan y no se destildan porque **el signo es ambiguo**: un movimiento del
 * día del inicio puede ser igual de bien el primero del fondo. Destildar de más
 * hace desaparecer un gasto en silencio, que es el error que este módulo entero
 * trata de no cometer; marcar obliga a mirar dos filas.
 */
export const delDiaDelInicio = (filas, fechaISO) => {
  if (!fechaISO) return new Set();
  return new Set(filas.filter((f) => f.fecha === fechaISO).map((f) => f.indice));
};
