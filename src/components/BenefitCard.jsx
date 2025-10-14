import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Tag } from 'lucide-react';

const slugify = (s = '') =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const BenefitCard = ({ benefit, index = 0 }) => {
  const slug = benefit.slug || slugify(benefit.titulo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100 group flex flex-col"
    >
      <div className="h-48 bg-gray-100">
        {benefit.imagen_url ? (
          <img
            src={benefit.imagen_url}
            alt={benefit.titulo}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-sky-200 flex items-center justify-center">
            <Tag className="h-16 w-16 text-blue-300" />
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mb-3 capitalize">
          {benefit.categoria}
        </span>
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {benefit.titulo}
        </h3>
        <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
          {benefit.descripcion}
        </p>
        <Link
          to={`/beneficios/${slug}`}
          className="mt-auto inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
        >
          Ver detalle <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
};

export default BenefitCard;
