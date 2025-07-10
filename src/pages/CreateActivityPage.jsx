import React from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityForm from '@/components/Admin/ActivityForm'; // Reutilizar el formulario
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const CreateActivityPage = () => {
  const navigate = useNavigate();
  const { createActivity, loading } = useActivities();
  const { toast } = useToast();

  const handleSave = async (activityData) => {
    try {
      await createActivity(activityData);
      toast({
        title: "Actividad Creada",
        description: `La actividad "${activityData.title}" ha sido creada exitosamente.`,
        className: "bg-green-500 text-white",
      });
      navigate('/admin?tab=activities');
    } catch (error) {
      toast({
        title: "Error al Crear Actividad",
        description: error.message || "No se pudo crear la actividad.",
        variant: "destructive",
      });
    }
  };

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
            <CardTitle className="text-2xl font-poppins">Crear Nueva Actividad</CardTitle>
            <CardDescription className="text-celeste-complementario/80">
              Completa los detalles para la nueva actividad.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <ActivityForm 
              onSave={handleSave} 
              onCancel={() => navigate('/admin?tab=activities')} 
              isLoading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default CreateActivityPage;