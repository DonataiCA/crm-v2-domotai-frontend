import api from '@/lib/api-client';

export const financialService = {
  getDashboard: async (dateRange?: { from?: string; to?: string }) => {
    const { data } = await api.post('/financial/dashboard', dateRange || {});
    return data;
  },
  getAging: async () => {
    const { data } = await api.post('/financial/aging', {});
    return data;
  },
  getProfitByProject: async () => {
    const { data } = await api.post('/financial/profit-by-project', {});
    return data;
  },
};
