import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPartners, getBenefits } from '@/lib/storage';

const INITIAL_STATS = {
  totalUsers: 0,
  adminUsers: 0,
  memberUsers: 0,
  totalActivities: 0,
  activeMemberships: 0,
  pendingConfirmations: 0,
  totalDonations: 0,
  totalLegalDocuments: 0,
  totalPartners: 0,
  approvedPartners: 0,
  pendingPartners: 0,
  totalBenefits: 0,
  activeBenefits: 0,
};

const countQuery = (table, filter) => {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  return query.then(({ count, error }) => {
    if (error) throw error;
    return count || 0;
  });
};

// Métricas del panel admin: todos los counts y datos del resumen en paralelo.
export function useAdminStats() {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        totalUsers,
        adminUsers,
        memberUsers,
        totalActivities,
        activeMemberships,
        pendingConfirmations,
        totalDonations,
        totalLegalDocuments,
        recent,
        partners,
        benefits,
      ] = await Promise.all([
        countQuery('users'),
        countQuery('users', (q) => q.eq('role', 'admin')),
        countQuery('users', (q) => q.eq('role', 'user')),
        countQuery('activities'),
        countQuery('memberships', (q) => q.eq('status', 'active')),
        countQuery('registrations', (q) => q.eq('is_confirmed', false)),
        countQuery('donations', (q) => q.in('status', ['completed', 'approved', 'succeeded'])),
        countQuery('legal_documents'),
        supabase
          .from('activities')
          .select('id, title, date, modality')
          .order('created_at', { ascending: false })
          .limit(4)
          .then(({ data, error: err }) => {
            if (err) throw err;
            return data || [];
          }),
        getPartners(),
        getBenefits(),
      ]);

      setStats({
        totalUsers,
        adminUsers,
        memberUsers,
        totalActivities,
        activeMemberships,
        pendingConfirmations,
        totalDonations,
        totalLegalDocuments,
        totalPartners: partners.length,
        approvedPartners: partners.filter((p) => p.estado === 'aprobado').length,
        pendingPartners: partners.filter((p) => p.estado === 'pendiente').length,
        totalBenefits: benefits.length,
        activeBenefits: benefits.filter((b) => b.estado === 'activo').length,
      });
      setRecentActivities(recent);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, recentActivities, loading, error, refresh };
}

export default useAdminStats;
