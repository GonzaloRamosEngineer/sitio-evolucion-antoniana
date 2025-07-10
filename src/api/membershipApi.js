import { supabase } from '@/lib/supabase';

export const getUserMembership = async (userId) => {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1); 

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (err) {
    console.error("Error fetching user membership from API:", err);
    return null;
  }
};