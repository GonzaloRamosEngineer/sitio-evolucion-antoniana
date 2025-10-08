import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
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
      const activeBenefits = (loadedBenefits || []).filter(
        (b) => b.estado === 'activo'
      );
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
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.titulo.toLowerCase().includes(s) ||
          b.descripcion.toLowerCase().includes(s)
      );
    }

    setFilteredBenefits(filtered);
  }, [searchTerm, selectedCategory, benefits]);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Beneficios - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Descubre beneficios exclusivos para miembros y colaboradores de la Fundación Evolución Antoniana"
        />
      </Helmet>

      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500 text-white py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl font-bold mb-4">Beneficios Exclusivos</h1>
              <p className="text-xl text-amber-100 mb-8">
                Descuentos y ventajas especiales para miembros de la fundación
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-8 px-4 bg-white border-b">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar beneficios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                    className="whitespace-nowrap"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            {filteredBenefits.length === 0 ? (
              <div className="text-center py-16">
                <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600">
                  No se encontraron beneficios con los filtros seleccionados
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBenefits.map((benefit, index) => (
                  <BenefitCard key={benefit.id} benefit={benefit} index={index} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BenefitsPage;
