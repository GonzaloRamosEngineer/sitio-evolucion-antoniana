// src/lib/dataResult.js
//
// Contrato único de la capa de datos (ROADMAP 4.1).
//
// **Toda** función de `src/lib/storage.js` y `src/api/*` devuelve `{ data, error }`
// y **nunca lanza**:
//   - éxito → `{ data: <valor>, error: null }`
//   - fallo → `{ data: <vacío del tipo>, error: <PostgrestError|Error> }`
//
// En el fallo de una lista, `data` es `[]` y no `null`: así un consumidor que
// renderiza antes de mirar `error` muestra un listado vacío en vez de romperse con
// "cannot read properties of null (reading 'map')". El error no se oculta, sigue
// entero en `error` — se degrada de forma predecible.
//
// Antes de este contrato convivían tres formas de fallar dentro de la misma capa
// (lanzar, devolver `null`, devolver el error como valor) y cada página las
// manejaba distinto, así que el mismo fallo se veía de tres maneras según la ruta.
//
// Los `console.error` de la capa de datos viven acá centralizados a propósito:
// cuando se haga 6.4 (logger con no-op en producción) hay un solo lugar que tocar.

const logFailure = (context, error) => {
  console.error(`[data] ${context}:`, error);
};

/** Normaliza el resultado de una query que devuelve una lista. */
export const listResult = ({ data, error }, context) => {
  if (error) {
    logFailure(context, error);
    return { data: [], error };
  }
  return { data: data ?? [], error: null };
};

/**
 * Normaliza el resultado de una query que devuelve una fila o ninguna.
 * Usar con `.maybeSingle()`: "no existe" es `{ data: null, error: null }`,
 * no un error. Con `.single()`, Supabase trata el vacío como error (PGRST116)
 * y el consumidor no puede distinguir "no encontrado" de "se cayó la consulta".
 */
export const rowResult = ({ data, error }, context) => {
  if (error) {
    logFailure(context, error);
    return { data: null, error };
  }
  return { data: data ?? null, error: null };
};

/** Normaliza una mutación que no devuelve payload (delete, update sin select). */
export const voidResult = ({ error }, context) => {
  if (error) {
    logFailure(context, error);
    return { data: null, error };
  }
  return { data: null, error: null };
};

/**
 * Envuelve en el contrato algo que sí lanza: Edge Functions, RPC, `fetch` al
 * microservicio de pagos. Preserva la instancia de error original, así los
 * flags propios (por ejemplo `isColdStart` de `WebhookError`) llegan al consumidor.
 */
export const attempt = async (fn, context) => {
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    logFailure(context, error);
    return { data: null, error };
  }
};
