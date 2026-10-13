import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const getDocuments = vi.fn();
const getSignedUrl = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'persona-1', role: 'documentacion_lectura' } }),
}));

vi.mock('@/api/documentsApi', () => ({
  getDocuments,
  getSignedUrl,
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

const DocumentsManager = (await import('./DocumentsManager')).default;

const documentFixture = {
  id: 'documento-1',
  title: 'Balance interno 2025',
  category: 'Balance / Estado contable',
  description: 'Documentación presentada ante Personería Jurídica.',
  current_version: 1,
  updated_at: '2026-10-12T12:00:00Z',
  document_versions: [{ id: 'version-1', version_number: 1, file_path: 'documento-1/balance.pdf' }],
};

const publicDocumentFixture = {
  id: 'documento-2',
  title: 'Estatuto fundacional',
  category: 'Estatuto',
  description: 'Documento público institucional.',
  visibility: 'public',
  public_url: 'https://drive.google.com/estatuto-oficial',
  current_version: 1,
  updated_at: '2026-10-11T12:00:00Z',
  document_versions: [{ id: 'version-2', version_number: 1, file_path: 'documento-2/estatuto.pdf' }],
};

describe('DocumentsManager — acceso documental', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    getDocuments.mockResolvedValue({ data: [documentFixture], error: null });
    getSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.test/balance.pdf' }, error: null });
  });

  it('muestra el archivo interno sin ofrecer acciones de escritura', async () => {
    render(<DocumentsManager readOnly />);

    expect((await screen.findAllByText('Balance interno 2025')).length).toBe(2);
    expect(screen.getByRole('columnheader', { name: 'Acceso' })).toBeInTheDocument();
    expect(screen.getByText(/únicamente para consulta/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nuevo documento/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar|Eliminar/i })).not.toBeInTheDocument();
  });

  it('conserva las acciones para la Comisión Directiva', async () => {
    render(<DocumentsManager />);

    expect((await screen.findAllByText('Balance interno 2025')).length).toBe(2);
    expect(screen.getByRole('button', { name: /Nuevo documento/i })).toBeInTheDocument();
  });

  it('filtra el catálogo completo por tipo de acceso', async () => {
    render(<DocumentsManager readOnly />);

    await screen.findAllByText('Balance interno 2025');
    fireEvent.click(screen.getByRole('button', { name: /Públicos 0/i }));
    expect(await screen.findByText('Sin coincidencias')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Internos 1/i }));
    expect((await screen.findAllByText('Balance interno 2025')).length).toBe(2);
  });

  it('abre la última versión directamente para acceso documental', async () => {
    const tab = { location: {} };
    vi.spyOn(window, 'open').mockReturnValue(tab);
    render(<DocumentsManager readOnly />);

    await screen.findAllByText('Balance interno 2025');
    fireEvent.click(screen.getAllByRole('button', { name: /Abrir última versión de Balance interno 2025/i })[0]);

    await vi.waitFor(() => expect(getSignedUrl).toHaveBeenCalledWith('documento-1/balance.pdf'));
    expect(tab.location.href).toBe('https://example.test/balance.pdf');
  });

  it('prioriza el enlace oficial para documentos públicos', async () => {
    const tab = { location: {} };
    vi.spyOn(window, 'open').mockReturnValue(tab);
    getDocuments.mockResolvedValue({ data: [publicDocumentFixture], error: null });
    render(<DocumentsManager readOnly />);

    await screen.findAllByText('Estatuto fundacional');
    fireEvent.click(screen.getAllByRole('button', { name: /Abrir última versión de Estatuto fundacional/i })[0]);

    expect(tab.location.href).toBe('https://drive.google.com/estatuto-oficial');
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('busca en toda la biblioteca aunque haya un filtro de acceso activo', async () => {
    getDocuments.mockResolvedValue({ data: [documentFixture, publicDocumentFixture], error: null });
    render(<DocumentsManager readOnly />);

    await screen.findAllByText('Balance interno 2025');
    fireEvent.click(screen.getByRole('button', { name: /Internos 1/i }));
    fireEvent.change(screen.getByPlaceholderText('Buscar documento...'), { target: { value: 'estat' } });

    expect((await screen.findAllByText('Estatuto fundacional')).length).toBe(2);
  });

  it('muestra la biblioteca extensa en bloques para evitar un scroll interminable', async () => {
    const longLibrary = Array.from({ length: 9 }, (_, index) => ({
      ...documentFixture,
      id: `documento-${index + 1}`,
      title: `Documento ${index + 1}`,
      document_versions: [{ id: `version-${index + 1}`, version_number: 1, file_path: `documento-${index + 1}/archivo.pdf` }],
    }));
    getDocuments.mockResolvedValue({ data: longLibrary, error: null });
    render(<DocumentsManager readOnly />);

    await screen.findAllByText('Documento 1');
    expect(screen.queryByText('Documento 9')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mostrar 1 documento más/i }));
    expect((await screen.findAllByText('Documento 9')).length).toBe(2);
  });
});
