import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Heart, CheckCircle, XCircle, Loader2, UserX } from 'lucide-react';

const MembershipList = () => {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          plan,
          amount,
          payment_method,
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
      setMemberships(data || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      toast({ title: "Error", description: "No se pudieron cargar las colaboraciones recurrentes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMemberships();

    const channel = supabase.channel('realtime:public:memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => {
        fetchMemberships();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [fetchMemberships]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary-antoniano" />
        <p className="ml-2 text-marron-legado dark:text-muted-foreground">Cargando colaboraciones recurrentes...</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-poppins text-primary-antoniano dark:text-primary">Gestión de Colaboraciones Recurrentes</CardTitle>
        <CardDescription className="text-marron-legado/90 dark:text-muted-foreground">Lista de todas las colaboraciones recurrentes (suscripciones) y su estado.</CardDescription>
      </CardHeader>
      <CardContent>
        {memberships.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-marron-legado/30 dark:text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-marron-legado/70 dark:text-muted-foreground text-lg">No hay colaboraciones recurrentes registradas aún.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {memberships.map((membership) => (
              <div 
                key={membership.id} 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-celeste-complementario dark:border-accent rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out bg-celeste-complementario/10 dark:bg-accent/20"
              >
                <div className="flex-1 mb-4 sm:mb-0">
                  <h3 className="font-semibold text-xl text-primary-antoniano dark:text-primary mb-1">
                    {membership.users?.name || <span className="italic text-marron-legado/70 dark:text-muted-foreground/70 flex items-center"><UserX className="w-4 h-4 mr-1.5"/>Usuario Desconocido</span>}
                  </h3>
                  <p className="text-sm text-marron-legado dark:text-muted-foreground mb-0.5">
                    {membership.users?.email || <span className="italic text-marron-legado/70 dark:text-muted-foreground/70">Email no disponible</span>}
                  </p>
                  <p className="text-xs text-marron-legado/70 dark:text-muted-foreground/80">
                    ID Usuario: {membership.users?.id || 'N/A'}
                  </p>
                  <p className="text-xs text-marron-legado/70 dark:text-muted-foreground/80 mt-1">
                    Colaboración desde: {formatDate(membership.created_at)}
                  </p>
                  <p className="text-xs text-marron-legado/70 dark:text-muted-foreground/80">
                    Plan: <span className="font-medium">{membership.plan}</span> - Método: <span className="font-medium">{membership.payment_method}</span>
                  </p>
                </div>
                <div className="flex flex-col sm:items-end space-y-2 sm:space-y-1.5 flex-shrink-0">
                  <span className="text-lg font-bold text-primary-antoniano dark:text-primary">${membership.amount}</span>
                  <Badge 
                    variant={membership.status === 'active' ? 'default' : 'destructive'} 
                    className={`flex items-center text-xs py-1 px-2.5 shadow-sm ${membership.status === 'active' ? 'bg-green-500 text-white dark:bg-green-600 dark:text-primary-foreground' : 'bg-red-500 text-white dark:bg-red-600 dark:text-primary-foreground'}`}
                  >
                    {membership.status === 'active' ? <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                    {membership.status === 'active' ? 'Activa' : (membership.status ? membership.status.charAt(0).toUpperCase() + membership.status.slice(1) : 'Desconocido')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipList;