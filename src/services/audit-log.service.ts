import api from '@/lib/api-client';
import type { AuditLog, PaginatedResponse } from '@/types/api';

export const auditLogService = {
  getLogs: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<AuditLog>> => {
    const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit-logs', {
      params: { page, limit, ...filters },
    });
    return data;
  },
};
