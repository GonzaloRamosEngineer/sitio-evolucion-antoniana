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
