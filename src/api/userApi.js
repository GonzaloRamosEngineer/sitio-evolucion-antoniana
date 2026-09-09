import { supabase } from '@/lib/supabase';

/*
  Las columnas del perfil, en un solo lugar. Las leen `useAuth` (al iniciar
  sesión) y `updateUserProfile` (al guardar), y tienen que coincidir: si una
  trae `avatar_path` y la otra no, la foto desaparece al editar cualquier otro
  dato — pasó el 2026-09-09 con las dos listas escritas a mano.

  ⚠️ Es un contrato con la base: pedir una columna que falta NO degrada, rompe
  la consulta entera. El 2026-09-09 este select tuvo `avatar_path` antes de que
  la migración estuviera aplicada y el panel mostró «Error al cargar perfil»
  con el email en lugar del nombre y el documento en «Sin registrar»: un campo
  nuevo para la FOTO se llevó puestos el nombre, el DNI y la antigüedad.
  Al agregar una columna acá, la migración va primero. Ver `HISTORIAL.md`
  §10.23.e.1, donde vivió el puente que toleraba el desfase hasta que la
  migración se aplicó (2026-09-09) y se borró.
*/
export const COLUMNAS_PERFIL =
  'id, name, email, phone, role, is_verified, created_at, dni, birth_date, gender, avatar_path';

// Devuelve la fila actualizada: la policy SELECT de users sí permite leer la
// fila propia (a diferencia de updateUserRole, que opera sobre filas ajenas).
export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('users')
    .update(profileData)
    .eq('id', userId)
    .select(COLUMNAS_PERFIL)
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
