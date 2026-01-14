// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\PartnersPage.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Handshake } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>Partners Evolutivos - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Conoce a nuestras marcas aliadas y los beneficios que ofrecen"
        />
      </Helmet>

      {/* --- HERO SECTION (Tech-Institucional) --- */}
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
               <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Alianzas Estratégicas</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-poppins font-bold text-white mb-6">
              Partners <span className="text-brand-gold">Evolutivos</span>
            </h1>
            
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              Organizaciones líderes comprometidas con el desarrollo tecnológico y social de nuestra comunidad.
            </p>
            
            <Link to="/postular-partner">
              <Button size="lg" className="bg-brand-gold text-brand-dark hover:bg-white hover:text-brand-primary font-bold shadow-lg shadow-brand-gold/20 transition-all rounded-full h-12 px-8">
                <Plus className="mr-2 h-5 w-5" />
                Sumar mi Organización
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* --- CONTENIDO --- */}
      <main className="flex-1 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {partners.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl shadow-sm border border-brand-primary/5">
              <Handshake className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500 font-medium mb-6">
                Aún no hay marcas aliadas visibles. ¡Sé el primero en unirte a la evolución!
              </p>
              <Link to="/postular-partner">
                <Button variant="outline" className="border-brand-action text-brand-action hover:bg-brand-action hover:text-white font-bold">
                    Postularse ahora
                </Button>
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
                  className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100 group flex flex-col"
                >
                  {/* Contenedor del logo */}
                  <div className="bg-gray-50 flex items-center justify-center h-48 p-8 border-b border-gray-100 relative overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500"></div>
                    
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={`Logo de ${partner.nombre}`}
                        className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="text-6xl font-bold text-brand-primary/20 group-hover:text-brand-primary/40 transition-colors">
                        {partner.nombre?.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex-grow flex flex-col">
                    <h3 className="text-2xl font-bold font-poppins text-brand-dark mb-3 group-hover:text-brand-action transition-colors">
                      {partner.nombre}
                    </h3>
                    
                    <p className="text-gray-600 mb-6 line-clamp-3 flex-grow text-sm leading-relaxed">
                      {partner.descripcion}
                    </p>
                    
                    <Link to={`/partners/${partner.slug || partner.id}`} className="mt-auto group/btn">
                      <Button variant="outline" className="w-full border-gray-200 text-brand-dark group-hover/btn:border-brand-primary group-hover/btn:text-brand-primary transition-all font-semibold justify-between">
                        Conocer vínculo 
                        <ArrowRight className="ml-2 h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartnersPage;