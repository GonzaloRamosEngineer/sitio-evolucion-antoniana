import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Heart,
  Target,
  Eye,
  Users,
  Award,
  BookOpen,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const values = [
  {
    icon: Heart,
    title: 'Compromiso',
    description:
      'Actuamos con responsabilidad, dedicación y presencia real en el territorio, acompañando procesos y no solo proyectos puntuales.'
  },
  {
    icon: ShieldCheck,
    title: 'Integridad y Transparencia',
    description:
      'Gestionamos recursos y decisiones con ética, claridad y rendición de cuentas, fortaleciendo la confianza de la comunidad y de nuestros aliados.'
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
    title: 'Trabajo en Comunidad',
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
      'Ingeniero en Sistemas, gestor digital e impulsor de la transformación institucional y tecnológica de la Fundación.',
    image: '/img/fundadores/gonzalo_ramos.jpg' // ajustá o eliminá si aún no tenés foto
  },
  {
    name: 'Juan Carlos Palavecino',
    role: 'Fundador',
    description:
      'Referente institucional y cofundador, comprometido con el desarrollo social, educativo y deportivo de la comunidad.',
    image: '/img/fundadores/juan_carlos_palavecino.jpg'
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

const About = () => {
  return (
    <div className="min-h-screen bg-blanco-fundacion">
      {/* HERO */}
      <section className="py-20 md:py-28 text-center bg-gradient-to-b from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion hero-pattern">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-4xl md:text-5xl lg:text-6xl font-poppins font-extrabold text-primary-antoniano mb-6 text-balance"
          >
            Sobre Nuestra Fundación
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="text-lg md:text-xl text-marron-legado/90 max-w-3xl mx-auto leading-relaxed text-balance"
          >
            Conoce nuestra historia, misión y el equipo comprometido que trabaja día a día por el desarrollo
            social, educativo, deportivo y tecnológico de nuestra comunidad.
          </motion.p>
        </div>
      </section>

      {/* HISTORIA */}
      <section className="py-16 md:py-20 bg-blanco-fundacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <h2 className="text-3xl font-poppins font-bold text-primary-antoniano mb-6">Nuestra Historia</h2>
              <div className="space-y-4 text-marron-legado/80 leading-relaxed">
                <p>
                  La <span className="font-semibold">Fundación Evolución Antoniana</span> es una organización sin
                  fines de lucro fundada en Salta en el año 2020, a partir de la iniciativa de un grupo de
                  profesionales comprometidos con la realidad social, educativa y deportiva de la región.
                </p>
                <p>
                  Desde nuestra constitución legal en 2022, consolidamos nuestra labor promoviendo la educación, el
                  deporte, la innovación tecnológica y el acompañamiento social como motores de transformación
                  durable para jóvenes, familias y comunidades.
                </p>
                <p>
                  A lo largo de estos años hemos impulsado acciones solidarias en barrios, comedores y hogares de la
                  tercera edad; desarrollamos actividades formativas accesibles para distintas edades y articulamos
                  con instituciones públicas y privadas para acercar herramientas concretas que amplíen las
                  oportunidades de desarrollo.
                </p>
                <p>
                  Hoy continuamos creciendo mediante alianzas estratégicas, proyectos de impacto y plataformas
                  tecnológicas propias, con el objetivo de contribuir a una sociedad más justa, inclusiva, moderna y
                  preparada para los desafíos del futuro.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative"
            >
              <img
                className="rounded-2xl shadow-xl w-full h-96 object-cover"
                alt="Reunión del equipo de la fundación planificando proyectos comunitarios"
                src="/img/hogar_abuelos.png"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* MISIÓN Y VISIÓN */}
      <section className="py-16 md:py-20 bg-celeste-complementario/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <Card className="h-full border-primary-antoniano/20 shadow-lg bg-blanco-fundacion">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-antoniano to-celeste-complementario rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-primary-antoniano font-poppins">Nuestra Misión</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-marron-legado/80 text-center leading-relaxed">
                    Impulsar el desarrollo integral de jóvenes y comunidades a través de la educación, el deporte,
                    la tecnología y la innovación social, generando oportunidades concretas que transformen vidas y
                    contribuyan al progreso sostenible de Salta y el norte argentino.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            >
              <Card className="h-full border-primary-antoniano/20 shadow-lg bg-blanco-fundacion">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-marron-legado to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-primary-antoniano font-poppins">Nuestra Visión</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-marron-legado/80 text-center leading-relaxed">
                    Ser una organización referente en Argentina y Latinoamérica por el impacto de nuestros programas
                    educativos, deportivos y tecnológicos, construyendo comunidades más inclusivas, modernas,
                    equitativas y preparadas para los desafíos del futuro.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FUNDADORES Y AUTORIDADES */}
      <section className="py-16 md:py-20 bg-blanco-fundacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-primary-antoniano mb-4">
              Fundadores y Autoridades
            </h2>
            <p className="text-xl text-marron-legado/80 max-w-3xl mx-auto leading-relaxed">
              Personas que lideran, impulsan y sostienen la misión de la Fundación Evolución Antoniana.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Fundadores */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <h3 className="text-2xl font-poppins font-semibold text-primary-antoniano mb-4">Fundadores</h3>
              <div className="space-y-6">
                {founders.map((founder) => (
                  <Card
                    key={founder.name}
                    className="border-celeste-complementario/30 shadow-md bg-white flex flex-col sm:flex-row gap-4 items-center sm:items-start"
                  >
                    {founder.image ? (
                      <div className="p-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary-antoniano/40">
                          <img
                            src={founder.image}
                            alt={founder.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : null}
                    <CardContent className="pt-4 sm:pt-6">
                      <CardTitle className="text-lg font-poppins text-primary-antoniano">
                        {founder.name}
                      </CardTitle>
                      <p className="text-sm font-semibold text-celeste-complementario mt-1">
                        {founder.role}
                      </p>
                      <CardDescription className="text-marron-legado/80 mt-2 leading-relaxed">
                        {founder.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Autoridades */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <h3 className="text-2xl font-poppins font-semibold text-primary-antoniano mb-4">
                Comisión Directiva
              </h3>
              <Card className="border-primary-antoniano/20 shadow-md bg-white">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {authorities.map((item) => (
                      <li
                        key={item.position + item.name}
                        className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-b-0"
                      >
                        <span className="font-semibold text-marron-legado/90">
                          {item.position}
                        </span>
                        <span className="text-marron-legado/90 text-right">{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <p className="text-sm text-marron-legado/70 mt-3">
                Información según registro oficial ante la Dirección General de Personas Jurídicas de la
                provincia de Salta.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section className="py-16 md:py-20 bg-blanco-fundacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-primary-antoniano mb-4">
              Nuestros Valores
            </h2>
            <p className="text-xl text-marron-legado/80 max-w-3xl mx-auto leading-relaxed">
              Los principios fundamentales que guían nuestro trabajo y definen nuestra identidad como
              organización.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.08, ease: 'easeOut' }}
              >
                <Card className="h-full text-center card-hover border-celeste-complementario/30 shadow-lg bg-white hover:bg-celeste-complementario/5 transition-colors">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-antoniano to-celeste-complementario rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                      <value.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl text-primary-antoniano font-poppins">
                      {value.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-marron-legado/80 leading-relaxed">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RECONOCIMIENTOS */}
      <section className="py-16 md:py-20 bg-blanco-fundacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-primary-antoniano mb-4">
              Reconocimientos
            </h2>
            <p className="text-xl text-marron-legado/80 max-w-3xl mx-auto leading-relaxed">
              Nuestro trabajo ha sido acompañado y valorado por diversas instituciones y organizaciones a nivel
              provincial y nacional.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center p-6 bg-celeste-complementario/10 rounded-xl shadow-md"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-poppins font-semibold text-primary-antoniano mb-2">
                Postulación Impacto Social 2022
              </h3>
              <p className="text-marron-legado/80 leading-relaxed">
                Reconocimiento por nuestro trabajo en desarrollo comunitario y acompañamiento territorial.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="text-center p-6 bg-celeste-complementario/10 rounded-xl shadow-md"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary-antoniano to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-poppins font-semibold text-primary-antoniano mb-2">
                Certificación de Transparencia
              </h3>
              <p className="text-marron-legado/80 leading-relaxed">
                Acreditación en buenas prácticas de gestión, administración responsable y rendición de cuentas.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="text-center p-6 bg-celeste-complementario/10 rounded-xl shadow-md"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-poppins font-semibold text-primary-antoniano mb-2">
                Mención en Educación Digital
              </h3>
              <p className="text-marron-legado/80 leading-relaxed">
                Destacados por nuestros programas de educación y alfabetización digital con enfoque social.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
