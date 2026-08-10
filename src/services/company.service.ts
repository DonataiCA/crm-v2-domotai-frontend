import api from '@/lib/api-client';
import type { Company, CompanyPayload, PaginatedResponse } from '@/types/api';

export const companyService = {
  getCompanies: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<Company>> => {
    const { data } = await api.get<PaginatedResponse<Company>>('/companies', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  getCompany: async (id: string): Promise<Company> => {
    const { data } = await api.get<Company>(`/companies/${id}`);
    return data;
  },

  createCompany: async (companyData: CompanyPayload): Promise<Company> => {
    const { data } = await api.post<Company>('/companies', companyData);
    return data;
  },

  updateCompany: async (id: string, companyData: CompanyPayload): Promise<Company> => {
    const { data } = await api.put<Company>(`/companies/${id}`, companyData);
    return data;
  },

  deleteCompany: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },

  addFile: async (companyId: string, fileData: { title: string; url: string; fileType?: string }) => {
    const { data } = await api.post(`/companies/${companyId}/files`, fileData);
    return data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/companies/files/${fileId}`);
  },
};
