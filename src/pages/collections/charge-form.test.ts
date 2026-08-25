import { describe, it, expect } from 'vitest';
import { validateCharge, previewTotals, buildInvoicePayload, type ChargeForm } from './charge-form';

const VALIDO: ChargeForm = {
  type: 'ONE_OFF',
  contactId: 'contact-1',
  projectId: '',
  dueDate: '2026-09-15',
  interval: 'MONTHLY',
  tax: 0,
  notes: '',
  items: [{ description: 'Instalación', quantity: 1, unitPrice: 100 }],
};

describe('validateCharge', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validateCharge(VALIDO)).toEqual({});
  });

  it('exige cliente: sin él la nota no es de nadie', () => {
    expect(validateCharge({ ...VALIDO, contactId: '' }).contactId).toBeTruthy();
  });

  it('exige al menos una línea con descripción', () => {
    expect(validateCharge({ ...VALIDO, items: [] }).items).toBeTruthy();
  });

  it('una línea en blanco no cuenta como línea', () => {
    const enBlanco = [{ description: '   ', quantity: 1, unitPrice: 100 }];

    expect(validateCharge({ ...VALIDO, items: enBlanco }).items).toBeTruthy();
  });

  it('exige que el importe sea mayor que cero', () => {
    const gratis = [{ description: 'Regalo', quantity: 1, unitPrice: 0 }];

    expect(validateCharge({ ...VALIDO, items: gratis }).items).toBeTruthy();
  });

  it('exige fecha en ambos tipos de cobro', () => {
    expect(validateCharge({ ...VALIDO, dueDate: '' }).dueDate).toBeTruthy();
    expect(validateCharge({ ...VALIDO, type: 'RECURRING', dueDate: '' }).dueDate).toBeTruthy();
  });

  it('un recurrente exige periodicidad', () => {
    expect(validateCharge({ ...VALIDO, type: 'RECURRING', interval: undefined as never }).interval)
      .toBeTruthy();
  });

  it('un pago único no exige periodicidad', () => {
    expect(validateCharge({ ...VALIDO, type: 'ONE_OFF', interval: undefined as never }).interval)
      .toBeUndefined();
  });

  /** Un recurrente se cobra siempre por el mismo importe, así que va en una sola línea. */
  it('un recurrente no admite varias líneas', () => {
    const dos = [
      { description: 'A', quantity: 1, unitPrice: 100 },
      { description: 'B', quantity: 1, unitPrice: 50 },
    ];

    expect(validateCharge({ ...VALIDO, type: 'RECURRING', items: dos }).items).toBeTruthy();
  });
});

describe('previewTotals', () => {
  it('anticipa el importe mientras se rellena', () => {
    expect(previewTotals([{ description: 'A', quantity: 2, unitPrice: 50 }], 10).total).toBe(110);
  });

  it('ignora las líneas en blanco, que son las que aún no se han escrito', () => {
    const conVacia = [
      { description: 'A', quantity: 1, unitPrice: 100 },
      { description: '', quantity: 1, unitPrice: 999 },
    ];

    expect(previewTotals(conVacia, 0).subtotal).toBe(100);
  });

  it('sin líneas no da NaN', () => {
    expect(previewTotals([], 0)).toMatchObject({ subtotal: 0, total: 0 });
  });
});

describe('buildInvoicePayload', () => {
  /**
   * Sin esto la factura nace como DRAFT —el valor por defecto de la base— y Cobranzas
   * excluye los borradores: crearías un cobro desde esta pantalla y no lo verías en la
   * lista. Lo que se da de alta aquí es un cobro exigible, no un borrador.
   */
  it('marca el cobro como enviado, para que aparezca en la lista', () => {
    expect(buildInvoicePayload(VALIDO).status).toBe('SENT');
  });

  it('manda las líneas sin total: lo calcula el servidor', () => {
    const [line] = buildInvoicePayload(VALIDO).items;

    expect(line).toEqual({ description: 'Instalación', quantity: 1, unitPrice: 100 });
  });

  it('descarta las líneas en blanco', () => {
    const conVacia = { ...VALIDO, items: [...VALIDO.items, { description: '', quantity: 1, unitPrice: 5 }] };

    expect(buildInvoicePayload(conVacia).items).toHaveLength(1);
  });

  it('un proyecto sin elegir viaja como null, no como cadena vacía', () => {
    expect(buildInvoicePayload({ ...VALIDO, projectId: '' }).projectId).toBeNull();
  });
});
