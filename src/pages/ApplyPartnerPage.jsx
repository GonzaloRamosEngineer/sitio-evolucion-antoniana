// src/pages/ApplyPartnerPage.jsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Globe, FileText, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { addPartner } from '@/lib/storage';
import { Honeypot } from '@/components/Forms/Honeypot';

const ApplyPartnerPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [website, setWebsite] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    sitio_web: '',
    contacto_email: '',
    logo_url: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.nombre || !formData.descripcion || !formData.contacto_email) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (website) {
      // Bot detectado: simular éxito sin escribir en la base
      toast({
        title: '¡Solicitud enviada! 🎉',
        description: 'Tu postulación será revisada por nuestro equipo. Te contactaremos pronto.',
        className: 'bg-green-600 text-white border-none'
      });
      setTimeout(() => navigate('/partners'), 2000);
      return;
    }

    setIsSubmitting(true);
    const newPartner = { ...formData, estado: 'pendiente' };
    const created = await addPartner(newPartner);
    setIsSubmitting(false);

    if (!created) {
      toast({
        title: 'No pudimos enviar tu solicitud',
        description: 'Ocurrió un error al guardar la postulación. Intentalo de nuevo en unos minutos.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: '¡Solicitud enviada! 🎉',
      description: 'Tu postulación será revisada por nuestro equipo. Te contactaremos pronto.',
      className: 'bg-green-600 text-white border-none'
    });

    setTimeout(() => navigate('/partners'), 2000);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
              <form onSubmit={handleSubmit} className="space-y-6 relative">
                <Honeypot value={website} onChange={(e) => setWebsite(e.target.value)} />
                <div>
                  <Label htmlFor="nombre" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                    Nombre de la Organización *
                  </Label>
                  <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="nombre"
                        name="nombre"
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={handleChange}
                        placeholder="Ej: Empresa ABC S.A."
                        className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                      />
                  </div>
                </div>

                <div>
                  <Label htmlFor="descripcion" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                    Descripción *
                  </Label>
                  <div className="relative">
                      <Textarea
                        id="descripcion"
                        name="descripcion"
                        required
                        value={formData.descripcion}
                        onChange={handleChange}
                        placeholder="Cuéntanos brevemente sobre tu organización y qué tipo de alianza te interesa..."
                        rows={5}
                        className="bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl p-4"
                      />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="contacto_email" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                            Email de Contacto *
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                id="contacto_email"
                                name="contacto_email"
                                type="email"
                                required
                                value={formData.contacto_email}
                                onChange={handleChange}
                                placeholder="contacto@empresa.com"
                                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="sitio_web" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                            Sitio Web
                        </Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                                id="sitio_web"
                                name="sitio_web"
                                type="url"
                                value={formData.sitio_web}
                                onChange={handleChange}
                                placeholder="https://www.empresa.com"
                                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                            />
                        </div>
                    </div>
                </div>

                <div>
                  <Label htmlFor="logo_url" className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
                    URL del Logo (Opcional)
                  </Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    placeholder="https://ejemplo.com/logo.png"
                    className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    Recomendamos un enlace directo a una imagen PNG o JPG cuadrada.
                  </p>
                </div>

                <div className="pt-6">
                  <Button type="submit" size="lg" disabled={isSubmitting} variant="action" className="w-full h-14 text-lg rounded-xl">
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    {isSubmitting ? 'Enviando...' : 'Enviar Postulación'}
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