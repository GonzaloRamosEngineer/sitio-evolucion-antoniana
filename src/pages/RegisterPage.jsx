import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, UserPlus } from 'lucide-react';
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
        className: "bg-green-600 text-white border-none"
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
    <div className="min-h-screen flex items-center justify-center bg-brand-sand relative overflow-hidden p-4 font-sans py-12">
      
      {/* Fondo Decorativo Tech */}
      <div className="absolute inset-0">
         <div className="absolute inset-0 bg-brand-primary opacity-5"></div>
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
         
         {/* Orbes de luz */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-action/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="shadow-2xl border-none bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden">
          
          {/* Header con Marca */}
          <CardHeader className="space-y-2 text-center pt-10 pb-6 bg-white/50 border-b border-gray-100">
            <div className="mx-auto w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/30 mb-4 text-white">
                <UserPlus className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl font-poppins font-bold text-brand-dark">
              Únete a la Comunidad
            </CardTitle>
            <CardDescription className="text-gray-500 text-base">
              Crea tu cuenta para acceder a beneficios y actividades exclusivas.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-brand-dark font-semibold">Nombre Completo</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-12 h-11 bg-white border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                        required
                        disabled={formDisabled}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-brand-dark font-semibold">Teléfono</Label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+54 9 ..."
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-12 h-11 bg-white border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                        disabled={formDisabled}
                      />
                    </div>
                  </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-brand-dark font-semibold">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-12 h-11 bg-white border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                    required
                    disabled={formDisabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-brand-dark font-semibold">Contraseña</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-12 pr-10 h-11 bg-white border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                        required
                        disabled={formDisabled}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={formDisabled}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-brand-dark font-semibold">Confirmar</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-12 pr-10 h-11 bg-white border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                        required
                        disabled={formDisabled}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={formDisabled}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-12 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-95"
                  disabled={formDisabled}
                >
                  {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creando cuenta...
                    </>
                  ) : (
                    buttonText
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-500">
                ¿Ya tienes una cuenta?{' '}
                <Link
                  to="/login"
                  className="font-bold text-brand-action hover:text-brand-dark transition-colors underline decoration-brand-action/30 underline-offset-4"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;