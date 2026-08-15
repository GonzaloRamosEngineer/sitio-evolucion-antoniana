// src/pages/Contact.jsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Honeypot } from '@/components/Forms/Honeypot';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { escapeHtml, escapeHtmlMultiline } from '@/lib/utils';
import { logger } from '@/lib/logger';

const contactChannels = [
  {
    icon: Phone,
    title: 'WhatsApp oficial',
    lines: [
      {
        text: '+54 387 213-1916',
        href: 'https://wa.me/543872131916?text=Hola%2C%20quiero%20consultar%20sobre%20la%20Fundación',
      },
      { text: 'Lunes a viernes, 9:00 a 18:00' },
    ],
  },
  {
    icon: Mail,
    title: 'Correo electrónico',
    lines: [
      { text: 'info@evolucionantoniana.com', href: 'mailto:info@evolucionantoniana.com' },
      { text: 'Respuesta en 24 horas hábiles' },
    ],
  },
  {
    icon: MapPin,
    title: 'Ubicación',
    lines: [{ text: 'Salta Capital, Argentina' }, { text: 'Visitas con cita previa' }],
  },
  {
    icon: Clock,
    title: 'Atención online',
    lines: [{ text: 'Lunes a viernes, 9:00 a 18:00' }],
  },
];

const faqs = [
  {
    question: '¿Cómo participo de las actividades?',
    answer:
      'Registrate gratis en nuestra web y postulate desde la sección "Actividades".',
  },
  {
    question: '¿Querés ser voluntario?',
    answer:
      'Escribinos por este formulario o postulate desde la sección "Colaborar".',
  },
];

const inputStyles =
  'h-11 bg-brand-sand/70 border-brand-dark/15 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-sm';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá tu nombre completo'),
  email: z.string().trim().email('Ingresá un email válido'),
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(3, 'Contanos brevemente el motivo de tu consulta'),
  message: z.string().trim().min(10, 'Escribinos un mensaje de al menos 10 caracteres'),
});

const emptyContact = { name: '', email: '', phone: '', subject: '', message: '' };

