import { describe, it, expect } from 'vitest';
import { billingTypeLabel, BILLING_TYPE_LABELS } from './billing-type';

describe('billingTypeLabel', () => {
  it.each([
    ['MONTHLY', 'Monthly'],
    ['QUARTERLY', 'Quarterly'],
    ['BIANNUAL', 'Every 6 months'],
    ['ANNUAL', 'Yearly'],
    ['ONE_OFF', 'One-off'],
  ] as const)('%s se lee como "%s"', (type, label) => {
    expect(billingTypeLabel(type)).toBe(label);
  });

  /** Un backend anterior a este cambio no manda el campo: mejor "One-off" que vacío. */
  it('sin tipo cae a pago único en vez de dejar la celda vacía', () => {
    expect(billingTypeLabel(undefined)).toBe('One-off');
  });

  it('cubre todos los tipos, sin sobrantes', () => {
    expect(Object.keys(BILLING_TYPE_LABELS).sort())
      .toEqual(['ANNUAL', 'BIANNUAL', 'MONTHLY', 'ONE_OFF', 'QUARTERLY']);
  });
});
