import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, PlusCircle, Edit, Trash2, ExternalLink, 
  AlertTriangle, FileText, ShieldCheck, Calendar, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ["Estatuto", "Balance", "Política", "Términos de Uso", "Informe", "Otro"];

const LegalDocumentForm = ({ isOpen, onClose, onSave, documentData, isLoading }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (documentData) {
      setTitle(documentData.title || '');
      setDescription(documentData.description || '');
      setUrl(documentData.url || '');
      setCategory(documentData.category || '');
    } else {
      setTitle('');
      setDescription('');
      setUrl('');
      setCategory('');
    }
  }, [documentData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !url || !category) {
      toast({ title: "Campos requeridos", description: "Título, URL y Categoría son obligatorios.", variant: "destructive" });
      return;
    }
    if (!url.startsWith('https://')) {
      toast({ title: "URL inválida", description: "La URL debe comenzar con https://", variant: "destructive" });
      return;
    }
    onSave({ title, description, url, category });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl rounded-3xl border-none p-0 bg-white shadow-2xl overflow-hidden">
        <DialogHeader className="bg-brand-sand p-8 border-b border-gray-100">
          <DialogTitle className="text-2xl font-poppins font-bold text-brand-dark flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-primary" />
            {documentData ? 'Editar Documento' : 'Nuevo Documento Legal'}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Administra la transparencia institucional cargando archivos oficiales.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="doc-title" className="font-bold text-brand-dark">Título del Documento *</Label>
              <Input 
                id="doc-title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ej: Balance General Anual 2025"
                required 
                className="h-11 border-gray-200 focus:border-brand-primary rounded-xl" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doc-category" className="font-bold text-brand-dark">Categoría *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="h-11 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl border-gray-100">
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-url" className="font-bold text-brand-dark">URL del PDF/Drive *</Label>
              <Input 
                id="doc-url" 
                type="url" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://drive.google.com/..." 
                required 
                className="h-11 border-gray-200 focus:border-brand-primary rounded-xl" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-description" className="font-bold text-brand-dark">Descripción (Opcional)</Label>
            <Textarea 
              id="doc-description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Detalles adicionales sobre el documento..."
              className="min-h-[100px] border-gray-200 focus:border-brand-primary rounded-xl p-4" 
            />
          </div>

          <DialogFooter className="pt-6 gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="text-gray-400 font-bold">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-10 rounded-xl shadow-lg transition-all">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (documentData ? 'Guardar Cambios' : 'Crear Documento')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const LegalDocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: "Error", description: "No se pudieron cargar los documentos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSaveDocument = async (documentData) => {
    setFormLoading(true);
    try {
      let error;
      if (editingDocument) {
        const { error: updateError } = await supabase
          .from('legal_documents')
          .update(documentData)
          .eq('id', editingDocument.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('legal_documents')
          .insert([{ ...documentData, created_at: new Date().toISOString() }]);
        error = insertError;
      }

      if (error) throw error;
      toast({
        title: `¡Documento ${editingDocument ? 'actualizado' : 'creado'}!`,
        className: "bg-green-600 text-white border-none"
      });
      fetchDocuments();
      setIsFormOpen(false);
      setEditingDocument(null);
    } catch (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <p className="text-sm text-gray-500 font-medium italic">Sincronizando archivos legales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-brand-sand p-2 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-brand-dark font-poppins">Documentos Legales</h2>
            <p className="text-sm text-gray-500">Módulo de transparencia y legalidad institucional.</p>
          </div>
        </div>
        <Button onClick={() => { setEditingDocument(null); setIsFormOpen(true); }} className="bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl shadow-md transition-all">
          <PlusCircle className="mr-2 h-5 w-5" />
          Nuevo Documento
        </Button>
      </div>

      {/* BUSCADOR */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
            placeholder="Filtrar por nombre o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-gray-200 focus:border-brand-primary rounded-xl bg-white"
        />
      </div>

      {/* TABLA DE CONTENIDO */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-sand border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-brand-dark uppercase tracking-widest">Publicación</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-brand-dark uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    No se encontraron documentos legales.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, index) => (
                  <motion.tr 
                    key={doc.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-brand-sand/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <FileText size={20} />
                        </div>
                        <div className="max-w-md">
                          <p className="font-bold text-brand-dark group-hover:text-brand-primary transition-colors">{doc.title}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{doc.description || "Sin descripción adicional."}</p>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-1 font-mono uppercase tracking-tighter">
                            <ExternalLink className="w-2.5 h-2.5" /> Abrir Archivo Original
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-white border border-gray-200 text-gray-600 px-3 py-1 font-medium shadow-sm">
                        {doc.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <Calendar size={14} className="text-brand-gold" />
                            {new Date(doc.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-xl text-brand-primary hover:bg-brand-primary hover:text-white border border-gray-100 shadow-sm transition-all" 
                          onClick={() => { setEditingDocument(doc); setIsFormOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500 hover:text-white border border-gray-100 shadow-sm transition-all" 
                          onClick={() => { setDocumentToDelete(doc); setShowDeleteConfirm(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LegalDocumentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveDocument}
        documentData={editingDocument}
        isLoading={formLoading}
      />

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md rounded-3xl border-none bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-poppins font-bold text-brand-dark">Eliminar Documento</DialogTitle>
            <DialogDescription className="text-gray-500 text-base mt-2">
              ¿Estás seguro de que deseas eliminar <strong>"{documentToDelete?.title}"</strong>?<br/>Esta acción no se puede revertir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-8">
            <Button variant="destructive" onClick={async () => {
                 setFormLoading(true);
                 const { error } = await supabase.from('legal_documents').delete().eq('id', documentToDelete.id);
                 if (!error) {
                    toast({ title: "Documento eliminado", className: "bg-green-600 text-white border-none" });
                    fetchDocuments();
                    setShowDeleteConfirm(false);
                 }
                 setFormLoading(false);
            }} disabled={formLoading} className="h-12 rounded-xl font-bold text-lg shadow-lg">
              {formLoading ? <Loader2 className="animate-spin mr-2" /> : "Sí, Eliminar Archivo"}
            </Button>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={formLoading} className="text-gray-400 font-bold">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalDocumentList;