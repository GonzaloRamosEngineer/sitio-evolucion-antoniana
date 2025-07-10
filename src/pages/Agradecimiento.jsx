import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, PartyPopper, Gift, Home as HomeIcon, XCircle, Clock } from 'lucide-react';
import ReactConfetti from 'react-confetti';

const Agradecimiento = () => {
  const location = useLocation();
  const [content, setContent] = useState({
    title: 'Procesando tu solicitud...',
    subtitle: 'Aguardá un momento.',
    icon: Clock,
    color: 'text-blue-500',
    showButton: true,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const estado = params.get('status'); 
    const tipo = params.get('tipo');

    let newContent = {
      title: '¡Gracias por tu interés!',
      subtitle: 'Tu acción es importante para nosotros.',
      icon: CheckCircle,
      color: 'text-green-600',
      showButton: true,
    };
    let confettiActive = false;

    if (estado === 'success') {
      confettiActive = true;
      if (tipo === 'donacion') {
        newContent = {
          title: '¡Gracias por tu donación!',
          subtitle: 'Tu generoso aporte nos ayuda a seguir impulsando sueños y proyectos en la Novena. ¡Tu apoyo hace la diferencia!',
          icon: Gift,
          color: 'text-primary-antoniano',
          showButton: true,
        };
      } else if (tipo === 'suscripcion') {
        newContent = {
          title: '¡Gracias por acompañarnos!',
          subtitle: 'Te damos una cálida bienvenida como padrino/madrina. Tu apoyo mensual hace una gran diferencia en la vida de nuestros jóvenes.',
          icon: PartyPopper,
          color: 'text-marron-legado',
          showButton: true,
        };
      } else {
         newContent = {
          title: '¡Colaboración Exitosa!',
          subtitle: 'Hemos recibido tu confirmación. ¡Muchas gracias por ser parte de nuestra comunidad!',
          icon: CheckCircle,
          color: 'text-green-600',
          showButton: true,
        };
      }
    } else if (estado === 'failure') {
      newContent = {
        title: 'Pago No Completado',
        subtitle: 'Lamentablemente, el pago no pudo procesarse. Podés intentarlo nuevamente o contactarnos si el problema persiste.',
        icon: XCircle,
        color: 'text-destructive',
        showButton: true,
      };
    } else if (estado === 'pending') {
      newContent = {
        title: 'Procesando tu Colaboración',
        subtitle: 'Tu pago está siendo procesado. Te notificaremos por correo electrónico una vez que se complete. ¡Gracias por tu paciencia!',
        icon: Clock,
        color: 'text-blue-500',
        showButton: true,
      };
    } else if (!estado && !tipo) {
       newContent = {
        title: '¡Gracias!',
        subtitle: 'Agradecemos tu interés en colaborar con la Fundación Evolución Antoniana.',
        icon: CheckCircle,
        color: 'text-green-600',
        showButton: true,
      };
    }
    
    setContent(newContent);
    setShowConfetti(confettiActive);

  }, [location.search]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 8000); // Confeti durante 8 segundos
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const IconComponent = content.icon;

  return (
    <>
      {showConfetti && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={300} />}
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion p-4 hero-pattern">
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <Card className="w-full max-w-lg text-center shadow-2xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm">
            <CardHeader className={`${content.color === 'text-destructive' ? 'bg-red-500/10' : content.color === 'text-blue-500' ? 'bg-blue-500/10' : 'bg-primary-antoniano/10' } p-8`}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 10 }}
                className={`mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-white shadow-lg ${content.color}`}
              >
                <IconComponent size={60} strokeWidth={1.5} />
              </motion.div>
            </CardHeader>
            <CardContent className="p-8 md:p-10">
              <CardTitle className={`text-3xl md:text-4xl font-poppins font-bold mb-4 ${content.color}`}>
                {content.title}
              </CardTitle>
              <CardDescription className="text-marron-legado/80 text-lg md:text-xl leading-relaxed mb-8">
                {content.subtitle}
              </CardDescription>
              {content.showButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <Button 
                    asChild 
                    size="lg" 
                    className="w-full sm:w-auto bg-marron-legado text-white hover:bg-marron-legado/90 transition-all duration-300 transform hover:scale-105 py-3 px-8 text-lg"
                  >
                    <Link to="/">
                      <HomeIcon className="mr-2 h-5 w-5" />
                      Volver al inicio
                    </Link>
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        <footer className="text-center mt-12 text-marron-legado/70">
          <p>&copy; {new Date().getFullYear()} Fundación Evolución Antoniana. Todos los derechos reservados.</p>
        </footer>
      </div>
    </>
  );
};

export default Agradecimiento;