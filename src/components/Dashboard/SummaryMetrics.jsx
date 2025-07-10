import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DollarSign, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const MetricCard = ({ icon: Icon, title, value, loading, format, colorClass, delay }) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay } },
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className={`overflow-hidden shadow-2xl border-transparent ${colorClass}`}>
        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-base font-poppins font-medium text-white/90">{title}</CardTitle>
              <div className="h-12">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : (
                  <p className="text-4xl font-bold font-poppins text-white">
                    {format ? format(value) : value}
                  </p>
                )}
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-lg">
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const SummaryMetrics = ({ metrics, loading }) => {
  return (
    <motion.div
      className="mb-10"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.2,
          },
        },
      }}
    >
      <h2 className="text-2xl md:text-3xl font-poppins text-primary-antoniano dark:text-primary mb-6 font-semibold">Resumen General</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <MetricCard
          icon={DollarSign}
          title="Total Donado (Global de todas las Donaciones Únicas)"
          value={metrics.total_donado}
          loading={loading}
          format={(val) => `${(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          colorClass="bg-gradient-to-br from-primary-antoniano to-azul-antoniano dark:from-primary dark:to-primary/70"
          delay={0.1}
        />
        <MetricCard
          icon={Users}
          title="Colaboradores mensuales suscriptos"
          value={metrics.total_suscripciones_activas}
          loading={loading}
          format={(val) => val || 0}
          colorClass="bg-gradient-to-br from-marron-legado to-marron-legado/80 dark:from-marron-legado/70 dark:to-marron-legado/60"
          delay={0.2}
        />
      </div>
    </motion.div>
  );
};

export default SummaryMetrics;