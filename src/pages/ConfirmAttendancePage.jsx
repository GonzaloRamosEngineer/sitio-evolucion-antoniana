import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Info, CalendarCheck } from 'lucide-react';
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
  const [message, setMessage] = useState('Verificando tu asistencia...');

  useEffect(() => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      setStatus('invalid_token');
      setMessage('El enlace de confirmación no es válido o ha expirado. Por favor, verifica tu correo.');
      return;
    }

    const confirmRegistration = async () => {
      setStatus('loading'); 
      
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('confirm-registration', {
          body: { token }
        });

        if (invokeError) {
          console.error("Error invocando función:", invokeError);
          setStatus('error');
          setMessage('Hubo un problema técnico al confirmar. Intenta nuevamente.');
          return;
        }

        if (data?.message?.toLowerCase().includes('exitosamente')) {
          setStatus('success');
          setMessage(data.message);
          setTimeout(() => navigate('/dashboard', { replace: true }), 4000);
          return;
        }

        if (data?.message?.toLowerCase().includes('ya ha sido confirmada')) {
          setStatus('already_confirmed');
          setMessage(data.message);
          setTimeout(() => navigate('/dashboard', { replace: true }), 4000);
          return;
        }

        if (data?.error) {
          setStatus('error');
          setMessage(data.error);
          if (data.error.toLowerCase().includes('inválido') || data.error.toLowerCase().includes('expirado')) {
            setStatus('invalid_token');
          }
          return;
        }
        
        // Fallback exitoso
        setStatus('success'); 
        setMessage(data?.message || 'Tu asistencia ha sido confirmada correctamente.');
        setTimeout(() => navigate('/dashboard', { replace: true }), 4000);

      } catch (e) {
        console.error('Excepción al confirmar:', e);
        setStatus('error');
        setMessage('Ocurrió un error inesperado. Por favor contacta a soporte.');
      }
    };

    confirmRegistration();
  }, [token, navigate]); 

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return { icon: Loader2, color: 'text-brand-primary', bg: 'bg-brand-sand', title: 'Confirmando...', spin: true };
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', title: '¡Asistencia Confirmada!' };
      case 'already_confirmed':
        return { icon: CalendarCheck, color: 'text-blue-600', bg: 'bg-blue-50', title: 'Ya estás registrado' };
      case 'invalid_token':
        return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Enlace no válido' };
      case 'error':
      default:
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', title: 'Error en la confirmación' };
    }
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-sand p-4 font-sans relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="text-center pt-10 pb-6">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring" }}
              className={`mx-auto w-20 h-20 flex items-center justify-center rounded-full ${config.bg} mb-6`}
            >
              <Icon className={`h-10 w-10 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
            </motion.div>
            
            <CardTitle className="text-2xl font-poppins font-bold text-brand-dark">
              {config.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center px-8 pb-10">
            <CardDescription className="text-gray-600 text-base mb-8">
              {message}
              {(status === 'success' || status === 'already_confirmed') && (
                  <span className="block mt-2 text-sm text-gray-400 font-medium">Te redirigiremos a tu panel en unos segundos...</span>
              )}
            </CardDescription>
            
            {(status === 'success' || status === 'already_confirmed') ? (
              <Button 
                asChild 
                className="w-full bg-brand-primary text-white hover:bg-brand-dark font-bold rounded-xl h-12 shadow-lg hover:shadow-xl transition-all"
              >
                <Link to="/dashboard" replace>Ir a Mi Panel</Link>
              </Button>
            ) : (
                status !== 'loading' && (
                    <Button 
                        asChild 
                        variant="outline" 
                        className="w-full border-brand-primary text-brand-primary hover:bg-brand-sand font-bold rounded-xl h-12"
                    >
                        <Link to="/">Volver al Inicio</Link>
                    </Button>
                )
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ConfirmAttendancePage;