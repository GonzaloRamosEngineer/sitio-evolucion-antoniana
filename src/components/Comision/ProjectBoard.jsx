import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plus, Loader2, MoreVertical, Pencil, Trash2,
  CalendarClock, User as UserIcon, ListTodo, MoveRight, AlertCircle, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import SearchBar from '@/components/Admin/shared/SearchBar';
import EmptyState from '@/components/Admin/shared/EmptyState';
import { getTasks, createTask, updateTask, deleteTask } from '@/api/projectsApi';
import {
  TASK_COLUMNS, TASK_STATUS_LABELS, PRIORITIES,
  statusLabelMeta, priorityMeta, formatDateShort, isOverdue, projectStatusMeta,
} from './projectConstants';

const NONE = 'none';
const ALL = 'all';
const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 };

const emptyTask = () => ({
  title: '', description: '', status: 'pendiente',
  status_label: NONE, priority: NONE, assignee_text: '', due_date: '',
});

const taskIsOverdue = (t) => t.due_date && t.status !== 'hecho' && isOverdue(t.due_date);

// Orden dentro de cada columna: vencidas primero, luego por vencimiento (nulls
// al final) y por prioridad.
const sortTasks = (arr) => [...arr].sort((a, b) => {
  const ao = taskIsOverdue(a) ? 0 : 1;
  const bo = taskIsOverdue(b) ? 0 : 1;
  if (ao !== bo) return ao - bo;
  const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
  const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
  if (ad !== bd) return ad - bd;
  return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
});

