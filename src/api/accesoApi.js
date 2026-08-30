// src/api/accesoApi.js
//
// Acceso y antigüedad del socio (ROADMAP §10 fase 1).
// Contrato único `{ data, error }`, nunca lanza (ver `src/lib/dataResult.js`).
//
// Se consulta por RPC y no leyendo `aportes` directamente por dos motivos:
//
//  1. `mi_acceso()` y `mi_antiguedad()` resuelven por `auth.uid()` dentro de la
//     base, así que desde el browser **no se puede preguntar por otra persona**.
//     Las versiones con parámetro existen pero son solo para `service_role`.
//  2. La regla de vigencia (incluida la gracia de 30 días y el tratamiento
//     distinto de cuota y donación) vive en SQL. Si se recalculara acá, el
//     frontend y las policies RLS podrían decir cosas distintas.
import { supabase } from '@/lib/supabase';
import { listResult } from '@/lib/dataResult';
import { SIN_ACCESO } from '@/lib/acceso';

/** Estado de acceso del usuario de la sesión. */
export const getMiAcceso = async () => {
  const { data, error } = listResult(await supabase.rpc('mi_acceso'), 'getMiAcceso');
  if (error) return { data: null, error };
  // La función devuelve siempre una fila; el fallback es defensivo.
  return { data: data[0] ?? SIN_ACCESO, error: null };
};

/** Antigüedad del usuario de la sesión: los tres números de la decisión D4. */
export const getMiAntiguedad = async () => {
  const { data, error } = listResult(await supabase.rpc('mi_antiguedad'), 'getMiAntiguedad');
  if (error) return { data: null, error };
  return { data: data[0] ?? null, error: null };
};
