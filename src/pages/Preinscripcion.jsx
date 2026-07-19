import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import EducationForm from '@/components/Forms/EducationForm';

const Preinscription = () => {
  const reduceMotion = useReducedMotion();
  const [isSuccess, setIsSuccess] = useState(false);

  const rise = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
      };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-brand-sand flex items-center justify-center p-6">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white border border-brand-dark/10 rounded-sm p-10 sm:p-12 text-center max-w-lg"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="font-poppins font-bold text-3xl tracking-tight text-brand-dark mb-4">
            ¡Preinscripción exitosa!
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            Tus datos fueron enviados correctamente. Pronto vas a recibir novedades en tu
            teléfono o correo.
          </p>

          <div className="flex flex-col gap-4">
            <Button
              variant="action"
              className="w-full h-12"
              onClick={() => (window.location.href = '/')}
            >
              Volver al inicio
            </Button>

            <button
              onClick={() => window.open('https://www.evolucionantoniana.com/activities', '_blank')}
              className="text-sm font-semibold text-brand-primary hover:text-brand-action transition-colors"
            >
              Explorar otras actividades →
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-sand">
      <Helmet>
        <title>Preinscripción - Fundación Evolución Antoniana</title>
        <meta name="description" content="Preinscribite a los programas educativos de la Fundación Evolución Antoniana." />
        <link rel="canonical" href="https://www.evolucionantoniana.com/preinscripcion" />
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
        <motion.div
          {...rise}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
        >
          <div className="mb-6">
            <Eyebrow light>Preinscripción</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
            Educación permanente para jóvenes y adultos
          </h1>
          <p className="max-w-[36rem] text-lg leading-relaxed text-white/75">
            Iniciá o finalizá tus estudios primarios o secundarios en el Centro Juventud
            Antoniana, un espacio pensado para tu crecimiento.
          </p>
          <p className="mt-6 max-w-[36rem] text-sm text-white/60">
            Programa articulado con el Ministerio de Educación de la Provincia de Salta.
          </p>
        </motion.div>
      </section>

      {/* ============ FORMULARIO ============ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <motion.div
          {...(reduceMotion ? {} : { ...rise, transition: { ...rise.transition, delay: 0.1 } })}
          className="bg-white border border-brand-dark/10 rounded-sm p-6 sm:p-10"
        >
          <EducationForm onSuccess={() => setIsSuccess(true)} />

          <div className="pt-8 mt-8 border-t border-brand-dark/10 flex items-start gap-3 text-gray-600">
            <ShieldCheck size={16} className="text-brand-gold mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed">
              Tu información será utilizada únicamente con fines administrativos y de
              planificación educativa.
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Preinscription;
