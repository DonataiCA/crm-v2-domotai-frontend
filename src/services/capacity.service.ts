import api from "@/lib/api-client";
import type { CapacityWeekResponse, WorkloadDetailResponse } from "@/types/capacity";

export const capacityService = {
    getWeek: async (weekStart?: string): Promise<CapacityWeekResponse> => {
        const params: Record<string, string> = {};
        if (weekStart) params.weekStart = weekStart;
        const { data } = await api.get<CapacityWeekResponse>("/capacity/week", { params });
        return data;
    },

    getWorkloadDetail: async (userId: string): Promise<WorkloadDetailResponse> => {
        const { data } = await api.get<WorkloadDetailResponse>(`/capacity/workload/${userId}`);
        return data;
    },
};
