import React from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const MetricCard = ({ icon: Icon, title, value, loading, format, gradient, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className={`overflow-hidden shadow-lg border-none relative h-full ${gradient}`}>
        {/* Decoración de fondo */}
        <Icon className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10 rotate-12 pointer-events-none" />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white shadow-sm">
                <Icon className="w-6 h-6" />
             </div>
             {/* Chip decorativo opcional */}
             <div className="px-2 py-1 bg-white/10 rounded-full text-[10px] text-white/90 font-bold uppercase tracking-wider backdrop-blur-sm border border-white/10">
                Métrica
             </div>
          </div>
          
          <div className="space-y-1">
             <p className="text-white/80 text-sm font-medium">{title}</p>
             <div className="h-10 flex items-center">
                {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                ) : (
                    <h3 className="text-3xl font-bold font-poppins text-white tracking-tight">
                        {format ? format(value) : value}
                    </h3>
                )}
             </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const SummaryMetrics = ({ metrics, loading }) => {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-6">
         <TrendingUp className="w-5 h-5 text-brand-gold" />
         <h2 className="text-xl md:text-2xl font-poppins text-brand-dark font-bold">Resumen de Impacto</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          icon={DollarSign}
          title="Tu Aporte Total (Donaciones Únicas)"
          value={metrics.total_donado}
          loading={loading}
          format={(val) => `$ ${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
          gradient="bg-gradient-to-br from-brand-primary to-blue-600"
          delay={0.1}
        />
        <MetricCard
          icon={Users}
          title="Suscripciones Activas"
          value={metrics.total_suscripciones_activas}
          loading={loading}
          format={(val) => val || 0}
          gradient="bg-gradient-to-br from-brand-action to-red-600"
          delay={0.2}
        />
      </div>
    </div>
  );
};

export default SummaryMetrics;