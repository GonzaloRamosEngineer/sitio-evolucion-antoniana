export const config = { runtime: 'edge' };

function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req) {
  const { pathname, origin } = new URL(req.url);
  const slug = pathname.split('/').pop();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  const url = `${SUPABASE_URL}/rest/v1/partners?slug=eq.${encodeURIComponent(slug)}&select=nombre,descripcion,logo_url,slug&limit=1`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: 'no-store'
  });

  let title = 'Marca Aliada – Fundación Evolución Antoniana';
  let description = 'Conoce nuestras marcas aliadas y sus beneficios.';
  let image = `${origin}/favicon-512.png`;
  let canonical = `${origin}/partners/${slug}`;

  if (r.ok) {
    const [row] = await r.json();
    if (row) {
      title = row.nombre ? `${row.nombre} – Marca Aliada` : title;
      description = (row.descripcion || description).slice(0, 180);
      if (row.logo_url) image = row.logo_url;
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
<meta property="og:site_name" content="Fundación Evolución Antoniana" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${image}" />

<meta http-equiv="refresh" content="0; url=${canonical}" />
</head>
<body>
Si no eres redirigido automáticamente, <a href="${canonical}">haz clic aquí</a>.
</body>
</html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
