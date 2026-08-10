import api from '@/lib/api-client';
import { TimeEntry, PaginatedResponse } from '@/types/api';

export const timeEntryService = {
  getTimeEntries: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<TimeEntry>> => {
    const { data } = await api.get<PaginatedResponse<TimeEntry>>('/time-entries', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  createTimeEntry: async (entryData: Record<string, unknown>): Promise<TimeEntry> => {
    const { data } = await api.post<TimeEntry>('/time-entries', entryData);
    return data;
  },

  updateTimeEntry: async (id: string, entryData: Record<string, unknown>): Promise<TimeEntry> => {
    const { data } = await api.put<TimeEntry>(`/time-entries/${id}`, entryData);
    return data;
  },

  deleteTimeEntry: async (id: string): Promise<void> => {
    await api.delete(`/time-entries/${id}`);
  },

  startTimer: async (timerData: Record<string, unknown>): Promise<TimeEntry> => {
    const { data } = await api.post<TimeEntry>('/time-entries/start', timerData);
    return data;
  },

  stopTimer: async (id: string): Promise<TimeEntry> => {
    const { data } = await api.patch<TimeEntry>(`/time-entries/${id}/stop`);
    return data;
  },
};
