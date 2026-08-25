/**
 * Rangos de fecha para la exportación.
 *
 * Se calculan contra una fecha que se pasa como parámetro, no contra `new Date()`: así
 * el resultado es reproducible y las fronteras de mes se pueden fijar en un test.
 *
 * Las fechas viajan como `AAAA-MM-DD` porque es lo que espera el endpoint y lo que
 * entiende un `<input type="date">`, sin husos horarios de por medio.
 */

export type RangePreset = 'MONTH' | 'QUARTER' | 'YEAR' | 'CUSTOM';

export interface DateRange {
    from: string;
    to: string;
}

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
    { value: 'MONTH', label: 'This month' },
    { value: 'QUARTER', label: 'This quarter' },
    { value: 'YEAR', label: 'This year' },
    { value: 'CUSTOM', label: 'Custom' },
];

const iso = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** El día 0 del mes siguiente es el último del mes pedido, bisiestos incluidos. */
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * `null` para `CUSTOM`: ahí las fechas las escribe la persona y no hay nada que calcular.
 */
export function rangeFor(preset: RangePreset, today: Date): DateRange | null {
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();

    if (preset === 'MONTH') {
        return { from: iso(year, month, 1), to: iso(year, month, lastDayOf(year, month)) };
    }

    if (preset === 'QUARTER') {
        const first = Math.floor(month / 3) * 3;
        const last = first + 2;
        return { from: iso(year, first, 1), to: iso(year, last, lastDayOf(year, last)) };
    }

    if (preset === 'YEAR') {
        return { from: iso(year, 0, 1), to: iso(year, 11, 31) };
    }

    return null;
}
