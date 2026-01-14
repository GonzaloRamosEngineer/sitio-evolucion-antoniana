// src/pages/LegalDocuments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, ExternalLink, AlertTriangle, ShieldCheck, Download, Calendar } from 'lucide-react';
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
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-brand-sand">
        <Loader2 className="h-16 w-16 animate-spin text-brand-primary" />
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
      className="min-h-screen bg-brand-sand font-sans"
    >
      {/* --- HERO SECTION (Tech-Institucional) --- */}
      <section className="relative bg-brand-primary overflow-hidden py-20 px-4">
        {/* Fondo Tech Sutil */}
        <div className="absolute inset-0">
           <div className="absolute inset-0 bg-hero-glow opacity-90"></div>
           <div className="absolute inset-0 opacity-10" 
                style={{ backgroundImage: 'radial-gradient(#C98E2A 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
           </div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-dark/40 border border-brand-gold/30 backdrop-blur-sm mb-6">
               <ShieldCheck className="w-4 h-4 text-brand-gold" />
               <span className="text-brand-gold text-xs font-bold tracking-widest uppercase">Transparencia Institucional</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-poppins font-bold text-white mb-6">
              Documentación <span className="text-brand-gold">Oficial</span>
            </h1>
            
            <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              Accede a nuestros estatutos, balances y reportes de gestión. La transparencia es la base de nuestra confianza.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- CONTENIDO --- */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Resumen (Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-brand-sand p-3 rounded-full text-brand-primary">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-brand-dark">{documents.length}</p>
                    <p className="text-sm text-gray-500">Documentos Publicados</p>
                </div>
            </div>
            {/* Puedes agregar más stats aquí si tienes la data, por ahora placeholders visuales */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-full text-green-600">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-lg font-bold text-brand-dark">Verificado</p>
                    <p className="text-sm text-gray-500">Estado Legal</p>
                </div>
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                    <Calendar className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-lg font-bold text-brand-dark">2024</p>
                    <p className="text-sm text-gray-500">Periodo Actual</p>
                </div>
            </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center space-x-4 mb-8"
          >
            <AlertTriangle className="w-8 h-8 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-lg">Error al cargar documentos</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </motion.div>
        )}

        {documents.length === 0 && !loading && !error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"
          >
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-xl font-bold text-brand-dark mb-2">
              No hay documentos públicos disponibles.
            </p>
            <p className="text-gray-500">
              Estamos actualizando nuestro repositorio. Por favor, vuelve a consultar pronto.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.id}
              variants={cardVariants}
              initial="initial"
              animate="in"
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col bg-white border border-transparent hover:border-brand-primary/20 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl group">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                  <div className="flex gap-4">
                      <div className="mt-1 bg-brand-sand p-2.5 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                          <FileText className="w-6 h-6" />
                      </div>
                      <div>
                          <CardTitle className="text-xl font-poppins font-bold text-brand-dark leading-tight mb-2 group-hover:text-brand-action transition-colors">
                            {doc.title}
                          </CardTitle>
                          <Badge 
                            variant="secondary" 
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-0 font-medium px-2.5"
                          >
                            {doc.category}
                          </Badge>
                      </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-grow pl-[5.5rem]">
                  {doc.description && (
                    <CardDescription className="text-gray-600 text-sm leading-relaxed mb-3">
                      {doc.description}
                    </CardDescription>
                  )}
                  <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Publicado el {new Date(doc.created_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </CardContent>

                <CardFooter className="pt-4 border-t border-gray-50 pl-[5.5rem]">
                  <Button
                    variant="ghost"
                    asChild
                    className="p-0 h-auto font-bold text-brand-primary hover:text-brand-action hover:bg-transparent transition-colors group/btn"
                  >
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      Ver Documento
                      <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
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

// Importamos ArrowRight que faltaba en el destructuring original
import { ArrowRight } from 'lucide-react'; 

export default LegalDocuments;