import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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

const About = () => {
  return (
    <div className="min-h-screen bg-brand-sand font-sans selection:bg-brand-gold/30">
      
      {/* --- HERO SECTION (Tech-Institucional) --- */}
      <section className="relative bg-brand-primary overflow-hidden py-24 md:py-32 px-4">
        {/* Fondo Tech Sutil */}
        <div className="absolute inset-0">
           <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
           <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
           </div>
        </div>

        <div className="relative max-w-5xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-6">
               <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Institucional</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-poppins font-bold text-white mb-6 leading-tight">
              Sobre Nuestra <span className="text-brand-gold">Fundación</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              Conoce nuestra historia, misión y el equipo comprometido que trabaja día a día por el desarrollo social, educativo, deportivo y tecnológico de nuestra comunidad.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- HISTORIA --- */}
      <section className="py-20 bg-brand-sand relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Texto Historia */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-brand-dark mb-8 relative inline-block">
                Nuestra Historia
                <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-brand-gold rounded-full"></span>
              </h2>
              
              <div className="space-y-6 text-gray-600 text-lg leading-relaxed text-justify">
                <p>
                  La <strong className="text-brand-primary">Fundación Evolución Antoniana</strong> nació en Salta en 2020, fruto de la visión de un grupo de profesionales decididos a transformar la realidad social y deportiva de la región.
                </p>
                <p>
                  Desde nuestra constitución legal en 2022, hemos consolidado un modelo de gestión que une <span className="bg-brand-gold/10 px-1 rounded text-brand-dark font-medium">tradición y modernidad</span>. Promovemos la educación, el deporte y la innovación tecnológica como motores de cambio real.
                </p>
                <p>
                  Hemos impulsado acciones solidarias en comedores, hogares de ancianos y clubes barriales. Articulamos con el sector público y privado para llevar herramientas concretas donde más se necesitan.
                </p>
                <p className="font-medium text-brand-dark border-l-4 border-brand-action pl-4 italic">
                  "Hoy crecemos mediante alianzas estratégicas y plataformas tecnológicas propias, construyendo una sociedad más justa y preparada para el futuro."
                </p>
              </div>
            </motion.div>

            {/* Imagen Historia */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-brand-gold/20 rounded-3xl transform rotate-3 group-hover:rotate-6 transition-transform duration-500"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                <img
                  className="w-full h-[500px] object-cover filter brightness-95 hover:brightness-105 transition-all duration-500"
                  alt="Equipo de la fundación trabajando"
                  src="/img/hogar_abuelos.png"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-dark/90 to-transparent p-8">
                    <p className="text-white font-medium flex items-center gap-2">
                        <CheckCircle2 className="text-brand-gold h-5 w-5" />
                        Compromiso en territorio
                    </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- MISIÓN Y VISIÓN (Cards Modernas) --- */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Misión */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-brand-sand rounded-3xl p-8 md:p-12 border border-brand-primary/5 hover:border-brand-primary/20 transition-colors relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-brand-primary/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-primary/20">
                        <Target className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-3xl font-poppins font-bold text-brand-dark mb-4">Nuestra Misión</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Impulsar el desarrollo integral de jóvenes y comunidades a través de la educación, el deporte, la tecnología y la innovación social. Generamos oportunidades concretas que transforman vidas y contribuyen al progreso sostenible del norte argentino.
                    </p>
                </div>
            </motion.div>

            {/* Visión */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-brand-dark rounded-3xl p-8 md:p-12 text-white relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-hero-glow opacity-50"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Eye className="w-32 h-32" />
                </div>
                
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-brand-gold rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-gold/20">
                        <Eye className="w-8 h-8 text-brand-dark" />
                    </div>
                    <h3 className="text-3xl font-poppins font-bold mb-4 text-white">Nuestra Visión</h3>
                    <p className="text-gray-300 leading-relaxed text-lg">
                        Ser referentes en Argentina por el impacto de nuestros programas. Aspiramos a construir comunidades más inclusivas, modernas y equitativas, liderando la transformación digital en el ámbito social y deportivo.
                    </p>
                </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FUNDADORES Y AUTORIDADES --- */}
      <section className="py-24 bg-brand-sand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-brand-dark mb-4">
              Liderazgo Institucional
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
               El equipo humano que impulsa nuestra visión y garantiza la transparencia en cada paso.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Columna Izquierda: Fundadores */}
            <div className="space-y-8">
                <h3 className="text-2xl font-poppins font-bold text-brand-primary border-l-4 border-brand-gold pl-4">
                    Fundadores
                </h3>
                <div className="grid gap-6">
                    {founders.map((founder, index) => (
                        <motion.div
                            key={founder.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="sm:w-32 sm:h-auto h-48 w-full relative bg-gray-200">
                                        {founder.image ? (
                                            <img src={founder.image} alt={founder.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white text-2xl font-bold">
                                                {founder.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 p-6">
                                        <h4 className="text-xl font-bold text-brand-dark">{founder.name}</h4>
                                        <p className="text-sm font-bold text-brand-gold uppercase tracking-wide mb-3">{founder.role}</p>
                                        <p className="text-gray-600 text-sm leading-relaxed">{founder.description}</p>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Columna Derecha: Comisión Directiva */}
            <div className="space-y-8">
                <h3 className="text-2xl font-poppins font-bold text-brand-primary border-l-4 border-brand-gold pl-4">
                    Comisión Directiva
                </h3>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <Card className="border-none shadow-lg bg-white overflow-hidden">
                        <div className="bg-brand-dark p-4">
                            <p className="text-white/80 text-sm text-center">
                                Autoridades vigentes (Dirección General de Personas Jurídicas - Salta)
                            </p>
                        </div>
                        <CardContent className="p-0">
                            {authorities.map((item, i) => (
                                <div 
                                    key={i} 
                                    className="flex justify-between items-center p-4 border-b border-gray-100 last:border-0 hover:bg-brand-sand/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-brand-gold"></div>
                                        <span className="font-semibold text-gray-700">{item.position}</span>
                                    </div>
                                    <span className="text-brand-dark font-bold text-right">{item.name}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* --- VALORES (Bento Grid Style) --- */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-brand-dark mb-4">
              Nuestros Valores
            </h2>
            <div className="w-20 h-1 bg-brand-gold mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
               Principios innegociables que definen nuestra identidad y guían cada acción.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="h-full bg-brand-sand rounded-2xl p-8 hover:bg-white hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-transparent hover:border-brand-primary/10 group">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-brand-primary group-hover:text-white transition-colors text-brand-primary">
                    <value.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-brand-dark mb-3 group-hover:text-brand-action transition-colors">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- RECONOCIMIENTOS --- */}
      <section className="py-20 bg-brand-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-poppins font-bold mb-4">Reconocimientos</h2>
            <p className="text-gray-400">Nuestro impacto validado por la comunidad.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {['Postulación Impacto Social 2022', 'Certificación de Transparencia', 'Mención en Educación Digital'].map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className="bg-brand-primary/30 backdrop-blur-sm border border-white/10 p-6 rounded-xl flex flex-col items-center text-center hover:bg-brand-primary/50 transition-colors"
                >
                    <Award className="w-10 h-10 text-brand-gold mb-4" />
                    <h3 className="font-bold text-lg mb-2">{item}</h3>
                    <div className="w-8 h-1 bg-brand-action rounded-full mt-2"></div>
                </motion.div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;