import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectDetailsDialog } from "@/components/projects/ProjectDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { projectService } from "@/services/project.service";
import { monitorService } from "@/services/monitor.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Download,
  FolderKanban,
  DollarSign,
  CheckCircle2,
  Clock,
  ListFilter,
  Columns,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { ProjectDataTable, type ProjectColumnKey } from "@/components/ui/project-data-table";
import { exportService } from "@/services/export.service";
import type { Project } from "@/types/api";
import type { ProjectMonitorSummary } from "@/types/monitor";

const ITEMS_PER_PAGE = 12;

const ALL_COLUMNS: ProjectColumnKey[] = [
  "name", "status", "health", "price", "timeline", "clients", "lead", "repository",
];

const ProjectDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { userRole } = useAuth();
  const isClient = userRole?.toLowerCase() === 'client';
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<ProjectColumnKey>>(
    new Set(isClient
      ? ["name", "status", "timeline"]
      : ["name", "status", "health", "price", "timeline", "clients", "lead"]
    )
  );

  const { data: allProjectsData, isLoading: allLoading } = useQuery({
    queryKey: ["all-projects", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");
      const response = await projectService.getProjects(1, 200);
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  const { data: myProjectsData, isLoading: myLoading } = useQuery({
    queryKey: ["my-projects", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");
      const response = await projectService.getMyProjects();
      return response.data || [];
    },
    enabled: !!currentOrganization,
  });

  const { data: monitorOverview } = useQuery({
    queryKey: ["monitor-overview", currentOrganization?.id],
    queryFn: () => monitorService.getOrganizationOverview(),
    enabled: !!currentOrganization,
    staleTime: 60_000,
  });

  const monitorMap = useMemo(() => {
    const map = new Map<string, ProjectMonitorSummary>();
    monitorOverview?.data.forEach((s) => map.set(s.projectId, s));
    return map;
  }, [monitorOverview]);

  const isLoading = activeTab === "all" ? allLoading : myLoading;
  const projects = (activeTab === "all" ? allProjectsData : myProjectsData) || [];
  const myCount = myProjectsData?.length || 0;

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase();
      const nameMatch = !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "not_started" && (!p.status || p.status === "Not Started")) ||
        (statusFilter === "in_progress" && p.status === "In Progress") ||
        (statusFilter === "on_hold" && p.status === "On Hold") ||
        (statusFilter === "completed" && p.status === "Completed");
      return nameMatch && statusMatch;
    });
  }, [projects, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };
  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "all" | "mine");
    setCurrentPage(1);
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Stats
  const totalValue = projects.reduce((sum, p) => sum + (p.price || 0), 0);
  const completedCount = projects.filter(p => p.status === "Completed").length;
  const inProgressCount = projects.filter(p => p.status === "In Progress").length;

  const toggleColumn = (col: ProjectColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Organization Selected</h2>
        <p className="text-muted-foreground">Please select an organization to view projects.</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{isClient ? 'My Projects' : 'Projects'}</h1>
          <p className="text-muted-foreground mt-1">{currentOrganization.name}</p>
        </div>
        {!isClient && (
          <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <ProjectForm
                onSuccess={() => {
                  toast({ title: "Project created" });
                  setNewProjectOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Row - hidden for clients */}
      {!isClient && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs - hidden for clients */}
      {!isClient && (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              All Projects
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-2">
              <User className="h-4 w-4" />
              My Projects
              {myCount > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {myCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Filters + Column Toggle - simplified for clients */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {!isClient && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <ListFilter className="h-4 w-4 mr-2" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={statusFilter === "all"} onCheckedChange={() => handleStatusChange("all")}>All</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "not_started"} onCheckedChange={() => handleStatusChange("not_started")}>Not Started</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "in_progress"} onCheckedChange={() => handleStatusChange("in_progress")}>In Progress</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "on_hold"} onCheckedChange={() => handleStatusChange("on_hold")}>On Hold</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "completed"} onCheckedChange={() => handleStatusChange("completed")}>Completed</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col}
                    className="capitalize"
                    checked={visibleColumns.has(col)}
                    onCheckedChange={() => toggleColumn(col)}
                  >
                    {col === "price" ? "Value" : col === "lead" ? "Project Lead" : col === "health" ? "Salud (Monitor)" : col}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={async () => {
                try {
                  await exportService.exportProjectsCSV();
                } catch {
                  toast({ title: "Export failed", description: "Could not export projects.", variant: "destructive" });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </>
        )}
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <ProjectDataTable
          projects={paginatedProjects}
          visibleColumns={visibleColumns}
          monitorData={monitorMap}
          onProjectClick={(project) => {
            if (isClient) {
              navigate(`/projects/${project.id}/tracking`);
            } else {
              setSelectedProject(project);
              setIsDetailsOpen(true);
            }
          }}
          onTrackClick={(project) => navigate(`/projects/${project.id}/tracking`)}
          onMonitorClick={(project) => navigate(`/projects/${project.id}/monitor`)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} of{" "}
            {filteredProjects.length} projects
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <ProjectDetailsDialog
        project={selectedProject}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onProjectUpdate={(updated) => setSelectedProject(updated)}
      />
    </>
  );
};

export default ProjectDashboard;
