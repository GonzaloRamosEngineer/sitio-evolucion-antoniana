// src/api/destinosApi.js
// Capa de datos de `destinos` (ROADMAP §10.9, migración 20260816140000).
// Contrato único: devuelve `{ data, error }` y NO lanza (ver `src/lib/dataResult.js`).
//
// Un destino es *aquello a lo que se le puede dar plata*, y hay tres tipos:
// campaña (finita, con meta), padrinable (sostenido en el tiempo) e
// institucional (la entidad misma). El acceso real lo controlan las RLS:
// `anon` solo ve los `activo`, y escribir requiere `is_board_member()`.
import { supabase } from '@/lib/supabase';
import { listResult, rowResult, voidResult } from '@/lib/dataResult';

/** Tipos de destino. El label es de la UI; el value tiene que coincidir con el CHECK. */
export const TIPOS_DESTINO = [
  {
    value: 'campana',
    label: 'Campaña',
    ayuda: 'Un objetivo concreto y finito, con meta. Cierra cuando se cumple.',
  },
  {
    value: 'padrinable',
    label: 'Padrinable',
    ayuda: 'Algo o alguien sostenido en el tiempo, con aportes recurrentes.',
  },
  {
    value: 'institucional',
    label: 'Institucional',
    ayuda: 'La entidad misma: administración, espacio físico, equipo.',
  },
];

export const ESTADOS_DESTINO = [
  { value: 'borrador', label: 'Borrador', ayuda: 'No se muestra en el sitio.' },
  { value: 'activo', label: 'Activo', ayuda: 'Visible y recibiendo aportes.' },
  { value: 'pausado', label: 'Pausado', ayuda: 'Oculto temporalmente.' },
  { value: 'cerrado', label: 'Cerrado', ayuda: 'Terminó. Se conserva para la rendición.' },
];

/**
 * Visibilidad del beneficiario. Es la decisión más delicada del formulario y por
 * eso el texto de ayuda es explícito: en una entidad con menores el beneficiario
 * NO se puede mostrar; en un refugio de animales mostrarlo es el motor de la
 * recaudación. El default de la base es `anonimizado` justamente para que un
 * olvido no exponga a nadie (ver §10.9).
 */
export const VISIBILIDADES = [
  {
    value: 'anonimizado',
    label: 'Anonimizado (recomendado)',
    ayuda: 'No se publica quién recibe el aporte. Obligatorio si son personas, y con más razón si son menores.',
  },
  {
    value: 'publico',
    label: 'Público',
    ayuda: 'Se muestra nombre e imagen del beneficiario. Usar solo si NO es una persona.',
  },
];

/** Slug a partir del nombre: minúsculas, sin acentos, separado por guiones. */
export const slugify = (texto = '') =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacriticos sueltos que dejo NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/**
 * Validación en el mismo orden que los CHECK de la base, para que el usuario vea
 * un mensaje claro en vez del error de Postgres. La base sigue siendo la que
 * manda: esto es UX, no la frontera.
 */
export const validarDestino = (f) => {
  const errores = {};
  if (!f.nombre.trim()) errores.nombre = 'Poné un nombre.';
  if (!f.admite_puntual && !f.admite_recurrente) {
    errores.admite = 'Elegí al menos una forma de aporte, si no el destino no puede recibir nada.';
  }
  if (f.meta_monto !== '' && Number(f.meta_monto) <= 0) {
    errores.meta_monto = 'La meta tiene que ser mayor a cero.';
  }
  if (f.cupos_totales !== '' && Number(f.cupos_totales) <= 0) {
    errores.cupos_totales = 'Los cupos tienen que ser mayores a cero.';
  }
  if (f.fecha_inicio && f.fecha_fin && f.fecha_fin < f.fecha_inicio) {
    errores.fecha_fin = 'La fecha de cierre no puede ser anterior a la de inicio.';
  }
  return errores;
};

/**
 * Destino efectivamente elegido, dado lo que el usuario tocó y la lista actual.
 *
 * Existe para no sincronizar el estado con un `useEffect`: la lista llega
 * asincrónica y puede cambiar (se cierra una campaña, la comisión reordena),
 * así que el id guardado puede quedar apuntando a algo que ya no está. En vez
 * de corregirlo con un efecto —que siempre llega un render tarde y deja la
 * pantalla mostrando A mientras se envía B— se deriva en cada render.
 *
 * El default es `destinos[0]`, y no el institucional, a propósito: la lista
 * viene ordenada por `orden`, así que el primero es el que la entidad decidió
 * poner adelante. Respetar esa decisión es más útil que imponer una nuestra.
 *
 * @param {string|null} idElegido - lo último que tocó el usuario, o null.
 * @param {Array<{id: string}>} destinos - lista vigente, ya filtrada.
 * @returns {string|null} id vigente, o null si no hay ninguno.
 */
export const destinoEfectivo = (idElegido, destinos = []) =>
  destinos.some((d) => d.id === idElegido) ? idElegido : destinos[0]?.id ?? null;

/** Todos los destinos, para el panel. Las RLS filtran según quién consulta. */
export const getDestinos = async () =>
  listResult(
    await supabase
      .from('destinos')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false }),
    'getDestinos'
  );

/** Un destino por slug. `.maybeSingle()`: "no existe" es data null, no error. */
export const getDestinoBySlug = async (slug) => {
  if (!slug) return { data: null, error: null };

  return rowResult(
    await supabase.from('destinos').select('*').eq('slug', slug).maybeSingle(),
    'getDestinoBySlug'
  );
};

export const createDestino = async (payload) =>
  rowResult(
    await supabase.from('destinos').insert(payload).select('*').maybeSingle(),
    'createDestino'
  );

export const updateDestino = async (id, payload) =>
  rowResult(
    await supabase.from('destinos').update(payload).eq('id', id).select('*').maybeSingle(),
    'updateDestino'
  );

/**
 * Borra un destino.
 *
 * La FK de `aportes.destino_id` es ON DELETE RESTRICT, así que la base rechaza
 * borrar uno que ya recibió plata: es un invariante contable, no una validación
 * de UI. El error de Postgres (23503) se traduce acá para que el panel muestre
 * algo que se entienda en vez de "violates foreign key constraint".
 */
export const deleteDestino = async (id) => {
  const resultado = voidResult(
    await supabase.from('destinos').delete().eq('id', id),
    'deleteDestino'
  );

  if (resultado.error?.code === '23503') {
    return {
      ...resultado,
      error: {
        ...resultado.error,
        message:
          'Este destino ya recibió aportes, así que no se puede borrar: el libro tiene que seguir cuadrando. Cerralo en vez de borrarlo.',
      },
    };
  }

  return resultado;
};
