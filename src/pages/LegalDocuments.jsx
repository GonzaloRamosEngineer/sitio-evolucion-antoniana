import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const LegalDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('legal_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching legal documents:', err);
      setError('No se pudieron cargar los documentos legales.');
      toast({
        title: 'Error al cargar documentos',
        description: 'Hubo un problema al obtener los documentos legales. Intenta de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-blanco-fundacion dark:bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary-antoniano dark:text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-blanco-fundacion dark:bg-background font-inter py-8 md:py-12"
    >
      <section className="py-20 md:py-28 text-center bg-gradient-to-b from-celeste-complementario/30 via-blanco-fundacion to-blanco-fundacion hero-pattern">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-4xl md:text-5xl lg:text-6xl font-poppins font-extrabold text-azul-profundo dark:text-white mb-6 text-balance"
          >
            Transparencia
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-marron-legado/90 dark:text-white/80 max-w-3xl mx-auto leading-relaxed text-balance"
          >
            Accede a nuestra documentación oficial para conocer más sobre nuestra estructura, operaciones y políticas.
          </motion.p>
        </div>
      </section>

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive dark:text-destructive-foreground p-6 rounded-lg flex items-center space-x-3 mb-8"
          >
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error al cargar documentos</p>
              <p className="text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {documents.length === 0 && !loading && !error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <FileText className="w-24 h-24 text-marron-legado/30 dark:text-muted-foreground/30 mx-auto mb-6" />
            <p className="text-xl text-marron-legado/70 dark:text-muted-foreground">
              No hay documentos legales disponibles en este momento.
            </p>
            <p className="text-sm text-marron-legado/50 dark:text-muted-foreground/50 mt-2">
              Por favor, vuelve a consultar más tarde.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.id}
              variants={cardVariants}
              initial="initial"
              animate="in"
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col border-marron-legado/10 dark:border-border shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-card">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-2xl font-poppins text-primary-antoniano dark:text-primary leading-tight">
                      {doc.title}
                    </CardTitle>
                    <Badge 
                      variant="outline" 
                      className="capitalize border-primary-antoniano/50 text-primary-antoniano dark:border-primary/50 dark:text-primary whitespace-nowrap text-xs py-1 px-2.5"
                    >
                      {doc.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  {doc.description && (
                    <CardDescription className="text-marron-legado/80 dark:text-muted-foreground text-sm leading-relaxed mb-4">
                      {doc.description}
                    </CardDescription>
                  )}
                  <p className="text-xs text-marron-legado/60 dark:text-muted-foreground/70">
                    Publicado: {new Date(doc.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-marron-legado/10 dark:border-border/20">
                  <Button
                    variant="antoniano"
                    asChild
                    className="w-full text-white dark:text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                  >
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      Ver / Descargar Documento
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default LegalDocuments;