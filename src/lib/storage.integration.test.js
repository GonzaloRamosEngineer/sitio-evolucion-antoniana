// Tests de INTEGRACIÓN de la capa de datos contra una Supabase LOCAL (Docker).
//
// Por qué existen: `storage.test.js` mockea Supabase, así que prueba que la capa
// use bien los helpers — pero no puede probar que las **RLS reales** se comporten
// como asumimos. Estos tests corren el código real de `storage.js` contra un
// Postgres real con las políticas versionadas en `supabase/migrations/`, así que
// validan la parte que los mocks no alcanzan (ROADMAP 4.1).
//
// Cómo correrlos:
//   npx supabase start
//   npm run test:integration
//
// Si no hay Supabase local levantada, el suite se saltea (no falla el gate).
//
// ⚠️  SEGURIDAD: `@/lib/supabase` cae a las credenciales de PRODUCCIÓN cuando no
// hay env vars. Estos tests ESCRIBEN, así que abajo hay un guardarraíl que aborta
// si la URL no es local. Nunca lo relajes: sin él, un `npm run test:integration`
// mal configurado escribiría en la base de la Fundación.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = process.env.SUPABASE_LOCAL_URL;
const LOCAL_ANON_KEY = process.env.SUPABASE_LOCAL_ANON_KEY;
const LOCAL_SERVICE_KEY = process.env.SUPABASE_LOCAL_SERVICE_KEY;

const isLocalHost = (url) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(url || '');

const configured = Boolean(LOCAL_URL && LOCAL_ANON_KEY);

// El guardarraíl: si hay URL pero NO es local, reventamos en vez de seguir.
if (LOCAL_URL && !isLocalHost(LOCAL_URL)) {
  throw new Error(
    `SUPABASE_LOCAL_URL debe apuntar a una Supabase local, recibí "${LOCAL_URL}". ` +
      'Estos tests escriben en la base: abortando para no tocar producción.'
  );
}

