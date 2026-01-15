// api/share/news/[slug].js
// Endpoint "share" profesional para previews (WhatsApp / Facebook / LinkedIn / etc.)
// - Devuelve HTML con OG dinámico para bots
// - Redirige a humanos a la URL real de tu SPA (/novedades/:slug)
// - Pensado para Vercel (Serverless Function)

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

// Detección amplia de bots de “link preview”
const isShareBot = (ua = "") =>
  /(facebookexternalhit|facebot|facebookcatalog|instagram|igbot|whatsapp|wa\/|whatsApp\/|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|vkshare|quora link preview|google.*snippet)/i.test(
    ua
  );

// Deducir MIME desde la extensión; si no se reconoce, devolvemos null
function guessMimeFromUrl(u = "") {
  try {
    const lower = String(u.split("?")[0] || "").toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
  } catch {}
  return null;
}

export default async function handler(req, res) {
  try {
    const method = String(req.method || "GET").toUpperCase();

    // En Vercel, con archivo [slug].js, el parámetro llega como req.query.slug
    const slug = String(req.query?.slug || "").trim();
    if (!slug) {
      res.status(400).send("Missing slug parameter");
      return;
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).send("Supabase env vars not set");
      return;
    }

    // Host/Proto correctos detrás de Vercel
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = String(req.headers["x-forwarded-proto"] || "https")
      .split(",")[0]
      .trim() || "https";

    const ua = String(req.headers["user-agent"] || "");
    const bot = isShareBot(ua);

    // Buscar por UUID o por slug
    const filter = isUuid(slug)
      ? `id=eq.${encodeURIComponent(slug)}`
      : `slug=eq.${encodeURIComponent(slug)}`;

    // Columnas existentes en PROD
    const apiUrl = `${SUPABASE_URL}/rest/v1/news?select=id,title,content,image_url,created_at,slug&${filter}`;

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

    // URL humana (SPA)
    const humanUrl = `${proto}://${host}/novedades/${encodeURIComponent(slugOrId)}`;

    // URL share (esta misma)
    const shareOgUrl = `${proto}://${host}/api/share/news/${encodeURIComponent(slugOrId)}`;

    // Imagen absoluta con fallback (asegurate de tener /public/og-default.png o cambiá la ruta)
    let image = item.image_url || "/og-default.png";
    if (!/^https?:\/\//i.test(image)) {
      image = `${proto}://${host}${image.startsWith("/") ? "" : "/"}${image}`;
    }
    const imageMime = guessMimeFromUrl(image);

    const title = escapeHtml(item.title || "Novedad");
    const desc = escapeHtml(stripToOneLine(item.content).slice(0, 180));
    const publishedIso = item.created_at
      ? new Date(item.created_at).toISOString()
      : new Date().toISOString();

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
  <meta property="og:url" content="${shareOgUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  ${extraImageType}
  <meta property="og:site_name" content="Fundación Evolución Antoniana" />
  <meta property="og:locale" content="es_AR" />
  <meta property="article:published_time" content="${publishedIso}" />

  <!-- Facebook App ID (opcional: si no lo usás, podés borrar esta línea) -->
  <meta property="fb:app_id" content="966242223397117" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <!-- SEO -->
  <link rel="canonical" href="${shareOgUrl}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  ${
    bot
      ? `<p>Previsualización lista. <a href="${humanUrl}">Abrir noticia</a>.</p>`
      : `<script>window.location.replace(${JSON.stringify(humanUrl)});</script>
         <noscript><p>Redirigiendo a <a href="${humanUrl}">${humanUrl}</a>…</p></noscript>`
  }
</body>
</html>`;

    // Headers PRO anti-cache raro + anti-transform + separar bot vs humano
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
    res.setHeader("X-Robots-Tag", "noindex, nofollow");

    // HEAD support (algunos scrapers hacen HEAD primero)
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
    console.error("Error en api/share/news/[slug].js:", err);
    res.status(500).send("Internal error");
  }
}
