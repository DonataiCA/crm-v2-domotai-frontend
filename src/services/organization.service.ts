import apiClient from '@/lib/api-client';
import type { Organization, OrganizationMember } from '@/types/api';

export const organizationService = {
  /**
   * Get all organizations the current user belongs to.
   */
  async getMyOrganizations(): Promise<Organization[]> {
    const { data } = await apiClient.get<{ data: Organization[] }>('/organizations');
    return data.data;
  },

  /**
   * Get a single organization by ID.
   */
  async getOrganization(id: string): Promise<Organization> {
    const { data } = await apiClient.get<Organization>(`/organizations/${id}`);
    return data;
  },

  /**
   * Create a new organization.
   */
  async createOrganization(payload: { name: string; slug: string }): Promise<Organization> {
    const { data } = await apiClient.post<Organization>('/organizations', payload);
    return data;
  },

  /**
   * Update an organization.
   */
  async updateOrganization(
    id: string,
    payload: Partial<{ name: string; slug: string; logoUrl: string; colorScheme: string }>,
  ): Promise<Organization> {
    const { data } = await apiClient.put<Organization>(`/organizations/${id}`, payload);
    return data;
  },

  /**
   * Delete an organization.
   */
  async deleteOrganization(id: string): Promise<void> {
    await apiClient.delete(`/organizations/${id}`);
  },

  /**
   * Get members of an organization.
   */
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data } = await apiClient.get<{ data: OrganizationMember[] }>(
      `/organizations/${organizationId}/members`,
    );
    return data.data;
  },

  /**
   * Add a member to an organization.
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: string,
  ): Promise<OrganizationMember> {
    const { data } = await apiClient.post<OrganizationMember>(
      `/organizations/${organizationId}/members`,
      { userId, role },
    );
    return data;
  },

  /**
   * Update a member's role.
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: string,
  ): Promise<OrganizationMember> {
    const { data } = await apiClient.put<OrganizationMember>(
      `/organizations/${organizationId}/members/${userId}`,
      { role },
    );
    return data;
  },

  /**
   * Remove a member from an organization.
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
  },
};
