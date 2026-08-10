import apiClient from '@/lib/api-client';
import type { MediaUploadResponse } from '@/types/api';

export const mediaService = {
  /**
   * Upload a file to the backend (S3).
   * Returns the public URL and key.
   */
  async uploadFile(file: File): Promise<MediaUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<MediaUploadResponse>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
