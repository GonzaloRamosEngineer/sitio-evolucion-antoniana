import { supabase } from '@/lib/supabase';

// Capa de datos del gestor de documentación versionada (Comisión Directiva).
// Los archivos viven en el bucket privado 'comision-docs' (RLS solo-board);
// se sirven con signed URLs temporales. El acceso real lo controla Supabase.

const BUCKET = 'comision-docs';

// Trae los documentos con todas sus versiones embebidas.
export const getDocuments = async () =>
  supabase
    .from('documents')
    .select('*, document_versions(*)')
    .order('updated_at', { ascending: false });

export const createDocument = async (payload) =>
  supabase.from('documents').insert(payload).select('*, document_versions(*)').single();

export const updateDocument = async (id, payload) =>
  supabase.from('documents').update(payload).eq('id', id).select('*, document_versions(*)').single();

// Elimina el documento, sus versiones (cascade) y los archivos de Storage.
export const deleteDocument = async (doc) => {
  const paths = (doc.document_versions || []).map((v) => v.file_path).filter(Boolean);
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
  return supabase.from('documents').delete().eq('id', doc.id);
};

const safeName = (name) => (name || 'archivo').replace(/[^\w.\-]+/g, '_');

// Sube un archivo como nueva versión: lo guarda en Storage y registra la versión
// de forma atómica (rpc add_document_version). Devuelve { data: versionNumber, error }.
export const uploadVersion = async ({ documentId, file, notes }) => {
  const path = `${documentId}/${crypto.randomUUID()}-${safeName(file.name)}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) return { data: null, error: upErr };

  const { data, error } = await supabase.rpc('add_document_version', {
    p_document_id: documentId,
    p_file_path: path,
    p_file_name: file.name,
    p_mime_type: file.type || null,
    p_size_bytes: file.size,
    p_notes: notes || null,
  });

  if (error) {
    // No quedó registrada la versión → limpiamos el archivo huérfano.
    await supabase.storage.from(BUCKET).remove([path]);
    return { data: null, error };
  }

  return { data, error: null };
};

// URL firmada temporal (10 min) para un archivo del bucket privado.
// opts.download: true (o un nombre) fuerza la descarga.
export const getSignedUrl = async (filePath, opts) =>
  supabase.storage.from(BUCKET).createSignedUrl(filePath, 600, opts);

// Descarga el archivo como Blob (respeta la sesión/RLS). Se usa para la vista
// previa embebida: Supabase no permite mostrar sus URLs dentro de un iframe, así
// que servimos el archivo desde la propia app vía un object URL (blob:).
export const downloadFile = async (filePath) =>
  supabase.storage.from(BUCKET).download(filePath);

// Clasifica el archivo para decidir cómo previsualizarlo.
export const fileKind = (mimeType, fileName) => {
  const m = (mimeType || '').toLowerCase();
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
  return 'other';
};
