import type { BillingType } from '@/types/api';

/**
 * Cómo se lee cada periodicidad en la lista. Un único sitio para que la tabla y el CSV
 * no puedan decir cosas distintas del mismo cobro.
 */
export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  BIANNUAL: 'Every 6 months',
  ANNUAL: 'Yearly',
  ONE_OFF: 'One-off',
};

/**
 * El valor por defecto es `One-off` y no una celda vacía: un backend anterior a este
 * cambio no manda el campo, y un cobro sin servicio detrás **es** un pago único.
 */
export function billingTypeLabel(type: BillingType | undefined | null): string {
  return BILLING_TYPE_LABELS[type ?? 'ONE_OFF'] ?? BILLING_TYPE_LABELS.ONE_OFF;
}
