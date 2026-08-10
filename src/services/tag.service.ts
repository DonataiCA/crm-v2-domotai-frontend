import api from '@/lib/api-client';
import type { Tag } from '@/types/api';

export const tagService = {
  getAll: async (): Promise<Tag[]> => {
    const { data } = await api.get<Tag[]>('/tags');
    return data;
  },

  create: async (name: string, color?: string): Promise<Tag> => {
    const { data } = await api.post<Tag>('/tags', { name, color });
    return data;
  },

  update: async (tagId: string, updates: { name?: string; color?: string }): Promise<Tag> => {
    const { data } = await api.put<Tag>(`/tags/${tagId}`, updates);
    return data;
  },

  delete: async (tagId: string): Promise<void> => {
    await api.delete(`/tags/${tagId}`);
  },

  setTaskTags: async (taskId: string, tagIds: string[]): Promise<Tag[]> => {
    const { data } = await api.put<Tag[]>(`/tags/tasks/${taskId}`, { tagIds });
    return data;
  },

  addTagToTask: async (taskId: string, tagId: string): Promise<void> => {
    await api.post(`/tags/tasks/${taskId}/${tagId}`);
  },

  removeTagFromTask: async (taskId: string, tagId: string): Promise<void> => {
    await api.delete(`/tags/tasks/${taskId}/${tagId}`);
  },
};
