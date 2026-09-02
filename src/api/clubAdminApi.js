// src/api/clubAdminApi.js
//
// ABM del club de beneficios (ROADMAP §12). Contrato único `{ data, error }`,
// nunca lanza (ver `src/lib/dataResult.js`).
//
// POR QUÉ EXISTE ESTE ARCHIVO. §12.7 dice que el objetivo del módulo es
// **copiarlo a otro proyecto y que funcione**. Sin una pantalla de alta, cada
// comercio nuevo necesita un desarrollador con acceso a la base — y entonces el
// módulo es portable a medias: viaja el código, no la operación. §12.8 nunca
// puso este ABM en ninguna fase; es un hueco del plan, no una decisión.
//
// Estas son ESCRITURAS DIRECTAS con la anon key, al revés que `clubApi.js`.
// Y está bien: acá no se toca `club_canjes`. Las RLS `*_board` exigen
// `is_board_member()`, así que la frontera real es la base. La tabla que otorga
// valor económico sigue sin tener policy de escritura para nadie.
import { supabase } from '@/lib/supabase';
import { listResult, rowResult, voidResult } from '@/lib/dataResult';

/* ============================
   Vocabulario (los `value` tienen que coincidir con los CHECK de la migración)
   ============================ */

export const ESTADOS_COMERCIO = [
  { value: 'pendiente', label: 'Pendiente', ayuda: 'Cargado pero todavía no visible en el catálogo.' },
  { value: 'activo', label: 'Activo', ayuda: 'Visible, y sus beneficios se pueden canjear.' },
  { value: 'pausado', label: 'Pausado', ayuda: 'Temporalmente fuera del catálogo. Se puede reactivar.' },
  { value: 'baja', label: 'De baja', ayuda: 'Archivado. Sus canjes NO se borran: son el libro del club.' },
];

export const ESTADOS_BENEFICIO = [
  { value: 'borrador', label: 'Borrador', ayuda: 'Se redacta con el comercio. Nadie lo ve todavía.' },
  { value: 'activo', label: 'Activo', ayuda: 'Publicado y canjeable.' },
  { value: 'pausado', label: 'Pausado', ayuda: 'Fuera del catálogo, sin borrarlo.' },
  { value: 'baja', label: 'De baja', ayuda: 'Terminado. Queda para el historial.' },
];

export const TIPOS_BENEFICIO = [
  { value: 'porcentaje', label: 'Porcentaje', ayuda: 'Un % de descuento. Requiere valor (máximo 100).' },
  { value: 'monto_fijo', label: 'Monto fijo', ayuda: 'Se descuenta una cantidad. Requiere valor.' },
  { value: '2x1', label: '2x1', ayuda: 'Sin valor: el ahorro depende de lo que se lleve la persona.' },
  { value: 'regalo', label: 'Regalo', ayuda: 'Sin valor: un obsequio con la compra.' },
];

export const VENTANAS = [
  { value: 'dia', label: 'Por día' },
  { value: 'semana', label: 'Por semana' },
  { value: 'mes', label: 'Por mes' },
  { value: 'total', label: 'Una sola vez, para siempre' },
];

export const ROLES_COMERCIO = [
  { value: 'dueno', label: 'Dueño', ayuda: 'Opera el mostrador. Pensado para el responsable del local.' },
  { value: 'cajero', label: 'Cajero', ayuda: 'Solo valida canjes.' },
];

export const DIAS_SEMANA = [
  { value: 0, label: 'Dom' }, { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' }, { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
];

/**
 * El slug, con el mismo alfabeto que el CHECK de la migración.
 *
 * Se define acá y no se importa de `destinosApi` a propósito: §12.7 regla 2
 * pide que el módulo no dependa de tablas ni de código del proyecto, para que
 * la carpeta se pueda copiar entera. Duplicar veinte líneas es el precio.
 */
export const slugify = (texto = '') =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* ============================
   Validación (pura: se testea sin base)
   ============================ */

export const validarComercio = (f) => {
  const e = {};
  if (!String(f.nombre || '').trim()) e.nombre = 'Poné el nombre del comercio.';
  const slug = String(f.slug || '').trim();
  if (!slug) e.slug = 'Hace falta un slug.';
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    e.slug = 'Solo minúsculas, números y guiones (sin espacios ni acentos).';
  }
  return e;
};

