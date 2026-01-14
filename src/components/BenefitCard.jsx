import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Tag, Gift } from 'lucide-react';

const slugify = (s = '') =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const BenefitCard = ({ benefit, index = 0 }) => {
  const slug = benefit.slug || slugify(benefit.titulo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100 group flex flex-col h-full"
    >
      {/* --- IMAGEN --- */}
      <Link to={`/beneficios/${slug}`} className="relative h-52 overflow-hidden block">
        {benefit.imagen_url ? (
          <img
            src={benefit.imagen_url}
            alt={benefit.titulo}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-brand-dark flex flex-col items-center justify-center relative overflow-hidden">
            {/* Patrón de fondo sutil */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <Gift className="h-12 w-12 text-brand-gold mb-2 relative z-10" />
            <span className="text-brand-gold/50 text-xs font-bold uppercase tracking-widest relative z-10">Beneficio</span>
          </div>
        )}
        
        {/* Overlay sutil */}
        <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/10 transition-colors duration-300"></div>

        {/* Badge de Categoría Flotante */}
        <div className="absolute top-4 left-4">
          <span className="inline-block bg-white/95 backdrop-blur-sm text-brand-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-gray-100">
            {benefit.categoria}
          </span>
        </div>
      </Link>

      {/* --- CONTENIDO --- */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold font-poppins text-brand-dark mb-3 leading-tight group-hover:text-brand-action transition-colors">
          <Link to={`/beneficios/${slug}`}>
            {benefit.titulo}
          </Link>
        </h3>
        
        <p className="text-gray-600 mb-6 line-clamp-3 text-sm leading-relaxed flex-1">
          {benefit.descripcion}
        </p>
        
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
           {benefit.descuento && (
               <span className="text-brand-action font-bold text-sm bg-red-50 px-2 py-1 rounded-md">
                   {benefit.descuento}
               </span>
           )}
           
           <Link
            to={`/beneficios/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-action transition-colors ml-auto group/link"
          >
            Ver detalle 
            <ArrowRight className="h-4 w-4 transform group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default BenefitCard;