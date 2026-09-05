// src/api/activitiesApi.js
// Contrato único: devuelve `{ data, error }` y no lanza (ver `src/lib/dataResult.js`).
import { supabase } from '@/lib/supabase';
import { listResult } from '@/lib/dataResult';

export const getUserRegistrations = async (userId) => {
  if (!userId) return { data: [], error: null };

  return listResult(
    await supabase
      .from('registrations')
      .select(`
        id,
        registered_at,
        is_confirmed,
        activity:activities (*)
      `)
      .eq('user_id', userId)
      .order('registered_at', { ascending: false }),
    'getUserRegistrations'
  );
};

/**
 * Precio que le corresponde a la persona de la sesión en una actividad
 * (ROADMAP §10.1.d).
 *
 * ⚠️ POR QUÉ SE PREGUNTA Y NO SE CALCULA ACÁ. El precio depende de si es
 * miembro ACTIVO, de si su categoría da descuento y de si la actividad fija un
 * `precio_socio` propio, y ese orden de prioridades vive en
 * `precio_actividad_para()`. Reimplementarlo en el front daría una segunda
 * fuente de verdad sobre un número que la persona va a pagar — que es la
 * versión cara del bug de §10.23, donde dos pantallas se contradecían.
 *
 * Sin sesión devuelve el precio general, que es exactamente lo que corresponde
 * mostrarle a quien no inició sesión: la función tiene EXECUTE para `anon`.
 */
export const getMiPrecioActividad = async (activityId) => {
  const { data, error } = listResult(
    await supabase.rpc('mi_precio_actividad', { p_activity_id: activityId }),
    'getMiPrecioActividad'
  );
  if (error) return { data: null, error };
  return { data: data[0] ?? null, error: null };
};
