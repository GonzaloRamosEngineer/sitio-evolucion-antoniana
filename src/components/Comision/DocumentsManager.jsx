import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileStack, Plus, Loader2, MoreVertical, Pencil, Trash2,
  AlertTriangle, FileText, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import SectionHeader from '@/components/Admin/shared/SectionHeader';
import SearchBar from '@/components/Admin/shared/SearchBar';
import ListSkeleton from '@/components/Admin/shared/ListSkeleton';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { useSearch } from '@/components/Admin/shared/useSearch';
import { getDocuments, createDocument, updateDocument, deleteDocument } from '@/api/documentsApi';
import { DOC_CATEGORIES, formatDateTime } from './documentConstants';
import DocumentDetail from './DocumentDetail';
import FilterChips from '@/components/Comision/FilterChips';

const NONE = 'none';
const ALL = 'all';
const NO_CATEGORY = '__none__';
const emptyDoc = () => ({ title: '', category: NONE, description: '' });

const DocumentsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyDoc());
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [sortBy, setSortBy] = useState('recent');

  // Opciones de chips: "Todas" + categorías realmente presentes (en orden de DOC_CATEGORIES) + "Sin categoría".
  const categoryOptions = useMemo(() => {
    const counts = new Map();
    let noneCount = 0;
    documents.forEach((d) => {
      if (d.category) counts.set(d.category, (counts.get(d.category) || 0) + 1);
      else noneCount += 1;
    });
    const ordered = DOC_CATEGORIES.filter((c) => counts.has(c)).map((c) => ({ value: c, label: c, count: counts.get(c) }));
    // Categorías presentes que no estén en DOC_CATEGORIES (defensivo), al final.
    counts.forEach((count, c) => {
      if (!DOC_CATEGORIES.includes(c)) ordered.push({ value: c, label: c, count });
    });
    const options = [{ value: ALL, label: 'Todas', count: documents.length }, ...ordered];
    if (noneCount > 0) options.push({ value: NO_CATEGORY, label: 'Sin categoría', count: noneCount });
    return options;
  }, [documents]);

  // Pipeline: documents → filtro por categoría → búsqueda (useSearch) → orden.
  const categoryDocuments = useMemo(() => {
    if (categoryFilter === ALL) return documents;
    if (categoryFilter === NO_CATEGORY) return documents.filter((d) => !d.category);
    return documents.filter((d) => d.category === categoryFilter);
  }, [documents, categoryFilter]);

  const { query, setQuery, filtered } = useSearch(categoryDocuments, ['title', 'category', 'description']);

  const sortedDocuments = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es', { sensitivity: 'base' }));
    } else {
      list.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    }
    return list;
  }, [filtered, sortBy]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await getDocuments();
    if (err) {
      console.error('Error fetching documents:', err);
      setError(true);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Si la categoría seleccionada ya no existe entre las opciones (ej. tras borrar), volvé a "Todas".
  useEffect(() => {
    if (categoryFilter !== ALL && !categoryOptions.some((o) => o.value === categoryFilter)) {
      setCategoryFilter(ALL);
    }
  }, [categoryOptions, categoryFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyDoc()); setFormOpen(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ title: d.title || '', category: d.category || NONE, description: d.description || '' });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category === NONE ? null : form.category,
        description: form.description.trim() || null,
      };
      const { error: err } = editing
        ? await updateDocument(editing.id, payload)
        : await createDocument({ ...payload, created_by: user?.id });
      if (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        return;
      }
      toast({ title: editing ? 'Documento actualizado' : 'Documento creado' });
      setFormOpen(false);
      await fetchDocuments();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      const { error: err } = await deleteDocument(toDelete);
      if (err) {
        toast({ title: 'Error', description: 'No se pudo eliminar el documento.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Documento eliminado' });
      setToDelete(null);
      await fetchDocuments();
    } finally {
      setDeleting(false);
    }
  };

  const selected = documents.find((d) => d.id === selectedId);
  if (selected) {
    return (
      <div className="p-4 sm:p-6">
        <DocumentDetail
          document={selected}
          onBack={() => { setSelectedId(null); fetchDocuments(); }}
          onChanged={fetchDocuments}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <SectionHeader
        icon={FileStack}
        title="Documentación"
        description="Estatuto, balances, convenios y demás, con historial de versiones."
        actions={
          <Button onClick={openCreate} className="bg-brand-action hover:bg-red-800 text-white font-bold rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Nuevo documento
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar los documentos"
          description="Revisá tu conexión e intentá de nuevo."
          action={<Button variant="outline" onClick={fetchDocuments}>Reintentar</Button>}
        />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="Todavía no hay documentos"
          description="Creá un documento (ej. Estatuto) y subí su primera versión."
          action={
            <Button onClick={openCreate} className="bg-brand-primary hover:bg-brand-dark text-white">
              <Plus className="w-4 h-4 mr-2" /> Nuevo documento
            </Button>
          }
        />
      ) : (
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar documento..."
            count={sortedDocuments.length}
            countLabel="documentos"
          >
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-40 rounded-xl border-gray-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recientes</SelectItem>
                <SelectItem value="title">Nombre (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </SearchBar>

          {categoryOptions.length > 1 && (
            <FilterChips
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              className="-mt-2 mb-5"
            />
          )}

          {sortedDocuments.length === 0 ? (
            <Card className="border-none shadow-sm bg-white rounded-2xl">
              <CardContent className="p-0">
                <EmptyState
                  icon={FileStack}
                  title="Sin coincidencias"
                  description={query.trim() ? 'Probá con otro término de búsqueda.' : 'No hay documentos en esta categoría.'}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedDocuments.map((d, i) => {
                const versionCount = (d.document_versions || []).length;
                return (
                  <motion.button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className="text-left bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-gray-100 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="font-poppins font-bold text-brand-dark leading-tight truncate">{d.title}</h3>
                      </div>
                      <span onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-300 hover:text-brand-primary shrink-0 p-1 -mr-1 -mt-0.5">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEdit(d)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setToDelete(d)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {d.category && <Badge variant="outline" className="border-brand-primary/20 text-brand-primary bg-brand-primary/5">{d.category}</Badge>}
                      <Badge className="bg-brand-dark text-white hover:bg-brand-dark">
                        {versionCount === 0 ? 'Sin archivos' : `v${d.current_version}`}
                      </Badge>
                    </div>

                    {d.description && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{d.description}</p>}

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
                      <Clock className="w-3.5 h-3.5" />
                      {versionCount > 0 ? `${versionCount} ${versionCount === 1 ? 'versión' : 'versiones'} · ` : ''}
                      {formatDateTime(d.updated_at)}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Dialog crear/editar documento */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!saving) setFormOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins text-brand-dark flex items-center gap-2">
              <FileStack className="w-5 h-5 text-brand-gold" /> {editing ? 'Editar documento' : 'Nuevo documento'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Cambiá los datos del documento.' : 'Creá el documento; después subís su primera versión.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="d-title">Título</Label>
              <Input id="d-title" value={form.title} required
                onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Estatuto Fundación" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-description">Descripción</Label>
              <Textarea id="d-description" value={form.description} rows={3}
                onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="De qué se trata, contexto..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-brand-primary hover:bg-brand-dark text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : (editing ? 'Guardar' : 'Crear documento')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación borrar documento */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!deleting && !o) setToDelete(null); }}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-poppins font-bold text-brand-dark">¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar “{toDelete?.title}” y <strong>todas sus versiones y archivos</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsManager;
