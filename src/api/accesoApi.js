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

/* ============================
   Reclamo universal de huellas (§10.1.c)
   ============================
   Generaliza lo de arriba. Medido el 2026-09-05: hay 160 preinscripciones a
   Educación con 156 emails distintos, y solo 4 tienen cuenta. Contra 23
   usuarios y 1 con acceso vigente. La base de contactos más grande de la
   entidad es siete veces el sistema, y el sistema no la reconoce.

   Qué tabla es reclamable NO se decide acá: vive en `fuentes_reclamables`, con
   una lista negra que rechaza las que otorgan privilegios (§10.19). Agregar una
   fuente en un cliente nuevo es insertar una fila, no tocar este archivo. */

/**
 * Todo lo que esta persona podría reclamar con su email **verificado**.
 *
 * Incluye las preinscripciones y las inscripciones; las donaciones siguen
 * teniendo su consulta propia (`getDonacionesReclamables`) porque son las únicas
 * que otorgan acceso y muestran los meses que darían.
 *
 * Lista vacía es la respuesta normal y no es un error.
 */
export const getHuellasReclamables = async () =>
  listResult(await supabase.rpc('huellas_reclamables'), 'getHuellasReclamables');

/**
 * Vincula todo de una: aportes **y** huellas.
 *
 * Devuelve una fila por fuente. La de `donations` trae `meses_nuevos` y
 * `vence_el`; el resto viene en 0 y null a propósito, porque **reconocer a una
 * persona no le da beneficios**. Esa distinción tiene que sobrevivir hasta la
 * pantalla: si el mensaje dijera "sumaste acceso" al vincular una
 * preinscripción, estaríamos prometiendo algo que no pasó.
 */
export const reclamarHuellas = async () =>
  listResult(await supabase.rpc('reclamar_huellas'), 'reclamarHuellas');

/**
 * Resumen de huellas sin cuenta, para la comisión (ROADMAP §10.1.c).
 *
 * DECISIÓN DE PRODUCTO (2026-09-05): **la entidad ve quiénes son y decide ella
 * si los contacta.** El sistema no manda nada solo. Las 156 personas de
 * educación dejaron su email en un formulario de preinscripción a un programa;
 * escribirles por otra cosa es una decisión de la entidad, que es la
 * responsable de esos datos, y no un efecto lateral de haber construido la
 * cañería.
 *
 * Devuelve conteos por fuente, no una lista de emails: para decidir hace falta
 * saber cuántos hay y de dónde salieron, no volcar 156 direcciones a una
 * pantalla. El detalle nominal ya vive en el ABM de cada módulo.
 *
 * ⚠️ La autorización está en SQL: `huellas_sin_cuenta()` exige
 * `is_board_member()` y rechaza con 42501. Este archivo corre en el browser con
 * la anon key y no puede ser la frontera de seguridad.
 */
export const getHuellasSinCuenta = async () =>
  listResult(await supabase.rpc('huellas_sin_cuenta'), 'getHuellasSinCuenta');
