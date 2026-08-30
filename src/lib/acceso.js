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
 * una columna de lectura pública (ROADMAP 11.1.a), así que ocultar el código en
 * pantalla no impide que alguien lo lea consultando la API directamente. La
 * protección real llega con los canjes de §11 fase 2, donde el código deja de
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
