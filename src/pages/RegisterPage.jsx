import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Ingresá tu nombre completo'),
    phone: z.string().optional(),
    email: z.string().email('Ingresá un email válido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmá tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

const inputStyles =
  'h-11 bg-brand-sand/70 border-brand-dark/15 focus:bg-white focus:border-brand-primary focus:ring-brand-primary rounded-sm';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Estado independiente
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register: registerUser, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user) { navigate('/dashboard', { replace: true }); }
  }, [user, navigate]);

  const onSubmit = async (data) => {
    if (isSubmitting) return; // Bloqueo extra por seguridad

    setIsSubmitting(true);
    try {
      // Normalización de teléfono argentino (se conserva la lógica previa)
      let cleanPhone = (data.phone || '').replace(/\D/g, '');
      if (cleanPhone) {
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (!cleanPhone.startsWith('54')) cleanPhone = `549${cleanPhone}`;
      }

      await registerUser({
        name: data.name,
        email: data.email,
        phone: cleanPhone,
        password: data.password,
      });

      toast({
        title: 'Registro exitoso',
        description: 'Verificá tu email para activar la cuenta.',
        className: 'bg-brand-dark text-white border-none',
      });
      navigate('/login');
    } catch (error) {
      // Manejo inteligente del Rate Limit y otros errores
      let errorMsg = error.message || 'Error en el servidor.';
      if (errorMsg.includes('rate limit')) {
        errorMsg = 'Demasiados intentos. Por favor, esperá unos minutos.';
      }

      toast({
        title: 'Error de registro',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sand py-16 px-4">
      <Helmet>
        <title>Crear cuenta - Fundación Evolución Antoniana</title>
        <meta name="description" content="Creá tu cuenta en la Fundación Evolución Antoniana." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white border border-brand-dark/10 rounded-sm p-6 sm:p-10">
          <div className="text-center mb-8">
            <img
              src="/img/logotransparente.png"
              alt="Logo Fundación Evolución Antoniana"
              className="mx-auto w-20 h-20 object-contain mb-6"
            />
            <div className="flex justify-center mb-4">
              <Eyebrow>Registro</Eyebrow>
            </div>
            <h1 className="font-poppins font-bold text-3xl tracking-tight text-brand-dark mb-2">
              Creá tu cuenta
            </h1>
            <p className="text-gray-600">Sumate a la comunidad de la Fundación.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="text-brand-dark font-semibold">
                  Nombre completo
                </Label>
                <div className="relative">
                  <User
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <Input
                    id="reg-name"
                    placeholder="Ej: Juan Pérez"
                    autoComplete="name"
                    className={inputStyles + ' pl-10'}
                    disabled={isSubmitting}
                    {...register('name')}
                  />
                </div>
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone" className="text-brand-dark font-semibold">
                  WhatsApp <span className="font-normal text-gray-500">(opcional)</span>
                </Label>
                <div className="relative">
                  <Phone
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="387..."
                    autoComplete="tel"
                    className={inputStyles + ' pl-10'}
                    disabled={isSubmitting}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-brand-dark font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className={inputStyles + ' pl-10'}
                  disabled={isSubmitting}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-brand-dark font-semibold">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    autoComplete="new-password"
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm" className="text-brand-dark font-semibold">
                  Confirmar contraseña
                </Label>
                <div className="relative">
                  <Lock
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <Input
                    id="reg-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    autoComplete="new-password"
                    className={inputStyles + ' pl-10 pr-10'}
                    disabled={isSubmitting}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-primary transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="action"
                disabled={isSubmitting || authLoading}
                className="w-full h-12"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </div>
                ) : (
                  'Crear cuenta'
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-brand-dark/10 pt-6">
            <p className="text-sm text-gray-600">
              ¿Ya tenés una cuenta?{' '}
              <Link
                to="/login"
                className="font-semibold text-brand-action hover:underline underline-offset-4"
              >
                Iniciá sesión acá
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
