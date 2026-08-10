import apiClient, { setToken, clearToken, clearOrganizationId, getToken } from '@/lib/api-client';
import type { AuthResponse, User } from '@/types/api';

export const authService = {
  /**
   * Login with email and password.
   * Stores the JWT token on success.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/users/login', {
      email,
      password,
    });
    setToken(data.token);
    return data;
  },

  /**
   * Change the current user's password.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put('/users/change-password', { currentPassword, newPassword });
  },

  /**
   * Logout the current user.
   * Clears the JWT token and organization ID from storage.
   */
  async logout(): Promise<void> {
    const token = getToken();
    if (token) {
      try {
        await apiClient.post('/users/logout');
      } catch {
        // Ignore errors during logout -- token will be cleared regardless
      }
    }
    clearToken();
    clearOrganizationId();
  },

  /**
   * Get the current user's profile.
   * Used to validate the stored token and retrieve user data.
   */
  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<User>('/users/profile');
    return data;
  },

  /**
   * Update the current user (used for password change, org switch, etc.).
   */
  async updateUser(userId: string, updates: Partial<User> & { password?: string }): Promise<User> {
    const { data } = await apiClient.put<User>(`/users/${userId}`, updates);
    return data;
  },
};
