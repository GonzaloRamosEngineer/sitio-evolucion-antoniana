import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ActivityForm from '@/components/Admin/ActivityForm';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, Edit3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const EditActivityPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getActivityById, updateActivity, loading: activitiesHookLoading } = useActivities();
  const { toast } = useToast();
  const [activity, setActivity] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

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
        description: `Los cambios en "${activityData.title}" se han guardado correctamente.`,
        className: "bg-blue-600 text-white border-none",
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

  if (pageLoading || (activitiesHookLoading && !activity)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-sand">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
            <p className="text-gray-500 font-medium">Cargando datos de la actividad...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-brand-sand">
        <div className="bg-red-50 p-4 rounded-full mb-4">
            <Calendar className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">No se encontró la actividad</h2>
        <p className="text-gray-500 mb-6">Es posible que haya sido eliminada o el enlace sea incorrecto.</p>
        <Button onClick={() => navigate('/admin?tab=activities')} variant="outline">
            Volver al Panel
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-sand font-sans py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header de Navegación */}
        <div className="mb-8 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin?tab=activities')} 
            className="text-gray-500 hover:text-brand-primary hover:bg-white/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancelar Edición
          </Button>
          <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Modo Edición</span>
        </div>

        <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
          <div className="bg-brand-gold p-1"> {/* Borde superior dorado para indicar edición */}</div>
          
          <CardHeader className="bg-white border-b border-gray-100 p-8">
            <div className="flex items-center gap-4">
                <div className="bg-brand-sand p-3 rounded-full">
                    <Edit3 className="w-8 h-8 text-brand-gold" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-poppins font-bold text-brand-dark">Editar Actividad</CardTitle>
                    <CardDescription className="text-gray-500 mt-1">
                      Modificando: <span className="font-semibold text-brand-primary">"{activity.title}"</span>
                    </CardDescription>
                </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <ActivityForm 
              onSave={handleSave} 
              onCancel={() => navigate('/admin?tab=activities')} 
              initialData={activity}
              isLoading={formLoading || activitiesHookLoading}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default EditActivityPage;