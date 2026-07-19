import { supabase } from '@/lib/supabase';

// Devuelve la fila actualizada: la policy SELECT de users sí permite leer la
// fila propia (a diferencia de updateUserRole, que opera sobre filas ajenas).
export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('users')
    .update(profileData)
    .eq('id', userId)
    .select('id, name, email, phone, role, is_verified, created_at, dni, birth_date, gender')
    .single();

  return { data, error };
};

export const verifyUser = async (userId) => {
  const { error } = await supabase
    .from('users')
    .update({ is_verified: true })
    .eq('id', userId);

  return { data: null, error };
};

export const resendVerificationEmail = async (userId) => {
  const { data, error } = await supabase.functions.invoke('resend-verification', {
    body: { userId },
  });

  if (error) {
    let message = error.message || 'No se pudo generar el link.';
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch { /* sin cuerpo parseable */ }
    return { data: null, error: { message } };
  }

  if (data?.error) {
    return { data: null, error: { message: data.error } };
  }

  return { data, error: null };
};

// Roles válidos del sistema (espejo del CHECK constraint en la DB).
export const USER_ROLES = [
  { value: 'user', label: 'Miembro' },
  { value: 'comision_directiva', label: 'Comisión Directiva' },
  { value: 'educacion_manager', label: 'Gestor de Educación' },
  { value: 'admin', label: 'Administrador' },
];

// Crea un usuario completo (cuenta + perfil + rol) vía la Edge Function create-user.
// Sólo un admin autenticado puede invocarla con éxito (la función valida el rol
// del invocador en el servidor). Devuelve { data, error } con error normalizado.
export const createUser = async ({ email, password, name, role }) => {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { email, password, name, role },
  });

  if (error) {
    // Los errores HTTP de la función traen el cuerpo en error.context (Response).
    let message = error.message || 'No se pudo crear el usuario.';
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // sin cuerpo parseable; queda el mensaje genérico
    }
    return { data: null, error: { message } };
  }

  if (data?.error) {
    return { data: null, error: { message: data.error } };
  }

  return { data, error: null };
};

// Cambia el rol de un usuario existente. Sólo un admin tiene permiso real
// (lo garantiza el trigger prevent_privilege_escalation + RLS en Supabase).
// No usamos .select().single() porque la policy SELECT de users no devuelve
// filas ajenas al caller, lo que haría fallar PGRST116 aunque el UPDATE haya
// funcionado correctamente.
export const updateUserRole = async (userId, role) => {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  return { data: null, error };
};
