import api from '@/lib/api-client';
import type {
  PaginatedResponse,
  ServiceSubscription,
  SubscriptionPayload,
} from '@/types/api';

/**
 * Servicios recurrentes. El alta emite además la primera nota de cobro, así que lo que
 * aquí parece una creación simple deja dos registros en la base.
 */
export const subscriptionService = {
  createSubscription: async (payload: SubscriptionPayload): Promise<ServiceSubscription> => {
    const { data } = await api.post<ServiceSubscription>('/subscriptions', payload);
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
