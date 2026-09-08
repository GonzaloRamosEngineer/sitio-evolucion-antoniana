// src/lib/comprobantes.js
//
// Adjuntar y quitar un comprobante, en un solo lugar.
//
// POR QUÉ ESTO SE EXTRAJO Y NO SE COPIÓ
//
// El mecanismo nació en `gastosApi.js` para los egresos. Cuando la migración
// 20260906120000 le dio comprobante también a los INGRESOS —porque un fondo de
// convenio o un subsidio se prueban con un documento, y la rendición se apoya en
// las dos columnas— la opción fácil era copiar las dos funciones a
// `aportesApi.js`.
//
// **Lo que no se puede copiar es el ORDEN, y el orden es lo único que importa
// acá.** Son dos reglas opuestas y las dos se aprendieron de `documentsApi`:
//
//  · Al SUBIR: primero el archivo, después la fila. Si la fila falla, se borra
//    el archivo. Al revés quedaría una fila apuntando a algo que no existe.
//  · Al QUITAR: primero la fila, después el archivo. Si la fila falla, el
//    archivo sigue ahí y no pasa nada. Al revés quedaría una fila prometiendo
//    un comprobante que ya se borró — **y esa es la peor de las dos**, porque se
//    ve como un comprobante válido hasta que alguien lo intenta abrir.
//
// Con dos copias, la segunda invierte uno de los dos órdenes tarde o temprano y
// nadie lo nota hasta que hace falta el comprobante. Acá está escrito una vez.
//
// El bucket es el privado de la Comisión: sus policies ya exigen
// `is_board_member()`, así que esto no agrega ni una policy de storage.
import { supabase } from '@/lib/supabase';

export const BUCKET_COMPROBANTES = 'comision-docs';

/**
 * Nombre de archivo sin sorpresas: todo lo que no sea letra, dígito, punto,
 * guion o guion bajo pasa a `_`.
 *
 * Es el mismo que venía usando `gastosApi` desde 20260816150000, movido acá sin
 * tocarlo. Se probó "mejorarlo" quitando acentos con un rango de diacríticos
 * combinantes y se descartó: metía caracteres crudos en una expresión regular a
 * cambio de nada, porque `\w` ya los descarta.
 *
 * Lo que de verdad evita: una barra en el nombre crea una carpeta fantasma
 * dentro del bucket y el archivo aparece donde nadie lo busca.
 */
export const nombreSeguro = (name) => (name || 'archivo').replace(/[^\w.-]+/g, '_');

/**
 * Sube el archivo y recién después lo registra en la fila.
 *
 * @param {object} opts
 * @param {string} opts.prefijo    Carpeta dentro del bucket: 'gastos' | 'aportes'.
 * @param {string} opts.id         Id de la fila dueña del comprobante.
 * @param {File}   opts.file       El archivo.
 * @param {(campos: object) => Promise<{data: any, error: any}>} opts.actualizar
 *        Cómo se guarda en SU tabla. Es lo único que cambia entre gastos y aportes.
 */
export const adjuntarComprobante = async ({ prefijo, id, file, actualizar }) => {
  const path = `${prefijo}/${id}/${crypto.randomUUID()}-${nombreSeguro(file.name)}`;

  const { error: errSubida } = await supabase.storage
    .from(BUCKET_COMPROBANTES)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (errSubida) return { data: null, error: errSubida };

  const resultado = await actualizar({
    comprobante_path: path,
    comprobante_nombre: file.name,
    comprobante_mime: file.type || null,
    comprobante_size: file.size,
  });

  // Sin esta limpieza el bucket junta archivos huérfanos que nadie sabe a qué
  // fila pertenecían.
  if (resultado.error) {
    await supabase.storage.from(BUCKET_COMPROBANTES).remove([path]);
  }

  return resultado;
};

/** Desvincula primero, borra después. Ver el encabezado: el orden es al revés del de arriba. */
export const desadjuntarComprobante = async ({ path, actualizar }) => {
  const resultado = await actualizar({
    comprobante_path: null,
    comprobante_nombre: null,
    comprobante_mime: null,
    comprobante_size: null,
  });
  if (resultado.error) return resultado;

  if (path) {
    await supabase.storage.from(BUCKET_COMPROBANTES).remove([path]);
  }
  return resultado;
};

/**
 * Qué clase de respaldo documental es. Los `value` coinciden con el CHECK de la
 * base (`aportes_tipo_comprobante_chk` / `gastos_tipo_comprobante_chk`).
 *
 * ⚠️ NO HAY 'factura A' / 'factura B' / 'factura C' A PROPÓSITO: esa
 * clasificación es de la normativa argentina y el esquema no puede asumir un
 * país (ROADMAP §10.9). La letra, el punto de venta y el CAE son datos del
 * documento y van en `comprobante_numero`, que es texto libre justamente porque
 * su formato cambia por jurisdicción.
 */
export const TIPOS_COMPROBANTE = [
  { value: 'factura', label: 'Factura' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'escritura', label: 'Escritura / certificación notarial' },
  { value: 'transferencia', label: 'Comprobante de transferencia' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'extracto', label: 'Extracto de cuenta' },
  { value: 'otro', label: 'Otro' },
];

export const describirTipoComprobante = (tipo) =>
  TIPOS_COMPROBANTE.find((t) => t.value === tipo)?.label ?? null;

/**
 * Cómo se muestra el respaldo de una fila, en una sola frase.
 *
 * POR QUÉ ESTO IMPORTA Y NO ES COSMÉTICA. Sin declarar el tipo, todo es «un
 * comprobante» y se asume que todo son facturas. Cuando alguien mira y descubre
 * que aquel gasto tenía un recibo simple, lo que se rompe no es el recibo: es
 * haberlo dejado implícito. Decir «Recibo N° 0001» es más creíble que no decir
 * nada, no menos.
 */
export const describirComprobante = (fila) => {
  if (!fila?.tiene_comprobante && !fila?.tipo_comprobante) return 'Sin comprobante';
  const tipo = describirTipoComprobante(fila.tipo_comprobante) ?? 'Comprobante';
  const numero = fila.comprobante_numero ? ` N° ${fila.comprobante_numero}` : '';
  const archivo = fila.tiene_comprobante ? '' : ' (declarado, sin archivo adjunto)';
  return `${tipo}${numero}${archivo}`;
};
