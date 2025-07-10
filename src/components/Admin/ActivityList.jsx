import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit, Trash2, Loader2, AlertTriangle, Calendar, Clock, Users, MapPin, Eye, EyeOff, CheckCircle, XCircle, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const ActivityList = ({ onAddRequest }) => {
  const { activities, deleteActivity, loading: activitiesHookLoading, error: activitiesError, refreshActivities } = useActivities();
  const { loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) { 
      const hasLoaded = sessionStorage.getItem('admin_activities_loaded');
      if (!hasLoaded || activities.length === 0) {
        refreshActivities();
        sessionStorage.setItem('admin_activities_loaded', 'true');
      }
    }
  }, [authLoading, refreshActivities, activities.length]);

  const handleEdit = (activity) => {
    navigate(`/admin/activities/edit/${activity.id}`);
  };

  const openDeleteConfirmDialog = (activity) => {
    setActivityToDelete(activity);
    setIsConfirmDeleteDialogOpen(true);
  };

  const closeDeleteConfirmDialog = () => {
    setActivityToDelete(null);
    setIsConfirmDeleteDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!activityToDelete) return;
    try {
      await deleteActivity(activityToDelete.id);
      toast({
        title: "Actividad eliminada",
        description: `La actividad "${activityToDelete.title}" ha sido eliminada exitosamente.`,
        className: "bg-green-500 text-white"
      });
      refreshActivities(); 
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la actividad.",
        variant: "destructive",
      });
    } finally {
      closeDeleteConfirmDialog();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const correctedDate = new Date(date.getTime() + userTimezoneOffset);
      
      return correctedDate.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      console.error("Error formatting date:", e, dateString);
      return 'Fecha inválida';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Próximamente':
        return <Badge className="bg-yellow-500 text-white"><Eye className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Abierta':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Cerrada':
        return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Finalizada':
        return <Badge className="bg-gray-500 text-white"><EyeOff className="w-3 h-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Sin Estado'}</Badge>;
    }
  };
  
  const showInitialLoader = authLoading || (activitiesHookLoading && (activities.length === 0 && !sessionStorage.getItem('admin_activities_loaded')));

  if (showInitialLoader) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary-antoniano" />
        <p className="ml-3 text-marron-legado">Cargando actividades...</p>
      </div>
    );
  }

  if (activitiesError) {
    return (
      <div className="text-center py-10 bg-red-50 p-6 rounded-lg">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-lg text-destructive mb-2">Error al Cargar Actividades</p>
        <p className="text-marron-legado/80">{typeof activitiesError === 'string' ? activitiesError : activitiesError.message || "Ocurrió un problema inesperado."}</p>
        <Button onClick={refreshActivities} variant="outline" className="mt-4 border-destructive text-destructive hover:bg-red-100">
          Intentar de Nuevo
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {activities && activities.length > 0 ? (
        <div className="space-y-6">
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-card rounded-xl border border-marron-legado/10 dark:border-border shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="md:flex">
                <div className="md:w-1/3 aspect-[382/224] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {activity.image_url ? (
                    <img 
                      alt={activity.title || 'Actividad'}
                      className="w-full h-full object-cover"
                      src={activity.image_url} 
                    />
                  ) : (
                    <ImageOff className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <div className={`p-6 ${activity.image_url ? 'md:w-2/3' : 'w-full'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-3">
                    <h3 className="font-poppins font-semibold text-xl text-primary-antoniano dark:text-primary mb-1 sm:mb-0">
                      {activity.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(activity.status)}
                      <Badge 
                        variant={activity.modality === 'presencial' ? 'default' : 'secondary'}
                        className={`capitalize shadow-sm text-xs py-1 px-2.5 ${activity.modality === 'presencial' ? 'bg-primary-antoniano text-white dark:bg-primary dark:text-primary-foreground' : 'bg-green-600 text-white dark:bg-green-700 dark:text-green-100'}`}
                      >
                        {activity.modality}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-marron-legado/80 dark:text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                    {activity.description}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm text-marron-legado/90 dark:text-foreground/90 mb-5">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-primary-antoniano/70 dark:text-primary/70" />
                      {formatDate(activity.date)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-primary-antoniano/70 dark:text-primary/70" />
                      {activity.duration}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-primary-antoniano/70 dark:text-primary/70" />
                      {activity.modality === 'presencial' ? 'Salta, Argentina' : 'Virtual'}
                    </div>
                    <div className="flex items-center col-span-2 sm:col-span-1">
                      <Users className="w-4 h-4 mr-2 text-primary-antoniano/70 dark:text-primary/70" />
                      {`${activity.current_participants || 0} / ${activity.max_participants} cupos`}
                    </div>
                  </div>
                  <div className="flex space-x-3 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(activity)}
                      aria-label={`Editar ${activity.title}`}
                      className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:border-primary dark:text-primary dark:hover:bg-accent"
                    >
                      <Edit className="w-4 h-4 mr-1.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteConfirmDialog(activity)}
                      aria-label={`Eliminar ${activity.title}`}
                      className="border-destructive text-destructive hover:bg-red-50 dark:hover:bg-destructive/10 hover:border-red-600 hover:text-red-700 dark:hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" /> Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-celeste-complementario/20 dark:bg-accent/30 rounded-lg shadow">
          <Calendar className="w-16 h-16 text-primary-antoniano/30 dark:text-primary/30 mx-auto mb-6 animate-pulse-subtle" />
          <p className="text-xl text-marron-legado dark:text-foreground mb-2">Aún no hay actividades creadas.</p>
          <p className="text-muted-foreground mb-6">¡Comienza agregando la primera!</p>
          <Button onClick={onAddRequest} variant="antoniano" className="text-white dark:text-primary-foreground">
            <Plus className="w-5 h-5 mr-2" />
            Crear Primera Actividad
          </Button>
        </div>
      )}

      {activityToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-primary-antoniano dark:text-primary font-poppins">¿Estás absolutamente seguro?</AlertDialogTitle>
              <AlertDialogDescription className="text-marron-legado/90 dark:text-muted-foreground">
                Esta acción no se puede deshacer. Esto eliminará permanentemente la actividad 
                <span className="font-semibold"> "{activityToDelete.title}"</span> y todos sus registros asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={closeDeleteConfirmDialog}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Sí, eliminar actividad
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
};

export default ActivityList;