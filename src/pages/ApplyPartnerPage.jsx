import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Globe, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { addPartner } from '@/lib/storage';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';

const ApplyPartnerPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    sitio_web: '',
    contacto_email: '',
    logo_url: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre || !formData.descripcion || !formData.contacto_email) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    const newPartner = { ...formData, estado: 'pendiente' };

    await addPartner(newPartner);

    toast({
      title: '¡Solicitud enviada! 🎉',
      description:
        'Tu postulación será revisada por nuestro equipo. Te contactaremos pronto.',
    });

    setTimeout(() => {
      navigate('/partners');
    }, 2000);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Postularse como Partner - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Únete a nuestra red de partners y colabora con el desarrollo social de la comunidad"
        />
      </Helmet>

      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 text-white py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-5xl font-bold mb-4">Postularse como Partner</h1>
              <p className="text-xl text-blue-100">
                Únete a nuestra red de aliados y contribuye al desarrollo de la comunidad
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="nombre" className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4" />
                    Nombre de la Organización *
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Empresa ABC S.A."
                  />
                </div>

                <div>
                  <Label htmlFor="descripcion" className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Descripción *
                  </Label>
                  <Textarea
                    id="descripcion"
                    name="descripcion"
                    required
                    value={formData.descripcion}
                    onChange={handleChange}
                    placeholder="Cuéntanos sobre tu organización y cómo deseas colaborar..."
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="contacto_email" className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4" />
                    Email de Contacto *
                  </Label>
                  <Input
                    id="contacto_email"
                    name="contacto_email"
                    type="email"
                    required
                    value={formData.contacto_email}
                    onChange={handleChange}
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div>
                  <Label htmlFor="sitio_web" className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4" />
                    Sitio Web
                  </Label>
                  <Input
                    id="sitio_web"
                    name="sitio_web"
                    type="url"
                    value={formData.sitio_web}
                    onChange={handleChange}
                    placeholder="https://www.empresa.com"
                  />
                </div>

                <div>
                  <Label htmlFor="logo_url" className="mb-2 block">
                    URL del Logo (opcional)
                  </Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    placeholder="https://ejemplo.com/logo.png"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Proporciona un enlace a tu logo en formato PNG o JPG
                  </p>
                </div>

                <div className="pt-4">
                  <Button type="submit" size="lg" className="w-full">
                    <Send className="mr-2 h-5 w-5" />
                    Enviar Postulación
                  </Button>
                </div>

                <p className="text-sm text-gray-500 text-center">
                  * Campos obligatorios. Tu solicitud será revisada en un plazo de 5 días hábiles.
                </p>
              </form>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ApplyPartnerPage;
