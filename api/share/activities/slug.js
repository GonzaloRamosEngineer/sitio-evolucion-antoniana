// api/share/activities/slug.js
// Share endpoint para previews (WhatsApp/Facebook/LinkedIn/etc.):
// - Lo invocan SOLO los bots de redes sociales vía rewrite condicional por
//   User-Agent en vercel.json: /activities/<slug> -> /api/share/activities/slug?slug=<slug>
// - También responde al path explícito /api/share/activities/<slug> (backward compat).
// - Devuelve HTML con Open Graph dinámico y redirige a humanos a /activities/:slug
// Mismo patrón que api/share/news/slug.js (mantener en sincronía).

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

// Quita el prefijo de ciclo "[Ciclo A · Nombre] — " del título (igual que
// parseCycleFromTitle en el front); si no está, devuelve el título tal cual.
const cleanTitle = (title = "") => {
  const m = String(title).match(/^\s*\[[^\]]*\]\s*[-—–]\s*(.+)$/);
  return (m ? m[1] : String(title)).trim();
};

// Quita una primera línea "CICLO X ..." de la descripción (igual que
// cleanCycleFromDescription en el front).
const cleanDescription = (description = "") => {
  const normalized = String(description).replace(/\r\n/g, "\n").trim();
  if (!/^CICLO\s+[A-Z]/i.test(normalized)) return normalized;
  return normalized.split("\n").slice(1).join("\n").trim();
};

function guessMimeFromUrl(u = "") {
  try {
    const lower = String(u.split("?")[0] || "").toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
  } catch { /* url mal formada: sin content-type */ }
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
    const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";

    const filter = isUuid(slug)
      ? `id=eq.${encodeURIComponent(slug)}`
      : `slug=eq.${encodeURIComponent(slug)}`;

    // select=* (en vez de columnas explícitas) para no romper si la columna `slug`
    // aún no existe en la BD: item.slug queda undefined y se cae al UUID.
    const apiUrl = `${SUPABASE_URL}/rest/v1/activities?select=*&${filter}`;

    const r = await fetch(apiUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json"
      }
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

    // URL humana real (SPA) — es también la que se comparte y la canónica.
    const humanUrl = `${proto}://${host}/activities/${encodeURIComponent(slugOrId)}`;

    // Imagen absoluta con fallback (el detalle usa image_detail_url o image_url)
    let image = item.image_detail_url || item.image_url || "/og-default.png";
    if (!/^https?:\/\//i.test(image)) {
      image = `${proto}://${host}${image.startsWith("/") ? "" : "/"}${image}`;
    }
    const imageMime = guessMimeFromUrl(image);

    const title = escapeHtml(cleanTitle(item.title) || "Actividad");
    const desc = escapeHtml(stripToOneLine(cleanDescription(item.description)).slice(0, 180));

    const extraImageType = imageMime
      ? `<meta property="og:image:type" content="${imageMime}"/>`
      : "";

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
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
  <meta name="robots" content="noindex, nofollow" />
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
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
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
    console.error("Error en api/share/activities/slug.js:", err);
    res.status(500).send("Internal error");
  }
}
