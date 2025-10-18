// src/pages/Collaborate.jsx
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
    { value: '50', label: '$50 ARS / mes' },
    { value: '5000', label: '$5000 ARS / mes' },
    { value: '7500', label: '$7500 ARS / mes' },
    { value: '10000', label: '$10.000 ARS / mes' },
  ];

  const handleOneTimeDonation = async () => {
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Monto Inválido',
        description: 'Por favor, ingresa un monto válido para la donación.',
        variant: 'destructive'
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
        variant: 'destructive'
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
        variant: 'destructive'
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
        variant: 'destructive'
      });
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  // ... resto del componente idéntico ...

  const collaborationOptions = [
    {
      id: 'donation',
      icon: Gift,
      title: 'Hacé una donación única',
      description: (
        <>
          <p className="text-base text-marron-legado/90 text-center mb-4 leading-relaxed">
            Campaña Especial · Becá a la Novena
          </p>
          <p className="text-base text-marron-legado/90 text-center mb-4 leading-relaxed">
            Cada aporte suma. Tu aporte se destina a:
          </p>
          <ul className="list-disc list-inside text-left text-marron-legado/80 space-y-1 text-sm mx-auto max-w-xs">
            <li>Materiales de entrenamiento</li>
            <li>Evaluaciones físicas profesionales</li>
            <li>Apoyo nutricional mensual</li>
            <li>Talleres de motivación y valores</li>
          </ul>
        </>
      ),
      content: (
        <div className="space-y-4 mt-6" data-theme="light">
          <div>
            <Label htmlFor="donation-amount" className="text-marron-legado">
              Monto a donar (ARS)
            </Label>
            <Input
              id="donation-amount"
              type="number"
              placeholder="Ej: 5000"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              className="bg-blanco-fundacion border-border text-marron-legado placeholder:text-marron-legado/60 caret-primary-antoniano [color-scheme:light]"
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
      description:
        'Con tu suscripción mensual, ayudás a cubrir la cuota deportiva de uno o más chicos. Podrás ver cómo tu ayuda transforma su vida. ¡Podés elegir el monto y sumar más de una beca!',
      content: (
        <div className="space-y-4 mt-4" data-theme="light">
          <div>
            <Label htmlFor="subscription-plan" className="text-marron-legado">
              Seleccioná tu aporte mensual
            </Label>
            <Select value={subscriptionAmount} onValueChange={setSubscriptionAmount}>
              <SelectTrigger
                id="subscription-plan"
                className="w-full bg-blanco-fundacion border-border text-marron-legado focus:ring-primary-antoniano focus:border-primary-antoniano [color-scheme:light] [&_[data-placeholder]]:text-marron-legado/60"
              >
                <SelectValue placeholder="Elige un plan" />
              </SelectTrigger>

              <SelectContent className="bg-card border-border text-marron-legado">
                {subscriptionPlans.map(plan => (
                  <SelectItem
                    key={plan.value}
                    value={plan.value}
                    className="hover:bg-accent focus:bg-accent text-marron-legado"
                  >
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
      description:
        '¿Sos empresa, organización o querés dar tu tiempo como voluntario? Sumate con tu experiencia, recursos o energía. ¡Te necesitamos!',
      content: (
        <div className="mt-4" data-theme="light">
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
      {/* resto del layout igual que antes */}
      <ContactModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        collaborationType={contactModalCollaborationType}
      />
    </>
  );
};

export default Collaborate;
