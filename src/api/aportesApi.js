// src/api/aportesApi.js
// Capa de datos de `aportes` — el libro único (ROADMAP §10.7, §10.11).
// Contrato único: devuelve `{ data, error }` y NO lanza (ver `src/lib/dataResult.js`).
//
// POR QUÉ ESTE MÓDULO SOLO SABE CARGAR APORTES MANUALES
//
// `aportes` tiene tres orígenes: `donacion` y `membresia` los escribe el
// microservicio de pagos con `service_role`, y `manual` lo carga la comisión
// desde el panel. Las RLS lo imponen: la policy de INSERT exige
// `is_board_member() AND origen = 'manual'`, así que desde el browser no hay
// forma de inventar un aporte que diga venir de una pasarela.
//
// Y la carga manual NO es un parche mientras se arregla el webhook: una entidad
// recibe efectivo, transferencias y cheques, y esa plata tiene que entrar al
// mismo libro que la digital o la rendición no cuadra. Es el único circuito que
// hoy cierra de punta a punta, sin depender de ninguna pasarela.
import { supabase } from '@/lib/supabase';
import { listResult, rowResult } from '@/lib/dataResult';

/** Cómo se muestra cada origen. Los `value` coinciden con el CHECK del esquema. */
export const ORIGENES_APORTE = {
  donacion: { label: 'Donación', ayuda: 'Pago único que entró por la pasarela.' },
  membresia: { label: 'Suscripción', ayuda: 'Cobro recurrente de una suscripción.' },
  manual: { label: 'Manual', ayuda: 'Efectivo, transferencia o cheque, cargado por la comisión.' },
};

export const describirOrigen = (origen) =>
  ORIGENES_APORTE[origen] ?? { label: origen || 'sin origen', ayuda: '' };

/** Fecha de hoy en `YYYY-MM-DD`, que es lo que espera un `<input type="date">`. */
export const hoyISO = () => new Date().toISOString().slice(0, 10);

/**
 * Validación de un aporte manual, en el mismo orden que los CHECK de la base.
 * La base sigue siendo la que manda: esto es UX, no la frontera de seguridad.
 */
export const validarAporte = (f) => {
  const errores = {};

  if (!f.destino_id) errores.destino_id = 'Elegí a qué destino entra este aporte.';

  // El CHECK de la base es `monto > 0`. Un aporte de cero no es un aporte, y
  // uno negativo sería una devolución: eso es otra cosa y todavía no existe.
  if (f.monto === '' || Number(f.monto) <= 0 || Number.isNaN(Number(f.monto))) {
    errores.monto = 'Poné un monto mayor a cero.';
  }

  if (!f.fecha) errores.fecha = 'Poné la fecha en que entró la plata.';

  // Laxo a propósito: el mail sirve para reconciliar con la pasarela más
  // adelante (§10.1.c), pero exigir uno bien formado haría que un aporte en
  // efectivo sin mail no se pueda cargar. Perder el registro es peor.
  if (f.email_aportante && !f.email_aportante.includes('@')) {
    errores.email_aportante = 'Ese mail no parece válido. Dejalo vacío si no lo tenés.';
  }

  return errores;
};

/** Convierte el formulario a payload. Los vacíos van como null, nunca como ''. */
export const aPayloadAporte = (f) => ({
  destino_id: f.destino_id,
  monto: Number(f.monto),
  fecha: f.fecha,
  nombre_aportante: f.nombre_aportante.trim() || null,
  email_aportante: f.email_aportante.trim() || null,
  notas: f.notas.trim() || null,
  // Fijo, no viene del formulario: es lo único que la RLS deja insertar desde
  // el panel, y dejarlo elegir invitaría a marcar como `donacion` algo que la
  // pasarela nunca vio.
  origen: 'manual',
});

/**
 * Aportes con el nombre de su destino.
 *
 * Las RLS deciden qué se ve: la comisión y admin ven todo, y cualquier otro
 * usuario autenticado ve solo los suyos. Esta misma función sirve para las dos
 * cosas justamente porque el filtro no está acá.
 */
export const getAportes = async () =>
  listResult(
    await supabase
      .from('aportes')
      .select('*, destino:destinos(id, nombre, tipo)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
    'getAportes'
  );

export const createAporteManual = async (payload) =>
  rowResult(
    await supabase.from('aportes').insert(payload).select('*, destino:destinos(id, nombre, tipo)').maybeSingle(),
    'createAporteManual'
  );

/**
 * Corrige un aporte ya cargado.
 *
 * ⚠️ No existe `deleteAporte`, y no es un olvido: `aportes` no tiene policy de
 * DELETE. Un libro contable no se borra — un aporte mal cargado se corrige y
 * queda el rastro. Si alguna vez hace falta una corrección excepcional, se hace
 * con `service_role`, que puentea RLS y deja constancia de que fue excepcional.
 */
export const updateAporte = async (id, payload) =>
  rowResult(
    await supabase
      .from('aportes')
      .update(payload)
      .eq('id', id)
      .select('*, destino:destinos(id, nombre, tipo)')
      .maybeSingle(),
    'updateAporte'
  );
