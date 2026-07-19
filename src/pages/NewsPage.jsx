// src/pages/NewsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Newspaper, Loader2, AlertTriangle } from 'lucide-react'; // Agregué Newspaper para el placeholder
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { getNews } from '@/lib/storage';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getNews();
      setNews(data || []);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>Novedades - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Mantenete al día con las últimas noticias y actividades de la Fundación."
        />
        <link rel="canonical" href="https://www.evolucionantoniana.com/novedades" />
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
        >
          <div className="mb-6">
            <Eyebrow light>Actualidad</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
            Novedades
          </h1>
          <p className="max-w-[36rem] text-lg leading-relaxed text-white/75">
            Últimas noticias, avances de proyectos y actividades de la Fundación
            Evolución Antoniana.
          </p>
        </motion.div>
      </section>

      {/* --- CONTENIDO --- */}
      <div className="flex-1 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-red-100">
              <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
              <p className="text-xl text-gray-700 font-bold mb-2">No pudimos cargar esta sección.</p>
              <p className="text-gray-500 mb-6">Revisá tu conexión e intentá nuevamente.</p>
              <Button onClick={fetchData} variant="outline" className="border-brand-action text-brand-action hover:bg-brand-action hover:text-white font-bold">
                Reintentar
              </Button>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-brand-dark/10">
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
                        <div className="w-full h-full bg-brand-dark flex flex-col items-center justify-center p-6">
                           <span className="text-brand-gold font-bold text-lg text-center">
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
      </div>
    </div>
  );
};

export default NewsPage;