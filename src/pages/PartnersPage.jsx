// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\PartnersPage.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPartners } from '@/lib/storage';

const PartnersPage = () => {
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    const fetchPartners = async () => {
      const loadedPartners = await getPartners();
      setPartners((loadedPartners || []).filter((p) => p.estado === 'aprobado'));
    };
    fetchPartners();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Marcas Aliadas - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Conoce a nuestras marcas aliadas y los beneficios que ofrecen"
        />
      </Helmet>

      <main className="flex-1">
        <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-sky-700 text-white py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold mb-4">Marcas Aliadas</h1>
              <p className="text-xl text-blue-100 mb-6">
                Organizaciones comprometidas con el desarrollo de nuestra comunidad
              </p>
              <Link to="/postular-partner">
                <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50">
                  <Plus className="mr-2 h-5 w-5" />
                  Postularse como Partner
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            {partners.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-gray-600 mb-6">
                  Aún no hay marcas aliadas. ¡Sé el primero en unirte!
                </p>
                <Link to="/postular-partner">
                  <Button size="lg">Postularse ahora</Button>
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {partners.map((partner, index) => (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100 group flex flex-col"
                  >
                    {/* Contenedor del logo */}
                    <div className="bg-gray-50 flex items-center justify-center h-56 md:h-48 p-2">
                      {partner.logo_url ? (
                        <img
                          src={partner.logo_url}
                          alt={`Logo de ${partner.nombre}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="text-6xl font-bold text-blue-300">
                          {partner.nombre?.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {partner.nombre}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">
                        {partner.descripcion}
                      </p>
                      <Link to={`/partners/${partner.slug}`} className="mt-auto">
                        <Button variant="outline" className="w-full">
                          Ver Beneficios <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
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

export default PartnersPage;
