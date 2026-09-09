// Lo que se prueba acá es la PANTALLA (la matemática está en `lib/recorte.test.js`):
// que valide antes de leer el archivo, que muestre el error en vez de fallar en
// silencio, y que «Quitar» solo exista cuando hay foto que quitar.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
const subirAvatar = vi.fn();
const quitarAvatar = vi.fn();
vi.mock('@/api/avatarApi', () => ({
  subirAvatar: (...a) => subirAvatar(...a),
  quitarAvatar: (...a) => quitarAvatar(...a),
}));

const AvatarUpload = (await import('./AvatarUpload')).default;

// `avatar_path: null` = la fila se leyó y no hay foto. Sin la CLAVE, el
// componente no se ofrece (ver el primer caso).
const USUARIO = { id: 'u-1', name: 'Gonzalo Ramos', avatar_path: null };
const archivo = (nombre, tipo, size) => {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

beforeEach(() => {
  subirAvatar.mockReset();
  quitarAvatar.mockReset();
  // jsdom no implementa object URLs.
  global.URL.createObjectURL = vi.fn(() => 'blob:x');
  global.URL.revokeObjectURL = vi.fn();
});

describe('AvatarUpload', () => {
  it('🔒 si el perfil no se pudo leer NO ofrece subir nada', () => {
    // El usuario llega SIN la clave `avatar_path` porque no salió de la tabla:
    // es el respaldo de `useAuth` cuando la consulta del perfil falla. No hay
    // fila donde guardar la ruta, así que «Subir mi foto» es un clic que falla.
    render(<AvatarUpload user={{ id: 'u-1', name: 'Gonzalo Ramos' }} onUpdateSuccess={() => {}} />);
    expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByText(/Subir mi foto/i)).toBeNull();
  });

  it('con la fila leída y sin foto todavía SÍ ofrece subir', () => {
    // La distinción que importa: «no hay fila» ≠ «la hay y está vacía». Con un
    // chequeo por valor, quien no subió nada nunca podría.
    render(<AvatarUpload user={{ ...USUARIO, avatar_path: null }} onUpdateSuccess={() => {}} />);
    expect(screen.getByText(/Subir mi foto/i)).toBeInTheDocument();
  });

  it('sin foto ofrece subir y NO ofrece quitar', () => {
    render(<AvatarUpload user={{ ...USUARIO, avatar_path: null }} onUpdateSuccess={() => {}} />);
    expect(screen.getByText(/Subir mi foto/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quitar/i })).toBeNull();
  });

  it('con foto ofrece cambiarla y quitarla', () => {
    render(<AvatarUpload user={{ ...USUARIO, avatar_path: 'u-1/avatar.webp' }} onUpdateSuccess={() => {}} />);
    expect(screen.getByText(/Cambiar mi foto/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quitar/i })).toBeInTheDocument();
  });

  it('🔒 rechaza un archivo que no es imagen SIN leerlo', () => {
    const { container } = render(<AvatarUpload user={USUARIO} onUpdateSuccess={() => {}} />);
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [archivo('cv.pdf', 'application/pdf', 1000)] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/no es una imagen/i);
    // Lo importante: nunca se creó el object URL, o sea que no se cargó nada.
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('🔒 rechaza una imagen enorme antes de cargarla en memoria', () => {
    // Un HEIC de 12 MP en un celular con varias pestañas puede tumbar la
    // pestaña, y ahí ya no hay dónde mostrar un error.
    const { container } = render(<AvatarUpload user={USUARIO} onUpdateSuccess={() => {}} />);
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [archivo('foto.jpg', 'image/jpeg', 20 * 1024 * 1024)] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/muy grande/i);
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('con una imagen válida abre el recortador con su deslizador', () => {
    const { container } = render(<AvatarUpload user={USUARIO} onUpdateSuccess={() => {}} />);
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [archivo('foto.jpg', 'image/jpeg', 500 * 1024)] },
    });
    expect(screen.getByText(/Arrastrá para mover/i)).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usar esta foto/i })).toBeInTheDocument();
  });

  it('si quitar la foto falla lo dice, en vez de aparentar que se quitó', () => {
    quitarAvatar.mockResolvedValue({ data: null, error: new Error('boom') });
    const onUpdateSuccess = vi.fn();
    render(<AvatarUpload user={{ ...USUARIO, avatar_path: 'u-1/avatar.webp' }} onUpdateSuccess={onUpdateSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /Quitar/i }));
    return waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/No pudimos quitar la foto/i);
      expect(onUpdateSuccess).not.toHaveBeenCalled();
    });
  });

  it('quitar la foto avisa a la pantalla con la fila nueva', async () => {
    quitarAvatar.mockResolvedValue({ data: { id: 'u-1', avatar_path: null }, error: null });
    const onUpdateSuccess = vi.fn();
    render(<AvatarUpload user={{ ...USUARIO, avatar_path: 'u-1/avatar.webp' }} onUpdateSuccess={onUpdateSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /Quitar/i }));
    await waitFor(() => expect(quitarAvatar).toHaveBeenCalledWith('u-1', 'u-1/avatar.webp'));
    expect(onUpdateSuccess).toHaveBeenCalledWith({ id: 'u-1', avatar_path: null });
  });
});
