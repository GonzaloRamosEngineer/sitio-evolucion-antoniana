import { entidad } from '@/config/entidad';

/**
 * URL canónica de producción. No usa window.location.origin: un preview de
 * Vercel no debe declararse a sí mismo como la versión principal del contenido.
 */
export const canonicalUrl = (pathname = '/') => {
  const site = entidad.sitio.replace(/\/+$/, '');
  const path = pathname === '/' ? '/' : `/${String(pathname).replace(/^\/+|\/+$/g, '')}`;
  return `${site}${path}`;
};
