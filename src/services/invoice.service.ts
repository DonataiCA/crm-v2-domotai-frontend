import api from '@/lib/api-client';
import { Invoice, PaginatedResponse } from '@/types/api';

export const invoiceService = {
  getInvoices: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<Invoice>> => {
    const { data } = await api.get<PaginatedResponse<Invoice>>('/invoices', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },

  createInvoice: async (invoiceData: Record<string, unknown>): Promise<Invoice> => {
    const { data } = await api.post<Invoice>('/invoices', invoiceData);
    return data;
  },

  updateInvoice: async (id: string, invoiceData: Record<string, unknown>): Promise<Invoice> => {
    const { data } = await api.put<Invoice>(`/invoices/${id}`, invoiceData);
    return data;
  },

  deleteInvoice: async (id: string): Promise<void> => {
    await api.delete(`/invoices/${id}`);
  },

  markAsPaid: async (id: string): Promise<Invoice> => {
    const { data } = await api.patch<Invoice>(`/invoices/${id}/mark-paid`);
    return data;
  },

  markAsSent: async (id: string): Promise<Invoice> => {
    const { data } = await api.patch<Invoice>(`/invoices/${id}/mark-sent`);
    return data;
  },

  downloadPDF: async (id: string, invoiceNumber: string): Promise<void> => {
    const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  sendByEmail: async (id: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/invoices/${id}/send`);
    return data;
  },
};
