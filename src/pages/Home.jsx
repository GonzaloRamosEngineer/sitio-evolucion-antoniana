// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Users, BookOpen, Award, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const features = [
    {
      icon: Heart,
      title: 'Compromiso Social',
      description:
        'Trabajamos por el desarrollo integral de nuestra comunidad con pasión y dedicación.',
    },
    {
      icon: Users,
      title: 'Trabajo en Equipo',
      description:
        'Fomentamos la colaboración y el trabajo conjunto para lograr objetivos comunes.',
    },
    {
      icon: BookOpen,
      title: 'Educación Continua',
      description:
        'Ofrecemos talleres, cursos y actividades formativas para el crecimiento personal.',
    },
    {
      icon: Award,
      title: 'Excelencia',
      description:
        'Nos esforzamos por brindar servicios de calidad y generar un impacto positivo.',
    },
  ];

  const stats = [
    {
      number: '305+',
      description:
        'Almas alcanzadas que han sido beneficiadas por nuestros programas y servicios, reportando satisfacción con los resultados obtenidos.',
    },
    {
      number: '7+',
      description:
        'Proyectos Realizados iniciativas implementadas para abordar desafíos sociales, tecnológicos y puramente solidarios en nuestras comunidades.',
    },
    {
      number: '6+',
      description:
        'Años de Experiencia acumulada en la implementación de proyectos de impacto social y tecnológico en diversos escenarios.',
    },
    {
      number: '4+',
      description:
        'Reconocimientos obtenidos por nuestro compromiso con el desarrollo sostenible, la innovación social y el impacto comunitario.',
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
              <h1 className="text-4xl lg:text-6xl font-extrabold font-poppins mb-6 leading-tight text-balance">
                Construyendo un
                <span className="text-celeste-complementario dark:text-primary block">
                  Futuro Mejor
                </span>
              </h1>
              <p className="text-lg text-white/80 dark:text-foreground/80 mb-8 leading-relaxed text-balance">
                Somos una organización sin fines de lucro enfocada en el desarrollo social, educativo,
                deportivo y tecnológico.
                <br />
                <br />
                Impulsamos iniciativas que combinan el compromiso comunitario con la innovación
                digital, creando oportunidades reales para transformar vidas.
                <br />
                <br />
                También formamos parte del programa Mercado Libre Solidario, y trabajamos con
                principios de transparencia, impacto medible y gestión moderna.
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10">
                <img
                  className="rounded-2xl shadow-2xl w-full h-96 object-cover"
                  alt="Joven en silla de ruedas sonríe al recibir una camiseta y donaciones"
                  src="/img/donativo_cancha.png"
                />
              </div>
              <div className="absolute -top-4 -right-4 w-full h-full bg-celeste-complementario/20 dark:bg-primary/20 rounded-2xl opacity-20 transform -rotate-3" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-azul-profundo dark:bg-primary-antoniano/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl lg:text-5xl font-extrabold font-poppins text-celeste-complementario dark:text-primary mb-3">
                  {stat.number}
                </div>
                <div className="text-white/80 dark:text-foreground/80 font-medium text-sm leading-relaxed">
                  {stat.description}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-blanco-fundacion dark:bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-extrabold font-poppins text-marron-legado dark:text-foreground mb-4">
              Nuestros Valores
            </h2>
            <p className="text-xl text-marron-legado/80 dark:text-foreground/80 max-w-3xl mx-auto text-balance">
              Los principios que guían nuestro trabajo y nos impulsan a crear un impacto positivo en
              la sociedad.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="h-full flex"
              >
                <Card
                  className="
                    h-full w-full text-center card-hover
                    border-marron-legado/10 dark:border-white/10
                    shadow-lg
                    bg-white dark:bg-[#0f1b27]
                  "
                >
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-antoniano to-azul-profundo rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl text-primary-antoniano dark:text-white">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-marron-legado/90 dark:text-white/80">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-azul-profundo dark:bg-primary-antoniano/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-extrabold font-poppins mb-6 text-balance">
              ¿Listo para ser parte del cambio?
            </h2>
            <p className="text-xl text-white/80 dark:text-foreground/80 mb-8 max-w-3xl mx-auto text-balance">
              Únete a nuestra comunidad y accede a beneficios exclusivos, descuentos en actividades y
              la oportunidad de contribuir a un futuro mejor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-celeste-complementario text-azul-profundo dark:bg-primary dark:text-primary-foreground font-bold hover:bg-white dark:hover:bg-primary/80"
                asChild
              >
                <Link to="/collaborate">
                  Colaborá Ahora
                  <Heart className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              {/* FIX aplicado también aquí por si reusas este bloque */}
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
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;
