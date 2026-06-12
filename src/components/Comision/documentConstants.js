// Categorías y helpers del gestor de documentación interna.

export const DOC_CATEGORIES = [
  'Estatuto',
  'Acta',
  'Balance / Estado contable',
  'Memoria',
  'Inventario',
  'Plan Trienal',
  'Convenio',
  'Reglamento',
  'Inscripción',
  'Informe',
  'Otro',
];

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};
