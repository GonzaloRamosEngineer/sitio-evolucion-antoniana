import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Users, Briefcase, BarChart2, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Membership = () => {
  // This page is now Collaborate.jsx. This file can be considered deprecated or for future use if "Membership" concept is reintroduced.
  // For now, it will render a simple message.
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center p-8"
      >
        <Heart className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
          Página de Membresía
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Esta sección está actualmente en desarrollo o ha sido reemplazada.
          Para opciones de colaboración, por favor visita nuestra sección <Link to="/collaborate" className="text-blue-600 hover:underline font-semibold">Colaborá</Link>.
        </p>
        <Button asChild size="lg">
          <Link to="/">Volver al Inicio</Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default Membership;