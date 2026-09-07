// api/share/partners/slug.js
// -----------------------------------------------------------------------------
// OG dinámico de un partner. Reemplaza a `api/share/partners/[slug].js`.
//
// ⚠️ POR QUÉ SE REESCRIBIÓ. La versión anterior era una **edge function con
// nombre de ruta dinámica** (`[slug].js`), la única de `api/share/` con esa
// forma. En producción NO resolvía: el pedido a /api/share/partners/<slug>
// caía al rewrite general `/api/(.*)` —el proxy al webhook de onrender— y el
// scraper recibía el `Cannot GET /api/share/partners/<slug>` de Express. O sea
// que compartir un partner por WhatsApp no mostraba una tarjeta genérica:
// no mostraba NINGUNA. Se detectó el 2026-09-07 pidiendo en producción un slug
// real sacado de la base.
//
// Ahora sigue exactamente el patrón de news/benefits/activities: función Node,
// el slug entra por `?slug=` vía rewrite, y no depende de que Vercel registre
// una ruta dinámica dentro de `api/`. Es el patrón que está probado en
// producción tres veces; ser el único distinto era el problema.
// -----------------------------------------------------------------------------

const isUuid = (v = "") =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );

const escapeHtml = (s = "") =>
  String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const stripToOneLine = (s = "") =>
  String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function guessMimeFromUrl(u = "") {
  const lower = String(u.split("?")[0] || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

export default async function handler(req, res) {
  try {
    const method = String(req.method || "GET").toUpperCase();

    const slug = String(req.query?.slug || "").trim();
    if (!slug) {
      res.status(400).send("Missing slug parameter (?slug=...)");
      return;
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).send("Supabase env vars not set");
      return;
    }

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto =
      String(req.headers["x-forwarded-proto"] || "https")
        .split(",")[0]
        .trim() || "https";

    const filter = isUuid(slug)
      ? `id=eq.${encodeURIComponent(slug)}`
      : `slug=eq.${encodeURIComponent(slug)}`;

    // `select=*` por el criterio del resto de `api/share/`: que una columna
    // nueva o renombrada no tumbe la preview.
    const apiUrl = `${SUPABASE_URL}/rest/v1/partners?select=*&${filter}&limit=1`;

    const r = await fetch(apiUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      res.status(r.status).send("Upstream error");
      return;
    }

    const rows = await r.json();
    const item = rows && rows[0];
    if (!item) {
      res.status(404).send("Not found");
      return;
    }

    const slugOrId = item.slug || item.id;

    // URL humana real (SPA): es la que se comparte y la canónica. El bot llega
    // acá por el rewrite condicional de vercel.json, así que el OG apunta a la
    // URL limpia y nunca a /api/share/.
    const humanUrl = `${proto}://${host}/partners/${encodeURIComponent(slugOrId)}`;

    // El logo del partner es la mejor imagen disponible; si no tiene, la tarjeta
    // de la SECCIÓN partners, que al menos nombra de qué se trata.
    let image = item.logo_url || "/img/og/partners-1200x630.png";
    if (!/^https?:\/\//i.test(image)) {
      image = `${proto}://${host}${image.startsWith("/") ? "" : "/"}${image}`;
    }
    const imageMime = guessMimeFromUrl(image);

    // Mismo texto que el `<Helmet>` de `PartnerDetailPage`.
    const title = escapeHtml(
      item.nombre
        ? `${item.nombre} – Fundación Evolución Antoniana`
        : "Marca aliada – Fundación Evolución Antoniana"
    );
    const desc = escapeHtml(
      stripToOneLine(item.descripcion || "Conocé nuestras marcas aliadas y sus beneficios.").slice(
        0,
        180
      )
    );

    const extraImageType = imageMime
      ? `<meta property="og:image:type" content="${imageMime}"/>`
      : "";

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${humanUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  ${extraImageType}
  <meta property="og:site_name" content="Fundación Evolución Antoniana" />
  <meta property="og:locale" content="es_AR" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <link rel="canonical" href="${humanUrl}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(humanUrl)});</script>
  <noscript><p>Redirigiendo a <a href="${humanUrl}">${humanUrl}</a>…</p></noscript>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Accept-Ranges", "none");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, no-transform"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
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
    console.error("Error en api/share/partners/slug.js:", err);
    res.status(500).send("Internal error");
  }
}
