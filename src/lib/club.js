// src/lib/club.js
//
// Reglas de PRESENTACIÓN del club (ROADMAP §12). No consultan la base ni
// deciden nada de negocio: eso vive en SQL y en las Edge Functions.
//
// Existen por el mismo motivo que `src/lib/acceso.js`: si cada pantalla formatea
// el contador o interpreta un error a su manera, el mostrador y el teléfono del
// socio terminan diciendo cosas distintas del mismo canje.

/** Segundos que faltan para que venza. Nunca negativo. */
export const segundosRestantes = (expiraEn, ahora = new Date()) => {
  if (!expiraEn) return 0;
  const ms = new Date(expiraEn).getTime() - ahora.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / 1000));
};

/** 'M:SS' para el contador. */
export const formatearCuenta = (segundos) => {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * El código partido en dos mitades: 'ZK4M2P' -> 'ZK4 M2P'.
 *
 * No es cosmético. El código se dicta en voz alta en un mostrador ruidoso, y
 * seis caracteres corridos se leen mal. El alfabeto ya evita los ambiguos
 * (sin 0/O ni 1/I/L); esto ataca el otro problema, que es el ritmo.
 */
export const agruparCodigo = (codigo) => {
  const c = String(codigo || '').toUpperCase();
  if (c.length !== 6) return c;
  return `${c.slice(0, 3)} ${c.slice(3)}`;
};

/** Cuando falta poco, la pantalla tiene que cambiar de tono. */
export const PARA_VENCER_SEG = 60;

/**
 * El estado que ve la persona, que no es exactamente el de la base: 'pendiente'
 * con el reloj en cero ya es, para quien mira la pantalla, un canje vencido.
 */
export const estadoCanje = (canje, ahora = new Date()) => {
  if (!canje) return 'ninguno';
  if (canje.estado === 'confirmado') return 'confirmado';
  if (canje.estado === 'anulado') return 'anulado';
  if (canje.estado === 'expirado') return 'vencido';
  const seg = segundosRestantes(canje.expira_en, ahora);
  if (seg === 0) return 'vencido';
  return seg <= PARA_VENCER_SEG ? 'por_vencer' : 'vigente';
};

/** El descuento en una etiqueta corta. `null` cuando no hay número que mostrar. */
export const etiquetaBeneficio = ({ tipo, valor } = {}) => {
  switch (tipo) {
    case 'porcentaje':
      return valor == null ? null : `${Number(valor)}% OFF`;
    case 'monto_fijo':
      return valor == null ? null : `$${Number(valor).toLocaleString('es-AR')}`;
    case '2x1':
      return '2x1';
    case 'regalo':
      return 'Regalo';
    default:
      return null;
  }
};

/**
 * Qué mostrarle a la persona ante un `codigo_error` de las Edge Functions.
 *
 * Las funciones devuelven el texto ya redactado; esto es la red por si aparece
 * un código nuevo o la respuesta llega sin `error`. Nunca devolver el código
 * crudo: 'limite_alcanzado' en pantalla no le dice nada a nadie.
 */
const MENSAJES = {
  sesion: 'Iniciá sesión para usar tus beneficios.',
  config: 'El servicio no está disponible en este momento. Probá más tarde.',
  sin_acceso: 'Este beneficio es para socios con acceso vigente.',
  // §12.11. La Edge Function manda el motivo ya redactado con los números
  // exactos ("te faltan 4 meses"); esto es solo la red si llegara sin texto.
  requisitos: 'Todavía no cumplís los requisitos de este beneficio.',
  fuera_de_ventana: 'Este beneficio no está disponible en este momento.',
  agotado: 'Este beneficio se agotó.',
  limite_alcanzado: 'Ya usaste este beneficio.',
  formato: 'Ese código no tiene el formato correcto.',
  inexistente: 'No encontramos ese código.',
  ajeno: 'Ese código no es de este comercio.',
  vencido: 'Ese código venció. Pedile al socio que genere uno nuevo.',
  anulado: 'Ese canje fue anulado.',
  reemplazado: 'El socio generó otro canje de este beneficio. Usá ese.',
  no_confirmado: 'Solo se anulan canjes confirmados.',
  monto_requerido: 'Falta el monto de la operación.',
  monto: 'El monto no es válido.',
  motivo: 'Escribí el motivo de la anulación.',
};

export const mensajeDeError = (respuesta, porDefecto = 'No se pudo completar la operación.') => {
  if (!respuesta) return porDefecto;
  if (typeof respuesta === 'string') return respuesta;
  if (respuesta.error) return respuesta.error;
  if (respuesta.codigo_error && MENSAJES[respuesta.codigo_error]) {
    return MENSAJES[respuesta.codigo_error];
  }
  return porDefecto;
};

/**
 * Normaliza lo que tipea el cajero: mayúsculas, sin espacios y solo caracteres
 * del alfabeto. Que el campo acepte 'zk4 m2p' y mande 'ZK4M2P' evita el rechazo
 * más tonto posible en la caja.
 */
export const normalizarCodigo = (texto) =>
  String(texto || '')
    .toUpperCase()
    .replace(/[^2-9A-HJKMNP-Z]/g, '')
    .slice(0, 6);

export const CODIGO_VALIDO = /^[2-9A-HJKMNP-Z]{6}$/;
export const esCodigoValido = (codigo) => CODIGO_VALIDO.test(String(codigo || ''));

/* ============================================================
   LA VIDRIERA (ROADMAP §12.10.13 a §12.10.15)

   Por qué existe esto y no un `select` distinto en cada página: al 2026-09-02
   el mismo beneficio vivía en los DOS catálogos con reglas opuestas —`benefits`
   abierto y `club_beneficios` gateado— y el abierto anulaba al gateado. Nadie
   necesitaba ser socio.

   La corrección no es "acordarse de no publicar el código". Es que el catálogo
   público tenga UNA fuente y que la forma que sale de acá **no tenga dónde
   poner un código**. `mapearABeneficio()` no copia `codigo` ni
   `codigo_descuento` porque en el modelo de canje esos campos no existen: el
   código se emite por persona y de un solo uso (§12.8). Que la fuga sea
   imposible por estructura es más barato que recordarla en una regla.

   ⚠️ Y por eso `instrucciones` se sanea: en la fila vieja el código también
   viajaba DENTRO del texto libre ("Usá el código DMGlobal…"), así que blindar
   la columna no alcanzaba (§12.10.13).
   ============================================================ */

/**
 * El logo, con la cadena de fallback que la base obliga a tener.
 *
 * `club_comercios.logo_url` está en NULL para el único comercio cargado, así
 * que la fuente real es `partners.logo_url` por `partner_id`. Si esto se
 * escribe sin fallback, la vidriera sale sin logo y **no falla**: simplemente
 * no se ve, que es la clase de bug que solo encuentra mirar la pantalla.
 */
const logoDelComercio = (comercio) =>
  comercio?.logo_url || comercio?.partners?.logo_url || null;

/**
 * Saca de un texto libre cualquier cosa que parezca un código de descuento.
 *
 * Es una red, no la solución: la solución es que la entidad no lo escriba. Pero
 * el texto lo carga una persona en un ABM y esta función es lo único que se
 * interpone entre esa persona y una página pública. Ante la duda, corta la
 * oración entera: perder media instrucción es mucho más barato que publicar un
 * código que vale dinero.
 */
export const sanearInstrucciones = (texto) => {
  if (!texto) return null;
  const limpio = String(texto)
    .split(/(?<=[.!?])\s+|→/)
    .filter((frase) => !/\b(c[óo]digo|cupon|cup[óo]n|promo|voucher)\b/i.test(frase))
    .join(' → ')
    .trim();
  return limpio || null;
};

/**
 * Una fila de `club_beneficios` (con sus embeds) en la forma que ya consumen
 * `/beneficios` y `/beneficios/:slug`.
 *
 * Se adapta la forma NUEVA a la vieja, y no al revés, a propósito: así el
 * cambio de fuente no toca el JSX de dos páginas que hoy andan. El día que
 * `benefits` se retire, esta función es lo único que hay que borrar.
 */
export const mapearABeneficio = (fila) => {
  if (!fila) return null;
  const comercio = fila.club_comercios ?? null;
  return {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion ?? null,
    // El rubro del comercio ES la categoría. En `benefits` era una columna
    // repetida en cada beneficio del mismo comercio (§12.10.15).
    categoria: comercio?.rubro ?? null,
    imagen_url: fila.imagen_url || logoDelComercio(comercio),
    partner_id: comercio?.partner_id ?? null,
    fecha_inicio: fila.vigencia_desde ?? null,
    fecha_fin: fila.vigencia_hasta ?? null,
    estado: fila.estado,
    slug: fila.slug ?? null,
    instrucciones: sanearInstrucciones(fila.instrucciones),
    terminos: fila.terminos ?? null,
    descuento: etiquetaBeneficio(fila),
    sitio_web: comercio?.partners?.sitio_web ?? null,
    contacto_email: comercio?.partners?.contacto_email ?? null,
    requiere_acceso: Boolean(fila.requiere_acceso),

    // NO se mapean `codigo` ni `codigo_descuento`: no existen en este modelo.
    // Si alguien los agrega acá, vuelve la fuga de §12.10.13.

    // Lo que la vidriera necesita para ofrecer el canje sin ir a buscar nada.
    tipo: fila.tipo,
    valor: fila.valor ?? null,
    // Requisitos del beneficio (§12.11). Se mapean para que la pantalla pueda
    // decir QUÉ falta; quien los HACE CUMPLIR es la Edge Function.
    antiguedad_minima_meses: fila.antiguedad_minima_meses ?? null,
    aporte_minimo_acumulado: fila.aporte_minimo_acumulado ?? null,
    ahorro_maximo: fila.ahorro_maximo ?? null,
    comercio: comercio && {
      id: comercio.id,
      nombre: comercio.nombre,
      slug: comercio.slug,
      rubro: comercio.rubro ?? null,
      logo_url: logoDelComercio(comercio),
    },
  };
};

/**
 * Qué se le ofrece a quien está mirando un beneficio.
 *
 * Devuelve una sola forma con el estado y el CTA ya resueltos, porque la
 * decisión la toman tres lugares —el card del listado, el detalle y el club— y
 * el bug de §12.10.13 fue precisamente que dos pantallas del mismo beneficio
 * decidieran distinto.
 *
 * `puedeCanjear` es lo único que habilita el botón real. Notar que NUNCA
 * devuelve un código: el código lo emite la Edge Function.
 */
/**
 * Qué le falta a esta persona para los requisitos del beneficio (§12.11).
 *
 * ⚠️ ESTO ES UX, NO UNA FRONTERA. La misma comparación vive en
 * `supabase/functions/_shared/club-reglas.ts` (`cumpleRequisitos`), que es
 * quien decide de verdad porque corre con `service_role` y vuelve a preguntar
 * los hechos a la base. Acá se duplica una comparación de `>=` a propósito:
 * el browser no puede importar del runtime de Deno, y mostrar el estado sin
 * pedirle permiso al servidor es lo que hace que la pantalla se sienta viva.
 * **Si las dos divergen, la que manda es la Edge Function.**
 *
 * Los dos caminos son OR: alcanza con la antigüedad **o** con el monto.
 */
export const faltaParaBeneficio = (beneficio, elegibilidad) => {
  const minMeses = beneficio?.antiguedad_minima_meses ?? null;
  const minMonto = beneficio?.aporte_minimo_acumulado ?? null;
  if (minMeses == null && minMonto == null) return null;

  const meses = Number(elegibilidad?.meses_aportados ?? 0);
  const monto = Number(elegibilidad?.aporte_acumulado ?? 0);
  if ((minMeses != null && meses >= minMeses) || (minMonto != null && monto >= minMonto)) {
    return null;
  }

  const faltanMeses = minMeses != null ? Math.max(0, minMeses - meses) : null;
  const faltaMonto = minMonto != null ? Math.max(0, minMonto - monto) : null;
  const partes = [];
  if (faltanMeses != null) {
    partes.push(`${faltanMeses} ${faltanMeses === 1 ? 'mes' : 'meses'} de aporte`);
  }
  if (faltaMonto != null) partes.push(`${faltaMonto.toLocaleString('es-AR')} acumulados`);
  return { faltanMeses, faltaMonto, texto: partes.join(' o ') };
};

export const accionVidriera = ({ beneficio, acceso, haySesion, elegibilidad } = {}) => {
  const requiere = Boolean(beneficio?.requiere_acceso);
  const tieneAcceso = Boolean(acceso?.tiene_acceso);

  // Abierto a todo el mundo: no hay nada que desbloquear.
  if (!requiere) {
    return {
      estado: 'abierto',
      puedeCanjear: haySesion === true,
      mensaje: haySesion
        ? null
        : 'Iniciá sesión para canjearlo: el código se emite a tu nombre.',
      cta: haySesion
        ? { texto: 'Generar mi código', href: null }
        : { texto: 'Iniciar sesión', href: '/login' },
    };
  }

  if (!haySesion) {
    return {
      estado: 'sin_sesion',
      puedeCanjear: false,
      mensaje: 'Este beneficio es para socios con aporte vigente.',
      cta: { texto: 'Ingresar o asociarme', href: '/login' },
    };
  }

  if (!tieneAcceso) {
    return {
      estado: 'sin_acceso',
      puedeCanjear: false,
      // Se dice qué falta y no "no tenés permiso": el que mira esto ya tiene
      // cuenta, así que está a un aporte de distancia y conviene que lo sepa.
      mensaje: 'Te falta un aporte vigente para canjear este beneficio.',
      // ⚠️ '/collaborate', en inglés. NO '/colaborar': esa ruta no existe y
      // renderiza el 404 — que mide 25.865 bytes y tiene <nav> y <footer>, así
      // que no se ve roto. Es literalmente la trampa que documenta §11.4, y
      // este archivo cayó en ella el 2026-09-02. Hay un test que ahora cruza
      // cada href de acá contra las rutas reales de App.jsx.
      cta: { texto: 'Quiero aportar', href: '/collaborate' },
    };
  }

  // Tiene acceso, pero el beneficio puede pedir antigüedad además (§12.11).
  // Va DESPUÉS del acceso a propósito: "te falta un aporte vigente" es un
  // mensaje distinto, y más urgente, que "te faltan 4 meses".
  const falta = faltaParaBeneficio(beneficio, elegibilidad);
  if (falta) {
    return {
      estado: 'sin_requisitos',
      puedeCanjear: false,
      // Se dice el número exacto y no "no cumplís": alguien a un mes de
      // distancia se queda; alguien a quien le dicen "no podés", se va.
      mensaje: `Te ${falta.faltanMeses === 1 ? 'falta' : 'faltan'} ${falta.texto} para este beneficio. Tu aporte ya está vigente.`,
      cta: { texto: 'Ver mi carnet', href: '/carnet' },
      falta,
    };
  }

  return {
    estado: acceso?.en_gracia ? 'en_gracia' : 'puede_canjear',
    puedeCanjear: true,
    mensaje: acceso?.en_gracia
      ? 'Tu último aporte venció, pero seguís con acceso por el período de gracia.'
      : null,
    cta: { texto: 'Generar mi código', href: null },
  };
};
