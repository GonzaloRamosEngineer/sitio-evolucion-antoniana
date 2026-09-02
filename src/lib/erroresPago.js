// src/lib/erroresPago.js
//
// Traducir un error de MercadoPago a algo que una persona pueda ACCIONAR.
//
// POR QUÉ EXISTE
// ---------------------------------------------------------------------------
// El 2026-09-02 el dueño del proyecto intentó suscribirse y recibió un cartel
// rojo con esto adentro:
//
//     {"message":"...","error":"bad_request","status":400,
//      "cause":[{"code":"...","description":"guest_site_mismatch"}]}
//
// El JSON crudo de MercadoPago, tal cual. La cadena de por qué llegó así:
//
//   1. el servicio de pagos hace `res.status(400).json({ error: data })` con la
//      respuesta ENTERA de MercadoPago (`subscription.controller.js`);
//   2. `membershipApi.js` no sabía qué hacer con un `error` que no es string y
//      lo pasaba por `JSON.stringify`;
//   3. `Collaborate.jsx` lo mostraba como `description` del toast.
//
// Ningún paso está mal por separado. El resultado es que la persona que estaba
// a un clic de aportar ve un objeto JSON y se va.
//
// Y el diagnóstico real era **accionable**: ese email estaba registrado en
// MercadoPago **Uruguay**, y una cuenta de otro país no puede pagarle a un
// cobrador argentino. La salida era usar otro email — que es exactamente lo
// que hizo, después de averiguarlo por su cuenta.
//
// QUÉ HACE ESTE ARCHIVO, Y QUÉ NO
// ---------------------------------------------------------------------------
// No adivina. Reconoce las firmas que se pueden reconocer y, para todo lo
// demás, **extrae el texto más específico que MercadoPago haya mandado** en vez
// de volcar la estructura. Ese camino de descarte es el que más vale: cubre los
// errores que todavía no vimos, que son la mayoría.
//
// ⚠️ **La forma del error de MercadoPago no es un contrato nuestro.** Puede
// venir como `{message}`, como `{error}`, con `cause: [{code, description}]` o
// anidado de otra manera. Por eso el reconocimiento se hace juntando TODAS las
// cadenas del objeto y buscando firmas ahí, en vez de leer rutas fijas como
// `payload.cause[0].description` — una ruta fija se rompe en silencio el día
// que cambian el envoltorio, y "no reconocí nada" se ve igual que "no había
// nada".

/** Recolecta todas las cadenas de un valor anidado, en minúscula. */
const cadenasDe = (valor, acumulador = []) => {
  if (valor == null) return acumulador;
  if (typeof valor === 'string') {
    if (valor.trim()) acumulador.push(valor.trim().toLowerCase());
    return acumulador;
  }
  if (Array.isArray(valor)) {
    for (const v of valor) cadenasDe(v, acumulador);
    return acumulador;
  }
  if (typeof valor === 'object') {
    for (const v of Object.values(valor)) cadenasDe(v, acumulador);
  }
  return acumulador;
};

/**
 * Las firmas conocidas.
 *
 * `observado` distingue lo que VIMOS de lo que está por precaución, y no es un
 * detalle de estilo: una regla que nunca se disparó puede estar mal escrita y
 * nadie se enteraría. Las defensivas se anotan como tales para que el día que
 * aparezca el caso real se confirme el texto en vez de darlo por bueno.
 */
const REGLAS = [
  {
    id: 'sitio_distinto',
    observado: '2026-09-02',
    // `guest_site_mismatch` es la firma exacta que devolvió MercadoPago.
    firmas: ['guest_site_mismatch', 'site_mismatch', 'different site', 'distinto pais'],
    titulo: 'Ese email es de una cuenta de MercadoPago de otro país',
    descripcion:
      'MercadoPago no permite pagarle a una cuenta argentina desde una cuenta de otro ' +
      'país. Probá con otro email —uno que no tenga cuenta de MercadoPago, o que la ' +
      'tenga en Argentina— usando la opción «pagar con otro email».',
  },
  {
    id: 'mismo_usuario',
    observado: null, // defensivo: no se vio todavía
    firmas: [
      'cannot operate between',
      'payer and collector',
      'collector cannot be the payer',
      'same user',
    ],
    titulo: 'Esa cuenta de MercadoPago es la que recibe los aportes',
    descripcion:
      'No se puede aportar desde la misma cuenta de MercadoPago que cobra. Usá otro ' +
      'email con la opción «pagar con otro email».',
  },
  {
    id: 'email_invalido',
    observado: null, // defensivo
    firmas: ['invalid payer email', 'payer_email', 'invalid_email', 'email is invalid'],
    titulo: 'MercadoPago rechazó el email',
    descripcion:
      'Revisá que esté bien escrito y volvé a intentar. Si el problema sigue, probá ' +
      'con otro email.',
  },
  {
    id: 'monto_invalido',
    observado: null, // defensivo
    firmas: ['invalid transaction_amount', 'transaction_amount', 'invalid amount'],
    titulo: 'MercadoPago rechazó el monto',
    descripcion: 'Elegí uno de los montos sugeridos y volvé a intentar.',
  },
];

