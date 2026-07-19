import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Calendar, Heart, Gift, MailWarning, FileText, UserCheck, Handshake,
  Plus, Clock, ArrowRight, AlertTriangle, RefreshCw, Newspaper,
} from 'lucide-react';
import EmptyState from '@/components/Admin/shared/EmptyState';

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

const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between">
    <div className="space-y-2 flex-1">
      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
      <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
    </div>
    <div className="h-11 w-11 rounded-xl bg-gray-100 animate-pulse" />
  </div>
);

// Tab "Resumen" del panel: métricas clickeables, alertas accionables y accesos rápidos.
const OverviewTab = ({ stats, recentActivities, loading, error, onNavigate, onRetry }) => {
  const mainStats = [
    { title: 'Usuarios', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600', tab: 'users' },
    { title: 'Actividades', value: stats.totalActivities, icon: Calendar, color: 'bg-purple-50 text-purple-600', tab: 'activities' },
    { title: 'Colaboraciones activas', value: stats.activeMemberships, icon: Heart, color: 'bg-red-50 text-red-600', tab: 'memberships' },
    { title: 'Donaciones', value: stats.totalDonations, icon: Gift, color: 'bg-green-50 text-green-600', tab: 'donations' },
    { title: 'Partners aprobados', value: stats.approvedPartners, icon: Handshake, color: 'bg-cyan-50 text-cyan-600', tab: 'partners' },
    { title: 'Beneficios activos', value: stats.activeBenefits, icon: Gift, color: 'bg-amber-50 text-amber-600', tab: 'benefits' },
    { title: 'Documentos legales', value: stats.totalLegalDocuments, icon: FileText, color: 'bg-gray-100 text-gray-600', tab: 'legal_documents' },
    { title: 'Administradores', value: stats.adminUsers, icon: UserCheck, color: 'bg-indigo-50 text-indigo-600', tab: 'users' },
  ];

  const attentionItems = [
    stats.pendingConfirmations > 0 && {
      key: 'pending',
      icon: MailWarning,
      label: `${stats.pendingConfirmations} inscripci${stats.pendingConfirmations === 1 ? 'ón' : 'ones'} sin confirmar email`,
      cta: 'Revisar pendientes',
      tab: 'pending',
    },
    stats.pendingPartners > 0 && {
      key: 'partners',
      icon: Handshake,
      label: `${stats.pendingPartners} partner${stats.pendingPartners === 1 ? '' : 's'} esperando aprobación`,
      cta: 'Revisar partners',
      tab: 'partners',
    },
  ].filter(Boolean);

  if (error) {
    return (
      <Card className="border-none shadow-sm rounded-2xl">
        <CardContent className="p-0">
          <EmptyState
            icon={AlertTriangle}
            title="No se pudieron cargar las métricas"
            description="Hubo un problema al consultar los datos del panel."
            action={
              <Button variant="outline" onClick={onRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Reintentar
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas accionables */}
      {!loading && attentionItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {attentionItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.tab)}
              className="w-full flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-left hover:bg-amber-100 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition-colors shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-amber-900 text-sm truncate">{item.label}</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-700 uppercase tracking-wide shrink-0">
                {item.cta} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Métricas principales (clickeables) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
          : mainStats.map((item, index) => (
              <motion.button
                key={item.title}
                type="button"
                onClick={() => onNavigate(item.tab)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="text-left bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 p-5 flex items-center justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-1 truncate">{item.title}</p>
                  <p className="text-2xl md:text-3xl font-bold font-poppins text-brand-dark group-hover:text-brand-primary transition-colors">
                    {item.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${item.color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </motion.button>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas actividades */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-3 space-y-0">
            <CardTitle className="text-base font-poppins font-bold text-brand-dark flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-gold" /> Últimas actividades
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('activities')}
              className="text-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 text-xs gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 w-1/2 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-1/3 bg-gray-50 rounded animate-pulse" />
                    </div>
                    <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {recentActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    to={`/admin/activities/edit/${activity.id}`}
                    className="p-4 hover:bg-brand-sand/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-dark text-sm group-hover:text-brand-primary transition-colors truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(activity.date)}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] px-2 py-0.5 capitalize shrink-0 ${
                        activity.modality === 'presencial'
                          ? 'bg-brand-primary text-white hover:bg-brand-primary'
                          : 'bg-green-100 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {activity.modality}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No hay actividades recientes"
                action={
                  <Link to="/admin/activities/new">
                    <Button variant="outline" size="sm" className="gap-2 text-brand-primary border-brand-primary/30">
                      <Plus className="w-4 h-4" /> Crear actividad
                    </Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden h-fit">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-poppins font-bold text-brand-dark">
              Acciones rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2">
            <Link to="/admin/activities/new" className="block">
              <Button variant="action" className="w-full justify-start gap-2 font-semibold">
                <Plus className="w-4 h-4" /> Nueva actividad
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => onNavigate('news')}
              className="w-full justify-start gap-2 text-brand-dark"
            >
              <Newspaper className="w-4 h-4 text-brand-gold" /> Publicar novedad
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate('benefits')}
              className="w-full justify-start gap-2 text-brand-dark"
            >
              <Gift className="w-4 h-4 text-brand-gold" /> Cargar beneficio
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate('legal_documents')}
              className="w-full justify-start gap-2 text-brand-dark"
            >
              <FileText className="w-4 h-4 text-brand-gold" /> Subir documento legal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