const Contact = () => {
  const reduceMotion = useReducedMotion();
  // El honeypot no se valida ni se envía: queda fuera del form de RHF a propósito.
  const [website, setWebsite] = useState('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: emptyContact,
  });

  const notifySent = () =>
    toast({
      title: '¡Mensaje enviado!',
      description: 'Gracias por contactarnos. Te responderemos pronto.',
      className: 'bg-green-600 text-white border-none',
    });

  const onSubmit = async (data) => {
    if (website) {
      // Bot detectado: simular éxito sin enviar nada
      notifySent();
      return;
    }

    const phone = data.phone || 'No proporcionado';
    const emailBody = `
      Nombre: ${data.name}
      Email: ${data.email}
      Teléfono: ${phone}
      Asunto: ${data.subject}
      Mensaje:
      ${data.message}
    `;

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          recipient_email: 'info@evolucionantoniana.com',
          subject: `Nuevo Mensaje de Contacto: ${data.subject}`,
          text_content: emailBody,
          html_content: `<p><strong>Nombre:</strong> ${escapeHtml(data.name)}</p>
                         <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
                         <p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>
                         <p><strong>Asunto:</strong> ${escapeHtml(data.subject)}</p>
                         <p><strong>Mensaje:</strong></p>
                         <p>${escapeHtmlMultiline(data.message)}</p>`,
          reply_to: data.email,
        },
      });

      if (error) throw error;

      notifySent();
      reset(emptyContact);
    } catch (error) {
      logger.error('Error sending contact email:', error);
      toast({
        title: 'Error al enviar mensaje',
        description:
          'Hubo un problema al enviar tu mensaje. Por favor, intentalo de nuevo más tarde.',
        variant: 'destructive',
      });
    }
  };

  const rise = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <div className="min-h-screen bg-brand-sand">
      <Helmet>
        <title>Contacto - Fundación Evolución Antoniana</title>
        <meta name="description" content="Comunicate con la Fundación Evolución Antoniana. Escribinos a info@evolucionantoniana.com." />
        <link rel="canonical" href="https://www.evolucionantoniana.com/contact" />
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
        <motion.div
          {...rise}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
        >
          <div className="mb-6">
            <Eyebrow light>Contacto</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
            Hablemos.
          </h1>
          <p className="max-w-[36rem] text-lg leading-relaxed text-white/75">
            Una consulta, una propuesta o simplemente un saludo: estamos para
            escucharte. Respondemos dentro de las 24 horas hábiles.
          </p>
        </motion.div>
      </section>

      {/* ============ FORMULARIO + CANALES ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Formulario */}
          <motion.div
            {...(reduceMotion ? {} : { ...rise, transition: { ...rise.transition, delay: 0.1 } })}
            className="lg:col-span-7 bg-white border border-brand-dark/10 rounded-sm p-6 sm:p-10"
          >
            <h2 className="font-poppins font-bold text-2xl tracking-tight text-brand-dark mb-2">
              Envianos un mensaje
            </h2>
            <p className="text-gray-600 mb-8">
              Completá el formulario y te respondemos a la brevedad.
            </p>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6 relative"
              noValidate
            >
              <Honeypot value={website} onChange={(e) => setWebsite(e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="text-brand-dark font-semibold">
                    Nombre completo
                  </Label>
                  <Input
                    id="contact-name"
                    placeholder="Tu nombre"
                    autoComplete="name"
                    className={inputStyles}
                    disabled={isSubmitting}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="text-brand-dark font-semibold">
                    Email
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className={inputStyles}
                    disabled={isSubmitting}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="text-brand-dark font-semibold">
                    Teléfono <span className="font-normal text-gray-500">(opcional)</span>
                  </Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="+54 387..."
                    autoComplete="tel"
                    className={inputStyles}
                    disabled={isSubmitting}
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-subject" className="text-brand-dark font-semibold">
                    Asunto
                  </Label>
                  <Input
                    id="contact-subject"
                    placeholder="Motivo de consulta"
                    className={inputStyles}
                    disabled={isSubmitting}
                    {...register('subject')}
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-600">{errors.subject.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-brand-dark font-semibold">
                  Mensaje
                </Label>
                <Textarea
                  id="contact-message"
                  rows={5}
                  className="bg-brand-sand/70 border-brand-dark/15 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-sm p-4"
                  placeholder="Escribí tu mensaje acá..."
                  disabled={isSubmitting}
                  {...register('message')}
                />
                {errors.message && (
                  <p className="text-sm text-red-600">{errors.message.message}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                variant="action"
                className="w-full h-12 font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar mensaje
              </Button>
            </form>
          </motion.div>

          {/* Canales + FAQ */}
          <motion.div
            {...(reduceMotion ? {} : { ...rise, transition: { ...rise.transition, delay: 0.2 } })}
            className="lg:col-span-5"
          >
            <div className="mb-5">
              <Eyebrow>Vías de comunicación</Eyebrow>
            </div>
            <ul>
              {contactChannels.map((channel) => (
                <li
                  key={channel.title}
                  className="border-t border-brand-dark/20 py-5 last:border-b"
                >
                  <div className="flex items-start gap-4">
                    <channel.icon
                      aria-hidden="true"
                      className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0"
                      strokeWidth={1.75}
                    />
                    <div>
                      <h3 className="font-poppins font-semibold text-brand-dark mb-1">
                        {channel.title}
                      </h3>
                      <div className="text-sm text-gray-600 leading-relaxed flex flex-col">
                        {channel.lines.map((line) =>
                          line.href ? (
                            <a
                              key={line.text}
                              href={line.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-brand-primary hover:text-brand-action transition-colors"
                            >
                              {line.text}
                            </a>
                          ) : (
                            <span key={line.text}>{line.text}</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Preguntas frecuentes */}
            <div className="mt-12">
              <div className="mb-5">
                <Eyebrow>Preguntas frecuentes</Eyebrow>
              </div>
              <ul>
                {faqs.map((faq) => (
                  <li
                    key={faq.question}
                    className="border-t border-brand-dark/20 py-5 last:border-b"
                  >
                    <p className="font-poppins font-semibold text-brand-dark mb-1.5">
                      {faq.question}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
