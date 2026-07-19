// src/pages/Contact.jsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
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

const Contact = () => {
  const reduceMotion = useReducedMotion();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [website, setWebsite] = useState('');
  const { toast } = useToast();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (website) {
      // Bot detectado: simular éxito sin enviar nada
      toast({
        title: '¡Mensaje enviado!',
        description: 'Gracias por contactarnos. Te responderemos pronto.',
        className: 'bg-green-600 text-white border-none',
      });
      return;
    }
    setLoading(true);

    const emailBody = `
      Nombre: ${formData.name}
      Email: ${formData.email}
      Teléfono: ${formData.phone || 'No proporcionado'}
      Asunto: ${formData.subject}
      Mensaje:
      ${formData.message}
    `;

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          recipient_email: 'info@evolucionantoniana.com',
          subject: `Nuevo Mensaje de Contacto: ${formData.subject}`,
          text_content: emailBody,
          html_content: `<p><strong>Nombre:</strong> ${formData.name}</p>
                         <p><strong>Email:</strong> ${formData.email}</p>
                         <p><strong>Teléfono:</strong> ${formData.phone || 'No proporcionado'}</p>
                         <p><strong>Asunto:</strong> ${formData.subject}</p>
                         <p><strong>Mensaje:</strong></p>
                         <p>${formData.message.replace(/\n/g, '<br>')}</p>`,
          reply_to: formData.email,
        },
      });

      if (error) throw error;

      toast({
        title: '¡Mensaje enviado!',
        description: 'Gracias por contactarnos. Te responderemos pronto.',
        className: 'bg-green-600 text-white border-none',
      });

      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error('Error sending contact email:', error);
      toast({
        title: 'Error al enviar mensaje',
        description:
          'Hubo un problema al enviar tu mensaje. Por favor, intentalo de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

            <form onSubmit={handleSubmit} className="space-y-6 relative">
              <Honeypot value={website} onChange={(e) => setWebsite(e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-brand-dark font-semibold">
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={inputStyles}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-brand-dark font-semibold">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={inputStyles}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-brand-dark font-semibold">
                    Teléfono <span className="font-normal text-gray-500">(opcional)</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+54 387..."
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputStyles}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-brand-dark font-semibold">
                    Asunto
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Motivo de consulta"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className={inputStyles}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-brand-dark font-semibold">
                  Mensaje
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="bg-brand-sand/70 border-brand-dark/15 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-sm p-4"
                  placeholder="Escribí tu mensaje acá..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 font-semibold text-white bg-brand-action hover:bg-red-800 shadow-none"
                disabled={loading}
              >
                {loading ? (
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
