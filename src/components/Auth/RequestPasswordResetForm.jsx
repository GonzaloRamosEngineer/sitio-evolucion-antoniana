import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const RequestPasswordResetForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { sendPasswordResetEmail } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      toast({
        title: "Correo Enviado",
        description: "Si existe una cuenta con ese email, recibirás instrucciones para reestablecer tu contraseña.",
        className: "bg-celeste-complementario border-primary-antoniano text-primary-antoniano"
      });
      setEmail(''); 
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo de reestablecimiento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-128px)] flex items-center justify-center bg-gradient-to-br from-blanco-fundacion to-celeste-complementario/30 px-4 py-12"
    >
      <Card className="w-full max-w-md shadow-2xl border-border bg-card/90 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <CardTitle className="text-3xl font-poppins font-bold text-primary-antoniano">
              Reestablecer Contraseña
            </CardTitle>
          </motion.div>
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <CardDescription className="text-muted-foreground">
              Ingresa tu email y te enviaremos un enlace para reestablecerla.
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-2">
              <Label htmlFor="email" className="text-marron-legado">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-border focus:border-primary-antoniano focus:ring-primary-antoniano"
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <Button
                type="submit"
                className="w-full bg-primary-antoniano text-white hover:bg-primary-antoniano/90 transition-all duration-300 ease-in-out transform hover:scale-105"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Enlace'}
              </Button>
            </motion.div>
          </form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 text-center">
            <Link
              to="/login"
              className="text-sm font-medium text-primary-antoniano hover:underline inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver a Iniciar Sesión
            </Link>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RequestPasswordResetForm;