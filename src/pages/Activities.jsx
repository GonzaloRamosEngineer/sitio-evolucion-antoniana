import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, MapPin, Clock, Filter, Loader2, AlertTriangle, Info, MailCheck, LogIn, Hourglass, CheckCircle, XCircle, Archive, ImageOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Activities = () => {
  const [filter, setFilter] = useState('all');
  const { activities, loading: activitiesLoading, error: activitiesError, registerForActivity, refreshActivities } = useActivities();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading) { 
      const hasLoaded = sessionStorage.getItem('activities_loaded');
      if (!hasLoaded || activities.length === 0) {
        refreshActivities();
        sessionStorage.setItem('activities_loaded', 'true');
      }
    }
  }, [authLoading, refreshActivities, activities.length]); 

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      sessionStorage.removeItem('activities_loaded');
    }
  }, [isAuthenticated, authLoading]);


  const handleUserRegister = async (activityId) => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Inicio de Sesión Requerido",
        description: "Debes iniciar sesión para inscribirte en una actividad.",
        variant: "destructive",
        action: <Button variant="outline" size="sm" onClick={() => navigate('/login', { state: { from: location } })}>Iniciar Sesión</Button>
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      await registerForActivity(activityId, user.id, user.email, user.name || user.user_metadata?.name || 'Usuario');
      toast({
        title: "¡Pre-Inscripción Exitosa!",
        description: "Hemos enviado un correo para que confirmes tu asistencia. ¡Revisa tu bandeja de entrada!",
        variant: "default",
        className: "bg-blue-500 text-white",
        duration: 7000,
        action: <MailCheck className="h-5 w-5" />
      });
      refreshActivities(); 
    } catch (error) {
      toast({
        title: "Error de Pre-Inscripción",
        description: error.message || "No se pudo completar la pre-inscripción.",
        variant: "destructive",
      });
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.modality === filter;
  }); 

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' 
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const getParticipantPercentage = (current, max) => {
    if (!max || max === 0) return 0;
    const percentage = (current / max) * 100;
    return Math.min(100, Math.max(0, percentage)); 
  };

  const getStatusBadge = (status) => {
    let badgeProps = {
      className: 'text-white dark:text-primary-foreground shadow-md flex items-center gap-1.5',
      icon: null,
      text: status,
    };
  
    switch (status) {
      case 'Próximamente':
        badgeProps.className += ' bg-amber-500 dark:bg-amber-600';
        badgeProps.icon = <Hourglass className="w-3 h-3" />;
        break;
      case 'Abierta':
        badgeProps.className += ' bg-green-600 dark:bg-green-700';
        badgeProps.icon = <CheckCircle className="w-3 h-3" />;
        break;
      case 'Cerrada':
        badgeProps.className += ' bg-red-600 dark:bg-red-700';
        badgeProps.icon = <XCircle className="w-3 h-3" />;
        break;
      case 'Finalizada':
        badgeProps.className += ' bg-gray-500 dark:bg-gray-600';
        badgeProps.icon = <Archive className="w-3 h-3" />;
        break;
      default:
        badgeProps.className += ' bg-gray-400 dark:bg-gray-500';
        badgeProps.text = 'Estado desc.';
        break;
    }
  
    return (
      <Badge className={badgeProps.className}>
        {badgeProps.icon}
        <span className="hidden sm:inline">{badgeProps.text}</span>
      </Badge>
    );
  };

  const getActionButton = (activity) => {
    const isFull = (activity.current_participants || 0) >= activity.max_participants;
  
    if (activity.status === 'Finalizada') {
      return <Button variant="outline" className="w-full cursor-not-allowed" disabled>Actividad Finalizada</Button>;
    }
    if (activity.status === 'Cerrada') {
      return <Button variant="outline" className="w-full cursor-not-allowed" disabled>Inscripciones Cerradas</Button>;
    }
    if (activity.status === 'Próximamente') {
      return <Button variant="outline" className="w-full cursor-not-allowed" disabled>Próximamente</Button>;
    }
    
    if (isFull) {
      return <Button variant="destructive" className="w-full cursor-not-allowed" disabled>Cupos Agotados</Button>;
    }
  
    return (
      <Button
        variant="antoniano"
        className="w-full text-white dark:text-primary-foreground flex items-center justify-center"
        onClick={() => handleUserRegister(activity.id)}
        disabled={authLoading}
      >
        {isAuthenticated 
          ? 'Quiero Participar' 
          : <> <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión para Participar</>
        }
      </Button>
    );
  };

  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  const showInitialLoader = authLoading || (activitiesLoading && (activities.length === 0 && !sessionStorage.getItem('activities_loaded')));


  if (showInitialLoader) { 
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-160px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-antoniano dark:text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-blanco-fundacion dark:bg-background font-inter"
    >
      <section className="py-20 md:py-28 text-center bg-gradient-to-b from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion dark:from-primary/20 dark:via-background dark:to-background hero-pattern">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-poppins font-extrabold text-primary-antoniano dark:text-primary mb-6 text-balance"
          >
            Nuestras Actividades
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-marron-legado/90 dark:text-muted-foreground max-w-3xl mx-auto leading-relaxed text-balance"
          >
            Explora talleres, cursos y eventos diseñados para impulsar tu desarrollo. ¡Súmate a la comunidad de Evolución Antoniana!
          </motion.p>
        </div>
      </section>

      <section className="py-8 bg-blanco-fundacion dark:bg-background border-b border-marron-legado/10 dark:border-border sticky top-[80px] z-40 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-marron-legado dark:text-foreground">
              <Filter className="w-5 h-5 text-primary-antoniano dark:text-primary" />
              <span className="font-medium">Filtrar por modalidad:</span>
            </div>
            <div className="flex space-x-2">
              {['all', 'presencial', 'virtual'].map((modalityFilter) => (
                <Button
                  key={modalityFilter}
                  variant={filter === modalityFilter ? 'antoniano' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(modalityFilter)}
                  className={`capitalize transition-all duration-200 ${filter === modalityFilter ? 'text-white dark:text-primary-foreground' : 'text-primary-antoniano dark:text-primary border-primary-antoniano dark:border-primary hover:bg-celeste-complementario dark:hover:bg-accent'}`}
                >
                  {modalityFilter === 'all' ? 'Todas' : modalityFilter}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          {activitiesLoading && activities.length === 0 && !sessionStorage.getItem('activities_loaded') ? ( 
            <div className="flex justify-center items-center min-h-[300px]">
              <Loader2 className="h-12 w-12 animate-spin text-primary-antoniano dark:text-primary" />
            </div>
          ) : activitiesError ? (
             <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-red-100/50 dark:bg-destructive/10 rounded-lg shadow border border-red-300 dark:border-destructive/30"
            >
              <AlertTriangle className="w-16 h-16 text-red-500 dark:text-destructive mx-auto mb-6" />
              <p className="text-xl text-red-700 dark:text-destructive mb-2">Error al cargar actividades</p>
              <p className="text-muted-foreground">{activitiesError || "Ocurrió un error inesperado."}</p>
              <Button onClick={refreshActivities} variant="destructive" className="mt-4">Intentar de nuevo</Button>
            </motion.div>
          ) : filteredActivities.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-celeste-complementario/20 dark:bg-accent/30 rounded-lg shadow"
            >
              <Info className="w-16 h-16 text-primary-antoniano/50 dark:text-primary/50 mx-auto mb-6" />
              <p className="text-xl text-marron-legado dark:text-foreground mb-2">No hay actividades disponibles con el filtro actual.</p>
              <p className="text-muted-foreground">Intenta seleccionar otro filtro o vuelve más tarde.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredActivities.map((activity, index) => {
                return (
                  <motion.div
                    key={activity.id}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="h-full flex"
                  >
                    <Card className="w-full flex flex-col bg-white dark:bg-card rounded-xl border border-marron-legado/10 dark:border-border shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden card-hover">
                      <Link to={`/activities/${activity.id}`} className="block group">
                        <div className="relative aspect-[382/224] overflow-hidden bg-gray-200 dark:bg-gray-700">
                          {activity.image_url ? (
                            <img 
                              alt={activity.title || 'Imagen de actividad'}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              src={activity.image_url} 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <Badge 
                              variant={activity.modality === 'presencial' ? 'default' : 'secondary'}
                              className={`capitalize shadow-md ${activity.modality === 'presencial' ? 'bg-primary-antoniano text-white dark:bg-primary dark:text-primary-foreground' : 'bg-green-600 text-white dark:bg-green-700 dark:text-green-100'}`}
                            >
                              {activity.modality}
                            </Badge>
                          </div>
                          <div className="absolute top-3 right-3">
                            {getStatusBadge(activity.status)}
                          </div>
                        </div>
                      </Link>
                      
                      <CardHeader className="pt-5 pb-3">
                        <Link to={`/activities/${activity.id}`}>
                          <CardTitle className="text-xl font-poppins text-primary-antoniano dark:text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors duration-200 leading-tight">
                            {activity.title}
                          </CardTitle>
                        </Link>
                      </CardHeader>
                      
                      <CardContent className="flex-grow space-y-3 text-sm">
                        <div className="flex items-center text-marron-legado/80 dark:text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-2.5 text-primary-antoniano/70 dark:text-primary/70" />
                          {formatDate(activity.date)}
                        </div>
                        <div className="flex items-center text-marron-legado/80 dark:text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2.5 text-primary-antoniano/70 dark:text-primary/70" />
                          {activity.duration}
                        </div>
                        <div className="flex items-center text-marron-legado/80 dark:text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2.5 text-primary-antoniano/70 dark:text-primary/70" />
                          {activity.modality === 'presencial' ? 'Salta, Argentina' : 'Virtual'}
                        </div>
                        
                        <div className="pt-1">
                          <div className="flex justify-between items-center mb-1 text-xs text-marron-legado/70 dark:text-muted-foreground/80">
                            <span>Cupos Confirmados:</span>
                            <span>{activity.current_participants || 0} / {activity.max_participants}</span>
                          </div>
                          <Progress 
                            value={getParticipantPercentage(activity.current_participants, activity.max_participants)} 
                            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-primary-antoniano [&>div]:to-blue-500 dark:[&>div]:from-primary dark:[&>div]:to-blue-600" 
                          />
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 border-t border-marron-legado/10 dark:border-border">
                        {getActionButton(activity)}
                      </CardFooter>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
};

export default Activities;