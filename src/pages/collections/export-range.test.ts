import { describe, it, expect } from 'vitest';
import { rangeFor, RANGE_PRESETS, type RangePreset } from './export-range';

/**
 * Los rangos se calculan contra una fecha dada y no contra `new Date()`: si no, estos
 * tests dependerían del día en que se ejecutan y las fronteras de mes serían imposibles
 * de fijar.
 */
const AGOSTO = new Date('2026-08-24T15:00:00.000Z');

describe('rangeFor', () => {
  it('el mes va del día 1 al último, no de hoy a hoy', () => {
    expect(rangeFor('MONTH', AGOSTO)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('el trimestre cubre sus tres meses completos', () => {
    // Agosto cae en el tercer trimestre: julio a septiembre.
    expect(rangeFor('QUARTER', AGOSTO)).toEqual({ from: '2026-07-01', to: '2026-09-30' });
  });

  it('el año va de enero a diciembre', () => {
    expect(rangeFor('YEAR', AGOSTO)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('un mes de 30 días termina el 30', () => {
    expect(rangeFor('MONTH', new Date('2026-09-15T00:00:00.000Z')).to).toBe('2026-09-30');
  });

  it('febrero de un bisiesto termina el 29', () => {
    expect(rangeFor('MONTH', new Date('2028-02-10T00:00:00.000Z')).to).toBe('2028-02-29');
  });

  it('el primer trimestre empieza en enero', () => {
    expect(rangeFor('QUARTER', new Date('2026-02-10T00:00:00.000Z')))
      .toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });

  it('el último trimestre termina en diciembre', () => {
    expect(rangeFor('QUARTER', new Date('2026-11-30T00:00:00.000Z')))
      .toEqual({ from: '2026-10-01', to: '2026-12-31' });
  });

  /** El rango a medida lo escribe la persona: no hay nada que calcular. */
  it('el rango personalizado no calcula nada', () => {
    expect(rangeFor('CUSTOM', AGOSTO)).toBeNull();
  });
});

describe('RANGE_PRESETS', () => {
  it('ofrece mes, trimestre, año y a medida', () => {
    expect(RANGE_PRESETS.map((p) => p.value))
      .toEqual(['MONTH', 'QUARTER', 'YEAR', 'CUSTOM'] as RangePreset[]);
  });

  it('cada opción se lee sin tecnicismos', () => {
    expect(RANGE_PRESETS.map((p) => p.label))
      .toEqual(['This month', 'This quarter', 'This year', 'Custom']);
  });
});