// Tarjeta de tarea (reutilizada en kanban desktop y lista mobile).
const TaskCard = ({ task, moving, onEdit, onMove, onDelete }) => {
  const sl = statusLabelMeta(task.status_label);
  const pr = priorityMeta(task.priority);
  const others = TASK_COLUMNS.filter((c) => c.value !== task.status);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-brand-dark leading-snug">{task.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-gray-300 hover:text-brand-primary shrink-0 -mr-1 -mt-0.5 p-1">
              {moving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-400">Mover a</DropdownMenuLabel>
            {others.map((o) => (
              <DropdownMenuItem key={o.value} onClick={() => onMove(task, o.value)}>
                <MoveRight className="w-4 h-4 mr-2" /> {o.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(sl || pr) && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {sl && <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${sl.badge}`}>{sl.value}</Badge>}
          {pr && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`} /> {pr.label}
            </span>
          )}
        </div>
      )}

      {task.description && <p className="text-xs text-gray-500 mt-2 line-clamp-3">{task.description}</p>}

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {task.assignee_text && (
          <span className="flex items-center gap-1 text-xs text-gray-600">
            <UserIcon className="w-3.5 h-3.5 text-brand-gold" /> {task.assignee_text}
          </span>
        )}
        {task.due_date && (
          <span className={`flex items-center gap-1 text-xs ${taskIsOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            <CalendarClock className="w-3.5 h-3.5" /> {formatDateShort(task.due_date)}
          </span>
        )}
      </div>
    </motion.div>
  );
};

const SummaryPill = ({ dot, label, tone }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${tone}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {label}
  </span>
);

const ProjectBoard = ({ project, currentUserId, onBack, onTasksChanged }) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeColumn, setActiveColumn] = useState('pendiente');
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTask());
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [movingId, setMovingId] = useState(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getTasks(project.id);
    if (error) {
      console.error('Error fetching tasks:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las tareas.', variant: 'destructive' });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [project.id, toast]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Resumen del proyecto (sobre todas las tareas, sin filtrar).
  const summary = useMemo(() => ({
    pend: tasks.filter((t) => t.status === 'pendiente').length,
    prog: tasks.filter((t) => t.status === 'en_progreso').length,
    done: tasks.filter((t) => t.status === 'hecho').length,
    overdue: tasks.filter(taskIsOverdue).length,
  }), [tasks]);

  const assignees = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.assignee_text).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [tasks]
  );

  // Tareas tras aplicar búsqueda + filtros.
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !(`${t.title} ${t.description || ''} ${t.assignee_text || ''}`.toLowerCase().includes(q))) return false;
      if (assigneeFilter !== ALL && t.assignee_text !== assigneeFilter) return false;
      if (priorityFilter !== ALL && t.priority !== priorityFilter) return false;
      if (overdueOnly && !taskIsOverdue(t)) return false;
      return true;
    });
  }, [tasks, search, assigneeFilter, priorityFilter, overdueOnly]);

  const byColumn = useMemo(() => {
    const map = {};
    TASK_COLUMNS.forEach((c) => { map[c.value] = sortTasks(filteredTasks.filter((t) => t.status === c.value)); });
    return map;
  }, [filteredTasks]);

  const hasFilters = search.trim() || assigneeFilter !== ALL || priorityFilter !== ALL || overdueOnly;

  const openCreate = () => { setEditing(null); setForm(emptyTask()); setFormOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      title: t.title || '',
      description: t.description || '',
      status: t.status || 'pendiente',
      status_label: t.status_label || NONE,
      priority: t.priority || NONE,
      assignee_text: t.assignee_text || '',
      due_date: t.due_date ? String(t.due_date).slice(0, 10) : '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        project_id: project.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        status_label: form.status_label === NONE ? null : form.status_label,
        priority: form.priority === NONE ? null : form.priority,
        assignee_text: form.assignee_text.trim() || null,
        due_date: form.due_date || null,
      };
      const { error } = editing
        ? await updateTask(editing.id, payload)
        : await createTask({ ...payload, created_by: currentUserId });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: editing ? 'Tarea actualizada' : 'Tarea creada' });
      setFormOpen(false);
      await fetchTasks();
      onTasksChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const moveTask = async (task, status) => {
    if (task.status === status || movingId) return;
    setMovingId(task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    const { error } = await updateTask(task.id, { status });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo mover la tarea.', variant: 'destructive' });
      await fetchTasks();
    } else {
      onTasksChanged?.();
    }
    setMovingId(null);
  };

  const handleDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      const { error } = await deleteTask(toDelete.id);
      if (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la tarea.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Tarea eliminada' });
      setToDelete(null);
      await fetchTasks();
      onTasksChanged?.();
    } finally {
      setDeleting(false);
    }
  };

  const pStatus = projectStatusMeta(project.status);

  return (
    <div>
      {/* Encabezado del proyecto */}
      <div className="flex flex-col gap-4 mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-primary transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Volver a proyectos
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-poppins font-bold text-brand-dark">{project.name}</h2>
              <Badge variant="outline" className={`border ${pStatus.badge}`}>{pStatus.label}</Badge>
            </div>
            {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
          </div>
          <Button onClick={openCreate} variant="action" className="rounded-xl shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Nueva tarea
          </Button>
        </div>

        {/* Resumen */}
        {tasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <SummaryPill dot="bg-gray-400" tone="bg-white text-gray-600 border-gray-200" label={`${summary.pend} pendientes`} />
            <SummaryPill dot="bg-brand-primary" tone="bg-white text-gray-600 border-gray-200" label={`${summary.prog} en curso`} />
            <SummaryPill dot="bg-green-500" tone="bg-white text-gray-600 border-gray-200" label={`${summary.done} hechas`} />
            {summary.overdue > 0 && (
              <SummaryPill dot="bg-red-500" tone="bg-red-50 text-red-700 border-red-200" label={`${summary.overdue} vencidas`} />
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TASK_COLUMNS.map((c) => (
            <div key={c.value} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />
              <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Este proyecto todavía no tiene tareas"
          description="Agregá la primera tarea para empezar a organizar el trabajo."
          action={
            <Button onClick={openCreate} className="bg-brand-primary hover:bg-brand-dark text-white">
              <Plus className="w-4 h-4 mr-2" /> Nueva tarea
            </Button>
          }
        />
      ) : (
        <>
          {/* Filtros */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar tarea o responsable..."
            count={filteredTasks.length}
            countLabel="tareas"
          />
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[150px] rounded-xl">
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los responsables</SelectItem>
                {assignees.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-xl">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toda prioridad</SelectItem>
                {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setOverdueOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-medium border transition-colors ${
                overdueOnly ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:border-red-200'
              }`}
            >
              <AlertCircle className="w-4 h-4" /> Vencidas
              {summary.overdue > 0 && <span className="text-xs font-bold">{summary.overdue}</span>}
            </button>
          </div>

          {/* Desktop: kanban 3 columnas */}
          <div className="hidden md:grid md:grid-cols-3 gap-4">
            {TASK_COLUMNS.map((col) => (
              <div key={col.value} className={`bg-brand-sand/40 rounded-2xl border-t-4 ${col.accent} border-x border-b border-gray-100 p-3`}>
                <div className="flex items-center justify-between px-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h3 className="text-sm font-bold text-brand-dark">{col.label}</h3>
                  </div>
                  <span className="text-xs font-bold text-gray-400">{byColumn[col.value].length}</span>
                </div>
                <div className="space-y-2.5 min-h-[60px]">
                  {byColumn[col.value].length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Sin tareas</p>
                  ) : (
                    byColumn[col.value].map((t) => (
                      <TaskCard key={t.id} task={t} moving={movingId === t.id} onEdit={openEdit} onMove={moveTask} onDelete={setToDelete} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: segmentado + lista */}
          <div className="md:hidden">
            <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl mb-4">
              {TASK_COLUMNS.map((col) => {
                const active = activeColumn === col.value;
                return (
                  <button
                    key={col.value}
                    onClick={() => setActiveColumn(col.value)}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-colors ${
                      active ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-500'
                    }`}
                  >
                    <span className="truncate">{col.label}</span>
                    <span className={`text-[10px] ${active ? 'text-brand-primary' : 'text-gray-400'}`}>{byColumn[col.value].length}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2.5 min-h-[60px]">
              {byColumn[activeColumn].length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                  {hasFilters ? 'Sin tareas que coincidan con los filtros.' : 'Sin tareas en esta columna.'}
                </p>
              ) : (
                byColumn[activeColumn].map((t) => (
                  <TaskCard key={t.id} task={t} moving={movingId === t.id} onEdit={openEdit} onMove={moveTask} onDelete={setToDelete} />
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Dialog crear/editar tarea */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!saving) setFormOpen(o); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-poppins text-brand-dark flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-brand-gold" /> {editing ? 'Editar tarea' : 'Nueva tarea'}
            </DialogTitle>
            <DialogDescription>{project.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-title">Título</Label>
              <Input id="t-title" value={form.title} required
                onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Firmar acta por el Consejo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Descripción / observación</Label>
              <Textarea id="t-desc" value={form.description} rows={3}
                onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles, dependencias, contexto..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Columna (tablero)</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_COLUMNS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado detallado</Label>
                <Select value={form.status_label} onValueChange={(v) => setForm({ ...form, status_label: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {TASK_STATUS_LABELS.map((s) => <SelectItem key={s.value} value={s.value}>{s.value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-due">Vence</Label>
                <Input id="t-due" type="date" value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-resp">Responsable</Label>
              <Input id="t-resp" value={form.assignee_text}
                onChange={(e) => setForm({ ...form, assignee_text: e.target.value })} placeholder="Ej. Presidente / Secretario, Contador, Gonzalo..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-brand-primary hover:bg-brand-dark text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</> : (editing ? 'Guardar' : 'Crear tarea')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación borrar tarea */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!deleting && !o) setToDelete(null); }}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-poppins font-bold text-brand-dark">¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar “{toDelete?.title}”. Esta acción no se puede deshacer.
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

export default ProjectBoard;
