// C:\Users\gandr\Downloads\SitioWebEvolucionAntonianaProduccion\src\pages\Activities.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar,
  MapPin,
  Clock,
  Filter,
  Loader2,
  AlertTriangle,
  Info,
  MailCheck,
  LogIn,
  Hourglass,
  CheckCircle2,
  XCircle,
  Archive,
  ImageOff,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

const Activities = () => {
  const [filter, setFilter] = useState('all'); // modalidad: all | presencial | virtual
  const [cycleFilter, setCycleFilter] = useState('all'); // ciclo: all | A | B | C

  const { activities, loading: activitiesLoading, error: activitiesError, registerForActivity, refreshActivities } =
    useActivities();
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

  // -----------------------------
  // Helpers: ciclo desde el title
  // -----------------------------
  const getCycleFromTitle = (title) => {
    if (!title) return null;
    const t = String(title);

    // Soporta:
    // "[Ciclo A · ...] — ..."
    // "CICLO A · ..."
    // "Ciclo A - ..."
    // "CICLO A — ..."
    const m = t.match(/\bCICLO\s*([ABC])\b/i);
    if (m?.[1]) return m[1].toUpperCase();

    // Si viene "[Ciclo A"
    const m2 = t.match(/\[\s*Ciclo\s*([ABC])\b/i);
    if (m2?.[1]) return m2[1].toUpperCase();

    return null;
  };

  const getCleanTitle = (title) => {
  if (!title) return '';
  // Quita prefijos tipo: "[Ciclo A · ...] — " o "CICLO A · ... — "
  return String(title)
    .replace(/^\s*\[\s*Ciclo\s*[ABC]\s*[^]]*\]\s*[—-]\s*/i, '')
    .replace(/^\s*CICLO\s*[ABC]\s*[^—-]*\s*[—-]\s*/i, '')
    .trim();
};


  // -----------------------------
  // Meta fija de los ciclos (Opción 1)
  // -----------------------------
  const cycleMeta = useMemo(
    () => ({
      A: {
        key: 'A',
        title: 'Tecnología para la vida cotidiana',
        desc: 'IA, productividad y herramientas aplicables al día a día.',
        pill: 'CICLO A',
        pillBg: 'bg-brand-primary/10',
        pillText: 'text-brand-primary',
        border: 'border-brand-primary/20',
        hover: 'hover:border-brand-primary/35',
        dot: 'bg-brand-primary',
        shadow: 'shadow-sm',
      },
      B: {
        key: 'B',
        title: 'Educación y futuro laboral',
        desc: 'Datos, perfiles y oportunidades en el mundo digital.',
        pill: 'CICLO B',
        pillBg: 'bg-green-600/10',
        pillText: 'text-green-700',
        border: 'border-green-600/20',
        hover: 'hover:border-green-600/35',
        dot: 'bg-green-600',
        shadow: 'shadow-sm',
      },
      C: {
        key: 'C',
        title: 'Comunidad y valores',
        desc: 'Acción solidaria, presencia territorial e impacto real.',
        pill: 'CICLO C',
        pillBg: 'bg-amber-500/10',
        pillText: 'text-amber-700',
        border: 'border-amber-500/20',
        hover: 'hover:border-amber-500/35',
        dot: 'bg-amber-500',
        shadow: 'shadow-sm',
      },
    }),
    []
  );

  const handleCycleClick = (cycleKey) => {
    setCycleFilter((prev) => (prev === cycleKey ? 'all' : cycleKey));
    // UX: cuando el usuario selecciona un ciclo, mantenemos el filtro de modalidad tal cual.
    // Si quisieras resetear modalidad, descomentá:
    // setFilter('all');
  };

  const handleUserRegister = async (activityId) => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Inicio de Sesión Requerido',
        description: 'Debes iniciar sesión para inscribirte en una actividad.',
        variant: 'destructive',
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/login', { state: { from: location } })}>
            Iniciar Sesión
          </Button>
        ),
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      await registerForActivity(activityId, user.id, user.email, user.name || user.user_metadata?.name || 'Usuario');
      toast({
        title: '¡Pre-Inscripción Exitosa!',
        description: 'Hemos enviado un correo para que confirmes tu asistencia. ¡Revisa tu bandeja de entrada!',
        variant: 'default',
        className: 'bg-brand-primary text-white border-none',
        duration: 7000,
        action: <MailCheck className="h-5 w-5 text-brand-gold" />,
      });
      refreshActivities();
    } catch (error) {
      toast({
        title: 'Error de Pre-Inscripción',
        description: error.message || 'No se pudo completar la pre-inscripción.',
        variant: 'destructive',
      });
    }
  };

  // -----------------------------
  // Filtering
  // -----------------------------
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // filtro modalidad
      const modalityOk = filter === 'all' ? true : String(activity.modality || '').toLowerCase() === filter;

      // filtro ciclo
      const c = getCycleFromTitle(activity.title);
      const cycleOk = cycleFilter === 'all' ? true : c === cycleFilter;

      return modalityOk && cycleOk;
    });
  }, [activities, filter, cycleFilter]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
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
      className: 'shadow-sm flex items-center gap-1.5 border px-3 py-1',
      icon: null,
      text: status,
    };

    switch (status) {
      case 'Próximamente':
        badgeProps.className += ' bg-amber-50 text-amber-700 border-amber-200';
        badgeProps.icon = <Hourglass className="w-3 h-3" />;
        break;
      case 'Abierta':
        badgeProps.className += ' bg-green-50 text-green-700 border-green-200';
        badgeProps.icon = <CheckCircle2 className="w-3 h-3" />;
        break;
      case 'Cerrada':
        badgeProps.className += ' bg-red-50 text-red-700 border-red-200';
        badgeProps.icon = <XCircle className="w-3 h-3" />;
        break;
      case 'Finalizada':
        badgeProps.className += ' bg-gray-100 text-gray-600 border-gray-200';
        badgeProps.icon = <Archive className="w-3 h-3" />;
        break;
      default:
        badgeProps.className += ' bg-gray-100 text-gray-600 border-gray-200';
        badgeProps.text = 'Estado desc.';
        break;
    }

    return (
      <Badge variant="outline" className={badgeProps.className}>
        {badgeProps.icon}
        <span className="hidden sm:inline font-semibold">{badgeProps.text}</span>
      </Badge>
    );
  };

  const getActionButton = (activity) => {
    const isFull = (activity.current_participants || 0) >= activity.max_participants;

    if (activity.status === 'Finalizada') {
      return (
        <Button variant="outline" className="w-full cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200" disabled>
          Actividad Finalizada
        </Button>
      );
    }
    if (activity.status === 'Cerrada') {
      return (
        <Button variant="outline" className="w-full cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200" disabled>
          Inscripciones Cerradas
        </Button>
      );
    }
    if (activity.status === 'Próximamente') {
      return (
        <Button variant="outline" className="w-full cursor-not-allowed border-brand-gold/50 text-brand-gold" disabled>
          Próximamente
        </Button>
      );
    }

    if (isFull) {
      return (
        <Button variant="destructive" className="w-full cursor-not-allowed opacity-80" disabled>
          Cupos Agotados
        </Button>
      );
    }

    return (
      <Button
        className="w-full flex items-center justify-center font-bold bg-brand-action hover:bg-red-800 text-white shadow-md hover:shadow-lg transition-all"
        onClick={() => handleUserRegister(activity.id)}
        disabled={authLoading}
      >
        {isAuthenticated ? (
          'Quiero Participar'
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión para Participar
          </>
        )}
      </Button>
    );
  };

  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  const showInitialLoader =
    authLoading || (activitiesLoading && activities.length === 0 && !sessionStorage.getItem('activities_loaded'));

  if (showInitialLoader) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-160px)] bg-brand-sand">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
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
      className="min-h-screen bg-brand-sand font-sans"
    >
      {/* --- HERO SECTION (Tech-Institucional) --- */}
      <section className="relative bg-brand-primary overflow-hidden py-20 px-4">
        {/* Fondo Tech Sutil */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          ></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-6">
              <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Formación y Eventos</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-poppins font-bold text-white mb-6">
              Nuestras <span className="text-brand-gold">Actividades</span>
            </h1>

            <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              Explora talleres, cursos y eventos diseñados para impulsar el desarrollo tecnológico y social de nuestra
              comunidad.
            </p>

            {/* ✅ Mini-guía + estado del ciclo seleccionado */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-brand-gold" />
                <span className="text-sm text-gray-100">
                  Actividades organizadas por ciclos: <span className="text-brand-gold font-bold">Tecnología</span> ·{' '}
                  <span className="text-brand-gold font-bold">Educación</span> ·{' '}
                  <span className="text-brand-gold font-bold">Comunidad</span>
                </span>
              </div>

              {cycleFilter !== 'all' && (
                <div className="text-sm text-gray-100">
                  Filtrando por: <span className="font-bold text-brand-gold">Ciclo {cycleFilter}</span>{' '}
                  <button
                    className="ml-2 underline underline-offset-4 text-gray-200 hover:text-white"
                    onClick={() => setCycleFilter('all')}
                    type="button"
                  >
                    limpiar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FILTERS (sticky) --- */}
      <section className="sticky top-[80px] z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-brand-dark">
              <Filter className="w-5 h-5 text-brand-primary" />
              <span className="font-semibold font-poppins">Filtrar por modalidad:</span>
            </div>

            <div className="flex space-x-2 bg-gray-100 p-1 rounded-full">
              {['all', 'presencial', 'virtual'].map((modalityFilter) => (
                <Button
                  key={modalityFilter}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(modalityFilter)}
                  className={`capitalize rounded-full px-6 transition-all duration-300 ${
                    filter === modalityFilter
                      ? 'bg-white text-brand-primary shadow-sm font-bold'
                      : 'text-gray-500 hover:text-brand-dark hover:bg-gray-200'
                  }`}
                >
                  {modalityFilter === 'all' ? 'Todas' : modalityFilter}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- CYCLES (Opción 1) --- */}
      <section className="pt-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['A', 'B', 'C'].map((k) => {
              const meta = cycleMeta[k];
              const isActive = cycleFilter === k;

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleCycleClick(k)}
                  className={`
                    text-left w-full
                    rounded-2xl p-6
                    border ${meta.border} ${meta.hover}
                    bg-white
                    transition-all duration-300
                    hover:shadow-lg
                    ${isActive ? 'ring-2 ring-brand-primary/30 shadow-lg' : meta.shadow}
                  `}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black tracking-widest uppercase ${meta.pillBg} ${meta.pillText}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        {meta.pill}
                      </div>

                      <div className="mt-3">
                        <h3 className="text-xl font-poppins font-bold text-brand-dark leading-tight">{meta.title}</h3>
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{meta.desc}</p>
                      </div>
                    </div>

                    <div className="mt-1">
                      <div
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${
                          isActive ? 'border-brand-primary/30 bg-brand-primary/5' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    {isActive ? 'Seleccionado · tocá para ver todo' : 'Tocá para filtrar por este ciclo'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- GRID DE ACTIVIDADES --- */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {activitiesLoading && activities.length === 0 && !sessionStorage.getItem('activities_loaded') ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
            </div>
          ) : activitiesError ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-red-50 rounded-3xl border border-red-100"
            >
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-xl text-red-700 font-bold mb-2">Error al cargar actividades</p>
              <p className="text-gray-600 mb-6">{activitiesError || 'Ocurrió un error inesperado.'}</p>
              <Button onClick={refreshActivities} variant="destructive">
                Intentar de nuevo
              </Button>
            </motion.div>
          ) : filteredActivities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300"
            >
              <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-brand-dark font-bold mb-2">No hay actividades disponibles.</p>
              <p className="text-gray-500">Intenta cambiar el filtro o vuelve más tarde para ver nuevas propuestas.</p>

              {(filter !== 'all' || cycleFilter !== 'all') && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => setFilter('all')}>
                    Limpiar modalidad
                  </Button>
                  <Button variant="outline" onClick={() => setCycleFilter('all')}>
                    Limpiar ciclo
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredActivities.map((activity, index) => {
                const cycle = getCycleFromTitle(activity.title);
                const cycleChip = cycle
                  ? {
                      A: { label: 'CICLO A · Tecnología', dot: 'bg-brand-primary' },
                      B: { label: 'CICLO B · Educación', dot: 'bg-green-600' },
                      C: { label: 'CICLO C · Comunidad', dot: 'bg-amber-500' },
                    }[cycle] || { label: `CICLO ${cycle}`, dot: 'bg-gray-300' }
                  : null;

                return (
                  <motion.div
                    key={activity.id}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="h-full"
                  >
                    <Card className="h-full flex flex-col bg-white rounded-2xl border border-transparent hover:border-brand-primary/20 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                      {/* Imagen Card */}
                      <Link to={`/activities/${activity.id}`} className="block relative overflow-hidden aspect-[16/10]">
                        {activity.image_url ? (
                          <img
                            alt={activity.title || 'Imagen de actividad'}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            src={activity.image_url}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-brand-dark">
                            <div className="text-center">
                              <ImageOff className="w-12 h-12 text-brand-gold mx-auto mb-2 opacity-50" />
                              <span className="text-brand-gold/30 text-sm font-bold uppercase">Sin imagen</span>
                            </div>
                          </div>
                        )}

                        {/* Overlay Gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                        {/* Badge Modalidad */}
                        <div className="absolute top-3 left-3 z-20">
                          <Badge
                            className={`capitalize shadow-md border-0 ${
                              String(activity.modality || '').toLowerCase() === 'presencial'
                                ? 'bg-brand-primary text-white'
                                : 'bg-green-600 text-white'
                            }`}
                          >
                            {activity.modality}
                          </Badge>
                        </div>

                        {/* Badge Estado */}
                        <div className="absolute top-3 right-3 z-20">{getStatusBadge(activity.status)}</div>

                        {/* ✅ Chip premium de Ciclo (Nivel Dios) */}
                        {cycleChip && (
                          <div className="absolute bottom-3 left-3 z-20">
                            <div
                              className="
                                inline-flex items-center gap-2
                                rounded-full px-3 py-1.5
                                bg-white/85 backdrop-blur-md
                                border border-white/70
                                shadow-lg
                                transition-transform duration-300
                                group-hover:-translate-y-0.5
                              "
                            >
                              <span className={`w-2 h-2 rounded-full ${cycleChip.dot}`} />
                              <span className="text-[11px] font-black tracking-widest uppercase text-brand-dark">
                                {cycleChip.label}
                              </span>
                            </div>
                          </div>
                        )}
                      </Link>

                      <CardHeader className="pt-6 pb-2 px-6">
                        <Link to={`/activities/${activity.id}`}>
                          <CardTitle className="text-xl font-poppins font-bold text-brand-dark group-hover:text-brand-action transition-colors duration-200 leading-tight line-clamp-2">
                            {getCleanTitle(activity.title)}
                          </CardTitle>
                        </Link>
                      </CardHeader>

                      <CardContent className="flex-grow space-y-4 px-6 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2.5 text-brand-gold" />
                            {formatDate(activity.date)}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Clock className="w-4 h-4 mr-2.5 text-brand-gold" />
                            {activity.duration}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2.5 text-brand-gold" />
                            {String(activity.modality || '').toLowerCase() === 'presencial' ? 'Salta, Argentina' : 'Virtual'}
                          </div>
                        </div>

                        <div className="pt-2">
                          <div className="flex justify-between items-center mb-1.5 text-xs font-medium text-gray-500">
                            <span>Cupos Ocupados</span>
                            <span className="text-brand-primary">
                              {activity.current_participants || 0} / {activity.max_participants}
                            </span>
                          </div>
                          <Progress
                            value={getParticipantPercentage(activity.current_participants, activity.max_participants)}
                            className="h-2 bg-gray-100 [&>div]:bg-brand-primary"
                          />
                        </div>
                      </CardContent>

                      <CardFooter className="p-6 pt-0 mt-auto">{getActionButton(activity)}</CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
};

export default Activities;
