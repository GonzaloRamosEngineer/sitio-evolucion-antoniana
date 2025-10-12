// api/share/news/[slug].js

// Bots/crawlers habituales para generar el preview
const BOT_UA_REGEX =
  /(facebookexternalhit|facebot|meta-externalagent|whatsapp|twitterbot|slackbot|linkedinbot|telegrambot|discordbot|google-inspectiontool|googlebot|pinterest|skypeuripreview)/i;

const isUuid = (v = '') =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const escapeHtml = (s = '') =>
  String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

module.exports = async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) {
      res.status(400).send('Missing slug');
      return;
    }

    // En funciones serverless usá estas envs (configuralas en Vercel):
    // SUPABASE_URL y SUPABASE_ANON_KEY
    const SUPABASE_URL =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).send('Supabase env vars not set');
      return;
    }

    // Buscar por slug o por id (uuid)
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

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto =
      (req.headers['x-forwarded-proto'] || 'https').split(',')[0] || 'https';

    const visibleUrl = `${proto}://${host}/novedades/${encodeURIComponent(
      item.slug || item.id
    )}`;

    // Aseguramos imagen absoluta
    const image =
      (item.image_url && /^https?:\/\//i.test(item.image_url))
        ? item.image_url
        : `${proto}://${host}${item.image_url || '/favicon-512x512.png'}`;

    const title = escapeHtml(item.title || 'Novedad');
    const desc = escapeHtml((item.content || '').replace(/\s+/g, ' ').slice(0, 160));

    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = BOT_UA_REGEX.test(ua);

    // El contenido varía según UA => importante para el caché/CDN
    res.setHeader('Vary', 'User-Agent');

    if (!isBot) {
      // Usuario real => redirigimos al detalle “lindo”
      res.statusCode = 302;
      res.setHeader('Location', visibleUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html>
<meta http-equiv="refresh" content="0;url=${visibleUrl}">
<a href="${visibleUrl}">Ir a la noticia</a>`);
      return;
    }

    // Bot => servimos HTML con metatags OG/Twitter
    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:url" content="${visibleUrl}"/>
  <meta property="og:image" content="${image}"/>
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

  <!-- Evitamos que Google indexe /api/share -->
  <meta name="robots" content="noindex, nofollow"/>

  <link rel="canonical" href="${visibleUrl}"/>
  <meta http-equiv="x-ua-compatible" content="IE=edge"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>
<body>
  <p>Previsualización para compartir. Abrí la noticia aquí: <a href="${visibleUrl}">${visibleUrl}</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Cache razonable para bots
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (_e) {
    res.status(500).send('Internal error');
  }
};
