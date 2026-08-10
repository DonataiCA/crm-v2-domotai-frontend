import api from '@/lib/api-client';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const exportService = {
  exportProjectsCSV: async (): Promise<void> => {
    const response = await api.get('/export/projects', { responseType: 'blob' });
    downloadBlob(response.data, 'projects.csv');
  },

  exportLeadsCSV: async (): Promise<void> => {
    const response = await api.get('/export/leads', { responseType: 'blob' });
    downloadBlob(response.data, 'leads.csv');
  },

  exportContactsCSV: async (): Promise<void> => {
    const response = await api.get('/export/contacts', { responseType: 'blob' });
    downloadBlob(response.data, 'contacts.csv');
  },

  exportInvoicesCSV: async (): Promise<void> => {
    const response = await api.get('/export/invoices', { responseType: 'blob' });
    downloadBlob(response.data, 'invoices.csv');
  },

  exportTimeEntriesCSV: async (): Promise<void> => {
    const response = await api.get('/export/time-entries', { responseType: 'blob' });
    downloadBlob(response.data, 'time-entries.csv');
  },
};
