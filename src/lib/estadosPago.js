// Estados de pago, en un solo lugar.
//
// POR QUÉ EXISTE ESTE ARCHIVO
// ---------------------------------------------------------------------------
// El 2026-08-16 el Dashboard mostraba, para los MISMOS tres registros,
// "CANCELADA" en las tarjetas y "PENDING" en la tabla de transparencia. Eran
// dos mapeos distintos escritos por separado en dos archivos, y cada uno
// terminaba en un `else` que se tragaba todos los estados que no había
// previsto:
//
//   - Dashboard.jsx     -> todo lo que no fuera active/paused decía "Cancelada"
//   - TransactionHistory -> todo lo que no fuera approved/active mostraba el
//                           estado crudo en inglés y con un reloj girando,
//                           así que un pago cancelado parecía estar en curso.
//
// El costo real: alguien que acaba de suscribirse queda en `pending` hasta que
// MercadoPago confirma, entra a ver si le salió bien, y le decimos que está
// cancelada.
//
// La lección es la del `else` que adivina: **un estado desconocido no se
// disfraza del estado que tenemos a mano.** Acá se declaran todos, y lo que no
// esté declarado se muestra tal cual para que se note.

/** Estados de `memberships` (CHECK del esquema: pending|active|paused|cancelled). */
export const ESTADOS_MEMBRESIA = {
  active: { label: 'Activa', tono: 'ok' },
  pending: { label: 'Pendiente', tono: 'curso' },
  paused: { label: 'Pausada', tono: 'curso' },
  cancelled: { label: 'Cancelada', tono: 'cerrado' },
};

/**
 * Estados que puede tener una fila del historial: mezcla `donations.status`
 * (los de MercadoPago) con `memberships.status`, porque la tabla los lista
 * juntos.
 */
export const ESTADOS_HISTORIAL = {
  approved: { label: 'Validado', tono: 'ok' },
  active: { label: 'Validado', tono: 'ok' },
  pending: { label: 'Pendiente', tono: 'curso' },
  in_process: { label: 'En proceso', tono: 'curso' },
  paused: { label: 'Pausada', tono: 'curso' },
  cancelled: { label: 'Cancelada', tono: 'cerrado' },
  rejected: { label: 'Rechazado', tono: 'cerrado' },
  refunded: { label: 'Reintegrado', tono: 'cerrado' },
};

/**
 * Busca un estado en el mapa que se le pase. Si no lo conoce devuelve el valor
 * crudo con tono 'desconocido' — nunca inventa uno.
 *
 * @param {Record<string, {label: string, tono: string}>} mapa
 * @param {string|null|undefined} status
 * @returns {{ label: string, tono: 'ok'|'curso'|'cerrado'|'desconocido' }}
 */
export const describirEstado = (mapa, status) => {
  const s = (status || '').toLowerCase();
  return mapa[s] ?? { label: s || 'sin estado', tono: 'desconocido' };
};
