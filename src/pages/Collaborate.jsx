import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, HeartHandshake as HandshakeIcon, Building, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ContactModal from '@/components/Collaborate/ContactModal';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

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
    { value: '5000', label: '$5000 ARS / mes' },
    { value: '7500', label: '$7500 ARS / mes' },
    { value: '10000', label: '$10.000 ARS / mes' },
  ];


  const handleOneTimeDonation = async () => {
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Monto Inválido",
        description: "Por favor, ingresa un monto válido para la donación.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingDonation(true);
    try {
      const { data, error } = await supabase.functions.invoke('crear-preferencia-mercadopago', {
        body: {
          amount: amount,
          description: "Donación única a la Fundación Evolución Antoniana",
          user_id: user?.id || null,
          payer: {
            name: user?.name || "Invitado",
            surname: "", 
            email: user?.email || "anon@fundacion.com"
          }
        }
      });

      if (error) throw error;

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("No se recibió el punto de inicio de MercadoPago.");
      }

    } catch (err) {
      console.error("Error al crear preferencia de donación:", err);
      toast({
        title: "Error al Procesar Donación",
        description: err.message || "No se pudo iniciar el proceso de pago. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingDonation(false);
    }
  };

  const handleSubscription = async () => {
    const amount = parseFloat(subscriptionAmount);
     if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Monto de Suscripción Inválido",
        description: "Por favor, selecciona un monto válido para la suscripción.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('crear-suscripcion-mercadopago', {
        body: {
          plan: "Beca mensual Fundación Evolución Antoniana",
          amount: amount,
          user_id: user?.id || null,
          payer_email: user?.email || "anon@fundacion.com"
        }
      });

      if (error) throw error;

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("No se recibió el punto de inicio de MercadoPago para la suscripción.");
      }

    } catch (err) {
      console.error("Error al crear suscripción:", err);
      toast({
        title: "Error al Procesar Suscripción",
        description: err.message || "No se pudo iniciar el proceso de suscripción. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingSubscription(false);
    }
  };


  const collaborationOptions = [
    {
      id: 'donation',
      icon: Gift,
      title: 'Hacé una donación única',
      description: (
        <>
          <p className="text-base text-marron-legado/90 text-center mb-4 leading-relaxed">Campaña Especial · Becá a la Novena</p>
          <p className="text-base text-marron-legado/90 text-center mb-4 leading-relaxed">Cada aporte suma. Tu aporte se destina a:</p>
          <ul className="list-disc list-inside text-left text-marron-legado/80 space-y-1 text-sm mx-auto max-w-xs">
            <li>Materiales de entrenamiento</li>
            <li>Evaluaciones físicas profesionales</li>
            <li>Apoyo nutricional mensual</li>
            <li>Talleres de motivación y valores</li>
          </ul>
        </>
      ),
      content: (
        <div className="space-y-4 mt-6">
          <div>
            <Label htmlFor="donation-amount" className="text-marron-legado">Monto a donar (ARS)</Label>
            <Input 
              id="donation-amount"
              type="number"
              placeholder="Ej: 5000"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              className="bg-blanco-fundacion border-border focus:border-primary-antoniano focus:ring-primary-antoniano"
            />
          </div>
          <Button
            onClick={handleOneTimeDonation}
            variant="antoniano"
            size="lg"
            disabled={isProcessingDonation}
            className="w-full font-semibold py-3 text-lg text-white transition-all duration-300 transform hover:scale-105"
          >
            {isProcessingDonation ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Donar Ahora
          </Button>
        </div>
      )
    },
    {
      id: 'subscription',
      icon: HandshakeIcon,
      title: 'Sumate como padrino o madrina',
      description: 'Con tu suscripción mensual, ayudás a cubrir la cuota deportiva de uno o más chicos. Podrás ver cómo tu ayuda transforma su vida. ¡Podés elegir el monto y sumar más de una beca!',
      content: (
        <div className="space-y-4 mt-4">
           <div>
            <Label htmlFor="subscription-plan" className="text-marron-legado">Seleccioná tu aporte mensual</Label>
            <Select value={subscriptionAmount} onValueChange={setSubscriptionAmount}>
              <SelectTrigger id="subscription-plan" className="w-full bg-blanco-fundacion border-border text-marron-legado focus:ring-primary-antoniano focus:border-primary-antoniano">
                <SelectValue placeholder="Elige un plan" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                {subscriptionPlans.map(plan => (
                  <SelectItem key={plan.value} value={plan.value} className="hover:bg-accent focus:bg-accent">
                    {plan.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleSubscription}
            variant="antoniano"
            size="lg"
            disabled={isProcessingSubscription}
            className="w-full font-semibold py-3 text-lg text-white transition-all duration-300 transform hover:scale-105"
          >
            {isProcessingSubscription ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Suscribirme Mensualmente
          </Button>
        </div>
      )
    },
    {
      id: 'volunteer',
      icon: Building,
      title: 'Colaborá con tu tiempo o tu empresa',
      description: '¿Sos empresa, organización o querés dar tu tiempo como voluntario? Sumate con tu experiencia, recursos o energía. ¡Te necesitamos!',
      content: (
         <div className="mt-4">
            <Button
                onClick={() => {
                    setContactModalCollaborationType('Voluntariado / Colaboración Institucional');
                    setIsModalOpen(true);
                }}
                variant="antoniano"
                size="lg"
                className="w-full font-semibold py-3 text-lg text-white transition-all duration-300 transform hover:scale-105"
            >
                Quiero ser parte
            </Button>
        </div>
      )
    }
  ];


  return (
    <>
      <div className="min-h-screen bg-blanco-fundacion text-marron-legado">
        <section className="py-20 md:py-28 text-center bg-gradient-to-b from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion hero-pattern">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-4xl md:text-5xl lg:text-6xl font-poppins font-extrabold text-primary-antoniano mb-6 text-balance"
            >
              Sumá tu ayuda, multiplicá oportunidades
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="text-lg md:text-xl text-marron-legado/90 max-w-3xl mx-auto leading-relaxed text-balance"
            >
              Cada aporte cuenta. Ya sea económico o con tu tiempo, te invitamos a ser parte de una transformación real y transparente.
            </motion.p>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {collaborationOptions.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                  className="h-full flex"
                >
                  <Card className="w-full flex flex-col bg-white rounded-xl border border-marron-legado/10 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden card-hover">
                    <CardHeader className="p-6 md:p-8 items-center">
                      <motion.div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-celeste-complementario/40"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <option.icon className="w-10 h-10 text-primary-antoniano" />
                      </motion.div>
                      <CardTitle className="text-2xl md:text-3xl font-poppins font-bold text-center text-primary-antoniano">{option.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 flex-grow flex flex-col">
                      <CardDescription className="text-base text-marron-legado/90 text-center mb-6 leading-relaxed flex-grow">
                        {option.description}
                      </CardDescription>
                       {option.content}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-celeste-complementario/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-poppins font-bold text-primary-antoniano text-center mb-12">
              Confianza y Seguridad
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="text-center md:text-left"
              >
                <h3 className="text-2xl lg:text-3xl font-poppins font-semibold text-primary-antoniano mb-4 text-center md:text-left">💛 Tu ayuda, en buenas manos.</h3>
                <div className="space-y-4 text-marron-legado/80 leading-relaxed">
                  <p>
                    Todas las donaciones se procesan de forma segura a través de Mercado Pago, con el respaldo oficial del programa <a href="https://sustentabilidadmercadolibre.com/iniciativas/mercado-libre-solidario" target="_blank" rel="noopener noreferrer" className="text-primary-antoniano font-semibold hover:underline">Mercado Libre Solidario</a>, del cual la Fundación Evolución Antoniana forma parte.
                  </p>
                  <p>🧾 Recibís un comprobante oficial por cada colaboración.</p>
                  <p>📊 Nos comprometemos con la transparencia absoluta: publicamos informes claros y accesibles sobre el uso de los fondos, el impacto generado y los resultados de cada campaña.</p>
                </div>
                 <Button asChild variant="link" className="text-primary-antoniano hover:text-marron-legado mt-4 px-0 font-semibold">
                  <Link to="/contact">🔎 Conocé cómo transformamos tu ayuda en acciones reales.</Link>
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                className="flex justify-center"
              >
                <img  
                  className="rounded-xl shadow-lg w-full max-w-md object-contain h-auto" 
                  alt="Logo de Mercado Pago Solidario" 
                  src="/img/mercadolibre_solidario.png" />
              </motion.div>
            </div>
          </div>
        </section>
      </div>
      <ContactModal open={isModalOpen} onOpenChange={setIsModalOpen} collaborationType={contactModalCollaborationType} />
    </>
  );
};

export default Collaborate;