import apiClient from '@/lib/api-client';

export interface ShareLink {
  id: string;
  shareToken: string;
  clientEmail: string | null;
  clientName: string | null;
  permissions: string[];
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateShareData {
  clientEmail?: string;
  clientName?: string;
  permissions?: string[];
  expiresAt?: string;
}

export const portalService = {
  createShareLink: async (projectId: string, data: CreateShareData): Promise<ShareLink> => {
    const payload = {
      ...data,
      permissions: Array.isArray(data.permissions) ? data.permissions.join(',') : data.permissions,
    };
    const { data: result } = await apiClient.post(`/portal/projects/${projectId}/share`, payload);
    return result;
  },

  getShareLinks: async (projectId: string): Promise<ShareLink[]> => {
    const { data } = await apiClient.get(`/portal/projects/${projectId}/shares`);
    return data.data || data;
  },

  revokeShareLink: async (shareId: string): Promise<void> => {
    await apiClient.delete(`/portal/projects/shares/${shareId}`);
  },
};
