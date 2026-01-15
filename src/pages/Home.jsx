// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heart, Users, BookOpen, Award, ArrowRight, CheckCircle2} from "lucide-react";
import { motion } from "framer-motion";

const Home = () => {
  const features = [
    {
      icon: Heart,
      title: "Compromiso Social",
      description:
        "Trabajamos por el desarrollo integral de nuestra comunidad con pasión y dedicación.",
    },
    {
      icon: Users,
      title: "Trabajo en Equipo",
      description:
        "Fomentamos la colaboración y el trabajo conjunto para lograr objetivos comunes.",
    },
    {
      icon: BookOpen,
      title: "Educación Continua",
      description:
        "Ofrecemos talleres, cursos y actividades formativas para el crecimiento personal.",
    },
    {
      icon: Award,
      title: "Excelencia",
      description:
        "Servicios de calidad con impacto medible y gestión moderna.",
    },
  ];

  const stats = [
    {
      number: "305+",
      label: "Almas Impactadas",
      desc: "Beneficiarios directos de programas.",
    },
    {
      number: "7+",
      label: "Proyectos Activos",
      desc: "Iniciativas tecnológicas y sociales.",
    },
    {
      number: "6+",
      label: "Años de Trayectoria",
      desc: "Experiencia en gestión de impacto.",
    },
    {
      number: "4+",
      label: "Reconocimientos",
      desc: "Premios a la innovación social.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-blanco-fundacion dark:bg-background"
    >
      {/* Hero Section */}
      <section className="relative bg-azul-profundo dark:bg-primary-antoniano/90 text-white overflow-hidden">
        <div className="absolute inset-0 hero-pattern opacity-30 dark:opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-7xl font-bold font-poppins text-white leading-[1.1]">
                Construyendo un{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-yellow-200">
                  Futuro Mejor
                </span>
              </h1>
              <p className="text-lg text-white/80 dark:text-foreground/80 mb-8 leading-relaxed text-balance">
                Somos una organización sin fines de lucro enfocada en el
                desarrollo social, educativo, deportivo y tecnológico.
                <br />
                <br />
                Impulsamos iniciativas que combinan el compromiso comunitario
                con la innovación digital, creando oportunidades reales para
                transformar vidas.
                <br />
                <br />
                También formamos parte del programa Mercado Libre Solidario, y
                trabajamos con principios de transparencia, impacto medible y
                gestión moderna.
                <br />
                <br />
                Unite a nuestra misión y se parte del cambio.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-celeste-complementario text-azul-profundo dark:bg-primary dark:text-primary-foreground font-bold hover:bg-white dark:hover:bg-primary/80"
                  asChild
                >
                  <Link to="/activities">
                    Ver Actividades
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                {/* FIX: botón outline visible en reposo */}
                <Button
                  size="lg"
                  variant="outline"
                  className="
                    border-white/50 text-white
                    bg-transparent
                    hover:bg-white hover:text-azul-profundo
                    dark:border-primary/50 dark:text-primary
                    dark:hover:bg-primary dark:hover:text-primary-foreground
                    transition-all duration-300 font-semibold
                  "
                  asChild
                >
                  <Link to="/contact">Contáctanos</Link>
                </Button>
              </div>

              {/* Alianzas Estratégicas - Nivel Institucional */}
<div className="pt-10 border-t border-white/10">
  <p className="text-[10px] text-brand-gold/90 mb-6 uppercase tracking-[0.3em] font-black">
    En alianza estratégica con
  </p>
  
  <div className="flex flex-wrap gap-x-8 gap-y-6 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700 items-center">
    {/* Google */}
    <div className="flex flex-col">
      <span className="text-white font-bold text-xl tracking-tight leading-none">Google</span>
      <span className="text-[8px] text-brand-gold font-bold uppercase tracking-[0.1em]">for NonProfits</span>
    </div>

    {/* Canva */}
    <div className="flex flex-col">
    <span className="text-white font-bold text-xl tracking-tight leading-none">Canva</span>
    <span className="text-[8px] text-brand-gold font-bold uppercase tracking-[0.1em]">for NonProfits</span>
    </div>

    {/* Mercado Libre */}
    <div className="flex flex-col">
      <span className="text-white font-bold text-xl tracking-tight leading-none">MercadoLibre</span>
      <span className="text-[8px] text-brand-gold font-bold uppercase tracking-[0.1em]">Solidario</span>
    </div>

    {/* Ministerio de Educación */}
    <div className="h-8 w-px bg-white/8 hidden md:block"></div> {/* Separador elegante */}
    
    <div className="flex flex-col">
      <span className="text-white font-bold text-xl tracking-tight leading-none">
        Ministerio de Educación
      </span>
      <span className="text-brand-gold font-bold text-[8px] uppercase tracking-widest">
        Provincia de Salta
      </span>
    </div>

        <div className="flex flex-col">
      <span className="text-white font-bold text-xl tracking-tight leading-none">
        UBA
      </span>
      <span className="text-brand-gold font-bold text-[8px] uppercase tracking-widest">
        Ciencias Economicas
      </span>
    </div>

  </div>
</div>
            </motion.div>

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
              </div>
              <div className="absolute -top-4 -right-4 w-full h-full bg-celeste-complementario/20 dark:bg-primary/20 rounded-2xl opacity-20 transform -rotate-3" />
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
              Principios que fusionan la tradición franciscana con la innovación
              moderna.
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
              ¿Listo para ser parte de la{" "}
              <span className="text-brand-gold">Evolución</span>?
            </h2>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed">
              Únete a nuestra comunidad. Accede a beneficios exclusivos de
              nuestros partners y contribuye al desarrollo tecnológico de Salta.
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
