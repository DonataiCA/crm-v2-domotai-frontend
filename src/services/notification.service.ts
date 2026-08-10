import api from '@/lib/api-client';
import type { Notification, NotificationPreference, NotificationPreferencesResponse, PaginatedResponse } from '@/types/api';

export const notificationService = {
    getNotifications: async (page = 1, limit = 20, read?: boolean): Promise<PaginatedResponse<Notification>> => {
        const params: Record<string, unknown> = { page, limit };
        if (read !== undefined) params.read = read;
        const { data } = await api.get<PaginatedResponse<Notification>>('/notifications', { params });
        return data;
    },

    getUnreadCount: async (): Promise<{ count: number }> => {
        const { data } = await api.get<{ count: number }>('/notifications/unread-count');
        return data;
    },

    markAsRead: async (id: string): Promise<{ success: boolean }> => {
        const { data } = await api.patch<{ success: boolean }>(`/notifications/${id}/read`);
        return data;
    },

    markAllAsRead: async (): Promise<{ success: boolean }> => {
        const { data } = await api.patch<{ success: boolean }>('/notifications/read-all');
        return data;
    },

    deleteNotification: async (id: string): Promise<void> => {
        await api.delete(`/notifications/${id}`);
    },

    getPreferences: async (): Promise<NotificationPreferencesResponse> => {
        const { data } = await api.get<NotificationPreferencesResponse>('/notifications/preferences');
        return data;
    },

    updatePreferences: async (preferences: Array<{ notificationType: string; channel: string; enabled: boolean }>): Promise<{ data: NotificationPreference[] }> => {
        const { data } = await api.put<{ data: NotificationPreference[] }>('/notifications/preferences', { preferences });
        return data;
    },
};
