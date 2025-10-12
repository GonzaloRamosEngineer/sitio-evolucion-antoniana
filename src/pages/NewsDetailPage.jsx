import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Facebook, Twitter, Linkedin, Instagram, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNewsBySlug, getNewsById } from '@/lib/storage';

const NewsDetailPage = () => {
  const { id: maybeSlug } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    (async () => {
      // si es UUID viejo, busca por id; si es slug, por slug
      const isUuid = /^[0-9a-f-]{36}$/i.test(maybeSlug);
      const data = isUuid ? await getNewsById(maybeSlug) : await getNewsBySlug(maybeSlug);
      setItem(data);
    })();
  }, [maybeSlug]);

  const canonicalUrl = useMemo(() => {
    if (!item) return window.location.href;
    return `${window.location.origin}/novedades/${item.slug || maybeSlug}`;
  }, [item, maybeSlug]);

  // URL especial para previews OG:
  const shareUrl = useMemo(() => {
    const slug = item?.slug || maybeSlug;
    return `${window.location.origin}/api/share/news/${slug}`;
  }, [item, maybeSlug]);

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  const title = item.title;
  const description = (item.content || '').slice(0, 180);

  const encodedShare = encodeURIComponent(`${title} ${shareUrl}`);
  const waHref = `https://wa.me/?text=${encodedShare}`;

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
                <img src={item.image_url} alt={title} className="w-full h-[280px] md:h-[360px] object-cover" />
              )}

              <div className="p-6 md:p-10">
                <p className="text-sm text-gray-500 mb-2">
                  Publicado el {new Date(item.created_at).toLocaleDateString()}
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">{title}</h1>
                <p className="text-gray-700 mb-8 whitespace-pre-wrap">{item.content}</p>

                {/* Compartir */}
                <div className="pt-6 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-3">Compartir</p>
                  <div className="flex flex-wrap gap-3">
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Facebook className="h-4 w-4 mr-2" /> Facebook</Button>
                    </a>
                    <a href={`https://twitter.com/intent/tweet?text=${encodedShare}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Twitter className="h-4 w-4 mr-2" /> X</Button>
                    </a>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Linkedin className="h-4 w-4 mr-2" /> LinkedIn</Button>
                    </a>
                    <a href={waHref} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        {/* pequeño ícono de WhatsApp inline (SVG libre) */}
                        <svg viewBox="0 0 32 32" width="16" height="16" className="mr-2"><path d="M19.11 17.2c-.27-.15-1.59-.86-1.84-.96-.25-.09-.43-.15-.62.15-.18.27-.72.96-.88 1.15-.16.18-.32.2-.59.07-.27-.14-1.12-.41-2.13-1.31-.79-.7-1.32-1.57-1.48-1.83-.15-.27-.02-.42.11-.56.11-.11.25-.29.36-.43.12-.14.16-.25.25-.41.09-.18.04-.33-.02-.46-.06-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.46.07-.7.33-.25.27-.93.91-.93 2.22s.96 2.58 1.09 2.76c.14.18 1.88 2.86 4.56 4 .64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.59-.65 1.81-1.28.22-.64.22-1.18.15-1.29-.07-.11-.25-.18-.52-.33zM16.02 4C9.94 4 5 8.93 5 15c0 1.94.52 3.75 1.43 5.32L5 27l6.86-1.8A10.95 10.95 0 0 0 16.02 26c6.07 0 11-4.94 11-11s-4.93-11-11-11zm0 20c-1.86 0-3.58-.54-5.02-1.46l-.36-.23-4.06 1.07 1.09-3.95-.25-.4A8.88 8.88 0 0 1 7.02 15c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z" fill="currentColor"/></svg>
                        WhatsApp
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${title} ${shareUrl}`);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copiar enlace
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
