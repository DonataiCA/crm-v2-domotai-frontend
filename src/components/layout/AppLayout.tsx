import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Sidebar, useSidebarState } from "./Sidebar";
import { CommercialAgent } from "@/components/ai/CommercialAgent";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { collapsed, toggle } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userRole } = useAuth();
  const location = useLocation();
  // Only show the AI agent for internal team members, not clients
  const isTeamMember = userRole && userRole !== 'CLIENT';
  // Hide CommercialAgent on project tracking pages — those pages have their own AI chat
  const isProjectTracking = location.pathname.includes('/tracking');

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content area */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-in-out",
          collapsed ? "md:ml-[72px]" : "md:ml-64"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* Spacer to push search & nav to the right */}
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <GlobalSearch />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-6">{children}</div>
        </main>
      </div>

      {/* AI Commercial Agent — only for team members, hidden on project tracking pages */}
      {isTeamMember && !isProjectTracking && <CommercialAgent />}
    </div>
  );
}
