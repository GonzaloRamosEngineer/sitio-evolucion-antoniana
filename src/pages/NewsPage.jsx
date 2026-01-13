// src/pages/NewsPage.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Newspaper } from 'lucide-react'; // Agregué Newspaper para el placeholder
import { getNews } from '@/lib/storage';

const NewsPage = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      const loadedNews = await getNews();
      setNews(loadedNews);
    };
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>Novedades - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Mantente al día con las últimas noticias y actividades de la Fundación."
        />
      </Helmet>

      {/* --- HERO SECTION (Coherente con Home.jsx) --- */}
      <section className="relative bg-brand-primary overflow-hidden py-20 px-4">
        {/* Fondo Tech Sutil */}
        <div className="absolute inset-0">
           <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
           <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
           </div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-6">
               <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Actualidad</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-poppins text-white mb-6">
              Novedades <span className="text-brand-gold">.</span>
            </h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
              Últimas noticias, avances de proyectos y actividades de la Fundación Evolución Antoniana.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- CONTENIDO --- */}
      <main className="flex-1 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {news.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-brand-border/50">
              <Newspaper className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500 font-medium">
                Próximamente compartiremos nuestras novedades por aquí.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map((newsItem, index) => {
                const slugOrId = newsItem.slug || newsItem.id;
                return (
                  <motion.div
                    key={newsItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col border border-gray-100"
                  >
                    {/* Imagen Card */}
                    <Link
                      to={`/novedades/${slugOrId}`}
                      className="block h-56 overflow-hidden relative"
                    >
                      {newsItem.image_url ? (
                        <img
                          src={newsItem.image_url}
                          alt={newsItem.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-brand-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
                           <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                           <span className="text-brand-gold font-bold text-lg text-center z-10">
                             Evolución Antoniana
                           </span>
                        </div>
                      )}
                      {/* Overlay sutil al hover */}
                      <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/10 transition-colors duration-300"></div>
                    </Link>

                    {/* Contenido Card */}
                    <div className="p-8 flex-grow flex flex-col">
                      <div className="flex items-center gap-2 text-xs font-bold text-brand-gold uppercase tracking-wider mb-3">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(newsItem.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold font-poppins text-brand-dark mb-3 leading-tight group-hover:text-brand-action transition-colors">
                        <Link to={`/novedades/${slugOrId}`}>
                          {newsItem.title}
                        </Link>
                      </h3>
                      
                      <p className="text-gray-600 mb-6 line-clamp-3 flex-grow text-sm leading-relaxed">
                        {newsItem.content}
                      </p>
                      
                      <Link
                        to={`/novedades/${slugOrId}`}
                        className="mt-auto self-start text-sm font-bold text-brand-action hover:text-brand-primary transition-colors flex items-center gap-2 group/link"
                      >
                        Leer noticia completa 
                        <ArrowRight className="h-4 w-4 transform group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewsPage;