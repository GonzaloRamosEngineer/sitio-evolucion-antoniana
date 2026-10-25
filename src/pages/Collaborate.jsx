// src/pages/Collaborate.jsx
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Gift, HeartHandshake as HandshakeIcon, Building, Loader2, ShieldCheck, CheckCircle2, Heart, Landmark, Copy, ChevronDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ContactModal from '@/components/Collaborate/ContactModal';
import SelectorDestino from '@/components/Collaborate/SelectorDestino';
import AvisoSesion from '@/components/Collaborate/AvisoSesion';
import { Link } from 'react-router-dom';
import { entidad } from '@/config/entidad';
import { RUTAS } from '@/config/rutas';
import { canonicalUrl } from '@/lib/seo';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
// ⬇️ usamos el microservicio en Render vía membershipApi
import { createSubscription, createOneTimeDonation } from '@/api/membershipApi';
import { mensajeErrorPago } from '@/lib/erroresPago';
import { useDestinosActivos } from '@/hooks/useContentQueries';
import { destinoEfectivo } from '@/api/destinosApi';
import { emailParaCheckout } from '@/lib/aportante';

const copiarDato = async (valor) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(valor);
    return;
  }

  // La vista local por IP usa HTTP y algunos navegadores no exponen Clipboard API.
  const campo = document.createElement('textarea');
  campo.value = valor;
  campo.setAttribute('readonly', '');
  campo.style.position = 'fixed';
  campo.style.opacity = '0';
  document.body.appendChild(campo);
  campo.select();
  const copiado = document.execCommand('copy');
  campo.remove();
  if (!copiado) throw new Error('No se pudo copiar el dato');
};

