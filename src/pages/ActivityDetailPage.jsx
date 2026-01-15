// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\ActivityDetailPage.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, MapPin, Users, Clock, ArrowLeft, Loader2, AlertTriangle, Info, MailCheck, LogIn, ImageOff, Instagram, Facebook, Linkedin, Twitter as TwitterIcon } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Helpers: Ciclos (sin tocar DB)
 * - Title formato: [Ciclo A · ...] — Título
 * - Description formato opcional: "CICLO A · ...\n\n..."
 */
const parseCycleFromTitle = (title = '') => {
  const m = title.match(/^\[(Ciclo\s+[A-Z])\s*[·\-–]\s*([^\]]+)\]\s*[—\-–]\s*(.+)$/i);
  if (!m) return { cycleCode: null, cycleName: null, cleanTitle: title };
  return {
    cycleCode: m[1].replace(/\s+/g, ' ').trim(),
    cycleName: m[2].trim(),
    cleanTitle: m[3].trim(),
  };
};

const cleanCycleFromDescription = (description = '') => {
  const normalized = description.replace(/\r\n/g, '\n').trim();
  if (!/^CICLO\s+[A-Z]/i.test(normalized)) return normalized;
  const lines = normalized.split('\n');
  const rest = lines.slice(1).join('\n').trim();
  return rest;
};

const cycleStyles = {
  'Ciclo A': 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
  'Ciclo B': 'bg-green-50 text-green-700 border-green-200',
  'Ciclo C': 'bg-brand-gold/10 text-brand-dark border-brand-gold/20',
};

