import api from '@/lib/api-client';
import type { Pipeline, PipelineStage } from '@/types/api';

export const STAGE_COLORS = ['blue', 'indigo', 'violet', 'amber', 'green', 'red', 'slate', 'orange', 'pink', 'cyan'] as const;
export type StageColor = typeof STAGE_COLORS[number];

export const pipelineService = {
    getAll: async (): Promise<Pipeline[]> => {
        const { data } = await api.get<Pipeline[]>('/pipelines');
        return data;
    },

    getById: async (id: string): Promise<Pipeline> => {
        const { data } = await api.get<Pipeline>(`/pipelines/${id}`);
        return data;
    },

    create: async (name: string): Promise<Pipeline> => {
        const { data } = await api.post<Pipeline>('/pipelines', { name });
        return data;
    },

    update: async (id: string, name: string): Promise<Pipeline> => {
        const { data } = await api.put<Pipeline>(`/pipelines/${id}`, { name });
        return data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/pipelines/${id}`);
    },

    addStage: async (pipelineId: string, stageData: { name: string; slug: string; color: StageColor; order: number; category?: string; weight?: number }): Promise<PipelineStage> => {
        const { data } = await api.post<PipelineStage>(`/pipelines/${pipelineId}/stages`, stageData);
        return data;
    },

    updateStage: async (pipelineId: string, stageId: string, stageData: { name?: string; color?: StageColor; order?: number; category?: string; weight?: number }): Promise<PipelineStage> => {
        const { data } = await api.put<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}`, stageData);
        return data;
    },

    deleteStage: async (pipelineId: string, stageId: string): Promise<void> => {
        await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
    },

    reorderStages: async (pipelineId: string, stageIds: string[]): Promise<Pipeline> => {
        const { data } = await api.put<Pipeline>(`/pipelines/${pipelineId}/stages/reorder`, { stageIds });
        return data;
    },
};
