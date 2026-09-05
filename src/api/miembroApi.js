// src/api/miembroApi.js
//
// La condición institucional de la persona (ROADMAP §10.1.a, fase 4).
// Contrato único `{ data, error }`, nunca lanza (ver `src/lib/dataResult.js`).
//
// POR QUÉ ESTO NO ES `SELECT * FROM miembros`
//
// `miembros` tiene RLS de lectura propia, así que un select directo funcionaría
// para la propia fila. Se consulta igual por RPC, por dos motivos:
//
//  1. `mi_membresia()` devuelve la condición **y** la antigüedad en una sola
//     llamada. El carnet y el estado de cuenta necesitan las dos cosas juntas, y
//     dos consultas separadas es exactamente cómo `/dashboard` y `/carnet`
//     llegaron a decirle cosas contradictorias a la misma persona (§10.23).
//  2. La herencia del voto (categoría NULL -> parámetro de la entidad) y el
//     descuento vigente se resuelven en SQL. Recalcularlos acá sería una segunda
//     fuente de la regla.
import { supabase } from '@/lib/supabase';
import { listResult } from '@/lib/dataResult';
import { SIN_MEMBRESIA } from '@/lib/miembro';

/**
 * Condición institucional + antigüedad de la sesión.
 *
 * Devuelve siempre una fila: quien no es miembro recibe `es_miembro: false` con
 * el resto en null, que es un estado legítimo y no un error. Es la diferencia
 * entre "no sos miembro" y "no pudimos averiguarlo", y las pantallas necesitan
 * poder distinguirlas.
 */
export const getMiMembresia = async () => {
  const { data, error } = listResult(await supabase.rpc('mi_membresia'), 'getMiMembresia');
  if (error) return { data: null, error };
  return { data: data[0] ?? SIN_MEMBRESIA, error: null };
};

/**
 * Solicitar el alta.
 *
 * Solo tiene sentido en entidades con `reglas_membresia.modo_alta = 'aprobacion'`
 * — una asociación civil cuyo estatuto exige que la comisión acepte al socio. En
 * una entidad de alta automática (como la Fundación) el alta la da el primer
 * aporte con acceso y este botón no debería ni mostrarse.
 *
 * La función SQL no falla si igual se la llama: devuelve el estado real. Es a
 * propósito — una pantalla desactualizada se corrige sola en vez de mostrarle un
 * error a alguien que no hizo nada mal.
 */
export const solicitarMembresia = async () => {
  const { data, error } = listResult(await supabase.rpc('solicitar_membresia'), 'solicitarMembresia');
  if (error) return { data: null, error };
  return { data: data[0] ?? null, error: null };
};

/**
 * Cambio de estado por la comisión (activo / suspendido / baja / pendiente).
 *
 * ⚠️ La autorización NO está acá: `cambiar_estado_miembro()` verifica
 * `is_board_member()` en SQL y rechaza con 42501. Este archivo corre en el
 * browser con la anon key y no puede ser la frontera de seguridad.
 */
export const cambiarEstadoMiembro = async (userId, estado, motivo = null) => {
  const { data, error } = listResult(
    await supabase.rpc('cambiar_estado_miembro', {
      p_user_id: userId,
      p_estado: estado,
      p_motivo: motivo,
    }),
    'cambiarEstadoMiembro'
  );
  if (error) return { data: null, error };
  return { data: data[0] ?? null, error: null };
};

/**
 * El padrón, para la comisión.
 *
 * La RLS ya limita lo que devuelve: quien no es comisión ve solo su propia fila,
 * así que esto no necesita —ni debe— filtrar por rol desde el browser.
 */
export const getPadron = async () =>
  listResult(
    await supabase
      .from('miembros')
      .select('user_id, numero, estado, fecha_alta, fecha_baja, alta_origen, categoria_id, users(name, email)')
      .order('numero', { ascending: true }),
    'getPadron'
  );

/** Categorías activas. Lectura pública: la página que invita a asociarse las muestra. */
export const getCategoriasMiembro = async () =>
  listResult(
    await supabase
      .from('categorias_miembro')
      .select('*')
      .eq('activa', true)
      .order('orden', { ascending: true }),
    'getCategoriasMiembro'
  );

/**
 * Parámetros de membresía de la entidad.
 *
 * Los consume la UI para saber si ofrecer el botón de solicitud y si hablar de
 * voto. Es el equivalente de `reglas_acceso` para la condición institucional:
 * lo que varía por entidad va en datos (§10.5).
 */
export const getReglasMembresia = async () => {
  const { data, error } = listResult(
    await supabase.from('reglas_membresia').select('*').eq('vigente', true).limit(1),
    'getReglasMembresia'
  );
  if (error) return { data: null, error };
  return { data: data[0] ?? null, error: null };
};
