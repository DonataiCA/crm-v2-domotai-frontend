import { describe, it, expect } from 'vitest';
import { toCsv, CSV_HEADERS } from './export-csv';
import type { CollectionRow } from '@/types/api';

const row = (over: Partial<CollectionRow> = {}): CollectionRow => ({
  id: 'inv-1',
  invoiceNumber: 'SAAS-01-01',
  service: 'Plan Profesional',
  dueDate: '2026-08-30T00:00:00.000Z',
  paidAt: null,
  total: 890,
  currency: 'USD',
  status: 'SENT',
  collectionStatus: 'DUE',
  billingType: 'ONE_OFF',
  subscriptionId: null,
  serviceStatus: null,
  contact: { id: 'c-1', name: 'Constructora Andina', email: 'a@b.c' } as CollectionRow['contact'],
  project: null,
  ...over,
});

describe('toCsv', () => {
  it('empieza por la fila de cabeceras', () => {
    const [first] = toCsv([row()]).split('\n');

    expect(first.replace(/^﻿/, '')).toBe(CSV_HEADERS.join(','));
  });

  it('escribe una línea por cobro', () => {
    expect(toCsv([row(), row({ id: 'inv-2' })]).trim().split('\n')).toHaveLength(3);
  });

  it('lleva los datos que se usan para reclamar', () => {
    const csv = toCsv([row()]);

    expect(csv).toContain('Constructora Andina');
    expect(csv).toContain('a@b.c');
    expect(csv).toContain('Plan Profesional');
    expect(csv).toContain('890');
  });

  /**
   * Sin comillas, un cliente llamado "Andina, S.A." partiría la fila en dos columnas
   * y desplazaría todo lo demás. Es el fallo clásico del CSV hecho a mano.
   */
  it('entrecomilla los valores que llevan coma', () => {
    const csv = toCsv([row({ contact: { id: 'c', name: 'Andina, S.A.', email: null } as CollectionRow['contact'] })]);

    expect(csv).toContain('"Andina, S.A."');
  });

  it('duplica las comillas dentro de un valor, como manda el formato', () => {
    const csv = toCsv([row({ service: 'Plan "Pro"' })]);

    expect(csv).toContain('"Plan ""Pro"""');
  });

  it('no rompe la fila cuando el texto trae un salto de línea', () => {
    const csv = toCsv([row({ service: 'Plan\nProfesional' })]);

    expect(csv.trim().split('\n')).toHaveLength(2 + 1); // cabecera + la fila partida dentro de comillas
    expect(csv).toContain('"Plan\nProfesional"');
  });

  it('deja la celda vacía cuando no hay dato, en vez de escribir null', () => {
    const csv = toCsv([row({ service: null, contact: null })]);

    expect(csv).not.toContain('null');
    expect(csv).not.toContain('undefined');
  });

  it('exporta si el servicio sigue vivo', () => {
    expect(toCsv([row({ serviceStatus: 'CANCELLED' })])).toContain('Cancelled');
  });

  it('un pago único deja vacía la celda del servicio, no dice "activo"', () => {
    const csv = toCsv([row({ serviceStatus: null })]);

    expect(csv).not.toContain('Active');
  });

  it('lleva la periodicidad legible, no el código interno', () => {
    const csv = toCsv([row({ billingType: 'QUARTERLY' })]);

    expect(csv).toContain('Quarterly');
    expect(csv).not.toContain('QUARTERLY');
  });

  it('un cobro suelto se exporta como pago único', () => {
    expect(toCsv([row({ billingType: 'ONE_OFF' })])).toContain('One-off');
  });

  it('traduce el estado a algo legible, no el código interno', () => {
    expect(toCsv([row({ collectionStatus: 'OVERDUE' })])).toContain('Overdue');
  });

  /** Excel asume la codificación local: sin BOM, "Clínica" llega como "ClÃ­nica". */
  it('empieza con BOM para que Excel muestre bien los acentos', () => {
    expect(toCsv([row()]).startsWith('﻿')).toBe(true);
  });

  it('escribe la fecha en formato ISO corto, que Excel ordena bien', () => {
    expect(toCsv([row()])).toContain('2026-08-30');
  });
});
