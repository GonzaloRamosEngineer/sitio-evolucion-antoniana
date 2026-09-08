// src/pages/Collaborate.jsx
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Gift, HeartHandshake as HandshakeIcon, Building, Loader2, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import ContactModal from '@/components/Collaborate/ContactModal';
import SelectorDestino from '@/components/Collaborate/SelectorDestino';
import AvisoSesion from '@/components/Collaborate/AvisoSesion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
// ⬇️ usamos el microservicio en Render vía membershipApi
import { createSubscription, createOneTimeDonation } from '@/api/membershipApi';
import { mensajeErrorPago } from '@/lib/erroresPago';
import { useDestinosActivos } from '@/hooks/useContentQueries';
import { destinoEfectivo } from '@/api/destinosApi';
import { emailParaCheckout } from '@/lib/aportante';

const Collaborate = () => {
  const [selectedOption, setSelectedOption] = useState('donation');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactModalCollaborationType, setContactModalCollaborationType] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  /* --- Quien aporta (ROADMAP §10.18) -------------------------------------
   *
   * Uno solo para las dos formas de aportar: quien lo escribe lo hace una vez,
   * y despues elige si dona o se suscribe. Dos campos separados serian el mismo
   * dato pedido dos veces.
   *
   * Sin sesion vale lo que la persona escriba; con sesion no se usa (gana el
   * email verificado de la cuenta, ver `emailParaCheckout`).
   */
  const [emailAportante, setEmailAportante] = useState('');

  const [donationAmount, setDonationAmount] = useState('');
  const [isProcessingDonation, setIsProcessingDonation] = useState(false);

  const [subscriptionAmount, setSubscriptionAmount] = useState('5000');
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);

  /* --- A dónde va el aporte (ROADMAP §10.7) --------------------------------
   *
   * Si la consulta falla no se muestra nada y se dona como antes: el destino es
   * información valiosa, pero no vale perder una donación por ella. El error se
   * ignora a propósito, no por olvido.
   *
   * Un destino puede admitir aporte puntual, recurrente o ambos, así que cada
   * tarjeta filtra por lo suyo y lleva su propia elección: sirven a decisiones
   * distintas y no tienen por qué coincidir.
   */
  const { data: destinos = [] } = useDestinosActivos();
  const destinosPuntuales = useMemo(
    () => destinos.filter((d) => d.admite_puntual),
    [destinos]
  );
  const destinosRecurrentes = useMemo(
    () => destinos.filter((d) => d.admite_recurrente),
    [destinos]
  );

  const [destinoDonacionElegido, setDestinoDonacionElegido] = useState(null);
  const [destinoSuscripcionElegido, setDestinoSuscripcionElegido] = useState(null);

  // Derivado, no sincronizado: la lista llega asincrónica y puede cambiar, así
  // que el id se resuelve en cada render contra la lista vigente. Ver
  // `destinoEfectivo` en destinosApi.
  const destinoDonacionId = destinoEfectivo(destinoDonacionElegido, destinosPuntuales);
  const destinoSuscripcionId = destinoEfectivo(destinoSuscripcionElegido, destinosRecurrentes);

  const destinoDonacion = destinosPuntuales.find((d) => d.id === destinoDonacionId) ?? null;
  const destinoSuscripcion = destinosRecurrentes.find((d) => d.id === destinoSuscripcionId) ?? null;

  const subscriptionPlans = [
    { value: '5000', label: '$5.000 ARS / mes' },
    { value: '7500', label: '$7.500 ARS / mes' },
    { value: '10000', label: '$10.000 ARS / mes' },
    { value: '15000', label: '$15.000 ARS / mes' },
    { value: '25000', label: '$25.000 ARS / mes' },
    { value: '50000', label: '$50.000 ARS / mes' },
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
    const { data, error } = await createOneTimeDonation({
      userId: user?.id || null,
      emailUsuario: emailParaCheckout(user, emailAportante),
      amount,
      destinoId: destinoDonacion?.id ?? null,
      destinoNombre: destinoDonacion?.nombre ?? null
    });

    if (data?.init_point) {
      // Redirige a MercadoPago: no apagamos el spinner, la página se va.
      window.location.href = data.init_point;
      return;
    }

    setIsProcessingDonation(false);
    // El mensaje se traduce en `erroresPago.js`: acá llegaba el JSON crudo de
    // MercadoPago y se mostraba tal cual dentro del cartel rojo (§10.24).
    const { titulo, descripcion, codigo } = mensajeErrorPago(error, { accion: 'donacion' });
    toast({
      title: titulo,
      description: codigo === 'desconocido' ? descripcion : `${descripcion} (${codigo})`,
      variant: 'destructive',
    });
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
    const { data, error } = await createSubscription({
      userId: user?.id || null,
      emailUsuario: emailParaCheckout(user, emailAportante),
      amount,
      destinoId: destinoSuscripcion?.id ?? null,
      destinoNombre: destinoSuscripcion?.nombre ?? null
    });

    if (data?.init_point) {
      // Redirige a MercadoPago: no apagamos el spinner, la página se va.
      window.location.href = data.init_point;
      return;
    }

    setIsProcessingSubscription(false);
    const { titulo, descripcion, codigo } = mensajeErrorPago(error, { accion: 'suscripcion' });
    toast({
      title: titulo,
      description: codigo === 'desconocido' ? descripcion : `${descripcion} (${codigo})`,
      variant: 'destructive',
    });
  };

  const collaborationOptions = [
    {
      id: 'donation',
      icon: Gift,
      iconBg: 'bg-red-100 text-brand-action',
      title: 'Donación Única',
      subtitle: 'Campaña: Experiencias educativas',
      description: (
  <>
    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
      Tu donación hace posible experiencias que amplían la formación de los chicos, dentro y fuera de la cancha.
    </p>
    <details className="mb-3"><summary className="cursor-pointer text-sm font-semibold text-brand-primary py-2">Cómo ayuda tu donación</summary><ul className="space-y-2 mt-2">
      <li className="flex items-start text-sm text-gray-600">
        <CheckCircle2 className="w-4 h-4 text-brand-gold mr-2 mt-0.5 flex-shrink-0" />
        Instancias de evaluación y orientación para el desarrollo personal y deportivo
      </li>
      <li className="flex items-start text-sm text-gray-600">
        <CheckCircle2 className="w-4 h-4 text-brand-gold mr-2 mt-0.5 flex-shrink-0" />
        Talleres que fortalecen la motivación, el compromiso y los hábitos diarios
      </li>
      <li className="flex items-start text-sm text-gray-600">
        <CheckCircle2 className="w-4 h-4 text-brand-gold mr-2 mt-0.5 flex-shrink-0" />
        Encuentros con referentes que inspiran y amplían la mirada de los chicos
      </li>
    </ul></details>
  </>
),

      content: (
        <div className="space-y-4 mt-auto" data-theme="light">
          <SelectorDestino
            id="donation-destino"
            destinos={destinosPuntuales}
            value={destinoDonacionId}
            onChange={setDestinoDonacionElegido}
          />

          <div>
            <Label htmlFor="donation-amount" className="text-brand-dark font-semibold">Monto a donar (ARS)</Label>
            <div className="grid grid-cols-3 gap-2 my-3">
              {['5000', '10000', '25000'].map(amount => <button key={amount} type="button" aria-pressed={donationAmount === amount} onClick={() => setDonationAmount(amount)} className={`min-h-[44px] rounded-lg border text-sm font-semibold ${donationAmount === amount ? 'border-brand-primary bg-brand-primary text-white' : 'border-gray-200 text-brand-dark bg-white'}`}>${Number(amount).toLocaleString('es-AR')}</button>)}
            </div><div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <Input
                id="donation-amount"
                type="number"
                inputMode="decimal"
                min="1"
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
            variant="action"
            disabled={isProcessingDonation || isProcessingSubscription}
            className="w-full h-12 rounded-xl"
          >
            {isProcessingDonation ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Heart className="mr-2 h-5 w-5" />}
            Donar ahora
          </Button>
        </div>
      )
    },
    {
      id: 'subscription',
      icon: HandshakeIcon,
      iconBg: 'bg-blue-100 text-brand-primary',
      title: 'Suscripción Mensual',
      subtitle: 'Programa de Beca de acompañamiento deportivo',
      description:
  'Las becas permiten acompañar trayectorias deportivas, reducir barreras económicas y generar condiciones para que más chicos puedan sostener su formación en el tiempo.',
      content: (
        <div className="space-y-4 mt-auto" data-theme="light">
          <SelectorDestino
            id="subscription-destino"
            destinos={destinosRecurrentes}
            value={destinoSuscripcionId}
            onChange={setDestinoSuscripcionElegido}
            label="Tu aporte mensual sostiene"
          />

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
            disabled={isProcessingSubscription || isProcessingDonation}
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
      subtitle: 'Sumate con tu experiencia',
      description:
  'Si sos profesional, empresa o institución, podés sumar conocimiento, recursos o apoyo estratégico. Tu colaboración potencia experiencias formativas y proyectos con impacto real.',

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
      <Helmet>
        <title>Colaborá - Fundación Evolución Antoniana</title>
        <meta name="description" content="Sumate como voluntario, aliado o donante y ayudá a transformar realidades con la Fundación Evolución Antoniana." />
        <link rel="canonical" href="https://www.evolucionantoniana.com/collaborate" />
      </Helmet>

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
        <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
          <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16"
          >
            <div className="mb-6">
              <Eyebrow light>Colaboración</Eyebrow>
            </div>
            <h1 className="font-poppins font-bold text-3xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
              Sumá tu ayuda, multiplicá oportunidades
            </h1>
            <p className="max-w-[36rem] text-base sm:text-lg leading-relaxed text-white/75">
              Ayudá a crear experiencias educativas y becas deportivas. Elegí un aporte único o mensual.
            </p>
          </motion.div>
        </section>

        {/* --- OPCIONES DE COLABORACIÓN --- */}
        <section className="py-8 md:py-12 px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6">
              <div className="mb-4">
                <Eyebrow>Formas de colaborar</Eyebrow>
              </div>
              <h2 className="font-poppins font-bold text-3xl tracking-tight text-brand-dark">
                Elegí cómo sumarte
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5" role="group" aria-label="Forma de colaborar">
              {collaborationOptions.map(option => (
                <button key={option.id} type="button" aria-pressed={selectedOption === option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`min-h-[72px] rounded-xl border px-2 py-3 text-sm font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-colors ${selectedOption === option.id ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-brand-dark border-gray-200 hover:bg-gray-50'}`}>
                  <option.icon className="h-5 w-5" aria-hidden="true" />
                  {option.id === 'donation' ? 'Una vez' : option.id === 'subscription' ? 'Cada mes' : 'Voluntariado'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6">
              {collaborationOptions.filter(option => option.id === selectedOption).map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="h-full"
                >
                  <Card className="h-full w-full flex flex-col bg-white rounded-3xl border border-transparent hover:border-brand-primary/10 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                    <CardHeader className="p-5 sm:p-8 pb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${option.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                        <option.icon className="w-8 h-8" />
                      </div>
                      <CardTitle className="text-2xl font-poppins font-bold text-brand-dark">
                        {option.title}
                      </CardTitle>
                      <p className="text-sm font-bold text-gray-600 uppercase tracking-wide mt-1">
                          {option.subtitle}
                      </p>
                    </CardHeader>

                    <CardContent className="p-5 sm:p-8 pt-2 flex-grow flex flex-col">
                      <div className="text-gray-600 mb-5 leading-relaxed">
                        {option.description}
                      </div>
                      {option.id !== 'volunteer' && <AvisoSesion user={user} email={emailAportante} onEmailChange={setEmailAportante} />}
                      {option.content}
                      {option.id !== 'volunteer' && <p className="mt-3 text-center text-sm text-gray-600 flex items-center justify-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" />Pago seguro en Mercado Pago{option.id === 'subscription' ? ' · Cobro mensual' : ' · Por única vez'}</p>}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- MERCADO LIBRE SOLIDARIO / TRUST --- */}
        <section className="py-8 md:py-12 bg-white mb-6">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto bg-brand-sand rounded-2xl p-5 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-gray-100">
                
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
                    {/* Antes apuntaba a /contact, que no mostraba ninguna gestión
                        financiera. Ahora hay una rendición de verdad para enlazar. */}
                    <Button variant="link" className="text-brand-action font-bold p-0 h-auto hover:text-brand-dark" asChild>
                        <Link to="/rendicion">Mirá en qué se usó cada aporte →</Link>
                    </Button>
                </div>

                <div className="md:w-1/2 flex justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <img
                            className="w-full max-w-[250px] object-contain"
                            alt="Logo de Mercado Pago Solidario"
                            src="/img/mercadolibre_solidario.webp"
                            width="1200"
                            height="800"
                            loading="lazy"
                            decoding="async"
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