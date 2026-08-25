import type { BillingInterval } from '@/types/api';

/**
 * Reglas del alta de un cobro, separadas del diálogo para poder probarlas: qué es
 * obligatorio es una decisión de negocio, no de maquetación.
 *
 * `previewTotals` repite el cálculo del servidor a propósito, pero **solo para enseñarlo
 * mientras se rellena**: el importe que se guarda es siempre el que devuelve el backend.
 */

export type ChargeType = 'ONE_OFF' | 'RECURRING';

export interface ChargeItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ChargeForm {
  type: ChargeType;
  contactId: string;
  projectId: string;
  /** Fecha de cobro; en un recurrente es la del primer periodo y fija el día. */
  dueDate: string;
  interval: BillingInterval;
  tax: number;
  notes: string;
  items: ChargeItem[];
}

export type ChargeErrors = Partial<Record<'contactId' | 'dueDate' | 'interval' | 'items', string>>;

/** Una línea cuenta si tiene descripción: las vacías son las que aún no se han escrito. */
const filled = (items: ChargeItem[]) => items.filter((i) => i.description.trim());

export function validateCharge(form: ChargeForm): ChargeErrors {
  const errors: ChargeErrors = {};
  const items = filled(form.items);

  if (!form.contactId) errors.contactId = 'Select a client';
  if (!form.dueDate) errors.dueDate = 'Set the charge date';
  if (form.type === 'RECURRING' && !form.interval) errors.interval = 'Choose how often it repeats';

  if (items.length === 0) {
    errors.items = 'Add at least one line';
  } else if (previewTotals(form.items, 0).subtotal <= 0) {
    // Un cobro de cero no es un cobro: sería un servicio que nadie paga.
    errors.items = 'The amount must be greater than zero';
  } else if (form.type === 'RECURRING' && items.length > 1) {
    // Un servicio se cobra siempre por el mismo importe, así que va en una sola línea.
    errors.items = 'A recurring service takes a single line';
  }

  return errors;
}

export function previewTotals(items: ChargeItem[], tax: number) {
  const subtotal = filled(items).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const taxAmount = Number(tax) || 0;

  return { subtotal: round2(subtotal), tax: round2(taxAmount), total: round2(subtotal + taxAmount) };
}
