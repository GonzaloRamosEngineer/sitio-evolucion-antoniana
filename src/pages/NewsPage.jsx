import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Novedades - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Mantente al día con las últimas noticias y actividades de la Fundación."
        />
      </Helmet>


      <main className="flex-1 bg-gray-50">
        <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-sky-700 text-white py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold mb-4">Novedades</h1>
              <p className="text-xl text-blue-100">
                Últimas noticias y proyectos de la Fundación Evolución Antoniana
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            {news.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-gray-600">
                  Próximamente compartiremos nuestras novedades por aquí.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {news.map((newsItem, index) => (
                  <motion.div
                    key={newsItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100 group flex flex-col"
                  >
                    <Link
                      to={`/novedades/${newsItem.id}`}
                      className="block h-48 bg-gray-200 overflow-hidden"
                    >
                      {newsItem.image_url ? (
                        <img
                          src={newsItem.image_url}
                          alt={newsItem.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-sky-200 flex items-center justify-center">
                          <span className="text-blue-300 font-bold text-xl text-center p-4">
                            Fundación Evolución Antoniana
                          </span>
                        </div>
                      )}
                    </Link>
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(newsItem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                        <Link to={`/novedades/${newsItem.id}`}>
                          {newsItem.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">
                        {newsItem.content}
                      </p>
                      <Link
                        to={`/novedades/${newsItem.id}`}
                        className="mt-auto self-start font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2"
                      >
                        Leer más <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

    </div>
  );
};

export default NewsPage;
