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
import { isClientRole } from "@/constants";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { collapsed, toggle } = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { userRole } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  // Only show the AI agent for internal team members, not clients
  const isTeamMember = Boolean(userRole) && !isClientRole(userRole);
  // Hide CommercialAgent on project tracking pages — those pages have their own AI chat
  const isProjectTracking = location.pathname.includes('/tracking');
  // El tablero de leads necesita altura real para que las columnas se lleven todo el
  // alto sobrante, en vez de un `calc()` que adivina lo que tienen encima. Los márgenes
  // laterales son los mismos que en el resto de páginas. Sólo `/leads` (el detalle
  // `/leads/:id` es una página normal) y sólo en escritorio: en móvil las columnas se
  // apilan y la página scrollea como siempre.
  const isFullHeightBoard = location.pathname === '/leads' && !isMobile;

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
          "flex flex-col transition-all duration-300 ease-in-out",
          // Altura fija sólo en el tablero: es lo que hace que `flex-1` tenga contra qué
          // resolverse. El resto de páginas siguen creciendo con su contenido.
          isFullHeightBoard ? "h-screen" : "min-h-screen",
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
        <main className={cn("flex-1", isFullHeightBoard ? "min-h-0 overflow-hidden" : "overflow-y-auto")}>
          <div
            className={cn(
              "container mx-auto py-6",
              isFullHeightBoard && "flex h-full min-h-0 flex-col"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* AI Commercial Agent — only for team members, hidden on project tracking pages */}
      {isTeamMember && !isProjectTracking && <CommercialAgent />}
    </div>
  );
}
