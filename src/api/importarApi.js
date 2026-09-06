// src/api/importarApi.js
// Importación de movimientos de un extracto al libro — ROADMAP §14.2.
// Contrato único: devuelve `{ data, error }` y NO lanza (ver `src/lib/dataResult.js`).
//
// LO QUE ESTE MÓDULO NO DECIDE: nada. Qué es cada movimiento lo deduce
// `src/lib/importarMovimientos.js` (puro, testeado) y lo confirma una persona en
// la previsualización. Acá solo se escribe lo que ya se confirmó.
//
// ⚠️ LA GARANTÍA QUE IMPORTA, Y ESTÁ EN DOS CAPAS A PROPÓSITO:
//
//  1. La previsualización descarta lo ya cargado, para que la persona vea qué va
//     a entrar y qué se saltea. Es UX.
//  2. El INSERT usa `upsert` con `ignoreDuplicates`, así que **aunque la
//     previsualización se equivoque, o alguien apriete dos veces, o dos personas
//     importen el mismo período a la vez, no se duplica nada.** Es la garantía.
//
// Con solo la capa 1 —filtrar y después insertar— entre el filtro y el insert
// hay una ventana, y el segundo click cae justo ahí. Con solo la capa 2 la base
// no duplica pero la pantalla no puede decir de antemano qué va a pasar.
import { supabase } from '@/lib/supabase';
import { listResult } from '@/lib/dataResult';

/** Trocea un array. Un `insert` de 400 filas en una sola request es frágil. */
const enLotes = (items, tamano = 100) => {
  const lotes = [];
  for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
  return lotes;
};

/**
 * De un lote de referencias, cuáles ya están en el libro.
 *
 * Una llamada por tanda y no una por fila: cuatrocientas consultas son
 * cuatrocientos viajes y una pantalla que parece colgada.
 *
 * Se trocea porque desde que se pueden elegir varios extractos a la vez (§14.3)
 * esto ya no recibe un mes sino veintitrés: mandar miles de referencias en un
 * solo `text[]` es justo el tamaño de request que empieza a fallar por motivos
 * que no se ven desde acá.
 */
export const getReferenciasCargadas = async (referencias) => {
  const refs = (referencias ?? []).filter(Boolean);
  if (!refs.length) return { data: [], error: null };

  const encontradas = [];
  for (const lote of enLotes(refs, 500)) {
    const { data, error } = listResult(
      await supabase.rpc('referencias_ya_cargadas', { p_refs: lote }),
      'getReferenciasCargadas'
    );
    // Si una tanda falla se corta: seguir daría una lista incompleta de "ya
    // cargadas", y una lista incompleta hace que la previsualización PROMETA
    // insertar lo que la base va a saltear. Mejor decir que no se pudo.
    if (error) return { data: [], error };
    encontradas.push(...data);
  }
  return { data: encontradas, error: null };
};

/**
 * Escribe las filas confirmadas.
 *
 * @param {object} opts
 * @param {Array}  opts.filas     Las que la persona dejó tildadas.
 * @param {string} opts.destinoId A qué destino se imputa el lote.
 *
 * Devuelve `{ aportes, gastos, errores }` con lo que efectivamente entró.
 *
 * NO ES TRANSACCIONAL Y ESO ESTÁ ASUMIDO: si el lote 3 de 5 falla, los dos
 * primeros quedaron escritos. Es aceptable **porque la operación es idempotente**
 * — se vuelve a pegar el mismo extracto, lo ya cargado se saltea y entra el
 * resto. Envolver esto en una transacción exigiría una Edge Function y no
 * compraría nada que la idempotencia no dé ya.
 */
export const importarLote = async ({ filas, destinoId }) => {
  const errores = [];
  let aportes = 0;
  let gastos = 0;

  const aportesFilas = filas
    .filter((f) => f.tipo === 'aporte')
    .map((f) => ({
      destino_id: destinoId,
      // `manual` es lo único que la RLS deja insertar desde el panel: un aporte
      // que dice venir de una pasarela solo lo puede escribir el webhook con
      // `service_role` (§10.11). Un extracto NO es la pasarela: es lo que la
      // entidad leyó de su cuenta.
      origen: 'manual',
      monto: Math.abs(f.monto),
      fecha: f.fecha,
      nombre_aportante: f.contraparte || null,
      notas: f.descripcion || null,
      referencia_externa: f.referencia,
      carga_origen: 'importacion',
    }));

  const gastosFilas = filas
    .filter((f) => f.tipo === 'gasto')
    .map((f) => ({
      destino_id: destinoId,
      // El extracto trae los egresos en negativo y `gastos_monto_check` exige
      // positivo: el signo ya se usó para decidir que esto es un gasto, y
      // guardarlo negativo haría que la suma de la rendición se reste sola.
      monto: Math.abs(f.monto),
      fecha: f.fecha,
      concepto: f.descripcion || 'Movimiento sin descripción',
      categoria: f.categoria || null,
      proveedor: f.contraparte || null,
      referencia_externa: f.referencia,
      carga_origen: 'importacion',
      // ⚠️ `publicado: false`. Un extracto entra al libro pero NO se publica
      // solo: publicar un gasto lo publica entero —concepto, proveedor, notas— y
      // la descripción de un movimiento bancario puede traer el nombre de un
      // particular. Que alguien lo revise y lo publique es un acto aparte.
      publicado: false,
    }));

  // `listResult` y no `attempt`: `attempt` envuelve algo que LANZA (una Edge
  // Function, un fetch), y el cliente de Supabase no lanza — devuelve
  // `{ data, error }`. Pasárselo a `attempt` habría dado
  // `{ data: { data, error }, error: null }`: un error de la base que llega como
  // éxito, con `data.length` indefinido y un contador de filas siempre en 0.
  for (const lote of enLotes(aportesFilas)) {
    const { data, error } = listResult(
      await supabase
        .from('aportes')
        .upsert(lote, { onConflict: 'referencia_externa', ignoreDuplicates: true })
        .select('id'),
      'importarLote/aportes'
    );
    if (error) errores.push(error.message);
    else aportes += data.length;
  }

  for (const lote of enLotes(gastosFilas)) {
    const { data, error } = listResult(
      await supabase
        .from('gastos')
        .upsert(lote, { onConflict: 'referencia_externa', ignoreDuplicates: true })
        .select('id'),
      'importarLote/gastos'
    );
    if (error) errores.push(error.message);
    else gastos += data.length;
  }

  return { data: { aportes, gastos, errores }, error: null };
};
