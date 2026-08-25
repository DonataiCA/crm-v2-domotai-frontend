import api from '@/lib/api-client';
import type {
  BillingInterval,
  PaginatedResponse,
  ServiceSubscription,
  SubscriptionPayload,
} from '@/types/api';

/** Lo que se puede cambiar de un servicio vivo. La fecha de inicio no: descuadraría lo emitido. */
export interface SubscriptionChanges {
  serviceName?: string;
  amount?: number;
  interval?: BillingInterval;
}

/**
 * Servicios recurrentes. El alta emite además la primera nota de cobro, así que lo que
 * aquí parece una creación simple deja dos registros en la base.
 */
export const subscriptionService = {
  createSubscription: async (payload: SubscriptionPayload): Promise<ServiceSubscription> => {
    const { data } = await api.post<ServiceSubscription>('/subscriptions', payload);
    return data;
  },

  updateSubscription: async (
    id: string,
    changes: SubscriptionChanges,
  ): Promise<ServiceSubscription> => {
    const { data } = await api.patch<ServiceSubscription>(`/subscriptions/${id}`, changes);
    return data;
  },

  cancelSubscription: async (id: string): Promise<ServiceSubscription> => {
    const { data } = await api.post<ServiceSubscription>(`/subscriptions/${id}/cancel`);
    return data;
  },

  getSubscriptions: async (
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<ServiceSubscription>> => {
    const { data } = await api.get<PaginatedResponse<ServiceSubscription>>('/subscriptions', {
      params: { page, limit },
    });
    return data;
  },
};
