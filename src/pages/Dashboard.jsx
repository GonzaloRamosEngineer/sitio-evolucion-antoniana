import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserRegistrations } from '@/api/activitiesApi';
import {
  getUserMemberships,
  pauseMembership,
  resumeMembership,
  cancelMembership
} from '@/api/membershipApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Award, LogOut, Loader2, AlertTriangle, Info, CalendarPlus, Heart, CreditCard, User, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import SummaryMetrics from '@/components/Dashboard/SummaryMetrics';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import { generateGoogleCalendarLink } from '@/lib/calendarUtils';

const Dashboard = () => {
  const {
    user,
    logout,
    loading: authLoading,
    isAdmin: userIsAdmin,
    isAuthenticated,
    setUser: setAuthUser,
    refreshUser
  } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState(user);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [metrics, setMetrics] = useState({ total_donado: 0, total_suscripciones_activas: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const fetchDashboardData = async (userId) => {
    if (!userId) {
      setPageLoading(false);
      return;
    }
    try {
      const [registrationsData, membershipsResult, metricsDataResult] = await Promise.all([
        getUserRegistrations(userId),
        getUserMemberships(userId, { onlyActive: false }),
        supabase.from('fundacion_metrics').select('*').single()
      ]);

      setUserRegistrations(Array.isArray(registrationsData) ? registrationsData : []);
      setUserMemberships(Array.isArray(membershipsResult) ? membershipsResult : []);

      if (metricsDataResult.data) {
        setMetrics(metricsDataResult.data);
      } else {
        setMetrics({ total_donado: 0, total_suscripciones_activas: 0 });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error?.message || error);
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudieron cargar los datos del dashboard.',
        variant: 'destructive'
      });
    } finally {
      setPageLoading(false);
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      setPageLoading(true);
      return;
    }
    if (isAuthenticated && user?.id) {
      fetchDashboardData(user.id);
    } else {
      setPageLoading(false);
    }
  }, [authLoading, isAuthenticated, user?.id]);

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión exitosamente.' });
    navigate('/');
  };

  const handleProfileUpdate = async (updatedUserData) => {
    setCurrentUser(updatedUserData);
    setAuthUser(updatedUserData);
    await refreshUser();
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
    } catch {
      return 'Fecha inválida';
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    const common = 'px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm';
    
    if (s === 'active') return <span className={`${common} bg-green-50 text-green-700 border-green-200 flex items-center gap-1`}><CheckCircle2 className="w-3 h-3" /> Activa</span>;
    if (s === 'paused') return <span className={`${common} bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1`}><PauseCircle className="w-3 h-3" /> Pausada</span>;
    if (s === 'cancelled') return <span className={`${common} bg-gray-50 text-gray-600 border-gray-200 flex items-center gap-1`}><XCircle className="w-3 h-3" /> Cancelada</span>;
    
    return <span className={`${common} bg-blue-50 text-blue-700 border-blue-200`}>{s}</span>;
  };

  // Importamos el icono que faltaba en la función badge
  const CheckCircle2 = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>;


  async function performAction(kind, preapprovalId) {
    if (!preapprovalId) {
      toast({
        title: 'Acción no disponible',
        description: 'Falta el identificador de la suscripción.',
        variant: 'destructive'
      });
      return;
    }
    try {
      setActionLoadingId(preapprovalId);
      if (kind === 'pause') await pauseMembership(preapprovalId);
      if (kind === 'resume') await resumeMembership(preapprovalId);
      if (kind === 'cancel') await cancelMembership(preapprovalId);

      toast({ title: '¡Listo!', description: 'Estado de la suscripción actualizado correctamente.', className: 'bg-green-600 text-white border-none' });
      if (user?.id) await fetchDashboardData(user.id);
    } catch (e) {
      console.error(e);
      toast({
        title: 'No se pudo actualizar',
        description: e?.message || 'Error en la operación.',
        variant: 'destructive'
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-sand">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-brand-sand">
        <div className="bg-red-50 p-4 rounded-full mb-6">
            <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-poppins font-bold text-brand-dark mb-3">Acceso Restringido</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Necesitas iniciar sesión para acceder a tu panel personal y gestionar tus actividades.
        </p>
        <Button className="bg-brand-action text-white hover:bg-red-800" asChild>
          <Link to="/login">Iniciar Sesión</Link>
        </Button>
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
      className="min-h-screen bg-brand-sand font-sans pb-20"
    >
      {/* --- HERO DASHBOARD --- */}
      <section className="bg-brand-primary pt-24 pb-32 px-4 relative overflow-hidden">
         {/* Fondo Tech Sutil */}
        <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-poppins font-bold text-white mb-2">
                        Hola, {currentUser.name?.split(' ')[0] || 'Miembro'} 👋
                    </h1>
                    <p className="text-blue-200">
                        Bienvenido a tu espacio en Fundación Evolución Antoniana.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    {userIsAdmin && (
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                            <Link to="/admin">Panel Admin</Link>
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        onClick={handleLogout}
                        className="border-red-500/50 text-red-200 hover:bg-red-500/10 hover:text-red-100 hover:border-red-500"
                    >
                        <LogOut className="w-4 h-4 mr-2" /> Salir
                    </Button>
                </div>
            </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
        
        {/* --- COMPONENTE DE PERFIL (Header) --- */}
        {currentUser && <DashboardHeader user={currentUser} onUpdateSuccess={handleProfileUpdate} />}

        {/* --- MÉTRICAS --- */}
        <div className="mt-8">
             <SummaryMetrics metrics={metrics} loading={metricsLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          
          {/* --- COLUMNA IZQUIERDA: COLABORACIONES --- */}
          <motion.div
            className="lg:col-span-1 space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-lg bg-white overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
                <CardTitle className="text-lg font-poppins font-bold text-brand-dark flex items-center gap-2">
                  <Heart className="w-5 h-5 text-brand-action" />
                  Mis Colaboraciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {userMemberships && userMemberships.length > 0 ? (
                  <div className="space-y-4">
                    {userMemberships.map((m) => (
                      <div
                        key={m.id}
                        className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="font-bold text-brand-dark text-lg">{m.plan}</p>
                                <p className="text-sm text-gray-500">Monto: <span className="font-semibold text-brand-primary">${Number(m.amount).toLocaleString('es-AR')}</span></p>
                            </div>
                            <div>{statusBadge(m.status)}</div>
                        </div>
                        
                        <div className="text-xs text-gray-400 space-y-1 mb-4 border-t border-gray-50 pt-3">
                            {m.next_charge_date && <p>Próximo cobro: {formatDate(m.next_charge_date)}</p>}
                            <p>Iniciado el: {formatDate(m.created_at)}</p>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-wrap gap-2">
                          {m.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('pause', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                              Pausar
                            </Button>
                          )}

                          {m.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('resume', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                              Reanudar
                            </Button>
                          )}

                          {m.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('cancel', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm mb-4">
                      Aún no tienes suscripciones activas.
                    </p>
                    <Button size="sm" className="bg-brand-primary hover:bg-brand-dark text-white rounded-full" asChild>
                      <Link to="/collaborate">Quiero Colaborar</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* --- COLUMNA DERECHA: ACTIVIDADES --- */}
          <motion.div
            className="lg:col-span-2 space-y-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-none shadow-lg bg-white overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
                <CardTitle className="text-lg font-poppins font-bold text-brand-dark flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                  Mis Actividades
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {userRegistrations && userRegistrations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userRegistrations.map((reg) =>
                      reg.activity ? (
                        <motion.div
                          key={reg.id}
                          className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <div className="p-5 flex-grow">
                             <div className="flex justify-between items-start mb-2">
                                <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-bold ${reg.activity.modality === 'presencial' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                    {reg.activity.modality}
                                </Badge>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {formatDate(reg.registered_at)}
                                </span>
                             </div>
                             
                             <Link to={`/activities/${reg.activity.id}`} className="block group-hover:text-brand-action transition-colors">
                                <h4 className="font-bold text-lg text-brand-dark leading-tight mb-2 line-clamp-2">
                                    {reg.activity.title}
                                </h4>
                             </Link>

                             <div className="text-sm text-gray-500 space-y-1">
                                <p>Fecha: <span className="text-brand-dark font-medium">{formatDate(reg.activity.date)}</span></p>
                                <p>Duración: {reg.activity.duration}</p>
                             </div>
                          </div>
                          
                          <div className="bg-gray-50 p-3 border-t border-gray-100 flex justify-center">
                             <Button
                                variant="ghost"
                                size="sm"
                                className="text-brand-primary hover:text-brand-dark hover:bg-white w-full h-8 text-xs font-semibold"
                                onClick={() => window.open(generateGoogleCalendarLink(reg.activity), '_blank')}
                             >
                                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                                Agregar a Google Calendar
                             </Button>
                          </div>
                        </motion.div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6">
                      No estás inscrito en ninguna actividad actualmente.
                    </p>
                    <Button className="bg-brand-dark hover:bg-brand-primary text-white" asChild>
                      <Link to="/activities">Explorar Actividades</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;