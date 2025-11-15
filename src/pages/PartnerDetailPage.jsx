// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\PartnerDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Mail, Info } from 'lucide-react';
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

  const pageTitle = partner ? `${partner.nombre} – Fundación Evolución Antoniana` : 'Alianzas estratégicas';

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Cargando alianza… – Fundación Evolución Antoniana</title>
        </Helmet>
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-12 space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-7 w-48 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
          <div className="mt-6 h-40 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </>
    );
  }

  if (!partner) {
    return (
      <>
        <Helmet>
          <title>Alianza no encontrada – Fundación Evolución Antoniana</title>
        </Helmet>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-6">
            <Link
              to="/partners"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver a alianzas
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900 mb-3">
              No encontramos esta alianza
            </h1>
            <p className="text-slate-600">
              Es posible que el vínculo haya cambiado o que el enlace no sea correcto. 
              Volvé al listado para explorar todas nuestras alianzas estratégicas.
            </p>
          </div>
        </div>
      </>
    );
  }

  const hasWebsite = !!partner.sitio_web;
  const hasEmail = !!partner.contacto_email;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-12">
        {/* Back link */}
        <div className="mb-6">
          <Link
            to="/partners"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a alianzas
          </Link>
        </div>

        {/* Header card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            {partner.logo_url && (
              <div className="shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                <img
                  src={partner.logo_url}
                  alt={partner.nombre}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
                {partner.nombre}
              </h1>
              {partner.estado === 'aprobado' && (
                <p className="mt-1 inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                  Alianza activa
                </p>
              )}
            </div>
          </div>

          {partner.descripcion && (
            <p className="text-sm sm:text-base text-slate-700 mt-2">
              {partner.descripcion}
            </p>
          )}
        </motion.section>

        {/* Collaboration + actions */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="space-y-6"
        >
          {/* Sobre la colaboración */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <Info className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                Sobre la colaboración
              </h2>
            </div>

            {partner.colaboracion_detalle ? (
              <article
                className="prose prose-sm sm:prose-base max-w-none text-slate-700 prose-p:mb-3 prose-p:last:mb-0"
                // 👇 Renderizamos el HTML que viene de la BD de forma segura
                dangerouslySetInnerHTML={{
                  __html: partner.colaboracion_detalle,
                }}
              />
            ) : (
              <p className="text-sm text-slate-600">
                Próximamente compartiremos más información sobre esta alianza.
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            {hasWebsite && (
              <Button
                variant="outline"
                asChild
                className="w-full sm:w-auto justify-center"
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
                className="w-full sm:w-auto justify-center"
              >
                <a href={`mailto:${partner.contacto_email}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Contactar
                </a>
              </Button>
            )}
          </div>
        </motion.section>
      </div>
    </>
  );
};

export default PartnerDetailPage;
