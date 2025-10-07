import { supabase } from '@/lib/supabase';

/**
 * NUEVO: trae TODAS las membresías del usuario (opcional: solo activas).
 * Mantiene el mismo estilo, select('*') y orden desc.
 */
export const getUserMemberships = async (userId, { onlyActive = false } = {}) => {
  if (!userId) return [];
  try {
    let query = supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (onlyActive) {
      // ajustá si tu columna/valor de estado es distinto
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error('Error fetching user memberships from API:', err);
    return [];
  }
};

/**
 * COMPATIBILIDAD: misma función que tenías, pero ahora usa la de arriba
 * y retorna SOLO la más reciente (índice 0). Así no rompe otros usos.
 */
export const getUserMembership = async (userId) => {
  if (!userId) return null;
  try {
    const data = await getUserMemberships(userId);
    if (!data || data.length === 0) return null;
    return data[0];
  } catch (err) {
    console.error('Error fetching user membership from API:', err);
    return null;
  }
};
