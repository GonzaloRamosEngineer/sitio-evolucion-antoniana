import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background">
      <Helmet>
        <title>Política de Privacidad - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Política de Privacidad de la Fundación Evolución Antoniana. Conocé cómo protegemos tus datos personales y tu información al interactuar con nuestro sitio web."
        />
        <link rel="canonical" href="https://www.evolucionantoniana.com/privacy" />
      </Helmet>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-card shadow-xl rounded-2xl p-8"
        >
          <h1 className="text-4xl font-bold text-[hsl(var(--azul-antoniano))] mb-6">
            Política de Privacidad
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            En la <strong>Fundación Evolución Antoniana</strong> respetamos tu privacidad y nos
            comprometemos a proteger la información personal que compartís con nosotros. Esta política
            explica cómo recopilamos, utilizamos y protegemos tus datos cuando usás nuestro sitio web.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">1. Información que recopilamos</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Podemos recopilar información personal como nombre, correo electrónico, número de teléfono
            u otros datos que proporciones voluntariamente al contactarnos, registrarte a actividades,
            donar o colaborar con la fundación.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">2. Uso de la información</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Utilizamos tu información únicamente para fines relacionados con nuestras actividades
            institucionales: gestión de actividades, comunicación con participantes, envío de
            información relevante y cumplimiento de obligaciones legales.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">3. Protección de datos</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Implementamos medidas técnicas y organizativas adecuadas para proteger tus datos frente a
            accesos no autorizados, pérdida o divulgación indebida. No compartimos tu información con
            terceros, salvo requerimiento legal o consentimiento explícito.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">4. Derechos de los usuarios</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Podés solicitar el acceso, rectificación o eliminación de tus datos personales en cualquier
            momento escribiéndonos a{' '}
            <a
              href="mailto:info@evolucionantoniana.com"
              className="text-blue-700 hover:underline"
            >
              info@evolucionantoniana.com
            </a>.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-3">5. Cambios en la política</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Nos reservamos el derecho de modificar esta Política de Privacidad para reflejar cambios en
            nuestras prácticas o por motivos legales. La versión actualizada estará siempre disponible
            en este sitio.
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

export default PrivacyPolicy;
