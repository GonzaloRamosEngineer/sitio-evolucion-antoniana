import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, Heart, MailWarning, Gift, Handshake, Newspaper,
  FileText, ShieldCheck, LayoutDashboard, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminStats } from '@/hooks/useAdminStats';
import OverviewTab from '@/components/Admin/OverviewTab';
import ActivityList from '@/components/Admin/ActivityList';
import PendingConfirmationsList from '@/components/Admin/PendingConfirmationsList';
import UserList from '@/components/Admin/UserList';
import MembershipList from '@/components/Admin/MembershipList';
import DonationList from '@/components/Admin/DonationList';
import LegalDocumentList from '@/components/Admin/LegalDocumentList';
import PartnersAdmin from '@/components/Admin/PartnersAdmin';
import BenefitsAdmin from '@/components/Admin/BenefitsAdmin';
import NewsAdmin from '@/components/Admin/NewsAdmin';

const AdminPanel = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, recentActivities, loading: statsLoading, error: statsError, refresh } = useAdminStats();

  // 🛡️ PROTECCIÓN DE RUTA: Redirección por rol
  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin && user?.role === 'educacion_manager') {
        navigate('/admin/education');
      } else if (!isAdmin && user?.role === 'comision_directiva') {
        navigate('/comision');
      } else if (!isAdmin) {
        navigate('/');
      }
    }
  }, [isAdmin, user, authLoading, navigate]);

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';
    setActiveTab((prev) => (currentTab !== prev ? currentTab : prev));
  }, [location.search]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    navigate(`/admin?tab=${newTab}`, { replace: true });
    // Las métricas del resumen se refrescan al volver, para reflejar cambios hechos en otras secciones.
    if (newTab === 'overview') refresh();
  };

  const NAV_GROUPS = useMemo(
    () => [
      {
        label: null,
        items: [{ value: 'overview', label: 'Resumen', icon: LayoutDashboard }],
      },
      {
        label: 'Gestión',
        items: [
          { value: 'activities', label: 'Actividades', icon: Calendar },
          { value: 'pending', label: 'Pendientes', icon: MailWarning, badge: stats.pendingConfirmations },
          { value: 'news', label: 'Novedades', icon: Newspaper },
        ],
      },
      {
        label: 'Comunidad',
        items: [
          { value: 'users', label: 'Usuarios', icon: Users },
          { value: 'memberships', label: 'Colaboraciones', icon: Heart },
          { value: 'donations', label: 'Donaciones', icon: Gift },
        ],
      },
      {
        label: 'Ecosistema',
        items: [
          { value: 'partners', label: 'Partners', icon: Handshake, badge: stats.pendingPartners },
          { value: 'benefits', label: 'Beneficios', icon: Gift },
        ],
      },
      {
        label: 'Institucional',
        items: [{ value: 'legal_documents', label: 'Legales', icon: FileText }],
      },
    ],
    [stats.pendingConfirmations, stats.pendingPartners]
  );

  const flatNavItems = useMemo(() => NAV_GROUPS.flatMap((g) => g.items), [NAV_GROUPS]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-sand">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeTab) {
      case 'activities':
        return <ActivityList onAddRequest={() => navigate('/admin/activities/new')} />;
      case 'pending':
        return <PendingConfirmationsList />;
      case 'users':
        return <UserList />;
      case 'memberships':
        return <MembershipList />;
      case 'donations':
        return <DonationList />;
      case 'legal_documents':
        return <LegalDocumentList />;
      case 'partners':
        return <PartnersAdmin />;
      case 'benefits':
        return <BenefitsAdmin />;
      case 'news':
        return <NewsAdmin />;
      case 'overview':
      default:
        return (
          <OverviewTab
            stats={stats}
            recentActivities={recentActivities}
            loading={statsLoading}
            error={statsError}
            onNavigate={handleTabChange}
            onRetry={refresh}
          />
        );
    }
  };

  const NavBadge = ({ count }) =>
    count > 0 ? (
      <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-brand-action text-white text-[10px] font-bold flex items-center justify-center">
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-brand-sand font-sans">
      <Helmet>
        <title>Panel de Administración - Fundación Evolución Antoniana</title>
        <meta
          name="description"
          content="Gestión de actividades, usuarios, colaboraciones, donaciones, documentos legales, partners, beneficios y novedades."
        />
      </Helmet>

      {/* --- HEADER COMPACTO --- */}
      <section className="relative bg-brand-primary overflow-hidden pt-8 pb-8 px-4">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          ></div>
        </div>

        <div className="relative max-w-screen-2xl mx-auto z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex p-3 rounded-2xl bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm">
              <ShieldCheck className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-poppins font-bold text-white">Panel General</h1>
              <p className="text-gray-300 text-sm">
                Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Gestión central de la fundación.
              </p>
            </div>
          </div>
          <Link to="/" className="shrink-0">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hover:text-white gap-2 bg-transparent">
              <ExternalLink className="w-4 h-4" /> Ver sitio web
            </Button>
          </Link>
        </div>
      </section>

      {/* --- NAV MOBILE (chips scrolleables) --- */}
      <div className="lg:hidden sticky top-24 z-30 bg-brand-sand/95 backdrop-blur-md px-4 py-2 border-b border-gray-200/60">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {flatNavItems.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => handleTabChange(item.value)}
                className={`relative shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-white text-gray-600 hover:text-brand-primary border border-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.badge > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-white text-brand-primary' : 'bg-brand-action text-white'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- LAYOUT PRINCIPAL: SIDEBAR + CONTENIDO --- */}
      <section className="px-4 py-6 lg:py-8">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Sidebar desktop */}
          <aside className="hidden lg:block sticky top-24">
            <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-4">
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.label || gi}>
                  {group.label && (
                    <p className="px-3 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => handleTabChange(item.value)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left ${
                            isActive
                              ? 'bg-brand-primary text-white shadow-sm'
                              : 'text-gray-600 hover:text-brand-primary hover:bg-brand-sand'
                          }`}
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-gold' : ''}`} />
                          <span className="truncate">{item.label}</span>
                          <NavBadge count={item.badge} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Contenido */}
          <main className="min-h-[500px] min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
