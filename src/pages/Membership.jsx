import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, ArrowRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Membership = () => {
  // Esta página es un placeholder para redireccionar a la nueva sección "Colaborá"
  
  return (
    <div className="min-h-screen bg-brand-sand flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg bg-white p-10 rounded-3xl shadow-xl border border-gray-100"
      >
        <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-brand-primary" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-poppins font-bold text-brand-dark mb-4">
          Sección Actualizada
        </h1>
        
        <p className="text-gray-600 leading-relaxed mb-8">
          Hemos mudado toda la información sobre membresías y donaciones a nuestra nueva sección de <strong>Colaboración</strong>. Allí encontrarás todas las formas de apoyar a la fundación.
        </p>
        
        <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full bg-brand-action hover:bg-red-800 text-white font-bold h-12 rounded-xl shadow-md">
                <Link to="/collaborate">
                    Ir a Colaborá 
                    <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
            
            <Button asChild variant="ghost" className="w-full text-gray-500 hover:text-brand-dark">
                <Link to="/">
                    <Home className="mr-2 h-4 w-4" />
                    Volver al Inicio
                </Link>
            </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default Membership;