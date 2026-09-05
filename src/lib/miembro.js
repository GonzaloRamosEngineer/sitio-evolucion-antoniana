// src/lib/miembro.js
//
// Reglas de presentación de la condición institucional (ROADMAP §10.1.a).
// Puras, y en un solo lugar por el mismo motivo que `src/lib/acceso.js`: el
// carnet, el estado de cuenta y el padrón de la comisión hablan de lo mismo, y
// el 2026-09-05 ya se pagó una vez el precio de que dos pantallas contestaran
// «cómo está esta persona» desde fuentes distintas (§10.23).
//
// ⚠️ ACÁ NO SE DECIDE NADA DE ACCESO. La condición institucional y el acceso a
// beneficios son cosas distintas —esa separación es la decisión central de
// §10.2— y mezclarlas en la capa de presentación las volvería a pegar. Para el
// acceso está `src/lib/acceso.js`.
import { entidad } from '@/config/entidad';

/** Forma neutra: quien no es miembro, o todavía no cargó. */
export const SIN_MEMBRESIA = Object.freeze({
  es_miembro: false,
  numero: null,
  estado: null,
  fecha_alta: null,
  fecha_baja: null,
  categoria: null,
  vota: false,
  descuento_pct: 0,
  socio_desde: null,
  meses_aportados: 0,
  racha_meses: 0,
});

/* ============================
   Vocabulario
   ============================
   Cómo llama ESTA entidad a quien aporta. Se declaró en `entidad.js` el
   2026-08-16 junto con el modelo de §10.9 y quedó sin consumidor durante tres
   semanas; estas funciones son ese consumidor.

   Por qué importa y no es cosmética: una fundación no tiene "socios" —no tiene
   asociados ni asamblea— y escribir "socio" a mano en las pantallas habría
   metido el vocabulario de una asociación civil en el primer cliente. El
   refugio de animales dirá "padrino", la cámara "asociado", y ninguna de las
   tres necesita un fork. */

const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** 'padrino' / 'socio' / 'asociado', como lo llama esta entidad. */
export const figura = () => entidad.vocabulario?.aportante || 'miembro';

/** Plural. Se declara aparte porque el castellano no siempre agrega una 's'. */
export const figuraPlural = () =>
  entidad.vocabulario?.aportantePlural || `${figura()}s`;

/** Para arrancar una frase o un título: 'Padrino', 'Socio'. */
export const Figura = () => capitalizar(figura());

/** 'Número de padrino', 'Número de socio'. */
export const etiquetaNumero = () => `Número de ${figura()}`;

/* ============================
   Estado
   ============================ */

/**
 * Estado en una sola palabra, para elegir color y mensaje:
 * 'activo' | 'pendiente' | 'suspendido' | 'baja' | 'no_es_miembro'
 *
 * `no_es_miembro` no es un error ni un estado degradado: en una entidad de alta
 * automática es simplemente alguien que todavía no aportó.
 */
export const estadoMembresia = (m) => {
  if (!m || !m.estado) return 'no_es_miembro';
  return m.estado;
};

/** Etiqueta corta, para un badge. */
export const etiquetaEstado = (m) => {
  switch (estadoMembresia(m)) {
    case 'activo':
      return Figura();
    case 'pendiente':
      return 'Solicitud en revisión';
    case 'suspendido':
      return 'Suspendido';
    case 'baja':
      return 'De baja';
    default:
      return null;
  }
};

/**
 * Frase completa, para el carnet y el estado de cuenta, donde hay espacio.
 *
 * La de 'suspendido' dice explícitamente que **no es un problema de pago**,
 * porque es la confusión que la separación de §10.2 existe para evitar: quien
 * lee "suspendido" asume que debe plata, y muchas veces está al día.
 */
export const fraseEstado = (m) => {
  switch (estadoMembresia(m)) {
    case 'activo':
      return `Sos ${figura()} de ${entidad.nombreCorto}.`;
    case 'pendiente':
      return 'Tu solicitud está en revisión por la comisión directiva.';
    case 'suspendido':
      return 'Tu condición está suspendida por decisión de la comisión. No es un tema de pagos: escribinos y lo vemos.';
    case 'baja':
      return `Figurás de baja como ${figura()}. Podés volver cuando quieras.`;
    default:
      return null;
  }
};

/* ============================
   Antigüedad y pertenencia (§10.7)
   ============================
   El motivo por el que la gente aporta a una entidad civil es, en orden,
   pertenencia > causa > confianza > reconocimiento > reciprocidad. El acceso a
   descuentos es el más débil de los cinco y hasta ahora era el único que el
   sistema sabía mostrar. Esto es lo que muestra el primero. */

/** '3 años y 2 meses', '5 meses', '12 días'. Para el carnet. */
export const formatearAntiguedad = (desdeISO, hoy = new Date()) => {
  if (!desdeISO) return null;
  const inicio = new Date(`${desdeISO}T00:00:00`);
  if (Number.isNaN(inicio.getTime())) return null;

  const meses =
    (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth());
  // El día del mes decide si el mes en curso ya se cumplió. Sin esto, alguien
  // que entró el 30 figura con un mes desde el día 1.
  const ajustado = hoy.getDate() < inicio.getDate() ? meses - 1 : meses;

  if (ajustado < 1) {
    const dias = Math.max(0, Math.round((hoy - inicio) / 86400000));
    return dias <= 1 ? 'desde hoy' : `${dias} días`;
  }
  if (ajustado < 12) return ajustado === 1 ? '1 mes' : `${ajustado} meses`;

  const anios = Math.floor(ajustado / 12);
  const resto = ajustado % 12;
  const parteAnios = anios === 1 ? '1 año' : `${anios} años`;
  if (!resto) return parteAnios;
  return `${parteAnios} y ${resto === 1 ? '1 mes' : `${resto} meses`}`;
};

/**
 * La frase de pertenencia: "Aportaste 14 veces desde 2023, sostuviste 3 destinos".
 *
 * Devuelve `null` cuando no hay nada que contar. Es deliberado: una tarjeta que
 * dice "aportaste 0 veces" es peor que no mostrar la tarjeta.
 */
export const resumenPertenencia = ({ membresia, aportes = [] } = {}) => {
  const cantidad = aportes.length;
  if (!cantidad) return null;

  const total = aportes.reduce((suma, a) => suma + Number(a.monto || 0), 0);
  const destinos = new Set(aportes.map((a) => a.destino_id).filter(Boolean)).size;
  const desde = membresia?.socio_desde || null;

  return {
    cantidad,
    total,
    destinos,
    desde,
    antiguedad: formatearAntiguedad(desde),
    // La racha se muestra solo si es larga de verdad. "Racha: 1 mes" no premia
    // la continuidad, la subraya como si fuera poca.
    racha: Number(membresia?.racha_meses) >= 3 ? Number(membresia.racha_meses) : null,
  };
};

/** ¿Mostramos el botón de solicitar el alta? Solo en entidades de aprobación. */
export const ofreceSolicitud = (reglas, membresia) =>
  reglas?.modo_alta === 'aprobacion' && estadoMembresia(membresia) === 'no_es_miembro';
