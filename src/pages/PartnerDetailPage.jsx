import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Mail, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPartners } from '@/lib/storage';

const slugify = (s = '') =>
  s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const PartnerDetailPage = () => {
  const { slug } = useParams();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartner = async () => {
      setLoading(true);
      const allPartners = await getPartners();
      // Busca por slug; si algún registro aún no lo tiene, compará contra slugify(nombre)
      const foundPartner = (allPartners || []).find(
        (p) => (p.slug || slugify(p.nombre)) === slug
      );
      setPartner(foundPartner || null);
      setLoading(false);
    };
    fetchPartner();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando partner...</p>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-3xl font-bold mb-4">Partner no encontrado</h1>
        <p className="text-gray-600 mb-6">
          El partner que buscas no existe o ha sido eliminado.
        </p>
        <Link to="/partners">
          <Button>Volver a Marcas Aliadas</Button>
        </Link>
      </div>
    );
  }

  // ---- NUEVO: preparar HTML para "Sobre la colaboración" ----
  const defaultColaboracion = `${partner.nombre} colabora activamente con nuestros proyectos, ofreciendo beneficios a la comunidad.`;

  const colaboracionHtml =
    partner.colaboracion_detalle?.trim() || defaultColaboracion;
  // -----------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Helmet>
        <title>{partner.nombre} - Fundación Evolución Antoniana</title>
        <meta name="description" content={partner.descripcion} />
      </Helmet>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Link
            to="/partners"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a todos los aliados evolutivos
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Contenedor del logo */}
              <div className="bg-gray-50 flex items-center justify-center h-64 md:h-80 p-4">
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={`Logo de ${partner.nombre}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <h2 className="text-5xl font-bold text-gray-400">
                    {partner.nombre}
                  </h2>
                )}
              </div>

              <div className="p-8 md:p-12">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                  {partner.nombre}
                </h1>

                <div className="prose prose-lg max-w-none text-gray-700 mb-8">
                  <p>{partner.descripcion}</p>
                </div>

                {/* Bloque "Sobre la colaboración" con HTML embebido */}
                <div className="bg-gray-100 rounded-lg p-6 space-y-4 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Sobre la colaboración
                      </h3>

                      <div
                        className="prose prose-lg max-w-none text-gray-600"
                        dangerouslySetInnerHTML={{ __html: colaboracionHtml }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  {partner.sitio_web && (
                    <a
                      href={partner.sitio_web}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="lg" variant="outline">
                        <Globe className="mr-2 h-5 w-5" />
                        Visitar Sitio Web
                      </Button>
                    </a>
                  )}
                  {partner.contacto_email && (
                    <a href={`mailto:${partner.contacto_email}`}>
                      <Button size="lg">
                        <Mail className="mr-2 h-5 w-5" />
                        Contactar
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PartnerDetailPage;
