import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast";

const ConfirmAttendancePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState('loading'); 
  const [message, setMessage] = useState('Procesando tu confirmación...');

  useEffect(() => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      setStatus('invalid_token');
      setMessage('Token de confirmación no proporcionado o inválido. Por favor, utiliza el enlace de tu correo.');
      console.warn("ConfirmAttendancePage: No token found in URL or token is invalid.");
      toast({
        title: "Enlace Inválido",
        description: "El token de confirmación no es válido o no se encontró.",
        variant: "destructive",
      });
      return;
    }

    const confirmRegistration = async () => {
      setStatus('loading'); 
      setMessage('Procesando tu confirmación...');
      console.log(`ConfirmAttendancePage: Intentando invocar 'confirm-registration' con token: ${token}`);
      
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('confirm-registration', {
          body: { token }
        });

        console.log('RESPUESTA de confirm-registration →', { data, invokeError });
        console.log('data:', data); 

        if (invokeError) {
          toast({ title: "Error", description: invokeError.message || 'Error invocando confirmación.', variant: "destructive" });
          setStatus('error');
          setMessage(invokeError.message || 'Error invocando confirmación.');
          return;
        }

        if (data?.message?.toLowerCase().includes('exitosamente')) {
          toast({ title: "¡Confirmación Exitosa!", description: data.message, className: "bg-green-500 text-white" });
          setStatus('success');
          setMessage(data.message);
          setTimeout(() => navigate('/dashboard', { replace: true }), 3000);
          return;
        }

        if (data?.message?.toLowerCase().includes('ya ha sido confirmada')) {
          toast({ title: "Asistencia ya Registrada", description: data.message, className: "bg-blue-500 text-white" });
          setStatus('already_confirmed');
          setMessage(data.message);
          setTimeout(() => navigate('/dashboard', { replace: true }), 3000);
          return;
        }

        if (data?.error) {
          toast({ title: "Error", description: data.error, variant: "destructive" });
          setStatus('error');
          setMessage(data.error);
          if (data.error.toLowerCase().includes('inválido') || data.error.toLowerCase().includes('expirado') || data.error.toLowerCase().includes("token no encontrado")) {
            setStatus('invalid_token');
          }
          return;
        }
        
        // Fallback si la estructura de 'data' no es la esperada pero no hay error de invocación
        console.warn('ConfirmAttendancePage: Estructura de respuesta inesperada pero sin error de invocación.', data);
        setStatus('success'); 
        setMessage(data?.message || 'Confirmación procesada. Redirigiendo...');
        toast({
          title: "Confirmación Procesada",
          description: data?.message || 'Tu asistencia ha sido procesada.',
        });
        setTimeout(() => navigate('/dashboard', { replace: true }), 3000);

      } catch (e) {
        console.error('ConfirmAttendancePage: Excepción general en el proceso de confirmación:', e);
        setStatus('error');
        setMessage('Ocurrió un error inesperado. Por favor, intenta de nuevo o contacta soporte.');
        toast({
            title: "Error Inesperado",
            description: "Ocurrió una excepción durante la confirmación.",
            variant: "destructive",
        });
      }
    };

    confirmRegistration();
  }, [token, navigate, toast]); 

  const renderIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 animate-spin text-primary-antoniano" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'already_confirmed':
        return <Info className="h-16 w-16 text-blue-500" />;
      case 'invalid_token':
        return <AlertTriangle className="h-16 w-16 text-yellow-500" />;
      case 'error':
      default:
        return <XCircle className="h-16 w-16 text-destructive" />;
    }
  };
  
  const cardTitle = () => {
    switch (status) {
      case 'loading': return "Confirmando Asistencia...";
      case 'success': return "¡Confirmación Exitosa!";
      case 'already_confirmed': return "Asistencia ya Registrada";
      case 'invalid_token': return "Enlace Inválido o Expirado";
      case 'error': default: return "Error en la Confirmación";
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-[calc(100vh-128px)] flex items-center justify-center bg-gradient-to-br from-blanco-fundacion to-celeste-complementario/30 p-4"
    >
      <Card className="w-full max-w-lg shadow-2xl border-border bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto mb-6"
          >
            {renderIcon()}
          </motion.div>
          <CardTitle className="text-3xl font-poppins font-bold text-primary-antoniano">
            {cardTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <CardDescription className="text-lg text-marron-legado/90 mb-8">
            {message}
            {(status === 'success' || status === 'already_confirmed') && " Serás redirigido al dashboard en unos segundos..."}
          </CardDescription>
          {(status === 'success' || status === 'already_confirmed') && (
            <motion.div initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} transition={{delay: 0.4}}>
              <Button asChild variant="antoniano" className="text-white" onClick={() => navigate('/dashboard', { replace: true })}>
                Ir al Dashboard Ahora
              </Button>
            </motion.div>
          )}
          {(status === 'error' || status === 'invalid_token') && (
             <motion.div initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} transition={{delay: 0.4}}>
              <Button asChild variant="outline" className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario">
                <Link to="/">Volver al Inicio</Link>
              </Button>
            </motion.div>
          )}
           {status === 'loading' && (
            <p className="text-sm text-muted-foreground">Por favor, espera un momento...</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConfirmAttendancePage;