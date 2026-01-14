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
  PlayCircle, XCircle, Rocket, CheckCircle2, History, Clock,
  HelpCircle, DollarSign, Users
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
// ⚠️ Tooltip eliminado para evitar error de build
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
        title: 'Error de sincronización',
        description: 'No pudimos cargar tu historial de impacto.',
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
    toast({ title: 'Sesión Finalizada', description: '¡Gracias por tu compromiso!' });
    navigate('/');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  async function performAction(kind, preapprovalId) {
    if (!preapprovalId) return;
    try {
      setActionLoadingId(preapprovalId);
      if (kind === 'pause') await pauseMembership(preapprovalId);
      if (kind === 'resume') await resumeMembership(preapprovalId);
      if (kind === 'cancel') await cancelMembership(preapprovalId);

      toast({ title: 'Actualizado', className: 'bg-green-600 text-white' });
      if (user?.id) await fetchDashboardData(user.id);
    } catch (e) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  }

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    const common = 'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border-none shadow-sm';
    if (s === 'active') return <Badge className={`${common} bg-green-500/10 text-green-600`}><CheckCircle2 size={12} /> Activa</Badge>;
    if (s === 'paused') return <Badge className={`${common} bg-amber-500/10 text-amber-600`}><PauseCircle size={12} /> Pausada</Badge>;
    return <Badge className={`${common} bg-gray-100 text-gray-500`}><XCircle size={12} /> Cancelada</Badge>;
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcfb]">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <p className="mt-4 font-poppins font-bold text-brand-dark tracking-widest text-xs uppercase">Cargando Legado...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F8FAFC] pb-20">
      
      <section className="bg-brand-dark pt-24 pb-48 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 blur-[120px] rounded-full -mr-32 -mt-32" />
        
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left space-y-2">
                    <Badge className="bg-brand-primary/20 text-brand-sand border-none px-4 py-1 rounded-full text-[10px] font-black tracking-[0.3em] uppercase">Panel de Miembro</Badge>
                    <h1 className="text-4xl md:text-6xl font-poppins font-black text-white tracking-tighter">
                        Hola, {currentUser.name?.split(' ')[0] || 'Antoniano'}
                    </h1>
                </div>
                <Button variant="ghost" onClick={handleLogout} className="text-red-400 hover:bg-red-500/10 rounded-2xl h-12 px-6 font-bold">
                    <LogOut className="w-5 h-5 mr-2" /> CERRAR SESIÓN
                </Button>
            </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-32 relative z-20">
        <DashboardHeader user={currentUser} onUpdateSuccess={(data) => { setCurrentUser(data); setAuthUser(data); }} />

        {/* --- MÉTRICAS GLOBALES (NASA STYLE) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            {/* Métrica 1: Inversión Social Global */}
            <Card 
              title="Suma total de donaciones aprobadas de toda la Fundación"
              className="border-none shadow-xl rounded-[2rem] bg-gradient-to-br from-brand-primary to-blue-900 p-8 text-white relative overflow-hidden group cursor-help"
            >
                <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-blue-200">
                        <Heart size={16} />
                        <span className="text-xs font-black uppercase tracking-widest text-blue-100">Inversión Social Global</span>
                        <HelpCircle size={14} className="opacity-50" />
                    </div>
                    <h3 className="text-5xl font-black font-poppins tracking-tighter">${(metrics.total_donado || 0).toLocaleString('es-AR')}</h3>
                    <p className="text-[10px] text-blue-300 mt-2 font-bold uppercase tracking-tighter">Impacto total de nuestra comunidad</p>
                </div>
            </Card>

            {/* Métrica 2: Impactos Directos Globales */}
            <Card 
              title="Cantidad de suscripciones mensuales activas actualmente"
              className="border-none shadow-xl rounded-[2rem] bg-gradient-to-br from-brand-action to-red-900 p-8 text-white relative overflow-hidden group cursor-help"
            >
                <Users className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-red-200">
                        <Rocket size={16} />
                        <span className="text-xs font-black uppercase tracking-widest text-red-100">Impactos Directos Activos</span>
                        <HelpCircle size={14} className="opacity-50" />
                    </div>
                    <h3 className="text-5xl font-black font-poppins tracking-tighter">{metrics.total_suscripciones_activas || 0}</h3>
                    <p className="text-[10px] text-red-300 mt-2 font-bold uppercase tracking-tighter">Padrinos sosteniendo la misión hoy</p>
                </div>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-12">
          <div className="lg:col-span-1 space-y-8">
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 bg-gray-50 border-b border-gray-100">
                <CardTitle className="text-xl font-black text-brand-dark flex items-center gap-3">
                  <div className="p-2 bg-brand-sand rounded-xl"><CreditCard className="w-5 h-5 text-brand-primary" /></div>
                  BITÁCORA DE DONACIONES
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {userMemberships.length > 0 ? (
                  userMemberships.map((m) => (
                    <div key={m.id} className="p-6 rounded-3xl border border-gray-100 bg-white hover:border-brand-primary/20 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Suscripción Personal</p>
                            <p className="font-black text-brand-dark text-lg leading-tight">{m.plan}</p>
                            <p className="text-2xl font-poppins font-black text-brand-primary">${Number(m.amount).toLocaleString('es-AR')}</p>
                        </div>
                        {statusBadge(m.status)}
                      </div>
                      
                      <div className="flex gap-2 pt-4 border-t border-gray-50">
                        {m.status === 'active' && (
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl font-bold border-amber-200 text-amber-700 h-10" onClick={() => performAction('pause', m.preapproval_id)}>Pausar</Button>
                        )}
                        {m.status === 'paused' && (
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl font-bold bg-green-50 text-green-700 h-10" onClick={() => performAction('resume', m.preapproval_id)}>Reanudar</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-400 font-bold h-10" onClick={() => performAction('cancel', m.preapproval_id)}>Cancelar</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <Heart className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm mb-6">No tienes planes activos.</p>
                    <Button className="bg-brand-primary w-full rounded-xl font-black" asChild><Link to="/colaborar">SER PADRINO</Link></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black text-brand-dark font-poppins flex items-center gap-4 tracking-tight uppercase">
                    <History className="text-brand-gold w-7 h-7" /> Mis Actividades
                </h2>
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
                      <div className="absolute left-0 w-11 h-11 bg-white rounded-full border-4 border-[#F8FAFC] shadow-xl flex items-center justify-center z-10 group-hover:scale-125 transition-all">
                          <Rocket size={18} className="text-brand-primary" />
                      </div>

                      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white hover:shadow-2xl transition-all border border-gray-50/50">
                          <div className="flex flex-col md:flex-row">
                              <div className="p-8 flex-1 space-y-5">
                                  <div className="flex justify-between items-center">
                                      <Badge className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-none ${reg.activity.modality === 'presencial' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                          {reg.activity.modality}
                                      </Badge>
                                      <span className="text-[10px] font-black text-gray-300 uppercase">Inscripción: {formatDate(reg.registered_at)}</span>
                                  </div>
                                  
                                  <Link to={`/activities/${reg.activity.id}`}>
                                      <h3 className="text-2xl font-black text-brand-dark leading-tight group-hover:text-brand-primary transition-colors">{reg.activity.title}</h3>
                                  </Link>
                                  
                                  <div className="flex flex-wrap gap-4 pt-2">
                                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100/50">
                                          <Calendar size={14} className="text-brand-gold" /> {formatDate(reg.activity.date)}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 font-bold bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100/50">
                                          <Clock size={14} className="text-brand-gold" /> {reg.activity.duration}
                                      </div>
                                  </div>
                              </div>
                              <div className="bg-brand-sand/20 p-8 flex flex-col justify-center items-center border-l border-white md:w-32">
                                  <Button 
                                      variant="ghost" 
                                      className="rounded-2xl h-16 w-16 p-0 bg-white shadow-2xl hover:scale-110 transition-all text-brand-primary"
                                      onClick={() => window.open(generateGoogleCalendarLink(reg.activity), '_blank')}
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
                <div className="text-center py-20 bg-white rounded-[3.5rem] shadow-inner border border-gray-100 flex flex-col items-center gap-6">
                    <History size={48} className="text-gray-200" />
                    <div className="space-y-1">
                        <p className="text-brand-dark font-black text-xl uppercase">Sin actividad registrada</p>
                        <p className="text-gray-400 text-sm italic">Tu historia de impacto comienza con el primer paso.</p>
                    </div>
                    <Button className="h-12 px-8 bg-brand-dark hover:bg-brand-primary text-white font-black rounded-xl" asChild>
                        <a href="https://www.evolucionantoniana.com/activities">EXPLORAR CRONOGRAMA</a>
                    </Button>
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