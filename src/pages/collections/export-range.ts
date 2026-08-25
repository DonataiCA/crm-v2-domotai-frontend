/**
 * Rangos de fecha para la exportación.
 *
 * Se calculan contra una fecha que se pasa como parámetro, no contra `new Date()`: así
 * el resultado es reproducible y las fronteras de mes se pueden fijar en un test.
 *
 * Las fechas viajan como `AAAA-MM-DD` porque es lo que espera el endpoint y lo que
 * entiende un `<input type="date">`, sin husos horarios de por medio.
 */

export type RangePreset = 'MONTH' | 'QUARTER' | 'HALF' | 'YEAR' | 'ALL' | 'CUSTOM';

export interface DateRange {
    from: string;
    to: string;
}

export const RANGE_PRESETS: Array<{ value: RangePreset; label: string }> = [
    { value: 'MONTH', label: 'This month' },
    { value: 'QUARTER', label: 'This quarter' },
    { value: 'HALF', label: 'This half-year' },
    { value: 'YEAR', label: 'This year' },
    { value: 'ALL', label: 'All time' },
    { value: 'CUSTOM', label: 'Custom' },
];

const iso = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** El día 0 del mes siguiente es el último del mes pedido, bisiestos incluidos. */
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * `null` en dos casos que no calculan fechas: `CUSTOM`, donde las escribe la persona, y
 * `ALL`, donde no hay rango que aplicar. `ALL` es lo que hace que el archivo cuadre con
 * las tarjetas de morosos y pendiente del panel, que tampoco filtran por fecha.
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

    if (preset === 'HALF') {
        const first = month < 6 ? 0 : 6;
        const last = first + 5;
        return { from: iso(year, first, 1), to: iso(year, last, lastDayOf(year, last)) };
    }

    if (preset === 'YEAR') {
        return { from: iso(year, 0, 1), to: iso(year, 11, 31) };
    }

    return null;
}
