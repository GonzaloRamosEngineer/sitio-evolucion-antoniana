// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\BenefitsPage.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Filter, Gift, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BenefitCard from '@/components/BenefitCard';
import { getBenefits } from '@/lib/storage';

const categories = [
  { value: 'todos', label: 'Todos' },
  { value: 'educacion', label: 'Educación' },
  { value: 'salud', label: 'Salud' },
  { value: 'deportes', label: 'Deportes' },
  { value: 'gastronomia', label: 'Gastronomía' },
  { value: 'bienestar', label: 'Bienestar' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'cultura', label: 'Cultura' },
];

const BenefitsPage = () => {
  const [benefits, setBenefits] = useState([]);
  const [filteredBenefits, setFilteredBenefits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  useEffect(() => {
    const fetchBenefits = async () => {
      const loadedBenefits = await getBenefits();
      const activeBenefits = (loadedBenefits || []).filter((b) => b.estado === 'activo');
      setBenefits(activeBenefits);
      setFilteredBenefits(activeBenefits);
    };
    fetchBenefits();
  }, []);

  useEffect(() => {
    let filtered = benefits;

    if (selectedCategory !== 'todos') {
      filtered = filtered.filter((b) => b.categoria === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.descripcion.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredBenefits(filtered);
  }, [searchTerm, selectedCategory, benefits]);

  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>Beneficios - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Descubre beneficios exclusivos para miembros y colaboradores de la Fundación Evolución Antoniana"
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
               <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Comunidad</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-poppins font-bold text-white mb-6">
              Club de <span className="text-brand-gold">Beneficios</span>
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
               Descuentos exclusivos y ventajas especiales diseñadas para nuestra comunidad.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- BARRA DE BÚSQUEDA Y FILTROS --- */}
      <section className="sticky top-[80px] z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm py-4">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            
            {/* Buscador */}
            <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="¿Qué estás buscando hoy?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-full border-gray-200 bg-gray-50 focus:bg-white focus:border-brand-primary focus:ring-brand-primary text-lg"
                />
            </div>

            {/* Categorías */}
            <div className="flex justify-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {categories.map((cat) => (
                  <Button
                    key={cat.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`rounded-full px-4 transition-all duration-300 border ${
                      selectedCategory === cat.value
                        ? 'bg-brand-primary text-white border-brand-primary shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {cat.label}
                  </Button>
                ))}
            </div>
         </div>
      </section>

      {/* --- RESULTADOS --- */}
      <main className="flex-1 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {filteredBenefits.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200"
            >
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Tag className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-xl font-bold text-brand-dark mb-2">
                No encontramos beneficios
              </p>
              <p className="text-gray-500">
                 Prueba ajustando los filtros o buscando con otras palabras clave.
              </p>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBenefits.map((benefit, index) => (
                <BenefitCard key={benefit.id} benefit={benefit} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BenefitsPage;