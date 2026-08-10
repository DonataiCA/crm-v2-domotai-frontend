import api from '@/lib/api-client';
import { Task, TaskComment, TaskLink, TaskPayload, PaginatedResponse } from '@/types/api';

export const taskService = {
  getTasks: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<PaginatedResponse<Task>> => {
    const { data } = await api.get<PaginatedResponse<Task>>('/tasks', {
      params: { page, limit, ...filters, sortBy, sortOrder },
    });
    return data;
  },

  getTask: async (id: string): Promise<Task> => {
    const { data } = await api.get<Task>(`/tasks/${id}`);
    return data;
  },

  createTask: async (taskData: TaskPayload): Promise<Task> => {
    const { data } = await api.post<Task>('/tasks', taskData);
    return data;
  },

  updateTask: async (id: string, taskData: TaskPayload): Promise<Task> => {
    const { data } = await api.put<Task>(`/tasks/${id}`, taskData);
    return data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  bulkUpdateTasks: async (ids: string[], updateData: Partial<Task>): Promise<void> => {
    await api.put('/tasks/bulk', { ids, ...updateData });
  },

  bulkDeleteTasks: async (ids: string[]): Promise<void> => {
    await api.delete('/tasks/bulk', { data: { ids } });
  },

  // ─── Comments ────────────────────────────────────────────────────────────

  addComment: async (taskId: string, content: string): Promise<TaskComment> => {
    const { data } = await api.post<TaskComment>(`/tasks/${taskId}/comments`, { content });
    return data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/tasks/comments/${commentId}`);
  },

  // ─── Links ───────────────────────────────────────────────────────────────

  addLink: async (taskId: string, linkData: { title: string; url: string; linkType?: string }): Promise<TaskLink> => {
    const { data } = await api.post<TaskLink>(`/tasks/${taskId}/links`, linkData);
    return data;
  },

  deleteLink: async (linkId: string): Promise<void> => {
    await api.delete(`/tasks/links/${linkId}`);
  },
};
