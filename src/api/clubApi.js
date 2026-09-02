// src/api/clubApi.js
//
// Club de beneficios, fase 2 (ROADMAP §12). Contrato único `{ data, error }`,
// nunca lanza (ver `src/lib/dataResult.js`).
//
// LA DIFERENCIA CON EL RESTO DE `src/api/`: acá las ESCRITURAS no salen del
// browser. `club_canjes` no tiene policy de INSERT ni de UPDATE, así que
// generar, confirmar y anular pasan sí o sí por Edge Functions con
// `service_role` (§12.5). Si alguna vez alguien "arregla" esto agregando un
// insert directo, el club deja de tener sentido: cualquiera con las devtools
// abiertas se autogenera canjes confirmados y del otro lado hay un comercio
// esperando que le paguen.
//
// Las lecturas sí van directas, filtradas por RLS.
import { supabase } from '@/lib/supabase';
import { listResult, attempt } from '@/lib/dataResult';

/* ============================
   Catálogo
   ============================ */

/**
 * Beneficios publicados, con su comercio. Las RLS ya filtran a los activos de
 * comercios activos, así que acá no se repite esa condición: duplicarla haría
 * que el día que cambie la regla, la página y la base digan cosas distintas.
 */
export const getBeneficiosClub = async () =>
  listResult(
    await supabase
      .from('club_beneficios')
      .select(
        'id, titulo, descripcion, terminos, tipo, valor, requiere_acceso, ' +
          'limite_por_persona, ventana, vigencia_hasta, dias_semana, hora_desde, hora_hasta, ' +
          'club_comercios!inner(id, nombre, slug, logo_url, rubro)',
      )
      .order('orden', { ascending: true }),
    'getBeneficiosClub',
  );

/**
 * EL CATÁLOGO PÚBLICO — la vidriera (ROADMAP §12.10.13 a §12.10.15).
 *
 * Es la consulta que reemplaza a `getBenefits()` en /beneficios. Dos cosas que
 * NO son detalles:
 *
 *   1) El embed de `partners` es ANIDADO (club_beneficios -> club_comercios ->
 *      partners) porque `club_comercios.logo_url` está en NULL y el logo real
 *      vive en el partner. Escrito plano, la vidriera sale sin logo y no falla.
 *
 *   2) No se piden `codigo` ni `codigo_descuento`, y no existen en esta tabla. El
 *      código se emite por persona al canjear. Si esta lista alguna vez trae un
 *      código, volvió la fuga de §12.10.13.
 *
 * Las RLS ya filtran a los activos de comercios activos (§12.5), así que no se
 * repite esa condición: duplicarla haría que el día que cambie la regla, la
 * página y la base digan cosas distintas.
 */
export const getBeneficiosVidriera = async () =>
  listResult(
    await supabase
      .from('club_beneficios')
      .select(
        'id, titulo, descripcion, terminos, tipo, valor, requiere_acceso, ' +
          'slug, instrucciones, imagen_url, estado, ' +
          'antiguedad_minima_meses, aporte_minimo_acumulado, ahorro_maximo, ' +
          'vigencia_desde, vigencia_hasta, limite_por_persona, ventana, ' +
          'dias_semana, hora_desde, hora_hasta, ' +
          'club_comercios!inner(id, nombre, slug, logo_url, rubro, partner_id, ' +
          'partners(logo_url, sitio_web, contacto_email))',
      )
      .order('orden', { ascending: true }),
    'getBeneficiosVidriera',
  );

/**
 * Los hechos de la persona para saber si cumple los requisitos de un beneficio
 * (§12.11): acceso vigente, meses aportados y aporte acumulado.
 *
 * Se pregunta por RPC sin parámetro —`mi_elegibilidad_club()`— y no leyendo
 * tablas, por el mismo motivo que `mi_acceso()`: la versión con parámetro es
 * solo para `service_role`, así que desde el browser **no se puede preguntar
 * por otra persona**. Cuánto aportó alguien no es dato público.
 */
