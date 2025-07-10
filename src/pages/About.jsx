import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Target, Eye, Users, Award, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const About = () => {
  const values = [
    {
      icon: Heart,
      title: 'Compromiso Social',
      description: 'Trabajamos con pasión y dedicación por el bienestar de nuestra comunidad.'
    },
    {
      icon: Users,
      title: 'Inclusión',
      description: 'Promovemos la participación de todos los sectores de la sociedad sin distinción.'
    },
    {
      icon: Award,
      title: 'Transparencia',
      description: 'Actuamos con honestidad y rendimos cuentas de nuestras acciones y recursos.'
    },
    {
      icon: BookOpen,
      title: 'Educación',
      description: 'Creemos en el poder transformador de la educación y el conocimiento.'
    }
  ];

  return (
    <div className="min-h-screen bg-blanco-fundacion">
      <section className="py-20 md:py-28 text-center bg-gradient-to-b from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion hero-pattern">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-poppins font-extrabold text-primary-antoniano mb-6 text-balance"
          >
            Sobre Nuestra Fundación
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-marron-legado/90 max-w-3xl mx-auto leading-relaxed text-balance"
          >
            Conoce nuestra historia, misión y el equipo comprometido que trabaja día a día por el desarrollo social, educativo, deportivo y tecnologico de nuestra comunidad.
          </motion.p>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-blanco-fundacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className="text-3xl font-poppins font-bold text-primary-antoniano mb-6">Nuestra Historia</h2>
              <div className="space-y-4 text-marron-legado/80 leading-relaxed">
                <p>
                  La Fundación Evolución Antoniana nació en 2020 como una iniciativa de un grupo de profesionales comprometidos con el cambio social, con el sueño de construir un espacio de participación, desarrollo y trabajo colectivo.
                </p>
                <p>
                  Desde nuestra constitución legal en 2022, consolidamos nuestra labor en la provincia de Salta promoviendo el trabajo solidario, la educación popular y el uso de la tecnología al servicio del desarrollo comunitario.
                </p>
                <p>
                  A lo largo de estos años hemos organizado eventos solidarios en barrios, comedores y hogares de la tercera edad; próximamente brindado workshops y talleres educativos accesibles a todas las edades; siempre con el foco aplicado en soluciones tecnológicas para facilitar el acceso al conocimiento y a oportunidades reales de mejora.
                </p>
                <p>
                  Nuestra misión es seguir fortaleciendo redes de colaboración que empoderen a las comunidades y contribuyan a una sociedad más justa, inclusiva y sostenible.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <img   
                className="rounded-2xl shadow-xl w-full h-96 object-cover"
                alt="Reunión del equipo de la fundación planificando proyectos comunitarios"
                src="https://storage.googleapis.com/hostinger-horizons-assets-prod/c93288dd-3aa0-49f8-b2c6-b145823c3caf/7e3b035e48adf87a55a239d0b919dc66.png" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-celeste-complementario/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
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
                    Mejorar la calidad de vida de las personas promoviendo el desarrollo educativo, el acceso a la tecnología y el trabajo solidario. Impulsamos un cambio positivo y duradero a través de proyectos que combinan formación, innovación y compromiso comunitario.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
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
                    Ser una organización referente en innovación social y educación con impacto, reconocida por aplicar soluciones tecnológicas accesibles al servicio de las comunidades, especialmente en contextos vulnerables.
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-blanco-fundacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-primary-antoniano mb-4">
              Nuestros Valores
            </h2>
            <p className="text-xl text-marron-legado/80 max-w-3xl mx-auto leading-relaxed">
              Los principios fundamentales que guían nuestro trabajo y definen 
              nuestra identidad como organización.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
              >
                <Card className="h-full text-center card-hover border-celeste-complementario/30 shadow-lg bg-white hover:bg-celeste-complementario/5 transition-colors">
                  <CardHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-antoniano to-celeste-complementario rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                      <value.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl text-primary-antoniano font-poppins">{value.title}</CardTitle>
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

      <section className="py-16 md:py-20 bg-blanco-fundacion">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-primary-antoniano mb-4">
              Reconocimientos
            </h2>
            <p className="text-xl text-marron-legado/80 max-w-3xl mx-auto leading-relaxed">
              Nuestro trabajo ha sido reconocido por diversas instituciones y organizaciones a nivel provincial y nacional.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center p-6 bg-celeste-complementario/10 rounded-xl shadow-md"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-poppins font-semibold text-primary-antoniano mb-2">
                Postulación Impacto Social 2022
              </h3>
              <p className="text-marron-legado/80 leading-relaxed">
                Reconocimiento por nuestro trabajo en desarrollo comunitario.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-center p-6 bg-celeste-complementario/10 rounded-xl shadow-md"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary-antoniano to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-poppins font-semibold text-primary-antoniano mb-2">
                Certificación de Transparencia
              </h3>
              <p className="text-marron-legado/80 leading-relaxed">
                Acreditación en gestión transparente de recursos y proyectos.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="text-center p-6 bg-celeste-complementario/10 rounded-xl shadow-md"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-poppins font-semibold text-primary-antoniano mb-2">
                Mención Educación Digital
              </h3>
              <p className="text-marron-legado/80 leading-relaxed">
                Destacados por nuestros programas de educación especializada en aplicación de nuevas tecnologías.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;