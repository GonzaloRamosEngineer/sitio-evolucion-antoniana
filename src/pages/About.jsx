// src/pages/About.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Eyebrow } from '@/components/ui/eyebrow';
import {
  Heart,
  Target,
  Eye,
  Users,
  Award,
  ShieldCheck,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const values = [
  {
    icon: Heart,
    title: 'Compromiso',
    description:
      'Actuamos con responsabilidad, dedicación y presencia real en el territorio, acompañando procesos y no solo proyectos puntuales.'
  },
  {
    icon: ShieldCheck,
    title: 'Integridad',
    description:
      'Gestionamos recursos y decisiones con ética, claridad y rendición de cuentas, fortaleciendo la confianza de la comunidad.'
  },
  {
    icon: Sparkles,
    title: 'Innovación',
    description:
      'Incorporamos tecnología, creatividad y nuevas metodologías para diseñar soluciones sostenibles que respondan a desafíos reales.'
  },
  {
    icon: Users,
    title: 'Inclusión',
    description:
      'Promovemos oportunidades equitativas para todas las personas, sin distinción de origen, género, edad o condición socioeconómica.'
  },
  {
    icon: Users,
    title: 'Comunidad',
    description:
      'Creemos en la fuerza de las redes: articulamos con clubes, escuelas, organizaciones sociales, empresas y el sector público.'
  },
  {
    icon: Award,
    title: 'Excelencia',
    description:
      'Buscamos calidad, impacto medible y mejora continua en cada iniciativa que impulsamos desde la Fundación.'
  }
];

const founders = [
  {
    name: 'Gonzalo Andrés Ramos',
    role: 'Fundador',
    description:
      'Ingeniero en Sistemas de Información, Gestor Deportivo CONMEBOL e impulsor de la transformación institucional y tecnológica de la Fundación.',
    image: '/img/gonzalo_ramos.png'
  },
  {
    name: 'Juan Carlos Palavecino',
    role: 'Fundador',
    description:
      'Referente institucional y cofundador, comprometido con el desarrollo social, educativo y deportivo de la comunidad.',
    image: '/img/juan_carlos_palavecino.png'
  }
];

const authorities = [
  { position: 'Presidente', name: 'Guzmán Damián Álvaro' },
  { position: 'Vicepresidente', name: 'Yapura Cinthia Noelia' },
  { position: 'Secretario', name: 'Vargas Pablo Javier' },
  { position: 'Tesorero', name: 'Díaz Carlos Alberto' },
  { position: 'Vocal Titular', name: 'Paz Luis Esteban Ezequiel' },
  { position: 'Vocal Titular', name: 'Tognini Carlos Daniel' },
  { position: 'Vocal Titular', name: 'Palavecino Martín Antonio' }
];

const commitments = [
  'Transparencia en el uso de los recursos',
  'Educación como motor de inclusión',
  'Trabajo junto a la comunidad antoniana'
];

const About = () => {
  const reduceMotion = useReducedMotion();

  const rise = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
      };

  const inView = (props = {}) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-80px' },
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          ...props,
        };

  return (
    <div className="min-h-screen bg-brand-sand">
      <Helmet>
        <title>Quiénes somos - Fundación Evolución Antoniana</title>
        <meta name="description" content="Conocé la misión, los valores y el equipo de la Fundación Evolución Antoniana." />
        <link rel="canonical" href="https://www.evolucionantoniana.com/about" />
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
        <motion.div
          {...rise}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
        >
          <div className="mb-6">
            <Eyebrow light>Institucional</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
            Sobre nuestra fundación
          </h1>
          <p className="max-w-[36rem] text-lg leading-relaxed text-white/75">
            Conocé nuestra historia, misión y el equipo comprometido que trabaja
            día a día por el desarrollo social, educativo, deportivo y
            tecnológico de nuestra comunidad.
          </p>
        </motion.div>
      </section>

      {/* ============ HISTORIA ============ */}
      <section className="bg-brand-sand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto Historia */}
            <motion.div {...inView()}>
              <div className="mb-5">
                <Eyebrow>Nuestra historia</Eyebrow>
              </div>
              <h2 className="font-poppins font-bold text-3xl lg:text-[2.4rem] leading-tight tracking-tight text-brand-dark text-balance mb-8">
                Un camino que empezó en Salta
              </h2>

              <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                <p>
                  La <strong className="text-brand-primary">Fundación Evolución Antoniana</strong> nació en Salta en 2020, fruto de la visión de un grupo de profesionales decididos a transformar la realidad social y deportiva de la región.
                </p>
                <p>
                  Desde nuestra constitución legal en 2022, hemos consolidado un modelo de gestión que une <span className="font-medium text-brand-dark">tradición y modernidad</span>. Promovemos la educación, el deporte y la innovación tecnológica como motores de cambio real.
                </p>
                <p>
                  Hemos impulsado acciones solidarias en comedores, hogares de ancianos y clubes barriales. Articulamos con el sector público y privado para llevar herramientas concretas donde más se necesitan.
                </p>
                <p className="font-medium text-brand-dark border-l-2 border-brand-gold pl-4 italic">
                  "Hoy crecemos mediante alianzas estratégicas y plataformas tecnológicas propias, construyendo una sociedad más justa y preparada para el futuro."
                </p>
              </div>
            </motion.div>

            {/* Imagen Historia (marco offset, como en la Home) */}
            <motion.div {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : 0.1 } })}>
              <div className="relative mr-3 mb-3 lg:mr-4 lg:mb-4">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-3 translate-y-3 lg:translate-x-4 lg:translate-y-4 border border-brand-gold/50 rounded-sm"
                />
                <img
                  className="relative w-full h-[420px] lg:h-[500px] object-cover rounded-sm"
                  alt="Equipo de la fundación trabajando"
                  src="/img/hogar_abuelos.png"
                />
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-gold flex-shrink-0" />
                Compromiso en territorio
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ MISIÓN Y VISIÓN ============ */}
      <section className="bg-brand-white border-t border-brand-dark/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div {...inView()} className="max-w-2xl mb-12 lg:mb-14">
            <div className="mb-5">
              <Eyebrow>Misión y visión</Eyebrow>
            </div>
            <h2 className="font-poppins font-bold text-3xl lg:text-[2.4rem] leading-tight tracking-tight text-brand-dark text-balance">
              Hacia dónde vamos y por qué
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
            <motion.article {...inView()} className="border-t border-brand-dark/20 pt-6">
              <Target aria-hidden="true" className="w-5 h-5 text-brand-gold mb-5" strokeWidth={1.75} />
              <h3 className="font-poppins font-semibold text-xl text-brand-dark mb-3">
                Nuestra misión
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Impulsar el desarrollo integral de jóvenes y comunidades a través de la educación, el deporte, la tecnología y la innovación social. Generamos oportunidades concretas que transforman vidas y contribuyen al progreso sostenible del norte argentino.
              </p>
            </motion.article>

            <motion.article
              {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : 0.1 } })}
              className="border-t border-brand-dark/20 pt-6"
            >
              <Eye aria-hidden="true" className="w-5 h-5 text-brand-gold mb-5" strokeWidth={1.75} />
              <h3 className="font-poppins font-semibold text-xl text-brand-dark mb-3">
                Nuestra visión
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Ser referentes en Argentina por el impacto de nuestros programas. Aspiramos a construir comunidades más inclusivas, modernas y equitativas, liderando la transformación digital en el ámbito social y deportivo.
              </p>
            </motion.article>
          </div>
        </div>
      </section>

      {/* ============ FUNDADORES Y AUTORIDADES ============ */}
      <section className="bg-brand-sand border-t border-brand-dark/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div {...inView()} className="max-w-2xl mb-12 lg:mb-14">
            <div className="mb-5">
              <Eyebrow>Equipo</Eyebrow>
            </div>
            <h2 className="font-poppins font-bold text-3xl lg:text-[2.4rem] leading-tight tracking-tight text-brand-dark text-balance mb-4">
              Liderazgo institucional
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              El equipo humano que impulsa nuestra visión y garantiza la transparencia en cada paso.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Fundadores */}
            <div>
              <div className="mb-5">
                <Eyebrow>Fundadores</Eyebrow>
              </div>
              <div className="space-y-6">
                {founders.map((founder, index) => (
                  <motion.article
                    key={founder.name}
                    {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : index * 0.08 } })}
                    className="bg-white border border-brand-dark/10 rounded-sm overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-32 sm:h-auto h-48 w-full relative bg-brand-sand flex-shrink-0">
                        {founder.image ? (
                          <img src={founder.image} alt={founder.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white text-2xl font-bold">
                            {founder.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-6">
                        <h3 className="font-poppins font-semibold text-xl text-brand-dark">
                          {founder.name}
                        </h3>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-action mb-3">
                          {founder.role}
                        </p>
                        <p className="text-gray-600 text-sm leading-relaxed">{founder.description}</p>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>

            {/* Comisión Directiva */}
            <motion.div {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : 0.1 } })}>
              <div className="mb-5">
                <Eyebrow>Comisión directiva</Eyebrow>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Autoridades vigentes (Dirección General de Personas Jurídicas - Salta).
              </p>
              <ul>
                {authorities.map((item, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-baseline gap-4 border-t border-brand-dark/20 py-4 last:border-b"
                  >
                    <span className="text-sm font-semibold text-gray-600">{item.position}</span>
                    <span className="font-poppins font-semibold text-brand-dark text-right">
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ VALORES ============ */}
      <section className="bg-brand-white border-t border-brand-dark/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div {...inView()} className="max-w-2xl mb-12 lg:mb-14">
            <div className="mb-5">
              <Eyebrow>Nuestros valores</Eyebrow>
            </div>
            <h2 className="font-poppins font-bold text-3xl lg:text-[2.4rem] leading-tight tracking-tight text-brand-dark text-balance mb-4">
              Principios que guían cada acción
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Principios innegociables que definen nuestra identidad y guían cada acción.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
            {values.map((value, index) => (
              <motion.article
                key={value.title}
                {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : index * 0.05 } })}
                className="border-t border-brand-dark/20 pt-6"
              >
                <value.icon aria-hidden="true" className="w-5 h-5 text-brand-gold mb-5" strokeWidth={1.75} />
                <h3 className="font-poppins font-semibold text-lg text-brand-dark mb-3">
                  {value.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMPROMISOS ============ */}
      <section className="relative bg-brand-dark text-white overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <motion.div {...inView()} className="max-w-2xl mb-12">
            <div className="mb-5">
              <Eyebrow light>Compromisos</Eyebrow>
            </div>
            <h2 className="font-poppins font-bold text-3xl lg:text-[2.4rem] leading-tight tracking-tight text-white text-balance mb-4">
              Nuestros compromisos
            </h2>
            <p className="text-white/70 leading-relaxed">Lo que sostenemos en cada proyecto.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-10">
            {commitments.map((item, i) => (
              <motion.article
                key={item}
                {...inView({ transition: { duration: 0.6, delay: reduceMotion ? 0 : i * 0.08 } })}
                className="border-t border-white/20 pt-6"
              >
                <Award aria-hidden="true" className="w-5 h-5 text-brand-gold mb-5" strokeWidth={1.75} />
                <h3 className="font-poppins font-semibold text-lg text-white">{item}</h3>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
