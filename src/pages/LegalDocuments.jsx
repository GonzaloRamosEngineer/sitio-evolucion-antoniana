// src/pages/LegalDocuments.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Eyebrow } from '@/components/ui/eyebrow';
import {
  Loader2, FileText, AlertTriangle, ArrowRight, ShieldCheck, Landmark,
  Scale, ExternalLink, Mail, CircleCheck, CalendarDays, FileSearch,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { RUTAS } from '@/config/rutas';
import { canonicalUrl } from '@/lib/seo';
import { entidad, mailtoContacto, tituloPagina } from '@/config/entidad';

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
        .from('documents')
        .select('id, title, category, description, public_url, published_at, created_at')
        .eq('visibility', 'public')
        .order('published_at', { ascending: false });

      if (dbError) throw dbError;
      setDocuments(data || []);
    } catch (err) {
      logger.error('Error fetching legal documents:', err);
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

  const formatDate = (date) => new Date(date).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const balanceCount = documents.filter((doc) => doc.category === 'Balance').length;
  const latestPublication = documents
    .map((doc) => doc.published_at || doc.created_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0];

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
        <title>{tituloPagina('Documentación oficial')}</title>
        <meta name="description" content={`Accedé a los estatutos, balances y reportes de gestión de ${entidad.nombre}.`} />
        <link rel="canonical" href={canonicalUrl(RUTAS.transparencia.documentacion)} />
      </Helmet>

      <section className="relative overflow-hidden border-t-2 border-brand-gold bg-brand-primary text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-glow opacity-80" />
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-72 w-72 rounded-full border border-white/10" />
        <motion.div
          {...rise}
          className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end lg:gap-16 lg:px-8 lg:py-20"
        >
          <div>
            <div className="mb-5"><Eyebrow light>Transparencia institucional</Eyebrow></div>
            <h1 className="max-w-3xl font-poppins text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Información clara.<br />Gestión abierta.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              Publicamos los documentos que acreditan nuestra identidad jurídica,
              nuestra situación contable y el compromiso con una gestión responsable.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3 text-brand-gold">
              <ShieldCheck className="h-6 w-6" />
              <span className="text-sm font-bold uppercase tracking-[0.16em]">Repositorio público</span>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-4 border-y border-white/15 py-5">
              <div>
                <p className="font-poppins text-3xl font-bold text-white">{documents.length}</p>
                <p className="mt-1 text-sm text-white/65">documentos disponibles</p>
              </div>
              <div>
                <p className="font-poppins text-3xl font-bold text-white">{balanceCount}</p>
                <p className="mt-1 text-sm text-white/65">balances publicados</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/75">
              Documentación oficial de {entidad.nombre}, con acceso abierto y verificable.
            </p>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <motion.div
          {...rise}
          transition={{ ...rise.transition, delay: 0.1 }}
          className="grid gap-10 xl:grid-cols-12 xl:gap-14"
        >
          <div className="xl:col-span-8">
            <div className="flex flex-col gap-5 border-b border-brand-dark/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>Biblioteca pública</Eyebrow>
                <h2 className="mt-4 font-poppins text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">Documentación oficial</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-gray-600">Accedé a los documentos institucionales vigentes. Cada enlace abre la versión publicada oficialmente.</p>
              </div>
              {latestPublication && (
                <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-500 shadow-sm ring-1 ring-brand-dark/5">
                  <CalendarDays className="h-4 w-4 text-brand-gold" />
                  Actualizado: {formatDate(latestPublication)}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {error && (
                <div className="sm:col-span-2 flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                  <AlertTriangle aria-hidden="true" className="h-6 w-6 shrink-0 text-red-500" />
                  <div><p className="font-semibold">Error al cargar documentos</p><p className="mt-1 text-sm opacity-90">{error}</p></div>
                </div>
              )}

              {documents.length === 0 && !loading && !error && (
                <div className="sm:col-span-2 rounded-2xl border border-dashed border-brand-dark/20 bg-white p-10">
                  <p className="font-poppins font-semibold text-brand-dark">No hay documentos públicos disponibles.</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">Estamos actualizando este repositorio. Volvé a consultar pronto.</p>
                </div>
              )}

              {documents.map((doc, index) => (
                <motion.article key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="group flex h-full flex-col rounded-2xl border border-brand-dark/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-xl bg-brand-primary/10 p-2.5 text-brand-primary"><FileText className="h-5 w-5" /></span>
                    {doc.category && <span className="rounded-full bg-brand-sand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-primary">{doc.category}</span>}
                  </div>
                  <h3 className="mt-5 font-poppins text-xl font-bold leading-tight text-brand-dark">{doc.title}</h3>
                  {doc.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600">{doc.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-brand-dark/10 pt-4 text-xs text-gray-500">
                    <span>Publicado {formatDate(doc.published_at || doc.created_at)}</span>
                    <a href={doc.public_url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 font-bold text-brand-primary transition-colors hover:text-brand-action">
                      Abrir <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          <aside className="space-y-5 xl:col-span-4 xl:pt-2">
            <div className="rounded-3xl bg-brand-dark p-7 text-white shadow-xl">
              <Landmark className="h-7 w-7 text-brand-gold" />
              <h2 className="mt-5 font-poppins text-2xl font-bold">Transparencia que se puede consultar</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">Esta biblioteca reúne los instrumentos que respaldan nuestra constitución, gobierno y situación contable.</p>
              <ul className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm text-white/85">
                <li className="flex gap-3"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />Documentos institucionales oficiales</li>
                <li className="flex gap-3"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />Balances de los últimos ejercicios</li>
                <li className="flex gap-3"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />Enlaces verificables y de acceso abierto</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-brand-dark/10 bg-white p-7 shadow-sm">
              <FileSearch className="h-6 w-6 text-brand-gold" />
              <h2 className="mt-4 font-poppins text-xl font-bold text-brand-dark">¿Necesitás más información?</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">Para solicitar documentación ampliada o información específica, escribinos formalmente.</p>
              <a href={mailtoContacto} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-action hover:underline"><Mail className="h-4 w-4" />{entidad.contacto.email}</a>
            </div>

            <div className="rounded-3xl border border-brand-gold/25 bg-brand-gold/10 p-7">
              <Scale className="h-6 w-6 text-brand-primary" />
              <h2 className="mt-4 font-poppins text-xl font-bold text-brand-dark">Rendición de cuentas</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">Consultá los aportes recibidos, gastos registrados y sus comprobantes.</p>
              <Link to={RUTAS.transparencia.rendicion} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-primary hover:underline">Ver la rendición <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </aside>
        </motion.div>
      </section>
    </div>
  );
};

export default LegalDocuments;
