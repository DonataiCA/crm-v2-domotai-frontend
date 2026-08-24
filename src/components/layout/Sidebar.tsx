import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  Users,
  Building2,
  CheckSquare,
  Receipt,
  Wallet,
  Clock,
  FolderKanban,
  DollarSign,
  CalendarDays,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Gauge,
  AlertTriangle,
  KeyRound,
  Tag,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrganizationSelector } from "@/components/organizations/OrganizationSelector";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { UserRole, isClientRole, isViewerRole, normalizeRole } from "@/constants";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Leads", icon: Target, path: "/leads" },
  { label: "Contacts", icon: Users, path: "/contacts" },
  { label: "Companies", icon: Building2, path: "/companies" },
  { label: "Tasks", icon: CheckSquare, path: "/tasks" },
  { label: "Invoices", icon: Receipt, path: "/invoices" },
  { label: "Cobranzas", icon: Wallet, path: "/collections" },
  { label: "Time Tracking", icon: Clock, path: "/time-tracking" },
  { label: "Financial", icon: DollarSign, path: "/financial" },
  { label: "Calendar", icon: CalendarDays, path: "/calendar" },
  { label: "Projects", icon: FolderKanban, path: "/project-dashboard" },
];

const opsItems = [
  { label: "Capacity", icon: Gauge, path: "/capacity" },
  { label: "Incidents", icon: AlertTriangle, path: "/incidents" },
];

const settingsItems = [
  { label: "Users", icon: UserCog, path: "/organization/members" },
  { label: "Tags", icon: Tag, path: "/tags" },
  { label: "Audit Log", icon: ScrollText, path: "/audit-log" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userEmail, userRole, signOut } = useAuth();

  const isClient = isClientRole(userRole);
  const isViewer = isViewerRole(userRole);
  const isFreelancer = normalizeRole(userRole) === UserRole.FREELANCER;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";
  const displayName = userEmail ?? "User";

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch {
      // signOut already redirects
    }
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-64",
          // Mobile: off-screen by default, slide in when open
          "max-md:-translate-x-full max-md:shadow-2xl",
          mobileOpen && "max-md:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center border-b border-slate-700/50 px-4">
          <Link
            to="/"
            className="flex items-center gap-3 overflow-hidden"
            onClick={handleNavClick}
          >
            <img
              src="/lovable-uploads/d3c178bd-e905-4e9f-aea6-25fff0b49ef5.png"
              alt="Domotai"
              className="h-8 w-8 flex-shrink-0 object-contain"
            />
            {!collapsed && (
              <span className="whitespace-nowrap text-lg font-semibold text-white transition-opacity duration-200">
                Domotai
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {(isClient
              ? navItems.filter(i => i.path === '/project-dashboard')
              : isViewer
              ? navItems.filter(i => i.path === '/')
              : isFreelancer
              ? navItems.filter(i => ['/project-dashboard', '/tasks', '/time-tracking', '/calendar'].includes(i.path))
              : navItems
            ).map((item) => {
              const active = isActive(item.path);
              const linkContent = (
                <Link
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "border-l-[3px] border-blue-400 bg-blue-500/15 text-blue-400"
                      : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <li key={item.path}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.path}>{linkContent}</li>;
            })}
          </ul>

          {/* Operations divider */}
          {!isClient && !isViewer && !isFreelancer && (
            <>
            <div className="my-4 border-t border-slate-700/50" />
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Operations
              </p>
            )}
            </>
          )}
          <ul className="space-y-1">
            {(isClient || isViewer || isFreelancer ? [] : opsItems).map((item) => {
              const active = isActive(item.path);
              const linkContent = (
                <Link
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "border-l-[3px] border-blue-400 bg-blue-500/15 text-blue-400"
                      : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <li key={item.path}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.path}>{linkContent}</li>;
            })}
          </ul>

          {/* Settings divider */}
          {!isClient && !isViewer && !isFreelancer && (
            <>
            <div className="my-4 border-t border-slate-700/50" />
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Settings
              </p>
            )}
            </>
          )}
          <ul className="space-y-1">
            {(isClient || isViewer || isFreelancer ? [] : settingsItems).map((item) => {
              const active = isActive(item.path);
              const linkContent = (
                <Link
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    active
                      ? "border-l-[3px] border-blue-400 bg-blue-500/15 text-blue-400"
                      : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <li key={item.path}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.path}>{linkContent}</li>;
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-700/50 p-3 space-y-3">
          {/* Organization selector */}
          <div className={cn("overflow-hidden", collapsed && "flex justify-center")}>
            {!collapsed ? (
              <OrganizationSelector />
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    <OrganizationSelector />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">Organization</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* User section */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2",
              collapsed && "justify-center px-0"
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between overflow-hidden">
                <span className="truncate text-sm text-slate-300">
                  {displayName}
                </span>
                <div className="flex gap-1">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
                        onClick={() => setChangePasswordOpen(true)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Change password</TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Sign out</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>

          {collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mx-auto flex h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          )}

          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hidden md:flex mx-auto h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <ChangePasswordForm onSuccess={() => setChangePasswordOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  return { collapsed, toggle };
}