// El código real de storage.js importa este singleton; lo apuntamos a la local.
vi.mock('@/lib/supabase', () => ({
  supabase: createClient(LOCAL_URL ?? 'http://127.0.0.1:54321', LOCAL_ANON_KEY ?? 'noop', {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
}));

const storage = await import('@/lib/storage');
const { supabase: anonClient } = await import('@/lib/supabase');

const admin = configured && LOCAL_SERVICE_KEY
  ? createClient(LOCAL_URL, LOCAL_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const suite = configured ? describe : describe.skip;

// Prefijo para poder limpiar solo lo que creamos estos tests.
const TAG = 'ZZTEST-F2';
const createdPartnerIds = [];

suite('capa de datos contra Supabase local (RLS reales)', () => {
  beforeAll(async () => {
    if (!admin) return;
    // Semilla: un partner aprobado (visible al anon) y uno pendiente (no visible).
    const { data } = await admin
      .from('partners')
      .insert([
        { nombre: `${TAG} Aprobado`, descripcion: 'x', contacto_email: 'a@t.com', estado: 'aprobado' },
        { nombre: `${TAG} Pendiente`, descripcion: 'x', contacto_email: 'b@t.com', estado: 'pendiente' },
      ])
      .select('id');
    (data || []).forEach((row) => createdPartnerIds.push(row.id));
  });

  afterAll(async () => {
    if (!admin) return;
    // Limpieza: borramos SOLO las filas con nuestro prefijo.
    await admin.from('partners').delete().like('nombre', `${TAG}%`);
  });

  it('cumple el contrato contra un Postgres real', async () => {
    const result = await storage.getPartners();
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('error');
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.error).toBeNull();
  });

  it('la RLS filtra: el anon solo ve los partners aprobados', async () => {
    // `partners_public_read` es `FOR SELECT USING (estado = 'aprobado')`.
    const { data, error } = await storage.getPartners();
    expect(error).toBeNull();

    const ours = data.filter((p) => p.nombre?.startsWith(TAG));
    if (admin) {
      expect(ours.map((p) => p.nombre)).toEqual([`${TAG} Aprobado`]);
    }
    expect(data.every((p) => p.estado === 'aprobado')).toBe(true);
  });

  it('addPartner anónimo funciona sin pedir la fila de vuelta', async () => {
    // Es el camino de ApplyPartnerPage. La RLS permite el INSERT pero NO leer la
    // fila recién creada (solo se leen las aprobadas), así que si `addPartner`
    // pidiera `.select()` esto fallaría. Este test fija esa decisión de diseño.
    const { data, error } = await storage.addPartner({
      nombre: `${TAG} Postulacion`,
      descripcion: 'Postulada desde el form público',
      contacto_email: 'nuevo@test.com',
    });

    expect(error).toBeNull();
    expect(data).toBeNull();

    if (admin) {
      const { data: rows } = await admin
        .from('partners')
        .select('nombre, estado')
        .eq('nombre', `${TAG} Postulacion`);
      expect(rows).toHaveLength(1);
      expect(rows[0].estado).toBe('pendiente'); // default de la tabla
    }
  });

  it('una RLS que rechaza llega al consumidor como `error`, no como excepción', async () => {
    // `partners_public_insert_any` exige `estado IS DISTINCT FROM 'aprobado'`:
    // un anon no puede autoaprobarse. Esto prueba que un rechazo real de la base
    // viaja por el contrato en vez de explotar como excepción — que es
    // exactamente lo que los mocks no pueden demostrar.
    const { data, error } = await storage.addPartner({
      nombre: `${TAG} Autoaprobado`,
      descripcion: 'Intento de saltar la RLS',
      contacto_email: 'malo@test.com',
      estado: 'aprobado',
    });

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error.code).toBe('42501'); // insufficient_privilege / RLS violation
  });

  it('"no encontrado" es data null SIN error (el cambio a .maybeSingle)', async () => {
    // Con `.single()` esto devolvía PGRST116 como error y el consumidor no podía
    // distinguir "no existe" de "se cayó la consulta".
    const { data, error } = await storage.getNewsBySlug('slug-que-no-existe-jamas');
    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('getBenefits y getNews responden el contrato contra la base real', async () => {
    for (const getter of [storage.getBenefits, storage.getNews]) {
      const { data, error } = await getter();
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    }
  });
});

suite('camino de admin autenticado', () => {
  const email = `zztest-f2-admin@example.com`;
  const password = 'test-password-1234';
  let partnerId = null;
  let ready = false;

  beforeAll(async () => {
    if (!admin) return;

    // Creamos el usuario y lo promovemos a admin con la service key.
    await admin.auth.admin.createUser({ email, password, email_confirm: true });
    const { data: list } = await admin.auth.admin.listUsers();
    const user = (list?.users || []).find((u) => u.email === email);
    if (!user) return;

    await admin.from('users').update({ role: 'admin' }).eq('id', user.id);

    const { error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
    if (signInError) return;

    const { data: rows } = await admin
      .from('partners')
      .insert([{ nombre: `${TAG} ParaEditar`, descripcion: 'x', contacto_email: 'c@t.com', estado: 'pendiente' }])
      .select('id');
    partnerId = rows?.[0]?.id ?? null;
    ready = Boolean(partnerId);
  });

  afterAll(async () => {
    if (!admin) return;
    await anonClient.auth.signOut();
    await admin.from('partners').delete().like('nombre', `${TAG}%`);
    const { data: list } = await admin.auth.admin.listUsers();
    const user = (list?.users || []).find((u) => u.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
  });

  it('el admin ve también los partners no aprobados', async () => {
    if (!ready) return expect(ready).toBe(true);
    const { data, error } = await storage.getPartners();
    expect(error).toBeNull();
    expect(data.some((p) => p.nombre === `${TAG} ParaEditar`)).toBe(true);
  });

  it('updatePartner aprueba y devuelve la fila actualizada', async () => {
    if (!ready) return expect(ready).toBe(true);
    // Es lo que hace handleApprove del panel: el camino que en el checklist
    // manual había que probar a mano creando y borrando registros en prod.
    const { data, error } = await storage.updatePartner(partnerId, { estado: 'aprobado' });
    expect(error).toBeNull();
    expect(data?.estado).toBe('aprobado');
  });

  it('deletePartner borra de verdad', async () => {
    if (!ready) return expect(ready).toBe(true);
    const { error } = await storage.deletePartner(partnerId);
    expect(error).toBeNull();

    const { data: rows } = await admin.from('partners').select('id').eq('id', partnerId);
    expect(rows).toHaveLength(0);
  });
});
