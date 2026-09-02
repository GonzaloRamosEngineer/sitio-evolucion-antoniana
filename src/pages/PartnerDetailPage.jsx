import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, Mail, Info, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SanitizedHtml } from '@/components/ui/sanitized-html';
import { ResourceLoading, ResourceNotFound } from '@/components/ui/resource-state';
import { useAllPartners, useBeneficiosVidriera } from '@/hooks/useContentQueries';

const slugify = (s = '') =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

const PartnerDetailPage = () => {
  const { slug } = useParams();

  // Reusa la caché del listado: si venís de /partners, el detalle abre sin
  // ninguna consulta nueva. El `select` resuelve el slug sobre el dato cacheado.
  // Sin filtrar por estado a propósito: para el anon la RLS ya devuelve solo los
  // aprobados, y así un admin puede previsualizar el detalle de uno pendiente.
  const { data: partner = null, isPending: loading } = useAllPartners({
    select: (rows) =>
      rows.find((p) => p.slug === slug || slugify(p.nombre) === slug) ?? null,
  });

  /*
    Los beneficios que este aliado ofrece en el club, si ofrece alguno.

    POR QUÉ ESTO FALTABA Y NO SE NOTÓ. El enlace era de UNA sola dirección: el
    detalle del beneficio manda al perfil del aliado ("Ver perfil del aliado"),
    y el perfil no volvía. Peor: donde no hay `colaboracion_detalle` la página
    dice "Próximamente compartiremos más información sobre los beneficios de
    esta alianza" — y **el beneficio ya está publicado desde el 2026-09-02**,
    así que la página prometía como futuro algo que ya existía.

    Es la misma familia que §12.10.14, el /club huérfano: piezas que funcionan
    y no están conectadas. Un enlace que falta no rompe nada y no lo encuentra
    ningún test.

    Se reusa `useBeneficiosVidriera` a propósito: misma consulta, misma caché y
    la misma garantía de que acá tampoco puede aparecer un código (§12.10.13).
  */
  const { data: beneficiosDelAliado = [] } = useBeneficiosVidriera({
    enabled: Boolean(partner?.id),
    select: (rows) => (rows ?? []).filter((b) => b.partner_id && b.partner_id === partner?.id),
  });

  const pageTitle = partner
    ? `${partner.nombre} – Fundación Evolución Antoniana`
    : 'Alianzas estratégicas';

  if (loading) {
    return <ResourceLoading title="Cargando alianza… – Fundación Evolución Antoniana" />;
  }

  if (!partner) {
    return (
      <ResourceNotFound
        icon={Info}
        title="Alianza no encontrada"
        description="Es posible que el vínculo haya cambiado o que el enlace no sea correcto."
        backTo="/partners"
        backLabel="Volver al listado"
      />
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
            Volver a partners
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
                <div className="bg-white rounded-sm border border-brand-dark/10 p-6 overflow-hidden relative">
                    {/* Header decorativo */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-brand-primary"></div>
                    
                    {/* Logo */}
                    {partner.logo_url && (
                        <div className="w-full rounded-sm bg-brand-sand/60 border border-brand-dark/10 flex items-center justify-center p-8 mb-6 h-48">
                            <img
                            src={partner.logo_url}
                            alt={partner.nombre}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            />
                        </div>
                    )}

                    {/*
                      `break-words`: el nombre puede ser UNA sola palabra larga
                      —"DigitalMatchGlobal", 18 caracteres— y en esta columna
                      angosta se pasaba del borde de la tarjeta. El texto de
                      alrededor envolvía bien porque tiene espacios, así que el
                      recorte se veía solo en el título y solo con nombres largos.
                    */}
                    <h1 className="text-3xl font-bold font-poppins text-brand-dark mb-2 leading-tight break-words hyphens-auto">
                        {partner.nombre}
                    </h1>

                    {partner.estado === 'aprobado' && (
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-green-600">
                                Partner verificado
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
                            Visitar sitio web
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
                <div className="bg-white rounded-sm border border-brand-dark/10 p-8 md:p-10 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-brand-sand text-brand-primary">
                                <Info className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold font-poppins text-brand-dark">
                                Detalles de la alianza
                            </h2>
                        </div>

                        {partner.colaboracion_detalle ? (
                        <SanitizedHtml
                            as="article"
                            html={partner.colaboracion_detalle}
                            className="
                                prose prose-slate max-w-none text-gray-600
                                prose-headings:font-poppins prose-headings:font-bold prose-headings:text-brand-dark
                                prose-a:text-brand-action hover:prose-a:underline
                                prose-strong:text-brand-dark
                                prose-li:marker:text-brand-gold
                            "
                        />
                        ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500 italic">
                                {beneficiosDelAliado.length > 0
                                    ? 'Esta alianza ya tiene beneficios activos en el club.'
                                    : 'Próximamente compartiremos más información detallada sobre los beneficios de esta alianza.'}
                            </p>
                        </div>
                        )}

                        {/*
                          El camino de vuelta: del aliado a lo que ofrece. Sin
                          esto, quien llega al perfil desde el footer o desde
                          /partners no tiene forma de enterarse de que hay un
                          beneficio, aunque esté publicado.
                        */}
                        {beneficiosDelAliado.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h3 className="font-bold font-poppins text-brand-dark mb-1">
                                    {beneficiosDelAliado.length === 1
                                        ? 'Su beneficio en el club'
                                        : `Sus ${beneficiosDelAliado.length} beneficios en el club`}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Parte del club de beneficios para quienes sostienen la Fundación.
                                </p>
                                <ul className="space-y-3">
                                    {beneficiosDelAliado.map((b) => (
                                        <li key={b.id}>
                                            <Link
                                                to={b.slug ? `/beneficios/${b.slug}` : '/beneficios'}
                                                className="flex items-center justify-between gap-4 rounded-sm border border-brand-dark/10 bg-brand-sand/40 p-4 transition-colors hover:bg-brand-sand"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block font-semibold text-brand-dark break-words">
                                                        {b.titulo}
                                                    </span>
                                                    {b.requiere_acceso && (
                                                        <span className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                                            <Lock aria-hidden="true" className="h-3 w-3" />
                                                            Para socios con aporte vigente
                                                        </span>
                                                    )}
                                                </span>
                                                {b.descuento && (
                                                    <span className="shrink-0 font-bold text-brand-action">
                                                        {b.descuento}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Banner Promo Opcional (si quisieras agregar algo abajo) */}
                <div className="mt-6 bg-brand-primary rounded-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
                    <div>
                        <h3 className="font-bold font-poppins text-lg">¿Tu organización quiere sumarse?</h3>
                        <p className="text-white/75 text-sm">Sé parte de la red de impacto de Evolución Antoniana.</p>
                    </div>
                    <Link to="/postular-partner">
                         <Button className="bg-white text-brand-primary hover:bg-brand-sand font-bold whitespace-nowrap">
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