import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Calendar, MapPin, Users, Clock, ArrowLeft, Loader2, AlertTriangle, Info, MailCheck, LogIn, ImageOff, Instagram, Facebook, Linkedin, Instagram as TwitterIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const ActivityDetailPage = () => {
  const { id } = useParams();
  const { getActivityById, registerForActivity, refreshActivities: globalRefreshActivities } = useActivities();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivityDetails = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActivityById(id);
      if (data) {
        setActivity(data);
      } else {
        setError('Actividad no encontrada.');
      }
    } catch (err) {
      console.error("Error fetching activity details:", err);
      setError(err.message || 'Error al cargar la actividad.');
    } finally {
      setLoading(false);
    }
  }, [id, getActivityById]);

  useEffect(() => {
    if (id) {
      fetchActivityDetails();
    }
  }, [id, fetchActivityDetails]);

  const handleUserRegister = async () => {
    if (!activity) return;
    
    if (!isAuthenticated || !user) {
      toast({
        title: "Inicio de Sesión Requerido",
        description: "Debes iniciar sesión para inscribirte en esta actividad.",
        variant: "destructive",
        action: <Button variant="outline" size="sm" onClick={() => navigate('/login', { state: { from: location } })}>Iniciar Sesión</Button>
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      await registerForActivity(activity.id, user.id, user.email, user.name || user.user_metadata?.name || 'Usuario');
      toast({
        title: "¡Pre-Inscripción Exitosa!",
        description: "Hemos enviado un correo para que confirmes tu asistencia. ¡Revisa tu bandeja de entrada!",
        variant: "default",
        className: "bg-blue-500 text-white dark:bg-blue-600 dark:text-white",
        duration: 7000,
        action: <MailCheck className="h-5 w-5" />
      });
      fetchActivityDetails(); 
      globalRefreshActivities(); 
    } catch (error) {
      toast({
        title: "Error de Pre-Inscripción",
        description: error.message || "No se pudo completar la pre-inscripción.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      });
    } catch(e) {
      return 'Fecha inválida';
    }
  };

  const getParticipantPercentage = (current, max) => {
    if (max === null || max === -1) return null; // No percentage for unlimited
    if (!max || max === 0) return 0;
    return (current / max) * 100;
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const socialLinks = [
    { platform: 'Instagram', url: activity?.instagram_url, icon: Instagram, color: 'text-pink-600 dark:text-pink-400', hoverColor: 'hover:text-pink-700 dark:hover:text-pink-300' },
    { platform: 'Facebook', url: activity?.facebook_url, icon: Facebook, color: 'text-blue-600 dark:text-blue-400', hoverColor: 'hover:text-blue-700 dark:hover:text-blue-300' },
    { platform: 'LinkedIn', url: activity?.linkedin_url, icon: Linkedin, color: 'text-blue-700 dark:text-blue-500', hoverColor: 'hover:text-blue-800 dark:hover:text-blue-400' },
    { platform: 'X', url: activity?.twitter_url, icon: TwitterIcon, color: 'text-sky-500 dark:text-sky-400', hoverColor: 'hover:text-sky-600 dark:hover:text-sky-300' },
  ].filter(link => link.url);


  if (loading || authLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-blanco-fundacion dark:bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary-antoniano dark:text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-6 bg-blanco-fundacion dark:bg-background">
        <AlertTriangle className="w-20 h-20 text-destructive mb-6" />
        <h2 className="text-3xl font-poppins text-primary-antoniano dark:text-primary mb-3">Error al Cargar</h2>
        <p className="text-marron-legado/80 dark:text-muted-foreground mb-8 max-w-md">{error}</p>
        <Button variant="antoniano" asChild>
          <Link to="/activities" className="text-white dark:text-primary-foreground">Volver a Actividades</Link>
        </Button>
      </div>
    );
  }

  if (!activity) {
     return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-6 bg-blanco-fundacion dark:bg-background">
        <Info className="w-20 h-20 text-primary-antoniano/70 dark:text-primary/70 mb-6" />
        <h2 className="text-3xl font-poppins text-primary-antoniano dark:text-primary mb-3">Actividad no Encontrada</h2>
        <p className="text-marron-legado/80 dark:text-muted-foreground mb-8 max-w-md">La actividad que buscas no existe o fue eliminada.</p>
        <Button variant="antoniano" asChild>
          <Link to="/activities" className="text-white dark:text-primary-foreground">Volver a Actividades</Link>
        </Button>
      </div>
    );
  }

  const isFull = activity.max_participants !== null && activity.max_participants !== -1 && (activity.current_participants || 0) >= activity.max_participants;
  const displayImageUrl = activity.image_detail_url || activity.image_url;
  const percentage = getParticipantPercentage(activity.current_participants, activity.max_participants);

  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-blanco-fundacion dark:bg-background font-inter py-8 md:py-12"
    >
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button variant="outline" asChild className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:border-primary dark:text-primary dark:hover:bg-accent">
            <Link to="/activities">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Todas las Actividades
            </Link>
          </Button>
        </motion.div>

        <Card className="overflow-hidden shadow-xl border-marron-legado/10 dark:border-border dark:bg-card">
          <div className="md:flex">
            <div className="md:w-2/5 relative bg-gray-200 dark:bg-gray-700">
              {displayImageUrl ? (
                <img 
                  alt={activity.title}
                  className="w-full h-64 md:h-full object-cover"
                  src={displayImageUrl}
                />
              ) : (
                <div className="w-full h-64 md:h-full flex items-center justify-center">
                  <ImageOff className="w-24 h-24 text-gray-400 dark:text-gray-500" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <Badge 
                  variant={activity.modality === 'presencial' ? 'default' : 'secondary'}
                  className={`capitalize shadow-md ${activity.modality === 'presencial' ? 'bg-primary-antoniano text-white dark:bg-primary dark:text-primary-foreground' : 'bg-green-600 text-white dark:bg-green-700 dark:text-green-100'}`}
                >
                  {activity.modality}
                </Badge>
              </div>
            </div>

            <div className="md:w-3/5 flex flex-col">
              <CardHeader className="p-6">
                <CardTitle className="text-3xl lg:text-4xl font-poppins text-primary-antoniano dark:text-primary mb-2">
                  {activity.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-marron-legado/80 dark:text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-primary-antoniano/70 dark:text-primary/70" />
                    {formatDate(activity.date)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1.5 text-primary-antoniano/70 dark:text-primary/70" />
                    {activity.duration}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5 text-primary-antoniano/70 dark:text-primary/70" />
                    {activity.modality === 'presencial' ? 'Salta, Argentina' : 'Virtual'}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 flex-grow">
                <CardDescription className="text-marron-legado/90 dark:text-foreground/90 text-base leading-relaxed whitespace-pre-wrap">
                  {activity.description}
                </CardDescription>
                
                <div className="mt-8">
                  <h4 className="font-poppins text-lg text-primary-antoniano dark:text-primary mb-3">Cupos</h4>
                  {percentage !== null ? (
                    <>
                      <div className="flex justify-between items-center mb-1 text-sm text-marron-legado/70 dark:text-muted-foreground">
                        <span className="flex items-center"><Users className="w-4 h-4 mr-2 text-primary-antoniano/70 dark:text-primary/70" />Confirmados:</span>
                        <span>{activity.current_participants || 0} de {activity.max_participants}</span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-primary-antoniano [&>div]:to-blue-500 dark:[&>div]:from-primary dark:[&>div]:to-blue-600 rounded-full" 
                      />
                       {isFull && activity.status !== 'Finalizada' && activity.status !== 'Cerrada' && (
                        <p className="text-sm text-destructive mt-2">¡Todos los cupos están ocupados!</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-marron-legado/70 dark:text-muted-foreground flex items-center">
                      <Users className="w-4 h-4 mr-2 text-primary-antoniano/70 dark:text-primary/70" />
                      Actividad sin límite de participantes. ({activity.current_participants || 0} confirmados)
                    </p>
                  )}
                </div>

                {socialLinks.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-marron-legado/10 dark:border-border">
                    <h4 className="font-poppins text-lg text-primary-antoniano dark:text-primary mb-3">Seguí esta Actividad en Redes</h4>
                    <div className="flex flex-wrap gap-3">
                      {socialLinks.map(link => (
                        <Button 
                          key={link.platform} 
                          variant="outline" 
                          size="sm" 
                          asChild
                          className={`border-gray-300 dark:border-gray-600 ${link.color} ${link.hoverColor} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Ver en ${link.platform}`}>
                            <link.icon className="w-4 h-4 mr-2" /> {link.platform}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-6 bg-celeste-complementario/20 dark:bg-accent/10 border-t border-marron-legado/10 dark:border-border">
                  <Button
                    variant="antoniano"
                    size="lg"
                    className="w-full text-white dark:text-primary-foreground flex items-center justify-center"
                    onClick={handleUserRegister}
                    disabled={(percentage !== null && isFull) || activity.status === 'Finalizada' || activity.status === 'Cerrada' || activity.status === 'Próximamente'}
                  >
                    {activity.status === 'Finalizada' ? 'Actividad Finalizada' 
                      : activity.status === 'Cerrada' ? 'Inscripciones Cerradas'
                      : activity.status === 'Próximamente' ? 'Próximamente'
                      : (percentage !== null && isFull) ? 'Cupos Agotados' 
                      : isAuthenticated 
                        ? 'Inscribirme Ahora'
                        : <> <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión para Inscribirme</>
                    }
                  </Button>
              </CardFooter>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};

export default ActivityDetailPage;