import { supabase } from '@/lib/supabase';

/**
 * Trae TODAS las membresías del usuario.
 * @param {string} userId
 * @param {{ onlyActive?: boolean }} [opts]
 * @returns {Promise<Array>}
 */
export async function getUserMemberships(userId, { onlyActive = false } = {}) {
  if (!userId) return [];

  try {
    let query = supabase
      .from('memberships') // ajustá si tu tabla se llama distinto
      .select('id, plan, amount, status, created_at, starts_at, ends_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (onlyActive) query = query.eq('status', 'active');

    const { data, error } = await query;
    if (error) throw error;

    return data ?? [];
  } catch (err) {
    console.error('Error fetching user memberships:', err);
    return [];
  }
}

/**
 * Compatibilidad: sigue existiendo getUserMembership,
 * pero ahora devuelve la ÚLTIMA (más reciente).
 */
export async function getUserMembership(userId, { onlyActive = false } = {}) {
  const all = await getUserMemberships(userId, { onlyActive });
  return all[0] ?? null;
}
