import api from '@/lib/api-client';
import type { CollectionRow, CollectionStatus, CollectionSummary, PaginatedResponse } from '@/types/api';

export interface CollectionFilters {
  status?: CollectionStatus;
  search?: string;
  /** Vencimiento desde / hasta, en formato AAAA-MM-DD. */
  dueFrom?: string;
  dueTo?: string;
  /**
   * Qué fecha delimita el rango. `DUE` responde a «de lo que vencía en agosto, ¿cuánto
   * hay cobrado?»; `EVENT`, a «¿qué pasó en agosto?», donde una cobrada entra por su
   * fecha de pago aunque venciera el mes anterior. Sin valor, manda el vencimiento.
   */
  dateBasis?: 'DUE' | 'EVENT';
}

/**
 * Cobranzas. La lista se pagina **en el servidor**: se piden sólo las filas de la
 * página que se está viendo, nunca la tabla entera para recortarla en el navegador.
 */
export const collectionService = {
  getCollections: async (
    page = 1,
    limit = 10,
    filters: CollectionFilters = {},
  ): Promise<PaginatedResponse<CollectionRow>> => {
    const { data } = await api.get<PaginatedResponse<CollectionRow>>('/collections', {
      params: {
        page,
        limit,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.dueFrom ? { dueFrom: filters.dueFrom } : {}),
        ...(filters.dueTo ? { dueTo: filters.dueTo } : {}),
        ...(filters.dateBasis ? { dateBasis: filters.dateBasis } : {}),
      },
    });
    return data;
  },

  getSummary: async (): Promise<CollectionSummary> => {
    const { data } = await api.get<CollectionSummary>('/collections/summary');
    return data;
  },
};
