import api from '@/lib/api-client';
import { Contact, ContactNote, FileLink, PaginatedResponse, ContactPayload } from '@/types/api';

export const contactService = {
  getContacts: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<Contact>> => {
    const { data } = await api.get<PaginatedResponse<Contact>>('/contacts', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  getContact: async (id: string): Promise<Contact> => {
    const { data } = await api.get<Contact>(`/contacts/${id}`);
    return data;
  },

  createContact: async (contactData: ContactPayload): Promise<Contact> => {
    const { data } = await api.post<Contact>('/contacts', contactData);
    return data;
  },

  updateContact: async (id: string, contactData: ContactPayload): Promise<Contact> => {
    const { data } = await api.put<Contact>(`/contacts/${id}`, contactData);
    return data;
  },

  deleteContact: async (id: string): Promise<void> => {
    await api.delete(`/contacts/${id}`);
  },

  archiveContact: async (id: string): Promise<void> => {
    await api.patch(`/contacts/${id}/archive`);
  },

  restoreContact: async (id: string): Promise<void> => {
    await api.patch(`/contacts/${id}/restore`);
  },

  getArchivedContacts: async (): Promise<{ data: { id: string; name: string; email: string | null; company: string | null; deletedAt: string }[] }> => {
    const { data } = await api.get('/contacts/archived');
    return data;
  },

  bulkDeleteContacts: async (ids: string[]): Promise<void> => {
    await api.delete('/contacts/bulk', { data: { ids } });
  },

  addNote: async (contactId: string, note: string): Promise<ContactNote> => {
    const { data } = await api.post<ContactNote>(`/contacts/${contactId}/notes`, { note });
    return data;
  },

  deleteNote: async (noteId: string): Promise<void> => {
    await api.delete(`/contacts/notes/${noteId}`);
  },

  addFile: async (contactId: string, fileData: { title: string; url: string; fileType?: string }): Promise<FileLink> => {
    const { data } = await api.post<FileLink>(`/contacts/${contactId}/files`, fileData);
    return data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/contacts/files/${fileId}`);
  },
};
