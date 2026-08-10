import api from "@/lib/api-client";
import type {
    IncidentDTO,
    IncidentEventDTO,
    IncidentSummary,
    CreateIncidentPayload,
    UpdateIncidentPayload,
    AddIncidentEventPayload,
} from "@/types/incident";

interface ListResponse {
    data: IncidentDTO[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListIncidentFilters {
    status?: string;
    severity?: string;
    projectId?: string;
    ownerId?: string;
    page?: number;
    limit?: number;
}

export const incidentService = {
    list: async (filters: ListIncidentFilters = {}): Promise<ListResponse> => {
        const { data } = await api.get<ListResponse>("/incidents", { params: filters });
        return data;
    },

    summary: async (): Promise<IncidentSummary> => {
        const { data } = await api.get<IncidentSummary>("/incidents/summary");
        return data;
    },

    get: async (id: string): Promise<IncidentDTO> => {
        const { data } = await api.get<IncidentDTO>(`/incidents/${id}`);
        return data;
    },

    create: async (payload: CreateIncidentPayload): Promise<IncidentDTO> => {
        const { data } = await api.post<IncidentDTO>("/incidents", payload);
        return data;
    },

    update: async (id: string, payload: UpdateIncidentPayload): Promise<IncidentDTO> => {
        const { data } = await api.patch<IncidentDTO>(`/incidents/${id}`, payload);
        return data;
    },

    addEvent: async (id: string, payload: AddIncidentEventPayload): Promise<IncidentEventDTO> => {
        const { data } = await api.post<IncidentEventDTO>(`/incidents/${id}/events`, payload);
        return data;
    },
};
