import type { CollectionRow } from '@/types/api';

/**
 * Exportación de la lista de cobranzas a CSV.
 *
 * Se genera en el navegador con lo que el servidor ya devolvió: no hay endpoint de
 * exportación porque el formato es cosa de quien lo lee, no del API, y así el archivo
 * lleva exactamente las mismas columnas que la tabla que se está mirando.
 */

export const CSV_HEADERS = [
    'Client',
    'Email',
    'Service',
    'Invoice number',
    'Due date',
    'Amount',
    'Currency',
    'Status',
    'Days late',
] as const;

/** Etiquetas legibles: el archivo lo abre una persona, no el propio sistema. */
const STATUS_LABELS: Record<CollectionRow['collectionStatus'], string> = {
    PAID: 'Paid',
    DUE: 'Due',
    OVERDUE: 'Overdue',
};

/**
 * Un campo CSV se entrecomilla si lleva coma, comillas o salto de línea, y las comillas
 * de dentro se duplican. Sin esto, un cliente llamado `Andina, S.A.` parte la fila en
 * dos columnas y desplaza todo lo que viene detrás.
 */
function escape(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** `2026-08-30T00:00:00Z` → `2026-08-30`: Excel lo ordena como fecha. */
function isoDate(value: string | null): string {
    return value ? value.slice(0, 10) : '';
}

function daysLate(row: CollectionRow): string {
    if (row.collectionStatus !== 'OVERDUE' || !row.dueDate) return '';
    const days = Math.floor((Date.now() - new Date(row.dueDate).getTime()) / 86_400_000);
    return days > 0 ? String(days) : '';
}

export function toCsv(rows: CollectionRow[]): string {
    const lines = [
        CSV_HEADERS.join(','),
        ...rows.map((row) =>
            [
                escape(row.contact?.name),
                escape(row.contact?.email),
                escape(row.service),
                escape(row.invoiceNumber),
                escape(isoDate(row.dueDate)),
                escape(row.total ?? 0),
                escape(row.currency),
                escape(STATUS_LABELS[row.collectionStatus]),
                escape(daysLate(row)),
            ].join(','),
        ),
    ];

    // El BOM es lo que hace que Excel lea el archivo como UTF-8. Sin él, "Clínica"
    // aparece como "ClÃ­nica" en cuanto alguien lo abre con doble clic en Windows.
    return `﻿${lines.join('\n')}\n`;
}
