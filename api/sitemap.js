import { entidad } from '../src/config/entidad.js';
import { ROUTE_PATHS } from '../src/config/rutas.js';

const STATIC_PATHS = [
  ROUTE_PATHS.INICIO,
  ROUTE_PATHS.NOSOTROS,
  ROUTE_PATHS.ACTIVIDADES,
  ROUTE_PATHS.COLABORAR,
  ROUTE_PATHS.RENDICION,
  ROUTE_PATHS.CONTACTO,
  ROUTE_PATHS.DOCUMENTACION_LEGAL,
  ROUTE_PATHS.PRIVACIDAD,
  ROUTE_PATHS.TERMINOS,
  ROUTE_PATHS.ALIANZAS,
  ROUTE_PATHS.POSTULAR_ALIANZA,
  ROUTE_PATHS.BENEFICIOS,
  ROUTE_PATHS.NOVEDADES,
  ROUTE_PATHS.PREINSCRIPCION,
  ROUTE_PATHS.POSTULAR_COMERCIO,
];

const escapeXml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const absoluteUrl = (pathname) =>
  `${entidad.sitio.replace(/\/+$/, '')}${pathname === '/' ? '/' : pathname}`;

const fetchRows = async (url, headers) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Supabase respondió ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
};

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(String(req.method || 'GET').toUpperCase())) {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method not allowed');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).send('Supabase env vars not set');
    return;
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    Accept: 'application/json',
  };

  try {
    const [activities, news, partners, benefits] = await Promise.all([
      fetchRows(`${supabaseUrl}/rest/v1/activities?select=id,slug&slug=not.is.null`, headers),
      fetchRows(`${supabaseUrl}/rest/v1/news?select=id,slug&slug=not.is.null`, headers),
      fetchRows(`${supabaseUrl}/rest/v1/partners?select=id,slug&slug=not.is.null`, headers),
      fetchRows(
        `${supabaseUrl}/rest/v1/club_beneficios?select=id,slug&slug=not.is.null&estado=eq.activo`,
        headers,
      ),
    ]);

    const dynamicPaths = [
      ...activities.map(({ slug }) => `/actividades/${encodeURIComponent(slug)}`),
      ...news.map(({ slug }) => `/novedades/${encodeURIComponent(slug)}`),
      ...partners.map(({ slug }) => `/alianzas/${encodeURIComponent(slug)}`),
      ...benefits.map(({ slug }) => `/beneficios/${encodeURIComponent(slug)}`),
    ];

    const urls = [...new Set([...STATIC_PATHS, ...dynamicPaths])]
      .map(absoluteUrl)
      .sort((a, b) => a.localeCompare(b, 'es'));

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
      '</urlset>',
      '',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (String(req.method || 'GET').toUpperCase() === 'HEAD') {
      res.statusCode = 200;
      res.end();
      return;
    }

    res.status(200).send(xml);
  } catch (error) {
    console.error('No se pudo generar sitemap.xml:', error);
    res.status(502).send('No se pudo generar sitemap.xml');
  }
}
