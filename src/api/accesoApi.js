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

/* ============================
   Aportes hechos sin sesión
   ============================ */
/**
 * Donaciones anónimas que coinciden con el email **verificado** de la sesión
 * (ROADMAP §10.18).
 *
 * Existe porque 4 de cada 5 donaciones llegan sin `user_id`: no se pierde el
 * vínculo en el camino, simplemente se dona sin haber iniciado sesión.
 *
 * Lista vacía es la respuesta normal y no significa error: la mayoría de la
 * gente no tiene nada que reclamar.
 */
export const getDonacionesReclamables = async () =>
  listResult(await supabase.rpc('donaciones_reclamables'), 'getDonacionesReclamables');

/**
 * Vincula esas donaciones a la cuenta y otorga el acceso correspondiente.
 *
 * ⚠️ El email es una **pista**, no una credencial: quien decide es la persona,
 * y por eso esto se llama desde un botón y nunca solo. La verificación real
 * (sesión + email confirmado) vive en SQL, no acá — este archivo no puede ser
 * la frontera de seguridad porque corre en el browser con la anon key.
 */
export const reclamarDonaciones = async () => {
  const { data, error } = listResult(await supabase.rpc('reclamar_donaciones'), 'reclamarDonaciones');
  if (error) return { data: null, error };
  return { data: data[0] ?? { vinculadas: 0, meses_nuevos: 0, vence_el: null }, error: null };
};
