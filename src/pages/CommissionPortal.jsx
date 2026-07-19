import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, FolderKanban, FileStack, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import ProjectsManager from '@/components/Comision/ProjectsManager';
import DocumentsManager from '@/components/Comision/DocumentsManager';

const TABS = [
  { value: 'projects', label: 'Proyectos', icon: FolderKanban },
  { value: 'documents', label: 'Documentos', icon: FileStack },
];

// Portal interno de la Comisión Directiva. Acceso gateado en App.jsx por
// ProtectedRoute allowedRoles={["admin","comision_directiva"]} (la barrera real
// son las RLS de Supabase).
const CommissionPortal = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'projects';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const current = new URLSearchParams(location.search).get('tab') || 'projects';
    setActiveTab((prev) => (current !== prev ? current : prev));
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/comision?tab=${tab}`, { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-sand">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-sand font-sans">
      <Helmet>
        <title>Comisión Directiva - Fundación Evolución Antoniana</title>
        <meta name="robots" content="noindex" />
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

        <div className="relative max-w-screen-xl mx-auto z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex p-3 rounded-2xl bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm">
              <Briefcase className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-poppins font-bold text-white">Comisión Directiva</h1>
              <p className="text-gray-300 text-sm">
                Hola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Proyectos y documentación de la fundación.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hover:text-white gap-2 bg-transparent">
                  Panel General
                </Button>
              </Link>
            )}
            <Link to="/">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hover:text-white gap-2 bg-transparent">
                <ExternalLink className="w-4 h-4" /> Ver sitio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- TABS --- */}
      <div className="sticky top-20 z-30 bg-brand-sand/95 backdrop-blur-md px-4 py-2 border-b border-gray-200/60">
        <div className="max-w-screen-xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-white text-gray-600 hover:text-brand-primary border border-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- CONTENIDO --- */}
      <section className="px-4 py-8">
        <div className="max-w-screen-xl mx-auto min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                {activeTab === 'projects' ? <ProjectsManager /> : <DocumentsManager />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};

export default CommissionPortal;
