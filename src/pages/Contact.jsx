// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\Contact.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Phone, MapPin, Clock, Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
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
          recipient_email: 'info@evolucionantoniana.com', // destinatario final
          subject: `Nuevo Mensaje de Contacto: ${formData.subject}`,
          text_content: emailBody,
          html_content: `<p><strong>Nombre:</strong> ${formData.name}</p>
                         <p><strong>Email:</strong> ${formData.email}</p>
                         <p><strong>Teléfono:</strong> ${formData.phone || 'No proporcionado'}</p>
                         <p><strong>Asunto:</strong> ${formData.subject}</p>
                         <p><strong>Mensaje:</strong></p>
                         <p>${formData.message.replace(/\n/g, '<br>')}</p>`,
          reply_to: formData.email, // para que “Responder” vaya al visitante
        },
      });

      if (error) throw error;

      toast({
        title: '¡Mensaje enviado!',
        description: 'Gracias por contactarnos. Te responderemos pronto.'
      });

      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Error sending contact email:', error);
      toast({
        title: 'Error al enviar mensaje',
        description:
          'Hubo un problema al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde o contáctanos directamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Dirección',
      details: ['Salta Capital, Argentina', 'Visitas con cita previa']
    },
    {
      icon: Phone,
      title: 'Teléfono (WhatsApp)',
      details: ['+54 387 213-1916', 'Lunes a Viernes 9:00 - 18:00'],
      href: 'https://wa.me/543872131916?text=Hola%2C%20quiero%20consultar%20sobre%20la%20Fundación'
    },
    {
      icon: Mail,
      title: 'Email',
      details: ['info@evolucionantoniana.com'],
      href: 'mailto:info@evolucionantoniana.com'
    },
    {
      icon: Clock,
      title: 'Horarios de Atención Online',
      details: ['Lunes a Viernes: 9:00 - 18:00', 'Sábados: Consultas por email']
    }
  ];

  return (
    <div className="min-h-screen bg-blanco-fundacion">
      <section className="py-20 md:py-28 text-center bg-gradient-to-b from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion hero-pattern">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-4xl md:text-5xl lg:text-6xl font-poppins font-extrabold text-primary-antoniano mb-6 text-balance"
          >
            Contáctanos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="text-lg md:text-xl text-marron-legado/90 max-w-3xl mx-auto leading-relaxed text-balance"
          >
            Estamos aquí para ayudarte. Ponte en contacto con nosotros para cualquier consulta, sugerencia o para
            conocer más sobre nuestros programas.
          </motion.p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <Card className="border-primary-antoniano/20 shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl font-poppins text-primary-antoniano">Envíanos un mensaje</CardTitle>
                  <CardDescription className="text-marron-legado/80">
                    Completa el formulario y nos pondremos en contacto contigo lo antes posible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-marron-legado font-medium">
                          Nombre completo
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Tu nombre"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="border-celeste-complementario focus:ring-primary-antoniano focus:border-primary-antoniano"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-marron-legado font-medium">
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
                          className="border-celeste-complementario focus:ring-primary-antoniano focus:border-primary-antoniano"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-marron-legado font-medium">
                          Teléfono (Opcional)
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+54 387 XXX-XXXX"
                          value={formData.phone}
                          onChange={handleChange}
                          className="border-celeste-complementario focus:ring-primary-antoniano focus:border-primary-antoniano"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="subject" className="text-marron-legado font-medium">
                          Asunto
                        </Label>
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="Motivo de tu consulta"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="border-celeste-complementario focus:ring-primary-antoniano focus:border-primary-antoniano"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-marron-legado font-medium">
                        Mensaje
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={5}
                        className="border-celeste-complementario focus:ring-primary-antoniano focus:border-primary-antoniano"
                        placeholder="Escribe tu mensaje aquí..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="antoniano"
                      size="lg"
                      className="w-full text-white"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 mr-2" />
                      )}
                      Enviar Mensaje
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-poppins font-bold text-primary-antoniano mb-4">
                  Información de Contacto
                </h2>
                <p className="text-marron-legado/80 mb-8 leading-relaxed">
                  Estamos ubicados en Salta Capital y siempre dispuestos a atenderte. No dudes en visitarnos (con cita
                  previa) o contactarnos por cualquiera de estos medios.
                </p>
              </div>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                  >
                    <Card className="border-celeste-complementario/30 shadow-lg card-hover bg-white hover:bg-celeste-complementario/5 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-antoniano to-celeste-complementario rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                            <info.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-poppins font-semibold text-primary-antoniano mb-1">{info.title}</h3>
                            {info.details.map((detail, detailIndex) => (
                              <p key={detailIndex} className="text-marron-legado/80 text-sm">
                                {info.href && detailIndex === 0 ? (
                                  <a
                                    href={info.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary-antoniano hover:underline transition-colors"
                                  >
                                    {detail}
                                  </a>
                                ) : (
                                  detail
                                )}
                              </p>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-celeste-complementario/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-poppins font-bold text-primary-antoniano mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-xl text-marron-legado/80 max-w-3xl mx-auto leading-relaxed">
              Encuentra respuestas a las consultas más comunes sobre nuestra fundación y servicios.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                q: '¿Cómo puedo participar en las actividades?',
                a: 'Puedes registrarte en nuestras actividades a través de la página web. Solo necesitas crear una cuenta y seleccionar las actividades de tu interés.'
              },
              {
                q: '¿Qué beneficio tengo al registrarme?',
                a: 'Los miembros de la Red Solidaria Evolución Antoniana obtienen descuentos en actividades, acceso anticipado a eventos, certificados digitales y contenido exclusivo.'
              },
              {
                q: '¿Cómo puedo ser voluntario?',
                a: 'Contáctanos a través de este formulario o por email expresando tu interés. Te informaremos sobre las oportunidades de voluntariado disponibles.'
              },
              {
                q: '¿Las actividades tienen costo?',
                a: 'Algunas actividades son gratuitas y otras tienen un costo simbólico. Los miembros siempre obtienen descuentos especiales en todas las actividades pagas.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
              >
                <Card className="h-full border-primary-antoniano/20 shadow-lg bg-blanco-fundacion">
                  <CardHeader>
                    <CardTitle className="text-lg font-poppins text-primary-antoniano">{faq.q}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-marron-legado/80 leading-relaxed">{faq.a}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