export const validarBeneficio = (f) => {
  const e = {};
  if (!String(f.titulo || '').trim()) e.titulo = 'Poné un título.';
  if (!f.tipo) e.tipo = 'Elegí un tipo.';

  // El CHECK `club_beneficios_valor_chk` rechaza esto en la base; acá se avisa
  // antes para que no llegue como un error de Postgres sin traducir.
  const necesitaValor = f.tipo === 'porcentaje' || f.tipo === 'monto_fijo';
  if (necesitaValor && (f.valor === '' || f.valor == null)) {
    e.valor = 'Este tipo necesita un valor.';
  }
  if (necesitaValor && f.valor !== '' && Number(f.valor) < 0) {
    e.valor = 'El valor no puede ser negativo.';
  }
  if (f.tipo === 'porcentaje' && f.valor !== '' && Number(f.valor) > 100) {
    e.valor = 'Un porcentaje no puede pasar de 100.';
  }

  // El slug va a una URL pública: si trae espacios o mayúsculas, el enlace
  // que se comparta por WhatsApp no resuelve. Se avisa acá y no en la base,
  // donde el único control es el índice único.
  if (f.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(f.slug).trim())) {
    e.slug = 'Solo minúsculas, números y guiones. Sin espacios ni tildes.';
  }

  // ⚠️ La red de contención de §12.11: un texto que menciona un código NO puede
  // ir a la vidriera. Es el bug de §12.10.13, que se filtró por texto libre.
  if (f.instrucciones && /\b(c[óo]digo|cupon|cup[óo]n|promo|voucher)\b/i.test(f.instrucciones)) {
    e.instrucciones =
      'No pongas un código acá: la vidriera es pública. El código lo emite el sistema al canjear.';
  }

  for (const [campo, etiqueta] of [
    ['antiguedad_minima_meses', 'La antigüedad'],
    ['aporte_minimo_acumulado', 'El aporte mínimo'],
    ['ahorro_maximo', 'El tope de ahorro'],
  ]) {
    const v = f[campo];
    if (v !== '' && v != null && Number(v) < 0) e[campo] = `${etiqueta} no puede ser negativa.`;
  }
  if (f.ahorro_maximo !== '' && f.ahorro_maximo != null && Number(f.ahorro_maximo) === 0) {
    e.ahorro_maximo = 'Un tope de 0 anularía el beneficio. Dejalo vacío para no poner tope.';
  }

  // `ventana` sin `limite_por_persona` no significa nada, y al revés tampoco.
  const tieneLimite = f.limite_por_persona !== '' && f.limite_por_persona != null;
  if (tieneLimite && Number(f.limite_por_persona) <= 0) {
    e.limite_por_persona = 'El límite tiene que ser mayor a cero.';
  }
  if (tieneLimite && !f.ventana) e.ventana = 'Elegí cada cuánto se puede usar.';
  if (!tieneLimite && f.ventana) {
    e.limite_por_persona = 'Si elegís una ventana, poné cuántas veces se puede usar.';
  }

  if (f.limite_total !== '' && f.limite_total != null && Number(f.limite_total) <= 0) {
    e.limite_total = 'El tope tiene que ser mayor a cero.';
  }
  if (f.stock !== '' && f.stock != null && Number(f.stock) < 0) {
    e.stock = 'El stock no puede ser negativo.';
  }
  if (f.vigencia_desde && f.vigencia_hasta && f.vigencia_hasta < f.vigencia_desde) {
    e.vigencia_hasta = 'La fecha de cierre no puede ser anterior a la de inicio.';
  }
  if (f.hora_desde && f.hora_hasta && f.hora_hasta <= f.hora_desde) {
    e.hora_hasta = 'La hora de cierre tiene que ser posterior a la de apertura.';
  }
  return e;
};

/** Pasa el formulario a lo que espera la tabla: '' -> null, números, arrays. */
export const beneficioAPayload = (f) => ({
  comercio_id: f.comercio_id,
  titulo: String(f.titulo).trim(),
  descripcion: f.descripcion?.trim() || null,
  terminos: f.terminos?.trim() || null,
  tipo: f.tipo,
  valor: f.valor === '' || f.valor == null ? null : Number(f.valor),
  requiere_acceso: Boolean(f.requiere_acceso),
  limite_por_persona:
    f.limite_por_persona === '' || f.limite_por_persona == null ? null : Number(f.limite_por_persona),
  ventana: f.ventana || null,
  limite_total: f.limite_total === '' || f.limite_total == null ? null : Number(f.limite_total),
  stock: f.stock === '' || f.stock == null ? null : Number(f.stock),
  vigencia_desde: f.vigencia_desde || null,
  vigencia_hasta: f.vigencia_hasta || null,
  dias_semana: f.dias_semana?.length ? f.dias_semana : null,
  hora_desde: f.hora_desde || null,
  hora_hasta: f.hora_hasta || null,
  estado: f.estado,
  orden: Number(f.orden) || 0,

  // Contenido de la vidriera (§12.10.15). Faltaban en el ABM y solo se podían
  // cargar por SQL, que es lo que §12.7 quiere evitar: dar de alta un beneficio
  // no debería necesitar un desarrollador.
  slug: f.slug?.trim() || null,
  instrucciones: f.instrucciones?.trim() || null,
  imagen_url: f.imagen_url?.trim() || null,

  // Requisitos proporcionales al valor del beneficio (§12.11).
  antiguedad_minima_meses:
    f.antiguedad_minima_meses === '' || f.antiguedad_minima_meses == null
      ? null
      : Number(f.antiguedad_minima_meses),
  aporte_minimo_acumulado:
    f.aporte_minimo_acumulado === '' || f.aporte_minimo_acumulado == null
      ? null
      : Number(f.aporte_minimo_acumulado),
  ahorro_maximo:
    f.ahorro_maximo === '' || f.ahorro_maximo == null ? null : Number(f.ahorro_maximo),
});

