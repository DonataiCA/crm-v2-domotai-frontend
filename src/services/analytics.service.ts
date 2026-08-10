import api from '@/lib/api-client';
import {
  AnalyticsDateRange,
  AnalyticsKeyMetrics,
  SalesOverviewItem,
  RevenueByClientItem,
  FreelancerCommissionItem,
  LeadConversionItem,
} from '@/types/api';

export const analyticsService = {
  getKeyMetrics: async (dateRange?: AnalyticsDateRange): Promise<AnalyticsKeyMetrics> => {
    const { data } = await api.post<AnalyticsKeyMetrics>('/analytics/key-metrics', { dateRange });
    return data;
  },

  getSalesOverview: async (
    dateRange?: AnalyticsDateRange,
    groupBy?: 'day' | 'week' | 'month',
  ): Promise<SalesOverviewItem[]> => {
    const { data } = await api.post<SalesOverviewItem[]>('/analytics/sales-overview', { dateRange, groupBy });
    return data;
  },

  getRevenueByClient: async (dateRange?: AnalyticsDateRange): Promise<RevenueByClientItem[]> => {
    const { data } = await api.post<RevenueByClientItem[]>('/analytics/revenue-by-client', { dateRange });
    return data;
  },

  getFreelancerCommissions: async (
    dateRange?: AnalyticsDateRange,
    groupBy?: 'day' | 'week' | 'month',
  ): Promise<FreelancerCommissionItem[]> => {
    const { data } = await api.post<FreelancerCommissionItem[]>('/analytics/freelancer-commissions', { dateRange, groupBy });
    return data;
  },

  getLeadConversion: async (dateRange?: AnalyticsDateRange): Promise<LeadConversionItem[]> => {
    const { data } = await api.post<LeadConversionItem[]>('/analytics/lead-conversion', { dateRange });
    return data;
  },
};
