// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Heart, Users, BookOpen, Award, ArrowRight, 
  CheckCircle2, Star, Sparkles, ShieldCheck 
} from "lucide-react";
import { motion } from "framer-motion";

const Home = () => {
  const features = [
    {
      icon: Heart,
      title: "Compromiso Social",
      description: "Trabajamos por el desarrollo integral de nuestra comunidad con pasión y dedicación.",
    },
    {
      icon: Users,
      title: "Trabajo en Equipo",
      description: "Fomentamos la colaboración y el trabajo conjunto para lograr objetivos comunes.",
    },
    {
      icon: BookOpen,
      title: "Educación Continua",
      description: "Ofrecemos talleres, cursos y actividades formativas para el crecimiento personal.",
    },
    {
      icon: Award,
      title: "Excelencia",
      description: "Servicios de calidad con impacto medible y gestión moderna.",
    },
  ];

  const stats = [
    { number: "305+", label: "Almas Impactadas", desc: "Beneficiarios directos." },
    { number: "7+", label: "Proyectos Activos", desc: "Innovación social." },
    { number: "6+", label: "Años de Trayectoria", desc: "Gestión de impacto." },
    { number: "4+", label: "Reconocimientos", desc: "Premios nacionales." },
  ];

  // Variantes de animación Premium
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-white dark:bg-background overflow-hidden"
    >
      {/* --- HERO SECTION INMERSIVO --- */}
      <section className="relative min-h-[95vh] flex items-center justify-center bg-brand-dark overflow-hidden">
        
        {/* Fondo Animado (Mesh Gradient) */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-brand-primary/20 blur-[130px]"
          />
          <motion.div 
            animate={{ scale: [1.2, 1, 1.2], x: [0, -80, 0], y: [0, -40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-brand-gold/10 blur-[100px]"
          />
        </div>

        {/* Textura de grano sutil */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="relative max-w-7xl mx-auto px-6 z-10 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Badge Superior */}
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
                <Sparkles size={14} className="text-brand-gold" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-sand">Fundación Antoniana</span>
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-6xl lg:text-[5.5rem] font-black font-poppins text-white leading-[0.9] tracking-tighter mb-8">
                Construyendo un <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-sand via-brand-gold to-brand-sand">
                  Futuro Mejor
                </span>
              </motion.h1>

              <motion.p variants={itemVariants} className="text-xl text-gray-400 font-light leading-relaxed mb-10 max-w-xl italic">
                Impulsamos el desarrollo social y tecnológico en Salta, fusionando compromiso humano con innovación digital.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5">
                <Button size="lg" className="h-16 px-10 rounded-2xl bg-brand-primary hover:bg-white hover:text-brand-dark text-white font-bold text-lg shadow-[0_20px_50px_rgba(30,58,138,0.3)] transition-all duration-500 group" asChild>
                  <Link to="/activities">
                    Ver Actividades
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>

                <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl border-white/20 text-white bg-transparent hover:bg-white/10 backdrop-blur-sm transition-all text-lg font-bold" asChild>
                  <Link to="/contact">Contáctanos</Link>
                </Button>
              </motion.div>

              {/* Alianzas Trust-Bar */}
              <motion.div variants={itemVariants} className="mt-16 pt-8 border-t border-white/10">
                <p className="text-[10px] text-gray-500 mb-6 uppercase tracking-[0.2em] font-black">Nuestros Aliados Estratégicos</p>
                <div className="flex flex-wrap gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700 items-center">
                  <span className="text-white font-bold text-2xl tracking-tighter">Google</span>
                  <span className="text-white font-bold text-2xl tracking-tighter">Canva</span>
                  <div className="h-4 w-[1px] bg-white/20" />
                  <span className="text-white font-black text-[10px] uppercase border border-white/20 px-2 py-1">Min. Educación</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Imagen Hero Decorativa */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 group aspect-[4/5] max-h-[600px]">
                <div className="absolute inset-0 bg-brand-primary/10 group-hover:bg-transparent transition-colors duration-700 z-10" />
                <img
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-[2s]"
                  src="/img/donativo_cancha.png"
                  alt="Impacto Social"
                />
              </div>
              {/* Elemento Flotante de Lujo */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 z-20 border border-gray-100">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Estado Solidario</p>
                  <p className="text-sm font-bold text-brand-dark">Impacto Verificado</p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <div className="w-[1px] h-12 bg-gradient-to-b from-brand-gold to-transparent" />
        </div>
      </section>

      {/* --- STATS SECTION (Estilo Bento Flotante) --- */}
      <section className="relative z-20 -mt-16 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.08)] border border-gray-50 p-10 lg:p-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="text-center space-y-2 border-r last:border-0 border-gray-100 px-4"
              >
                <div className="text-5xl lg:text-6xl font-black font-poppins text-brand-primary tracking-tighter">
                  {stat.number}
                </div>
                <div className="text-brand-gold font-black text-xs uppercase tracking-widest">
                  {stat.label}
                </div>
                <p className="text-gray-400 text-[11px] font-medium leading-tight">
                  {stat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- NUESTROS PILARES (Estilo Luxury Grid) --- */}
      <section className="py-32 bg-brand-sand/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <motion.span 
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              className="text-brand-primary font-black text-xs uppercase tracking-[0.4em] mb-4 block"
            >
              Nuestra esencia
            </motion.span>
            <h2 className="text-4xl lg:text-5xl font-black font-poppins text-brand-dark mb-6">
              Los Pilares de la Evolución
            </h2>
            <p className="text-lg text-gray-500 font-light">
              Principios que fusionan la tradición solidaria con la innovación moderna para crear cambios reales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <Card className="h-full border-none shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 bg-white rounded-[2.5rem] group overflow-hidden">
                  <CardHeader className="pt-10">
                    <div className="w-16 h-16 bg-brand-sand/50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-500 group-hover:rotate-6">
                      <feature.icon className="w-8 h-8 text-brand-primary group-hover:text-white transition-colors" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-10">
                    <p className="text-gray-500 leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA FINAL DE IMPACTO --- */}
      <section className="py-32 bg-brand-dark relative">
        <div className="absolute inset-0 bg-brand-primary/5" />
        
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="bg-brand-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-10 border border-brand-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
                <Star className="text-brand-gold fill-brand-gold" />
            </div>
            
            <h2 className="text-5xl lg:text-7xl font-black font-poppins text-white mb-10 tracking-tighter leading-none">
              ¿Listo para ser parte de la <br />
              <span className="text-brand-gold">Evolución</span>?
            </h2>
            
            <p className="text-xl text-gray-400 font-light mb-12 max-w-2xl mx-auto">
              Únete a nuestra red de impacto. Accede a beneficios exclusivos y contribuye al desarrollo de Salta.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                size="lg"
                className="h-16 px-12 bg-brand-gold text-brand-dark font-black hover:bg-white rounded-2xl text-xl shadow-2xl transition-all duration-500 transform hover:-translate-y-1 active:scale-95"
                asChild
              >
                <Link to="/collaborate">
                  <Heart className="mr-3 h-6 w-6 fill-brand-dark" />
                  QUIERO SUMARME
                </Link>
              </Button>

              <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Transparencia Garantizada</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;