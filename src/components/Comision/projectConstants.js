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