/* ============================
   Comercios
   ============================ */

/** Todos, sin filtrar por estado: la policy `*_board` deja ver el catálogo entero. */
export const listComercios = async () =>
  listResult(
    await supabase
      .from('club_comercios')
      .select('id, nombre, slug, rubro, cuit, logo_url, descripcion, estado, partner_id, created_at')
      .order('nombre'),
    'listComercios',
  );

export const createComercio = async (payload) =>
  rowResult(await supabase.from('club_comercios').insert([payload]).select().single(), 'createComercio');

export const updateComercio = async (id, payload) =>
  rowResult(
    await supabase.from('club_comercios').update(payload).eq('id', id).select().single(),
    'updateComercio',
  );

/**
 * No hay `deleteComercio` a propósito. Un comercio con canjes no se puede
 * borrar —la FK de `club_beneficios` es RESTRICT— y aunque se pudiera, borrarlo
 * dejaría al club y al comercio con números distintos. Se archiva con
 * `estado = 'baja'` (12.9.3).
 */

/* ============================
   Sucursales
   ============================ */

export const listSucursales = async (comercioId) =>
  listResult(
    await supabase
      .from('club_sucursales')
      .select('id, comercio_id, nombre, direccion, telefono, activa')
      .eq('comercio_id', comercioId)
      .order('nombre'),
    'listSucursales',
  );

export const createSucursal = async (payload) =>
  rowResult(await supabase.from('club_sucursales').insert([payload]).select().single(), 'createSucursal');

export const updateSucursal = async (id, payload) =>
  rowResult(
    await supabase.from('club_sucursales').update(payload).eq('id', id).select().single(),
    'updateSucursal',
  );

export const deleteSucursal = async (id) =>
  voidResult(await supabase.from('club_sucursales').delete().eq('id', id), 'deleteSucursal');

/* ============================
   Beneficios
   ============================ */

export const listBeneficiosDeComercio = async (comercioId) =>
  listResult(
    await supabase
      .from('club_beneficios')
      .select('*')
      .eq('comercio_id', comercioId)
      .order('orden')
      .order('titulo'),
    'listBeneficiosDeComercio',
  );

export const createBeneficio = async (payload) =>
  rowResult(await supabase.from('club_beneficios').insert([payload]).select().single(), 'createBeneficio');

export const updateBeneficio = async (id, payload) =>
  rowResult(
    await supabase.from('club_beneficios').update(payload).eq('id', id).select().single(),
    'updateBeneficio',
  );

/* ============================
   Operadores del mostrador
   ============================ */

/**
 * Quién puede validar canjes en este comercio.
 *
 * ⚠️ Esto NO es un rol de `users`: es la pertenencia a la tabla (§12.5). Por eso
 * el alta es «buscar una cuenta que ya existe y atarla», y no «crear un usuario
 * de tipo comercio», que no existe.
 */
export const listOperadores = async (comercioId) =>
  listResult(
    await supabase
      .from('club_comercio_usuarios')
      .select('comercio_id, user_id, rol, created_at, users!inner(id, name, email)')
      .eq('comercio_id', comercioId),
    'listOperadores',
  );

export const addOperador = async ({ comercioId, userId, rol = 'cajero' }) =>
  rowResult(
    await supabase
      .from('club_comercio_usuarios')
      .insert([{ comercio_id: comercioId, user_id: userId, rol }])
      .select()
      .single(),
    'addOperador',
  );

export const removeOperador = async (comercioId, userId) =>
  voidResult(
    await supabase
      .from('club_comercio_usuarios')
      .delete()
      .eq('comercio_id', comercioId)
      .eq('user_id', userId),
    'removeOperador',
  );

/** Busca cuentas por nombre o email, para atarlas al comercio. */
export const buscarUsuarios = async (texto) => {
  const q = String(texto || '').trim();
  if (q.length < 3) return { data: [], error: null };
  return listResult(
    await supabase
      .from('users')
      .select('id, name, email')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10),
    'buscarUsuarios',
  );
};

/** Partners ya aprobados, para poder colgar el comercio de uno existente. */
export const listPartnersAprobados = async () =>
  listResult(
    await supabase.from('partners').select('id, nombre, logo_url').eq('estado', 'aprobado').order('nombre'),
    'listPartnersAprobados',
  );
