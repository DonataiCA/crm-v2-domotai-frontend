import { endOfDay, startOfDay, startOfYear, subDays, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';

/**
 * Filtrado de leads por fecha de creación, para aligerar columnas muy cargadas
 * del tablero (típicamente la de ganados, que sólo crece).
 *
 * Se filtra por `createdAt` y no por la fecha en que el lead se ganó porque esa
 * fecha **no se guarda**: `lead_stage_history` no la escribe nadie y tanto
 * `paymentDate` como `convertedAt` están vacíos. Si algún día se registra, este
 * módulo es el único sitio que hay que tocar.
 *
 * Todo el rango se interpreta en **días locales**: el usuario razona en su
 * calendario, mientras que el backend manda ISO en UTC. De ahí el `startOfDay` /
 * `endOfDay`, sin los cuales un lead de la tarde del último día quedaría fuera.
 */

export type LeadDatePreset = 'all' | 'last30days' | 'last3months' | 'thisYear';

export const LEAD_DATE_PRESETS: ReadonlyArray<{ value: LeadDatePreset; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last3months', label: 'Last 3 months' },
  { value: 'thisYear', label: 'This year' },
];

/** Estado del filtro de una etapa: el atajo elegido y el rango que produce. */
export interface StageDateFilterValue {
  preset: LeadDatePreset | 'custom';
  range: DateRange | undefined;
}

/** Sin filtro: se ve todo. */
export const NO_DATE_FILTER: StageDateFilterValue = { preset: 'all', range: undefined };

/**
 * Convierte un atajo en un rango concreto. `now` se recibe por parámetro para que
 * el resultado sea comprobable sin depender del reloj de la máquina.
 */
export function resolvePreset(preset: LeadDatePreset, now: Date = new Date()): DateRange | undefined {
  switch (preset) {
    case 'all':
      return undefined;
    case 'last30days':
      // 30 días contando el de hoy, así que se retrocede 29.
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'last3months':
      return { from: startOfDay(subMonths(now, 3)), to: endOfDay(now) };
    case 'thisYear':
      return { from: startOfYear(now), to: endOfDay(now) };
  }
}

/**
 * ¿Cae la fecha de creación dentro del rango? Inclusivo en ambos extremos.
 *
 * Un lead sin fecha, o con una fecha que no se puede interpretar, **siempre se
 * muestra**: ocultarlo por falta de dato lo haría desaparecer sin que nadie
 * pueda saber por qué.
 */
export function isLeadInRange(
  createdAt: string | null | undefined,
  range: DateRange | undefined,
): boolean {
  if (!range?.from) return true;
  if (!createdAt) return true;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return true;

  if (created < startOfDay(range.from)) return false;
  // Sin `to` el rango es abierto por la derecha: "desde esta fecha en adelante".
  if (range.to && created > endOfDay(range.to)) return false;
  return true;
}

/** Aplica el rango a una lista de leads conservando su orden. */
export function filterLeadsByCreatedAt<T extends { createdAt?: string | null }>(
  leads: T[],
  range: DateRange | undefined,
): T[] {
  if (!range?.from) return leads;
  return leads.filter((lead) => isLeadInRange(lead.createdAt, range));
}
