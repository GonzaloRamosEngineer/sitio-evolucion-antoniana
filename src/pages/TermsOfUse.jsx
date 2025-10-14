import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const TermsOfUse = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background">
      <Helmet>
        <title>Términos de Uso - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Términos y Condiciones de uso del sitio web de la Fundación Evolución Antoniana. Conocé tus derechos y obligaciones al utilizar nuestros servicios."
        />
        <link rel="canonical" href="https://www.evolucionantoniana.com/terms" />
      </Helmet>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-card shadow-xl rounded-2xl p-8"
        >
          <h1 className="text-4xl font-bold text-[hsl(var(--azul-antoniano))] mb-6">
            Términos de Uso
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Al acceder y utilizar el sitio web de la <strong>Fundación Evolución Antoniana</strong>,
            aceptás los siguientes términos y condiciones. Si no estás de acuerdo, te solicitamos que
            no utilices este sitio.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">1. Propósito del sitio</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Este sitio tiene como objetivo brindar información sobre nuestras actividades,
            proyectos, convocatorias y oportunidades de colaboración.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">2. Uso permitido</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Te comprometés a utilizar el sitio de manera responsable y conforme a la ley, absteniéndote
            de realizar acciones que puedan afectar su funcionamiento o vulnerar la seguridad de los
            datos.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">3. Propiedad intelectual</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Todos los contenidos, logotipos e imágenes son propiedad de la Fundación o se utilizan con
            autorización. No está permitido reproducir o redistribuir material sin consentimiento
            previo por escrito.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">4. Enlaces externos</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Nuestro sitio puede contener enlaces a sitios de terceros. No somos responsables del
            contenido, seguridad o políticas de dichos sitios externos.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">5. Limitación de responsabilidad</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            La Fundación no se hace responsable por daños o perjuicios derivados del uso del sitio,
            interrupciones del servicio o errores en la información publicada.
          </p>

          <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
            Última actualización: Octubre 2025
          </p>
        </motion.article>

        <div className="text-center mt-8">
          <Link
            to="/"
            className="text-blue-700 hover:underline font-medium"
          >
            ← Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
};

export default TermsOfUse;
