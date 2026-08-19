import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  LEAD_DATE_PRESETS,
  filterLeadsByCreatedAt,
  isLeadInRange,
  resolvePreset,
} from './lead-date-filter';

// Todo se construye en hora LOCAL a propósito. El calendario devuelve medianoche
// local y el usuario razona en días locales, mientras que el backend manda ISO en
// UTC; construir las fechas con `new Date('2026-08-01')` sería medianoche UTC y
// desplazaría el rango un día en cualquier zona horaria negativa.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
/** Instante local, en el formato ISO en UTC que devuelve el backend. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

const NOW = new Date(2026, 7, 19, 15, 30); // 19 de agosto de 2026, hora local
const AGOSTO: DateRange = { from: day(2026, 8, 1), to: day(2026, 8, 31) };

describe('resolvePreset', () => {
  it('devuelve undefined para "all", que es la ausencia de filtro', () => {
    expect(resolvePreset('all', NOW)).toBeUndefined();
  });

  it('"last30days" cubre 30 días contando hoy', () => {
    const range = resolvePreset('last30days', NOW)!;
    // 30 días incluyendo el de hoy → el primero es 29 días atrás, no 30.
    expect(format(range.from!, 'yyyy-MM-dd')).toBe('2026-07-21');
    expect(format(range.to!, 'yyyy-MM-dd')).toBe('2026-08-19');
  });

  it('"last3months" retrocede tres meses naturales', () => {
    expect(format(resolvePreset('last3months', NOW)!.from!, 'yyyy-MM-dd')).toBe('2026-05-19');
  });

  it('"thisYear" arranca el 1 de enero', () => {
    expect(format(resolvePreset('thisYear', NOW)!.from!, 'yyyy-MM-dd')).toBe('2026-01-01');
  });

  it('todo atajo del catálogo se resuelve y llega hasta hoy', () => {
    for (const preset of LEAD_DATE_PRESETS) {
      const range = resolvePreset(preset.value, NOW);
      if (preset.value === 'all') {
        expect(range).toBeUndefined();
      } else {
        expect(format(range!.to!, 'yyyy-MM-dd')).toBe('2026-08-19');
      }
    }
  });
});

describe('isLeadInRange', () => {
  it('sin rango no oculta nada', () => {
    expect(isLeadInRange(at(2020, 1, 1), undefined)).toBe(true);
  });

  it('un rango sin fecha de inicio tampoco oculta nada', () => {
    expect(isLeadInRange(at(2020, 1, 1), { from: undefined })).toBe(true);
  });

  it('acepta una fecha dentro del rango', () => {
    expect(isLeadInRange(at(2026, 8, 15), AGOSTO)).toBe(true);
  });

  it('descarta lo anterior al rango', () => {
    expect(isLeadInRange(at(2026, 7, 31, 23), AGOSTO)).toBe(false);
  });

  it('descarta lo posterior al rango', () => {
    expect(isLeadInRange(at(2026, 9, 1, 0), AGOSTO)).toBe(false);
  });

  it('el extremo inicial es inclusivo desde el primer instante del día', () => {
    expect(isLeadInRange(at(2026, 8, 1, 0), AGOSTO)).toBe(true);
  });

  it('el extremo final es inclusivo hasta el último instante del día', () => {
    // Sin `endOfDay` esto fallaría: `to` es medianoche y el lead es de por la tarde.
    expect(isLeadInRange(at(2026, 8, 31, 18), AGOSTO)).toBe(true);
  });

  it('un rango de un solo día incluye ese día entero', () => {
    const unDia: DateRange = { from: day(2026, 8, 19), to: day(2026, 8, 19) };
    expect(isLeadInRange(at(2026, 8, 19, 23), unDia)).toBe(true);
    expect(isLeadInRange(at(2026, 8, 20, 0), unDia)).toBe(false);
  });

  it('sin fecha de fin se comporta como "desde ... en adelante"', () => {
    const desde: DateRange = { from: day(2026, 8, 1) };
    expect(isLeadInRange(at(2030, 1, 1), desde)).toBe(true);
    expect(isLeadInRange(at(2026, 7, 1), desde)).toBe(false);
  });

  it('nunca oculta un lead por no tener fecha o tenerla corrupta', () => {
    // Ocultar por falta de dato haría desaparecer leads sin que el usuario sepa por qué.
    expect(isLeadInRange(null, AGOSTO)).toBe(true);
    expect(isLeadInRange(undefined, AGOSTO)).toBe(true);
    expect(isLeadInRange('no es una fecha', AGOSTO)).toBe(true);
  });
});

describe('filterLeadsByCreatedAt', () => {
  const leads = [
    { id: 'agosto', createdAt: at(2026, 8, 15) },
    { id: 'junio', createdAt: at(2026, 6, 15) },
    { id: 'fin-de-agosto', createdAt: at(2026, 8, 31, 20) },
    { id: 'sin-fecha', createdAt: null },
  ];

  it('sin rango devuelve la misma lista', () => {
    expect(filterLeadsByCreatedAt(leads, undefined)).toHaveLength(4);
  });

  it('deja fuera lo anterior al rango y conserva lo que no tiene fecha', () => {
    expect(filterLeadsByCreatedAt(leads, AGOSTO).map(l => l.id)).toEqual([
      'agosto',
      'fin-de-agosto',
      'sin-fecha',
    ]);
  });

  it('conserva el orden original', () => {
    const anio: DateRange = { from: day(2026, 1, 1), to: day(2026, 12, 31) };
    expect(filterLeadsByCreatedAt(leads, anio).map(l => l.id)).toEqual(leads.map(l => l.id));
  });
});
