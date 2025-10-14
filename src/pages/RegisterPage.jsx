import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!authLoading) setIsSubmitting(false);
  }, [authLoading]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error de Registro",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      });
      return;
    }
    if (formData.password.length < 6) {
      toast({
        title: "Error de Registro",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });
      toast({
        title: "¡Registro Exitoso!",
        description: "Tu cuenta ha sido creada. Por favor, revisa tu email para verificarla.",
        className: "bg-celeste-complementario border-primary-antoniano text-primary-antoniano"
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Error de Registro",
        description: error.message || "No se pudo completar el registro.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };
  
  const formDisabled = isSubmitting || authLoading;
  const buttonText = formDisabled ? 'Creando cuenta...' : 'Crear Cuenta';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-[calc(100vh-128px)] flex items-center justify-center bg-gradient-to-br from-blanco-fundacion to-celeste-complementario/30 px-4 py-12"
    >
      {/* CONTRASTE: fondo claro dentro de la card + bordes definidos */}
      <Card className="w-full max-w-lg shadow-2xl border border-slate-200 bg-white/95 backdrop-blur-sm dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="space-y-1 text-center">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            {/* CONTRASTE: título bien oscuro en light, claro en dark por el tema tailwind */}
            <CardTitle className="text-3xl font-poppins font-bold text-gray-900 dark:text-slate-100">
              Crear Cuenta
            </CardTitle>
          </motion.div>
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            {/* CONTRASTE: texto secundario más legible */}
            <CardDescription className="text-gray-600 dark:text-slate-300">
              Únete a nuestra comunidad y accede a todas las actividades.
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="space-y-2">
                {/* CONTRASTE: labels más oscuros */}
                <Label htmlFor="name" className="text-gray-800 dark:text-slate-200">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                  {/* CONTRASTE: fondo input claro, texto oscuro */}
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-slate-400 border-slate-300 focus:border-primary-antoniano focus:ring-primary-antoniano"
                    required
                    disabled={formDisabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-800 dark:text-slate-200">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+54 387 XXXXXXX"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-slate-400 border-slate-300 focus:border-primary-antoniano focus:ring-primary-antoniano"
                    disabled={formDisabled}
                  />
                </div>
              </div>
            </motion.div>
            
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-2">
              <Label htmlFor="email" className="text-gray-800 dark:text-slate-200">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-slate-400 border-slate-300 focus:border-primary-antoniano focus:ring-primary-antoniano"
                  required
                  disabled={formDisabled}
                />
              </div>
            </motion.div>

            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-800 dark:text-slate-200">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-slate-400 border-slate-300 focus:border-primary-antoniano focus:ring-primary-antoniano"
                    required
                    disabled={formDisabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-600 dark:text-slate-300 hover:bg-celeste-complementario"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    disabled={formDisabled}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-800 dark:text-slate-200">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 dark:text-slate-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-slate-400 border-slate-300 focus:border-primary-antoniano focus:ring-primary-antoniano"
                    required
                    disabled={formDisabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-600 dark:text-slate-300 hover:bg-celeste-complementario"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    disabled={formDisabled}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
            
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
              <Button
                type="submit"
                className="w-full bg-primary-antoniano text-white hover:bg-primary-antoniano/90 transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
                disabled={formDisabled}
              >
                {formDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {buttonText}
              </Button>
            </motion.div>
          </form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-antoniano hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RegisterPage;
