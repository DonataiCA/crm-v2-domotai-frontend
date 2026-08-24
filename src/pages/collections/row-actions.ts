import type { CollectionRow } from '@/types/api';

/**
 * Qué se puede hacer con un cobro desde la lista.
 *
 * Vive aparte del componente para poder fijar las reglas con tests: cuáles se ofrecen
 * es una decisión de negocio, no de maquetación. La regla general es **no ofrecer lo
 * que va a fallar** — un recordatorio a un cliente sin email es un clic que sólo puede
 * terminar en error.
 */
export type RowAction =
    | 'markPaid'
    | 'sendReminder'
    | 'downloadPdf'
    | 'viewInvoice'
    | 'viewContact';

export function availableActions(row: CollectionRow): RowAction[] {
    const actions: RowAction[] = [];
    const isPaid = row.collectionStatus === 'PAID';

    // Marcar pagada no se ofrece dos veces: revertirlo no es limpio, porque
    // "marcar como enviada" cambia el estado pero deja la fecha de pago puesta,
    // y esta página considera pagado todo lo que la tenga.
    if (!isPaid) actions.push('markPaid');

    // Reclamar algo ya cobrado es el peor correo que se le puede mandar a un cliente.
    if (!isPaid && row.contact?.email) actions.push('sendReminder');

    actions.push('downloadPdf', 'viewInvoice');

    if (row.contact?.id) actions.push('viewContact');

    return actions;
}
