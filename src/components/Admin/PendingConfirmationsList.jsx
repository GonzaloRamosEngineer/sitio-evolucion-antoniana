import React, { useEffect, useState, useCallback } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, MailWarning, UserCheck, Users, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
        title: "Error al cargar pendientes",
        description: err.message || "No se pudieron obtener las inscripciones pendientes.",
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
      return format(new Date(dateString), "PPP", { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  if (loading && pendingRegistrations.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary-antoniano" />
        <p className="ml-3 text-marron-legado">Cargando inscripciones pendientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 bg-red-50 p-6 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-lg text-destructive mb-2">Error al Cargar Inscripciones</p>
        <p className="text-marron-legado/80">{error.message || "Ocurrió un problema inesperado."}</p>
        <Button onClick={fetchPending} variant="outline" className="mt-4 border-destructive text-destructive hover:bg-red-100">
          Intentar de Nuevo
        </Button>
      </div>
    );
  }
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Card className="border-marron-legado/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-poppins text-primary-antoniano flex items-center">
            <MailWarning className="w-6 h-6 mr-3 text-amber-500" />
            Inscripciones Pendientes de Confirmación
          </CardTitle>
          <CardDescription className="text-marron-legado/90">
            Estos registros están esperando que el usuario confirme su asistencia a través del enlace enviado a su correo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg text-marron-legado">¡Todo al día!</p>
              <p className="text-muted-foreground">No hay inscripciones pendientes de confirmación en este momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRegistrations.map((reg) => (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 border border-amber-300 bg-amber-50 rounded-lg shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div>
                      <p className="font-semibold text-amber-700">
                        {reg.users ? reg.users.name : reg.guest_name}
                      </p>
                      <p className="text-sm text-amber-600">
                        {reg.users ? reg.users.email : reg.guest_email}
                      </p>
                    </div>
                    <div className="text-sm text-amber-600 mt-2 sm:mt-0 sm:text-right">
                      <p className="font-medium">{reg.activity?.title || 'Actividad no encontrada'}</p>
                      <p>Registrado: {formatDate(reg.registered_at)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PendingConfirmationsList;