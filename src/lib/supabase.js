import { createClient } from '@supabase/supabase-js';

// Cliente Supabase ÚNICO de la app. No crear un segundo (hubo dos y causaba
// pantalla en blanco); importá siempre desde '@/lib/supabase'.
//
// POR QUÉ ESTO FALLA FUERTE EN VEZ DE TENER UN FALLBACK
// ---------------------------------------------------------------------------
// Hasta el 2026-08-16 este archivo caía a la URL y la anon key del proyecto de
// producción si faltaban las variables de entorno. Parecía una comodidad para
// desarrollar sin `.env.local`, y era el bloqueante #1 para tener un segundo
// cliente (ROADMAP §10.6): **un deploy mal configurado no fallaba, escribía en
// la base de la Fundación en silencio.**
//
// Un fallo ruidoso en el arranque cuesta treinta segundos de configuración.
// Un fallback silencioso cuesta datos de un cliente mezclados con los de otro,
// y te enterás semanas después. Por eso acá se rompe.
//
// La anon key es pública por diseño (viaja en el bundle): la seguridad real
// son las políticas RLS, no ocultar esta clave. Que sea pública no significa
// que dé lo mismo cuál se usa.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const faltantes = [
  !url && 'VITE_SUPABASE_URL',
  !anonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean);

if (faltantes.length > 0) {
  throw new Error(
    `[supabase] Faltan variables de entorno: ${faltantes.join(', ')}.\n` +
      'Copiá .env.example a .env.local y completá los valores del proyecto ' +
      'Supabase de ESTA entidad.\n' +
      'En Vercel se configuran en Settings -> Environment Variables.\n' +
      'No hay valor por defecto a propósito: un fallback silencioso haría que ' +
      'un deploy mal configurado escriba en la base de otra entidad.'
  );
}

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
