// api/share/news/[slug].js
const BOT_UA_REGEX =
  /(facebookexternalhit|Facebot|Twitterbot|Slackbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Google-InspectionTool|Googlebot)/i;

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

    const SUPABASE_URL =
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY =
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).send('Supabase env vars not set');
      return;
    }

    const filter = isUuid(slug) ? `id=eq.${slug}` : `slug=eq.${slug}`;
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
    const shareUrl = `${proto}://${host}/api/share/news/${encodeURIComponent(
      item.slug || item.id
    )}`;

    const title = escapeHtml(item.title || 'Novedad');
    const desc = escapeHtml((item.content || '').replace(/\s+/g, ' ').slice(0, 160));
    const image =
      item.image_url || `${proto}://${host}/favicon-512x512.png`;

    const ua = req.headers['user-agent'] || '';
    const isBot = BOT_UA_REGEX.test(ua);

    if (!isBot) {
      // Usuario normal: redirigimos de una
      res.statusCode = 302;
      res.setHeader('Location', visibleUrl);
      // Opcional: breve HTML por si algún cliente no sigue el 302
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        `<!doctype html><meta http-equiv="refresh" content="0;url=${visibleUrl}"><a href="${visibleUrl}">Ir a la noticia</a>`
      );
      return;
    }

    // Bot (WhatsApp/Facebook/Twitter/LinkedIn…): devolvemos metatags sin redirigir
    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:url" content="${shareUrl}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:site_name" content="Fundación Evolución Antoniana"/>

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="${image}"/>

  <meta name="robots" content="noindex,nofollow"/>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu; padding:24px}
  </style>
</head>
<body>
  <p>Previsualización para compartir. Abrí la noticia aquí: <a href="${visibleUrl}">${visibleUrl}</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache razonable en edge, los bots suelen recachear igual
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('Internal error');
  }
};
