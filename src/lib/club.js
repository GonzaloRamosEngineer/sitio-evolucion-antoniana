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
  sin_acceso: 'Este beneficio es para socios con acceso vigente.',
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
