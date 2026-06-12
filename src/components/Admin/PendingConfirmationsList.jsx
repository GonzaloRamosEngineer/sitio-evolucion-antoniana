import React, { useEffect, useState, useCallback } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertTriangle, MailWarning, UserCheck,
  CalendarDays, Clock, User, Mail, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';

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

  const sectionHeader = (
    <SectionHeader
      icon={MailWarning}
      title="Validaciones Pendientes"
      description="Usuarios que aún no han confirmado el enlace de su correo electrónico."
      actions={
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-4 py-1 rounded-full font-bold">
          {pendingRegistrations.length} Por confirmar
        </Badge>
      }
    />
  );

  if (loading && pendingRegistrations.length === 0) {
    return (
      <div className="font-sans">
        {sectionHeader}
        <ListSkeleton rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="font-sans">
        {sectionHeader}
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-0">
            <EmptyState
              icon={AlertTriangle}
              title="Error de conexión"
              description={error.message || "No pudimos traer los datos."}
              action={
                <Button onClick={fetchPending} className="bg-brand-primary hover:bg-brand-dark text-white rounded-xl">
                  Reintentar
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="font-sans">
      {sectionHeader}

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardContent className={pendingRegistrations.length === 0 ? 'p-0' : 'p-6 md:p-8'}>
          {pendingRegistrations.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="¡Todo confirmado!"
              description="No hay registros pendientes de validación en este momento."
            />
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

      <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">
        Sistema de validación automática por Token
      </p>
    </div>
  );
};

export default PendingConfirmationsList;
