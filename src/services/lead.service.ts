import api from '@/lib/api-client';
import { Lead, LeadEvent, LeadPayload, PaginatedResponse } from '@/types/api';

export const leadService = {
  getLeads: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<Lead>> => {
    const { data } = await api.get<PaginatedResponse<Lead>>('/leads', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  getLead: async (id: string): Promise<Lead> => {
    const { data } = await api.get<Lead>(`/leads/${id}`);
    return data;
  },

  createLead: async (leadData: LeadPayload): Promise<Lead> => {
    const { data } = await api.post<Lead>('/leads', leadData);
    return data;
  },

  updateLead: async (id: string, leadData: LeadPayload): Promise<Lead> => {
    const { data } = await api.put<Lead>(`/leads/${id}`, leadData);
    return data;
  },

  deleteLead: async (id: string): Promise<void> => {
    await api.delete(`/leads/${id}`);
  },

  archiveLead: async (id: string): Promise<void> => {
    await api.patch(`/leads/${id}/archive`);
  },

  restoreLead: async (id: string): Promise<void> => {
    await api.patch(`/leads/${id}/restore`);
  },

  getArchivedLeads: async (): Promise<{ data: { id: string; name: string | null; stage: string | null; deletedAt: string }[] }> => {
    const { data } = await api.get('/leads/archived');
    return data;
  },

  addEvent: async (leadId: string, eventData: { eventType: string; description: string }): Promise<LeadEvent> => {
    const { data } = await api.post<LeadEvent>(`/leads/${leadId}/events`, eventData);
    return data;
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    await api.delete(`/leads/events/${eventId}`);
  },

  convertLead: async (leadId: string, projectId: string): Promise<Lead> => {
    const { data } = await api.post<Lead>(`/leads/${leadId}/convert`, { projectId });
    return data;
  },

  addFile: async (leadId: string, fileData: { title: string; url: string; fileType?: string }) => {
    const { data } = await api.post(`/leads/${leadId}/files`, fileData);
    return data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/leads/files/${fileId}`);
  },
};
