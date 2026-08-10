import api from '@/lib/api-client';
import type { PaginatedResponse } from '@/types/api';
import type { MonitorStatus, MonitorEvent, MonitorHealthCheck, ProjectMonitorSummary } from '@/types/monitor';

export const monitorService = {
    getStatus: async (projectId: string): Promise<MonitorStatus> => {
        const { data } = await api.get<MonitorStatus>(`/projects/${projectId}/monitor/status`);
        return data;
    },

    getEvents: async (projectId: string, page = 1, limit = 50, type?: string): Promise<PaginatedResponse<MonitorEvent>> => {
        const params: Record<string, unknown> = { page, limit };
        if (type) params.type = type;
        const { data } = await api.get<PaginatedResponse<MonitorEvent>>(`/projects/${projectId}/monitor/events`, { params });
        return data;
    },

    getHealthChecks: async (projectId: string, limit = 288): Promise<{ data: MonitorHealthCheck[] }> => {
        const { data } = await api.get<{ data: MonitorHealthCheck[] }>(`/projects/${projectId}/monitor/health-checks`, { params: { limit } });
        return data;
    },

    getMetrics: async (projectId: string): Promise<{ heartbeats: MonitorEvent[]; metrics: MonitorEvent[] }> => {
        const { data } = await api.get<{ heartbeats: MonitorEvent[]; metrics: MonitorEvent[] }>(`/projects/${projectId}/monitor/metrics`);
        return data;
    },

    generateApiKey: async (projectId: string): Promise<{ apiKey: string }> => {
        const { data } = await api.post<{ apiKey: string }>(`/projects/${projectId}/monitor/generate-key`);
        return data;
    },

    getOrganizationOverview: async (): Promise<{ data: ProjectMonitorSummary[] }> => {
        const { data } = await api.get<{ data: ProjectMonitorSummary[] }>('/projects/monitor/overview');
        return data;
    },
};
