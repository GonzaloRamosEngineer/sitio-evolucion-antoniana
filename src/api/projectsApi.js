import { supabase } from '@/lib/supabase';

// Capa de datos del gestor de proyectos/tareas (Comisión Directiva).
// El acceso real lo controlan las RLS de Supabase (is_board_member()); estas
// funciones solo envuelven las queries y devuelven { data, error }.

// --- Proyectos ---

// Trae los proyectos con sus tareas (id + status) para calcular progreso.
export const getProjects = async () => {
  return supabase
    .from('projects')
    .select('*, tasks(id, status, due_date)')
    .order('created_at', { ascending: false });
};

export const createProject = async (payload) => {
  return supabase.from('projects').insert(payload).select('*, tasks(id, status, due_date)').single();
};

export const updateProject = async (id, payload) => {
  return supabase.from('projects').update(payload).eq('id', id).select('*, tasks(id, status, due_date)').single();
};

export const deleteProject = async (id) => {
  return supabase.from('projects').delete().eq('id', id);
};

// --- Tareas ---

export const getTasks = async (projectId) => {
  return supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
};

export const createTask = async (payload) => {
  return supabase.from('tasks').insert(payload).select('*').single();
};

export const updateTask = async (id, payload) => {
  return supabase.from('tasks').update(payload).eq('id', id).select('*').single();
};

export const deleteTask = async (id) => {
  return supabase.from('tasks').delete().eq('id', id);
};

// --- Personas asignables (miembros del board) ---
// Requiere la policy users_board_select (Fase 2): board puede leer board.
export const getBoardMembers = async () => {
  return supabase
    .from('users')
    .select('id, name, email')
    .in('role', ['admin', 'comision_directiva'])
    .order('name', { ascending: true });
};
