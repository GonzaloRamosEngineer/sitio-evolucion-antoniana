// src/pages/Home.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  Heart,
  Users,
  BookOpen,
  Award,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getNews, getPartners } from "@/lib/storage";
// Logos normalizados (recorte de aire + masa visual pareja) generados con
// tools/normalize-partner-logos.mjs; fallback al logo_url crudo si falta.
import partnerLogoOverrides from "@/data/partnerLogoOverrides.json";

const alliances = [
  { name: "Google", detail: "for Nonprofits" },
  { name: "Canva", detail: "for Nonprofits" },
  { name: "Mercado Libre", detail: "Solidario" },
  { name: "UBA", detail: "Ciencias Económicas" },
  { name: "Ministerio de Educación", detail: "Provincia de Salta" },
];

const stats = [
  { number: "305", suffix: "+", label: "Almas impactadas", desc: "Beneficiarios directos de nuestros programas." },
  { number: "7", suffix: "", label: "Proyectos activos", desc: "Iniciativas tecnológicas y sociales en curso." },
  { number: "6", suffix: "", label: "Años de trayectoria", desc: "Experiencia en gestión de impacto." },
  { number: "4", suffix: "", label: "Reconocimientos", desc: "Premios a la innovación social." },
];

const areas = [
  {
    title: "Educación",
    description:
      "Programa educativo con preinscripción abierta: talleres, cursos y formación continua para el crecimiento personal.",
    to: "/preinscripcion",
    cta: "Preinscribite",
  },
  {
    title: "Deporte",
    description:
      "Becas de acompañamiento deportivo y experiencias que amplían la formación de los chicos, dentro y fuera de la cancha.",
    to: "/collaborate",
    cta: "Conocé las becas",
  },
  {
    title: "Inclusión social",
    description:
      "Acciones solidarias y acompañamiento a instituciones de la comunidad salteña, con gestión transparente.",
    to: "/about",
    cta: "Nuestra historia",
  },
  {
    title: "Tecnología",
    description:
      "Innovación digital aplicada al impacto social: alianzas, herramientas y beneficios para nuestra comunidad.",
    to: "/beneficios",
    cta: "Ver beneficios",
  },
];

const pillars = [
  {
    icon: Heart,
    title: "Compromiso social",
    description: "Desarrollo integral de nuestra comunidad, con pasión y dedicación.",
  },
  {
    icon: Users,
    title: "Trabajo en equipo",
    description: "Colaboración y trabajo conjunto para lograr objetivos comunes.",
  },
  {
    icon: BookOpen,
    title: "Educación continua",
    description: "Formación permanente como motor del crecimiento personal.",
  },
  {
    icon: Award,
    title: "Excelencia",
    description: "Calidad, impacto medible y gestión moderna en cada proyecto.",
  },
];

/** Encabezado de sección con link "ver todo" */
const SectionHeader = ({ eyebrow, title, linkTo, linkLabel, light = false }) => (
  <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 mb-12 lg:mb-14">
    <div className="max-w-2xl">
      <div className="mb-5">
        <Eyebrow light={light}>{eyebrow}</Eyebrow>
      </div>
      <h2
        className={`font-poppins font-bold text-3xl lg:text-[2.4rem] leading-tight tracking-tight text-balance ${
          light ? "text-white" : "text-brand-dark"
        }`}
      >
        {title}
      </h2>
    </div>
    {linkTo && (
      <Link
        to={linkTo}
        className={`group inline-flex items-center gap-2 text-sm font-semibold ${
          light ? "text-brand-gold hover:text-white" : "text-brand-action hover:text-brand-dark"
        } transition-colors`}
      >
        {linkLabel}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    )}
  </div>
);

const cleanActivityTitle = (title) => {
  if (!title) return "";
  return String(title)
    .trim()
    .replace(/^\s*\[\s*Ciclo\s*[ABC]\s*[^\]]*\]\s*(?:[—–-]\s*)?/i, "")
    .replace(/^\s*CICLO\s*[ABC]\s*[·•:.-]?\s*[^—–-]*[—–-]\s*/i, "");
};

const formatDate = (dateString) => {
  if (!dateString) return "Fecha a confirmar";
  try {
    return new Date(dateString).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "Fecha a confirmar";
  }
};

const SkeletonCard = () => (
  <div className="border border-brand-dark/10 rounded-sm overflow-hidden animate-pulse">
    <div className="aspect-[16/10] bg-brand-dark/5" />
    <div className="p-6 space-y-3">
      <div className="h-3 w-24 bg-brand-dark/10 rounded" />
      <div className="h-5 w-3/4 bg-brand-dark/10 rounded" />
      <div className="h-4 w-1/2 bg-brand-dark/5 rounded" />
    </div>
  </div>
);

