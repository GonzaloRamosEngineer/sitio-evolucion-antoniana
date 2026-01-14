// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\Contact.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Phone, MapPin, Clock, Send, Loader2, MessageSquare } from 'lucide-react';
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
        className: 'bg-green-600 text-white border-none'
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
        description: 'Hubo un problema al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Ubicación',
      details: ['Salta Capital, Argentina', 'Visitas con cita previa'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Phone,
      title: 'WhatsApp Oficial',
      details: ['+54 387 213-1916', 'Lun a Vie 9:00 - 18:00'],
      href: 'https://wa.me/543872131916?text=Hola%2C%20quiero%20consultar%20sobre%20la%20Fundación',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Mail,
      title: 'Correo Electrónico',
      details: ['info@evolucionantoniana.com'],
      href: 'mailto:info@evolucionantoniana.com',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: Clock,
      title: 'Atención Online',
      details: ['Lunes a Viernes: 9:00 - 18:00', 'Respuesta en 24hs hábiles'],
      color: 'from-orange-500 to-amber-500'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-sand font-sans">
      
      {/* --- HERO SECTION --- */}
      <section className="relative bg-brand-primary overflow-hidden py-20 px-4">
        <div className="absolute inset-0">
            <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center z-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-6">
                    <MessageSquare className="w-4 h-4 text-brand-gold" />
                    <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Canal Directo</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-poppins font-bold text-white mb-6">
                    Contáctanos
                </h1>
                <p className="text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
                    Estamos aquí para escucharte. Ya sea una consulta, una propuesta o simplemente para saludar.
                </p>
            </motion.div>
        </div>
      </section>

      {/* --- MAIN CONTENT --- */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            
            {/* Formulario */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-transparent shadow-xl bg-white rounded-3xl overflow-hidden">
                <CardHeader className="bg-brand-dark p-8 text-white">
                  <CardTitle className="text-2xl font-poppins font-bold">Envíanos un mensaje</CardTitle>
                  <CardDescription className="text-gray-300">
                    Completa el formulario y te responderemos a la brevedad.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-brand-dark font-semibold">Nombre completo</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Tu nombre"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-brand-dark font-semibold">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-brand-dark font-semibold">Teléfono (Opcional)</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+54 387..."
                          value={formData.phone}
                          onChange={handleChange}
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-brand-dark font-semibold">Asunto</Label>
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="Motivo de consulta"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-brand-dark font-semibold">Mensaje</Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={5}
                        className="bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl p-4"
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
                      className="w-full h-12 font-bold text-white bg-brand-action hover:bg-red-800 rounded-xl shadow-md transition-all"
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

            {/* Info y FAQ */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-10"
            >
              <div>
                <h2 className="text-2xl font-poppins font-bold text-brand-dark mb-6">
                  Vías de Comunicación
                </h2>
                <div className="grid gap-4">
                  {contactInfo.map((info, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ y: -2 }}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center text-white shadow-md`}>
                        <info.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-brand-dark">{info.title}</h3>
                        <div className="text-sm text-gray-600 flex flex-col">
                            {info.details.map((detail, i) => (
                                info.href && i === 0 ? (
                                    <a key={i} href={info.href} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary hover:underline font-medium">
                                        {detail}
                                    </a>
                                ) : (
                                    <span key={i}>{detail}</span>
                                )
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* FAQ Mini */}
              <div className="bg-brand-primary/5 rounded-3xl p-8 border border-brand-primary/10">
                 <h3 className="text-xl font-bold text-brand-dark mb-4">Preguntas Frecuentes</h3>
                 <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <p className="font-bold text-brand-primary text-sm mb-1">¿Cómo participo de las actividades?</p>
                        <p className="text-sm text-gray-600">Regístrate gratis en nuestra web y postúlate a las actividades desde la sección "Actividades".</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <p className="font-bold text-brand-primary text-sm mb-1">¿Quiero ser voluntario?</p>
                        <p className="text-sm text-gray-600">¡Genial! Escríbenos por este formulario o postúlate en la sección "Colaborar".</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;