// src/pages/Collaborate.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, HeartHandshake as HandshakeIcon, Building, Loader2, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import ContactModal from '@/components/Collaborate/ContactModal';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
// ⬇️ usamos el microservicio en Render vía membershipApi
import { createSubscription, createOneTimeDonation } from '@/api/membershipApi';

const Collaborate = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactModalCollaborationType, setContactModalCollaborationType] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const [donationAmount, setDonationAmount] = useState('');
  const [isProcessingDonation, setIsProcessingDonation] = useState(false);

  const [subscriptionAmount, setSubscriptionAmount] = useState('5000');
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);

  const subscriptionPlans = [
    { value: '50', label: '$50 ARS / mes' }, // Test value kept just in case
    { value: '5000', label: '$5.000 ARS / mes' },
    { value: '7500', label: '$7.500 ARS / mes' },
    { value: '10000', label: '$10.000 ARS / mes' },
  ];

  const handleOneTimeDonation = async () => {
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Monto Inválido',
        description: 'Por favor, ingresa un monto válido para la donación.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingDonation(true);
    try {
      const data = await createOneTimeDonation({
        userId: user?.id || null,
        emailUsuario: user?.email || 'anon@fundacion.com',
        amount
      });

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('No se recibió el punto de inicio de MercadoPago.');
      }
    } catch (err) {
      console.error('Error al crear preferencia de donación:', err);
      toast({
        title: 'Error al Procesar Donación',
        description: err.message || 'No se pudo iniciar el proceso de pago. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingDonation(false);
    }
  };

  const handleSubscription = async () => {
    const amount = parseFloat(subscriptionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Monto de Suscripción Inválido',
        description: 'Por favor, selecciona un monto válido para la suscripción.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingSubscription(true);
    try {
      const data = await createSubscription({
        userId: user?.id || null,
        emailUsuario: user?.email || 'anon@fundacion.com',
        amount
      });

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('No se recibió el punto de inicio de MercadoPago para la suscripción.');
      }
    } catch (err) {
      console.error('Error al crear suscripción:', err);
      toast({
        title: 'Error al Procesar Suscripción',
        description: err.message || 'No se pudo iniciar el proceso de suscripción. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const collaborationOptions = [
    {
      id: 'donation',
      icon: Gift,
      iconBg: 'bg-red-100 text-brand-action',
      title: 'Donación Única',
      subtitle: 'Campaña: Becá a la Novena',
      description: (
        <>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Tu aporte puntual nos ayuda a comprar materiales urgentes para el entrenamiento diario.
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start text-sm text-gray-600">
               <CheckCircle2 className="w-4 h-4 text-brand-gold mr-2 mt-0.5 flex-shrink-0" />
               Materiales deportivos
            </li>
            <li className="flex items-start text-sm text-gray-600">
               <CheckCircle2 className="w-4 h-4 text-brand-gold mr-2 mt-0.5 flex-shrink-0" />
               Evaluaciones físicas
            </li>
            <li className="flex items-start text-sm text-gray-600">
               <CheckCircle2 className="w-4 h-4 text-brand-gold mr-2 mt-0.5 flex-shrink-0" />
               Apoyo nutricional
            </li>
          </ul>
        </>
      ),
      content: (
        <div className="space-y-4 mt-auto" data-theme="light">
          <div>
            <Label htmlFor="donation-amount" className="text-brand-dark font-semibold">Monto a donar (ARS)</Label>
            <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <Input
                id="donation-amount"
                type="number"
                placeholder="Ej: 5000"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="pl-8 bg-gray-50 border-gray-200 text-brand-dark focus:border-brand-action focus:ring-brand-action rounded-xl h-12 text-lg"
                />
            </div>
          </div>

          <Button
            onClick={handleOneTimeDonation}
            size="lg"
            disabled={isProcessingDonation}
            className="w-full font-bold h-12 text-white bg-brand-action hover:bg-red-800 shadow-md hover:shadow-lg transition-all rounded-xl"
          >
            {isProcessingDonation ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Heart className="mr-2 h-5 w-5" />}
            Donar Ahora
          </Button>
        </div>
      )
    },
    {
      id: 'subscription',
      icon: HandshakeIcon,
      iconBg: 'bg-blue-100 text-brand-primary',
      title: 'Suscripción Mensual',
      subtitle: 'Convertite en Padrino/Madrina',
      description: 'Con tu aporte recurrente, garantizás la continuidad deportiva de un chico durante todo el año. Es la forma más efectiva de ayudar a largo plazo.',
      content: (
        <div className="space-y-4 mt-auto" data-theme="light">
          <div>
            <Label htmlFor="subscription-plan" className="text-brand-dark font-semibold">Tu aporte mensual</Label>
            <Select value={subscriptionAmount} onValueChange={setSubscriptionAmount}>
              <SelectTrigger
                id="subscription-plan"
                className="w-full bg-gray-50 border-gray-200 text-brand-dark focus:ring-brand-primary focus:border-brand-primary rounded-xl h-12 text-lg"
              >
                <SelectValue placeholder="Elige un plan" />
              </SelectTrigger>

              <SelectContent className="bg-white border-gray-100">
                {subscriptionPlans.map(plan => (
                  <SelectItem
                    key={plan.value}
                    value={plan.value}
                    className="hover:bg-gray-50 cursor-pointer py-3"
                  >
                    {plan.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubscription}
            size="lg"
            disabled={isProcessingSubscription}
            className="w-full font-bold h-12 text-white bg-brand-primary hover:bg-brand-dark shadow-md hover:shadow-lg transition-all rounded-xl"
          >
            {isProcessingSubscription ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <HandshakeIcon className="mr-2 h-5 w-5" />}
            Suscribirme
          </Button>
        </div>
      )
    },
    {
      id: 'volunteer',
      icon: Building,
      iconBg: 'bg-brand-gold/20 text-brand-dark',
      title: 'Voluntariado / Empresas',
      subtitle: 'Doná tu tiempo o recursos',
      description: '¿Tenés experiencia profesional, insumos o querés sumar a tu empresa como sponsor? Tu capital humano es invaluable para nosotros.',
      content: (
        <div className="mt-auto pt-4" data-theme="light">
          <Button
            onClick={() => {
              setContactModalCollaborationType('Voluntariado / Colaboración Institucional');
              setIsModalOpen(true);
            }}
            variant="outline"
            size="lg"
            className="w-full font-bold h-12 border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all rounded-xl"
          >
            Quiero ser parte
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      {/* Estilo para evitar el fondo amarillo del autofill de Chrome */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--brand-dark, #0F294A);
          -webkit-box-shadow: 0 0 0px 1000px #f9fafb inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div className="min-h-screen bg-brand-sand font-sans">
        
        {/* --- HERO SECTION --- */}
        <section className="relative bg-brand-primary overflow-hidden py-20 px-4">
            {/* Fondo Tech Sutil */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
                <div className="absolute inset-0 opacity-10" 
                        style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                </div>
            </div>

            <div className="relative max-w-6xl mx-auto text-center z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-6">
                        <Heart className="w-4 h-4 text-brand-gold fill-brand-gold" />
                        <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Colaboración</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-poppins font-bold text-white mb-6 leading-tight">
                        Sumá tu ayuda, <br/>
                        <span className="text-brand-gold">Multiplicá oportunidades.</span>
                    </h1>
                    
                    <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Cada aporte cuenta. Ya sea económico o con tu tiempo, te invitamos a ser parte de una transformación real, transparente y tecnológica.
                    </p>
                </motion.div>
            </div>
        </section>

        {/* --- OPCIONES DE COLABORACIÓN --- */}
        <section className="py-16 md:py-20 px-4 -mt-10 relative z-20">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {collaborationOptions.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="h-full"
                >
                  <Card className="h-full w-full flex flex-col bg-white rounded-3xl border border-transparent hover:border-brand-primary/10 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                    <CardHeader className="p-8 pb-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${option.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                        <option.icon className="w-8 h-8" />
                      </div>
                      <CardTitle className="text-2xl font-poppins font-bold text-brand-dark">
                        {option.title}
                      </CardTitle>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mt-1">
                          {option.subtitle}
                      </p>
                    </CardHeader>

                    <CardContent className="p-8 pt-2 flex-grow flex flex-col">
                      <div className="text-gray-600 mb-8 leading-relaxed">
                        {option.description}
                      </div>
                      {option.content}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- MERCADO LIBRE SOLIDARIO / TRUST --- */}
        <section className="py-16 bg-white mb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto bg-brand-sand rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 border border-gray-100">
                
                <div className="md:w-1/2 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 mb-4">
                         <ShieldCheck className="w-6 h-6 text-green-600" />
                         <span className="font-bold text-green-700 uppercase tracking-wide text-sm">Transparencia Garantizada</span>
                    </div>
                    <h3 className="text-3xl font-poppins font-bold text-brand-dark mb-4">
                        Tu ayuda, en buenas manos.
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-6">
                        Todas las donaciones se procesan de forma segura a través de <strong className="text-brand-primary">Mercado Pago</strong>, con el respaldo oficial del programa <strong>Mercado Libre Solidario</strong>, del cual la Fundación Evolución Antoniana forma parte.
                    </p>
                    <ul className="space-y-2 mb-6 text-left inline-block">
                        <li className="flex items-center text-sm text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-brand-primary mr-2" />
                            Recibís comprobante oficial.
                        </li>
                        <li className="flex items-center text-sm text-gray-700">
                            <CheckCircle2 className="w-4 h-4 text-brand-primary mr-2" />
                            Reportes de impacto trimestrales.
                        </li>
                    </ul>
                    <Button variant="link" className="text-brand-action font-bold p-0 h-auto hover:text-brand-dark" asChild>
                        <Link to="/contact">Conocé más sobre nuestra gestión financiera →</Link>
                    </Button>
                </div>

                <div className="md:w-1/2 flex justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <img
                            className="w-full max-w-[250px] object-contain"
                            alt="Logo de Mercado Pago Solidario"
                            src="/img/mercadolibre_solidario.png"
                        />
                    </div>
                </div>

            </div>
          </div>
        </section>
      </div>

      <ContactModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        collaborationType={contactModalCollaborationType}
      />
    </>
  );
};

export default Collaborate;