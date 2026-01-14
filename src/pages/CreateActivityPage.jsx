import React from 'react';
import { useNavigate } from 'react-router-dom';
import ActivityForm from '@/components/Admin/ActivityForm';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, PlusCircle } from 'lucide-react';
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
        title: "¡Actividad Creada!",
        description: `La actividad "${activityData.title}" está lista y publicada.`,
        className: "bg-green-600 text-white border-none",
      });
      navigate('/admin?tab=activities');
    } catch (error) {
      toast({
        title: "Error al Crear",
        description: error.message || "No se pudo crear la actividad.",
        variant: "destructive",
      });
    }
  };

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
            Volver al Panel
          </Button>
          <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Gestión de Actividades</span>
        </div>

        <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
          <div className="bg-brand-primary p-1"> {/* Borde superior decorativo */}</div>
          
          <CardHeader className="bg-white border-b border-gray-100 p-8">
            <div className="flex items-center gap-4">
                <div className="bg-brand-sand p-3 rounded-full">
                    <PlusCircle className="w-8 h-8 text-brand-primary" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-poppins font-bold text-brand-dark">Nueva Actividad</CardTitle>
                    <CardDescription className="text-gray-500 mt-1">
                    Completa la información para publicar un nuevo evento, curso o taller.
                    </CardDescription>
                </div>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <ActivityForm 
              onSave={handleSave} 
              onCancel={() => navigate('/admin?tab=activities')} 
              isLoading={loading}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CreateActivityPage;