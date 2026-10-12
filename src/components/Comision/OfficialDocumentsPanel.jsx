import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileCheck2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';

const OfficialDocumentsPanel = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: queryError } = await supabase
      .from('legal_documents')
      .select('id, title, category, description, url, created_at')
      .order('category', { ascending: true })
      .order('title', { ascending: true });

    if (queryError) {
      logger.error('Error fetching official documents:', queryError);
      setError(true);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="documentos-oficiales-titulo">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          <FileCheck2 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="documentos-oficiales-titulo" className="font-poppins text-xl font-bold text-brand-dark">Documentación oficial</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">Estatuto, balances y constancias institucionales publicadas por la Fundación.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center text-brand-primary" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Cargando documentación oficial</span>
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <p>No se pudo cargar la documentación oficial.</p>
          <Button variant="ghost" size="sm" onClick={loadDocuments} className="mt-2 text-red-700">
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500">
          Todavía no hay documentación oficial publicada.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-gray-100 border-y border-gray-100">
          {documents.map((document) => (
            <li key={document.id} className="flex items-start gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-brand-dark">{document.title}</h3>
                  {document.category && <Badge variant="outline" className="text-xs">{document.category}</Badge>}
                </div>
                {document.description && <p className="mt-1 text-sm leading-relaxed text-gray-500">{document.description}</p>}
              </div>
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5"
              >
                Ver <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default OfficialDocumentsPanel;
