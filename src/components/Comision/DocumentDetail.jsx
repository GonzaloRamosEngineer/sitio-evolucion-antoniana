import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Upload, Loader2, Download, FileText, History, FileUp, Eye,
  ExternalLink, FileQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { uploadVersion, getSignedUrl, fileKind } from '@/api/documentsApi';
import { formatBytes, formatDateTime } from './documentConstants';

const DocumentDetail = ({ document: doc, onBack, onChanged }) => {
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null); // { url, kind, name }
  const [previewLoading, setPreviewLoading] = useState(false);

  const versions = [...(doc.document_versions || [])].sort((a, b) => b.version_number - a.version_number);

  const resetForm = () => { setFile(null); setNotes(''); };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (uploading || !file) return;
    setUploading(true);
    try {
      const { error } = await uploadVersion({ documentId: doc.id, file, notes });
      if (error) {
        toast({ title: 'Error al subir', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Versión subida', description: `${doc.title} actualizado.` });
      setUploadOpen(false);
      resetForm();
      onChanged?.();
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (version) => {
    if (busyId) return;
    setBusyId(version.id);
    try {
      const { data, error } = await getSignedUrl(version.file_path, { download: version.file_name });
      if (error || !data?.signedUrl) {
        toast({ title: 'Error', description: 'No se pudo generar el enlace de descarga.', variant: 'destructive' });
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener');
    } finally {
      setBusyId(null);
    }
  };

  const handlePreview = async (version) => {
    if (busyId) return;
    setBusyId(version.id);
    setPreviewLoading(true);
    try {
      const { data, error } = await getSignedUrl(version.file_path);
      if (error || !data?.signedUrl) {
        toast({ title: 'Error', description: 'No se pudo abrir la vista previa.', variant: 'destructive' });
        return;
      }
      setPreview({
        url: data.signedUrl,
        kind: fileKind(version.mime_type, version.file_name),
        name: version.file_name,
      });
    } finally {
      setBusyId(null);
      setPreviewLoading(false);
    }
  };

  const openInNewTab = () => {
    if (preview?.url) window.open(preview.url, '_blank', 'noopener');
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-primary transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a documentos
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-poppins font-bold text-brand-dark">{doc.title}</h2>
              {doc.category && <Badge variant="outline" className="border-brand-primary/20 text-brand-primary bg-brand-primary/5">{doc.category}</Badge>}
              <Badge className="bg-brand-dark text-white hover:bg-brand-dark">v{doc.current_version}</Badge>
            </div>
            {doc.description && <p className="text-sm text-gray-500 mt-1">{doc.description}</p>}
          </div>
          <Button onClick={() => setUploadOpen(true)} className="bg-brand-action hover:bg-red-800 text-white font-bold rounded-xl shrink-0">
            <Upload className="w-4 h-4 mr-2" /> Subir nueva versión
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-bold text-brand-dark mb-3">
        <History className="w-4 h-4 text-brand-gold" /> Historial de versiones
      </div>

      {versions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <FileUp className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-brand-dark">Todavía no hay archivos</p>
          <p className="text-sm text-gray-500 mt-1">Subí la primera versión de este documento.</p>
          <Button onClick={() => setUploadOpen(true)} variant="outline" className="mt-4 gap-2 text-brand-primary border-brand-primary/30">
            <Upload className="w-4 h-4" /> Subir versión
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {versions.map((v, idx) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-4 p-4 hover:bg-brand-sand/30 transition-colors"
            >
              <div className="shrink-0 flex flex-col items-center justify-center w-12">
                <Badge className={`${idx === 0 ? 'bg-brand-primary' : 'bg-gray-300'} text-white hover:bg-brand-primary`}>v{v.version_number}</Badge>
                {idx === 0 && <span className="text-[9px] text-brand-primary font-bold mt-1 uppercase">Actual</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-brand-dark truncate flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {v.file_name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateTime(v.created_at)}{v.size_bytes ? ` · ${formatBytes(v.size_bytes)}` : ''}
                </p>
                {v.notes && <p className="text-xs text-gray-500 mt-1 italic">“{v.notes}”</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(v)}
                  disabled={busyId === v.id}
                  className="text-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 gap-1.5"
                >
                  {busyId === v.id && previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  <span className="hidden sm:inline">Ver</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(v)}
                  disabled={busyId === v.id}
                  className="text-gray-500 hover:text-brand-primary hover:bg-brand-primary/5"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialog subir versión */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!uploading) { setUploadOpen(o); if (!o) resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins text-brand-dark flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-gold" /> Subir nueva versión
            </DialogTitle>
            <DialogDescription>
              {doc.title} — quedará como v{(doc.current_version || 0) + 1}. Las versiones anteriores se conservan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="d-file">Archivo</Label>
              <input
                id="d-file"
                type="file"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer border border-gray-200 rounded-xl p-1.5"
              />
              <p className="text-xs text-gray-400">PDF, Word, imágenes... hasta 50 MB.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-notes">Nota de la versión (qué cambió)</Label>
              <Textarea id="d-notes" value={notes} rows={2}
                onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Estatuto con la reforma del art. 5 aprobada." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={uploading} onClick={() => setUploadOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={uploading || !file} className="bg-brand-primary hover:bg-brand-dark text-white">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</> : 'Subir versión'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de vista previa */}
      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="font-poppins text-brand-dark flex items-center gap-2 text-base pr-8 truncate">
              <FileText className="w-4 h-4 text-brand-gold shrink-0" />
              <span className="truncate">{preview?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {preview?.kind === 'pdf' && (
            <iframe title={preview.name} src={preview.url} className="w-full h-[75vh] border-t border-gray-100" />
          )}

          {preview?.kind === 'image' && (
            <div className="bg-gray-50 border-t border-gray-100 max-h-[75vh] overflow-auto flex items-center justify-center p-4">
              <img src={preview.url} alt={preview.name} className="max-w-full h-auto rounded-lg" />
            </div>
          )}

          {preview?.kind === 'other' && (
            <div className="border-t border-gray-100 px-6 py-12 text-center">
              <div className="p-4 rounded-2xl bg-brand-sand text-gray-300 w-fit mx-auto mb-4">
                <FileQuestion className="w-8 h-8" />
              </div>
              <p className="font-semibold text-brand-dark">No se puede previsualizar este tipo de archivo</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Los documentos de Word, Excel y similares no se ven dentro del navegador. Abrilo en una pestaña nueva o descargalo.
              </p>
              <div className="flex items-center justify-center gap-2 mt-5">
                <Button variant="outline" onClick={openInNewTab} className="gap-2">
                  <ExternalLink className="w-4 h-4" /> Abrir en pestaña
                </Button>
                <a href={preview.url} download={preview.name}>
                  <Button className="gap-2 bg-brand-primary hover:bg-brand-dark text-white">
                    <Download className="w-4 h-4" /> Descargar
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentDetail;
