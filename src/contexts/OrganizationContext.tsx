import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { organizationService } from '@/services/organization.service';
import { mediaService } from '@/services/media.service';
import { authService } from '@/services/auth.service';
import { setOrganizationId } from '@/lib/api-client';
import type { Organization as ApiOrganization } from '@/types/api';

// Keep snake_case for component compatibility (60+ components reference logo_url / color_scheme)
export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  color_scheme: 'default' | 'blue' | 'green' | 'purple' | 'dark';
  role: string;
};

type OrganizationContextType = {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (data: { name: string; slug: string }) => Promise<void>;
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<void>;
  uploadLogo: (id: string, file: File) => Promise<string>;
  inviteUser: (organizationId: string, email: string, role: string) => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType>({
  organizations: [],
  currentOrganization: null,
  isLoading: true,
  switchOrganization: async () => {},
  createOrganization: async () => {},
  updateOrganization: async () => {},
  uploadLogo: async () => '',
  inviteUser: async () => {},
});

export const useOrganization = () => useContext(OrganizationContext);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map backend camelCase org to frontend snake_case Organization */
function toFrontend(org: ApiOrganization): Organization {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo_url: org.logoUrl,
    color_scheme: (org.colorScheme?.toLowerCase() ?? 'default') as Organization['color_scheme'],
    role: org.role ?? 'member',
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { session, currentOrganizationId: cachedOrgId } = useAuth();
  const { toast } = useToast();

  const fetchOrganizations = async () => {
    if (!session?.user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const apiOrgs = await organizationService.getMyOrganizations();
      const orgs = apiOrgs.map(toFrontend);

      if (orgs.length > 0) {
        setOrganizations(orgs);

        // Determine which org to set as current (use cached value from AuthContext)
        if (cachedOrgId) {
          const currentOrg = orgs.find((o) => o.id === cachedOrgId);
          if (currentOrg) {
            setCurrentOrganization(currentOrg);
            setOrganizationId(currentOrg.id);
          } else {
            // Stored org not in user's orgs -- fall back to first
            setCurrentOrganization(orgs[0]);
            setOrganizationId(orgs[0].id);
            await authService.updateUser(session.user.id, {
              currentOrganizationId: orgs[0].id,
            });
          }
        } else {
          // No current org -- set the first one
          setCurrentOrganization(orgs[0]);
          setOrganizationId(orgs[0].id);
          await authService.updateUser(session.user.id, {
            currentOrganizationId: orgs[0].id,
          });
        }
      } else {
        setOrganizations([]);
        setCurrentOrganization(null);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load organizations',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch orgs when session becomes available
  useEffect(() => {
    if (session?.user?.id) {
      const timeoutId = setTimeout(() => {
        fetchOrganizations();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Auto-select first organization if none is selected
  useEffect(() => {
    if (!isLoading && !currentOrganization && organizations.length > 0 && session?.user) {
      switchOrganization(organizations[0].id);
    }
  }, [isLoading, currentOrganization, organizations, session?.user]);

  const switchOrganization = async (organizationId: string) => {
    if (!session?.user) return;

    try {
      const org = organizations.find((o) => o.id === organizationId);
      if (!org) {
        throw new Error('Organization not found');
      }

      await authService.updateUser(session.user.id, {
        currentOrganizationId: organizationId,
      });
      setOrganizationId(organizationId);
      setCurrentOrganization(org);

      toast({
        title: 'Organization Switched',
        description: `You are now working in ${org.name}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to switch organization',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const createOrganization = async (data: { name: string; slug: string }) => {
    if (!session?.user) return;

    try {
      const newOrg = await organizationService.createOrganization(data);

      // Refresh list then switch to the new org
      await fetchOrganizations();
      await switchOrganization(newOrg.id);

      toast({
        title: 'Organization Created',
        description: `${newOrg.name} has been created successfully`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create organization',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const updateOrganization = async (id: string, data: Partial<Organization>) => {
    try {
      // Map snake_case fields to camelCase for the API
      const apiPayload: Record<string, string | undefined> = {};
      if (data.name !== undefined) apiPayload.name = data.name;
      if (data.slug !== undefined) apiPayload.slug = data.slug;
      if (data.logo_url !== undefined) apiPayload.logoUrl = data.logo_url ?? undefined;
      if (data.color_scheme !== undefined) apiPayload.colorScheme = data.color_scheme?.toUpperCase();

      await organizationService.updateOrganization(id, apiPayload);

      // Refresh organizations list
      await fetchOrganizations();

      toast({
        title: 'Organization Updated',
        description: 'Organization settings have been updated',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update organization',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const uploadLogo = async (id: string, file: File): Promise<string> => {
    try {
      const result = await mediaService.uploadFile(file);
      const logoUrl = result.url;

      // Update organization with the new logo URL
      await updateOrganization(id, { logo_url: logoUrl });

      return logoUrl;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logo Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
      });
      return '';
    }
  };

  const inviteUser = async (organizationId: string, email: string, role: string) => {
    try {
      // The backend addMember expects a userId. We need to find the user by email first.
      // Use the users index endpoint with a search query to find the user.
      const { default: apiClient } = await import('@/lib/api-client');
      const { data: usersResponse } = await apiClient.get<{
        data: Array<{ id: string; email: string }>;
      }>('/users', { params: { search: email, limit: 1 } });

      const users = usersResponse.data;
      if (!users || users.length === 0) {
        throw new Error(`User with email ${email} not found`);
      }

      const targetUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!targetUser) {
        throw new Error(`User with email ${email} not found`);
      }

      await organizationService.addMember(organizationId, targetUser.id, role);

      toast({
        title: 'User Invited',
        description: `${email} has been added to the organization`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to invite user',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        isLoading,
        switchOrganization,
        createOrganization,
        updateOrganization,
        uploadLogo,
        inviteUser,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
