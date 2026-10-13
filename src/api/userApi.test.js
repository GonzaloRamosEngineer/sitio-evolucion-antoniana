import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mocks.from },
}));

const { updateUserRole } = await import('./userApi');

describe('updateUserRole', () => {
  beforeEach(() => {
    mocks.from.mockReset().mockReturnValue({ update: mocks.update });
    mocks.update.mockReset().mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReset().mockReturnValue({ select: mocks.select });
    mocks.select.mockReset().mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockReset();
  });

  it('confirma el rol que efectivamente persistió', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'u-1', role: 'documentacion_lectura' }, error: null });

    const result = await updateUserRole('u-1', 'documentacion_lectura');

    expect(result).toEqual({ data: { id: 'u-1', role: 'documentacion_lectura' }, error: null });
    expect(mocks.update).toHaveBeenCalledWith({ role: 'documentacion_lectura' });
  });

  it('reporta permiso denegado si RLS filtró el cambio sin devolver un error', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await updateUserRole('u-1', 'admin');

    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/No tenés permiso/i);
  });
});