const Home = () => {
  const reduceMotion = useReducedMotion();

  // --- Contenido vivo (Supabase); null = cargando ---
  const [activities, setActivities] = useState(null);
  const [news, setNews] = useState(null);
  const [partners, setPartners] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("activities")
      .select("id, title, date, duration, modality, status, image_url")
      .order("date", { ascending: true })
      .then(({ data, error }) => {
        if (!cancelled) setActivities(error ? [] : data || []);
      });
    getNews()
      .then((data) => !cancelled && setNews((data || []).slice(0, 3)))
      .catch(() => !cancelled && setNews([]));
    getPartners()
      .then(
        (data) =>
          !cancelled &&
          setPartners((data || []).filter((p) => p.estado === "aprobado").slice(0, 10))
      )
      .catch(() => !cancelled && setPartners([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const activitiesLoading = activities === null;
  const upcomingActivities = useMemo(() => {
    const list = activities || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = list.filter((a) => {
      if (!["Abierta", "Próximamente"].includes(a.status)) return false;
      const d = new Date(a.date);
      return !Number.isNaN(d.getTime()) && d >= today;
    });
    if (upcoming.length > 0) return upcoming.slice(0, 3);
    // Sin próximas: mostramos las más recientes para que la agenda nunca quede vacía
    return [...list]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
  }, [activities]);

  // --- Motion ---
  const sequence = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.12 } },
  };
  const rise = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
      };
  const inView = (props = {}) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          ...props,
        };

  return (
    <div className="bg-brand-sand">
      <Helmet>
        <title>Fundación Evolución Antoniana | Educación, Deporte y Tecnología para Transformar Realidades</title>
        <meta name="description" content="Impulsamos oportunidades reales a través de la educación, el deporte, la inclusión y la tecnología, desarrollando proyectos que transforman realidades." />
        <link rel="canonical" href="https://www.evolucionantoniana.com/" />
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />

        <motion.div
          variants={sequence}
          initial="hidden"
          animate="visible"
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14 lg:pt-28 lg:pb-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <motion.div variants={rise} className="mb-7">
                <Eyebrow light>Fundación · Salta, Argentina</Eyebrow>
              </motion.div>

              <motion.h1
                variants={rise}
                className="font-poppins font-bold text-[2.75rem] leading-[1.06] sm:text-6xl lg:text-[4.4rem] tracking-tight text-white text-balance mb-7"
              >
                Un legado que{" "}
                <em className="not-italic text-brand-gold">evoluciona</em>.
              </motion.h1>

              <motion.p
                variants={rise}
                className="max-w-[38rem] text-lg leading-relaxed text-white/75 mb-10"
              >
                Educación, deporte, inclusión y tecnología: impulsamos
                oportunidades reales para transformar vidas en Salta, uniendo
                el compromiso comunitario con la innovación digital.
              </motion.p>

              <motion.div variants={rise} className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-white text-brand-dark font-semibold hover:bg-brand-sand shadow-none"
                  asChild
                >
                  <Link to="/activities">
                    Conocé nuestras actividades
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white bg-transparent hover:bg-white/10 hover:text-white font-medium shadow-none"
                  asChild
                >
                  <Link to="/collaborate">Quiero colaborar</Link>
                </Button>
              </motion.div>
            </div>

            {/* Fotografía con marco offset */}
            <motion.div variants={rise} className="lg:col-span-5 mt-2 lg:mt-0">
              <div className="relative mr-3 mb-3 lg:mr-4 lg:mb-4">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-3 translate-y-3 lg:translate-x-4 lg:translate-y-4 border border-brand-gold/50 rounded-sm"
                />
                <img
                  className="relative w-full h-auto object-cover rounded-sm"
                  src="/img/donativo_cancha.webp"
                  width="1280"
                  height="629"
                  fetchpriority="high"
                  alt="Entrega de donación en la cancha del Club Atlético Antoniano"
                />
              </div>
            </motion.div>
          </div>

          {/* Alianzas: una sola línea, en voz baja */}
          <motion.div variants={rise} className="mt-14 lg:mt-20 pt-8 border-t border-white/15">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 font-medium mb-4">
              En alianza con
            </p>
            <ul
              aria-label="Alianzas estratégicas"
              className="flex flex-wrap items-baseline gap-x-8 gap-y-3 text-sm"
            >
              {alliances.map((a) => (
                <li key={a.name} className="flex items-baseline whitespace-nowrap">
                  <span className="text-white/85 font-medium">{a.name}</span>
                  <span className="ml-1.5 text-white/50 text-xs">{a.detail}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </section>

      {/* ============ CIFRAS ============ */}
      <section className="bg-brand-white border-b border-brand-dark/10">
        <motion.div
          {...inView()}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16"
        >
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 lg:gap-x-0 lg:gap-y-0 lg:divide-x lg:divide-brand-dark/10">
            {stats.map((stat) => (
              <div key={stat.label} className="lg:px-8 first:lg:pl-0 last:lg:pr-0">
                <dd className="font-poppins font-bold text-5xl lg:text-6xl text-brand-dark tracking-tight [font-variant-numeric:tabular-nums] mb-3">
                  {stat.number}
                  <span className="text-brand-gold">{stat.suffix || ""}</span>
                </dd>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary mb-2">
                  {stat.label}
                </dt>
                <p className="text-sm text-gray-600 leading-relaxed max-w-[16rem]">
                  {stat.desc}
                </p>
              </div>
            ))}
          </dl>
        </motion.div>
      </section>

      {/* ============ QUÉ HACEMOS ============ */}
      <section className="bg-brand-sand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <SectionHeader
            eyebrow="Qué hacemos"
            title="Cuatro frentes, una misión: crear oportunidades reales."
          />

          <div>
            {areas.map((area, index) => (
              <motion.div
                key={area.title}
                {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : index * 0.05 } })}
              >
                <Link
                  to={area.to}
                  className="group grid grid-cols-1 lg:grid-cols-12 gap-y-3 gap-x-8 items-baseline border-t border-brand-dark/20 py-8 lg:py-10 last:border-b transition-colors hover:bg-brand-white/60 lg:px-4 lg:-mx-4"
                >
                  <h3 className="lg:col-span-4 font-poppins font-bold text-2xl lg:text-[1.75rem] tracking-tight text-brand-dark group-hover:text-brand-primary transition-colors">
                    {area.title}
                  </h3>
                  <p className="lg:col-span-6 text-gray-600 leading-relaxed">
                    {area.description}
                  </p>
                  <span className="lg:col-span-2 lg:text-right text-sm font-semibold text-brand-action inline-flex lg:justify-end items-center gap-2">
                    {area.cta}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PILARES (banda institucional) ============ */}
      <section className="bg-brand-primary text-white relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <motion.div {...inView()} className="max-w-2xl mb-12">
            <div className="mb-5">
              <Eyebrow light>Nuestros pilares</Eyebrow>
            </div>
            <h2 className="font-poppins font-bold text-3xl lg:text-[2.4rem] leading-tight tracking-tight text-white text-balance">
              Tradición franciscana, gestión moderna.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-10">
            {pillars.map((pillar, index) => (
              <motion.article
                key={pillar.title}
                {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : index * 0.08 } })}
                className="border-t border-white/20 pt-6"
              >
                <pillar.icon aria-hidden="true" className="w-5 h-5 text-brand-gold mb-5" strokeWidth={1.75} />
                <h3 className="font-poppins font-semibold text-lg text-white mb-3">
                  {pillar.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {pillar.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ AGENDA ============ */}
      {(activitiesLoading || upcomingActivities.length > 0) && (
        <section className="bg-brand-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <motion.div {...inView()}>
              <SectionHeader
                eyebrow="Agenda"
                title="Próximas actividades"
                linkTo="/activities"
                linkLabel="Ver todas las actividades"
              />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {activitiesLoading && upcomingActivities.length === 0
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
                : upcomingActivities.map((activity, index) => (
                    <motion.article
                      key={activity.id}
                      {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : index * 0.08 } })}
                    >
                      <Link
                        to={`/activities/${activity.id}`}
                        className="group block border border-brand-dark/10 rounded-sm overflow-hidden bg-white hover:border-brand-primary/40 transition-colors h-full"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-brand-primary">
                          {activity.image_url ? (
                            <img
                              src={activity.image_url}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-hero-glow">
                              <Calendar aria-hidden="true" className="w-8 h-8 text-brand-gold/60" />
                            </div>
                          )}
                          {activity.status === "Abierta" && (
                            <span className="absolute top-3 left-3 bg-white/95 text-brand-dark text-[11px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-sm">
                              Inscripción abierta
                            </span>
                          )}
                          {activity.status === "Próximamente" && (
                            <span className="absolute top-3 left-3 bg-brand-gold text-brand-dark text-[11px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-sm">
                              Próximamente
                            </span>
                          )}
                        </div>
                        <div className="p-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-action mb-3">
                            {formatDate(activity.date)}
                          </p>
                          <h3 className="font-poppins font-semibold text-lg leading-snug text-brand-dark group-hover:text-brand-primary transition-colors line-clamp-2 mb-4">
                            {cleanActivityTitle(activity.title)}
                          </h3>
                          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-600">
                            {activity.duration && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock aria-hidden="true" className="w-3.5 h-3.5 text-brand-gold" />
                                {activity.duration}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin aria-hidden="true" className="w-3.5 h-3.5 text-brand-gold" />
                              {String(activity.modality || "").toLowerCase() === "presencial"
                                ? "Presencial · Salta"
                                : "Virtual"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ NOVEDADES ============ */}
      {(news === null || news.length > 0) && (
        <section className="bg-brand-sand border-t border-brand-dark/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <motion.div {...inView()}>
              <SectionHeader
                eyebrow="Novedades"
                title="Lo último de la fundación"
                linkTo="/novedades"
                linkLabel="Ver todas las novedades"
              />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {news === null
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
                : news.map((item, index) => (
                    <motion.article
                      key={item.id}
                      {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : index * 0.08 } })}
                    >
                      <Link
                        to={`/novedades/${item.slug || item.id}`}
                        className="group block border border-brand-dark/10 rounded-sm overflow-hidden bg-white hover:border-brand-primary/40 transition-colors h-full"
                      >
                        {item.image_url && (
                          <div className="aspect-[16/10] overflow-hidden">
                            <img
                              src={item.image_url}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-action mb-3">
                            {formatDate(item.created_at)}
                          </p>
                          <h3 className="font-poppins font-semibold text-lg leading-snug text-brand-dark group-hover:text-brand-primary transition-colors line-clamp-3 mb-4">
                            {item.title}
                          </h3>
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-action">
                            Leer más
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ PARTNERS ============ */}
      {partners !== null && partners.length > 0 && (
        <section className="bg-brand-white border-t border-brand-dark/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <motion.div {...inView()}>
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 mb-10">
                <div>
                  <div className="mb-5">
                    <Eyebrow>Comunidad</Eyebrow>
                  </div>
                  <h2 className="font-poppins font-bold text-2xl lg:text-3xl tracking-tight text-brand-dark">
                    Partners que nos acompañan
                  </h2>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <Link
                    to="/beneficios"
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-brand-action hover:text-brand-dark transition-colors"
                  >
                    Ver beneficios
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to="/postular-partner"
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:text-brand-dark transition-colors"
                  >
                    Sumá tu empresa
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              <ul
                aria-label="Partners de la fundación"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-2"
              >
                {partners.map((partner) => (
                  <li key={partner.id}>
                    <Link
                      to={`/partners/${partner.slug || partner.id}`}
                      className="flex items-center justify-center h-24 px-4 opacity-70 hover:opacity-100 transition-opacity"
                      title={partner.nombre}
                    >
                      {partnerLogoOverrides[partner.id] ? (
                        <img
                          src={partnerLogoOverrides[partner.id]}
                          alt={partner.nombre}
                          loading="lazy"
                          width="280"
                          height="120"
                          className="h-[60px] w-auto grayscale hover:grayscale-0 transition-all duration-300"
                        />
                      ) : partner.logo_url ? (
                        <img
                          src={partner.logo_url}
                          alt={partner.nombre}
                          loading="lazy"
                          className="max-h-11 max-w-[8.5rem] w-auto h-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
                        />
                      ) : (
                        <span className="font-poppins font-semibold text-brand-dark text-center text-sm leading-snug">
                          {partner.nombre}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>
      )}

      {/* ============ CTA ============ */}
      <section className="bg-brand-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div {...inView()} className="max-w-3xl">
            <div className="mb-6">
              <Eyebrow light>Sumate</Eyebrow>
            </div>
            <h2 className="font-poppins font-bold text-3xl sm:text-4xl lg:text-[3.25rem] leading-[1.1] tracking-tight text-white text-balance mb-6">
              ¿Listo para ser parte de la{" "}
              <em className="not-italic text-brand-gold">evolución</em>?
            </h2>
            <p className="text-lg text-white/70 leading-relaxed max-w-[36rem] mb-10">
              Unite a nuestra comunidad: accedé a beneficios exclusivos de
              nuestros partners y contribuí al desarrollo social y tecnológico
              de Salta.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <Button
                size="lg"
                className="h-12 px-8 bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 shadow-none"
                asChild
              >
                <Link to="/collaborate">
                  <Heart className="mr-2 h-4 w-4" />
                  Quiero colaborar
                </Link>
              </Button>
              <p className="text-sm text-white/50">
                Gestión transparente, impacto medible.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
