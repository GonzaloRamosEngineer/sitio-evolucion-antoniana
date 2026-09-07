// api/share/pagina.js
// -----------------------------------------------------------------------------
// OG dinámico para las páginas ESTÁTICAS del sitio (las que no salen de una
// tabla): /rendicion, /beneficios, /club, /novedades, /about, etc.
//
// POR QUÉ EXISTE. El sitio es una SPA: `index.html` trae UNA sola tanda de
// metas OG —la institucional— y los `<Helmet>` de cada página los reescriben
// EN EL NAVEGADOR. WhatsApp, Facebook y compañía no ejecutan JavaScript: leen
// el HTML crudo y se van. Resultado hasta esta función: compartir /rendicion,
// /beneficios o /club mostraba siempre la misma tarjeta genérica de la
// Fundación. Las páginas de detalle (novedades, beneficios, partners,
// actividades) ya tenían su propio OG servido por `api/share/<recurso>/`; esto
// cierra el hueco de las secciones.
//
// CÓMO ENTRA. Igual que sus hermanas: `vercel.json` tiene un rewrite
// condicional por User-Agent por cada ruta de PAGINAS. El bot de la red social
// que pide /rendicion cae acá; el humano recibe la SPA normal. La URL
// /api/share/ nunca se expone.
//
// UNA FUNCIÓN Y NO QUINCE. Cada archivo en `api/` es una Serverless Function y
// el plan las cuenta; además quince copias del mismo HTML se desincronizan a la
// primera edición. Acá la ruta llega por `?p=` y lo único que cambia por página
// es la fila de PAGINAS.
//
// ⚠️ POR QUÉ LA MARCA ESTÁ HARDCODEADA. `src/config/entidad.js` declara esta
// deuda a propósito: importar `src/` desde una función de Vercel obliga a
// confiar en el bundling, y el OG solo se puede validar en producción real
// (los preview deployments dan 401 — ver CLAUDE.md). Se mantiene el criterio de
// las otras cuatro funciones de `api/share/`: autocontenida, cero imports.
// -----------------------------------------------------------------------------

const SITIO = "Fundación Evolución Antoniana";
const MARCA_CORTA = "Evolución Antoniana";

// Imagen institucional (el logo sobre blanco). Es el fallback de las filas que
// no declaran `imagen`: hoy, las utilitarias y legales.
//
// Las secciones que sí se comparten tienen tarjeta propia en `public/img/og/`,
// con el nombre de la sección impreso — porque quien recibe el link no ve la
// URL, ve la tarjeta, y once tarjetas idénticas no dicen nada. Se generan con
// `node tools/generate-og-images.mjs`.
//
// ⚠️ Nunca poner acá una ruta de imagen que no exista en `public/`: un og:image
// que da 404 le muestra a WhatsApp una tarjeta SIN foto, que es peor que la
// genérica. El test verifica que cada `imagen` declarada exista y mida
// 1200x630.
const IMAGEN_POR_DEFECTO = "/img/og-image-1200x630.png";

/**
 * Las páginas estáticas compartibles del sitio, indexadas por su ruta real.
 *
 * `titulo` y `descripcion` replican a propósito lo que cada página declara en
 * su `<Helmet>`: la tarjeta que ve quien recibe el link tiene que decir lo
 * mismo que el `<title>` que verá al abrirlo.
 *
 * `imagen` es opcional: la tarjeta 1200x630 propia de esa sección, generada por
 * `tools/generate-og-images.mjs` (que toma de acá el título que imprime, para
 * que la imagen y el `og:title` no puedan divergir). Sin `imagen`, cae a
 * IMAGEN_POR_DEFECTO.
 *
 * Lo que NO está acá es tan deliberado como lo que sí (ver `RUTAS_SIN_PREVIEW`
 * en `pagina.test.js`): nada detrás de sesión —/dashboard, /carnet, /comercio,
 * /comision, /admin/*—, nada de auth y nada que sea el final de un flujo
 * personal —/agradecimiento, /confirm-attendance—. Esas rutas caen al OG
 * institucional de `index.html`, que es exactamente lo que corresponde: no se
 * comparten, y si alguien las comparte no debe filtrar de qué se trata.
 *
 * El test cruza esta tabla contra `src/App.jsx` y `vercel.json`: si mañana
 * aparece una ruta pública nueva y nadie la agrega acá, la suite falla.
 */
