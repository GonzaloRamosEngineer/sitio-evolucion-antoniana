import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, ShieldCheck } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, loading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Normalización NASA de teléfono antes del envío
      let cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (!cleanPhone.startsWith('54')) cleanPhone = `549${cleanPhone}`;

      await register({
        name: formData.name,
        email: formData.email,
        phone: cleanPhone,
        password: formData.password
      });
      toast({
        title: "¡Registro Completado!",
        description: "Verifica tu casilla de email para activar tu cuenta.",
        className: "bg-brand-dark text-white border-none rounded-2xl"
      });
      navigate('/login');
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };
  
  const inputStyle = "pl-12 h-11 bg-gray-50/50 border-gray-100 focus:bg-white focus:ring-brand-primary/20 text-brand-dark rounded-xl transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sand relative overflow-hidden py-16 px-4">
      <div className="absolute inset-0">
         <div className="absolute inset-0 bg-brand-primary opacity-5"></div>
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="shadow-2xl border-none bg-white/90 backdrop-blur-xl rounded-[3rem] overflow-hidden">
          <CardHeader className="space-y-4 text-center pt-10 pb-6 border-b border-gray-50">
            <img 
              src="/img/logotransparente.png" 
              alt="Logo" 
              className="mx-auto w-20 h-20 object-contain"
            />
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                Nueva Cuenta
              </CardTitle>
              <CardDescription className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">
                Comunidad Digital Evolución Antoniana
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nombre Completo</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-primary transition-colors" />
                    <Input name="name" placeholder="Ej: Juan Pérez" value={formData.name} onChange={handleChange} className={inputStyle} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">WhatsApp</Label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-primary transition-colors" />
                    <Input name="phone" placeholder="387..." value={formData.phone} onChange={handleChange} className={inputStyle} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-primary transition-colors" />
                  <Input name="email" type="email" placeholder="tu@email.com" value={formData.email} onChange={handleChange} className={inputStyle} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Contraseña</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-primary transition-colors" />
                    <Input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••" value={formData.password} onChange={handleChange} className={inputStyle + " pr-10"} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Confirmar</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-brand-primary transition-colors" />
                    <Input name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••" value={formData.confirmPassword} onChange={handleChange} className={inputStyle} required />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={authLoading}
                  className="w-full h-14 bg-brand-primary hover:bg-brand-dark text-white font-black rounded-2xl shadow-xl shadow-brand-primary/20 transition-all uppercase tracking-widest text-xs"
                >
                  {authLoading ? <Loader2 className="animate-spin" /> : "Finalizar Registro"}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase">
                ¿Ya eres parte?{' '}
                <Link to="/login" className="text-brand-action hover:text-brand-dark transition-colors underline underline-offset-4 decoration-brand-action/20">
                  Iniciar Sesión
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