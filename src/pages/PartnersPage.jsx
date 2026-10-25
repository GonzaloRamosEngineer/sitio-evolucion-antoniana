import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn, palabraMasLarga } from '@/lib/utils';
import {
  Plus,
  ArrowRight,
  Handshake,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import PartnerLogo from '@/components/PartnerLogo';
import { useApprovedPartners } from '@/hooks/useContentQueries';
import { RUTAS } from '@/config/rutas';
import { canonicalUrl } from '@/lib/seo';

const impactAreas = [
  {
    key: 'tecnologia',
    title: 'Tecnología y capacidad digital',
    description:
      'Herramientas, infraestructura y conocimiento que nos permiten trabajar mejor, cuidar la información y llevar cada iniciativa más lejos.',
    partners: ['google', 'digitalmatch', 'microsoft', 'atlassian', 'canva'],
  },
  {
    key: 'desarrollo-social',
    title: 'Desarrollo social y fortalecimiento institucional',
    description:
      'Vínculos que abren puertas, fortalecen procesos y conectan a la Fundación con una comunidad global comprometida con el impacto social.',
    partners: ['goodstack', 'mercado-libre'],
  },
  {
    key: 'educacion',
    title: 'Educación y territorio',
    description:
      'Articulación con instituciones que acerca conocimiento, genera oportunidades y conecta nuestras acciones con las necesidades reales de la comunidad.',
    partners: ['uba', 'universidad', 'gobierno-salta', 'ministerio-de-educacion'],
  },
];

const partnerIdentity = (partner) =>
  `${partner.slug || ''} ${partner.nombre || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');

const areaForPartner = (partner) =>
  impactAreas.find((area) =>
    area.partners.some((term) => partnerIdentity(partner).includes(term)),
  )?.key;

const PartnerCard = ({ partner, className }) => (
  <article
    className={cn(
      'group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl',
      className,
    )}
  >
    <div className="relative flex h-48 items-center justify-center overflow-hidden border-b border-gray-100 bg-gray-50 p-8">
      <div aria-hidden="true" className="absolute right-0 top-0 -mr-12 -mt-12 h-24 w-24 rounded-bl-full bg-brand-primary/5 transition-transform duration-500 group-hover:scale-150" />
      <PartnerLogo
        partner={partner}
        loading="eager"
        className="relative h-[120px] w-[280px]"
        imageClassName="grayscale transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
        fallbackClassName="text-5xl text-brand-primary/25"
      />
    </div>

    <div className="flex flex-grow flex-col p-7">
      <h3
        className={cn(
          'font-poppins font-bold leading-tight text-brand-dark',
          palabraMasLarga(partner.nombre) > 15 ? 'text-xl' : 'text-2xl',
        )}
      >
        {partner.nombre}
      </h3>
      <p className="mt-3 mb-6 line-clamp-3 flex-grow text-sm leading-relaxed text-gray-600">
        {partner.descripcion}
      </p>
      <Link
        to={RUTAS.alianzas.detalle(partner.slug || partner.id)}
        className="mt-auto flex items-center justify-between rounded-md border border-gray-200 bg-brand-sand px-4 py-2.5 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-primary hover:text-brand-primary"
      >
        Conocer vínculo
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </div>
  </article>
);

const PartnersPage = () => {
  const {
    data: partners = [],
    isPending: loading,
    isError: error,
    refetch: fetchData,
  } = useApprovedPartners();

  // `filter` conserva el orden relativo que ya trae `partners.orden`.
  const groupedPartners = impactAreas.map((area) => ({
    ...area,
    items: partners.filter((partner) => areaForPartner(partner) === area.key),
  }));
  const ungroupedPartners = partners.filter((partner) => !areaForPartner(partner));

  return (
    <div className="min-h-screen bg-brand-sand font-sans">
      <Helmet>
        <title>Partners Evolutivos - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Conocé a nuestras marcas aliadas y los beneficios que ofrecen"
        />
        <link rel="canonical" href={canonicalUrl(RUTAS.alianzas.lista)} />
      </Helmet>

      <section className="relative overflow-hidden border-t-2 border-brand-gold bg-brand-primary text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <Eyebrow light>Alianzas estratégicas</Eyebrow>
            <h1 className="mt-6 mb-6 font-poppins text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              Partners evolutivos
            </h1>
            <p className="mb-8 max-w-[36rem] text-lg leading-relaxed text-white/75">
              Organizaciones líderes comprometidas con el desarrollo tecnológico y social de nuestra comunidad.
            </p>
            <Link to={RUTAS.alianzas.postularse}>
              <Button variant="action" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Sumar mi organización
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-white py-24 text-center shadow-sm">
              <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-300" />
              <p className="mb-2 text-xl font-bold text-gray-700">No pudimos cargar esta sección.</p>
              <p className="mb-6 text-gray-500">Revisá tu conexión e intentá nuevamente.</p>
              <Button onClick={fetchData} variant="outline" className="border-brand-action font-bold text-brand-action hover:bg-brand-action hover:text-white">
                Reintentar
              </Button>
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-3xl border border-brand-primary/5 bg-white py-24 text-center shadow-sm">
              <Handshake className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="mb-6 text-xl font-medium text-gray-500">
                Aún no hay marcas aliadas visibles. ¡Sé el primero en unirte a la evolución!
              </p>
              <Link to={RUTAS.alianzas.postularse}>
                <Button variant="outline" className="border-brand-action font-bold text-brand-action hover:bg-brand-action hover:text-white">
                  Postularse ahora
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-16 lg:space-y-20">
              {groupedPartners.map((area) => area.items.length > 0 && (
                <section key={area.key} aria-labelledby={`impacto-${area.key}`}>
                  <div className="mb-8 max-w-3xl lg:mx-auto lg:text-center">
                    <h2 id={`impacto-${area.key}`} className="font-poppins text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
                      {area.title}
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-gray-600">
                      {area.description}
                    </p>
                  </div>
                  <div className={cn(
                    'grid gap-8 md:grid-cols-2',
                    area.items.length > 2 ? 'lg:grid-cols-6' : 'lg:grid-cols-2',
                  )}>
                    {area.items.map((partner, index) => (
                      <PartnerCard
                        key={partner.id}
                        partner={partner}
                        className={cn(
                          area.items.length > 2 && 'lg:col-span-2',
                          area.items.length > 2 && index === area.items.length - 2 && area.items.length % 3 === 2 && 'lg:col-start-2',
                          area.items.length > 2 && index === area.items.length - 1 && area.items.length % 3 === 1 && 'lg:col-start-3',
                        )}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {ungroupedPartners.length > 0 && (
                <section aria-labelledby="otras-alianzas">
                  <h2 id="otras-alianzas" className="mb-8 font-poppins text-2xl font-bold text-brand-dark sm:text-3xl">Otras alianzas</h2>
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {ungroupedPartners.map((partner) => (
                      <PartnerCard key={partner.id} partner={partner} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnersPage;
