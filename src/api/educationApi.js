import { supabase } from '@/lib/supabase';

/**
 * Registra una nueva preinscripción educativa en la base de datos de Supabase.
 * Esta función está blindada para manejar tanto usuarios logueados como anónimos.
 * * @param {Object} formData - Los datos validados provenientes del EducationForm.
 * @returns {Promise<Object>} - Retorna los datos insertados o lanza un error.
 */
export const createPreinscripcion = async (formData) => {
  try {
    // 1. Intentamos obtener la sesión actual por si el usuario está logueado
    const { data: { session } } = await supabase.auth.getSession();
    
    // 2. Preparamos el payload con transformaciones de seguridad
    const payload = {
      // Datos obligatorios
      email: formData.email.trim().toLowerCase(),
      full_name: formData.full_name.trim().toUpperCase(),
      dni: formData.dni.replace(/\D/g, ''), // Limpiamos puntos o guiones del DNI
      age: parseInt(formData.age), // Aseguramos formato integer para la DB
      last_year_completed: formData.last_year_completed,
      phone: formData.phone.trim(),
      location: formData.location,
      level_to_start: formData.level_to_start,
      relationship_club: formData.relationship_club,
      preferred_modality: formData.preferred_modality,

      // Datos opcionales (si vienen vacíos, enviamos null)
      interest_area: formData.interest_area || null,
      preferred_schedule: formData.preferred_schedule || null,
      message: formData.message?.trim() || null,

      // Metadatos de sistema
      user_id: session?.user?.id || null, // Vinculación automática si existe sesión
      status: 'pending', // Estado inicial por defecto
      created_at: new Date().toISOString(),
    };

    // 3. Inserción en la tabla oficial
    const { data, error } = await supabase
      .from('education_preinscripcions')
      .insert([payload])
      .select();

    // 4. Gestión de errores de red o base de datos
    if (error) {
      console.error('Error de Supabase:', error.message);
      throw new Error(error.message);
    }

    return data[0];
  } catch (error) {
    // Centralización de logs para depuración NASA
    console.error('Error crítico en educationApi:', error.message);
    throw error;
  }
};