
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Companies from "./pages/Companies";
import Leads from "./pages/Leads";
import Projects from "./pages/Projects";
import ProjectDashboard from "./pages/ProjectDashboard";
import ProjectTracking from "./pages/ProjectTracking";
import Tasks from "./pages/Tasks";
import Invoices from "./pages/Invoices";
import TimeTracking from "./pages/TimeTracking";
import FinancialDashboard from "./pages/FinancialDashboard";
import Calendar from "./pages/Calendar";
import AuditLog from "./pages/AuditLog";
import ClientPortal from "./pages/ClientPortal";
import ClientLogin from "./pages/ClientLogin";
import ProjectMonitor from "./pages/ProjectMonitor";
import ChangePassword from "./pages/ChangePassword";
import OrganizationSettings from "./pages/OrganizationSettings";
import OrganizationMembers from "./pages/OrganizationMembers";
import TagAdmin from "./pages/TagAdmin";
import Capacity from "./pages/Capacity";
import Incidents from "./pages/Incidents";
import CompanyDetail from "./pages/CompanyDetail";
import ContactDetail from "./pages/ContactDetail";
import LeadDetail from "./pages/LeadDetail";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { isClientRole, isViewerRole } from "@/constants";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

/** Wraps a page component in the AppLayout (sidebar + top bar). */
const WithLayout = ({ children }: { children: React.ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

/** Redirects to /auth preserving the current URL as ?redirect= so post-login can return here. */
const NavToAuth = () => {
  const loc = useLocation();
  const redirect = encodeURIComponent(loc.pathname + loc.search);
  return <Navigate to={`/auth?redirect=${redirect}`} replace />;
};

/** Guard: redirects clients and viewers away from team-only pages */
const TeamOnly = ({ children }: { children: React.ReactNode }) => {
  const { userRole } = useAuth();
  if (isClientRole(userRole)) return <Navigate to="/project-dashboard" replace />;
  if (isViewerRole(userRole)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { session, userRole, isLoading } = useAuth();
  const isClient = isClientRole(userRole);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={<Auth />}
      />
      <Route
        path="/"
        element={
          session
            ? isClient
              ? <Navigate to="/project-dashboard" replace />
              : <WithLayout><Dashboard /></WithLayout>
            : <NavToAuth />
        }
      />
      <Route
        path="/contacts"
        element={session ? <WithLayout><TeamOnly><Contacts /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/companies"
        element={session ? <WithLayout><TeamOnly><Companies /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/leads"
        element={session ? <WithLayout><TeamOnly><Leads /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/companies/:id"
        element={session ? <WithLayout><TeamOnly><CompanyDetail /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/contacts/:id"
        element={session ? <WithLayout><TeamOnly><ContactDetail /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/leads/:id"
        element={session ? <WithLayout><TeamOnly><LeadDetail /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/project-dashboard"
        element={session ? <WithLayout><ProjectDashboard /></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/projects"
        element={session ? <Navigate to="/project-dashboard" replace /> : <NavToAuth />}
      />
      <Route
        path="/projects/:projectId/tracking"
        element={session ? <WithLayout><ProjectTracking /></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/projects/:projectId/monitor"
        element={session ? <WithLayout><ProjectMonitor /></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/tasks"
        element={session ? <WithLayout><TeamOnly><Tasks /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/invoices"
        element={session ? <WithLayout><TeamOnly><Invoices /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/time-tracking"
        element={session ? <WithLayout><TeamOnly><TimeTracking /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/financial"
        element={session ? <WithLayout><TeamOnly><FinancialDashboard /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/calendar"
        element={session ? <WithLayout><TeamOnly><Calendar /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/capacity"
        element={session ? <WithLayout><TeamOnly><Capacity /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/incidents"
        element={session ? <WithLayout><TeamOnly><Incidents /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/audit-log"
        element={session ? <WithLayout><TeamOnly><AuditLog /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/portal/login"
        element={<ClientLogin />}
      />
      <Route
        path="/portal/:shareToken"
        element={<ClientPortal />}
      />
      <Route
        path="/change-password"
        element={session ? <WithLayout><ChangePassword /></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/organization/settings"
        element={session ? <WithLayout><TeamOnly><OrganizationSettings /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/tags"
        element={session ? <WithLayout><TeamOnly><TagAdmin /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      <Route
        path="/organization/members"
        element={session ? <WithLayout><TeamOnly><OrganizationMembers /></TeamOnly></WithLayout> : <NavToAuth />}
      />
      {/* 404 catch-all */}
      <Route
        path="*"
        element={session ? <WithLayout><div className="flex flex-col items-center justify-center h-[60vh]"><h1 className="text-4xl font-bold mb-2">404</h1><p className="text-muted-foreground">Page not found</p></div></WithLayout> : <NavToAuth />}
      />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <OrganizationProvider>
              <Router>
                <AppRoutes />
                <Toaster />
              </Router>
            </OrganizationProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