const normalizeModality = (modality) => (modality || '').toLowerCase();

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
        className: "bg-brand-primary text-white border-none",
        duration: 7000,
        action: <MailCheck className="h-5 w-5 text-brand-gold" />
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
        weekday: 'long',
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
    if (max === null || max === -1) return null;
    if (!max || max === 0) return 0;
    return (current / max) * 100;
  };

  const socialLinks = [
    { platform: 'Instagram', url: activity?.instagram_url, icon: Instagram, color: 'text-pink-600', hoverColor: 'hover:bg-pink-50' },
    { platform: 'Facebook', url: activity?.facebook_url, icon: Facebook, color: 'text-blue-600', hoverColor: 'hover:bg-blue-50' },
    { platform: 'LinkedIn', url: activity?.linkedin_url, icon: Linkedin, color: 'text-blue-700', hoverColor: 'hover:bg-blue-50' },
    { platform: 'X', url: activity?.twitter_url, icon: TwitterIcon, color: 'text-sky-500', hoverColor: 'hover:bg-sky-50' },
  ].filter(link => link.url);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-sand">
        <Loader2 className="h-16 w-16 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-brand-sand">
        <AlertTriangle className="w-20 h-20 text-red-500 mb-6" />
        <h2 className="text-3xl font-poppins text-brand-dark mb-3">Error al Cargar</h2>
        <p className="text-gray-600 mb-8 max-w-md">{error}</p>
        <Button variant="outline" asChild>
          <Link to="/activities">Volver a Actividades</Link>
        </Button>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-brand-sand">
        <Info className="w-20 h-20 text-gray-400 mb-6" />
        <h2 className="text-3xl font-poppins text-brand-dark mb-3">Actividad no Encontrada</h2>
        <p className="text-gray-600 mb-8 max-w-md">La actividad que buscas no existe o fue eliminada.</p>
        <Button variant="outline" asChild>
          <Link to="/activities">Volver a Actividades</Link>
        </Button>
      </div>
    );
  }

  const isFull = activity.max_participants !== null && activity.max_participants !== -1 && (activity.current_participants || 0) >= activity.max_participants;
  const displayImageUrl = activity.image_detail_url || activity.image_url;
  const percentage = getParticipantPercentage(activity.current_participants, activity.max_participants);

  // Pro: Ciclo + títulos limpios + description sin duplicación
  const { cycleCode, cycleName, cleanTitle } = parseCycleFromTitle(activity.title);
  const chipClass = cycleStyles[cycleCode] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  const descBody = cleanCycleFromDescription(activity.description);
  const modality = normalizeModality(activity.modality);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-brand-sand font-sans py-12"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navegación Back */}
        <div className="mb-8">
          <Link to="/activities" className="inline-flex items-center text-gray-500 hover:text-brand-primary transition-colors font-medium group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver al listado
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Columna Izquierda: Imagen y Social */}
          <div className="lg:col-span-1 space-y-8">
            <div className="rounded-3xl overflow-hidden shadow-xl border border-white/50 aspect-[4/5] relative bg-brand-dark group">
              {displayImageUrl ? (
                <img
                  alt={cleanTitle || activity.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={displayImageUrl}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-brand-gold/50">
                  <ImageOff className="w-20 h-20 mb-4" />
                  <span className="uppercase font-bold tracking-widest text-sm">Sin Imagen</span>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <Badge className={`capitalize shadow-lg text-sm px-3 py-1 ${modality === 'presencial' ? 'bg-brand-primary text-white' : 'bg-green-600 text-white'}`}>
                  {modality || 'modalidad'}
                </Badge>
              </div>
            </div>

            {/* Card de Redes Sociales */}
            {socialLinks.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="font-poppins font-bold text-brand-dark mb-4 text-center">¡Compartí esta actividad!</h4>
                <div className="flex justify-center gap-3">
                  {socialLinks.map(link => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-full border border-gray-200 transition-all ${link.color} ${link.hoverColor}`}
                    >
                      <link.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Información Detallada */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-bl-full -mr-10 -mt-10"></div>

              {/* Título limpio */}
              <h1 className="text-3xl md:text-5xl font-poppins font-bold text-brand-dark mb-4 leading-tight relative z-10">
                {cleanTitle}
              </h1>

              {/* Chip del ciclo (pro) */}
              {cycleCode && cycleName && (
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${chipClass} mb-6`}>
                  <span className="px-2 py-0.5 rounded-full bg-white/60 text-xs font-extrabold uppercase tracking-wide">
                    {cycleCode}
                  </span>
                  <span className="opacity-60">·</span>
                  <span>{cycleName}</span>
                </div>
              )}

              {/* Meta Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start p-4 bg-brand-sand rounded-xl">
                  <Calendar className="w-5 h-5 text-brand-action mr-3 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</span>
                    <span className="font-medium text-brand-dark capitalize">{formatDate(activity.date)}</span>
                  </div>
                </div>
                <div className="flex items-start p-4 bg-brand-sand rounded-xl">
                  <Clock className="w-5 h-5 text-brand-action mr-3 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Duración</span>
                    <span className="font-medium text-brand-dark">{activity.duration}</span>
                  </div>
                </div>
                <div className="flex items-start p-4 bg-brand-sand rounded-xl md:col-span-2">
                  <MapPin className="w-5 h-5 text-brand-action mr-3 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</span>
                    <span className="font-medium text-brand-dark">
                      {modality === 'presencial'
                        ? 'Salta, Argentina (Ubicación detallada al inscribirse)'
                        : 'Sala Virtual (Enlace enviado por correo)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción: \n como párrafos (pro) + sin “CICLO...” repetido */}
              <div className="text-gray-600 mb-10 whitespace-pre-line leading-relaxed text-base">
                {descBody}
              </div>

              {/* Sección de Cupos */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8">
                <h4 className="font-poppins font-bold text-brand-dark mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-brand-primary" />
                  Estado de Cupos
                </h4>

                {percentage !== null ? (
                  <>
                    <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
                      <span>Ocupación</span>
                      <span>{activity.current_participants || 0} de {activity.max_participants} confirmados</span>
                    </div>
                    <Progress
                      value={percentage}
                      className="h-3 bg-gray-200 [&>div]:bg-brand-primary"
                    />
                    {isFull && activity.status !== 'Finalizada' && activity.status !== 'Cerrada' && (
                      <p className="text-sm text-red-600 font-bold mt-2">¡Cupos Completos!</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600">
                    Esta actividad tiene cupos ilimitados. ¡Invita a tus amigos!
                  </p>
                )}
              </div>

              {/* Botón de Acción Principal */}
              <div className="sticky bottom-4 md:static z-20">
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-brand-action hover:bg-red-800 text-white shadow-xl hover:shadow-2xl transition-all rounded-xl"
                  onClick={handleUserRegister}
                  disabled={(percentage !== null && isFull) || activity.status === 'Finalizada' || activity.status === 'Cerrada' || activity.status === 'Próximamente'}
                >
                  {activity.status === 'Finalizada' ? 'Actividad Finalizada'
                    : activity.status === 'Cerrada' ? 'Inscripciones Cerradas'
                      : activity.status === 'Próximamente' ? 'Próximamente'
                        : (percentage !== null && isFull) ? 'Unirse a Lista de Espera'
                          : isAuthenticated
                            ? 'Confirmar mi Asistencia'
                            : <> <LogIn className="mr-2 h-5 w-5" /> Iniciar Sesión para Participar</>
                  }
                </Button>
                {!isAuthenticated && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Serás redirigido para iniciar sesión de forma segura.
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ActivityDetailPage;
