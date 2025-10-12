import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  Calendar,
  ArrowLeft,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Copy,
  MessageCircle // <-- reemplazo del icono de WhatsApp
} from 'lucide-react';
import { getNewsBySlug, getNewsById } from '@/lib/storage';

const isUUID = (v = '') =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const NewsDetailPage = () => {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let news = await getNewsBySlug(slug);
      if (!news && isUUID(slug)) {
        news = await getNewsById(slug);
      }
      setItem(news);
      setLoading(false);
    };
    load();
  }, [slug]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const title = item?.title ?? '';

  const share = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(title)}`,
    instagram: 'https://www.instagram.com/',
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + pageUrl)}`
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // noop
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p>Cargando novedad…</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-2">Novedad no encontrada</h1>
        <p className="text-gray-600 mb-6">La novedad que buscas no existe o fue eliminada.</p>
        <Link to="/novedades" className="text-blue-600 hover:underline">Volver a todas las novedades</Link>
      </div>
    );
  }

  const published = new Date(item.created_at);

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{item.title} - Fundación Evolución Antoniana</title>
        <meta name="description" content={item.content?.slice(0, 150)} />
      </Helmet>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/novedades" className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" />
          Volver a todas las novedades
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow overflow-hidden"
        >
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-64 md:h-96 object-cover"
              loading="lazy"
              decoding="async"
            />
          )}

          <div className="p-6 md:p-10">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
              <Calendar className="h-4 w-4" />
              <span>Publicado el {published.toLocaleDateString()}</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight mb-4">{item.title}</h1>

            <div className="prose prose-lg max-w-none text-gray-800 whitespace-pre-line mb-8">
              {item.content}
            </div>

            {/* Compartir */}
            <div className="pt-4 border-t">
              <p className="text-gray-700 mb-3 font-medium">Compartir</p>
              <div className="flex flex-wrap gap-2">
                <a href={share.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50">
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
                <a href={share.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50">
                  <Twitter className="h-4 w-4" /> X
                </a>
                <a href={share.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50">
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
                <a href={share.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
                {/* WhatsApp con icono MessageCircle */}
                <a href={share.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <button onClick={handleCopy} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-gray-50">
                  <Copy className="h-4 w-4" /> {copied ? '¡Copiado!' : 'Copiar enlace'}
                </button>
              </div>
            </div>
          </div>
        </motion.article>
      </main>
    </div>
  );
};

export default NewsDetailPage;
s