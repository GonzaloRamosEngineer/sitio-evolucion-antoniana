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
  concepto: null,
});

/**
 * Forma neutra del resumen de aportes (`mi_resumen_aportes()`).
 *
 * Existe desde la regla 2026-10: una donación ya no da acceso, pero la persona
 * que donó tiene que verse REGISTRADA como donante aunque no tenga cuota, ni
 * fila en `memberships`, ni en el padrón de miembros.
 */
export const SIN_RESUMEN = Object.freeze({
  total_aportado: 0,
  cuotas_efectivas: 0,
  donaciones: 0,
  es_donante: false,
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
 * 'vigente' | 'gracia' | 'vencido' | 'donante' | 'sin_aportes'
 *
 * `donante` (regla 2026-10): nunca tuvo una cuota que diera acceso, pero sí
 * donó. No es «sin aportes» — decírselo a quien acaba de donar $20.000 es
 * negarle el aporte. Si alguna vez tuvo cuota, manda el estado de la cuota
 * (vencido/gracia): eso es lo que tiene que regularizar.
 */
export const estadoAcceso = (acceso, resumen = null) => {
  if (!acceso || (!acceso.tiene_acceso && !acceso.vence_el)) {
    return resumen?.es_donante ? 'donante' : 'sin_aportes';
  }
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
  donante: 'Donante',
  sin_aportes: 'Sin aportes',
};

export const etiquetaEstado = (acceso, resumen = null) => ETIQUETAS_ESTADO[estadoAcceso(acceso, resumen)];

/**
 * Cómo se PINTA cada estado del acceso (§10.23.c, 2026-09-09).
 *
 * Va acá y no en el componente por la misma razón que `ETIQUETAS_ESTADO`: es
 * una regla de presentación del acceso, y el acceso se muestra en más de una
 * pantalla. Un `vigente` verde en el panel y ámbar en el carnet serían dos
 * respuestas a la misma pregunta.
 *
 * Los nombres de tono son los que ya usa `Dashboard.jsx` para el estado de una
 * suscripción (`ok` / `atencion` / `cerrado`), así que el panel habla UN solo
 * idioma de estados. `vencido` es el que agrega esta tabla: una suscripción
 * cancelada está cerrada y no hay nada que hacer, un aporte vencido se puede
 * renovar hoy — no es lo mismo y no se pinta igual.
 *
 * ⚠️ Clases de modo claro, y es a propósito: la app es light-only desde la
 * Sesión G. No agregar variantes `dark:` acá.
 */
export const CLASE_ESTADO = {
  vigente: 'bg-green-500/10 text-green-700',
  gracia: 'bg-amber-500/15 text-amber-700',
  vencido: 'bg-red-500/10 text-red-700',
  donante: 'bg-brand-gold/15 text-brand-dark',
  sin_aportes: 'bg-gray-100 text-gray-500',
};

export const claseEstado = (acceso, resumen = null) =>
  CLASE_ESTADO[estadoAcceso(acceso, resumen)] ?? CLASE_ESTADO.sin_aportes;

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

/**
 * Qué SIGNIFICA el aporte (regla 2026-10), que es lo que le importa a la
 * persona. `origen` es el canal técnico —por dónde entró la plata— y una cuota
 * puede entrar por `donacion` (así aterriza el cobro de una suscripción), así
 * que mostrar el origen decía «Donación» a un socio mensual (§10.22).
 */
const CONCEPTOS = {
  cuota_mensual: 'Cuota mensual',
  adelanto_cuotas: 'Adelanto de cuotas',
  donacion_extraordinaria: 'Donación extraordinaria',
};

export const nombreConcepto = (concepto) => CONCEPTOS[concepto] ?? null;

/** De dónde viene el acceso: el concepto si la base lo informa, si no el canal. */
export const fuenteDelAcceso = (acceso) =>
  nombreConcepto(acceso?.concepto) ?? nombreOrigen(acceso?.origen);

/** Cuotas efectivas en "1 cuota" / "6 cuotas". Son cuotas, no meses de calendario. */
export const formatearCuotas = (cuotas) => {
  const total = Math.max(0, Math.trunc(Number(cuotas) || 0));
  return `${total} ${total === 1 ? 'cuota' : 'cuotas'}`;
};

/** Un monto en pesos, como se lee en Argentina: "$30.000". */
export const formatearPesos = (monto) =>
  `$${Number(monto || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

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
