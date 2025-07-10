import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export const useMembership = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

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
      
      toast({ title: "¡Colaboración Registrada!", description: "Gracias por tu apoyo a la fundación." });
      return data;
    } catch (err) {
      console.error("Error creating membership:", err);
      setError(err.message);
      toast({ title: "Error", description: `Error al registrar colaboración: ${err.message}`, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const getAllMemberships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          user:users (id, name, email)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching all memberships:", err);
      setError(err.message);
      toast({ title: "Error", description: "No se pudieron cargar todas las membresías.", variant: "destructive" });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    error,
    createMembership,
    getAllMemberships,
  };
};