export const PAGINAS = {
  "/about": {
    imagen: "/img/og/about-1200x630.png",
    titulo: "Quiénes somos",
    descripcion:
      "Conocé la misión, los valores y el equipo de la Fundación Evolución Antoniana.",
  },
  "/activities": {
    imagen: "/img/og/activities-1200x630.png",
    titulo: "Actividades",
    descripcion:
      "Explorá las actividades, talleres y eventos de la Fundación Evolución Antoniana e inscribite.",
  },
  "/collaborate": {
    imagen: "/img/og/collaborate-1200x630.png",
    titulo: "Colaborá",
    descripcion:
      "Sumate como voluntario, aliado o donante y ayudá a transformar realidades con la Fundación Evolución Antoniana.",
  },
  "/rendicion": {
    imagen: "/img/og/rendicion-1200x630.png",
    titulo: "Rendición de cuentas",
    descripcion:
      "En qué se usó cada aporte recibido por la Fundación Evolución Antoniana: lo recaudado, lo gastado y el respaldo de cada gasto.",
  },
  "/contact": {
    titulo: "Contacto",
    descripcion:
      "Comunicate con la Fundación Evolución Antoniana. Escribinos a info@evolucionantoniana.com.",
  },
  "/novedades": {
    imagen: "/img/og/novedades-1200x630.png",
    titulo: "Novedades",
    descripcion:
      "Mantenete al día con las últimas noticias y actividades de la Fundación.",
  },
  "/beneficios": {
    imagen: "/img/og/beneficios-1200x630.png",
    titulo: "Beneficios",
    descripcion:
      "Descubrí los beneficios exclusivos de los comercios adheridos para quienes sostienen la Fundación.",
  },
  "/partners": {
    imagen: "/img/og/partners-1200x630.png",
    titulo: "Partners Evolutivos",
    descripcion:
      "Conocé a nuestras marcas aliadas y los beneficios que ofrecen.",
  },
  "/postular-partner": {
    imagen: "/img/og/postular-partner-1200x630.png",
    titulo: "Postulate como partner",
    descripcion:
      "Sumate a nuestra red de partners y colaborá con el desarrollo social de la comunidad.",
  },
  "/club": {
    imagen: "/img/og/club-1200x630.png",
    titulo: "Club de beneficios",
    descripcion:
      "Beneficios de comercios adheridos para socios con aporte vigente.",
  },
  "/club/postular": {
    imagen: "/img/og/club-postular-1200x630.png",
    titulo: "Sumá tu comercio al club",
    descripcion:
      "Ofrecé un beneficio a quienes sostienen la fundación y llegá a nuevos clientes.",
  },
  "/preinscripcion": {
    imagen: "/img/og/preinscripcion-1200x630.png",
    // La copia larga viene de `api/share/preinscripcion.js`, que era la única
    // forma de compartir esta página con preview antes de esta función.
    titulo: "Preinscripción — Educación Permanente (EPJA)",
    descripcion:
      "Iniciá o finalizá tus estudios en el Centro Juventud Antoniana. Preinscribite en el programa de Educación Permanente para Jóvenes y Adultos.",
  },
  "/legal-documents": {
    titulo: "Documentación oficial",
    descripcion:
      "Accedé a los estatutos, balances y reportes de gestión de la Fundación Evolución Antoniana.",
  },
  "/privacy": {
    titulo: "Política de privacidad",
    descripcion:
      "Política de Privacidad de la Fundación Evolución Antoniana. Conocé cómo protegemos tus datos personales.",
  },
  "/terms": {
    titulo: "Términos de uso",
    descripcion:
      "Términos y Condiciones de uso del sitio web de la Fundación Evolución Antoniana.",
  },
};

