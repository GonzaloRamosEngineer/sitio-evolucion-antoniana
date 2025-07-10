import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ActivityForm from '@/components/Admin/ActivityForm'; // Reutilizar el formulario
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const EditActivityPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getActivityById, updateActivity, loading: activitiesHookLoading } = useActivities();
  const { toast } = useToast();
  const [activity, setActivity] = useState(null);
  const [formLoading, setFormLoading] = useState(false); // Loading específico para el guardado
  const [pageLoading, setPageLoading] = useState(true); // Loading para cargar la actividad

  useEffect(() => {
    const fetchActivity = async () => {
      setPageLoading(true);
      try {
        const data = await getActivityById(id);
        if (data) {
          setActivity(data);
        } else {
          toast({ title: "Error", description: "Actividad no encontrada.", variant: "destructive" });
          navigate('/admin?tab=activities');
        }
      } catch (error) {
        toast({ title: "Error al cargar", description: error.message || "No se pudo cargar la actividad.", variant: "destructive" });
        navigate('/admin?tab=activities');
      } finally {
        setPageLoading(false);
      }
    };
    if (id) {
      fetchActivity();
    }
  }, [id, getActivityById, navigate, toast]);

  const handleSave = async (activityData) => {
    setFormLoading(true);
    try {
      await updateActivity(id, activityData);
      toast({
        title: "Actividad Actualizada",
        description: `La actividad "${activityData.title}" ha sido actualizada.`,
        className: "bg-green-500 text-white",
      });
      navigate('/admin?tab=activities');
    } catch (error) {
      toast({
        title: "Error al Actualizar",
        description: error.message || "No se pudo actualizar la actividad.",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  if (pageLoading || activitiesHookLoading && !activity) { // Muestra spinner si está cargando la actividad o el hook está ocupado y no hay datos
    return (
      <div className="min-h-screen flex items-center justify-center bg-blanco-fundacion">
        <Loader2 className="h-16 w-16 animate-spin text-primary-antoniano" />
      </div>
    );
  }

  if (!activity) {
    // Esto no debería alcanzarse si la lógica de fetchActivity es correcta, pero es un fallback.
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <p className="text-xl text-destructive">No se pudo cargar la actividad para editar.</p>
        <Button onClick={() => navigate('/admin?tab=activities')} className="mt-4">Volver</Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-celeste-complementario/20 via-blanco-fundacion to-blanco-fundacion py-8 md:py-12"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/admin?tab=activities')} className="text-primary-antoniano border-primary-antoniano hover:bg-celeste-complementario">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Actividades
          </Button>
        </div>
        <Card className="shadow-xl border-marron-legado/10">
          <CardHeader className="bg-primary-antoniano text-blanco-fundacion rounded-t-lg p-6">
            <CardTitle className="text-2xl font-poppins">Editar Actividad</CardTitle>
            <CardDescription className="text-celeste-complementario/80">
              Modifica los detalles de la actividad "{activity.title}".
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <ActivityForm 
              onSave={handleSave} 
              onCancel={() => navigate('/admin?tab=activities')} 
              initialData={activity}
              isLoading={formLoading || activitiesHookLoading} // Combina loading del hook y del form
            />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default EditActivityPage;