import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Calendar, Heart, Plus, MailWarning, UserCog, UserCheck, Gift,
  FileText as FileTextIcon, CheckCircle, Clock, ShieldCheck, Activity, LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import UserList from '@/components/Admin/UserList';
import MembershipList from '@/components/Admin/MembershipList';
import ActivityList from '@/components/Admin/ActivityList';
import PendingConfirmationsList from '@/components/Admin/PendingConfirmationsList';
import DonationList from '@/components/Admin/DonationList';
import LegalDocumentList from '@/components/Admin/LegalDocumentList';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import PartnersAdmin from '@/components/Admin/PartnersAdmin';
import BenefitsAdmin from '@/components/Admin/BenefitsAdmin';
import NewsAdmin from '@/components/Admin/NewsAdmin';
import { Helmet } from 'react-helmet';

// Para stats de partners/beneficios
import { getPartners, getBenefits } from '@/lib/storage';

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalActivities: 0,
    activeMemberships: 0,
    pendingConfirmations: 0,
    adminUsers: 0,
    memberUsers: 0,
    totalDonations: 0,
    totalLegalDocuments: 0,
  });

  const [ecoStats, setEcoStats] = useState({
    totalPartners: 0,
    approvedPartners: 0,
    pendingPartners: 0,
    totalBenefits: 0,
    activeBenefits: 0,
  });

  const [recentActivitiesData, setRecentActivitiesData] = useState([]);
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  const fetchAdminData = async () => {
    try {
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (usersError) throw usersError;

      const { count: adminUsers, error: adminUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if (adminUsersError) throw adminUsersError;

      const { count: memberUsers, error: memberUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');
      if (memberUsersError) throw memberUsersError;

      const { count: totalActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true });
      if (activitiesError) throw activitiesError;

      const { count: activeMemberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (membershipsError) throw membershipsError;

      const { count: pendingConfirmations, error: pendingConfirmationsError } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('is_confirmed', false);
      if (pendingConfirmationsError) throw pendingConfirmationsError;

      const { count: totalDonations, error: donationsError } = await supabase
        .from('donations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['completed', 'approved', 'succeeded']);
      if (donationsError) throw donationsError;

      const { count: totalLegalDocuments, error: legalDocsError } = await supabase
        .from('legal_documents')
        .select('*', { count: 'exact', head: true });
      if (legalDocsError) throw legalDocsError;

      const { data: recent, error: recentError } = await supabase
        .from('activities')
        .select('id, title, date, modality')
        .order('created_at', { ascending: false })
        .limit(3);
      if (recentError) throw recentError;

      setStats({
        totalUsers: totalUsers || 0,
        adminUsers: adminUsers || 0,
        memberUsers: memberUsers || 0,
        totalActivities: totalActivities || 0,
        activeMemberships: activeMemberships || 0,
        pendingConfirmations: pendingConfirmations || 0,
        totalDonations: totalDonations || 0,
        totalLegalDocuments: totalLegalDocuments || 0,
      });
      setRecentActivitiesData(recent || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del panel.',
        variant: 'destructive',
      });
    }
  };

  const fetchEcoStats = async () => {
    try {
      const partners = await getPartners();
      const benefits = await getBenefits();

      setEcoStats({
        totalPartners: partners.length,
        approvedPartners: partners.filter((p) => p.estado === 'aprobado').length,
        pendingPartners: partners.filter((p) => p.estado === 'pendiente').length,
        totalBenefits: benefits.length,
        activeBenefits: benefits.filter((b) => b.estado === 'activo').length,
      });
    } catch (err) {
      console.error('Error fetching ecosystem stats:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchEcoStats();
  }, []);

  useEffect(() => {
    const currentTab = queryParams.get('tab') || 'overview';
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [location.search]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    navigate(`/admin?tab=${newTab}`, { replace: true });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-sand">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  const TABS_CONFIG = [
    { value: 'overview', label: 'Resumen', icon: LayoutDashboard },
    { value: 'activities', label: 'Actividades', icon: Calendar },
    { value: 'pending', label: 'Pendientes', icon: MailWarning },
    { value: 'users', label: 'Usuarios', icon: Users },
    { value: 'memberships', label: 'Colaboraciones', icon: Heart },
    { value: 'donations', label: 'Donaciones', icon: Gift },
    { value: 'legal_documents', label: 'Legales', icon: FileTextIcon },
    { value: 'partners', label: 'Partners', icon: UserCheck },
    { value: 'benefits', label: 'Beneficios', icon: Gift },
    { value: 'news', label: 'Novedades', icon: FileTextIcon },
  ];

  return (
    <div className="min-h-screen bg-brand-sand font-sans">
      <Helmet>
        <title>Panel de Administración - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Gestión de actividades, usuarios, colaboraciones, donaciones, documentos legales, partners, beneficios y novedades."
        />
      </Helmet>

      {/* --- HERO DASHBOARD --- */}
      <section className="relative bg-brand-primary overflow-hidden pt-12 pb-20 px-4">
        {/* Fondo Tech Sutil */}
        <div className="absolute inset-0">
           <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
           <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
           </div>
        </div>

        <div className="relative max-w-screen-2xl mx-auto z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row justify-between items-center gap-6"
          >
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-4">
                    <ShieldCheck className="w-4 h-4 text-brand-gold" />
                    <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Área Restringida</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-poppins font-bold text-white mb-2">
                    Panel de Control
                </h1>
                <p className="text-gray-300">
                    Bienvenido de nuevo. Aquí tienes el resumen de la fundación hoy.
                </p>
            </div>
            
            {/* Quick Actions (Opcional) */}
            <div className="flex gap-3">
               <Link to="/">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
                     Ver Sitio Web
                  </Button>
               </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- MAIN CONTENT --- */}
      <section className="-mt-10 px-4 pb-12 relative z-20">
        <div className="max-w-screen-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
            
            {/* Barra de Tabs Modernizada (Scrollable Pills) */}
            <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-white/50 sticky top-24 z-30 overflow-x-auto no-scrollbar">
                <TabsList className="inline-flex h-auto p-0 bg-transparent gap-2 w-max min-w-full md:min-w-0 md:justify-center">
                {TABS_CONFIG.map((tab) => (
                    <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="
                        rounded-xl px-4 py-2.5 text-sm font-medium transition-all
                        data-[state=active]:bg-brand-primary data-[state=active]:text-white data-[state=active]:shadow-md
                        text-gray-600 hover:text-brand-primary hover:bg-brand-sand
                        flex items-center gap-2
                    "
                    >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    </TabsTrigger>
                ))}
                </TabsList>
            </div>

            {/* --- RESUMEN (DASHBOARD) --- */}
            <TabsContent value="overview" className="space-y-8 mt-6">
              
              {/* Stats Grid Principal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[
                  { title: 'Total Usuarios', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
                  { title: 'Actividades', value: stats.totalActivities, icon: Calendar, color: 'bg-purple-50 text-purple-600' },
                  { title: 'Colaboraciones', value: stats.activeMemberships, icon: Heart, color: 'bg-red-50 text-red-600' },
                  { title: 'Donaciones', value: stats.totalDonations, icon: Gift, color: 'bg-green-50 text-green-600' },
                  { title: 'Pendientes', value: stats.pendingConfirmations, icon: MailWarning, color: 'bg-amber-50 text-amber-600' },
                  { title: 'Legales', value: stats.totalLegalDocuments, icon: FileTextIcon, color: 'bg-gray-50 text-gray-600' },
                  { title: 'Administradores', value: stats.adminUsers, icon: UserCog, color: 'bg-indigo-50 text-indigo-600' },
                  { title: 'Miembros', value: stats.memberUsers, icon: UserCheck, color: 'bg-cyan-50 text-cyan-600' },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white rounded-2xl overflow-hidden group">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{item.title}</p>
                            <div className="text-3xl font-bold font-poppins text-brand-dark group-hover:text-brand-primary transition-colors">
                                {item.value}
                            </div>
                        </div>
                        <div className={`p-3 rounded-xl ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                            <item.icon className="h-6 w-6" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Stats Secundarios (Ecosistema) */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="md:col-span-2">
                        <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-brand-gold" /> Ecosistema
                        </h3>
                     </motion.div>
                     
                     {[
                        { title: 'Partners Totales', value: ecoStats.totalPartners, icon: Users, color: 'border-l-4 border-blue-500' },
                        { title: 'Partners Pendientes', value: ecoStats.pendingPartners, icon: Clock, color: 'border-l-4 border-amber-500' },
                        { title: 'Partners Aprobados', value: ecoStats.approvedPartners, icon: CheckCircle, color: 'border-l-4 border-green-500' },
                        { title: 'Beneficios Activos', value: ecoStats.activeBenefits, icon: Gift, color: 'border-l-4 border-purple-500' },
                     ].map((stat, i) => (
                        <div key={i} className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${stat.color} flex items-center justify-between`}>
                            <div>
                                <p className="text-gray-500 text-sm mb-1">{stat.title}</p>
                                <p className="text-2xl font-bold text-brand-dark">{stat.value}</p>
                            </div>
                            <stat.icon className="w-8 h-8 text-gray-200" />
                        </div>
                     ))}
                  </div>

                  {/* Actividades Recientes */}
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                    <Card className="h-full border-none shadow-lg bg-white rounded-2xl overflow-hidden">
                      <CardHeader className="bg-brand-dark text-white p-5">
                        <CardTitle className="text-lg font-poppins flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-brand-gold" />
                            Últimas Actividades
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-gray-100">
                          {recentActivitiesData.length > 0 ? (
                            recentActivitiesData.map((activity) => (
                              <div
                                key={activity.id}
                                className="p-4 hover:bg-brand-sand/50 transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <p className="font-semibold text-brand-dark text-sm group-hover:text-brand-primary transition-colors">{activity.title}</p>
                                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {formatDate(activity.date)}
                                  </p>
                                </div>
                                <Badge
                                  variant={activity.modality === 'presencial' ? 'default' : 'secondary'}
                                  className={`text-[10px] px-2 py-0.5 capitalize ${
                                    activity.modality === 'presencial'
                                      ? 'bg-brand-primary text-white'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                                  }`}
                                >
                                  {activity.modality}
                                </Badge>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No hay actividades recientes.
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                            <div className="p-4 bg-gray-50 text-center">
                                <Link to="/admin/activities/new">
                                    <Button variant="outline" size="sm" className="w-full border-dashed border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5">
                                        <Plus className="w-4 h-4 mr-2" /> Crear Nueva
                                    </Button>
                                </Link>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
              </div>
            </TabsContent>

            {/* --- CONTENIDO DE OTRAS TABS --- */}
            {/* Wrapper genérico para las demás secciones para darles animación */}
            <div className="min-h-[500px]">
                <TabsContent value="activities">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {isAdmin && (
                    <div className="flex justify-end mb-6">
                        <Link to="/admin/activities/new">
                            <Button className="bg-brand-action hover:bg-red-800 text-white font-bold shadow-md">
                                <Plus className="w-5 h-5 mr-2" />
                                Crear Nueva Actividad
                            </Button>
                        </Link>
                    </div>
                    )}
                    <ActivityList onAddRequest={() => navigate('/admin/activities/new')} />
                </motion.div>
                </TabsContent>

                <TabsContent value="pending">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <PendingConfirmationsList />
                    </motion.div>
                </TabsContent>

                <TabsContent value="users">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <UserList />
                    </motion.div>
                </TabsContent>

                <TabsContent value="memberships">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <MembershipList />
                    </motion.div>
                </TabsContent>

                <TabsContent value="donations">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <DonationList />
                    </motion.div>
                </TabsContent>

                <TabsContent value="legal_documents">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <LegalDocumentList />
                    </motion.div>
                </TabsContent>

                <TabsContent value="partners">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <PartnersAdmin />
                    </motion.div>
                </TabsContent>

                <TabsContent value="benefits">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <BenefitsAdmin />
                    </motion.div>
                </TabsContent>

                <TabsContent value="news">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <NewsAdmin />
                    </motion.div>
                </TabsContent>
            </div>

          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;