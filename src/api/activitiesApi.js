import { supabase } from '@/lib/supabase';

export const getUserRegistrations = async (userId) => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        registered_at,
        is_confirmed,
        activity:activities (
          id,
          title,
          date,
          duration,
          modality
        )
      `)
      .eq('user_id', userId)
      .order('registered_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching user registrations from API:", err);
    return []; 
  }
};