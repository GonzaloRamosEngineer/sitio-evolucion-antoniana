import React, { useEffect, useState, useMemo } from 'react';
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
  Calendar, Award, LogOut, Loader2, AlertTriangle, 
  CalendarPlus, Heart, CreditCard, PauseCircle, 
  XCircle, Rocket, CheckCircle2, History, Clock,
  HelpCircle, DollarSign, Users, ShieldCheck, Globe,
  ArrowUpRight, Zap, Target, Star, Bookmark, Share2,
  Lock, ArrowRight, Fingerprint, Activity as ActivityIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import SummaryMetrics from '@/components/Dashboard/SummaryMetrics';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import { generateGoogleCalendarLink } from '@/lib/calendarUtils';

// --- ANIMACIONES DE ALTO NIVEL ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

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

  // Estados locales de gestión de datos
  const [currentUser, setCurrentUser] = useState(user);
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [metrics, setMetrics] = useState({ total_donado: 0, total_suscripciones_activas: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Sincronización de usuario
  useEffect(() => { setCurrentUser(user); }, [user]);

  // CARGA MASIVA DE DATOS (Misión Crítica)
  const fetchDashboardData = async (userId) => {
    if (!userId) { setPageLoading(false); return; }
    try {
      const [registrationsData, membershipsResult, metricsDataResult] = await Promise.all([
        getUserRegistrations(userId),
        getUserMemberships(userId, { onlyActive: false }),
        supabase.from('fundacion_metrics').select('*').single()
      ]);

      setUserRegistrations(Array.isArray(registrationsData) ? registrationsData : []);
      setUserMemberships(Array.isArray(membershipsResult) ? membershipsResult : []);
      if (metricsDataResult.data) setMetrics(metricsDataResult.data);
    } catch (error) {
      console.error('Data Sync Error:', error);
      toast({ title: 'Error de Sincronización', description: 'La conexión con el Centro de Datos falló.', variant: 'destructive' });
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

  // ACCIONES DE MEMBRESÍA CON VALIDACIÓN
  async function performAction(kind, preapprovalId) {
    if (!preapprovalId) return;
    try {
      setActionLoadingId(preapprovalId);
      if (kind === 'pause') await pauseMembership(preapprovalId);
      if (kind === 'resume') await resumeMembership(preapprovalId);
      if (kind === 'cancel') await cancelMembership(preapprovalId);
      
      toast({ 
        title: 'Protocolo Actualizado', 
        description: `La suscripción ha sido gestionada con éxito.`,
        className: 'bg-brand-dark text-white rounded-3xl border-brand-primary/50' 
      });
      if (user?.id) await fetchDashboardData(user.id);
    } catch (e) {
      toast({ title: 'Error en Operación', description: e?.message, variant: 'destructive' });
    } finally { setActionLoadingId(null); }
  }

  // COMPONENTES INTERNOS PARA MANTENER EL ORDEN (Clean Code)
  const StatusIndicator = ({ status }) => {
    const s = (status || '').toLowerCase();
    const config = {
      active: { label: 'Activa', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
      paused: { label: 'Pausada', color: 'bg-amber-500/10 text-amber-500', icon: PauseCircle },
      cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-500', icon: XCircle },
    };
    const active = config[s] || { label: s, color: 'bg-blue-500/10 text-blue-500', icon: Info };
    const Icon = active.icon;
    return (
      <Badge className={`${active.color} border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2`}>
        <Icon size={12} className="animate-pulse" /> {active.label}
      </Badge>
    );
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white overflow-hidden">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
          <Loader2 className="h-16 w-16 text-brand-primary" />
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 font-poppins font-black text-brand-dark tracking-[0.5em] text-[10px] uppercase">
          Iniciando Sistemas de Control...
        </motion.p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-brand-sand">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[4rem] shadow-2xl border border-gray-100 max-w-lg">
          <AlertTriangle className="w-20 h-20 text-brand-action mx-auto mb-8 animate-bounce" />
          <h2 className="text-5xl font-poppins font-black text-brand-dark mb-6 tracking-tighter">ACCESO DENEGADO</h2>
          <p className="text-gray-500 mb-10 italic leading-relaxed">
            Esta terminal requiere credenciales autorizadas. Por favor, inicie sesión para acceder al panel de impacto.
          </p>
          <Button className="h-16 w-full bg-brand-dark hover:bg-brand-primary text-white font-black rounded-2xl shadow-xl transition-all" asChild>
            <Link to="/login" className="text-lg">VALIDAR IDENTIDAD</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-[#FDFDFD] pb-32">
      
      {/* --- EL "SUPER HERO" DEL DASHBOARD --- */}
      <section className="bg-brand-dark pt-32 pb-64 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none"></div>
        
        {/* Luces NASA de fondo */}
        <motion.div animate={{ x: [0, 50, 0], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-brand-primary rounded-full blur-[160px]" />
        <motion.div animate={{ x: [0, -50, 0], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 20, repeat: Infinity }} className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-brand-gold rounded-full blur-[140px]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-12 bg-brand-gold rounded-full" />
                <span className="text-brand-sand text-[10px] font-black uppercase tracking-[0.5em]">Global Impact Terminal</span>
              </div>
              <h1 className="text-6xl md:text-[6.5rem] font-poppins font-black text-white leading-[0.85] tracking-tighter">
                Operaciones <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-sand to-brand-gold">Antoniana</span>
              </h1>
              <div className="flex items-center gap-4 text-gray-400 font-medium">
                <div className="flex -space-x-3">
                    {[1,2,3].map(i => <div key={i} className="h-10 w-10 rounded-full border-4 border-brand-dark bg-gray-800" />)}
                </div>
                <p className="text-sm">Unido a una red de +300 almas impactando Salta.</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4 w-full md:w-auto">
                <Button variant="ghost" onClick={handleLogout} className="flex-1 md:flex-none h-16 px-10 rounded-2xl text-red-400 hover:bg-red-500/10 font-black border border-red-500/20 backdrop-blur-md tracking-widest text-xs uppercase">
                    Cerrar Sistema
                </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- CUERPO DEL DASHBOARD (Layout Bento) --- */}
      <div className="max-w-7xl mx-auto px-6 -mt-40 relative z-20">
        
        {/* HEADER DE PERFIL MASIVO */}
        <motion.div variants={itemVariants}>
            <DashboardHeader user={currentUser} onUpdateSuccess={(data) => { setCurrentUser(data); setAuthUser(data); }} />
        </motion.div>

        {/* --- MÉTRICAS DE ALTA PRECISIÓN --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-16">
          
          <motion.div variants={itemVariants} className="lg:col-span-1">
             <Card className="h-full border-none shadow-[0_30px_90px_rgba(0,0,0,0.1)] rounded-[3.5rem] bg-white p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-brand-primary/5 group-hover:rotate-12 transition-transform duration-1000">
                    <Globe size={240} />
                </div>
                <div className="relative z-10 space-y-10">
                    <div className="flex items-center justify-between">
                        <div className="p-4 bg-brand-primary/5 rounded-[1.5rem] text-brand-primary">
                            <DollarSign size={32} />
                        </div>
                        <Badge className="bg-brand-sand/30 text-brand-primary border-none font-black text-[9px] px-3">AUDITADO</Badge>
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 block mb-2">Inversión Social Global</span>
                        <h3 className="text-6xl font-black font-poppins text-brand-dark tracking-tighter leading-none">
                            ${(metrics.total_donado || 0).toLocaleString('es-AR')}
                        </h3>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100/50">
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldCheck size={16} className="text-brand-gold" />
                            <span className="text-[10px] font-black text-brand-dark uppercase">Transparencia Total</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed italic">
                            Suma total de donaciones únicas aprobadas y destinadas a infraestructura y programas sociales de la Fundación.
                        </p>
                    </div>
                </div>
             </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-1">
             <Card className="h-full border-none shadow-[0_30px_90px_rgba(30,58,138,0.2)] rounded-[3.5rem] bg-brand-primary p-10 text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative z-10 space-y-10 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="p-4 bg-white/10 backdrop-blur-xl rounded-[1.5rem] border border-white/20 shadow-2xl">
                            <Users size={32} />
                        </div>
                        <div className="flex gap-1">
                            {[1,2,3].map(i => <Star key={i} size={10} className="text-brand-gold fill-brand-gold" />)}
                        </div>
                    </div>
                    <div>
                        <span className="text-brand-sand text-[10px] font-black uppercase tracking-[0.4em] block mb-2">Sostenibilidad Activa</span>
                        <h3 className="text-6xl font-black font-poppins text-white tracking-tighter leading-none">
                            {metrics.total_suscripciones_activas || 0}
                        </h3>
                        <p className="text-blue-100/60 text-[10px] mt-4 font-medium italic">Impactos directos garantizados este mes.</p>
                    </div>
                    <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase">Suscripciones</span>
                        <Zap size={16} className="text-brand-gold animate-pulse" />
                    </div>
                </div>
             </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-1 grid grid-rows-2 gap-8">
             <div className="bg-brand-gold rounded-[2.5rem] p-8 flex flex-col justify-between group overflow-hidden relative shadow-xl">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-150 transition-transform">
                    <Award size={120} />
                </div>
                <span className="text-brand-dark font-black text-[10px] uppercase tracking-widest">Nivel de Impacto</span>
                <div className="flex items-end justify-between">
                    <h4 className="text-3xl font-black font-poppins text-brand-dark">Platino</h4>
                    <ArrowUpRight className="text-brand-dark group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
             </div>
             <div className="bg-brand-sand/50 rounded-[2.5rem] p-8 border border-brand-sand flex flex-col justify-between group shadow-lg">
                <span className="text-brand-primary font-black text-[10px] uppercase tracking-widest">Próxima Meta</span>
                <div className="space-y-3">
                    <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: '75%' }} transition={{ duration: 1.5 }} className="h-full bg-brand-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-brand-dark/60 italic text-right">Faltan 2 para el próximo hito comunitario</p>
                </div>
             </div>
          </motion.div>
        </div>

        {/* --- SECCIÓN PRINCIPAL: BITÁCORA Y DONACIONES --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-20">
          
          {/* BITÁCORA DE DONACIONES (COL 4) */}
          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-10">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black text-brand-dark font-poppins flex items-center gap-4 tracking-tight uppercase">
                    <CreditCard className="text-brand-primary w-6 h-6" /> Donaciones
                </h2>
                <HelpCircle size={16} className="text-gray-300 cursor-help" />
            </div>

            <div className="space-y-6">
              {userMemberships.length > 0 ? (
                userMemberships.map((m) => (
                  <motion.div 
                    key={m.id} 
                    whileHover={{ scale: 1.02 }} 
                    className="p-8 rounded-[3rem] bg-white border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.04)] relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                    <div className="flex justify-between items-start mb-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Suscripción Activa</p>
                            <h4 className="font-black text-brand-dark text-xl leading-tight group-hover:text-brand-primary transition-colors">{m.plan}</h4>
                        </div>
                        <StatusIndicator status={m.status} />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black font-poppins text-brand-dark tracking-tighter">${Number(m.amount).toLocaleString('es-AR')}</span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">/ Mensual</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            <p className="flex items-center gap-2"><History size={12}/> {formatDate(m.created_at)}</p>
                            <p className="flex items-center gap-2"><CreditCard size={12}/> MercadoPago</p>
                        </div>

                        <div className="flex gap-2">
                            {m.status === 'active' && (
                                <Button size="sm" variant="outline" className="flex-1 rounded-2xl h-12 font-black border-amber-100 text-amber-600 hover:bg-amber-50" onClick={() => performAction('pause', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>
                                    {actionLoadingId === m.preapproval_id ? <Loader2 size={16} className="animate-spin" /> : <><PauseCircle size={16} className="mr-2"/> PAUSAR</>}
                                </Button>
                            )}
                            {m.status === 'paused' && (
                                <Button size="sm" variant="outline" className="flex-1 rounded-2xl h-12 font-black bg-green-50 text-green-600 border-green-100" onClick={() => performAction('resume', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>
                                    {actionLoadingId === m.preapproval_id ? <Loader2 size={16} className="animate-spin" /> : <><PlayCircle size={16} className="mr-2"/> REANUDAR</>}
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-12 text-red-400 font-black hover:bg-red-50 rounded-2xl px-6" onClick={() => performAction('cancel', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>
                                {actionLoadingId === m.preapproval_id ? <Loader2 size={16} className="animate-spin" /> : "CANCELAR"}
                            </Button>
                        </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-10 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 text-center space-y-6">
                    <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Heart className="text-gray-200 w-10 h-10" />
                    </div>
                    <div>
                        <p className="text-brand-dark font-black text-lg">Iniciá tu Legado</p>
                        <p className="text-gray-400 text-sm italic">Tu suscripción mensual es la base de nuestra sostenibilidad.</p>
                    </div>
                    <Button className="w-full bg-brand-primary h-14 rounded-2xl font-black text-white shadow-xl shadow-brand-primary/20" asChild>
                        <Link to="/colaborar">QUIERO SER PADRINO</Link>
                    </Button>
                </div>
              )}
            </div>

            {/* Banner de Seguridad Informativa */}
            <div className="p-6 bg-brand-primary/5 rounded-[2rem] border border-brand-primary/10 flex items-start gap-4">
                <Lock size={18} className="text-brand-primary shrink-0 mt-1" />
                <p className="text-[10px] text-brand-primary font-bold leading-relaxed italic uppercase tracking-tighter">
                    Toda la gestión financiera se realiza bajo protocolos encriptados a través de Mercado Libre Solidario.
                </p>
            </div>
          </motion.div>

          {/* MIS ACTIVIDADES: TIMELINE MASIVO (COL 8) */}
          <motion.div variants={itemVariants} className="lg:col-span-8 space-y-10">
            <div className="flex items-center justify-between px-6">
                <h2 className="text-2xl font-black text-brand-dark font-poppins flex items-center gap-4 tracking-tight uppercase">
                    <History className="text-brand-gold w-8 h-8" /> Mis Actividades
                </h2>
                <div className="flex gap-4">
                  <Badge className="bg-white shadow-sm text-brand-primary border-gray-100 px-6 py-2 rounded-full font-black text-[10px] tracking-[0.2em]">
                    {userRegistrations.length} EVENTOS REGISTRADOS
                  </Badge>
                </div>
            </div>

            {/* LINEA DE TIEMPO (TIMELINE) */}
            <div className="relative space-y-12 before:absolute before:inset-0 before:ml-8 before:-translate-x-px before:h-full before:w-1 before:bg-gradient-to-b before:from-brand-primary before:via-brand-gold before:to-transparent">
              {userRegistrations.length > 0 ? (
                userRegistrations.map((reg, idx) => (
                  reg.activity ? (
                    <motion.div 
                        key={reg.id} 
                        initial={{ opacity: 0, x: 50 }} 
                        whileInView={{ opacity: 1, x: 0 }} 
                        viewport={{ once: true }} 
                        transition={{ delay: idx * 0.1 }}
                        className="relative pl-20 group"
                    >
                      {/* Nodo de la línea de tiempo */}
                      <div className="absolute left-0 w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center z-10 group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-700 ring-[12px] ring-[#FDFDFD]">
                          <ActivityIcon size={24} className="text-brand-primary group-hover:text-white" />
                      </div>

                      <div className="rounded-[4rem] bg-white border border-gray-100 shadow-[0_20px_80px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.1)] transition-all duration-700 overflow-hidden">
                          <div className="flex flex-col md:flex-row min-h-[220px]">
                              {/* Cuerpo de la Tarjeta */}
                              <div className="p-10 flex-1 space-y-8 flex flex-col justify-center">
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <Badge className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-none shadow-sm ${reg.activity.modality === 'presencial' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'}`}>
                                            {reg.activity.modality}
                                        </Badge>
                                        <div className="h-1 w-1 rounded-full bg-gray-300" />
                                        <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Actividad Confirmada</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-gray-300 uppercase italic">Ref: {reg.id.slice(0,8)}</span>
                                  </div>
                                  
                                  <Link to={`/activities/${reg.activity.id}`}>
                                      <h3 className="text-4xl font-black text-brand-dark leading-[1.1] group-hover:text-brand-primary transition-colors tracking-tighter">
                                        {reg.activity.title}
                                      </h3>
                                  </Link>
                                  
                                  <div className="flex flex-wrap items-center gap-8 pt-6 border-t border-gray-50">
                                      <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-tighter">
                                          <div className="p-2 bg-brand-sand/30 rounded-lg"><Calendar size={18} className="text-brand-gold" /></div>
                                          <div>
                                              <p className="text-[9px] text-gray-400">FECHA PROGRAMADA</p>
                                              <p>{formatDate(reg.activity.date)}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-tighter">
                                          <div className="p-2 bg-brand-sand/30 rounded-lg"><Clock size={18} className="text-brand-gold" /></div>
                                          <div>
                                              <p className="text-[9px] text-gray-400">DURACIÓN ESTIMADA</p>
                                              <p>{reg.activity.duration}</p>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Barra Lateral de Acción */}
                              <div className="bg-brand-sand/10 p-10 flex flex-col justify-center items-center border-l border-white md:w-44 gap-6">
                                  <motion.button 
                                      whileHover={{ scale: 1.1, rotate: 5 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="rounded-[2.5rem] h-24 w-24 bg-white shadow-2xl flex flex-col items-center justify-center gap-2 text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-500 group/btn"
                                      onClick={() => window.open(generateGoogleCalendarLink(reg.activity), '_blank')}
                                  >
                                      <CalendarPlus size={32} />
                                      <span className="text-[8px] font-black uppercase">Agendar</span>
                                  </motion.button>
                                  <div className="flex gap-3">
                                      <button className="text-gray-300 hover:text-brand-primary transition-colors"><Share2 size={16}/></button>
                                      <button className="text-gray-300 hover:text-brand-action transition-colors"><Bookmark size={16}/></button>
                                  </div>
                              </div>
                          </div>
                      </div>
                    </motion.div>
                  ) : null
                ))
              ) : (
                <div className="text-center py-32 bg-white rounded-[5rem] shadow-inner border border-gray-100 flex flex-col items-center gap-10">
                    <div className="relative">
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute -inset-8 bg-brand-sand/50 rounded-full blur-2xl" />
                        <History size={80} className="text-gray-100 relative z-10" />
                    </div>
                    <div className="space-y-4 max-w-sm">
                        <p className="text-brand-dark font-black text-3xl tracking-tighter uppercase leading-none">Misión en Preparación</p>
                        <p className="text-gray-400 font-medium italic text-sm leading-relaxed">
                            Aún no has participado en actividades del cronograma oficial. ¡Tu impacto está por comenzar!
                        </p>
                    </div>
                    <Button className="h-16 px-12 bg-brand-dark hover:bg-brand-primary text-white font-black rounded-[2rem] shadow-2xl transition-all group overflow-hidden relative" asChild>
                        <a href="https://www.evolucionantoniana.com/activities">
                            <span className="relative z-10 flex items-center gap-3 uppercase tracking-widest text-xs">
                                EXPLORAR CRONOGRAMA OFICIAL
                                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                            </span>
                        </a>
                    </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* --- FOOTER DEL DASHBOARD: SEGURIDAD Y SOPORTE --- */}
        <motion.div variants={itemVariants} className="mt-32 pt-16 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
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