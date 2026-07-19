import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

const inputStyles =
  'h-11 bg-brand-sand/70 border-brand-dark/15 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-sm';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loading: authProviderLoading, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Si llegó redirigido desde una página protegida, volvemos ahí. Si no, el
  // destino depende del rol: cada perfil aterriza en su portal.
  const from = location.state?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (isAuthenticated && !authProviderLoading) {
      const role = user?.role;
      const landingByRole =
        role === 'comision_directiva' ? '/comision'
        : role === 'educacion_manager' ? '/admin/education'
        : role === 'admin' ? '/admin'
        : '/dashboard';
      navigate(from || landingByRole, { replace: true });
    }
  }, [isAuthenticated, authProviderLoading, navigate, from, user]);

  const onSubmit = async (data) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast({
        title: 'Sesión iniciada',
        description: 'Te damos la bienvenida a la Fundación.',
        className: 'bg-brand-dark text-white border-none',
      });
    } catch (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message || 'Credenciales inválidas.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sand p-4">
      <Helmet>
        <title>Iniciar sesión - Fundación Evolución Antoniana</title>
        <meta name="description" content="Accedé a tu cuenta de la Fundación Evolución Antoniana." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-brand-dark/10 rounded-sm p-6 sm:p-10">
          <div className="text-center mb-8">
            <img
              src="/img/logotransparente.png"
              alt="Logo Fundación Evolución Antoniana"
              className="mx-auto w-20 h-20 object-contain mb-6"
            />
            <div className="flex justify-center mb-4">
              <Eyebrow>Acceso</Eyebrow>
            </div>
            <h1 className="font-poppins font-bold text-3xl tracking-tight text-brand-dark mb-2">
              Iniciá sesión
            </h1>
            <p className="text-gray-600">Accedé a tu cuenta de la Fundación.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-brand-dark font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className={inputStyles + ' pl-10'}
                  disabled={isSubmitting}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-brand-dark font-semibold">
                Contraseña
              </Label>
              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={inputStyles + ' pl-10 pr-10'}
                  disabled={isSubmitting}
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="pt-2 space-y-4">
              <Button
                type="submit"
                variant="action"
                disabled={isSubmitting}
                className="w-full h-12"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
              <div className="flex justify-center">
                <Link
                  to="/request-password-reset"
                  className="text-sm text-gray-600 hover:text-brand-primary transition-colors"
                >
                  ¿Olvidaste tu contraseña? Recuperá tu cuenta
                </Link>
              </div>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-brand-dark/10 pt-6">
            <p className="text-sm text-gray-600">
              ¿No tenés cuenta?{' '}
              <Link
                to="/register"
                className="font-semibold text-brand-action hover:underline underline-offset-4"
              >
                Registrate acá
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
