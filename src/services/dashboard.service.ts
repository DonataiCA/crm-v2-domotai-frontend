import api from '@/lib/api-client';

interface StageStats {
  stageId: string;
  stageName: string;
  stageColor: string;
  stageOrder: number;
  stageCategory: string;
  stageWeight: number;
  leadCount: number;
  totalAmount: number;
  companyCount: number;
  companies: { id: string; name: string }[];
}

interface CommercialData {
  pipeline: { id: string; name: string } | null;
  pipelines: { id: string; name: string }[];
  stageStats: StageStats[];
  totals: {
    totalLeads: number;
    closedWon: number;
    totalRevenue: number;
    closeRate: number;
    totalAmount: number;
    closedWonAmount: number;
    weightedProjection: number;
  };
}

interface OperationalData {
  projects: {
    id: string;
    name: string;
    status: string;
    taskCount: number;
    phaseCount: number;
    startDate: string | null;
    endDate: string | null;
  }[];
  projectsByStatus: Record<string, number>;
  taskStats: { status: string; count: number }[];
  overdueTasks: number;
  totalProjects: number;
  activeProjects: number;
}

export type { CommercialData, OperationalData, StageStats };

export const dashboardService = {
  getCommercial: async (pipelineId?: string, dateFrom?: string, dateTo?: string): Promise<CommercialData> => {
    const params: Record<string, string> = {};
    if (pipelineId) params.pipelineId = pipelineId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const { data } = await api.get<CommercialData>('/dashboard/commercial', { params });
    return data;
  },

  getOperational: async (): Promise<OperationalData> => {
    const { data } = await api.get<OperationalData>('/dashboard/operational');
    return data;
  },
};
