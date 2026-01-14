import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, PartyPopper, Gift, Home as HomeIcon, XCircle, Clock, HeartHandshake } from 'lucide-react';
import ReactConfetti from 'react-confetti';

const Agradecimiento = () => {
  const location = useLocation();
  const [content, setContent] = useState({
    title: 'Procesando tu solicitud...',
    subtitle: 'Aguardá un momento.',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
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
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
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
          color: 'text-brand-action',
          bgColor: 'bg-red-50',
          showButton: true,
        };
      } else if (tipo === 'suscripcion') {
        newContent = {
          title: '¡Bienvenido a la Familia!',
          subtitle: 'Te damos una cálida bienvenida como padrino/madrina. Tu apoyo mensual hace una gran diferencia en la vida de nuestros jóvenes.',
          icon: HeartHandshake,
          color: 'text-brand-primary',
          bgColor: 'bg-blue-50',
          showButton: true,
        };
      } else {
         newContent = {
          title: '¡Colaboración Exitosa!',
          subtitle: 'Hemos recibido tu confirmación. ¡Muchas gracias por ser parte de nuestra comunidad!',
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          showButton: true,
        };
      }
    } else if (estado === 'failure') {
      newContent = {
        title: 'Pago No Completado',
        subtitle: 'Lamentablemente, el pago no pudo procesarse. Podés intentarlo nuevamente o contactarnos si el problema persiste.',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        showButton: true,
      };
    } else if (estado === 'pending') {
      newContent = {
        title: 'Procesando tu Colaboración',
        subtitle: 'Tu pago está siendo procesado. Te notificaremos por correo electrónico una vez que se complete. ¡Gracias por tu paciencia!',
        icon: Clock,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
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
      {showConfetti && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={400} colors={['#163A68', '#9C2A32', '#C98E2A', '#F9F7F5']} />}
      
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-sand p-4 font-sans relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
          className="w-full max-w-lg z-10"
        >
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <div className={`h-2 w-full ${content.bgColor.replace('bg-', 'bg-gradient-to-r from-transparent via-')}`}></div> {/* Línea superior decorativa */}
            
            <CardHeader className="pt-12 pb-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                className={`mx-auto w-24 h-24 flex items-center justify-center rounded-full ${content.bgColor} ${content.color} shadow-inner mb-6`}
              >
                <IconComponent size={48} strokeWidth={2} />
              </motion.div>
              
              <CardTitle className={`text-3xl md:text-4xl font-poppins font-bold ${content.color === 'text-brand-action' ? 'text-brand-action' : 'text-brand-dark'}`}>
                {content.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="px-8 pb-12 text-center">
              <CardDescription className="text-gray-600 text-lg leading-relaxed mb-10">
                {content.subtitle}
              </CardDescription>
              
              {content.showButton && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button 
                    asChild 
                    size="lg" 
                    className="w-full sm:w-auto bg-brand-primary text-white hover:bg-brand-dark transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl h-12 px-8 font-semibold"
                  >
                    <Link to="/">
                      <HomeIcon className="mr-2 h-5 w-5" />
                      Volver al Inicio
                    </Link>
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <footer className="mt-12 text-center">
           <p className="text-sm text-gray-400 font-medium">Fundación Evolución Antoniana</p>
        </footer>
      </div>
    </>
  );
};

export default Agradecimiento;