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
import { 
  Plus, Edit3, Trash2, Loader2, AlertTriangle, 
  Calendar, Clock, Users, MapPin, Eye, EyeOff, 
  CheckCircle2, XCircle, ImageOff, ExternalLink,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        title: "¡Actividad eliminada!",
        description: `"${activityToDelete.title}" ya no está disponible.`,
        className: "bg-green-600 text-white border-none"
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
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const getStatusBadge = (status) => {
    const common = "px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 border-none shadow-sm";
    switch (status) {
      case 'Próximamente':
        return <Badge className={`${common} bg-amber-50 text-amber-700`}><Clock className="w-3 h-3" />{status}</Badge>;
      case 'Abierta':
        return <Badge className={`${common} bg-green-50 text-green-700`}><CheckCircle2 className="w-3 h-3" />{status}</Badge>;
      case 'Cerrada':
        return <Badge className={`${common} bg-red-50 text-red-700`}><XCircle className="w-3 h-3" />{status}</Badge>;
      case 'Finalizada':
        return <Badge className={`${common} bg-gray-50 text-gray-600`}><EyeOff className="w-3 h-3" />{status}</Badge>;
      default:
        return <Badge variant="secondary" className={common}>{status || 'Sin Estado'}</Badge>;
    }
  };
  
  const showInitialLoader = authLoading || (activitiesHookLoading && (activities.length === 0 && !sessionStorage.getItem('admin_activities_loaded')));

  if (showInitialLoader) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <p className="text-gray-500 font-medium animate-pulse">Sincronizando cronograma...</p>
      </div>
    );
  }

  if (activitiesError) {
    return (
      <Card className="border-red-100 bg-red-50/50 rounded-3xl overflow-hidden shadow-lg">
        <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-800">No pudimos cargar las actividades</h3>
            <p className="text-red-600/80 max-w-sm mt-2">
                Ocurrió un error al intentar conectar con el servidor de contenidos.
            </p>
            <Button onClick={refreshActivities} className="mt-6 bg-red-600 hover:bg-red-700 text-white rounded-xl px-8">
                Intentar de nuevo
            </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {activities && activities.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <div className="flex flex-col lg:flex-row">
                  {/* Imagen / Miniatura */}
                  <div className="lg:w-1/3 aspect-video lg:aspect-auto bg-gray-100 relative overflow-hidden">
                    {activity.image_url ? (
                      <img 
                        alt={activity.title}
                        src={activity.image_url} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                        <ImageOff className="w-12 h-12 opacity-50" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sin imagen</span>
                      </div>
                    )}
                    {/* Badge de Modalidad sobre la imagen */}
                    <div className="absolute top-4 left-4">
                        <Badge className={`px-4 py-1.5 rounded-full border-none shadow-lg backdrop-blur-md ${activity.modality === 'presencial' ? 'bg-brand-primary/90 text-white' : 'bg-green-600/90 text-white'}`}>
                            {activity.modality}
                        </Badge>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="lg:w-2/3 p-6 md:p-8 flex flex-col">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                      <div>
                        <h3 className="font-poppins font-bold text-2xl text-brand-dark group-hover:text-brand-primary transition-colors leading-tight">
                          {activity.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(activity.status)}
                        </div>
                      </div>
                      
                      {/* Cupos como KPI circular/minimalista */}
                      <div className="bg-brand-sand px-4 py-2 rounded-2xl border border-brand-primary/10 flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-brand-primary shadow-sm">
                            <Target size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase leading-none">Cupos</span>
                            <span className="text-sm font-black text-brand-dark">
                                {activity.current_participants || 0} / {activity.max_participants}
                            </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-6">
                      {activity.description}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 border-t border-gray-50 pt-6 mt-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Calendar size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Fecha</p>
                            <p className="text-xs font-bold text-brand-dark">{formatDate(activity.date)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <Clock size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Duración</p>
                            <p className="text-xs font-bold text-brand-dark">{activity.duration}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-sand flex items-center justify-center text-brand-gold">
                            <MapPin size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Ubicación</p>
                            <p className="text-xs font-bold text-brand-dark truncate max-w-[100px]">
                                {activity.modality === 'presencial' ? 'Salta, Arg.' : 'Virtual'}
                            </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end items-center gap-3 mt-8 pt-4 border-t border-gray-50">
                        <Button
                          variant="ghost"
                          onClick={() => handleEdit(activity)}
                          className="text-brand-primary hover:bg-brand-primary/5 font-bold rounded-xl h-10 px-6 transition-all"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Gestionar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => openDeleteConfirmDialog(activity)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl h-10 w-10 flex items-center justify-center p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="border-none shadow-xl bg-white rounded-[2rem] p-12 text-center">
            <div className="bg-brand-sand w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-brand-primary/40" />
            </div>
            <h3 className="text-2xl font-bold text-brand-dark">Sin actividades activas</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">
                Parece que todavía no has creado ninguna actividad para la fundación.
            </p>
            <Button onClick={onAddRequest} className="mt-8 bg-brand-primary hover:bg-brand-dark text-white font-bold h-12 px-8 rounded-xl shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Crear Mi Primera Actividad
            </Button>
        </Card>
      )}

      {/* DIÁLOGO DE ELIMINACIÓN MODERNO */}
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-10 bg-white max-w-md">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-2xl font-poppins font-bold text-brand-dark">¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 text-base mt-2">
              Estás a punto de borrar <strong>"{activityToDelete?.title}"</strong>. <br/>
              Esta acción eliminará también a todos los inscritos y no se puede revertir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex-col sm:flex-row gap-3">
            <AlertDialogCancel onClick={closeDeleteConfirmDialog} className="border-none bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-xl h-12 px-6">
                No, mantener
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl h-12 px-8 shadow-lg shadow-red-200">
                Sí, eliminar para siempre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActivityList;