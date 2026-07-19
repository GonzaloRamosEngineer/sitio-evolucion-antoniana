import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Search, Filter, Gift, Tag, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eyebrow } from '@/components/ui/eyebrow';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getBenefits();
      const activeBenefits = (data || []).filter((b) => b.estado === 'activo');
      setBenefits(activeBenefits);
      setFilteredBenefits(activeBenefits);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

      {/* --- HERO (lenguaje editorial, patrón de Contact) --- */}
      <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
        >
          <div className="mb-6">
            <Eyebrow light>Comunidad</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
            Club de beneficios
          </h1>
          <p className="max-w-[36rem] text-lg leading-relaxed text-white/75">
            Descuentos y ventajas pensadas para nuestra comunidad.
          </p>
        </motion.div>
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
      <div className="flex-1 py-12 px-4">
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
          ) : filteredBenefits.length === 0 ? (
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
      </div>
    </div>
  );
};

export default BenefitsPage;