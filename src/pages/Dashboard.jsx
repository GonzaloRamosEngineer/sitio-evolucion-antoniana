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
import { 
  Calendar, Award, LogOut, Loader2, AlertTriangle, Info, 
  CalendarPlus, Heart, CreditCard, User, PauseCircle, 
  PlayCircle, XCircle, Rocket, CheckCircle2, History, Clock 
} from 'lucide-react';
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
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudieron sincronizar los datos de tu perfil.',
        variant: 'destructive'
      });
    } finally {
      setPageLoading(false);
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user?.id) {
        fetchDashboardData(user.id);
      } else {
        setPageLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, user?.id]);

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Sesión Cerrada', description: '¡Vuelve pronto!' });
    navigate('/');
  };

  const handleProfileUpdate = async (updatedUserData) => {
    setCurrentUser(updatedUserData);
    setAuthUser(updatedUserData);
    await refreshUser();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '---';
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    const common = 'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border-none shadow-sm';
    
    if (s === 'active') return <Badge className={`${common} bg-green-500/10 text-green-600`}><CheckCircle2 size={12} /> Activa</Badge>;
    if (s === 'paused') return <Badge className={`${common} bg-amber-500/10 text-amber-600`}><PauseCircle size={12} /> Pausada</Badge>;
    if (s === 'cancelled') return <Badge className={`${common} bg-gray-100 text-gray-500`}><XCircle size={12} /> Cancelada</Badge>;
    
    return <Badge className={`${common} bg-blue-50 text-blue-700`}>{s}</Badge>;
  };

  async function performAction(kind, preapprovalId) {
    if (!preapprovalId) {
      toast({ title: 'Acción no disponible', variant: 'destructive' });
      return;
    }
    try {
      setActionLoadingId(preapprovalId);
      if (kind === 'pause') await pauseMembership(preapprovalId);
      if (kind === 'resume') await resumeMembership(preapprovalId);
      if (kind === 'cancel') await cancelMembership(preapprovalId);

      toast({ title: '¡Actualizado!', description: 'Estado de suscripción modificado.', className: 'bg-green-600 text-white border-none' });
      if (user?.id) await fetchDashboardData(user.id);
    } catch (e) {
      toast({ title: 'Error', description: e?.message || 'Error en la operación.', variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  }

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-sand gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
        <p className="font-poppins font-bold text-brand-dark animate-pulse tracking-widest uppercase text-xs">Sincronizando Misión...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-brand-sand">
        <div className="bg-red-50 p-6 rounded-full mb-6">
            <AlertTriangle className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-4xl font-poppins font-black text-brand-dark mb-4 tracking-tight uppercase">Acceso Restringido</h2>
        <p className="text-gray-500 mb-8 max-w-md italic">
          Necesitas iniciar sesión para acceder a tu panel de impacto y gestionar tus actividades.
        </p>
        <Button className="h-14 px-10 bg-brand-primary text-white font-black rounded-2xl shadow-xl transition-all active:scale-95" asChild>
          <Link to="/login text-lg">INICIAR SESIÓN</Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#F8FAFC] font-sans pb-20"
    >
      {/* --- HERO DASHBOARD NASA STYLE --- */}
      <section className="bg-brand-dark pt-28 pb-44 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/20 blur-[100px] rounded-full -mr-20 -mt-20" />
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-3">
                <Badge className="bg-brand-primary/30 text-brand-sand border-none px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.3em]">OPERACIONES ACTIVAS</Badge>
                <h1 className="text-4xl md:text-6xl font-poppins font-black text-white tracking-tighter leading-none">
                    Hola, {currentUser.name?.split(' ')[0] || 'Miembro'}
                </h1>
                <p className="text-gray-400 text-lg font-light max-w-lg italic">"Cada pequeña acción es un paso hacia la evolución que buscamos."</p>
            </div>
            <div className="flex gap-4">
                {userIsAdmin && (
                  <Button variant="outline" className="h-12 px-6 rounded-2xl border-white/10 text-white bg-white/5 hover:bg-white/10 transition-all font-bold" asChild>
                    <Link to="/admin">ADMIN PANEL</Link>
                  </Button>
                )}
                <Button variant="ghost" onClick={handleLogout} className="h-12 px-6 rounded-2xl text-red-400 hover:bg-red-500/10 font-bold">
                  <LogOut className="w-5 h-5 mr-2" /> SALIR
                </Button>
            </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-28 relative z-20">
        {/* COMPONENTE DE CARNET (Valida membresía internamente) */}
        <DashboardHeader user={currentUser} onUpdateSuccess={handleProfileUpdate} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-16">
          
          {/* COLUMNA IZQUIERDA: MÉTRICAS Y PLANES */}
          <div className="lg:col-span-1 space-y-10">
            <SummaryMetrics metrics={metrics} loading={metricsLoading} />
            
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 bg-gray-50/50 border-b border-gray-100">
                <CardTitle className="text-xl font-black text-brand-dark flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-brand-sand rounded-xl"><CreditCard className="w-5 h-5 text-brand-primary" /></div>
                  GESTIÓN FINANCIERA
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {userMemberships.length > 0 ? (
                  userMemberships.map((m) => (
                    <div key={m.id} className="p-6 rounded-3xl border border-gray-100 bg-white hover:shadow-xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-12 -mt-12 group-hover:bg-brand-primary/10 transition-colors" />
                      
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Actual</p>
                            <p className="font-black text-brand-dark group-hover:text-brand-primary transition-colors text-lg leading-tight">{m.plan}</p>
                            <p className="text-2xl font-poppins font-black text-brand-dark">${Number(m.amount).toLocaleString('es-AR')}<span className="text-[10px] text-gray-400 ml-1">/mes</span></p>
                        </div>
                        {statusBadge(m.status)}
                      </div>
                      
                      <div className="text-[10px] text-gray-400 font-medium mb-5 pt-3 border-t border-gray-50">
                        {m.next_charge_date && <p className="flex items-center gap-1.5"><Clock size={10}/> Prox. cobro: {formatDate(m.next_charge_date)}</p>}
                      </div>

                      <div className="flex gap-2 relative z-10">
                        {m.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 rounded-xl h-10 font-bold border-amber-200 text-amber-700 hover:bg-amber-50" 
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('pause', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id ? <Loader2 size={14} className="animate-spin" /> : "Pausar"}
                            </Button>
                        )}
                        {m.status === 'paused' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 rounded-xl h-10 font-bold bg-green-50 text-green-700 border-green-100 hover:bg-green-100" 
                              disabled={actionLoadingId === m.preapproval_id}
                              onClick={() => performAction('resume', m.preapproval_id)}
                            >
                              {actionLoadingId === m.preapproval_id ? <Loader2 size={14} className="animate-spin" /> : "Reanudar"}
                            </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl px-4 font-bold"
                          disabled={actionLoadingId === m.preapproval_id}
                          onClick={() => performAction('cancel', m.preapproval_id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/30">
                    <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm text-gray-400 mb-6 italic">Tu camino de padrino espera...</p>
                    <Button size="lg" className="bg-brand-primary text-white font-black rounded-xl px-8" asChild><Link to="/colaborar">EMPEZAR AHORA</Link></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: BITÁCORA DE IMPACTO (TIMELINE) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black text-brand-dark font-poppins flex items-center gap-4 tracking-tight uppercase">
                    <History className="text-brand-gold w-7 h-7" /> Bitácora de Impacto
                </h2>
                <Badge className="bg-white shadow-sm text-brand-primary border-gray-100 px-5 py-1.5 rounded-full uppercase text-[10px] font-black tracking-widest">
                    {userRegistrations.length} EVENTOS
                </Badge>
            </div>

            <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-1 before:bg-gradient-to-b before:from-brand-primary before:via-brand-gold before:to-transparent">
              {userRegistrations.length > 0 ? (
                userRegistrations.map((reg, idx) => (
                  reg.activity ? (
                    <motion.div 
                      key={reg.id} 
                      initial={{ opacity: 0, x: 20 }} 
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative pl-14 group"
                    >
                      <div className="absolute left-0 w-11 h-11 bg-white rounded-full border-4 border-[#F8FAFC] shadow-xl flex items-center justify-center z-10 group-hover:scale-125 group-hover:border-brand-primary transition-all duration-500">
                          <Rocket size={18} className="text-brand-primary" />
                      </div>

                      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white hover:shadow-2xl transition-all duration-500 border border-gray-50/50 group-hover:translate-x-2">
                          <div className="flex flex-col md:flex-row">
                              <div className="p-8 flex-1 space-y-5">
                                  <div className="flex justify-between items-center">
                                      <Badge className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-none ${reg.activity.modality === 'presencial' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                          {reg.activity.modality}
                                      </Badge>
                                      <span className="text-[10px] font-black text-gray-300 uppercase flex items-center gap-1.5"><Calendar size={12}/> Registrado: {formatDate(reg.registered_at)}</span>
                                  </div>
                                  
                                  <Link to={`/activities/${reg.activity.id}`}>
                                      <h3 className="text-2xl font-black text-brand-dark leading-[1.2] group-hover:text-brand-primary transition-colors pr-4">{reg.activity.title}</h3>
                                  </Link>
                                  
                                  <div className="flex flex-wrap gap-4 pt-2">
                                      <div className="flex items-center gap-2.5 text-[11px] text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100/50 shadow-sm">
                                          <Calendar size={14} className="text-brand-gold" /> {formatDate(reg.activity.date)}
                                      </div>
                                      <div className="flex items-center gap-2.5 text-[11px] text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100/50 shadow-sm">
                                          <Clock size={14} className="text-brand-gold" /> {reg.activity.duration}
                                      </div>
                                  </div>
                              </div>
                              <div className="bg-brand-sand/20 p-8 flex flex-col justify-center items-center border-l border-white md:w-32">
                                  <Button 
                                      variant="ghost" 
                                      className="rounded-2xl h-16 w-16 p-0 bg-white shadow-2xl hover:scale-110 active:scale-95 transition-all text-brand-primary hover:bg-brand-primary hover:text-white border-none"
                                      onClick={() => window.open(generateGoogleCalendarLink(reg.activity), '_blank')}
                                      title="Añadir a mi Calendario"
                                  >
                                      <CalendarPlus size={28} />
                                  </Button>
                              </div>
                          </div>
                      </Card>
                    </motion.div>
                  ) : null
                ))
              ) : (
                <div className="text-center py-24 bg-white rounded-[3.5rem] shadow-inner border border-gray-100 flex flex-col items-center gap-6">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                        <History size={40} className="text-gray-200" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-brand-dark font-black text-xl tracking-tight uppercase">Misión en espera</p>
                        <p className="text-gray-400 font-medium italic text-sm">Tu historia de impacto está lista para comenzar...</p>
                    </div>
                    <Button className="h-12 px-8 bg-brand-dark hover:bg-brand-primary text-white font-black rounded-xl transition-all" asChild><Link to="/activities text-xs">EXPLORAR CRONOGRAMA</Link></Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;