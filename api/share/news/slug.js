// /api/share/news/slug.js

const isUuid = (v = '') =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const escapeHtml = (s = '') =>
  String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const stripToOneLine = (s = '') =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ') // Saca etiquetas HTML
    .replace(/\s+/g, ' ') // Comprime espacios
    .trim();

export default async function handler(req, res) {
  try {
    const { slug } = req.query;

    if (!slug) {
      res.status(400).send('Missing slug parameter (?slug=...)');
      return;
    }

    const SUPABASE_URL =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).send('Supabase env vars not set');
      return;
    }

    // URL base del sitio (para imágenes absolutas)
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto =
      (req.headers['x-forwarded-proto'] || 'https').split(',')[0] || 'https';

    const shareUrl = `${proto}://${host}/api/share/news/slug?slug=${encodeURIComponent(slug)}`;

    // Buscar noticia en Supabase
    const filter = isUuid(slug) ? `id=eq.${slug}` : `slug=eq.${encodeURIComponent(slug)}`;
    const apiUrl = `${SUPABASE_URL}/rest/v1/news?select=id,title,content,image_url,created_at,slug&${filter}`;

    const r = await fetch(apiUrl, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!r.ok) {
      res.status(r.status).send('Upstream error');
      return;
    }

    const rows = await r.json();
    const item = rows && rows[0];
    if (!item) {
      res.status(404).send('Not found');
      return;
    }

    // URL de noticia pública
    const humanUrl = `${proto}://${host}/novedades/${encodeURIComponent(item.slug || item.id)}`;

    // Imagen absoluta con fallback
    let image = item.image_url || '/og-default.png';
    if (!/^https?:\/\//i.test(image)) {
      image = `${proto}://${host}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    const title = escapeHtml(item.title || 'Novedad');
    const desc = escapeHtml(stripToOneLine(item.content).slice(0, 180));

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:url" content="${humanUrl}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:image:secure_url" content="${image}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:site_name" content="Fundación Evolución Antoniana"/>
  <meta property="og:locale" content="es_AR"/>
  <meta property="article:published_time" content="${new Date(item.created_at).toISOString()}"/>

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="${image}"/>

  <!-- SEO y canonical -->
  <link rel="canonical" href="${humanUrl}"/>
  <meta name="robots" content="noindex, nofollow"/>

  <!-- Redirección para humanos -->
  <meta http-equiv="refresh" content="0;url=${humanUrl}">
  <script>window.location.replace(${JSON.stringify(humanUrl)});</script>

  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body>
  <p>Redirigiendo a <a href="${humanUrl}">${humanUrl}</a>...</p>
</body>
</html>`;

    // 🔧 Enviar respuesta completa, sin streaming parcial (corrige 206)
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(html);

  } catch (err) {
    console.error('Error en share/news/slug.js:', err);
    res.status(500).send('Internal error');
  }
}
