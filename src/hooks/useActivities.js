import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export const useActivities = () => {
  const [activities, setActivities] = useState([]);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError(err.message);
      toast({ title: "Error", description: "No se pudieron cargar las actividades.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchActivityById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setActivity(data);
      return data;
    } catch (err) {
      console.error(`Error fetching activity with id ${id}:`, err);
      setError(err.message);
      toast({ title: "Error", description: "No se pudo cargar la actividad.", variant: "destructive" });
      setActivity(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createActivity = async (activityData) => {
    setLoading(true);
    setError(null);
    try {
      const dataToInsert = {
        ...activityData,
        image_url: activityData.image_url || null,
        image_detail_url: activityData.image_detail_url || null,
        instagram_url: activityData.instagram_url || null,
        facebook_url: activityData.facebook_url || null,
        linkedin_url: activityData.linkedin_url || null,
        twitter_url: activityData.twitter_url || null,
        max_participants: activityData.max_participants === null || activityData.max_participants === -1 ? null : activityData.max_participants,
      };
      const { data, error } = await supabase
        .from('activities')
        .insert([dataToInsert])
        .select()
        .single();
      if (error) throw error;
      toast({ title: "Éxito", description: "Actividad creada correctamente." });
      return data;
    } catch (err) {
      console.error("Error creating activity:", err);
      setError(err.message);
      toast({ title: "Error", description: `Error al crear actividad: ${err.message}`, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateActivity = async (id, activityData) => {
    setLoading(true);
    setError(null);
    try {
      const dataToUpdate = {
        ...activityData,
        image_url: activityData.image_url || null,
        image_detail_url: activityData.image_detail_url || null,
        instagram_url: activityData.instagram_url || null,
        facebook_url: activityData.facebook_url || null,
        linkedin_url: activityData.linkedin_url || null,
        twitter_url: activityData.twitter_url || null,
        max_participants: activityData.max_participants === null || activityData.max_participants === -1 ? null : activityData.max_participants,
      };
      const { data, error } = await supabase
        .from('activities')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      toast({ title: "Éxito", description: "Actividad actualizada correctamente." });
      return data;
    } catch (err) {
      console.error(`Error updating activity with id ${id}:`, err);
      setError(err.message);
      toast({ title: "Error", description: `Error al actualizar actividad: ${err.message}`, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteActivity = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Éxito", description: "Actividad eliminada correctamente." });
      return true;
    } catch (err) {
      console.error(`Error deleting activity with id ${id}:`, err);
      setError(err.message);
      toast({ title: "Error", description: `Error al eliminar actividad: ${err.message}`, variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const registerForActivity = async (registrationData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: existingRegistration, error: fetchError } = await supabase
        .from('registrations')
        .select('id')
        .eq('user_id', registrationData.user_id)
        .eq('activity_id', registrationData.activity_id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') { 
        throw fetchError;
      }

      if (existingRegistration) {
        toast({ title: "Información", description: "Ya estás pre-inscrito en esta actividad. Revisa tu correo para confirmar.", variant: "default" });
        return { alreadyRegistered: true, data: existingRegistration };
      }
      
      const { data, error } = await supabase
        .from('registrations')
        .insert([registrationData])
        .select()
        .single();
      
      if (error) throw error;

      if (data && data.user_id && data.confirmation_token) { 
        const { data: activityDetails } = await supabase.from('activities').select('title').eq('id', data.activity_id).single();
        const { data: userDetails } = await supabase.from('users').select('email, name').eq('id', data.user_id).single();

        if (activityDetails && userDetails) {
          const { error: functionError } = await supabase.functions.invoke('send-activity-confirmation', {
            body: {
              registration_id: data.id,
              user_email: userDetails.email,
              user_name: userDetails.name,
              activity_title: activityDetails.title,
              confirmation_token: data.confirmation_token,
              is_guest: false,
            },
          });
          if (functionError) {
            console.error('Error sending confirmation email via Edge Function:', functionError);
            toast({ title: "Advertencia", description: "Pre-inscripción realizada, pero hubo un problema al enviar el correo de confirmación.", variant: "destructive" });
          } else {
            toast({ title: "¡Pre-inscripción Exitosa!", description: "Revisa tu correo electrónico para confirmar tu asistencia." });
          }
        }
      } else if (data && !data.user_id && data.confirmation_token) { 
         const { data: activityDetails } = await supabase.from('activities').select('title').eq('id', data.activity_id).single();
         if (activityDetails && registrationData.guest_email && registrationData.guest_name) {
            const { error: functionError } = await supabase.functions.invoke('send-activity-confirmation', {
              body: {
                registration_id: data.id,
                user_email: registrationData.guest_email,
                user_name: registrationData.guest_name,
                activity_title: activityDetails.title,
                confirmation_token: data.confirmation_token,
                is_guest: true,
              },
            });
            if (functionError) {
              console.error('Error sending guest confirmation email via Edge Function:', functionError);
              toast({ title: "Advertencia", description: "Pre-inscripción de invitado realizada, pero hubo un problema al enviar el correo de confirmación.", variant: "destructive" });
            } else {
              toast({ title: "¡Pre-inscripción de Invitado Exitosa!", description: "Revisa el correo electrónico del invitado para confirmar la asistencia." });
            }
         }
      }
      return { alreadyRegistered: false, data };
    } catch (err) {
      console.error("Error registering for activity:", err);
      setError(err.message);
      toast({ title: "Error", description: `Error al inscribirse: ${err.message}`, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const getPendingConfirmations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id,
          registered_at,
          is_confirmed,
          confirmation_token,
          user:users (id, name, email),
          guest_name,
          guest_email,
          activity:activities (id, title, date)
        `)
        .eq('is_confirmed', false)
        .not('confirmation_token', 'is', null) 
        .order('registered_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching pending confirmations:", err);
      setError(err.message);
      toast({ title: "Error", description: "No se pudieron cargar las confirmaciones pendientes.", variant: "destructive" });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    activities,
    activity,
    loading,
    error,
    fetchActivities,
    fetchActivityById,
    createActivity,
    updateActivity,
    deleteActivity,
    registerForActivity,
    getPendingConfirmations,
    refreshActivities: fetchActivities, 
  };
};