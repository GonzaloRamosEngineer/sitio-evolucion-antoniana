// =============================================================================
// LA ENTIDAD — archivo único de configuración del cliente.
//
// Este es el archivo que se reemplaza para levantar una entidad nueva. Todo lo
// que varía entre una fundación, un club, una mutual o una cámara vive acá; el
// resto del código no debe nombrar a ninguna entidad en particular.
//
// LA REGLA, y es la que sostiene todo el objetivo multi-cliente:
//   Lo que varía por entidad va en DATOS. Lo que es igual para todas va en CÓDIGO.
//
// Antes de agregar algo acá, preguntate: "¿esto sería distinto en otro cliente?"
//   Sí  -> va acá.
//   No  -> va en el componente, y está bien que esté ahí.
//
// Antes de escribir el nombre de la Fundación en un componente, preguntate lo
// mismo. Al 2026-08-16 había 42 archivos que la nombraban y 14 con el dominio
// literal escrito a mano: eso es lo que convierte cada cliente nuevo en un fork
// que diverge, y es lo que hace que el margen se evapore al tercer cliente.
//
// ⚠️ PENDIENTE DECLARADO: las funciones serverless de `api/share/*` (previews
// de OG para WhatsApp) todavía tienen la marca hardcodeada. No se migraron el
// 2026-08-16 a propósito: según CLAUDE.md los preview deployments de Vercel dan
// 401, así que el OG solo se puede validar en producción y no era prudente
// tocarlo sin poder verificarlo. Es el próximo paso de esta refactorización.
// =============================================================================

export const entidad = {
  // --- Identidad -------------------------------------------------------------
  nombre: 'Fundación Evolución Antoniana',
  // Partido en dos porque el header y el footer lo componen en dos renglones
  // con distinto color. Si una entidad no se parte, `apellido` va en ''.
  nombreCorto: 'Evolución Antoniana',
  marcaLinea1: 'Evolución',
  marcaLinea2: 'Antoniana',

  // Tipo jurídico. Define el vocabulario institucional del sistema y, más
  // adelante, qué obligaciones de gobernanza aplican (libro de actas, registro
  // de asociados, memoria y balance).
  // Valores: 'fundacion' | 'asociacion_civil' | 'club' | 'mutual' | 'camara'
  tipo: 'fundacion',
  // Cómo se escribe ese tipo cuando se muestra (el Header lo usa como bajada
  // del logo). Se guarda aparte del `tipo` porque el `tipo` es una clave que el
  // código compara, y esto es texto para humanos: 'Asociación Civil', 'Club
  // Social y Deportivo', 'Mutual'.
  tipoDisplay: 'Fundación',

  descripcionCorta:
    'Organización sin fines de lucro legalmente constituida en Salta, Argentina. ' +
    'Impulsamos oportunidades y transformamos vidas a través de la tecnología y el deporte.',

  // --- Presencia -------------------------------------------------------------
  sitio: 'https://www.evolucionantoniana.com',
  logo: '/img/transparente.png',

  // --- Ubicación -------------------------------------------------------------
  ubicacion: {
    ciudad: 'Salta',
    provincia: 'Salta',
    pais: 'Argentina',
    // Lo que se muestra; separado de los campos por si una entidad quiere
    // poner la dirección completa en vez de solo la ciudad.
    display: 'Salta, Argentina',
  },

  // --- Contacto --------------------------------------------------------------
  contacto: {
    email: 'info@evolucionantoniana.com',
    // `telefono` es para mostrar, `telefonoE164` para los links tel:/wa.me.
    // Tenerlos separados evita el bug clásico de un tel: con espacios y guiones.
    telefono: '+54 387 213-1916',
    telefonoE164: '+543872131916',
    whatsappMensaje: 'Hola, quiero sumarme a la red solidaria',
  },

  // --- Vocabulario -----------------------------------------------------------
  // Cómo llama ESTA entidad a las cosas. Un refugio de animales no dice "socio",
  // dice "padrino"; una cámara dice "asociado"; un club dice "socio". Que el
  // producto se sienta propio depende de que hable el idioma del rubro, y eso
  // no justifica un fork: es un dato. Ver ROADMAP §10.9.
  //
  // ⚠️ Todavía no lo consume nadie: se declara acá junto con el modelo de §10.9
  // para que las pantallas de aportes nazcan usándolo en vez de escribir
  // "socio" a mano y tener que barrerlo después. Si al implementar §10.9 alguna
  // clave sobra o falta, esto se ajusta — no es un contrato cerrado.
  vocabulario: {
    aportante: 'padrino',        // 'socio' | 'asociado' | 'padrino' | 'miembro'
    aportantePlural: 'padrinos',
    padrinable: 'beca',          // 'beca' | 'animal' | 'categoría' | 'ración'
    padrinablePlural: 'becas',
    apadrinar: 'Sostené una beca',
    cuotaSocial: 'Cuota social',
  },

  // --- Cobros ----------------------------------------------------------------
  // Identidad de cobro de la entidad. Es de lo MÁS específico por cliente que
  // hay: apuntar esto a la cuenta equivocada manda plata de una entidad a otra.
  pagos: {
    // Link de donación puntual de MercadoPago (alias público de la cuenta).
    // null si la entidad todavía no tiene uno: los componentes lo filtran.
    mercadoPagoDonacion: 'https://link.mercadopago.com.ar/evolucionantoniana',
  },

  // --- Redes -----------------------------------------------------------------
  // Se omite la clave (o se deja en null) si la entidad no tiene esa red: los
  // componentes filtran por presencia, así que no hay que tocar el JSX.
  redes: {
    facebook: 'https://www.facebook.com/FundacionEvolucionAntoniana/',
    instagram: 'https://www.instagram.com/evolucionantoniana',
    linkedin: 'https://www.linkedin.com/company/fundacionevolucionantoniana',
    x: 'https://x.com/evoluantoniana',
  },
};

// --- Derivados ---------------------------------------------------------------
// Se calculan una sola vez acá para que ningún componente arme estas URLs a
// mano. Cada vez que una se arma en el JSX, aparece una entidad hardcodeada.

export const mailtoContacto = `mailto:${entidad.contacto.email}`;

export const telContacto = `tel:${entidad.contacto.telefonoE164}`;

export const whatsappUrl = `https://wa.me/${entidad.contacto.telefonoE164.replace(
  /\D/g,
  ''
)}?text=${encodeURIComponent(entidad.contacto.whatsappMensaje)}`;

/**
 * Redes declaradas, en orden estable y sin las vacías.
 * El componente decide el ícono; acá solo vive el dato.
 * @returns {Array<{ red: string, href: string }>}
 */
export const redesActivas = () =>
  Object.entries(entidad.redes)
    .filter(([, href]) => Boolean(href))
    .map(([red, href]) => ({ red, href }));

/**
 * Título para <Helmet>. Evita el "Página | Entidad" repetido en 28 archivos.
 * @param {string} [pagina] - Título de la página. Si se omite, devuelve el nombre solo.
 */
export const tituloPagina = (pagina) =>
  pagina ? `${pagina} | ${entidad.nombreCorto}` : entidad.nombre;

export default entidad;
