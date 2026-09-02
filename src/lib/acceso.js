// src/lib/acceso.js
//
// Reglas de presentación del acceso del socio (ROADMAP §10 fase 1).
// Son puras y viven en un solo lugar a propósito: la decisión de si un
// beneficio se muestra bloqueado la toman tres pantallas distintas (catálogo,
// detalle y carnet) y no deben poder desincronizarse.

/** Forma neutra: lo que ve quien no tiene sesión o todavía no cargó el acceso. */
export const SIN_ACCESO = Object.freeze({
  tiene_acceso: false,
  vence_el: null,
  origen: null,
  en_gracia: false,
});

/**
 * ¿Este beneficio se muestra bloqueado para esta persona?
 *
 * ⚠️ Esto es UX, NO una frontera de seguridad. `benefits.codigo` sigue siendo
 * una columna de lectura pública (ROADMAP §12.1), así que ocultar el código en
 * pantalla no impide que alguien lo lea consultando la API directamente. La
 * protección real llega con los canjes de §12 fase 2, donde el código deja de
 * ser un texto fijo y pasa a emitirse por persona y de un solo uso.
 */
export const beneficioBloqueado = (benefit, acceso) =>
  Boolean(benefit?.requiere_acceso) && !acceso?.tiene_acceso;

/** Días que faltan (o que pasaron, en negativo) hasta una fecha `YYYY-MM-DD`. */
export const diasHasta = (fechaISO, hoy = new Date()) => {
  if (!fechaISO) return null;
  const dia = 24 * 60 * 60 * 1000;
  const fin = new Date(`${fechaISO}T00:00:00`);
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (Number.isNaN(fin.getTime())) return null;
  return Math.round((fin - inicio) / dia);
};

/**
 * Estado del acceso en una sola palabra, para elegir color y mensaje.
 * 'vigente' | 'gracia' | 'vencido' | 'sin_aportes'
 */
export const estadoAcceso = (acceso) => {
  if (!acceso || (!acceso.tiene_acceso && !acceso.vence_el)) return 'sin_aportes';
  if (acceso.en_gracia) return 'gracia';
  return acceso.tiene_acceso ? 'vigente' : 'vencido';
};

/**
 * Etiqueta corta del estado, para un badge.
 *
 * POR QUÉ VIVE ACÁ Y NO EN LA PÁGINA. Hasta el 2026-09-02 `/dashboard` y
 * `/carnet` contestaban «cómo está esta persona» desde fuentes DISTINTAS: el
 * carnet desde esta capa, y el dashboard inventando su propia taxonomía a
 * partir de `users` y `memberships` («SOCIO NIVEL BASE», «RANGO: PADRINO»,
 * «SOCIO DESDE 2025»). Le decían cosas contradictorias a la misma persona el
 * mismo día (§10.23). El vocabulario del estado se declara una vez.
 *
 * ⚠️ Son etiquetas de badge, no títulos: el carnet usa frases completas
 * («Tu aporte venció, estás en período de tolerancia») porque tiene el espacio
 * y es la credencial. Lo que NO puede diferir es el estado, y ese sale de
 * `estadoAcceso()` en los dos lados.
 */
const ETIQUETAS_ESTADO = {
  vigente: 'Aporte vigente',
  gracia: 'En tolerancia',
  vencido: 'Aporte vencido',
  sin_aportes: 'Sin aportes',
};

export const etiquetaEstado = (acceso) => ETIQUETAS_ESTADO[estadoAcceso(acceso)];

/**
 * Una fecha `YYYY-MM-DD` de la base, como la lee una persona.
 *
 * El `T00:00:00` no es adorno: sin él, `new Date('2026-09-02')` se interpreta
 * como UTC y en Argentina (UTC-3) muestra el día ANTERIOR. Estaba resuelto en
 * el carnet y se movió acá cuando el dashboard necesitó la misma fecha, para
 * que no haya dos formatos —ni dos zonas horarias— para el mismo dato.
 */
export const formatearFecha = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-AR', { dateStyle: 'long' }) : null;

/**
 * Cómo se llama en pantalla el origen del acceso.
 *
 * Los valores vienen de `aportes.origen` en la base y son
 * `membresia` | `donacion` | `manual` — NO `cuota`. El mapeo vive acá y no en
 * la página para que agregar un origen nuevo sea una entrada más y no una rama
 * suelta perdida en un JSX.
 */
const ORIGENES = {
  membresia: 'Cuota social',
  donacion: 'Donación',
  // Efectivo o transferencia cargada por la comisión. Se muestra neutro porque
  // el socio no tiene por qué saber por qué canal se registró.
  manual: 'Aporte registrado por la Fundación',
};

export const nombreOrigen = (origen) => ORIGENES[origen] ?? null;

/** Meses en "1 año y 7 meses", que es como lo lee una persona. */
export const formatearMeses = (meses) => {
  const total = Number(meses) || 0;
  if (total < 1) return 'menos de un mes';
  if (total < 12) return `${total} ${total === 1 ? 'mes' : 'meses'}`;
  const años = Math.floor(total / 12);
  const resto = total % 12;
  const parteAños = `${años} ${años === 1 ? 'año' : 'años'}`;
  if (resto === 0) return parteAños;
  return `${parteAños} y ${resto} ${resto === 1 ? 'mes' : 'meses'}`;
};