export const getMiElegibilidadClub = async () =>
  listResult(await supabase.rpc('mi_elegibilidad_club'), 'getMiElegibilidadClub');

/** Sucursales activas de un comercio, para elegir dónde se está canjeando. */
export const getSucursales = async (comercioId) =>
  listResult(
    await supabase
      .from('club_sucursales')
      .select('id, nombre, direccion')
      .eq('comercio_id', comercioId)
      .eq('activa', true)
      .order('nombre'),
    'getSucursales',
  );

/* ============================
   El canje (solo por Edge Function)
   ============================ */

/**
 * Las Edge Functions contestan con `error` en el cuerpo y un status != 2xx.
 * `supabase.functions.invoke` lanza en ese caso, y el cuerpo con el motivo
 * queda dentro del error — que es justo lo que hay que mostrarle a la persona.
 * Esto lo desentierra para que el consumidor no tenga que saberlo.
 */
const cuerpoDelError = async (error) => {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') return await ctx.json();
  } catch {
    /* el cuerpo no era JSON: se cae al mensaje genérico */
  }
  return null;
};

const invocar = async (nombre, body, contexto) => {
  const { data, error } = await attempt(async () => {
    const res = await supabase.functions.invoke(nombre, { body });
    if (res.error) throw res.error;
    return res.data;
  }, contexto);

  if (!error) return { data, error: null };

  // Se devuelve el detalle en `data` aunque haya error: la pantalla necesita el
  // `codigo_error` para decidir qué ofrecer (renovar, generar otro, etc.).
  const detalle = await cuerpoDelError(error);
  return { data: detalle, error };
};

/** El socio pide su código. Devuelve `{ codigo, expira_en, ttl_segundos, ... }`. */
export const generarCanje = async (beneficioId, sucursalId = null) =>
  invocar(
    'club-generar-canje',
    { beneficio_id: beneficioId, sucursal_id: sucursalId },
    'generarCanje',
  );

/** El cajero confirma. `monto` es opcional salvo que la config lo exija. */
export const confirmarCanje = async (codigo, { monto = null, sucursalId = null } = {}) =>
  invocar(
    'club-confirmar-canje',
    { codigo, monto_operacion: monto, sucursal_id: sucursalId },
    'confirmarCanje',
  );

/** Se anuló la venta. El canje no se borra: queda con motivo y responsable. */
export const anularCanje = async (codigo, motivo) =>
  invocar('club-anular-canje', { codigo, motivo }, 'anularCanje');

/* ============================
   Lado comercio
   ============================ */

/**
 * ¿Esta persona opera algún comercio? De esto depende el acceso a `/comercio`.
 *
 * Se pregunta por RPC y no leyendo la tabla porque la pertenencia se resuelve
 * por `auth.uid()` dentro de la base: desde el browser no se puede preguntar
 * por otra persona. Mismo criterio que `mi_acceso()` en §10.
 */
export const getMisComercios = async () =>
  listResult(await supabase.rpc('mis_comercios'), 'getMisComercios');

/** Los canjes del comercio, para el panel y para el reporte. */
export const getCanjesDelComercio = async (comercioId, { limite = 50 } = {}) =>
  listResult(
    await supabase
      .from('club_canjes')
      .select(
        'id, codigo, estado, created_at, confirmado_en, monto_operacion, ahorro, ' +
          'club_beneficios!inner(id, titulo, comercio_id), ' +
          'users!club_canjes_user_id_fkey(name)',
      )
      .eq('club_beneficios.comercio_id', comercioId)
      .order('created_at', { ascending: false })
      .limit(limite),
    'getCanjesDelComercio',
  );

/** Los canjes de la persona de la sesión, para su historial. */
export const getMisCanjes = async ({ limite = 20 } = {}) =>
  listResult(
    await supabase
      .from('club_canjes')
      .select(
        'id, codigo, estado, expira_en, created_at, confirmado_en, ahorro, ' +
          'club_beneficios!inner(id, titulo, tipo, valor, club_comercios!inner(nombre))',
      )
      .order('created_at', { ascending: false })
      .limit(limite),
    'getMisCanjes',
  );
