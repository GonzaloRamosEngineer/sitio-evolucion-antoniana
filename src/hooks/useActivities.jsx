import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const handleSupabaseError = (error, context) => {
  console.error(`Error en ${context}:`, error);
  if (error.code === '42501') { 
    return 'No tienes permiso para realizar esta acción. Por favor, verifica tus credenciales o contacta al administrador.';
  }
  if (error.code === '23505') { 
    return 'Ya estás pre-inscrito en esta actividad o hay un conflicto de datos.';
  }
  if (error.message.includes('check constraint') || error.message.includes('violates row-level security policy')) {
    return 'No se cumplieron los requisitos para el registro. Verifica los datos o el cupo disponible.';
  }
  return error.message || `Ocurrió un error inesperado en ${context}.`;
};

export const useActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: true });

      if (dbError) throw dbError;
      setActivities(data || []);
    } catch (e) {
      setError(handleSupabaseError(e, 'cargar actividades'));
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshActivities = useCallback(() => {
    loadActivities();
  }, [loadActivities]);

  // Acepta un UUID o un slug. Los links viejos (/activities/<uuid>) siguen
  // funcionando; los nuevos usan slug. Detecta el formato y filtra por la
  // columna correcta (no se puede filtrar por `id` con un valor no-UUID: Postgres
  // rechaza la sintaxis).
  const getActivityById = useCallback(async (idOrSlug) => {
    setLoading(true);
    setError(null);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug || '');
      const { data, error: dbError } = await supabase
        .from('activities')
        .select('*')
        .eq(isUuid ? 'id' : 'slug', idOrSlug)
        .single();

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          throw new Error('Actividad no encontrada.');
        }
        throw dbError;
      }
      return data;
    } catch (e) {
      setError(handleSupabaseError(e, `obtener actividad ${idOrSlug}`));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Devuelve true si el correo salió. El fallo no aborta la inscripción
  // (ya está registrada en la base), pero el caller debe avisarle al usuario.
  const invokeSendConfirmationEmail = async (registrationDetails) => {
    try {
      const { error: functionError } = await supabase.functions.invoke('send-activity-confirmation', {
        body: registrationDetails,
      });

      if (functionError) {
        console.error('Error al invocar send-activity-confirmation:', functionError);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Excepción al invocar send-activity-confirmation:', e);
      return false;
    }
  };

  const registerForActivity = async (activityId, userId, userEmail, userName) => {
    setLoading(true);
    setError(null);
    try {
      const confirmationToken = uuidv4();
      const registrationData = {
        activity_id: activityId,
        user_id: userId,
        registered_at: new Date().toISOString(),
        is_confirmed: false, 
        confirmation_token: confirmationToken,
      };

      const { data, error: dbError } = await supabase
        .from('registrations')
        .insert([registrationData])
        .select()
        .single();

      if (dbError) throw dbError;

      let emailSent = false;
      if (data) {
        const activity = activities.find(act => act.id === activityId);
        emailSent = await invokeSendConfirmationEmail({
          registration_id: data.id,
          user_email: userEmail,
          user_name: userName,
          activity_id: activityId,
          activity_title: activity?.title || 'Actividad',
          confirmation_token: confirmationToken,
          is_guest: false,
        });
      }

      return data ? { ...data, email_sent: emailSent } : data;
    } catch (e) {
      const friendlyError = handleSupabaseError(e, 'registrar usuario en actividad');
      setError(friendlyError);
      throw new Error(friendlyError);
    } finally {
      setLoading(false);
    }
  };
  
  const createActivity = async (activityData) => {
    setLoading(true);
    setError(null);
    try {
      const dataToInsert = { 
        ...activityData, 
        status: activityData.status || 'Abierta',
        image_url: activityData.image_url || null,
        image_detail_url: activityData.image_detail_url || null,
        instagram_url: activityData.instagram_url || null,
        facebook_url: activityData.facebook_url || null,
        linkedin_url: activityData.linkedin_url || null,
        twitter_url: activityData.twitter_url || null,
        max_participants: activityData.max_participants === null || activityData.max_participants === -1 ? null : activityData.max_participants,
      };
      const { data, error: dbError } = await supabase
        .from('activities')
        .insert([dataToInsert])
        .select()
        .single();
      if (dbError) throw dbError;
      refreshActivities();
      return data;
    } catch (e) {
      const friendlyError = handleSupabaseError(e, 'crear actividad');
      setError(friendlyError);
      throw new Error(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const updateActivity = async (activityId, activityData) => {
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
      const { data, error: dbError } = await supabase
        .from('activities')
        .update(dataToUpdate)
        .eq('id', activityId)
        .select()
        .single();
      if (dbError) throw dbError;
      refreshActivities();
      return data;
    } catch (e) {
      const friendlyError = handleSupabaseError(e, `actualizar actividad ${activityId}`);
      setError(friendlyError);
      throw new Error(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const deleteActivity = async (activityId) => {
    setLoading(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);
      if (dbError) throw dbError;
      refreshActivities();
    } catch (e) {
      const friendlyError = handleSupabaseError(e, `eliminar actividad ${activityId}`);
      setError(friendlyError);
      throw new Error(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const getPendingConfirmations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('registrations')
        .select(`
          id,
          guest_name,
          guest_email,
          registered_at,
          activity_id,
          activities (title),
          users (name, email)
        `)
        .eq('is_confirmed', false)
        .order('registered_at', { ascending: false });

      if (dbError) throw dbError;
      
      const filteredData = data.filter(reg => reg.users !== null || (reg.guest_name && reg.guest_email));
      return filteredData;
    } catch (e) {
      setError(handleSupabaseError(e, 'obtener confirmaciones pendientes'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);


  return {
    activities,
    loading,
    error,
    refreshActivities,
    getActivityById,
    registerForActivity,
    createActivity,
    updateActivity,
    deleteActivity,
    getPendingConfirmations,
  };
};