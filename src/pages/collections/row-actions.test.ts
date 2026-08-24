import { describe, it, expect } from 'vitest';
import { availableActions } from './row-actions';
import type { CollectionRow } from '@/types/api';

const fila = (over: Partial<CollectionRow> = {}): CollectionRow => ({
  id: 'inv-1',
  invoiceNumber: 'F-001',
  service: 'Plan Profesional',
  dueDate: '2026-08-30',
  paidAt: null,
  total: 890,
  currency: 'USD',
  status: 'SENT',
  collectionStatus: 'DUE',
  contact: { id: 'c-1', name: 'Andina', email: 'a@b.c' } as CollectionRow['contact'],
  project: null,
  ...over,
});

/** Qué se puede hacer con un cobro depende de si ya está cobrado y de a quién es. */
describe('availableActions', () => {
  it('un cobro pendiente se puede marcar como cobrado', () => {
    expect(availableActions(fila())).toContain('markPaid');
  });

  it('uno ya pagado no se vuelve a cobrar: no hay forma limpia de deshacerlo', () => {
    expect(availableActions(fila({ collectionStatus: 'PAID' }))).not.toContain('markPaid');
  });

  it('un moroso se puede reclamar por email', () => {
    expect(availableActions(fila({ collectionStatus: 'OVERDUE' }))).toContain('sendReminder');
  });

  it('no se reclama lo que ya está pagado', () => {
    expect(availableActions(fila({ collectionStatus: 'PAID' }))).not.toContain('sendReminder');
  });

  it('sin email del cliente no se ofrece el recordatorio, en vez de fallar al pulsarlo', () => {
    const sinEmail = fila({ contact: { id: 'c-1', name: 'Andina', email: null } as CollectionRow['contact'] });

    expect(availableActions(sinEmail)).not.toContain('sendReminder');
  });

  it('el PDF y ver la factura están siempre, pagada o no', () => {
    for (const estado of ['PAID', 'DUE', 'OVERDUE'] as const) {
      const acciones = availableActions(fila({ collectionStatus: estado }));
      expect(acciones).toContain('downloadPdf');
      expect(acciones).toContain('viewInvoice');
    }
  });

  it('sin cliente asociado no se ofrece ir a su ficha', () => {
    expect(availableActions(fila({ contact: null }))).not.toContain('viewContact');
  });
});
