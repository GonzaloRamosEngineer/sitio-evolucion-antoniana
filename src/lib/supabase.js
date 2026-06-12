import { createClient } from '@supabase/supabase-js';

// Cliente Supabase ÚNICO de la app. Prefiere las variables de entorno
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) para poder configurar por
// ambiente; si no están definidas, cae a los valores del proyecto de producción.
// Nota: la anon key es pública por diseño (viaja en el bundle); la seguridad
// real está en las políticas RLS de Supabase, no en ocultar esta clave.
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://lbtyxnbyetsvngsxczkt.supabase.co';

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHl4bmJ5ZXRzdm5nc3hjemt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NzkwOTMsImV4cCI6MjA2NDU1NTA5M30.5x5oYFyZbUxNAgPgbP4F3HeKemi8RBfv-3OKkDpeTz4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
