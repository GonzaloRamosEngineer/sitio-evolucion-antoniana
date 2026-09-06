// src/api/gastosApi.js
// Capa de datos de `gastos` — la mitad que faltaba del libro (ROADMAP §10.9,
// migración 20260816150000).
// Contrato único: devuelve `{ data, error }` y NO lanza (ver `src/lib/dataResult.js`).
//
// LO QUE ESTE MÓDULO HACE POSIBLE, EN UNA LÍNEA
// Hasta fase 1 había recaudación con destino declarado. Con esto hay rendición:
//
//     saldo(destino) = monto_recaudado − monto_rendido
//
// DOS REGLAS QUE NO SON DE ESTA CAPA SINO DEL MODELO, Y QUE LA UI TIENE QUE RESPETAR
//
//  1. **Publicar un gasto lo publica entero**: concepto, monto, fecha,
//     categoría, proveedor y notas. No hay publicación por columna. La regla
//     que se sigue de eso es simple: lo que no pueda ser público no se escribe
//     en un gasto.
//  2. **El comprobante NO se publica nunca**, ni siquiera con el gasto
//     publicado: una factura trae CUIT, domicilio y a veces la firma de un
//     tercero. Vive en el bucket privado `comision-docs`, cuyas policies ya
//     exigen `is_board_member()`. Lo que sí ve el público es
//     `tiene_comprobante`, para que la ausencia sea visible en vez de invisible.
import { supabase } from '@/lib/supabase';
import { listResult, rowResult, attempt } from '@/lib/dataResult';
import {
  BUCKET_COMPROBANTES, adjuntarComprobante, desadjuntarComprobante,
} from '@/lib/comprobantes';

// Se reusa el bucket de la Comisión en vez de crear uno nuevo: sus cuatro
// policies ya restringen todo a la comisión, así que el comprobante queda
// protegido sin escribir una policy de storage más.
const BUCKET = BUCKET_COMPROBANTES;
const PREFIJO = 'gastos';

/** Fecha de hoy en `YYYY-MM-DD`, que es lo que espera un `<input type="date">`. */
export const hoyISO = () => new Date().toISOString().slice(0, 10);

/**
 * Validación de un gasto, en el mismo orden que los CHECK de la base.
 * La base sigue siendo la que manda: esto es UX, no la frontera de seguridad.
 */
export const validarGasto = (f) => {
  const errores = {};

  if (!f.destino_id) errores.destino_id = 'Elegí de qué destino sale este gasto.';
  if (!f.concepto.trim()) errores.concepto = 'Poné en qué se gastó.';

  // Espeja el CHECK `monto > 0`.
  if (f.monto === '' || Number(f.monto) <= 0 || Number.isNaN(Number(f.monto))) {
    errores.monto = 'Poné un monto mayor a cero.';
  }

  if (!f.fecha) errores.fecha = 'Poné la fecha del gasto.';

  return errores;
};

/** Convierte el formulario a payload. Los vacíos van como null, nunca como ''. */
export const aPayloadGasto = (f) => ({
  destino_id: f.destino_id,
  concepto: f.concepto.trim(),
  monto: Number(f.monto),
  fecha: f.fecha,
  categoria: f.categoria.trim() || null,
  // Declarar QUÉ clase de comprobante es (20260906120000). Vacío -> null:
  // no declararlo es válido y distinto de declarar 'otro'.
  tipo_comprobante: f.tipo_comprobante || null,
  comprobante_numero: (f.comprobante_numero || '').trim() || null,
  proveedor: f.proveedor.trim() || null,
  notas: f.notas.trim() || null,
  publicado: Boolean(f.publicado),
});

/**
 * Gastos con el nombre de su destino.
 *
 * Las RLS deciden qué se ve, y acá está la diferencia con `aportes`: la comisión
 * ve todo, y cualquier otro —incluido `anon`— ve solo los gastos PUBLICADOS de
 * destinos ACTIVOS. La misma función sirve al panel y a la rendición pública
 * justamente porque el filtro no está acá.
 */
export const getGastos = async () =>
  listResult(
    await supabase
      .from('gastos')
      .select('*, destino:destinos(id, nombre, tipo, estado)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    'getGastos'
  );

export const createGasto = async (payload) =>
  rowResult(
    await supabase.from('gastos').insert(payload).select('*, destino:destinos(id, nombre, tipo, estado)').maybeSingle(),
    'createGasto'
  );

/**
 * Corrige un gasto.
 *
 * ⚠️ No existe `deleteGasto`, y no es un olvido: además de que `gastos` no tiene
 * el GRANT de DELETE, un libro contable no se borra. Un gasto mal cargado se
 * corrige y queda el rastro.
 */
export const updateGasto = async (id, payload) =>
  rowResult(
    await supabase
      .from('gastos')
      .update(payload)
      .eq('id', id)
      .select('*, destino:destinos(id, nombre, tipo, estado)')
      .maybeSingle(),
    'updateGasto'
  );

/** Publicar / despublicar. Separado del update general porque es OTRA decisión:
 *  corregir un dato es interno, publicarlo es un acto hacia afuera. */
export const setPublicado = async (id, publicado) =>
  rowResult(
    await supabase
      .from('gastos')
      .update({ publicado })
      .eq('id', id)
      .select('*, destino:destinos(id, nombre, tipo, estado)')
      .maybeSingle(),
    'setPublicado'
  );

/* ============================
   Comprobante
   ============================ */
/**
 * Adjunta el comprobante de un gasto.
 *
 * El mecanismo —y sobre todo el ORDEN de las operaciones, que es lo único
 * delicado— vive en `src/lib/comprobantes.js` desde que los INGRESOS también
 * pueden llevar comprobante (20260906120000). Acá queda solo lo que es propio
 * de un gasto: en qué tabla se guarda.
 */
export const subirComprobante = async ({ gastoId, file }) =>
  adjuntarComprobante({
    prefijo: PREFIJO,
    id: gastoId,
    file,
    actualizar: (campos) => updateGasto(gastoId, campos),
  });

/** Quita el comprobante de un gasto. Ver la nota de arriba. */
export const quitarComprobante = async (gasto) =>
  desadjuntarComprobante({
    path: gasto.comprobante_path,
    actualizar: (campos) => updateGasto(gasto.id, campos),
  });

/** URL firmada temporal (10 min) del comprobante. Solo funciona para la comisión. */
export const urlComprobante = async (filePath, opts) =>
  attempt(async () => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 600, opts);
    if (error) throw error;
    return data?.signedUrl ?? null;
  }, 'urlComprobante');

/* ============================
   Rendición
   ============================ */
/**
 * Balance de un destino. Se calcula acá y no en la base porque un tercer
 * contador desnormalizado sería un tercer lugar donde desincronizarse.
 *
 * ⚠️ `monto_rendido` cuenta SOLO los gastos publicados, así que para el público
 * el saldo siempre cierra con la lista de gastos que puede ver. Para la comisión
 * ese número no es "lo gastado": es "lo rendido". Verlos distintos es
 * información útil, no un error.
 */
export const balanceDestino = (destino) => {
  const recaudado = Number(destino?.monto_recaudado) || 0;
  const rendido = Number(destino?.monto_rendido) || 0;
  return {
    recaudado,
    rendido,
    saldo: recaudado - rendido,
    // Qué porcentaje de lo recaudado ya tiene rendición. Es la métrica que
    // responde "¿en qué se gastó mi plata?" mejor que el saldo solo.
    porcentajeRendido: recaudado > 0 ? Math.min(100, Math.round((rendido / recaudado) * 100)) : null,
  };
};
