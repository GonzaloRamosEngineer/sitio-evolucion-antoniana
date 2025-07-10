import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Edit, Trash2, ExternalLink, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const LegalDocumentForm = ({ isOpen, onClose, onSave, documentData, isLoading }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const { toast } = useToast();

  const CATEGORIES = ["Estatuto", "Balance", "Política", "Términos de Uso", "Informe", "Otro"];

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
      <DialogContent className="sm:max-w-lg bg-blanco-fundacion dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins text-primary-antoniano dark:text-primary">
            {documentData ? 'Editar Documento Legal' : 'Nuevo Documento Legal'}
          </DialogTitle>
          <DialogDescription className="text-marron-legado/90 dark:text-gray-400">
            {documentData ? 'Modifica los detalles del documento.' : 'Completa los campos para agregar un nuevo documento.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="doc-title" className="text-marron-legado dark:text-gray-300">Título</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} required className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
          </div>
          <div>
            <Label htmlFor="doc-description" className="text-marron-legado dark:text-gray-300">Descripción (Opcional)</Label>
            <Textarea id="doc-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px] border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
          </div>
          <div>
            <Label htmlFor="doc-url" className="text-marron-legado dark:text-gray-300">URL del Documento</Label>
            <Input id="doc-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ejemplo.com/documento.pdf" required className="border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600" />
          </div>
          <div>
            <Label htmlFor="doc-category" className="text-marron-legado dark:text-gray-300">Categoría</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="w-full border-marron-legado/30 focus:border-primary-antoniano dark:bg-gray-700 dark:text-white dark:border-gray-600">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-700 dark:text-white">
                {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-5">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading} className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="bg-primary-antoniano text-white hover:bg-primary-antoniano/90 dark:bg-primary dark:hover:bg-primary/90">
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
        title: `Documento ${editingDocument ? 'actualizado' : 'creado'}`,
        className: "bg-green-500 text-white dark:bg-green-600 dark:text-white"
      });
      fetchDocuments();
      setIsFormOpen(false);
      setEditingDocument(null);
    } catch (error) {
      console.error('Error saving document:', error);
      toast({ title: "Error al Guardar", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };
  
  const openEditForm = (doc) => {
    setEditingDocument(doc);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingDocument(null);
    setIsFormOpen(true);
  };
  
  const confirmDelete = (doc) => {
    setDocumentToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('legal_documents')
        .delete()
        .eq('id', documentToDelete.id);
      if (error) throw error;
      toast({ title: "Documento eliminado", className: "bg-green-500 text-white dark:bg-green-600 dark:text-white" });
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({ title: "Error al Eliminar", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary-antoniano" />
        <p className="ml-2 text-marron-legado dark:text-muted-foreground">Cargando documentos legales...</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-2xl font-poppins text-primary-antoniano dark:text-primary">Gestión de Documentos Legales</CardTitle>
          <CardDescription className="text-marron-legado/90 dark:text-muted-foreground">Administra los documentos legales de la fundación.</CardDescription>
        </div>
        <Button onClick={openNewForm} variant="antoniano" className="text-white dark:text-primary-foreground">
          <PlusCircle className="w-5 h-5 mr-2" /> Nuevo Documento
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-marron-legado/30 dark:text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-marron-legado/70 dark:text-muted-foreground text-lg">No hay documentos legales cargados.</p>
            <Button onClick={openNewForm} variant="link" className="mt-2 text-primary-antoniano dark:text-primary">
              Crear el primer documento
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <motion.div 
                key={doc.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-celeste-complementario dark:border-accent rounded-lg shadow-sm hover:shadow-md transition-all duration-300 bg-celeste-complementario/10 dark:bg-accent/20"
              >
                <div className="flex-1 mb-3 sm:mb-0">
                  <h3 className="font-semibold text-lg text-primary-antoniano dark:text-primary">{doc.title}</h3>
                  <p className="text-xs text-marron-legado/80 dark:text-muted-foreground/80 max-w-xl truncate" title={doc.description}>{doc.description || "Sin descripción"}</p>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center mt-1">
                    <ExternalLink className="w-3 h-3 mr-1" /> {doc.url}
                  </a>
                  <p className="text-xs text-marron-legado/60 dark:text-muted-foreground/70 mt-1">
                    Publicado: {new Date(doc.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Badge variant="outline" className="capitalize border-primary-antoniano/50 text-primary-antoniano dark:border-primary/50 dark:text-primary">{doc.category}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(doc)} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 h-auto">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => confirmDelete(doc)} className="text-destructive hover:text-destructive/80 dark:hover:text-destructive/90 p-1.5 h-auto">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      <LegalDocumentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveDocument}
        documentData={editingDocument}
        isLoading={formLoading}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md bg-blanco-fundacion dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-poppins text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-marron-legado/90 dark:text-gray-400 pt-2">
              ¿Estás seguro de que deseas eliminar el documento "<strong>{documentToDelete?.title}</strong>"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={formLoading} className="border-primary-antoniano text-primary-antoniano hover:bg-celeste-complementario dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument} disabled={formLoading} className="bg-destructive text-white hover:bg-destructive/90">
              {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Eliminar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LegalDocumentList;