const Collaborate = () => {
  const [selectedOption, setSelectedOption] = useState('subscription');
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
  const destinoDonacionId = destinoEfectivo(destinoDonacionElegido, destinosPuntuales, 'sostenimiento-institucional');
  const destinoSuscripcionId = destinoEfectivo(destinoSuscripcionElegido, destinosRecurrentes, 'sostenimiento-institucional');

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
      title: 'Aporte por única vez',

      content: (
        <div className="space-y-4 mt-auto" data-theme="light">
          <SelectorDestino
            id="donation-destino"
            destinos={destinosPuntuales}
            value={destinoDonacionId}
            onChange={setDestinoDonacionElegido}
          />

          <div>
            <Label htmlFor="donation-amount" className="text-brand-dark font-semibold">Elegí cuánto aportar (ARS)</Label>
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
            {/* Regla 2026-10: una donación suma, pero no adelanta cuotas ni da acceso. */}
            <p className="mt-2 text-sm text-gray-600">
              Suma a tu total aportado. No adelanta cuotas: el acceso a los beneficios es con la cuota mensual.
            </p>
          </div>

          <AvisoSesion user={user} email={emailAportante} onEmailChange={setEmailAportante} />

          <Button
            onClick={handleOneTimeDonation}
            size="lg"
            variant="action"
            disabled={isProcessingDonation || isProcessingSubscription}
            className="w-full h-12 rounded-xl"
          >
            {isProcessingDonation ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Heart className="mr-2 h-5 w-5" />}
            Aportar una vez
          </Button>
        </div>
      )
    },
    {
      id: 'subscription',
      icon: HandshakeIcon,
      iconBg: 'bg-blue-100 text-brand-primary',
      title: 'Sumate cada mes',
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
            <Label htmlFor="subscription-plan" className="text-brand-dark font-semibold">Elegí cuánto aportar por mes</Label>
            <div className="relative mt-1">
              <select
                id="subscription-plan"
                value={subscriptionAmount}
                onChange={(event) => setSubscriptionAmount(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-10 text-lg text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                {subscriptionPlans.map((plan) => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
            {/* Regla 2026-10: un cobro mensual cubre UN mes, sea cual sea el monto. */}
            <p className="mt-2 text-sm text-gray-600">
              Cada cobro cubre un mes de cuota y te da acceso a los beneficios. Un monto mayor ayuda más, pero sigue cubriendo un mes.
            </p>
          </div>

          <AvisoSesion user={user} email={emailAportante} onEmailChange={setEmailAportante} />

          <Button
            onClick={handleSubscription}
            size="lg"
            disabled={isProcessingSubscription || isProcessingDonation}
            className="w-full font-bold h-12 text-white bg-brand-primary hover:bg-brand-dark shadow-md hover:shadow-lg transition-all rounded-xl"
          >
            {isProcessingSubscription ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <HandshakeIcon className="mr-2 h-5 w-5" />}
            Aportar ${Number(subscriptionAmount).toLocaleString('es-AR')} por mes
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
        <link rel="canonical" href={canonicalUrl(RUTAS.colaborar)} />
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
            className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 lg:py-16"
          >
            <div className="mb-3 sm:mb-6">
              <Eyebrow light>Colaboración</Eyebrow>
            </div>
            <h1 className="font-poppins font-bold text-3xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-3 sm:mb-6">
              Sostené la Fundación cada mes
            </h1>
            <p className="max-w-[36rem] text-base sm:text-lg leading-relaxed text-white/75">
              Tu aporte hace posible que sigamos creando oportunidades. Elegí cuánto aportar; también podés colaborar una sola vez.
            </p>
          </motion.div>
        </section>

        {/* --- OPCIONES DE COLABORACIÓN --- */}
        <section className="py-6 md:py-12 px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4">
              <div className="mb-2 sm:mb-4">
                <Eyebrow>Formas de colaborar</Eyebrow>
              </div>
              <h2 className="font-poppins font-bold text-2xl sm:text-3xl tracking-tight text-brand-dark">
                Elegí cómo sumarte
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5" role="group" aria-label="Forma de colaborar">
              {['subscription', 'donation', 'volunteer'].map((id) => collaborationOptions.find((option) => option.id === id)).map(option => (
                <button key={option.id} type="button" aria-pressed={selectedOption === option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`min-h-[72px] rounded-xl border px-2 py-3 text-sm font-semibold flex flex-col sm:flex-row items-center justify-center gap-2 transition-colors ${selectedOption === option.id ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-brand-dark border-gray-200 hover:bg-gray-50'}`}>
                  <option.icon className="h-5 w-5" aria-hidden="true" />
                  {option.id === 'subscription' ? 'Cada mes' : option.id === 'donation' ? 'Una vez' : 'Voluntariado'}
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
              <Card className="h-full w-full flex flex-col bg-white rounded-3xl border border-transparent shadow-lg overflow-hidden">
                    <CardHeader className="p-5 sm:p-8 pb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${option.iconBg}`}>
                        <option.icon className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-2xl font-poppins font-bold text-brand-dark">
                        {option.title}
                      </CardTitle>
                      {option.subtitle && <p className="text-sm font-bold text-gray-600 uppercase tracking-wide mt-1">{option.subtitle}</p>}
                    </CardHeader>

                    <CardContent className="p-5 sm:p-8 pt-2 flex-grow flex flex-col">
                      {option.description && <div className="text-gray-600 mb-4 leading-relaxed">{option.description}</div>}
                      {option.content}
                      {option.id !== 'volunteer' && (
                        <div className="mt-4 space-y-2 text-sm leading-relaxed text-gray-600">
                          <p className="flex items-start gap-2">
                            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                            <span>Pago seguro en Mercado Pago · {option.id === 'subscription' ? 'Cobro automático mensual' : 'Por única vez'}</span>
                          </p>
                          {option.id === 'subscription' && (
                            <p className="pl-6">
                              Podés pausar o cancelar desde <Link to={RUTAS.mi.cuenta} className="font-semibold text-brand-primary underline underline-offset-2">Mi panel</Link> si aportás con tu cuenta. Si aportás sin cuenta, <Link to={RUTAS.contacto} className="font-semibold text-brand-primary underline underline-offset-2">escribinos</Link> para gestionarlo.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/*
          --- TRANSFERENCIA DIRECTA ---

          ⚠️ POR QUÉ SE OFRECE ADEMÁS DEL LINK, Y QUÉ PIERDE CADA CAMINO.

          Por la pasarela, el donante da $100 y a la cuenta entran ~$94: la
          comisión se la lleva el intermediario. Por transferencia entra el 100%.
          Con el volumen de hoy son centavos; el día que entre una donación
          grande, no.

          Pero una transferencia **no pasa por el webhook**: no crea el aporte
          sola, no queda atada a la cuenta de quien donó —así que no habilita el
          acceso a Comunidad Evolución— y no trae a qué causa iba. Se registra al importar
          el extracto, y asignarla es trabajo humano.

          Por eso el texto invita a avisar: es lo único que recupera el destino y
          la identidad. Y por eso el link sigue primero en la página — para la
          mayoría de los donantes es mejor camino, aunque cueste la comisión.
        */}
        {entidad.pagos?.aliasTransferencia && (
          <section className="px-4 pb-8 md:pb-12" aria-labelledby="transferencia-titulo">
            <details className="group mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white shadow-sm open:border-brand-primary/25">
              <summary className="flex min-h-[88px] cursor-pointer list-none items-center gap-3 p-5 marker:content-none [&::-webkit-details-marker]:hidden sm:p-7">
                <Landmark aria-hidden="true" className="h-6 w-6 shrink-0 text-brand-primary" />
                <span className="min-w-0 flex-1">
                  <span id="transferencia-titulo" role="heading" aria-level="3" className="block font-poppins text-xl font-bold text-brand-dark sm:text-2xl">
                    ¿Preferís transferir?
                  </span>
                  <span className="mt-1 block text-sm text-gray-600">Ver datos para transferir sin comisión de procesamiento</span>
                </span>
                <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-primary transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-gray-100 px-5 pb-5 sm:px-7 sm:pb-7">

                {/* Los dos primeros llevan botón de copiar y los otros dos no, y
                    la diferencia es práctica: un alias y sobre todo un CVU de 22
                    dígitos se tipean mal; un nombre y un CUIT se leen para
                    confirmar, no para pegar. */}
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Alias', entidad.pagos.aliasTransferencia, true],
                    ['CVU', entidad.pagos.cvu, true],
                    ['Titular', entidad.pagos.titularCuenta, false],
                    ['CUIT', entidad.pagos.cuit, false],
                  ].filter(([, valor]) => Boolean(valor)).map(([label, valor, copiable]) => (
                    <div key={label} className={`rounded-xl p-4 ${copiable ? 'border border-brand-primary/15 bg-brand-primary/5' : 'bg-brand-sand'}`}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {label}
                      </dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className={`font-bold text-brand-dark break-all tabular-nums ${copiable ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
                          {valor}
                        </span>
                        {copiable && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={async () => {
                              try {
                                await copiarDato(valor);
                                toast({ title: `${label} copiado` });
                              } catch {
                                toast({ title: 'No se pudo copiar', description: 'Seleccioná el dato y copialo manualmente.', variant: 'destructive' });
                              }
                            }}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar
                          </Button>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* ⚠️ EL PÁRRAFO QUE CONVIERTE ESTOS DATOS EN UNA DEFENSA.
                    La estafa más común con un alias publicado es que alguien
                    difunda el suyo a nombre de una entidad. Publicar titular y
                    CUIT no sirve de nada si nadie sabe que tiene que mirarlos:
                    decirlo en una línea es lo que vuelve verificable al resto. */}
                <p className="mt-5 rounded-xl border border-brand-gold/30 bg-brand-gold/10 p-4 text-sm text-gray-700 leading-relaxed">
                  <strong className="text-brand-dark">Verificá antes de enviar.</strong> Al pegar
                  el alias, tu banco te va a mostrar el titular: tiene que decir exactamente{' '}
                  <strong className="text-brand-dark">{entidad.pagos.titularCuenta}</strong>. Si
                  dice otra cosa, no transfieras y avisanos.
                </p>

                <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                  <strong className="text-brand-dark">Después de transferir, avisanos.</strong> Decinos el monto y a qué destino querés asignarlo para poder identificar tu aporte. Las transferencias se registran manualmente; si buscás que el pago quede asociado a tu cuenta y a los beneficios, aportá desde el sitio.
                </p>

                <Button variant="link" className="text-brand-action font-bold p-0 h-auto mt-2" asChild>
                  <Link to={RUTAS.contacto}>Avisar de una transferencia →</Link>
                </Button>
              </div>
            </details>
          </section>
        )}

        <section className="bg-white px-4 py-10 md:py-16" aria-labelledby="transparencia-titulo">
          <div className="mx-auto grid max-w-5xl items-center gap-8 rounded-3xl border border-gray-100 bg-brand-sand px-5 py-8 shadow-sm sm:px-10 sm:py-10 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-12">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-green-800">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                Aporte seguro y transparente
              </div>
              <h3 id="transparencia-titulo" className="mx-auto mt-5 max-w-md font-poppins text-[28px] font-bold leading-tight text-brand-dark sm:text-3xl lg:mx-0">
                Tu ayuda, en buenas manos.
              </h3>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-gray-600 lg:mx-0">
                Los aportes desde este sitio se procesan con <strong className="text-brand-dark">Mercado Pago</strong>. La Fundación forma parte de <strong className="text-brand-dark">Mercado Libre Solidario</strong> y podés consultar cómo se usan los fondos.
              </p>
              <ul className="mx-auto mt-6 inline-grid gap-3 text-left text-sm text-gray-700 lg:mx-0">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
                  Pago seguro a través de Mercado Pago.
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
                  Rendición de cuentas disponible para consultar.
                </li>
              </ul>
              <div className="mt-6">
                <Link to={RUTAS.transparencia.rendicion} className="inline-flex min-h-11 items-center gap-2 text-base font-bold text-brand-action underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
                  Mirá la rendición de cuentas
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-[26px] border border-gray-100 bg-white p-4 shadow-[0_12px_35px_-22px_rgba(15,41,74,0.35)] sm:p-6">
              <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-[#f7f7f7]">
                <img
                  className="absolute left-0 top-1/2 h-auto w-full -translate-y-1/2"
                  alt="Mercado Libre Solidario"
                  src="/img/mercadolibre_solidario.webp"
                  width="1200"
                  height="800"
                  loading="lazy"
                  decoding="async"
                />
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
