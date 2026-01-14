import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, ExternalLink, AlertCircle, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsOfUse = () => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>Términos de Uso - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Términos y Condiciones de uso del sitio web de la Fundación Evolución Antoniana."
        />
        <link rel="canonical" href="https://www.evolucionantoniana.com/terms" />
      </Helmet>

      {/* --- HERO HEADER --- */}
      <div className="bg-brand-dark py-12 px-4 relative overflow-hidden text-white">
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
         <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4">
                <Scale className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">Marco Legal</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-poppins font-bold mb-4">
                Términos de Uso
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto text-lg">
                Conocé tus derechos y obligaciones al utilizar nuestros servicios digitales.
            </p>
         </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 -mt-8 relative z-20">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white shadow-xl rounded-3xl p-8 md:p-12 border border-gray-100"
        >
          <div className="prose prose-lg prose-headings:font-poppins prose-headings:text-brand-dark prose-p:text-gray-600 prose-strong:text-brand-primary max-w-none">
            <p className="lead text-xl text-gray-500 font-medium mb-8 border-l-4 border-brand-action pl-4">
              Al acceder y utilizar el sitio web de la <strong>Fundación Evolución Antoniana</strong>,
              aceptás los siguientes términos y condiciones. Si no estás de acuerdo, te solicitamos que
              no utilices este sitio.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h2 className="text-lg font-bold mt-0 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-brand-primary" />
                        1. Propósito
                    </h2>
                    <p className="text-sm m-0">
                        Este sitio tiene como objetivo brindar información sobre nuestras actividades,
                        proyectos, convocatorias y oportunidades de colaboración.
                    </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h2 className="text-lg font-bold mt-0 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-brand-primary" />
                        2. Uso permitido
                    </h2>
                    <p className="text-sm m-0">
                        Te comprometés a utilizar el sitio de manera responsable y conforme a la ley, absteniéndote
                        de afectar su funcionamiento o seguridad.
                    </p>
                </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-3">3. Propiedad intelectual</h2>
            <p>
              Todos los contenidos, logotipos e imágenes son propiedad de la Fundación o se utilizan con
              autorización. No está permitido reproducir o redistribuir material sin consentimiento
              previo por escrito.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">4. Enlaces externos</h2>
            <p>
              Nuestro sitio puede contener enlaces a sitios de terceros. No somos responsables del
              contenido, seguridad o políticas de dichos sitios externos.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-3">5. Limitación de responsabilidad</h2>
            <p>
              La Fundación no se hace responsable por daños o perjuicios derivados del uso del sitio,
              interrupciones del servicio o errores en la información publicada.
            </p>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
             <p className="text-sm text-gray-400 font-medium">
                Vigente desde: Octubre 2025
             </p>
             <Link to="/">
                <Button variant="ghost" className="text-brand-primary hover:text-brand-dark hover:bg-brand-sand">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Inicio
                </Button>
             </Link>
          </div>
        </motion.article>
      </main>
    </div>
  );
};

export default TermsOfUse;