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
  billingType: 'ONE_OFF',
  subscriptionId: null,
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

describe('availableActions — gestión del servicio', () => {
  const deServicio = { billingType: 'MONTHLY', subscriptionId: 'sub-1' } as Partial<CollectionRow>;

  it('un cobro que viene de un servicio deja cambiarle el plan', () => {
    expect(availableActions(fila(deServicio))).toContain('changePlan');
  });

  it('y darlo de baja', () => {
    expect(availableActions(fila(deServicio))).toContain('cancelService');
  });

  /** En un pago único no hay servicio que gestionar: no es un cobro que se repita. */
  it('un pago único no ofrece ninguna de las dos', () => {
    const acciones = availableActions(fila());

    expect(acciones).not.toContain('changePlan');
    expect(acciones).not.toContain('cancelService');
  });

  /** Si el backend no manda el id, ofrecerlo sería un clic que no puede funcionar. */
  it('sin id del servicio tampoco se ofrecen', () => {
    const acciones = availableActions(fila({ billingType: 'MONTHLY', subscriptionId: null }));

    expect(acciones).not.toContain('changePlan');
  });

  it('un servicio ya cobrado sigue permitiendo cambiar el plan', () => {
    // El plan es del servicio, no de la nota: que esta esté pagada no lo congela.
    const pagado = fila({ ...deServicio, collectionStatus: 'PAID' });

    expect(availableActions(pagado)).toContain('changePlan');
  });
});
