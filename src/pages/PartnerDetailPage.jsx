// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\PartnerDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Mail, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPartners } from '@/lib/storage';

const slugify = (s = '') =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

const PartnerDetailPage = () => {
  const { slug } = useParams();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        setLoading(true);
        const partners = await getPartners();
        if (Array.isArray(partners)) {
          const found = partners.find(
            (p) =>
              p.slug === slug ||
              slugify(p.nombre) === slug
          );
          setPartner(found || null);
        } else {
          setPartner(null);
        }
      } catch (error) {
        console.error('Error cargando partner:', error);
        setPartner(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [slug]);

  const pageTitle = partner
    ? `${partner.nombre} – Fundación Evolución Antoniana`
    : 'Alianzas estratégicas';

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-sand flex items-center justify-center">
        <Helmet>
          <title>Cargando alianza… – Fundación Evolución Antoniana</title>
        </Helmet>
        <div className="animate-pulse flex flex-col items-center">
             <div className="h-16 w-16 bg-brand-primary/20 rounded-full mb-4 animate-bounce"></div>
             <div className="h-4 w-32 bg-brand-primary/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-brand-sand flex flex-col items-center justify-center px-4">
        <Helmet>
          <title>Alianza no encontrada – Fundación Evolución Antoniana</title>
        </Helmet>
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-lg text-center border border-gray-100">
          <Info className="w-12 h-12 text-brand-gold mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-poppins text-brand-dark mb-3">
            Alianza no encontrada
          </h1>
          <p className="text-gray-600 mb-6">
            Es posible que el vínculo haya cambiado o que el enlace no sea correcto.
          </p>
          <Link to="/partners">
            <Button className="bg-brand-primary text-white hover:bg-brand-dark">
                Volver al listado
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasWebsite = !!partner.sitio_web;
  const hasEmail = !!partner.contacto_email;

  return (
    <div className="min-h-screen bg-brand-sand font-sans">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Back link */}
        <div className="mb-8">
          <Link
            to="/partners"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand-action transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver a Partners
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Columna Izquierda: Info Principal */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-1"
            >
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden relative">
                    {/* Header decorativo */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-brand-primary"></div>
                    
                    {/* Logo */}
                    {partner.logo_url && (
                        <div className="w-full rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center p-8 mb-6 h-48">
                            <img
                            src={partner.logo_url}
                            alt={partner.nombre}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            />
                        </div>
                    )}

                    <h1 className="text-3xl font-bold font-poppins text-brand-dark mb-2 leading-tight">
                        {partner.nombre}
                    </h1>

                    {partner.estado === 'aprobado' && (
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-green-600">
                                Partner Verificado
                            </span>
                        </div>
                    )}

                    {partner.descripcion && (
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 border-b border-gray-100 pb-6">
                            {partner.descripcion}
                        </p>
                    )}

                    {/* Botones de acción */}
                    <div className="flex flex-col gap-3">
                        {hasWebsite && (
                        <Button
                            variant="outline"
                            asChild
                            className="w-full justify-center border-gray-200 hover:border-brand-primary hover:text-brand-primary"
                        >
                            <a
                            href={partner.sitio_web}
                            target="_blank"
                            rel="noopener noreferrer"
                            >
                            <Globe className="w-4 h-4 mr-2" />
                            Visitar Sitio Web
                            </a>
                        </Button>
                        )}

                        {hasEmail && (
                        <Button
                            asChild
                            className="w-full justify-center bg-brand-dark text-white hover:bg-brand-primary"
                        >
                            <a href={`mailto:${partner.contacto_email}`}>
                            <Mail className="w-4 h-4 mr-2" />
                            Contactar
                            </a>
                        </Button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Columna Derecha: Detalle Colaboración */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="lg:col-span-2"
            >
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-10 relative overflow-hidden">
                    {/* Icono de fondo decorativo */}
                    <Info className="absolute -top-6 -right-6 w-32 h-32 text-brand-sand opacity-50 rotate-12" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-sand text-brand-primary">
                                <Info className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold font-poppins text-brand-dark">
                                Detalles de la Alianza
                            </h2>
                        </div>

                        {partner.colaboracion_detalle ? (
                        <article
                            className="
                                prose prose-slate max-w-none text-gray-600
                                prose-headings:font-poppins prose-headings:font-bold prose-headings:text-brand-dark
                                prose-a:text-brand-action hover:prose-a:underline
                                prose-strong:text-brand-dark
                                prose-li:marker:text-brand-gold
                            "
                            dangerouslySetInnerHTML={{
                            __html: partner.colaboracion_detalle,
                            }}
                        />
                        ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500 italic">
                                Próximamente compartiremos más información detallada sobre los beneficios de esta alianza.
                            </p>
                        </div>
                        )}
                    </div>
                </div>

                {/* Banner Promo Opcional (si quisieras agregar algo abajo) */}
                <div className="mt-6 bg-brand-primary rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
                    <div>
                        <h3 className="font-bold font-poppins text-lg">¿Tu organización quiere sumarse?</h3>
                        <p className="text-blue-200 text-sm">Sé parte de la red de impacto de Evolución Antoniana.</p>
                    </div>
                    <Link to="/postular-partner">
                         <Button className="bg-white text-brand-primary hover:bg-blue-50 font-bold whitespace-nowrap">
                            Postular mi empresa
                         </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDetailPage;