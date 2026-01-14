import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>Política de Privacidad - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Política de Privacidad de la Fundación Evolución Antoniana. Conocé cómo protegemos tus datos personales."
        />
        <link rel="canonical" href="https://www.evolucionantoniana.com/privacy" />
      </Helmet>

      {/* --- HERO HEADER --- */}
      <div className="bg-brand-primary py-12 px-4 relative overflow-hidden">
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
         <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 text-white">
                <ShieldCheck className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-bold uppercase tracking-wider">Seguridad y Confianza</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-poppins font-bold text-white mb-4">
                Política de Privacidad
            </h1>
            <p className="text-blue-100 max-w-2xl mx-auto text-lg">
                Tu privacidad es fundamental para nosotros. Aquí te explicamos claramente cómo cuidamos tu información.
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
            <p className="lead text-xl text-gray-500 font-medium mb-8">
              En la <strong>Fundación Evolución Antoniana</strong> respetamos tu privacidad y nos
              comprometemos a proteger la información personal que compartís con nosotros.
            </p>

            <div className="flex items-start gap-4 mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="bg-white p-2 rounded-full shadow-sm text-blue-600 mt-1">
                    <Eye className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mt-0 mb-2">1. Información que recopilamos</h2>
                    <p className="m-0 text-sm">
                        Podemos recopilar información personal como nombre, correo electrónico, número de teléfono
                        u otros datos que proporciones voluntariamente al contactarnos, registrarte a actividades,
                        donar o colaborar con la fundación.
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4 mb-8 p-6 bg-brand-sand rounded-2xl border border-brand-primary/10">
                <div className="bg-white p-2 rounded-full shadow-sm text-brand-primary mt-1">
                    <FileText className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mt-0 mb-2">2. Uso de la información</h2>
                    <p className="m-0 text-sm">
                        Utilizamos tu información únicamente para fines relacionados con nuestras actividades
                        institucionales: gestión de actividades, comunicación con participantes, envío de
                        información relevante y cumplimiento de obligaciones legales.
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4 mb-8 p-6 bg-green-50 rounded-2xl border border-green-100">
                <div className="bg-white p-2 rounded-full shadow-sm text-green-600 mt-1">
                    <Lock className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold mt-0 mb-2">3. Protección de datos</h2>
                    <p className="m-0 text-sm">
                        Implementamos medidas técnicas y organizativas adecuadas para proteger tus datos frente a
                        accesos no autorizados. No compartimos tu información con terceros, salvo requerimiento legal.
                    </p>
                </div>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4">4. Derechos de los usuarios</h2>
            <p>
              Podés solicitar el acceso, rectificación o eliminación de tus datos personales en cualquier
              momento escribiéndonos a{' '}
              <a href="mailto:info@evolucionantoniana.com" className="text-brand-action font-bold no-underline hover:underline">
                info@evolucionantoniana.com
              </a>.
            </p>

            <hr className="my-8 border-gray-200" />

            <h2 className="text-2xl font-bold mb-4">5. Cambios en la política</h2>
            <p>
              Nos reservamos el derecho de modificar esta Política de Privacidad para reflejar cambios en
              nuestras prácticas. La versión actualizada estará siempre disponible en este sitio.
            </p>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
             <p className="text-sm text-gray-400 font-medium">
                Última actualización: Octubre 2025
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

export default PrivacyPolicy;