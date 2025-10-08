import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Tag, ArrowLeft, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBenefits } from '@/lib/storage';
import { toast } from '@/components/ui/use-toast';

const BenefitDetailPage = () => {
  const { id } = useParams();
  const [benefit, setBenefit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenefit = async () => {
      setLoading(true);
      const allBenefits = await getBenefits();
      const foundBenefit = allBenefits.find(b => b.id === id);
      setBenefit(foundBenefit);
      setLoading(false);
    };
    fetchBenefit();
  }, [id]);

  const handleCopyCode = () => {
    toast({
      title: "🚧 Función no implementada",
      description: "Próximamente podrás copiar y usar códigos de descuento. ¡Pídelo en tu siguiente prompt! 🚀",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando beneficio...</p>
      </div>
    );
  }

  if (!benefit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-3xl font-bold mb-4">Beneficio no encontrado</h1>
        <p className="text-gray-600 mb-6">El beneficio que buscas no existe o ha sido eliminado.</p>
        <Link to="/beneficios">
          <Button>Volver a Beneficios</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Helmet>
        <title>{benefit.titulo} - Fundación Evolución Antoniana</title>
        <meta name="description" content={benefit.descripcion} />
      </Helmet>
      
      <Header />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Link to="/beneficios" className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" />
            Volver a todos los beneficios
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="h-64 bg-gray-200">
                {benefit.imagen_url ? (
                  <img 
                    src={benefit.imagen_url} 
                    alt={benefit.titulo}
                    class="w-full h-full object-cover"
                   /* src="https://images.unsplash.com/photo-1627577741153-74b82d87607b" */ />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-sky-200 flex items-center justify-center">
                    <Tag className="h-24 w-24 text-blue-300" />
                  </div>
                )}
              </div>
              <div className="p-8 md:p-12">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mb-4 capitalize">
                  {benefit.categoria}
                </span>

                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">{benefit.titulo}</h1>

                <div className="prose prose-lg max-w-none text-gray-700 mb-8">
                  <p>{benefit.descripcion}</p>
                </div>

                <div className="bg-gray-100 rounded-lg p-6 space-y-4 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">¿Cómo obtener el descuento?</h3>
                      <p className="text-gray-600">Ingresa a la web y aplicá el código: <strong className="text-blue-600">HOLA10</strong></p>
                    </div>
                  </div>
                  {(benefit.fecha_inicio || benefit.fecha_fin) && (
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">Validez</h3>
                        <p className="text-gray-600">
                          {benefit.fecha_inicio && `Desde ${new Date(benefit.fecha_inicio).toLocaleDateString()}`}
                          {benefit.fecha_fin && ` hasta ${new Date(benefit.fecha_fin).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Términos y condiciones</h3>
                      <p className="text-gray-600">Un único uso por persona. Acumulable con otros medios de pago.</p>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="w-full md:w-auto" onClick={handleCopyCode}>
                  Obtener Código
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BenefitDetailPage;