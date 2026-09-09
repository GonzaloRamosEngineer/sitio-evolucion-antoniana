import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  pauseMembership,
  resumeMembership,
  cancelMembership
} from '@/api/membershipApi';
import {
  useUserRegistrations,
  useUserMemberships,
  useUserDonations,
  useFoundationMetrics,
} from '@/hooks/useContentQueries';
import { queryKeys } from '@/lib/queryClient';
import { primerNombre } from '@/lib/persona';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, CalendarPlus, Heart, CreditCard, Rocket, History, Clock, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import AccountHistory from '@/components/Dashboard/AccountHistory';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import { generateGoogleCalendarLink } from '@/lib/calendarUtils';
import { ESTADOS_MEMBRESIA, describirEstado } from '@/lib/estadosPago';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const Dashboard = () => {
  const { user, logout, loading: authLoading, setUser: setAuthUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState(user);
  const [showClosedMemberships, setShowClosedMemberships] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => { setCurrentUser(user); }, [user]);

  // Las cuatro fuentes del dashboard, vía TanStack Query (ROADMAP 4.2). Antes
  // era un `Promise.all` dentro de `fetchDashboardData` con seis `useState`.
  // Las de usuario llevan `enabled`, así que no disparan nada hasta que auth
  // resuelve y no cachean bajo una clave con `undefined`.
  const userId = user?.id;
  const registrationsQuery = useUserRegistrations(userId);
  const membershipsQuery = useUserMemberships(userId);
  const donationsQuery = useUserDonations(userId);
  const { data: metricsRow } = useFoundationMetrics();

  const userRegistrations = registrationsQuery.data ?? [];
  const userMemberships = membershipsQuery.data ?? [];
  const userDonations = donationsQuery.data ?? [];
  const metrics = metricsRow ?? { total_donado: 0, total_suscripciones_activas: 0 };

  // Una query deshabilitada queda en `isPending`, así que sin el guard por
  // `userId` un visitante sin sesión se quedaría con el spinner para siempre.
  const pageLoading =
    Boolean(userId) && (registrationsQuery.isPending || membershipsQuery.isPending);

  useEffect(() => {
    if (registrationsQuery.isError || membershipsQuery.isError) {
      toast({ title: 'Sincronización parcial', description: 'Algunos datos no se pudieron cargar.', variant: 'destructive' });
    }
  }, [registrationsQuery.isError, membershipsQuery.isError, toast]);

  /** Refresca lo que puede cambiar tras operar sobre una membresía. */
  const refreshMembershipData = () => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.userMemberships(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userDonations(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.foundationMetrics });
  };

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
      const action =
        kind === 'pause' ? pauseMembership
        : kind === 'resume' ? resumeMembership
        : kind === 'cancel' ? cancelMembership
        : null;
      if (!action) return;

      const { error } = await action(preapprovalId);
      if (error) {
        // El mensaje distingue cold-start del microservicio de un fallo real (ROADMAP 4.3).
        toast({
          title: error.isColdStart ? 'El servicio está iniciándose' : 'Error en la operación',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      toast({ title: 'Estado actualizado', className: 'bg-brand-dark text-white rounded-2xl' });
      refreshMembershipData();
    } finally { setActionLoadingId(null); }
  }

  // Los estados salen de `@/lib/estadosPago`, que es el único lugar donde se
  // declaran. Acá solo vive cómo se pintan. Ver ese archivo para el porqué:
  // este badge decía "Cancelada" para todo lo que no fuera active/paused.
  const CLASE_TONO = {
    ok: 'bg-green-500/10 text-green-600 shadow-sm',
    curso: 'bg-brand-primary/10 text-brand-primary',
    atencion: 'bg-amber-500/15 text-amber-700',
    cerrado: 'bg-gray-100 text-gray-400',
    desconocido: 'bg-gray-100 text-gray-500',
  };

  const statusBadge = (status) => {
    const common = 'px-3 py-1 rounded-full text-xs font-semibold flex shrink-0 items-center gap-1.5 border-none';
    const { label, tono } = describirEstado(ESTADOS_MEMBRESIA, status);
    return <Badge className={`${common} ${CLASE_TONO[tono]}`}>{label}</Badge>;
  };

  // Cancelar solo tiene sentido mientras la suscripción sigue viva, y solo
  // funciona si hay preapproval_id: `performAction` corta en silencio cuando
  // falta, así que un botón sin él es un clic que no hace nada y no avisa.
  const puedeCancelar = (m) =>
    ['active', 'paused', 'pending'].includes((m.status || '').toLowerCase()) &&
    Boolean(m.preapproval_id);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <p className="mt-4 font-poppins font-black text-brand-dark tracking-widest text-[10px] uppercase">Cargando tu panel…</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-brand-sand pb-24 font-sans">
      <Helmet>
        <title>Mi panel - Fundación Evolución Antoniana</title>
        <meta name="description" content="Panel personal de la Fundación Evolución Antoniana." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* --- HERO SECTION --- */}
      <section className="bg-brand-dark pt-8 pb-12 px-4 sm:px-6 relative overflow-hidden">
        {/*
          ACÁ HABÍA UNA TEXTURA TRAÍDA DE UN DOMINIO AJENO:
          `bg-[url('https://grainy-gradients.vercel.app/noise.svg')]`, resto del
          scaffold original. Se sacó el 2026-09-05 y **no cambia nada en
          pantalla**, porque esa URL devuelve 404: la textura nunca se vio.
          Apareció en la consola del dueño del proyecto mientras probaba otra
          cosa.

          Lo que sí hacía era pedirle un archivo a `grainy-gradients.vercel.app`
          —un dominio que no controlamos— **en cada carga del panel, que es una
          pantalla con sesión iniciada**. Un asset de terceros no es gratis
          aunque sea decorativo: quien lo sirva ve la visita, y el día que
          devuelva algo distinto de un 404 lo estaríamos pintando adentro de
          nuestra página.

          Si alguna vez se quiere el grano de vuelta, va como data: URI en el
          CSS propio. No se agrega acá porque hoy no se ve nada y agregarlo
          sería un cambio visual que nadie pidió.
        */}
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-brand-primary/10 blur-[150px] rounded-full" />
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-5 text-left">
            {/*
              `w-full` ADEMÁS de `min-w-0`, y esto no es cinturón y tirantes: el
              contenedor de arriba es `flex ... items-center`, y `align-items:
              center` hace que el hijo se dimensione a su CONTENIDO en vez de
              estirarse. Sin `w-full` el div toma su ancho máximo y el
              `break-words` del h1 nunca se activa, porque desde su punto de
              vista el texto entra perfecto — es la caja la que se pasó de la
              pantalla. Comprobado en Chrome a 393 px con las dos variantes.
            */}
            <div className="space-y-4 min-w-0 w-full">
                <div className="flex items-center justify-start gap-3">
                    <ShieldCheck className="text-brand-gold w-5 h-5" />
                    <span className="text-brand-sand text-[10px] font-black uppercase tracking-[0.4em]">Mi panel</span>
                </div>
                {/*
                  `min-w-0` arriba y `break-words` acá: son las dos mitades del
                  mismo arreglo. En un contenedor flex, un hijo no baja de su
                  ancho de contenido mínimo sin `min-w-0`, así que `break-words`
                  solo no alcanza — la caja se ensancha y empuja la pantalla.
                  Y `primerNombre` es la otra mitad: ver `lib/persona.js`.
                */}
                <h1 className="text-3xl md:text-5xl font-poppins font-black text-white tracking-tighter leading-none break-words">
                    Hola, {primerNombre(currentUser)}
                </h1>
                <p className="text-white/80 text-base max-w-xl">Tu carnet, tus aportes y actividades, en un solo lugar.</p>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleLogout} className="h-14 px-8 rounded-2xl text-red-400 hover:bg-red-500/10 font-bold border border-red-500/20 backdrop-blur-sm">
                    Cerrar sesión
                </Button>
            </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 relative z-20">
        {/*
          `memberships` va por prop y no lo consulta la cabecera: esta
          página ya las tiene con `useUserMemberships` y había DOS
          consultas de lo mismo, una de ellas con un `.maybeSingle()` que
          rompe con más de una fila (§10.23).
        */}
        <DashboardHeader
          user={currentUser}
          memberships={userMemberships}
          onUpdateSuccess={(data) => { setCurrentUser(data); setAuthUser(data); }}
        />

        <nav aria-label="Secciones de mi panel" className="grid grid-cols-3 gap-2 mb-6">
          {[['#suscripciones', 'Suscripciones'], ['#actividades', 'Actividades'], ['#historial', 'Historial']].map(([href, label]) => <a key={href} href={href} className="flex min-h-[48px] items-center justify-center rounded-xl border border-gray-200 bg-white text-brand-primary text-sm font-semibold">{label}</a>)}
        </nav>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* BITÁCORA DE DONACIONES */}
          <div id="suscripciones" className="lg:col-span-1 space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 px-2 mb-6">
                <CreditCard className="text-brand-primary" />
                <h2 className="text-xl font-black font-poppins text-brand-dark uppercase tracking-tight">Mis suscripciones</h2>
            </div>
            {userMemberships.length > 0 ? (
                userMemberships.filter(m => showClosedMemberships || !['cancelled', 'expired'].includes(m.status)).map((m) => (
                <motion.div key={m.id} whileHover={{ y: -5 }} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 space-y-2 break-words">
                            <p className="text-sm font-semibold text-gray-600">{m.plan}</p>
                            <p className="text-2xl font-bold font-poppins text-brand-primary tracking-tighter leading-none">${Number(m.amount).toLocaleString('es-AR')}</p>
                        </div>
                        {statusBadge(m.status)}
                    </div>
                    <div className="flex gap-2">
                      {m.status === 'active' && m.preapproval_id && (
                          <Button size="sm" variant="outline" className="flex-1 rounded-xl font-bold border-amber-200 text-amber-700 h-11" onClick={() => performAction('pause', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>
                          {actionLoadingId === m.preapproval_id ? <Loader2 className="animate-spin h-4 w-4" /> : "Pausar"}
                          </Button>
                      )}
                      {m.status === 'paused' && m.preapproval_id && (
                          <Button size="sm" variant="outline" className="flex-1 rounded-xl font-bold bg-green-50 text-green-700 h-11 border-green-200" onClick={() => performAction('resume', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>
                          {actionLoadingId === m.preapproval_id ? <Loader2 className="animate-spin h-4 w-4" /> : "Reanudar"}
                          </Button>
                      )}
                      {puedeCancelar(m) && (
                        <Button size="sm" variant="ghost" className="text-red-400 font-bold h-11 hover:bg-red-50 rounded-xl" onClick={() => performAction('cancel', m.preapproval_id)} disabled={actionLoadingId === m.preapproval_id}>Cancelar</Button>
                      )}
                    </div>
                </motion.div>
                ))
            ) : (
                <div className="text-center py-16 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                <Heart className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <Button className="bg-brand-primary text-white font-black rounded-xl h-12 px-8" asChild><Link to="/collaborate">SER PADRINO</Link></Button>
                </div>
            )}
            {userMemberships.some(m => ['cancelled', 'expired'].includes(m.status)) && <button type="button" aria-expanded={showClosedMemberships} onClick={() => setShowClosedMemberships(!showClosedMemberships)} className="min-h-[44px] w-full text-sm font-semibold text-brand-primary underline underline-offset-4">{showClosedMemberships ? 'Ocultar suscripciones finalizadas' : 'Ver suscripciones finalizadas'}</button>}
            {userMemberships.length > 0 && !userMemberships.some(m => ['active', 'paused', 'pending'].includes(m.status)) && !showClosedMemberships && <p className="text-sm text-gray-600">No tenés suscripciones en curso.</p>}
          </div>

          {/* MIS ACTIVIDADES */}
          <div id="actividades" className="lg:col-span-2 scroll-mt-24">
            <div className="flex flex-wrap gap-2 items-center justify-between px-2 mb-5">
                <div className="flex items-center gap-4">
                    <History className="text-brand-gold w-8 h-8" />
                    <h2 className="text-xl font-bold font-poppins text-brand-dark tracking-tight">Mis Actividades</h2>
                </div>
                <Badge className="bg-brand-sand text-brand-primary border-none px-3 py-2 rounded-full font-black text-[10px] tracking-widest shadow-sm">
                    {userRegistrations.length} REGISTROS
                </Badge>
            </div>

            <div className="relative space-y-12 before:hidden md:before:block before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-1 before:bg-gradient-to-b before:from-brand-primary before:via-brand-gold before:to-transparent">
              {userRegistrations.length > 0 ? (
                userRegistrations.map((reg, idx) => (
                  reg.activity ? (
                    <motion.div key={reg.id} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="relative md:pl-14 group">
                      <div className="hidden md:flex absolute left-0 w-12 h-12 bg-white rounded-2xl shadow-2xl flex items-center justify-center z-10 group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-500 ring-8 ring-[#FDFDFD]">
                          <Rocket size={20} className="text-brand-primary group-hover:text-white" />
                      </div>
                      <div className="p-5 sm:p-8 rounded-2xl bg-white border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 group-hover:translate-x-2">
                          <div className="flex flex-col md:flex-row gap-8 items-center">
                              <div className="min-w-0 w-full flex-1 space-y-4">
                                  <div className="flex flex-wrap gap-2 justify-between items-center">
                                      <Badge className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-none shadow-sm ${reg.activity.modality === 'presencial' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'}`}>
                                          {reg.activity.modality}
                                      </Badge>
                                      <span className="text-[10px] font-bold text-gray-300 uppercase italic">ID: #{reg.id.slice(0,8)}</span>
                                  </div>
                                  <Link to={`/activities/${reg.activity.slug || reg.activity.id}`}>
                                      <h3 className="text-xl font-bold text-brand-dark leading-tight group-hover:text-brand-primary transition-colors pr-6">{reg.activity.title}</h3>
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
                              <Button variant="ghost" className="rounded-[2rem] h-20 w-20 p-0 bg-brand-sand/30 hover:bg-brand-primary hover:text-white transition-all shadow-xl border-none" aria-label={`Agregar ${reg.activity.title} a Google Calendar`} onClick={() => window.open(generateGoogleCalendarLink(reg.activity), '_blank')}>
                                  <CalendarPlus size={32} />
                              </Button>
                          </div>
                      </div>
                    </motion.div>
                  ) : null
                ))
              ) : (
                <div className="text-center p-6 sm:p-10 bg-white rounded-2xl shadow-inner border border-gray-100 flex flex-col items-center gap-4">
                    <History size={32} className="text-gray-100 animate-pulse" />
                    <div className="space-y-3">
                        <p className="text-brand-dark font-black text-2xl tracking-tighter uppercase">Todavía no te inscribiste</p>
                        <p className="text-gray-600 text-sm">Encontrá tu próxima actividad y sumate.</p>
                    </div>
                    <Button className="h-14 px-10 bg-brand-dark hover:bg-brand-primary text-white font-black rounded-2xl shadow-xl transition-all" asChild>
                        <Link to="/activities">Explorar actividades</Link>
                    </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <AccountHistory donations={userDonations} memberships={userMemberships} loading={donationsQuery.isPending} error={donationsQuery.isError || membershipsQuery.isError} onRetry={() => { donationsQuery.refetch(); membershipsQuery.refetch(); }} />
        <details className="mt-6 rounded-2xl border border-gray-200 p-5 bg-white"><summary className="cursor-pointer font-semibold text-brand-dark min-h-[44px]">Impacto de toda la comunidad</summary>
          <div className="grid sm:grid-cols-2 gap-5 mt-4 text-sm text-gray-600"><p><strong className="block text-2xl text-brand-dark">${(metrics.total_donado || 0).toLocaleString('es-AR')}</strong>Donaciones únicas aprobadas</p><p><strong className="block text-2xl text-brand-dark">{metrics.total_suscripciones_activas || 0}</strong>Suscripciones activas</p></div>
        </details>

        {/* --- FOOTER DEL DASHBOARD --- */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="space-y-4">
                <div className="flex items-center justify-start gap-3 text-brand-primary font-black uppercase text-[10px] tracking-widest">
                    <ShieldCheck size={20} /> Seguridad
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Tus pagos se procesan directamente en Mercado Pago: la Fundación nunca ve ni almacena datos de tu tarjeta. Toda la comunicación con el sitio viaja cifrada (HTTPS).
                </p>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-start gap-3 text-brand-gold font-black uppercase text-[10px] tracking-widest">
                    <History size={20} /> Actualización
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Tus datos y movimientos se actualizan cada vez que ingresás al panel. Si un pago recién acreditado no aparece, recargá la página en unos minutos.
                </p>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-start gap-3 text-brand-action font-black uppercase text-[10px] tracking-widest">
                    <Heart size={20} /> Soporte
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    ¿Dudas con tu membresía o registro? Contactanos vía WhatsApp al soporte exclusivo para padrinos y socios activos.
                </p>
            </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;