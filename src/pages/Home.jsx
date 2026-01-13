// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Users, BookOpen, Award, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const features = [
    {
      icon: Heart,
      title: 'Compromiso Social',
      description: 'Desarrollo integral de nuestra comunidad con pasión y dedicación franciscana.',
    },
    {
      icon: Users,
      title: 'Trabajo en Equipo',
      description: 'Fomentamos la colaboración sinérgica para lograr objetivos comunes.',
    },
    {
      icon: BookOpen,
      title: 'Educación Continua',
      description: 'Talleres y capacitación tecnológica para el crecimiento real.',
    },
    {
      icon: Award,
      title: 'Excelencia',
      description: 'Servicios de calidad con impacto medible y gestión moderna.',
    },
  ];

  const stats = [
    { number: '305+', label: 'Almas Impactadas', desc: 'Beneficiarios directos de programas.' },
    { number: '7+', label: 'Proyectos Activos', desc: 'Iniciativas tecnológicas y sociales.' },
    { number: '6+', label: 'Años de Trayectoria', desc: 'Experiencia en gestión de impacto.' },
    { number: '4+', label: 'Reconocimientos', desc: 'Premios a la innovación social.' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-brand-sand min-h-screen font-sans selection:bg-brand-gold/30"
    >
      {/* --- HERO SECTION MODERNIZADO --- */}
      <section className="relative bg-brand-primary overflow-hidden">
        {/* Fondo Tech Sutil */}
        <div className="absolute inset-0">
           <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
           <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
           </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Texto Hero */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-brand-gold animate-pulse"></span>
                <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Evolución Antoniana 2024</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold font-poppins text-white leading-[1.1]">
                Futuro <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-yellow-200">
                  Inteligente.
                </span>
              </h1>
              
              <p className="text-lg text-gray-200 max-w-xl leading-relaxed">
                Transformamos la pasión deportiva en desarrollo social. Impulsamos la innovación tecnológica y administrativa en Salta, creando oportunidades reales con transparencia y gestión moderna.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  size="xl"
                  className="h-14 px-8 bg-brand-action hover:bg-red-900 text-white font-bold rounded-xl shadow-lg shadow-brand-action/20 hover:shadow-brand-action/40 transition-all duration-300 text-lg group"
                  asChild
                >
                  <Link to="/activities">
                    Ver Actividades
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>

                <Button
                  size="xl"
                  variant="outline"
                  className="h-14 px-8 border-white/20 text-white bg-white/5 hover:bg-white/10 hover:text-white backdrop-blur-sm font-semibold rounded-xl transition-all duration-300 text-lg"
                  asChild
                >
                  <Link to="/contact">Contáctanos</Link>
                </Button>
              </div>

              {/* Alianzas Mini */}
              <div className="pt-8 border-t border-white/10">
                <p className="text-xs text-brand-gold/80 mb-4 uppercase tracking-wider font-semibold">En alianza estratégica con</p>
                <div className="flex gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 items-center">
                   {/* Textos placeholders - Reemplazar con logos SVG reales luego */}
                   <span className="text-white font-bold text-lg">Google</span>
                   <span className="text-white font-bold text-lg">Canva</span>
                   <span className="text-white font-bold text-xs uppercase">Min. Educación Salta</span>
                </div>
              </div>
            </motion.div>

            {/* Imagen Hero con efecto Glass */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                <div className="absolute inset-0 bg-brand-primary/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                <img
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                  src="/img/donativo_cancha.png"
                  alt="Impacto Social"
                />
                
                {/* Tarjeta Flotante "Datos en vivo" */}
                <div className="absolute bottom-8 left-8 right-8 bg-brand-dark/90 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-xl z-20">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                        <p className="text-brand-gold text-xs font-bold uppercase mb-1">Impacto Actual</p>
                        <h3 className="text-white font-bold text-xl">Campaña Solidaria 2024</h3>
                     </div>
                     <div className="bg-green-500/20 p-2 rounded-full">
                        <Zap className="w-5 h-5 text-green-400" />
                     </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div className="bg-brand-action h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Progreso</span>
                    <span>75% Completado</span>
                  </div>
                </div>
              </div>
              {/* Elemento decorativo detrás */}
              <div className="absolute -top-6 -right-6 w-full h-full border-2 border-brand-gold/30 rounded-2xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- STATS SECTION (Bento Style Light) --- */}
      <section className="py-20 bg-brand-white relative z-10 -mt-8 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center group p-6 hover:bg-brand-sand rounded-2xl transition-colors duration-300"
              >
                <div className="text-4xl lg:text-5xl font-extrabold font-poppins text-brand-primary mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="text-brand-action font-bold text-sm uppercase tracking-wide mb-2">
                  {stat.label}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {stat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- VALUES SECTION --- */}
      <section className="py-24 bg-brand-sand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold font-poppins text-brand-dark mb-4">
              Nuestros Pilares
            </h2>
            <div className="w-20 h-1 bg-brand-gold mx-auto rounded-full mb-6"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Principios que fusionan la tradición franciscana con la innovación moderna.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="h-full"
              >
                <Card className="h-full border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white group hover:-translate-y-2">
                  <CardHeader className="text-center pt-8">
                    <div className="w-14 h-14 bg-brand-sand rounded-2xl rotate-3 flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 group-hover:bg-brand-primary transition-all duration-300">
                      <feature.icon className="w-7 h-7 text-brand-primary group-hover:text-brand-gold transition-colors" />
                    </div>
                    <CardTitle className="text-lg font-bold text-brand-dark">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pb-8">
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 bg-brand-dark relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-primary rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-brand-action rounded-full blur-3xl opacity-20"></div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold font-poppins text-white mb-8">
              ¿Listo para ser parte de la <span className="text-brand-gold">Evolución</span>?
            </h2>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed">
              Únete a nuestra comunidad. Accede a beneficios exclusivos de nuestros partners y contribuye al desarrollo tecnológico de Salta.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="h-14 px-10 bg-brand-gold text-brand-dark font-bold hover:bg-yellow-400 rounded-full text-lg shadow-lg hover:shadow-yellow-400/20 transition-all"
                asChild
              >
                <Link to="/collaborate">
                  <Heart className="mr-2 h-5 w-5 fill-brand-dark" />
                  Quiero Colaborar
                </Link>
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-4 sm:mt-0">
                 <CheckCircle2 className="w-4 h-4 text-green-500" />
                 <span>Transparencia Garantizada</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;