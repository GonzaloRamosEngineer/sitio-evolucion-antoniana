import React from 'react';
// Este componente ya no se usa directamente en las rutas, 
// su lógica ha sido movida a src/pages/LoginPage.jsx.
// Podría ser eliminado o refactorizado si se necesitara un componente de formulario reutilizable.
// Por ahora, lo dejamos como estaba, pero no será renderizado por App.jsx.

// Para evitar errores si algún otro archivo lo importa por error, devolvemos un fragmento vacío o un placeholder.
// O mejor aún, si estás seguro de que no se usa, puedes pedirme que lo elimine en una futura instrucción.
// Por ahora, para cumplir con "dejar cada componente visualmente idéntico, pero funcionalmente separados"
// (aunque la funcionalidad se ha movido a la *página*), se puede dejar intacto,
// pero es importante notar que App.jsx ya no lo referenciará para las rutas /login.

// Manteniendo el contenido original por si se quiere reutilizar como componente puro de UI en el futuro.
// Sin embargo, la lógica de estado y envío ahora está en LoginPage.jsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
  const { login, loading: authLoading } = useAuth(); 
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingForm(true);

    try {
      await login(formData.email, formData.password);
      toast({
        title: "¡Bienvenido/a!",
        description: "Has iniciado sesión correctamente.",
        className: "bg-celeste-complementario border-primary-antoniano text-primary-antoniano"
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error de Inicio de Sesión",
        description: error.message || 'Credenciales inválidas o error en el servidor.',
        variant: "destructive",
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const effectiveLoading = isSubmittingForm || authLoading;

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
              Iniciar Sesión
            </CardTitle>
          </motion.div>
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <CardDescription className="text-muted-foreground">
              Ingresa tus credenciales para acceder a tu cuenta.
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
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 border-border focus:border-primary-antoniano focus:ring-primary-antoniano"
                  required
                  disabled={effectiveLoading}
                />
              </div>
            </motion.div>

            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-marron-legado">Contraseña</Label>
                <Link
                  to="/request-password-reset"
                  className="text-sm text-primary-antoniano hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 border-border focus:border-primary-antoniano focus:ring-primary-antoniano"
                  required
                  disabled={effectiveLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-celeste-complementario"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  disabled={effectiveLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
              <Button
                type="submit"
                className="w-full bg-primary-antoniano text-white hover:bg-primary-antoniano/90 transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center"
                disabled={effectiveLoading}
              >
                {effectiveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {effectiveLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </motion.div>
          </form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-antoniano hover:underline"
              >
                Regístrate aquí
              </Link>
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default LoginForm;