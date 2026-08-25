import type { ServiceStatus } from '@/types/api';

/**
 * Aspecto del estado del servicio.
 *
 * La baja va en **gris y no en rojo**: el rojo ya significa "moroso" en la columna de al
 * lado y son cosas distintas —un cliente puede estar al día y haber cancelado, o deber
 * dinero y seguir activo—. Dos rojos en la misma fila querrían decir cosas diferentes.
 */
const STYLES: Record<ServiceStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/** `null` cuando no hay servicio: un pago único no está ni activo ni cancelado. */
export function serviceStatusStyle(status: ServiceStatus | null | undefined) {
  return status ? STYLES[status] : null;
}
