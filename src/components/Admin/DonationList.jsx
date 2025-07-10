import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Gift, CheckCircle, AlertTriangle, Loader2, UserX } from 'lucide-react';

const DonationList = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          id,
          amount,
          donation_type,
          payment_provider,
          status,
          created_at,
          users (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast({ title: "Error", description: "No se pudieron cargar las donaciones únicas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDonations();
    
    const channel = supabase.channel('realtime:public:donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        fetchDonations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDonations]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    });
  };

  const getStatusBadge = (status) => {
    status = status ? status.toLowerCase() : 'desconocido';
    switch (status) {
      case 'completed':
      case 'approved':
      case 'succeeded':
        return <Badge variant="default" className="bg-green-500 text-white dark:bg-green-600 dark:text-primary-foreground flex items-center text-xs py-1 px-2.5 shadow-sm"><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Completada</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-black dark:bg-yellow-600 dark:text-primary-foreground flex items-center text-xs py-1 px-2.5 shadow-sm"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Pendiente</Badge>;
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-500 text-white dark:bg-red-600 dark:text-primary-foreground flex items-center text-xs py-1 px-2.5 shadow-sm"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Fallida</Badge>;
      default:
        return <Badge variant="outline" className="text-xs py-1 px-2.5 shadow-sm">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary-antoniano" />
        <p className="ml-2 text-marron-legado dark:text-muted-foreground">Cargando donaciones únicas...</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-poppins text-primary-antoniano dark:text-primary">Gestión de Donaciones Únicas</CardTitle>
        <CardDescription className="text-marron-legado/90 dark:text-muted-foreground">Lista de todas las donaciones únicas y su estado.</CardDescription>
      </CardHeader>
      <CardContent>
        {donations.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-marron-legado/30 dark:text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-marron-legado/70 dark:text-muted-foreground text-lg">No hay donaciones únicas registradas aún.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {donations.map((donation) => (
              <div 
                key={donation.id} 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-celeste-complementario dark:border-accent rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out bg-celeste-complementario/10 dark:bg-accent/20"
              >
                <div className="flex-1 mb-4 sm:mb-0">
                  <h3 className="font-semibold text-xl text-primary-antoniano dark:text-primary mb-1">
                    {donation.users?.name || <span className="italic text-marron-legado/70 dark:text-muted-foreground/70 flex items-center"><UserX className="w-4 h-4 mr-1.5"/>Donante Anónimo</span>}
                  </h3>
                  {donation.users?.email && (
                    <p className="text-sm text-marron-legado dark:text-muted-foreground mb-0.5">
                      {donation.users.email}
                    </p>
                  )}
                  {donation.users?.id && (
                     <p className="text-xs text-marron-legado/70 dark:text-muted-foreground/80">
                      ID Usuario: {donation.users.id}
                    </p>
                  )}
                  <p className="text-xs text-marron-legado/70 dark:text-muted-foreground/80 mt-1">
                    Fecha: {formatDate(donation.created_at)}
                  </p>
                  <p className="text-xs text-marron-legado/70 dark:text-muted-foreground/80">
                    Tipo: <span className="font-medium">{donation.donation_type}</span> - Proveedor: <span className="font-medium">{donation.payment_provider || 'N/A'}</span>
                  </p>
                </div>
                <div className="flex flex-col sm:items-end space-y-2 sm:space-y-1.5 flex-shrink-0">
                  <span className="text-lg font-bold text-primary-antoniano dark:text-primary">${donation.amount}</span>
                  {getStatusBadge(donation.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DonationList;