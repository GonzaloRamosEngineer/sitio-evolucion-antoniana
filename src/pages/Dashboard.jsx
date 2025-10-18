import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getUserRegistrations } from '@/api/activitiesApi';
import {
  getUserMemberships,
  pauseMembership,
  resumeMembership,
  cancelMembership
} from '@/api/membershipApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Award, LogOut, Loader2, AlertTriangle, Info, CalendarPlus } from 'lucide-react';
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
        getUserMemberships(userId, { onlyActive: false }), // todas para gestionar
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
    const common = 'text-white dark:text-primary-foreground';
    if (s === 'active') return <Badge className={`bg-green-600 dark:bg-green-700 ${common}`}>activa</Badge>;
    if (s === 'paused') return <Badge className={`bg-yellow-600 dark:bg-yellow-700 ${common}`}>pausada</Badge>;
    if (s === 'cancelled') return <Badge className={`bg-gray-500 dark:bg-gray-600 ${common}`}>cancelada</Badge>;
    return <Badge className={`bg-blue-600 dark:bg-blue-700 ${common}`}>{s}</Badge>; // pending u otros
  };

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

      toast({ title: 'Listo', description: 'Estado de la suscripción actualizado.' });
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
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-blanco-fundacion dark:bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary-antoniano dark:text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-6 bg-blanco-fundacion dark:bg-background">
        <AlertTriangle className="w-20 h-20 text-destructive mb-6" />
        <h2 className="text-3xl font-poppins text-primary-antoniano dark:text-primary mb-3">Acceso Denegado</h2>
        <p className="text-marron-legado/80 dark:text-muted-foreground mb-8 max-w-md">
          Debes iniciar sesión para ver tu dashboard.
        </p>
        <Button variant="antoniano" asChild className="text-white dark:text-primary-foreground">
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
      className="min-h-screen bg-gradient-to-br from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion dark:from-background/70 dark:via-background dark:to-background font-inter py-8 md:py-12"
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl md:text-4xl font-poppins text-primary-antoniano dark:text-primary mb-4 md:mb-0">
            Mi Panel
          </h1>
          <div className="flex items-center space-x-3">
            {userIsAdmin && (
              <Button
                variant="outline"
                asChild
                className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:border-primary dark:text-primary dark:hover:bg-accent"
              >
                <Link to="/admin">Panel Admin</Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-destructive text-destructive hover:bg-red-100 dark:hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </motion.div>

        {currentUser && <DashboardHeader user={currentUser} onUpdateSuccess={handleProfileUpdate} />}

        <SummaryMetrics metrics={metrics} loading={metricsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Columna izquierda */}
          <motion.div
            className="lg:col-span-1 space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Mis colaboraciones */}
            <Card className="shadow-xl border-marron-legado/10 dark:border-border dark:bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-poppins text-primary-antoniano dark:text-primary flex items-center">
                  <Award className="w-6 h-6 mr-3 text-primary-antoniano/80 dark:text-primary/80" />
                  Mis Colaboraciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userMemberships && userMemberships.length > 0 ? (
                  <div className="space-y-4">
                    {userMemberships.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-lg border border-celeste-complementario/40 dark:border-accent/40 bg-celeste-complementario/10 dark:bg-accent/20"
                      >
                        <p className="text-marron-legado dark:text-foreground">
                          Plan:{' '}
                          <span className="font-semibold text-primary-antoniano dark:text-primary">{m.plan}</span>
                        </p>
                        <p className="text-marron-legado dark:text-foreground">
                          Monto:{' '}
                          <span className="font-semibold text-primary-antoniano dark:text-primary">
                            ${Number(m.amount).toLocaleString('es-AR')}
                          </span>
                        </p>
                        <p className="text-marron-legado dark:text-foreground flex items-center gap-2">
                          Estado: {statusBadge(m.status)}
                        </p>
                        {m.next_charge_date && (
                          <p className="text-sm text-muted-foreground">
                            Próximo cobro: {formatDate(m.next_charge_date)}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">Desde: {formatDate(m.created_at)}</p>

                        {/* Acciones */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('pause', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : null}
                              Pausar
                            </Button>
                          )}

                          {m.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('resume', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : null}
                              Reanudar
                            </Button>
                          )}

                          {m.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('cancel', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : null}
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Info className="w-10 h-10 text-primary-antoniano/50 dark:text-primary/50 mx-auto mb-3" />
                    <p className="text-marron-legado/90 dark:text-muted-foreground mb-3">
                      Aún no tienes colaboraciones.
                    </p>
                    <Button variant="antoniano" asChild className="text-white dark:text-primary-foreground">
                      <Link to="/collaborate">Quiero Colaborar</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Columna derecha */}
          <motion.div
            className="lg:col-span-2 space-y-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Inscripciones a actividades */}
            <Card className="shadow-xl border-marron-legado/10 dark:border-border dark:bg-card">
              <CardHeader>
                <CardTitle className="text-xl font-poppins text-primary-antoniano dark:text-primary flex items-center">
                  <Calendar className="w-6 h-6 mr-3 text-primary-antoniano/80 dark:text-primary/80" />
                  Mis Actividades Inscritas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userRegistrations && userRegistrations.length > 0 ? (
                  <div className="space-y-6">
                    {userRegistrations.map((reg) =>
                      reg.activity ? (
                        <motion.div
                          key={reg.id}
                          className="p-5 border border-celeste-complementario dark:border-accent rounded-lg bg-celeste-complementario/20 dark:bg-accent/30 hover:shadow-md transition-shadow"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                            <Link to={`/activities/${reg.activity.id}`}>
                              <h4 className="font-semibold text-lg text-primary-antoniano dark:text-primary hover:underline mb-1 sm:mb-0">
                                {reg.activity.title}
                              </h4>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(generateGoogleCalendarLink(reg.activity), '_blank')}
                              className="mt-2 sm:mt-0 border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:border-primary dark:text-primary dark:hover:bg-accent"
                            >
                              <CalendarPlus className="w-4 h-4 mr-2" />
                              Agregar a Calendario
                            </Button>
                          </div>
                          <p className="text-sm text-marron-legado/80 dark:text-muted-foreground mb-1">
                            Fecha: {formatDate(reg.activity.date)} | Duración: {reg.activity.duration}
                          </p>
                          <p className="text-sm text-marron-legado/80 dark:text-muted-foreground mb-2">
                            Modalidad:{' '}
                            <Badge
                              variant={reg.activity.modality === 'presencial' ? 'default' : 'secondary'}
                              className={`capitalize text-xs ${
                                reg.activity.modality === 'presencial'
                                  ? 'bg-primary-antoniano text-white dark:bg-primary dark:text-primary-foreground'
                                  : 'bg-green-600 text-white dark:bg-green-700 dark:text-primary-foreground'
                              }`}
                            >
                              {reg.activity.modality}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Inscrito el: {formatDate(reg.registered_at)}
                          </p>
                        </motion.div>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Info className="w-12 h-12 text-primary-antoniano/50 dark:text-primary/50 mx-auto mb-4" />
                    <p className="text-marron-legado/90 dark:text-muted-foreground mb-4">
                      No estás inscrito en ninguna actividad actualmente.
                    </p>
                    <Button variant="antoniano" asChild className="text-white dark:text-primary-foreground">
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
