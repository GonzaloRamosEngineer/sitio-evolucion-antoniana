import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban, Plus, Loader2, MoreVertical, Pencil, Trash2,
  CalendarRange, AlertTriangle, AlertCircle, ListChecks, TrendingUp,
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
import FilterChips from './FilterChips';
import {
  getProjects, createProject, updateProject, deleteProject,
} from '@/api/projectsApi';
import {
  PROJECT_STATUS_OPTIONS, projectStatusMeta, formatDateShort, isOverdue,
} from './projectConstants';
import ProjectBoard from './ProjectBoard';

const emptyProject = () => ({ name: '', description: '', status: 'activo', start_date: '', end_date: '' });

const STATUS_ORDER = { activo: 0, en_pausa: 1, cerrado: 2 };

const projectStats = (project) => {
  const list = project.tasks || [];
  const total = list.length;
  const done = list.filter((t) => t.status === 'hecho').length;
  const inProgress = list.filter((t) => t.status === 'en_progreso').length;
  const pending = list.filter((t) => t.status === 'pendiente').length;
  const overdue = list.filter((t) => t.due_date && t.status !== 'hecho' && isOverdue(t.due_date)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, inProgress, pending, overdue, pct };
};

const StatCard = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    primary: 'bg-brand-primary/10 text-brand-primary',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${tones[tone]} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold font-poppins text-brand-dark leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
};

const ProjectsManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recomendado');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProject());
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { query, setQuery, filtered: searched } = useSearch(projects, ['name', 'description']);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await getProjects();
    if (err) {
      console.error('Error fetching projects:', err);
      setError(true);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Métricas globales del portafolio.
  const metrics = useMemo(() => {
    const all = projects.flatMap((p) => p.tasks || []);
    const done = all.filter((t) => t.status === 'hecho').length;
    return {
      activos: projects.filter((p) => p.status === 'activo').length,
      pendientes: all.filter((t) => t.status !== 'hecho').length,
      vencidas: all.filter((t) => t.due_date && t.status !== 'hecho' && isOverdue(t.due_date)).length,
      avance: all.length ? Math.round((done / all.length) * 100) : 0,
    };
  }, [projects]);

  const statusChips = useMemo(() => ([
    { value: 'all', label: 'Todos', count: projects.length },
    { value: 'activo', label: 'Activos', count: projects.filter((p) => p.status === 'activo').length },
    { value: 'en_pausa', label: 'En pausa', count: projects.filter((p) => p.status === 'en_pausa').length },
    { value: 'cerrado', label: 'Cerrados', count: projects.filter((p) => p.status === 'cerrado').length },
  ]), [projects]);

  const visible = useMemo(() => {
    let list = statusFilter === 'all' ? searched : searched.filter((p) => p.status === statusFilter);
    list = [...list];
    if (sortBy === 'nombre') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
    } else if (sortBy === 'avance') {
      list.sort((a, b) => projectStats(b).pct - projectStats(a).pct);
    } else {
      list.sort((a, b) => {
        const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        if (s !== 0) return s;
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      });
    }
    return list;
  }, [searched, statusFilter, sortBy]);

  const openCreate = () => { setEditing(null); setForm(emptyProject()); setFormOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      description: p.description || '',
      status: p.status || 'activo',
      start_date: p.start_date ? String(p.start_date).slice(0, 10) : '',
      end_date: p.end_date ? String(p.end_date).slice(0, 10) : '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      const { error: err } = editing
        ? await updateProject(editing.id, payload)
        : await createProject({ ...payload, created_by: user?.id });
      if (err) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
        return;
      }
      toast({ title: editing ? 'Proyecto actualizado' : 'Proyecto creado' });
      setFormOpen(false);
      await fetchProjects();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      const { error: err } = await deleteProject(toDelete.id);
      if (err) {
        toast({ title: 'Error', description: 'No se pudo eliminar el proyecto.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Proyecto eliminado' });
      setToDelete(null);
      await fetchProjects();
    } finally {
      setDeleting(false);
    }
  };

  // Vista de detalle (tablero de tareas)
  const selected = projects.find((p) => p.id === selectedId);
  if (selected) {
    return (
      <div className="p-4 sm:p-6">
        <ProjectBoard
          project={selected}
          currentUserId={user?.id}
          onBack={() => { setSelectedId(null); fetchProjects(); }}
          onTasksChanged={fetchProjects}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <SectionHeader
        icon={FolderKanban}
        title="Proyectos"
        description="Los frentes de trabajo de la fundación y sus tareas."
        actions={
          <Button onClick={openCreate} variant="action" className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Nuevo proyecto
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar los proyectos"
          description="Revisá tu conexión e intentá de nuevo."
          action={<Button variant="outline" onClick={fetchProjects}>Reintentar</Button>}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Todavía no hay proyectos"
          description="Creá el primer frente de trabajo para empezar a organizar tareas."
          action={
            <Button onClick={openCreate} className="bg-brand-primary hover:bg-brand-dark text-white">
              <Plus className="w-4 h-4 mr-2" /> Nuevo proyecto
            </Button>
          }
        />
      ) : (
        <>
          {/* Métricas globales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard icon={FolderKanban} label="Proyectos activos" value={metrics.activos} tone="primary" />
            <StatCard icon={ListChecks} label="Tareas pendientes" value={metrics.pendientes} tone="amber" />
            <StatCard icon={AlertCircle} label="Vencidas" value={metrics.vencidas} tone="red" />
            <StatCard icon={TrendingUp} label="Avance global" value={`${metrics.avance}%`} tone="green" />
          </div>

          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Buscar proyecto..."
            count={visible.length}
            countLabel="proyectos"
          />

          {/* Filtros por estado + orden */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <FilterChips options={statusChips} value={statusFilter} onChange={setStatusFilter} className="flex-1" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-full sm:w-44 shrink-0 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recomendado">Orden: recomendado</SelectItem>
                <SelectItem value="avance">Orden: más avance</SelectItem>
                <SelectItem value="nombre">Orden: nombre (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visible.length === 0 ? (
            <Card className="border-none shadow-sm bg-white rounded-2xl">
              <CardContent className="p-0">
                <EmptyState icon={FolderKanban} title="Sin coincidencias" description="Probá con otro filtro o término de búsqueda." />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visible.map((p, i) => {
                const meta = projectStatusMeta(p.status);
                const st = projectStats(p);
                const complete = st.total > 0 && st.done === st.total;
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
                    className="text-left bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-gray-100 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-poppins font-bold text-brand-dark leading-tight">{p.name}</h3>
                      <span onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-300 hover:text-brand-primary shrink-0 p-1 -mr-1 -mt-0.5">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setToDelete(p)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`border ${meta.badge}`}>{meta.label}</Badge>
                      {st.overdue > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          <AlertCircle className="w-3 h-3" /> {st.overdue} vencida{st.overdue === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>

                    {p.description && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{p.description}</p>}

                    {/* Progreso */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-500">{st.total === 0 ? 'Sin tareas' : `${st.done}/${st.total} tareas`}</span>
                        <span className="font-bold text-brand-dark">{st.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${complete ? 'bg-green-500' : 'bg-brand-primary'}`} style={{ width: `${st.pct}%` }} />
                      </div>
                      {st.total > 0 && (
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> {st.pending} pend.</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-primary" /> {st.inProgress} en curso</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {st.done} hechas</span>
                        </div>
                      )}
                    </div>

                    {(p.start_date || p.end_date) && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
                        <CalendarRange className="w-3.5 h-3.5" />
                        {formatDateShort(p.start_date) || '—'} → {formatDateShort(p.end_date) || '—'}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Dialog crear/editar proyecto */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!saving) setFormOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-poppins text-brand-dark flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand-gold" /> {editing ? 'Editar proyecto' : 'Nuevo proyecto'}
            </DialogTitle>
            <DialogDescription>Definí el frente de trabajo y su estado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nombre</Label>
              <Input id="p-name" value={form.name} required
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Refacción del comedor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Descripción</Label>
              <Textarea id="p-desc" value={form.description} rows={3}
                onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Objetivo del proyecto, alcance..." />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-start">Inicio</Label>
                <Input id="p-start" type="date" value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-end">Fin estimado</Label>
                <Input id="p-end" type="date" value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-brand-primary hover:bg-brand-dark text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : (editing ? 'Guardar' : 'Crear proyecto')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación borrar proyecto */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!deleting && !o) setToDelete(null); }}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-poppins font-bold text-brand-dark">¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar “{toDelete?.name}” y todas sus tareas. Esta acción no se puede deshacer.
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

export default ProjectsManager;
