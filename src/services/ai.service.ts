import api from '@/lib/api-client';
import type { ProjectPhase, AIGenerateTasksResponse } from '@/types/api';

export const aiService = {
  generateTasks: async (
    projectId: string,
    phases: Partial<ProjectPhase>[],
  ): Promise<AIGenerateTasksResponse> => {
    const { data } = await api.post(`/projects/${projectId}/generate-tasks`, { phases });
    return data;
  },
};
