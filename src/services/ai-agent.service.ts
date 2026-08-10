import api from '@/lib/api-client';

export const aiAgentService = {
  chat: async (message: string): Promise<{ reply: string }> => {
    const { data } = await api.post<{ reply: string }>('/ai-agent/chat', { message });
    return data;
  },
};
