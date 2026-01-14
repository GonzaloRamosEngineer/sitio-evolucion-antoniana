import React, { useEffect, useState, useCallback } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, AlertTriangle, MailWarning, UserCheck, 
  Users, CalendarDays, Clock, User, Mail, Info 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

const PendingConfirmationsList = () => {
  const { getPendingConfirmations, loading, error } = useActivities();
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const { toast } = useToast();

  const fetchPending = useCallback(async () => {
    try {
      const data = await getPendingConfirmations();
      setPendingRegistrations(data);
    } catch (err) {
      toast({
        title: "Error al cargar",
        description: err.message || "No se pudieron obtener las inscripciones.",
        variant: "destructive",
      });
    }
  }, [getPendingConfirmations, toast]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "dd 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  if (loading && pendingRegistrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="text-gray-500 font-medium animate-pulse font-sans">Sincronizando pendientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-none bg-red-50 rounded-[2rem] shadow-lg">
        <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-800">Error de conexión</h3>
            <p className="text-red-600/70 max-w-xs mt-2">{error.message || "No pudimos traer los datos."}</p>
            <Button onClick={fetchPending} className="mt-6 bg-red-600 hover:bg-red-700 text-white rounded-xl">
                Reintentar
            </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6 font-sans">
      {/* HEADER INFORMATIVO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 p-2 rounded-xl">
            <MailWarning className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-dark font-poppins">Validaciones Pendientes</h2>
            <p className="text-sm text-gray-500">Usuarios que aún no han confirmado el enlace de su correo electrónico.</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-4 py-1 rounded-full font-bold">
            {pendingRegistrations.length} Por confirmar
        </Badge>
      </div>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-8">
          {pendingRegistrations.length === 0 ? (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
            >
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-brand-dark">¡Todo confirmado!</h3>
              <p className="text-gray-500 mt-2">No hay registros pendientes de validación en este momento.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {pendingRegistrations.map((reg, index) => (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group p-5 border border-gray-100 bg-gray-50/30 rounded-2xl hover:bg-amber-50/50 hover:border-amber-200 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-brand-dark leading-tight">
                                    {reg.users ? reg.users.name : reg.guest_name}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium uppercase mt-1">
                                    {reg.users ? (
                                        <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] h-4">Miembro</Badge>
                                    ) : (
                                        <Badge className="bg-gray-100 text-gray-500 border-none text-[8px] h-4">Invitado</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg shadow-xs border border-gray-100 text-amber-500">
                            <Clock size={14} className="animate-pulse" />
                        </div>
                    </div>

                    <div className="space-y-3 border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Info className="w-4 h-4 text-brand-primary" />
                            <p className="font-semibold text-brand-dark line-clamp-1">
                                {reg.activity?.title || 'Actividad no definida'}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{reg.users ? reg.users.email : reg.guest_email}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            <span>Solicitud: {formatDate(reg.registered_at)}</span>
                        </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        Sistema de validación automática por Token
      </p>
    </div>
  );
};

export default PendingConfirmationsList;