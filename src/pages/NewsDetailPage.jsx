import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Facebook, Twitter, Linkedin, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNewsBySlug, getNewsById } from '@/lib/storage';

const isUuid = (v = '') =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const NewsDetailPage = () => {
  const params = useParams();
  const routeParam = params.slug ?? params.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!routeParam) { setLoading(false); return; }
      setLoading(true);
      try {
        const data = isUuid(routeParam)
          ? await getNewsById(routeParam)
          : await getNewsBySlug(routeParam);
        if (active) setItem(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [routeParam]);

  const slugOrId = useMemo(() => item?.slug || routeParam, [item, routeParam]);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const canonicalUrl = `${origin}/novedades/${slugOrId}`;
  const shareUrl = `${origin}/api/share/news/${slugOrId}`;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>;
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-3xl font-bold mb-4">Noticia no encontrada</h1>
        <p className="text-gray-600 mb-6">La noticia que buscas no existe o ha sido eliminada.</p>
        <Link to="/novedades"><Button>Volver a Novedades</Button></Link>
      </div>
    );
  }

  const title = item.title;
  const description = (item.content || '').slice(0, 180);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const copyToClipboard = async () => {
    const text = `${title} ${shareUrl}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      setCopied(true);
      if (navigator.vibrate) navigator.vibrate(40);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.warn('No se pudo copiar el enlace');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Helmet>
        <title>{title} - Fundación Evolución Antoniana</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Link to="/novedades" className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" /> Volver a todas las novedades
          </Link>

          <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={title}
                  className="w-full h-[280px] md:h-[360px] object-cover"
                />
              )}

              <div className="p-6 md:p-10">
                <p className="text-sm text-gray-500 mb-2">
                  Publicado el {new Date(item.created_at).toLocaleDateString()}
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">{title}</h1>

                {/* Bajada / subtítulo corto (content) */}
                <p className="text-gray-700 mb-8 whitespace-pre-wrap">{item.content}</p>

                {/* Cuerpo largo (body_md) */}
                {item.body_md && (
                  <div
                    className="prose max-w-none mb-8 text-gray-800 dark:prose-invert prose-headings:text-gray-900 prose-strong:text-gray-900 prose-a:text-blue-600 hover:prose-a:text-blue-700"
                    // Importante: este contenido lo cargan solo admins del panel.
                    // Si alguna vez habilitás carga pública, sanitizá antes de inyectar.
                    dangerouslySetInnerHTML={{ __html: item.body_md }}
                  />
                )}

                {/* Compartir */}
                <div className="pt-6 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-3">Compartir</p>
                  <div className="flex flex-wrap gap-3">
                    <a href={facebookHref} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Facebook className="h-4 w-4 mr-2" /> Facebook
                      </Button>
                    </a>
                    <a href={twitterHref} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Twitter className="h-4 w-4 mr-2" /> X
                      </Button>
                    </a>
                    <a href={linkedinHref} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                      </Button>
                    </a>

                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <svg viewBox="0 0 32 32" width="16" height="16" className="mr-2" aria-hidden="true">
                          <path
                            d="M19.11 17.2c-.27-.15-1.59-.86-1.84-.96-.25-.09-.43-.15-.62.15-.18.27-.72.96-.88 1.15-.16.18-.32.2-.59.07-.27-.14-1.12-.41-2.13-1.31-.79-.7-1.32-1.57-1.48-1.83-.15-.27-.02-.42.11-.56.11-.11.25-.29.36-.43.12-.14.16-.25.25-.41.09-.18.04-.33-.02-.46-.06-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.46.07-.7.33-.25.27-.93.91-.93 2.22s.96 2.58 1.09 2.76c.14.18 1.88 2.86 4.56 4 .64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.59-.65 1.81-1.28.22-.64.22-1.18.15-1.29-.07-.11-.25-.18-.52-.33zM16.02 4C9.94 4 5 8.93 5 15c0 1.94.52 3.75 1.43 5.32L5 27l6.86-1.8A10.95 10.95 0 0 0 16.02 26c6.07 0 11-4.94 11-11s-4.93-11-11-11zm0 20c-1.86 0-3.58-.54-5.02-1.46l-.36-.23-4.06 1.07 1.09-3.95-.25-.4A8.88 8.88 0 0 1 7.02 15c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z"
                            fill="currentColor"
                          />
                        </svg>
                        WhatsApp
                      </Button>
                    </a>

                    {/* Copiar enlace */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className={`relative overflow-hidden transition-colors ${copied ? 'border-green-600 text-green-700' : ''}`}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {copied ? (
                          <motion.span
                            key="check"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.25 }}
                            className="inline-flex items-center"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Copiado
                          </motion.span>
                        ) : (
                          <motion.span
                            key="copy"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.25 }}
                            className="inline-flex items-center"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar enlace
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default NewsDetailPage;
