// api/share/news/slug.js
// Share endpoint para previews (WhatsApp/Facebook/LinkedIn):
// - Lee ?slug=... (o llega vía vercel.json rewrite /api/share/news/<slug> -> /api/share/news/slug?slug=<slug>)
// - Devuelve HTML con OG dinámico
// - Redirige a humanos a /novedades/:slug

import { resolvePublicSlug } from '../../_slug-resolver.js';
import { entidad, tituloPagina } from '../../../src/config/entidad.js';

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

    const resolution = await resolvePublicSlug({
      supabaseUrl: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
      resourceType: 'news',
      lookup: slug,
    });
    if (!resolution) {
      res.status(404).send("Not found");
      return;
    }

    const apiUrl = `${SUPABASE_URL}/rest/v1/news?select=id,title,content,image_url,created_at,slug&id=eq.${encodeURIComponent(resolution.resource_id)}`;

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
    // Los bots de redes llegan acá vía rewrite condicional por User-Agent en
    // vercel.json (/novedades/<slug> -> esta función), así que el OG debe apuntar
    // a la URL limpia, no al endpoint /api/share/.
    const humanUrl = `${proto}://${host}/novedades/${encodeURIComponent(slugOrId)}`;
    const sharePublicUrl = humanUrl;

    // Imagen absoluta con fallback
    let image = item.image_url || "/og-default.png";
    if (!/^https?:\/\//i.test(image)) {
      image = `${proto}://${host}${image.startsWith("/") ? "" : "/"}${image}`;
    }
    const imageMime = guessMimeFromUrl(image);

    const title = escapeHtml(tituloPagina(item.title || "Novedad"));
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
  <meta property="og:url" content="${sharePublicUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  ${extraImageType}
  <meta property="og:site_name" content="${escapeHtml(entidad.nombre)}" />
  <meta property="og:locale" content="es_AR" />
  <meta property="article:published_time" content="${publishedIso}" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <link rel="canonical" href="${sharePublicUrl}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(humanUrl)});</script>
  <noscript><p>Redirigiendo a <a href="${humanUrl}">${humanUrl}</a>…</p></noscript>
</body>
</html>`;

    // Headers pro
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
    console.error("Error en api/share/news/slug.js:", err);
    res.status(500).send("Internal error");
  }
}
