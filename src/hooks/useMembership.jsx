import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useMembership = () => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('memberships')
        .select(`
          *,
          user:users (id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMemberships(data || []);
    } catch (err) {
      console.error('Error loading memberships:', err);
      setError(err);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  const getUserMembership = useCallback(async (userId) => {
    if (!userId) return null;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active') // Asumiendo que quieres la membresía activa
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') return null; // No rows found, no active membership
        throw fetchError;
      }
      return data;
    } catch (err) {
      console.error('Error getting user membership:', err);
      setError(err);
      return null; // Devuelve null en caso de error
    } finally {
      setLoading(false);
    }
  }, []);

  const createMembership = async (membershipData) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('memberships')
        .insert([membershipData])
        .select()
        .single();

      if (insertError) throw insertError;
      
      setMemberships(prev => [data, ...prev].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
      return data;
    } catch (err) {
      console.error('Error creating membership:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMembershipStatus = async (id, status) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('memberships')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setMemberships(prev => 
        prev.map(mem => mem.id === id ? data : mem)
           .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      );
      return data;
    } catch (err) {
      console.error('Error updating membership status:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };


  return {
    memberships,
    loading,
    error,
    getUserMembership,
    createMembership,
    updateMembershipStatus,
    refreshMemberships: loadMemberships
  };
};