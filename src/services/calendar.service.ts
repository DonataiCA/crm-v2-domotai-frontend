import api from '@/lib/api-client';
import type { CalendarEvent, CalendarOverview } from '@/types/api';

export const calendarService = {
  getEvents: async (filters?: {
    dateFrom?: string;
    dateTo?: string;
    contactId?: string;
    leadId?: string;
    projectId?: string;
  }): Promise<CalendarEvent[]> => {
    const { data } = await api.get<CalendarEvent[]>('/calendar', { params: filters });
    return data;
  },

  /**
   * Eventos del rango más los hitos derivados de proyectos y fases en una sola
   * llamada. `sources` es un CSV: omitirlo pide todas las fuentes.
   */
  getOverview: async (filters: {
    dateFrom: string;
    dateTo: string;
    sources?: string;
  }): Promise<CalendarOverview> => {
    const { data } = await api.get<CalendarOverview>('/calendar/overview', { params: filters });
    return data;
  },

  createEvent: async (eventData: Record<string, unknown>): Promise<CalendarEvent> => {
    const { data } = await api.post<CalendarEvent>('/calendar', eventData);
    return data;
  },

  updateEvent: async (id: string, eventData: Record<string, unknown>): Promise<CalendarEvent> => {
    const { data } = await api.put<CalendarEvent>(`/calendar/${id}`, eventData);
    return data;
  },

  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`/calendar/${id}`);
  },
};
