import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, Calendar, Heart, Plus, MailWarning, UserCog, UserCheck, Gift,
  FileText as FileTextIcon, CheckCircle, Clock
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

// Para stats de partners/beneficios sin depender de StatsOverview.jsx
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

  // Stats extra de Partners/Beneficios (equivalente a StatsOverview)
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
      // No rompemos el panel si storage no está disponible
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="min-h-screen flex items-center justify-center bg-blanco-fundacion dark:bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-antoniano dark:border-primary"></div>
      </div>
    );
  }

  const TABS_CONFIG = [
    { value: 'overview', label: 'Resumen' },
    { value: 'activities', label: 'Actividades' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'users', label: 'Usuarios' },
    { value: 'memberships', label: 'Colaboraciones' },
    { value: 'donations', label: 'Donaciones' },
    { value: 'legal_documents', label: 'Legales' },
    { value: 'partners', label: 'Partners' },
    { value: 'benefits', label: 'Beneficios' },
    { value: 'news', label: 'Novedades' },
  ];

  return (
    <div className="min-h-screen bg-blanco-fundacion dark:bg-background font-inter">
      <Helmet>
        <title>Panel de Administración - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Gestión de actividades, usuarios, colaboraciones, donaciones, documentos legales, partners, beneficios y novedades."
        />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-antoniano/95 to-blue-700/95 dark:from-primary-antoniano/80 dark:to-blue-800/80 text-blanco-fundacion dark:text-primary-foreground py-16 shadow-lg hero-pattern">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-4xl lg:text-5xl font-poppins font-bold mb-3 text-balance text-white dark:text-primary-foreground">
              Panel de Administración
            </h1>
            <p className="text-lg lg:text-xl text-celeste-complementario/90 dark:text-primary-foreground/80 max-w-3xl text-balance">
              Gestiona actividades, usuarios, colaboraciones, donaciones, documentos legales, partners, beneficios y novedades.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
            <TabsList
              className="grid w-full mx-auto bg-celeste-complementario/30 dark:bg-muted p-1 rounded-lg
                         grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-10 gap-1 max-w-full"
            >
              {TABS_CONFIG.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-primary-antoniano data-[state=active]:text-blanco-fundacion
                             dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground
                             data-[state=active]:shadow-md rounded-md py-2.5 capitalize text-xs sm:text-sm
                             text-primary-antoniano dark:text-muted-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* RESUMEN */}
            <TabsContent value="overview" className="space-y-8">
              {/* Tus cards clásicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[
                  { title: 'Total Usuarios', value: stats.totalUsers, icon: Users, desc: 'Usuarios registrados' },
                  { title: 'Usuarios Admin', value: stats.adminUsers, icon: UserCog, desc: 'Con rol Administrador' },
                  { title: 'Usuarios Miembro', value: stats.memberUsers, icon: UserCheck, desc: 'Con rol Miembro' },
                  { title: 'Actividades', value: stats.totalActivities, icon: Calendar, desc: 'Actividades disponibles' },
                  { title: 'Colaboraciones Activas', value: stats.activeMemberships, icon: Heart, desc: 'Suscripciones activas' },
                  { title: 'Donaciones Únicas', value: stats.totalDonations, icon: Gift, desc: 'Donaciones únicas exitosas' },
                  { title: 'Documentos Legales', value: stats.totalLegalDocuments, icon: FileTextIcon, desc: 'Documentos publicados' },
                  { title: 'Pendientes Confirmar', value: stats.pendingConfirmations, icon: MailWarning, desc: 'Inscripciones no confirmadas' },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Card className="border-marron-legado/10 dark:border-border shadow-lg hover:shadow-xl transition-shadow bg-card text-card-foreground">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary-antoniano dark:text-primary">{item.title}</CardTitle>
                        <item.icon
                          className={`h-5 w-5 ${
                            item.title === 'Pendientes Confirmar'
                              ? 'text-amber-500 dark:text-amber-400'
                              : 'text-marron-legado/70 dark:text-muted-foreground'
                          }`}
                        />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-primary-antoniano dark:text-foreground">{item.value}</div>
                        <p className="text-xs text-marron-legado/80 dark:text-muted-foreground">{item.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Mini StatsOverview (partners/beneficios) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Total Partners', value: ecoStats.totalPartners, icon: Users, color: 'from-blue-500 to-blue-600' },
                  { title: 'Partners Aprobados', value: ecoStats.approvedPartners, icon: CheckCircle, color: 'from-green-500 to-green-600' },
                  { title: 'Partners Pendientes', value: ecoStats.pendingPartners, icon: Clock, color: 'from-amber-500 to-amber-600' },
                  { title: 'Beneficios Activos', value: ecoStats.activeBenefits, icon: Gift, color: 'from-purple-500 to-purple-600' },
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Actividades recientes */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
                <Card className="border-marron-legado/10 dark:border-border shadow-lg bg-card text-card-foreground">
                  <CardHeader>
                    <CardTitle className="text-xl font-poppins text-primary-antoniano dark:text-primary">Actividades Recientes</CardTitle>
                    <CardDescription className="text-marron-legado/90 dark:text-muted-foreground">Las últimas 3 actividades creadas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivitiesData.length > 0 ? (
                        recentActivitiesData.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-4 border border-celeste-complementario dark:border-accent rounded-lg bg-celeste-complementario/20 dark:bg-accent/30 hover:bg-celeste-complementario/30 dark:hover:bg-accent/40 transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-primary-antoniano dark:text-primary">{activity.title}</p>
                              <p className="text-sm text-marron-legado/80 dark:text-muted-foreground">{formatDate(activity.date)}</p>
                            </div>
                            <Badge
                              variant={activity.modality === 'presencial' ? 'default' : 'secondary'}
                              className={`capitalize shadow-sm ${
                                activity.modality === 'presencial'
                                  ? 'bg-primary-antoniano text-white dark:bg-primary dark:text-primary-foreground'
                                  : 'bg-green-600 text-white dark:bg-green-700 dark:text-primary-foreground'
                              }`}
                            >
                              {activity.modality}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-marron-legado/80 dark:text-muted-foreground">No hay actividades recientes.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ACTIVIDADES */}
            <TabsContent value="activities">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {isAdmin && (
                  <div className="flex justify-end mb-6">
                    <motion.div whileTap={{ scale: 0.95 }}>
                      <Link to="/admin/activities/new">
                        <Button
                          variant="antoniano"
                          className="text-white dark:text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                          aria-label="Crear Nueva Actividad"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Crear Nueva Actividad
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                )}
                <ActivityList onAddRequest={() => navigate('/admin/activities/new')} />
              </motion.div>
            </TabsContent>

            {/* PENDIENTES */}
            <TabsContent value="pending">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <PendingConfirmationsList />
              </motion.div>
            </TabsContent>

            {/* USUARIOS */}
            <TabsContent value="users">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <UserList />
              </motion.div>
            </TabsContent>

            {/* COLABORACIONES */}
            <TabsContent value="memberships">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <MembershipList />
              </motion.div>
            </TabsContent>

            {/* DONACIONES */}
            <TabsContent value="donations">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <DonationList />
              </motion.div>
            </TabsContent>

            {/* DOCUMENTOS LEGALES */}
            <TabsContent value="legal_documents">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <LegalDocumentList />
              </motion.div>
            </TabsContent>

            {/* PARTNERS */}
            <TabsContent value="partners">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <PartnersAdmin />
              </motion.div>
            </TabsContent>

            {/* BENEFICIOS */}
            <TabsContent value="benefits">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <BenefitsAdmin />
              </motion.div>
            </TabsContent>

            {/* NOVEDADES */}
            <TabsContent value="news">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <NewsAdmin />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
