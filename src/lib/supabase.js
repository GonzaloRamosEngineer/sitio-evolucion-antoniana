import { createClient } from '@supabase/supabase-js';

// Cliente Supabase ÚNICO de la app.
//
// Las credenciales salen EXCLUSIVAMENTE del entorno. Hasta 2026-08-30 había un
// fallback a los valores del proyecto de producción, y era el bloqueante #1 del
// objetivo multi-cliente (ROADMAP 10.6 y 11.7): un fork mal configurado no
// fallaba, se conectaba a la base de la Fundación y escribía ahí. Con el módulo
// de canjes de §11 eso deja de ser "muestra datos de más" y pasa a ser "emite
// canjes contra la base equivocada". Si falta la configuración tiene que romper.
//
// La anon key es pública por diseño (viaja en el bundle) y la seguridad real
// está en las RLS, no en ocultarla: lo que se quitó de acá no es un secreto, es
// un default peligroso.
//
// El build también falla si faltan (guarda en `vite.config.js`), así que esto es
// la segunda línea de defensa, para dev y para cualquier consumidor del módulo.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const faltantes = [
  !url && 'VITE_SUPABASE_URL',
  !anonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean);

if (faltantes.length > 0) {
  throw new Error(
    `Faltan variables de entorno de Supabase: ${faltantes.join(', ')}. ` +
      'Copiá .env.example a .env.local y completá los valores del proyecto que ' +
      'corresponda. No hay valores por defecto a propósito: un default apuntaría ' +
      'a la base de otro cliente (ROADMAP 11.7).'
  );
}

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
