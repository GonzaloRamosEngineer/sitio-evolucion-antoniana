import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase'; // Importar supabase para manejar el evento de recuperación

const UpdatePasswordForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false); // Loading específico del formulario
  const [tokenStatus, setTokenStatus] = useState('checking'); // 'checking', 'valid', 'invalid'

  const { updatePassword, loading: authHookLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const checkTokenValidity = useCallback(() => {
    const hash = location.hash.substring(1); // Quitar el '#'
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const type = params.get('type');

    if (accessToken && type === 'recovery') {
      setTokenStatus('valid');
    } else {
      setTokenStatus('invalid');
    }
  }, [location.hash]);

  useEffect(() => {
    checkTokenValidity();

    // Supabase maneja el evento de PASSWORD_RECOVERY y establece la sesión temporalmente.
    // No necesitamos hacer nada más aquí para la validación del token si usamos supabase.auth.updateUser.
    // La clave es que el token debe estar en la URL cuando esta página carga.
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario está en el flujo de recuperación de contraseña
        // Esto es bueno, el token de la URL fue procesado por Supabase.
        setTokenStatus('valid'); // Reconfirmar si Supabase lo procesó
      } else if (event === 'SIGNED_IN' && location.pathname === '/update-password' && tokenStatus !== 'valid') {
        // Si se inicia sesión normalmente mientras se está en esta página sin un token de recuperación válido,
        // no debería estar aquí.
        // Pero no es un error fatal, es más para debug.
      }
    });
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };

  }, [location.pathname, tokenStatus, checkTokenValidity]);
  
  useEffect(() => {
    if (tokenStatus === 'invalid' && !authHookLoading) {
      toast({
        title: "Enlace Inválido",
        description: "El enlace para reestablecer contraseña es inválido o ha expirado. Por favor, solicita uno nuevo.",
        variant: "destructive"
      });
      navigate('/request-password-reset', { replace: true });
    }
  }, [tokenStatus, authHookLoading, navigate, toast]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tokenStatus !== 'valid') {
      toast({ title: "Error", description: "No se puede actualizar la contraseña. Enlace inválido.", variant: "destructive" });
      return;
    }

    setFormLoading(true);

    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      setFormLoading(false);
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      setFormLoading(false);
      return;
    }

    try {
      await updatePassword(password);
      toast({
        title: "Contraseña Actualizada",
        description: "Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.",
        className: "bg-celeste-complementario border-primary-antoniano text-primary-antoniano"
      });
      navigate('/login', { replace: true });
    } catch (error) {
      toast({
        title: "Error al Actualizar",
        description: error.message || "No se pudo actualizar la contraseña. El enlace puede haber expirado o ya fue utilizado.",
        variant: "destructive",
      });
      // Considerar redirigir a request-password-reset si el error es por token expirado
      // navigate('/request-password-reset', { replace: true });
    } finally {
      setFormLoading(false);
    }
  };
  
  if (authHookLoading || tokenStatus === 'checking') {
     return (
      <div className="min-h-[calc(100vh-128px)] flex items-center justify-center bg-blanco-fundacion">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-antoniano"></div>
      </div>
    );
  }

  // La redirección por token inválido ahora se maneja en el useEffect
  // Si llegamos aquí y el token es inválido, el useEffect ya debería haber redirigido.
  // Aún así, por seguridad, podemos no renderizar el formulario si el token no es válido.
  if (tokenStatus !== 'valid') {
    // Este return es un fallback, el useEffect debería haber navegado ya.
     return (
      <div className="min-h-[calc(100vh-128px)] flex items-center justify-center bg-blanco-fundacion p-4">
        {/* Mensaje de espera o spinner mientras se redirige */}
      </div>
    );
  }


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
              Ingresa Nueva Contraseña
            </CardTitle>
          </motion.div>
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <CardDescription className="text-muted-foreground">
              Elige una contraseña segura y fácil de recordar.
            </CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-2">
              <Label htmlFor="password" className="text-marron-legado">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 border-border focus:border-primary-antoniano focus:ring-primary-antoniano"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-celeste-complementario"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-marron-legado">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 border-border focus:border-primary-antoniano focus:ring-primary-antoniano"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-celeste-complementario"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
              <Button
                type="submit"
                className="w-full bg-primary-antoniano text-white hover:bg-primary-antoniano/90 transition-all duration-300 ease-in-out transform hover:scale-105"
                disabled={formLoading || authHookLoading}
              >
                {formLoading || authHookLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UpdatePasswordForm;