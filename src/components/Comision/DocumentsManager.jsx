import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileStack, Plus, Loader2, MoreVertical, Pencil, Trash2,
  AlertTriangle, FileText, Clock, Globe2, LockKeyhole,
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
import { getDocuments, createDocument, updateDocument, deleteDocument, getSignedUrl } from '@/api/documentsApi';
import { DOC_CATEGORIES, formatDateTime } from './documentConstants';
import DocumentDetail from './DocumentDetail';
import FilterChips from '@/components/Comision/FilterChips';
import { logger } from '@/lib/logger';

const NONE = 'none';
const ALL = 'all';
const NO_CATEGORY = '__none__';
const INTERNAL = 'internal';
const PUBLIC = 'public';
const emptyDoc = () => ({ title: '', category: NONE, description: '', visibility: 'internal', public_url: '' });

const DocumentsManager = ({ readOnly = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyDoc());
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [accessFilter, setAccessFilter] = useState(ALL);
  const [sortBy, setSortBy] = useState('recent');

  const accessOptions = useMemo(() => {
    const internalCount = documents.filter((d) => d.visibility !== PUBLIC).length;
    const publicCount = documents.filter((d) => d.visibility === PUBLIC).length;
    return [
      { value: ALL, label: 'Todos', count: documents.length },
      { value: INTERNAL, label: 'Internos', count: internalCount },
      { value: PUBLIC, label: 'Públicos', count: publicCount },
    ];
  }, [documents]);

  const accessDocuments = useMemo(() => {
    if (accessFilter === ALL) return documents;
    return documents.filter((d) => (d.visibility || INTERNAL) === accessFilter);
  }, [documents, accessFilter]);

  // Opciones de chips: "Todas" + categorías realmente presentes (en orden de DOC_CATEGORIES) + "Sin categoría".
  const categoryOptions = useMemo(() => {
    const counts = new Map();
    let noneCount = 0;
    accessDocuments.forEach((d) => {
      if (d.category) counts.set(d.category, (counts.get(d.category) || 0) + 1);
      else noneCount += 1;
    });
    const ordered = DOC_CATEGORIES.filter((c) => counts.has(c)).map((c) => ({ value: c, label: c, count: counts.get(c) }));
    // Categorías presentes que no estén en DOC_CATEGORIES (defensivo), al final.
    counts.forEach((count, c) => {
      if (!DOC_CATEGORIES.includes(c)) ordered.push({ value: c, label: c, count });
    });
    const options = [{ value: ALL, label: 'Todas', count: accessDocuments.length }, ...ordered];
    if (noneCount > 0) options.push({ value: NO_CATEGORY, label: 'Sin categoría', count: noneCount });
    return options;
  }, [accessDocuments]);

  // Los chips acotan la exploración manual. Una búsqueda, en cambio, siempre
  // recorre la biblioteca completa para no ocultar coincidencias por un filtro previo.
  const categoryDocuments = useMemo(() => {
    if (categoryFilter === ALL) return accessDocuments;
    if (categoryFilter === NO_CATEGORY) return accessDocuments.filter((d) => !d.category);
    return accessDocuments.filter((d) => d.category === categoryFilter);
  }, [accessDocuments, categoryFilter]);

  const { query, setQuery, filtered: searchResults } = useSearch(documents, ['title', 'category', 'description']);
  const filtered = query.trim() ? searchResults : categoryDocuments;

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
      logger.error('Error fetching documents:', err);
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

  // Para perfiles de consulta, el camino principal es abrir la última versión
  // del archivo. Evita una pantalla intermedia sin conceder capacidades de edición.
  const openLatestVersion = async (document) => {
    if (openingId) return;
    // Los documentos publicados tienen un enlace aprobado por Transparencia.
    // Ese enlace es la fuente de consulta para cualquier perfil, incluido el
    // documental: una copia privada nunca lo reemplaza.
    const officialPublicUrl = document.visibility === PUBLIC ? document.public_url : null;
    const latest = [...(document.document_versions || [])]
      .filter((version) => version.file_path)
      .sort((a, b) => b.version_number - a.version_number)[0];

    if (!latest && !officialPublicUrl) {
      toast({ title: 'Archivo no disponible', description: 'Este documento todavía no tiene una versión para consultar.', variant: 'destructive' });
      return;
    }

    // Abrimos la pestaña durante el gesto del usuario para que Safari y los
    // bloqueadores de ventanas no impidan la vista previa cuando llegue la URL firmada.
    const tab = window.open('', '_blank');
    setOpeningId(document.id);
    try {
      if (officialPublicUrl) {
        if (tab) tab.location.href = officialPublicUrl;
        else window.location.assign(officialPublicUrl);
      } else if (latest) {
        const { data, error: signedUrlError } = await getSignedUrl(latest.file_path);
        if (signedUrlError || !data?.signedUrl) throw signedUrlError || new Error('No se pudo abrir el archivo.');
        if (tab) tab.location.href = data.signedUrl;
        else window.location.assign(data.signedUrl);
      }
    } catch (openError) {
      tab?.close();
      toast({ title: 'No se pudo abrir el archivo', description: openError.message || 'Intentá nuevamente.', variant: 'destructive' });
    } finally {
      setOpeningId(null);
    }
  };

  const openDocument = (document) => {
    if (readOnly) openLatestVersion(document);
    else setSelectedId(document.id);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      title: d.title || '',
      category: d.category || NONE,
      description: d.description || '',
      visibility: d.visibility || 'internal',
      public_url: d.public_url || '',
    });
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
        visibility: form.visibility,
        public_url: form.visibility === 'public' ? form.public_url.trim() || null : null,
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
          readOnly={readOnly}
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
        description={readOnly ? 'Biblioteca institucional de la Fundación, disponible únicamente para consulta. Los documentos publicados y los internos se identifican con claridad.' : 'Un único catálogo para estatutos, balances, convenios y demás, con historial de versiones.'}
        actions={!readOnly ? (
          <Button onClick={openCreate} variant="action" className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Nuevo documento
          </Button>
        ) : null}
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
          description={readOnly
            ? 'El archivo interno todavía no tiene documentos disponibles.'
            : 'Creá un documento (ej. Estatuto) y subí su primera versión.'}
          action={!readOnly ? (
            <Button onClick={openCreate} className="bg-brand-primary hover:bg-brand-dark text-white">
              <Plus className="w-4 h-4 mr-2" /> Nuevo documento
            </Button>
          ) : null}
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

          <div className="-mt-2 mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Acceso</p>
            <FilterChips options={accessOptions} value={accessFilter} onChange={setAccessFilter} />
          </div>

          {categoryOptions.length > 1 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Categoría</p>
              <FilterChips options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />
            </div>
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
            <>
              {/* En escritorio el archivo se lee como un registro: cada columna
                  responde una pregunta concreta. Las tarjetas se mantienen en
                  móvil, donde una tabla perdería legibilidad. */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <thead className="bg-brand-sand/60 border-b border-gray-100">
                      <tr className="text-xs uppercase tracking-wider text-gray-500">
                        <th scope="col" className="px-5 py-4 font-semibold">Documento</th>
                        <th scope="col" className="px-4 py-4 font-semibold">Categoría</th>
                        <th scope="col" className="px-4 py-4 font-semibold">Acceso</th>
                        <th scope="col" className="px-4 py-4 font-semibold">Versión</th>
                        <th scope="col" className="px-4 py-4 font-semibold">Actualizado</th>
                        {!readOnly && <th scope="col" className="w-14 px-4 py-4"><span className="sr-only">Acciones</span></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedDocuments.map((d, i) => {
                        const versionCount = (d.document_versions || []).length;
                        return (
                          <motion.tr
                            key={d.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.02 }}
                            className="group hover:bg-brand-sand/35 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <button type="button" onClick={() => openDocument(d)} aria-label={readOnly ? `Abrir última versión de ${d.title}` : `Ver detalle de ${d.title}`} className="flex max-w-md items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg disabled:opacity-60" disabled={openingId === d.id}>
                                <span className="mt-0.5 rounded-lg bg-brand-primary/10 p-2 text-brand-primary shrink-0"><FileText className="w-4 h-4" /></span>
                                <span>
                                  <span className="flex items-center gap-2 font-poppins font-bold text-brand-dark group-hover:text-brand-primary transition-colors">{d.title}{openingId === d.id && <Loader2 className="h-4 w-4 animate-spin" />}</span>
                                  {d.description && <span className="mt-1 block text-sm leading-5 text-gray-500 line-clamp-2">{d.description}</span>}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-4 align-top">
                              {d.category ? <Badge variant="outline" className="whitespace-nowrap border-brand-primary/20 text-brand-primary bg-brand-primary/5">{d.category}</Badge> : <span className="text-sm text-gray-400">Sin categoría</span>}
                            </td>
                            <td className="px-4 py-4 align-top">
                              {d.visibility === 'public' ? (
                                <Badge variant="outline" className="whitespace-nowrap border-emerald-200 bg-emerald-50 text-emerald-700"><Globe2 className="mr-1 h-3 w-3" /> Público</Badge>
                              ) : (
                                <Badge variant="outline" className="whitespace-nowrap border-amber-200 bg-amber-50 text-amber-800"><LockKeyhole className="mr-1 h-3 w-3" /> Interno</Badge>
                              )}
                            </td>
                            <td className="px-4 py-4 align-top">
                              <Badge className="whitespace-nowrap bg-brand-dark text-white hover:bg-brand-dark">{versionCount === 0 ? 'Sin archivos' : `v${d.current_version}`}</Badge>
                              {versionCount > 1 && <span className="ml-2 text-xs text-gray-400">{versionCount} versiones</span>}
                            </td>
                            <td className="px-4 py-4 align-top text-sm text-gray-500 whitespace-nowrap">{formatDateTime(d.updated_at)}</td>
                            {!readOnly && (
                              <td className="px-4 py-4 align-top">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button type="button" aria-label={`Acciones para ${d.title}`} className="rounded-md p-1 text-gray-400 hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"><MoreVertical className="w-4 h-4" /></button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => openEdit(d)}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setToDelete(d)} className="text-red-600 focus:text-red-700 focus:bg-red-50"><Trash2 className="w-4 h-4 mr-2" /> Eliminar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            )}
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            <div className="grid grid-cols-1 gap-4 md:hidden">
              {sortedDocuments.map((d, i) => {
                const versionCount = (d.document_versions || []).length;
                return (
                  <motion.article
                    key={d.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    className="relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-gray-100"
                  >
                    <button
                      type="button"
                      onClick={() => openDocument(d)}
                      aria-label={readOnly ? `Abrir última versión de ${d.title}` : `Ver detalle de ${d.title}`}
                      disabled={openingId === d.id}
                      className="w-full rounded-2xl p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <div className={`flex items-center gap-2.5 min-w-0 ${readOnly ? '' : 'pr-8'}`}>
                        <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="flex items-center gap-2 font-poppins font-bold text-brand-dark leading-tight truncate">{d.title}{openingId === d.id && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}</h3>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {d.category && <Badge variant="outline" className="border-brand-primary/20 text-brand-primary bg-brand-primary/5">{d.category}</Badge>}
                        {d.visibility === 'public' ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            <Globe2 className="mr-1 h-3 w-3" /> Público
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                            <LockKeyhole className="mr-1 h-3 w-3" /> Interno
                          </Badge>
                        )}
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
                    </button>

                    {!readOnly && (
                      <div className="absolute right-4 top-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label={`Acciones para ${d.title}`} className="text-gray-300 hover:text-brand-primary shrink-0 p-1">
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
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </div>
            </>
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
            <div className="space-y-1.5">
              <Label>Visibilidad</Label>
              <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Interno — solo perfiles autorizados</SelectItem>
                  <SelectItem value="public">Público — aparece en Transparencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.visibility === 'public' && (
              <div className="space-y-1.5">
                <Label htmlFor="d-public-url">Enlace de la versión pública</Label>
                <Input id="d-public-url" type="url" value={form.public_url}
                  onChange={(e) => setForm({ ...form, public_url: e.target.value })}
                  placeholder="https://…" />
                <p className="text-xs text-gray-500">Este enlace es el que verá cualquier persona desde Transparencia.</p>
              </div>
            )}
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
