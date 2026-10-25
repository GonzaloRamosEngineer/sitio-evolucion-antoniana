// Fuente única de nombres y patrones de ruta.
//
// Etapa 3: primero centraliza las URLs ACTUALES sin renombrarlas. La migración
// al español llega después y cambia valores acá, acompañada por redirects.

export const ROUTE_PATHS = Object.freeze({
  INICIO: '/',
  NOSOTROS: '/about',
  ACTIVIDADES: '/activities',
  ACTIVIDAD_DETALLE: '/activities/:id',
  CONFIRMAR_ASISTENCIA: '/confirm-attendance',
  COLABORAR: '/collaborate',
  RENDICION: '/rendicion',
  CONTACTO: '/contact',
  AGRADECIMIENTO: '/agradecimiento',
  INGRESAR: '/login',
  REGISTRARSE: '/register',
  SOLICITAR_RECUPERACION: '/request-password-reset',
  ACTUALIZAR_CLAVE: '/update-password',
  DOCUMENTACION_LEGAL: '/legal-documents',
  PRIVACIDAD: '/privacy',
  TERMINOS: '/terms',
  ALIANZAS: '/partners',
  ALIANZA_DETALLE: '/partners/:slug',
  BENEFICIOS: '/beneficios',
  BENEFICIO_DETALLE: '/beneficios/:slug',
  BENEFICIO_POR_ID: '/beneficios/id/:id',
  POSTULAR_ALIANZA: '/postular-partner',
  NOVEDADES: '/novedades',
  NOVEDAD_DETALLE: '/novedades/:slug',
  NOVEDAD_POR_ID: '/novedades/id/:id',
  NOVEDAD_POR_UUID: '/novedades/uuid/:id',
  PREINSCRIPCION: '/preinscripcion',
  ADMIN_EDUCACION: '/admin/education',
  COMISION: '/comision',
  CARNET: '/carnet',
  CLUB: '/club',
  POSTULAR_COMERCIO: '/club/postular',
  COMERCIO: '/comercio',
  CUENTA: '/dashboard',
  ADMIN_ACTIVIDAD_NUEVA: '/admin/activities/new',
  ADMIN_ACTIVIDAD_EDITAR: '/admin/activities/edit/:id',
  ADMIN: '/admin/*',
  NO_ENCONTRADA: '*',
});

const META = Object.freeze({
  INICIO: ['publica', 'publico', 'indexable', 'institucional'],
  NOSOTROS: ['publica', 'publico', 'indexable', 'estatico'],
  ACTIVIDADES: ['publica', 'publico', 'indexable', 'estatico'],
  ACTIVIDAD_DETALLE: ['detalle', 'publico', 'indexable', 'dinamico'],
  CONFIRMAR_ASISTENCIA: ['accion', 'publico-con-token', 'noindex', 'ninguno'],
  COLABORAR: ['publica', 'publico', 'indexable', 'estatico'],
  RENDICION: ['publica', 'publico', 'indexable', 'estatico'],
  CONTACTO: ['publica', 'publico', 'indexable', 'estatico'],
  AGRADECIMIENTO: ['accion', 'publico', 'noindex', 'ninguno'],
  INGRESAR: ['auth', 'anonimo', 'noindex', 'ninguno'],
  REGISTRARSE: ['auth', 'anonimo', 'noindex', 'ninguno'],
  SOLICITAR_RECUPERACION: ['auth', 'anonimo', 'noindex', 'ninguno'],
  ACTUALIZAR_CLAVE: ['auth', 'publico-con-token', 'noindex', 'ninguno'],
  DOCUMENTACION_LEGAL: ['publica', 'publico', 'indexable', 'estatico'],
  PRIVACIDAD: ['legal', 'publico', 'indexable', 'estatico'],
  TERMINOS: ['legal', 'publico', 'indexable', 'estatico'],
  ALIANZAS: ['publica', 'publico', 'indexable', 'estatico'],
  ALIANZA_DETALLE: ['detalle', 'publico', 'indexable', 'dinamico'],
  BENEFICIOS: ['publica', 'publico', 'indexable', 'estatico'],
  BENEFICIO_DETALLE: ['detalle', 'publico', 'indexable', 'dinamico'],
  BENEFICIO_POR_ID: ['compatibilidad', 'publico', 'alias-noindex', 'dinamico'],
  POSTULAR_ALIANZA: ['accion', 'publico', 'indexable', 'estatico'],
  NOVEDADES: ['publica', 'publico', 'indexable', 'estatico'],
  NOVEDAD_DETALLE: ['detalle', 'publico', 'indexable', 'dinamico'],
  NOVEDAD_POR_ID: ['compatibilidad', 'publico', 'alias-noindex', 'dinamico'],
  NOVEDAD_POR_UUID: ['compatibilidad', 'publico', 'alias-noindex', 'dinamico'],
  PREINSCRIPCION: ['accion', 'publico', 'indexable', 'estatico'],
  ADMIN_EDUCACION: ['administracion', 'admin-o-educacion', 'privado-noindex', 'ninguno'],
  COMISION: ['portal', 'comision-autorizada', 'privado-noindex', 'ninguno'],
  CARNET: ['personal', 'sesion', 'privado-noindex', 'ninguno'],
  CLUB: ['personal', 'publico-accion-protegida', 'noindex', 'estatico'],
  POSTULAR_COMERCIO: ['accion', 'publico', 'indexable', 'estatico'],
  COMERCIO: ['portal', 'sesion-y-pertenencia', 'privado-noindex', 'ninguno'],
  CUENTA: ['personal', 'sesion', 'privado-noindex', 'ninguno'],
  ADMIN_ACTIVIDAD_NUEVA: ['administracion', 'admin', 'privado-noindex', 'ninguno'],
  ADMIN_ACTIVIDAD_EDITAR: ['administracion', 'admin', 'privado-noindex', 'ninguno'],
  ADMIN: ['administracion', 'admin', 'privado-noindex', 'ninguno'],
  NO_ENCONTRADA: ['fallback', 'publico', 'noindex', 'ninguno'],
});

