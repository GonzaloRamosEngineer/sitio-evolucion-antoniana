import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const getDocuments = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'persona-1', role: 'documentacion_lectura' } }),
}));

vi.mock('@/api/documentsApi', () => ({
  getDocuments,
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
  document_versions: [{ id: 'version-1' }],
};

describe('DocumentsManager — acceso documental', () => {
  beforeEach(() => {
    getDocuments.mockResolvedValue({ data: [documentFixture], error: null });
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
});
