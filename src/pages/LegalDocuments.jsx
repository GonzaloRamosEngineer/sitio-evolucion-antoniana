// src/pages/LegalDocuments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Loader2, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
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

  const rise = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-brand-sand">
        <Loader2 className="h-16 w-16 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-sand">
      <Helmet>
        <title>Documentación Oficial - Fundación Evolución Antoniana</title>
        <meta name="description" content="Accedé a los estatutos, balances y reportes de gestión de la Fundación Evolución Antoniana." />
        <link rel="canonical" href="https://www.evolucionantoniana.com/legal-documents" />
      </Helmet>

      {/* ============ HERO ============ */}
      <section className="relative bg-brand-primary text-white overflow-hidden border-t-2 border-brand-gold">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow" />
        <motion.div
          {...rise}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
        >
          <div className="mb-6">
            <Eyebrow light>Transparencia institucional</Eyebrow>
          </div>
          <h1 className="font-poppins font-bold text-4xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-white text-balance mb-6">
            Documentación oficial
          </h1>
          <p className="max-w-[36rem] text-lg leading-relaxed text-white/75">
            Accedé a nuestros estatutos, balances y reportes de gestión. La
            transparencia es la base de nuestra confianza.
          </p>
        </motion.div>
      </section>

      {/* ============ LISTADO DE DOCUMENTOS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <motion.div
          {...rise}
          transition={{ ...rise.transition, delay: 0.1 }}
          className="max-w-3xl"
        >
          <div className="mb-5">
            <Eyebrow>Documentos públicos</Eyebrow>
          </div>
          <p className="max-w-[36rem] text-gray-600 leading-relaxed mb-10">
            Para solicitar la documentación completa y detallada, realizá una
            solicitud formal al correo{' '}
            <a
              href="mailto:info@evolucionantoniana.com"
              className="font-medium text-brand-primary hover:text-brand-action transition-colors"
            >
              info@evolucionantoniana.com
            </a>
            .
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-sm flex items-start gap-4 mb-8">
              <AlertTriangle aria-hidden="true" className="w-6 h-6 flex-shrink-0 text-red-500" />
              <div>
                <p className="font-semibold">Error al cargar documentos</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          )}

          {documents.length === 0 && !loading && !error && (
            <div className="bg-white border border-dashed border-brand-dark/20 rounded-sm p-10">
              <p className="font-poppins font-semibold text-brand-dark mb-1">
                No hay documentos públicos disponibles.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Estamos actualizando nuestro repositorio. Por favor, volvé a
                consultar pronto.
              </p>
            </div>
          )}

          {documents.length > 0 && (
            <ul>
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="border-t border-brand-dark/20 py-5 last:border-b"
                >
                  <div className="flex items-start gap-4">
                    <FileText
                      aria-hidden="true"
                      className="w-5 h-5 text-brand-gold mt-0.5 flex-shrink-0"
                      strokeWidth={1.75}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                        <h3 className="font-poppins font-semibold text-brand-dark">
                          {doc.title}
                        </h3>
                        {doc.category && (
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            {doc.category}
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 leading-relaxed mb-1.5">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Publicado el{' '}
                        {new Date(doc.created_at).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-0.5 text-sm font-semibold text-brand-primary hover:text-brand-action transition-colors flex-shrink-0"
                    >
                      Ver documento
                      <ArrowRight aria-hidden="true" className="w-4 h-4" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </section>
    </div>
  );
};

export default LegalDocuments;
