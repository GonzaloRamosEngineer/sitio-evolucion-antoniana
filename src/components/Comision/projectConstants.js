// Metadatos de estados de proyectos y tareas, compartidos por el gestor.

export const PROJECT_STATUS = {
  activo: { label: 'Activo', badge: 'bg-green-50 text-green-700 border-green-200' },
  en_pausa: { label: 'En pausa', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  cerrado: { label: 'Cerrado', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export const PROJECT_STATUS_OPTIONS = Object.entries(PROJECT_STATUS).map(
  ([value, meta]) => ({ value, label: meta.label }),
);

// Columnas del tablero kanban (orden de izquierda a derecha).
export const TASK_COLUMNS = [
  { value: 'pendiente', label: 'Pendiente', accent: 'border-t-gray-300', dot: 'bg-gray-400' },
  { value: 'en_progreso', label: 'En progreso', accent: 'border-t-brand-primary', dot: 'bg-brand-primary' },
  { value: 'hecho', label: 'Hecho', accent: 'border-t-green-500', dot: 'bg-green-500' },
];

export const projectStatusMeta = (status) => PROJECT_STATUS[status] || PROJECT_STATUS.activo;

// Estado detallado / oficial del trámite (independiente de la columna kanban).
export const TASK_STATUS_LABELS = [
  { value: 'Listo', badge: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'Listo para firma', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Pendiente formal', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'Pendiente', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'Pendiente eventual', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'No aplica ahora', badge: 'bg-gray-50 text-gray-400 border-gray-200' },
];

export const statusLabelMeta = (v) => TASK_STATUS_LABELS.find((s) => s.value === v) || null;

// Prioridad de la tarea.
export const PRIORITIES = [
  { value: 'alta', label: 'Alta', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  { value: 'media', label: 'Media', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { value: 'baja', label: 'Baja', badge: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
];

export const priorityMeta = (v) => PRIORITIES.find((p) => p.value === v) || null;

// Formatea una fecha (columna date de Postgres, 'YYYY-MM-DD') sin corrimiento
// de zona horaria, en formato corto es-AR.
export const formatDateShort = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ¿La fecha (YYYY-MM-DD) ya pasó respecto de hoy?
export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d) < today;
};
