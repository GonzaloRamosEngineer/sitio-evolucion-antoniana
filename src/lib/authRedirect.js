import { RUTAS } from '@/config/rutas';

const hasControlCharacters = (value = '') =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const safeSuffix = (value, prefix) =>
  typeof value === 'string' && (!value || value.startsWith(prefix)) && !hasControlCharacters(value)
    ? value
    : '';

/**
 * Convierte el `location` guardado por ProtectedRoute en un destino interno.
 * Rechaza URLs absolutas, protocol-relative, backslashes y caracteres de
 * control; conserva query y hash porque pueden representar estado legitimo.
 */
export const safeInternalReturnTo = (locationLike) => {
  const candidate =
    typeof locationLike === 'string' ? { pathname: locationLike } : locationLike;
  const pathname = candidate?.pathname;

  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('\\') ||
    hasControlCharacters(pathname)
  ) {
    return null;
  }

  return `${pathname}${safeSuffix(candidate.search, '?')}${safeSuffix(candidate.hash, '#')}`;
};

export const landingForRole = (role) =>
  role === 'comision_directiva' ? RUTAS.comision.inicio
  : role === 'documentacion_lectura' ? RUTAS.comision.documentos
  : role === 'educacion_manager' ? RUTAS.admin.educacion
  : role === 'admin' ? RUTAS.admin.inicio
  : RUTAS.mi.cuenta;

/** El retorno protegido tiene precedencia, salvo que apunte otra vez a auth. */
export const postLoginDestination = (locationLike, role) => {
  const safeReturnTo = safeInternalReturnTo(locationLike);
  const pathname = safeReturnTo?.split(/[?#]/, 1)[0];
  const authPaths = new Set(Object.values(RUTAS.auth));
  return safeReturnTo && !authPaths.has(pathname) ? safeReturnTo : landingForRole(role);
};
