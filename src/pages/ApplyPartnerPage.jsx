// src/pages/ApplyPartnerPage.jsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Mail, Globe, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { addPartner } from '@/lib/storage';
import { Honeypot } from '@/components/Forms/Honeypot';

const urlSchema = z.string().url();

/** URL opcional: acepta vacío, pero si hay algo tiene que ser una URL completa. */
const optionalUrl = (message) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || urlSchema.safeParse(value).success, { message });

const partnerSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresá el nombre de la organización'),
  descripcion: z
    .string()
    .trim()
    .min(20, 'Contanos en al menos 20 caracteres sobre tu organización y la alianza que buscás'),
  contacto_email: z.string().trim().email('Ingresá un email válido'),
  sitio_web: optionalUrl('Ingresá una URL completa (https://...)'),
  logo_url: optionalUrl('Ingresá el enlace directo a la imagen (https://...)'),
});

const emptyPartner = {
  nombre: '',
  descripcion: '',
  sitio_web: '',
  contacto_email: '',
  logo_url: '',
};

const ApplyPartnerPage = () => {
  const navigate = useNavigate();
  // El honeypot no se valida ni se envía: queda fuera del form de RHF a propósito.
  const [website, setWebsite] = useState('');
  // Ventana entre el toast de éxito y el redirect: el botón sigue bloqueado.
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(partnerSchema),
    defaultValues: emptyPartner,
  });

  const busy = isSubmitting || isRedirecting;

  const finishWithSuccess = () => {
    toast({
      title: '¡Solicitud enviada! 🎉',
      description: 'Tu postulación será revisada por nuestro equipo. Te contactaremos pronto.',
      className: 'bg-green-600 text-white border-none'
    });
    setIsRedirecting(true);
    setTimeout(() => navigate('/partners'), 2000);
  };

  const onSubmit = async (data) => {
    if (website) {
      // Bot detectado: simular éxito sin escribir en la base
      finishWithSuccess();
      return;
    }

    const { error } = await addPartner({ ...data, estado: 'pendiente' });

    if (error) {
      toast({
        title: 'No pudimos enviar tu solicitud',
        description: 'Ocurrió un error al guardar la postulación. Intentalo de nuevo en unos minutos.',
        variant: 'destructive',
      });
      return;
    }

    finishWithSuccess();
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-sand font-sans">
      <Helmet>
        <title>Postularse como Partner - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Únete a nuestra red de partners y colabora con el desarrollo social de la comunidad"
        />
      </Helmet>

      {/* Fix autofill colors */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--brand-dark);
          -webkit-box-shadow: 0 0 0px 1000px #fff inset;
          transition: background-color 9999s ease-out 0s;
        }
      `}</style>

      <div className="flex-1">
        {/* --- HERO SECTION --- */}
        <section className="relative bg-brand-primary overflow-hidden py-20 px-4">
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            </div>

            <div className="relative max-w-4xl mx-auto text-center z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-6">
                        <Building2 className="w-4 h-4 text-brand-gold" />
                        <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Únete a la Red</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-poppins font-bold text-white mb-6">
                        Postular como <span className="text-brand-gold">Partner</span>
                    </h1>
                    <p className="text-xl text-gray-200 leading-relaxed max-w-2xl mx-auto">
                        Suma a tu organización a nuestra misión y colabora directamente con el desarrollo tecnológico y social de la comunidad.
                    </p>
                </motion.div>
            </div>
        </section>

        {/* --- FORMULARIO --- */}
        <section className="py-16 px-4 -mt-10 relative z-20">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100"
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative" noValidate>
                <Honeypot value={website} onChange={(e) => setWebsite(e.target.value)} />
                <div>
                  <Label htmlFor="partner-nombre" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                    Nombre de la Organización *
                  </Label>
                  <div className="relative">
                      <Building2 aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="partner-nombre"
                        type="text"
                        placeholder="Ej: Empresa ABC S.A."
                        className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                        disabled={busy}
                        {...register('nombre')}
                      />
                  </div>
                  {errors.nombre && (
                    <p className="text-sm text-red-600 mt-2">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="partner-descripcion" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                    Descripción *
                  </Label>
                  <Textarea
                    id="partner-descripcion"
                    placeholder="Contanos brevemente sobre tu organización y qué tipo de alianza te interesa..."
                    rows={5}
                    className="bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl p-4"
                    disabled={busy}
                    {...register('descripcion')}
                  />
                  {errors.descripcion && (
                    <p className="text-sm text-red-600 mt-2">{errors.descripcion.message}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="partner-email" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                            Email de Contacto *
                        </Label>
                        <div className="relative">
                            <Mail aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                id="partner-email"
                                type="email"
                                placeholder="contacto@empresa.com"
                                autoComplete="email"
                                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                                disabled={busy}
                                {...register('contacto_email')}
                            />
                        </div>
                        {errors.contacto_email && (
                          <p className="text-sm text-red-600 mt-2">{errors.contacto_email.message}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="partner-sitio-web" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                            Sitio Web
                        </Label>
                        <div className="relative">
                            <Globe aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                id="partner-sitio-web"
                                type="url"
                                placeholder="https://www.empresa.com"
                                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                                disabled={busy}
                                {...register('sitio_web')}
                            />
                        </div>
                        {errors.sitio_web && (
                          <p className="text-sm text-red-600 mt-2">{errors.sitio_web.message}</p>
                        )}
                    </div>
                </div>

                <div>
                  <Label htmlFor="partner-logo-url" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                    URL del Logo (Opcional)
                  </Label>
                  <Input
                    id="partner-logo-url"
                    type="url"
                    placeholder="https://ejemplo.com/logo.png"
                    className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                    disabled={busy}
                    {...register('logo_url')}
                  />
                  {errors.logo_url ? (
                    <p className="text-sm text-red-600 mt-2">{errors.logo_url.message}</p>
                  ) : (
                    <p className="text-xs text-gray-600 mt-2 ml-1">
                      Recomendamos un enlace directo a una imagen PNG o JPG cuadrada.
                    </p>
                  )}
                </div>

                <div className="pt-6">
                  <Button type="submit" size="lg" disabled={busy} variant="action" className="w-full h-14 text-lg rounded-xl">
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    {busy ? 'Enviando...' : 'Enviar Postulación'}
                  </Button>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 leading-tight">
                        Tu solicitud será revisada por nuestro equipo institucional. Nos pondremos en contacto vía email en un plazo máximo de 5 días hábiles.
                    </p>
                </div>
              </form>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ApplyPartnerPage;