import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, UserCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, loading: authProviderLoading, isAuthenticated } = useAuth(); 
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (isAuthenticated && !authProviderLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authProviderLoading, navigate, from]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; 

    setIsSubmitting(true);
    try {
      await login(formData.email, formData.password);
      toast({
        title: "¡Bienvenido/a!",
        description: "Has iniciado sesión correctamente.",
        className: "bg-green-600 text-white border-none"
      });
    } catch (error) {
      toast({
        title: "Error de Inicio de Sesión",
        description: error.message || 'Credenciales inválidas o error en el servidor.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); 
    }
  };

  const buttonDisabled = isSubmitting;
  const buttonText = isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión';

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sand relative overflow-hidden p-4 font-sans">
      
      {/* Fondo Decorativo Tech */}
      <div className="absolute inset-0">
         <div className="absolute inset-0 bg-brand-primary opacity-5"></div>
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
         
         {/* Orbes de luz */}
         <div className="absolute top-0 left-0 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl -ml-20 -mt-20"></div>
         <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-action/10 rounded-full blur-3xl -mr-20 -mb-20"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="shadow-2xl border-none bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden">
          
          {/* Header con Marca */}
          <CardHeader className="space-y-2 text-center pt-10 pb-6 bg-white/50 border-b border-gray-100">
            <div className="mx-auto w-16 h-16 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/30 mb-4 text-white">
                <UserCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl font-poppins font-bold text-brand-dark">
              ¡Hola de nuevo!
            </CardTitle>
            <CardDescription className="text-gray-500 text-base">
              Ingresa tus credenciales para continuar.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
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
                    className="pl-12 h-12 bg-white border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                    required
                    disabled={buttonDisabled} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-brand-dark font-semibold">Contraseña</Label>
                  <Link
                    to="/request-password-reset"
                    className="text-xs font-medium text-brand-primary hover:text-brand-action transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-12 pr-12 h-12 bg-white border-gray-200 focus:border-brand-primary focus:ring-brand-primary rounded-xl transition-all"
                    required
                    disabled={buttonDisabled} 
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={buttonDisabled} 
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-95"
                  disabled={buttonDisabled} 
                >
                  {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Iniciando...
                    </>
                  ) : (
                    buttonText
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                ¿Aún no tienes una cuenta?{' '}
                <Link
                  to="/register"
                  className="font-bold text-brand-action hover:text-brand-dark transition-colors underline decoration-brand-action/30 underline-offset-4"
                >
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;