/** El texto más específico que haya mandado MercadoPago, o `null`. */
const textoDeMercadoPago = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  // `cause[].description` es lo más específico cuando viene; después `message`.
  const causa = Array.isArray(payload.cause) ? payload.cause : [];
  for (const c of causa) {
    const t = typeof c?.description === 'string' ? c.description.trim() : '';
    if (t) return t;
  }
  for (const clave of ['message', 'error_message', 'error_description']) {
    const t = typeof payload[clave] === 'string' ? payload[clave].trim() : '';
    // ⚠️ `error: 'bad_request'` NO sirve como mensaje: es la categoría HTTP,
    // no lo que pasó. Mostrarlo sería cambiar un JSON incomprensible por una
    // palabra incomprensible.
    if (t && !['bad_request', 'internal_error', 'not_found'].includes(t.toLowerCase())) {
      return t;
    }
  }
  return null;
};

/**
 * ¿Este texto es una estructura serializada y no una frase?
 *
 * Se pregunta parseando, no mirando el primer carácter: la versión por
 * carácter dejaba pasar los arrays. Solo cuenta como JSON lo que sea objeto o
 * array — `JSON.parse('"hola"')` y `JSON.parse('42')` también son JSON válido,
 * y eso sí se le puede mostrar a alguien.
 */
const pareceJson = (texto) => {
  try {
    const v = JSON.parse(texto);
    return typeof v === 'object' && v !== null;
  } catch {
    return false;
  }
};

const GENERICO = {
  donacion: {
    titulo: 'No se pudo iniciar la donación',
    descripcion: 'Volvé a intentar en un momento. Si sigue igual, escribinos y lo resolvemos.',
  },
  suscripcion: {
    titulo: 'No se pudo iniciar la suscripción',
    descripcion: 'Volvé a intentar en un momento. Si sigue igual, escribinos y lo resolvemos.',
  },
};

/**
 * `{ titulo, descripcion, codigo }` para mostrarle a una persona.
 *
 * `codigo` es un rastro corto —la firma o el status— para que quien reporte el
 * problema pueda decir algo útil. **Nunca es el JSON entero**: eso es lo que
 * este archivo vino a sacar de la pantalla.
 *
 * @param {Error & {isColdStart?: boolean, status?: number, payload?: unknown}} error
 * @param {{ accion?: 'donacion'|'suscripcion' }} opciones
 */
export function mensajeErrorPago(error, { accion = 'donacion' } = {}) {
  // El cold-start de Render ya tenía su mensaje y es correcto: el servicio
  // tarda hasta un minuto en despertar y no hay nada que arreglar (§10.21).
  if (error?.isColdStart) {
    return {
      titulo: 'El servicio de pagos está iniciándose',
      descripcion:
        error.message ||
        'Puede tardar hasta un minuto. Esperá unos segundos y volvé a intentar.',
      codigo: 'cold_start',
    };
  }

  const payload = error?.payload ?? null;
  // Se busca en el payload Y en el mensaje: si `membershipApi` ya lo aplastó a
  // string (o si el error viene de otro lado), la firma sigue estando ahí.
  const donde = [...cadenasDe(payload), ...cadenasDe(error?.message)].join(' | ');

  for (const regla of REGLAS) {
    if (regla.firmas.some((f) => donde.includes(f))) {
      return { titulo: regla.titulo, descripcion: regla.descripcion, codigo: regla.id };
    }
  }

  const deMP = textoDeMercadoPago(payload);
  const base = GENERICO[accion] ?? GENERICO.donacion;

  if (deMP) {
    return {
      titulo: base.titulo,
      descripcion: `${deMP}. Si no queda claro, escribinos y lo resolvemos.`,
      codigo: error?.status ? `mp_${error.status}` : 'mp',
    };
  }

  // Ni firma conocida ni texto legible. Acá es donde antes se mostraba el JSON.
  //
  // ⚠️ La primera versión de esta guarda era `!message.startsWith('{')`, y se
  // le escapaba `[{"x":1}]` — un array JSON no empieza con llave. Lo encontró
  // el propio test, que recorre varias formas en vez de una: **una sola forma
  // de JSON habría dado verde**. Ahora se pregunta si el texto ES JSON, que es
  // lo que realmente importa, en vez de adivinarlo por el primer carácter.
  const mensaje = typeof error?.message === 'string' ? error.message.trim() : '';
  return {
    titulo: base.titulo,
    descripcion: mensaje && !pareceJson(mensaje) ? mensaje : base.descripcion,
    codigo: error?.status ? `http_${error.status}` : 'desconocido',
  };
}
