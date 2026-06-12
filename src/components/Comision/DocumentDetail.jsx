import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Upload, Loader2, Download, FileText, History, FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { uploadVersion, getDownloadUrl } from '@/api/documentsApi';
import { formatBytes, formatDateTime } from './documentConstants';

const DocumentDetail = ({ document: doc, onBack, onChanged }) => {
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

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
    if (downloadingId) return;
    setDownloadingId(version.id);
    try {
      const { data, error } = await getDownloadUrl(version.file_path);
      if (error || !data?.signedUrl) {
        toast({ title: 'Error', description: 'No se pudo generar el enlace de descarga.', variant: 'destructive' });
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener');
    } finally {
      setDownloadingId(null);
    }
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(v)}
                disabled={downloadingId === v.id}
                className="text-brand-primary hover:text-brand-primary hover:bg-brand-primary/5 gap-1.5 shrink-0"
              >
                {downloadingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline">Descargar</span>
              </Button>
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
    </div>
  );
};

export default DocumentDetail;
