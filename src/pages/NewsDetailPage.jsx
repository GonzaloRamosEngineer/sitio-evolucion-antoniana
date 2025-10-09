import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowLeft, Share2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNewsById } from '@/lib/storage';
import { toast } from '@/components/ui/use-toast';

const SocialShareButton = ({ platform, url, title }) => {
  const platforms = {
    facebook: {
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: 'https://img.icons8.com/color/48/facebook-new.png',
    },
    twitter: {
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      icon: 'https://img.icons8.com/color/48/twitterx.png',
    },
    linkedin: {
      url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      icon: 'https://img.icons8.com/color/48/linkedin.png',
    },
    instagram: {
      url: 'https://www.instagram.com',
      icon: 'https://img.icons8.com/color/48/instagram-new--v1.png',
    },
  };

  const p = platforms[platform];

  const handleClick = (e) => {
    if (platform === 'instagram') {
      e.preventDefault();
      toast({
        title: 'Compartir en Instagram',
        description:
          'Abrí Instagram y creá una nueva publicación con el enlace de esta noticia.',
      });
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="transform hover:scale-110 transition-transform"
    >
      <img src={p.icon} alt={platform} className="w-10 h-10" />
    </a>
  );
};

const NewsDetailPage = () => {
  const { id } = useParams();
  const [newsItem, setNewsItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      const data = await getNewsById(id);
      setNewsItem(data);
      setLoading(false);
    };
    fetchNews();
  }, [id]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pageUrl);
    toast({
      title: 'Enlace copiado',
      description: 'Puedes compartirlo en cualquier red social.',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando noticia...</p>
      </div>
    );
  }

  if (!newsItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-3xl font-bold mb-4">Noticia no encontrada</h1>
        <Link to="/novedades">
          <Button>Volver a Novedades</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Helmet>
        <title>{newsItem.title} - Fundación Evolución Antoniana</title>
        <meta name="description" content={newsItem.content?.substring(0, 160)} />
      </Helmet>


      <main className="flex-1">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Link
            to="/novedades"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a todas las novedades
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {newsItem.image_url && (
              <div className="h-80 bg-gray-200">
                <img
                  src={newsItem.image_url}
                  alt={newsItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-8 md:p-12">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Calendar className="h-4 w-4" />
                <span>
                  Publicado el {new Date(newsItem.created_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
                {newsItem.title}
              </h1>

              <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap">
                {newsItem.content}
              </div>

              <div className="border-t mt-8 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <Share2 className="h-5 w-5" />
                  Compartir
                </h3>
                <div className="flex items-center gap-4">
                  <SocialShareButton platform="facebook" url={pageUrl} title={newsItem.title} />
                  <SocialShareButton platform="twitter" url={pageUrl} title={newsItem.title} />
                  <SocialShareButton platform="linkedin" url={pageUrl} title={newsItem.title} />
                  <SocialShareButton platform="instagram" url={pageUrl} title={newsItem.title} />
                  <Button variant="outline" onClick={copyToClipboard} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar enlace
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

    </div>
  );
};

export default NewsDetailPage;
