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
import { 
  Calendar, Award, LogOut, Loader2, AlertTriangle, 
  CalendarPlus, Heart, CreditCard, PauseCircle, 
  PlayCircle, XCircle, Rocket, CheckCircle2, History, Clock,
  HelpCircle, DollarSign, Users, ShieldCheck, Globe,
  ArrowDownRight, ExternalLink, Gem
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import SummaryMetrics from '@/components/Dashboard/SummaryMetrics';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import { generateGoogleCalendarLink } from '@/lib/calendarUtils';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const Dashboard = () => {
  const { user, logout, loading: authLoading, isAdmin: userIsAdmin, isAuthenticated, setUser: setAuthUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState(user);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [userDonations, setUserDonations] = useState([]); // Nueva Bitácora de Pagos
  const [pageLoading, setPageLoading] = useState(true);
  const [metrics, setMetrics] = useState({ total_donado: 0, total_suscripciones_activas: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => { setCurrentUser(user); }, [user]);

  const fetchDashboardData = async (userId) => {
    if (!userId) { setPageLoading(false); return; }
    try {
      const [registrationsData, membershipsResult, metricsDataResult, donationsResult] = await Promise.all([
        getUserRegistrations(userId),
        getUserMemberships(userId, { onlyActive: false }),
        supabase.from('fundacion_metrics').select('*').single(),
        supabase.from('donations').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      setUserRegistrations(Array.isArray(registrationsData) ? registrationsData : []);
      setUserMemberships(Array.isArray(membershipsResult) ? membershipsResult : []);
      setUserDonations(donationsResult.data || []);
      
      if (metricsDataResult.data) setMetrics(metricsDataResult.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({ title: 'Sincronización interrumpida', variant: 'destructive' });
    } finally {
      setPageLoading(false);
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user?.id) fetchDashboardData(user.id);
      else setPageLoading(false);
    }
  }, [authLoading, isAuthenticated, user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  async function performAction(kind, preapprovalId) {
    if (!preapprovalId) return;
    try {
      setActionLoadingId(preapprovalId);
      if (kind === 'pause') await pauseMembership(preapprovalId);
      if (kind === 'resume') await resumeMembership(preapprovalId);
      if (kind === 'cancel') await cancelMembership(preapprovalId);
      toast({ title: 'Estado actualizado', className: 'bg-brand-dark text-white rounded-2xl' });
      if (user?.id) await fetchDashboardData(user.id);
    } catch (e) {
      toast({ title: 'Error en la operación', variant: 'destructive' });
    } finally { setActionLoadingId(null); }
  }

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    const common = 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border-none';
    if (s === 'active') return <Badge className={`${common} bg-green-500/10 text-green-600 shadow-sm`}>Activa</Badge>;
    if (s === 'paused') return <Badge className={`${common} bg-amber-500/10 text-amber-600`}>Pausada</Badge>;
    return <Badge className={`${common} bg-gray-100 text-gray-400`}>Cancelada</Badge>;
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <p className="mt-4 font-poppins font-black text-brand-dark tracking-widest text-[10px] uppercase">Encriptando Conexión...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#FDFDFD] pb-24 font-sans">
      
      {/* --- HERO SECTION --- */}
      <section className="bg-brand-dark pt-32 pb-56 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-brand-primary/10 blur-[150px] rounded-full" />
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-10 text-center md:text-left">
            <div className="space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <ShieldCheck className="text-brand-gold w-5 h-5" />
                    <span className="text-brand-sand text-[10px] font-black uppercase tracking-[0.4em]">Entorno de Usuario Verificado</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-poppins font-black text-white tracking-tighter leading-none">
                    Hola, {currentUser.name?.split(' ')[0] || 'Miembro'}
                </h1>
                <p className="text-gray-400 font-light text-lg italic max-w-xl">"Tu transparencia y compromiso construyen el legado de nuestra Fundación."</p>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleLogout} className="h-14 px-8 rounded-2xl text-red-400 hover:bg-red-500/10 font-bold border border-red-500/20 backdrop-blur-sm">
                    FINALIZAR SESIÓN
                </Button>
            </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-36 relative z-20">
        <DashboardHeader user={currentUser} onUpdateSuccess={(data) => { setCurrentUser(data); setAuthUser(data); }} />

        {/* --- MÉTRICAS COMUNITARIAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white p-10 relative overflow-hidden group border border-gray-100">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <Globe size={180} className="rotate-12" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-inner">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block">Impacto Comunitario</span>
                            <span className="text-brand-dark font-bold text-sm">Inversión Social Global</span>
                        </div>
                    </div>
                    <h3 className="text-6xl font-black font-poppins text-brand-dark tracking-tighter leading-none">
                        ${(metrics.total_donado || 0).toLocaleString('es-AR')}
                    </h3>
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                        <HelpCircle size={14} className="text-brand-gold" />
                        <p className="text-[10px] text-gray-400 font-medium italic">Suma auditada de todas las donaciones únicas aprobadas.</p>
                    </div>
                </div>
            </Card>

            <Card className="border-none shadow-2xl rounded-[3rem] bg-brand-primary p-10 text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-50" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white border border-white/20 shadow-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <span className="text-brand-sand text-[10px] font-black uppercase tracking-[0.2em] block">Sostenibilidad Real</span>
                            <span className="text-white font-bold text-sm">Impactos Directos Activos</span>
                        </div>
                    </div>
                    <h3 className="text-6xl font-black font-poppins text-white tracking-tighter leading-none">
                        {metrics.total_suscripciones_activas || 0}
                    </h3>
                    <div className="flex items-center gap-2 pt-4 border-t border-white/10 text-blue-100">
                        <Rocket size={14} className="text-brand-gold animate-pulse" />
                        <p className="text-[10px] font-medium uppercase tracking-wider italic">Padrinos sosteniendo la misión en este ciclo.</p>
                    </div>
                </div>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-16">
          {/* BITÁCORA DE DONACIONES */}
          <div className="lg:col-span-1 space-y-8">
            <div className="flex items-center gap-3 px-2 mb-6">
                <CreditCard className="text-brand-primary" />
                <h2 className="text-xl font-black font-poppins text-brand-dark uppercase tracking-tight">Donaciones</h2>
            </div>
            {userMemberships.length > 0 ? (
                userMemberships.map((m) => (
                <motion.div key={m.id} whileHover={{ y: -5 }} className="p-8 rounded-[2.5rem] bg-white border border-gray-100 shadow-xl space-y-6 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m.plan}</p>
                            <p className="text-3xl font-black font-poppins text-brand-primary tracking-tighter leading-none">${Number(m.amount).toLocaleString('es-AR')}</p>
                        </div>
                        {statusBadge(m.status)}
                    </div>
                    <div className="flex gap-2">
                      {m.status === 'active' && (
                          <Button size="sm" variant="outline" className="flex-1 rounded-xl font-bold border-amber-200 text-amber-700 h-11" onClick={() => performAction('pause', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>
                          {actionLoadingId === m.preapproval_id ? <Loader2 className="animate-spin h-4 w-4" /> : "Pausar"}
                          </Button>
                      )}
                      {m.status === 'paused' && (
                          <Button size="sm" variant="outline" className="flex-1 rounded-xl font-bold bg-green-50 text-green-700 h-11 border-green-200" onClick={() => performAction('resume', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>
                          {actionLoadingId === m.preapproval_id ? <Loader2 className="animate-spin h-4 w-4" /> : "Reanudar"}
                          </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400 font-bold h-11 hover:bg-red-50 rounded-xl" onClick={() => performAction('cancel', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>Cancelar</Button>
                    </div>
                </motion.div>
                ))
            ) : (
                <div className="text-center py-16 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                <Heart className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <Button className="bg-brand-primary text-white font-black rounded-xl h-12 px-8" asChild><Link to="/colaborar">SER PADRINO</Link></Button>
                </div>
            )}
          </div>

          {/* MIS ACTIVIDADES */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between px-2 mb-10">
                <div className="flex items-center gap-4">
                    <History className="text-brand-gold w-8 h-8" />
                    <h2 className="text-2xl font-black font-poppins text-brand-dark uppercase tracking-tight">Mis Actividades</h2>
                </div>
                <Badge className="bg-brand-sand text-brand-primary border-none px-5 py-2 rounded-full font-black text-[10px] tracking-widest shadow-sm">
                    {userRegistrations.length} REGISTROS
                </Badge>
            </div>

            <div className="relative space-y-12 before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-1 before:bg-gradient-to-b before:from-brand-primary before:via-brand-gold before:to-transparent">
              {userRegistrations.length > 0 ? (
                userRegistrations.map((reg, idx) => (
                  reg.activity ? (
                    <motion.div key={reg.id} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="relative pl-16 group">
                      <div className="absolute left-0 w-12 h-12 bg-white rounded-2xl shadow-2xl flex items-center justify-center z-10 group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-500 ring-8 ring-[#FDFDFD]">
                          <Rocket size={20} className="text-brand-primary group-hover:text-white" />
                      </div>
                      <div className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:translate-x-2">
                          <div className="flex flex-col md:flex-row gap-8 items-center">
                              <div className="flex-1 space-y-6">
                                  <div className="flex justify-between items-center">
                                      <Badge className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-none shadow-sm ${reg.activity.modality === 'presencial' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'}`}>
                                          {reg.activity.modality}
                                      </Badge>
                                      <span className="text-[10px] font-bold text-gray-300 uppercase italic">ID: #{reg.id.slice(0,8)}</span>
                                  </div>
                                  <Link to={`/activities/${reg.activity.id}`}>
                                      <h3 className="text-3xl font-black text-brand-dark leading-tight group-hover:text-brand-primary transition-colors pr-6">{reg.activity.title}</h3>
                                  </Link>
                                  <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-50">
                                      <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-tighter">
                                          <Calendar size={16} className="text-brand-gold" /> {formatDate(reg.activity.date)}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-tighter">
                                          <Clock size={16} className="text-brand-gold" /> {reg.activity.duration}
                                      </div>
                                  </div>
                              </div>
                              <Button variant="ghost" className="rounded-[2rem] h-20 w-20 p-0 bg-brand-sand/30 hover:bg-brand-primary hover:text-white transition-all shadow-xl border-none" onClick={() => window.open(generateGoogleCalendarLink(reg.activity), '_blank')}>
                                  <CalendarPlus size={32} />
                              </Button>
                          </div>
                      </div>
                    </motion.div>
                  ) : null
                ))
              ) : (
                <div className="text-center py-24 bg-white rounded-[4rem] shadow-inner border border-gray-100 flex flex-col items-center gap-8">
                    <History size={64} className="text-gray-100 animate-pulse" />
                    <div className="space-y-3">
                        <p className="text-brand-dark font-black text-2xl tracking-tighter uppercase">Tu bitácora está vacía</p>
                        <p className="text-gray-400 font-medium italic text-sm">Tu historia de impacto comienza con tu primer registro.</p>
                    </div>
                    <Button className="h-14 px-10 bg-brand-dark hover:bg-brand-primary text-white font-black rounded-2xl shadow-xl transition-all" asChild>
                        <a href="https://www.evolucionantoniana.com/activities">EXPLORAR CRONOGRAMA OFICIAL</a>
                    </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- NUEVA BITÁCORA DE TRANSACCIONES CONSOLIDADA --- */}
        <div className="mt-20">
          <Card className="border-none shadow-[0_30px_100px_rgba(0,0,0,0.06)] rounded-[3rem] bg-white overflow-hidden border border-gray-50">
            <CardHeader className="p-8 md:p-12 bg-brand-dark text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-20 -mt-20" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-brand-gold">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Protocolo de Transparencia</span>
                  </div>
                  <CardTitle className="text-3xl font-black font-poppins tracking-tighter uppercase">Historial de Impacto</CardTitle>
                  <p className="text-gray-400 text-sm font-light italic">Registro auditado de tus aportes únicos y membresías.</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <History className="text-brand-gold w-6 h-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                      <th className="px-10 py-6">Operación</th>
                      <th className="px-10 py-6">Identificador</th>
                      <th className="px-10 py-6">Monto</th>
                      <th className="px-10 py-6 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...userDonations.map(d => ({...d, type: 'donation'})), ...userMemberships.map(m => ({...m, type: 'membership'}))]
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .map((item) => (
                        <tr key={item.id} className="group hover:bg-brand-sand/5 transition-all duration-300">
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${item.type === 'donation' ? 'bg-blue-50 text-blue-600' : 'bg-brand-gold/10 text-brand-gold'}`}>
                                {item.type === 'donation' ? <Heart size={16}/> : <Gem size={16}/>}
                              </div>
                              <div>
                                <p className="text-sm font-black text-brand-dark uppercase tracking-tight">{item.type === 'donation' ? 'Donación Única' : 'Aporte Mensual'}</p>
                                <p className="text-[10px] text-gray-400 font-medium tracking-wide">{new Date(item.created_at).toLocaleDateString('es-AR')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <div className="flex flex-col gap-1">
                                <code className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 w-fit">{item.payment_id || item.preapproval_id || 'PROCESANDO'}</code>
                                <span className="text-[9px] text-gray-300 uppercase font-bold tracking-tighter">Mercado Pago Ref.</span>
                            </div>
                          </td>
                          <td className="px-10 py-8">
                            <div className="flex items-center gap-1">
                                <span className="text-xl font-black font-poppins text-brand-dark">${Number(item.amount).toLocaleString('es-AR')}</span>
                                <ArrowDownRight size={14} className="text-green-500 opacity-0 group-hover:opacity-100" />
                            </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                            {item.status === 'approved' || item.status === 'active' ? (
                                <Badge className="bg-green-50 text-green-600 border border-green-100 text-[10px] font-black uppercase px-4 py-1 rounded-full">Validado</Badge>
                            ) : (
                                <Badge className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase px-4 py-1 rounded-full">{item.status}</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    }
                    {userDonations.length === 0 && userMemberships.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-10 py-24 text-center">
                          <p className="text-gray-400 italic text-sm">No se registran movimientos validados.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-brand-primary"><ExternalLink size={16} /></div>
                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
                    Verificación externa: Los cobros son procesados por Mercado Pago. Puedes verificar cada ID en tu cuenta personal de la pasarela de pagos.
                  </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- FOOTER DEL DASHBOARD --- */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="mt-32 pt-16 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div className="space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-3 text-brand-primary font-black uppercase text-[10px] tracking-widest">
                    <ShieldCheck size={20} /> Seguridad
                </div>
                <p className="text-xs text-gray-400 leading-relaxed italic">
                    Cumplimos con los estándares de seguridad de datos PCI DSS y cifrado SSL de 256 bits para proteger toda su información personal y financiera.
                </p>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-3 text-brand-gold font-black uppercase text-[10px] tracking-widest">
                    <History size={20} /> Actualización
                </div>
                <p className="text-xs text-gray-400 leading-relaxed italic">
                    Los datos de impacto global se sincronizan cada 15 minutos con el servidor central de la Fundación para garantizar precisión absoluta.
                </p>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-3 text-brand-action font-black uppercase text-[10px] tracking-widest">
                    <Heart size={20} /> Soporte
                </div>
                <p className="text-xs text-gray-400 leading-relaxed italic">
                    ¿Dudas con tu membresía o registro? Contactanos vía WhatsApp al soporte exclusivo para padrinos y socios activos.
                </p>
            </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;