export const ROUTE_MANIFEST = Object.freeze(
  Object.entries(ROUTE_PATHS).map(([key, path]) => {
    const [surface, access, seo, preview] = META[key];
    return Object.freeze({ key, path, surface, access, seo, preview });
  }),
);

const buildPath = (pattern, params) =>
  pattern.replace(/:([a-z]+)/gi, (_, key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Falta el parámetro :${key} para construir ${pattern}`);
    }
    return encodeURIComponent(String(value));
  });

export const withQuery = (pathname, values = {}) => {
  const query = new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null),
  ).toString();
  return query ? `${pathname}?${query}` : pathname;
};

const adminBase = ROUTE_PATHS.ADMIN.replace(/\/\*$/, '');

/** Builders para navegación. Ningún consumidor debería interpolar slugs o IDs a mano. */
export const RUTAS = Object.freeze({
  inicio: ROUTE_PATHS.INICIO,
  nosotros: ROUTE_PATHS.NOSOTROS,
  actividades: Object.freeze({
    lista: ROUTE_PATHS.ACTIVIDADES,
    detalle: (id) => buildPath(ROUTE_PATHS.ACTIVIDAD_DETALLE, { id }),
    confirmarAsistencia: ROUTE_PATHS.CONFIRMAR_ASISTENCIA,
  }),
  colaborar: ROUTE_PATHS.COLABORAR,
  transparencia: Object.freeze({
    rendicion: ROUTE_PATHS.RENDICION,
    documentacion: ROUTE_PATHS.DOCUMENTACION_LEGAL,
  }),
  contacto: ROUTE_PATHS.CONTACTO,
  agradecimiento: ROUTE_PATHS.AGRADECIMIENTO,
  auth: Object.freeze({
    ingresar: ROUTE_PATHS.INGRESAR,
    registrarse: ROUTE_PATHS.REGISTRARSE,
    solicitarRecuperacion: ROUTE_PATHS.SOLICITAR_RECUPERACION,
    actualizarClave: ROUTE_PATHS.ACTUALIZAR_CLAVE,
  }),
  legal: Object.freeze({
    privacidad: ROUTE_PATHS.PRIVACIDAD,
    terminos: ROUTE_PATHS.TERMINOS,
  }),
  alianzas: Object.freeze({
    lista: ROUTE_PATHS.ALIANZAS,
    detalle: (slug) => buildPath(ROUTE_PATHS.ALIANZA_DETALLE, { slug }),
    postularse: ROUTE_PATHS.POSTULAR_ALIANZA,
  }),
  beneficios: Object.freeze({
    lista: ROUTE_PATHS.BENEFICIOS,
    detalle: (slug) => buildPath(ROUTE_PATHS.BENEFICIO_DETALLE, { slug }),
    porId: (id) => buildPath(ROUTE_PATHS.BENEFICIO_POR_ID, { id }),
  }),
  novedades: Object.freeze({
    lista: ROUTE_PATHS.NOVEDADES,
    detalle: (slug) => buildPath(ROUTE_PATHS.NOVEDAD_DETALLE, { slug }),
    porId: (id) => buildPath(ROUTE_PATHS.NOVEDAD_POR_ID, { id }),
    porUuid: (id) => buildPath(ROUTE_PATHS.NOVEDAD_POR_UUID, { id }),
  }),
  preinscripcion: ROUTE_PATHS.PREINSCRIPCION,
  comunidad: Object.freeze({
    mostrador: ROUTE_PATHS.CLUB,
    postularComercio: ROUTE_PATHS.POSTULAR_COMERCIO,
    panelComercio: ROUTE_PATHS.COMERCIO,
  }),
  mi: Object.freeze({
    cuenta: ROUTE_PATHS.CUENTA,
    carnet: ROUTE_PATHS.CARNET,
  }),
  comision: Object.freeze({
    inicio: ROUTE_PATHS.COMISION,
    tab: (tab) => withQuery(ROUTE_PATHS.COMISION, { tab }),
    documentos: withQuery(ROUTE_PATHS.COMISION, { tab: 'documents' }),
  }),
  admin: Object.freeze({
    inicio: adminBase,
    patron: ROUTE_PATHS.ADMIN,
    tab: (tab) => withQuery(adminBase, { tab }),
    actividades: withQuery(adminBase, { tab: 'activities' }),
    educacion: ROUTE_PATHS.ADMIN_EDUCACION,
    actividadNueva: ROUTE_PATHS.ADMIN_ACTIVIDAD_NUEVA,
    actividadEditar: (id) => buildPath(ROUTE_PATHS.ADMIN_ACTIVIDAD_EDITAR, { id }),
  }),
});

