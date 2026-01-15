// api/share/preinscripcion.js
export default async function handler(req, res) {
  try {
    const method = String(req.method || "GET").toUpperCase();

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto =
      String(req.headers["x-forwarded-proto"] || "https")
        .split(",")[0]
        .trim() || "https";

    // a dónde va el humano
    const humanUrl = `${proto}://${host}/preinscripcion`;

    // la URL pública del share (esta misma)
    const shareUrl = `${proto}://${host}/api/share/preinscripcion`;

    // Elegí una imagen OG específica (ideal 1200x630)
    // Podés crear /public/img/og-preinscripcion-1200x630.png
    const image = `${proto}://${host}/img/og-image-1200x630.png`;

    const title = "Preinscripción | Educación Permanente (EPJA) – Fundación Evolución Antoniana";
    const desc =
      "Iniciá o finalizá tus estudios en el Centro Juventud Antoniana. Preinscribite en el programa de Educación Permanente para Jóvenes y Adultos.";

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Fundación Evolución Antoniana" />
  <meta property="og:locale" content="es_AR" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <link rel="canonical" href="${shareUrl}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(humanUrl)});</script>
  <noscript><p>Redirigiendo a <a href="${humanUrl}">${humanUrl}</a>…</p></noscript>
</body>
</html>`;

    // Headers pro anti-cache (para que WhatsApp no te cachee mal)
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
      res.status(200).end();
      return;
    }

    const buf = Buffer.from(html, "utf8");
    res.status(200);
    res.setHeader("Content-Length", String(buf.byteLength));
    res.end(buf);
  } catch (err) {
    console.error("Error en api/share/preinscripcion.js:", err);
    res.status(500).send("Internal error");
  }
}
