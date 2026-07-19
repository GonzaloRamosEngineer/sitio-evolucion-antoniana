export const config = { runtime: 'edge' };

function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req) {
  const { pathname, origin } = new URL(req.url);
  const slug = pathname.split('/').pop();

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const url = `${SUPABASE_URL}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}&select=nombre,descripcion,logo_url,slug&limit=1`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: 'no-store'
  });

  let title = 'Marca aliada – Fundación Evolución Antoniana';
  let description = 'Conocé nuestras marcas aliadas y sus beneficios.';
  let image = `${origin}/og-default.png`;
  let canonical = `${origin}/partners/${slug}`;

  if (r.ok) {
    const [row] = await r.json();
    if (row) {
      title = row.nombre ? `${row.nombre} – Marca aliada` : title;
      description = (row.descripcion || description).slice(0, 180);
      if (row.logo_url) image = row.logo_url;
      if (row.slug) canonical = `${origin}/partners/${row.slug}`;
    }
  }

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="canonical" href="${canonical}" />

<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:secure_url" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Fundación Evolución Antoniana" />
<meta property="og:locale" content="es_AR" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${image}" />

<meta name="robots" content="noindex, nofollow" />
<meta http-equiv="refresh" content="0; url=${canonical}" />
</head>
<body>
<script>window.location.replace(${JSON.stringify(canonical)});</script>
<noscript>Si no sos redirigido automáticamente, <a href="${canonical}">hacé clic acá</a>.</noscript>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'x-robots-tag': 'noindex, nofollow',
      'vary': 'User-Agent',
    },
  });
}
