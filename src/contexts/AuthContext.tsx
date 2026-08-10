import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/auth.service";
import { getToken, clearToken, clearOrganizationId } from "@/lib/api-client";

// Keep a session-like shape so components that reference session.user.id / session.user.email
// continue to work without changes.
interface CompatSession {
  user: { id: string; email: string };
}

interface AuthContextType {
  session: CompatSession | null;
  userRole: string;
  userEmail: string | null;
  currentOrganizationId: string | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  userRole: "",
  userEmail: null,
  currentOrganizationId: null,
  isLoading: true,
  refreshSession: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<CompatSession | null>(null);
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const initializeRef = useRef(false);

  const clearAuthState = () => {
    setSession(null);
    setUserEmail(null);
    setUserRole("");
  };

  /**
   * Validate the stored JWT by calling getProfile.
   * Builds a compat session from the profile response.
   */
  const loadProfile = async () => {
    const token = getToken();
    if (!token) {
      clearAuthState();
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const profile = await authService.getProfile();

      setSession({ user: { id: profile.id, email: profile.email } });
      setUserEmail(profile.email);
      setUserRole(profile.role);
      setCurrentOrganizationId(profile.currentOrganizationId);
    } catch {
      // Token is invalid or expired
      clearToken();
      clearOrganizationId();
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    await loadProfile();
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore errors -- storage is cleared inside logout()
    } finally {
      clearAuthState();
      window.location.href = "/auth";
    }
  };

  useEffect(() => {
    if (initializeRef.current) return;
    initializeRef.current = true;
    loadProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        userRole,
        userEmail,
        currentOrganizationId,
        isLoading,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