const escapeHtml = (s = "") =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function guessMimeFromUrl(u = "") {
  const lower = String(u.split("?")[0] || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

/**
 * Normaliza lo que llega por `?p=` a una clave de PAGINAS.
 * Acepta `rendicion`, `/rendicion` y `/rendicion/`: el rewrite manda la forma
 * sin barra inicial, pero un pedido a mano no tiene por qué saberlo.
 * @param {string} p
 * @returns {string|null} ruta canónica con barra inicial, o null si no es conocida
 */
export function resolverRuta(p = "") {
  const limpio = String(p || "").trim().split("?")[0].split("#")[0];
  if (!limpio) return null;
  const conBarra = `/${limpio.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return Object.prototype.hasOwnProperty.call(PAGINAS, conBarra)
    ? conBarra
    : null;
}

export default async function handler(req, res) {
  try {
    const method = String(req.method || "GET").toUpperCase();

    const ruta = resolverRuta(req.query?.p);
    if (!ruta) {
      // Nadie debería llegar acá: el rewrite solo dispara para las rutas de
      // PAGINAS. Si pasa, es un `?p=` a mano o una fila que se borró sin borrar
      // su rewrite. 404 y no una tarjeta institucional silenciosa, para que se
      // vea en los logs en vez de degradar sin aviso.
      res.status(404).send("Unknown page parameter (?p=...)");
      return;
    }

    const pagina = PAGINAS[ruta];

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto =
      String(req.headers["x-forwarded-proto"] || "https")
        .split(",")[0]
        .trim() || "https";

    // URL humana real (SPA). Es la que se comparte, la canónica y el destino
    // del redirect: el OG nunca apunta a /api/share/.
    const humanUrl = `${proto}://${host}${ruta}`;

    let image = pagina.imagen || IMAGEN_POR_DEFECTO;
    if (!/^https?:\/\//i.test(image)) {
      image = `${proto}://${host}${image.startsWith("/") ? "" : "/"}${image}`;
    }
    const imageMime = guessMimeFromUrl(image);

    const title = escapeHtml(`${pagina.titulo} | ${MARCA_CORTA}`);
    const desc = escapeHtml(String(pagina.descripcion || "").slice(0, 180));

    const extraImageType = imageMime
      ? `<meta property="og:image:type" content="${imageMime}" />`
      : "";

    // A DIFERENCIA de las funciones de detalle, acá NO se emite
    // `noindex, nofollow`. Esas nacieron con Googlebot en su lista de bots, así
    // que le servían un stub no indexable a Google y sacaban del índice a las
    // páginas de novedades y beneficios. En este barrido se quitó Googlebot y
    // bingbot de TODOS los rewrites: los buscadores renderizan la SPA y leen los
    // `<Helmet>`, que es la fuente correcta. Lo que queda en la lista son
    // scrapers de preview, que no indexan; el `canonical` alcanza para que, si
    // alguno guardara este stub, apunte a la URL real.
    const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_AR" />
  <meta property="og:site_name" content="${escapeHtml(SITIO)}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${humanUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${title}" />
  ${extraImageType}

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <link rel="canonical" href="${humanUrl}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(humanUrl)});</script>
  <noscript><p>Redirigiendo a <a href="${humanUrl}">${humanUrl}</a>…</p></noscript>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Accept-Ranges", "none");
    // WhatsApp cachea la preview por URL; que el origen no agregue su propia
    // capa de caché es lo único que está de nuestro lado (ver ROADMAP §8).
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, no-transform"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // La misma URL devuelve HTML distinto según el User-Agent: sin esto, un
    // proxy intermedio puede servirle a un humano el stub del bot.
    res.setHeader("Vary", "User-Agent");

    if (method === "HEAD") {
      res.statusCode = 200;
      res.end();
      return;
    }

    const buf = Buffer.from(html, "utf8");
    res.statusCode = 200;
    res.setHeader("Content-Length", String(buf.byteLength));
    res.end(buf);
  } catch (err) {
    console.error("Error en api/share/pagina.js:", err);
    res.status(500).send("Internal error");
  }
}
