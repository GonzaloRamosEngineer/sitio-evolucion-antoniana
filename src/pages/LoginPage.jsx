import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';
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
        title: "¡Acceso Autorizado!",
        description: "Bienvenido al ecosistema digital de la Fundación.",
        className: "bg-brand-dark text-white border-none rounded-2xl"
      });
    } catch (error) {
      toast({
        title: "Error de Autenticación",
        description: error.message || 'Credenciales inválidas.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); 
    }
  };

  // Estilo de input unificado con el formulario de Educación
  const inputStyle = "pl-12 h-12 bg-gray-50/50 border-gray-100 focus:bg-white focus:ring-brand-primary/20 text-brand-dark rounded-xl transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sand relative overflow-hidden p-4 font-sans">
      <div className="absolute inset-0">
         <div className="absolute inset-0 bg-brand-primary opacity-5"></div>
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="shadow-2xl border-none bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-4 text-center pt-12 pb-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto w-24 h-24 mb-2"
            >
              <img 
                src="/img/logotransparente.png" 
                alt="Logo Fundación" 
                className="w-full h-full object-contain drop-shadow-md"
              />
            </motion.div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black text-brand-dark tracking-tighter uppercase">
                Bienvenido
              </CardTitle>
              <CardDescription className="text-gray-400 font-medium text-xs uppercase tracking-widest">
                Gestión Digital Institucional
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Email Corporativo</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-brand-primary transition-colors" />
                  <Input
                    name="email"
                    type="email"
                    placeholder="usuario@evolucionantoniana.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputStyle}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Contraseña</Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-brand-primary transition-colors" />
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={inputStyle + " pr-12"}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-brand-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-brand-primary hover:bg-brand-dark text-white font-black rounded-2xl shadow-xl shadow-brand-primary/20 transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "INGRESAR AL PANEL"
                  )}
                </Button>
                <div className="flex justify-center italic">
                  <Link to="/request-password-reset" className="text-[10px] text-gray-400 hover:text-brand-primary transition-colors uppercase font-bold tracking-tighter">
                    ¿Problemas de acceso? Recuperar cuenta
                  </Link>
                </div>
              </div>
            </form>

            <div className="mt-10 text-center border-t border-gray-50 pt-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
                ¿Nuevo integrante?{' '}
                <Link to="/register" className="text-brand-action hover:underline underline-offset-4">
                  Crear perfil de acceso
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