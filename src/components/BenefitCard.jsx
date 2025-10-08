import React from 'react';
import { motion } from 'framer-motion';
import { Tag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const BenefitCard = ({ benefit, index }) => {

  const getCategoryColor = (category) => {
    const colors = {
      educacion: 'from-blue-500 to-blue-600',
      salud: 'from-green-500 to-green-600',
      deportes: 'from-orange-500 to-orange-600',
      gastronomia: 'from-red-500 to-red-600',
      bienestar: 'from-purple-500 to-purple-600',
      tecnologia: 'from-cyan-500 to-cyan-600',
      cultura: 'from-pink-500 to-pink-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100 group flex flex-col"
    >
      <div className={`h-48 bg-gradient-to-br ${getCategoryColor(benefit.categoria)} flex items-center justify-center p-6 relative overflow-hidden`}>
        {benefit.imagen_url ? (
          <img 
            src={benefit.imagen_url} 
            alt={benefit.titulo}
            class="w-full h-full object-cover"
           /* src="https://images.unsplash.com/photo-1627577741153-74b82d87607b" */ />
        ) : (
          <div className="text-white text-center">
            <Tag className="h-16 w-16 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold uppercase tracking-wider">
              {benefit.categoria}
            </p>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-sm font-bold text-gray-900 capitalize">
            {benefit.categoria}
          </span>
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {benefit.titulo}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-2 flex-grow">
          {benefit.descripcion}
        </p>
        
        <Link to={`/beneficios/${benefit.id}`} className="mt-auto">
          <Button 
            className="w-full"
          >
            Ver Detalle <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};

export default BenefitCard;