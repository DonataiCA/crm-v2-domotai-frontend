import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { projectService } from "@/services/project.service";
import { githubService } from "@/services/github.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, AlertCircle, Bot, Upload, X, FileText, Share2 } from "lucide-react";
import { ProjectKanbanBoard } from "@/components/project-tracking/ProjectKanbanBoard";
import { ProjectGanttChart } from "@/components/project-tracking/ProjectGanttChart";
import { ProjectPRDPanel } from "@/components/project-tracking/ProjectPRDPanel";
import { aiService } from "@/services/ai.service";
import { TaskFileImport } from "@/components/project-tracking/TaskFileImport";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { ShareProjectDialog } from "@/components/projects/ShareProjectDialog";
import { ProjectReposManager } from "@/components/projects/ProjectReposManager";
import { ProjectLinksManager } from "@/components/project-tracking/ProjectLinksManager";
import type { Project, ProjectPhase, ProjectTask, GitMetric, GitCommit } from '@/types/api';
import { canEditProjects } from '@/constants';

const ProjectTracking = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const initialTaskId = searchParams.get('taskId') || undefined;
  const { toast } = useToast();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { session, userRole } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [gitMetrics, setGitMetrics] = useState<GitMetric[]>([]);
  const [gitCommits, setGitCommits] = useState<GitCommit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGit, setIsLoadingGit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("kanban");
  const [importOpen, setImportOpen] = useState(false);
  const [isGeneratingFromPrd, setIsGeneratingFromPrd] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const canEdit = canEditProjects(userRole || '');
  const needsSetup = (!phases || phases.length === 0) && (!tasks || tasks.length === 0);

  useEffect(() => {
    if (!projectId || !currentOrganization || !session) return;

    const fetchProjectData = async () => {
      setError(null);
      setIsLoading(true);

      try {
        const projectData = await projectService.getProject(projectId);

        if (!projectData) {
          setError("Project not found");
          setIsLoading(false);
          return;
        }

        setProject(projectData);

        const trackingData = await projectService.getTrackingData(projectId);

        // Extract tasks from phases + unassigned tasks
        const allPhases: ProjectPhase[] = trackingData.phases || [];
        const allTasks: ProjectTask[] = [...(trackingData.unassignedTasks || [])];
        for (const phase of allPhases) {
          if (phase.tasks) {
            allTasks.push(...phase.tasks);
          }
        }

        setPhases(allPhases);
        setTasks(allTasks);

        // Always try to load any linked repos' data (multi-repo: data lives in ProjectRepo, not Project)
        await fetchGitMetrics(projectData);
      } catch (error: any) {
        setError(error.message || "Failed to load project data");
        toast({
          title: "Error",
          description: "Failed to load project data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, currentOrganization, session, toast]);

  const fetchGitMetrics = async (projectData: Project, forceSync = false) => {
    setIsLoadingGit(true);
    try {
      // Check if any repos are linked. If none, just return.
      const repos = await githubService.listRepos(projectData.id);
      if (repos.length === 0) {
        setGitMetrics([]);
        setGitCommits([]);
        return;
      }

      // Auto-sync from GitHub if any repo has stale (>1h) or no lastGitSyncAt
      const isStale = repos.some(r => {
        const last = r.lastGitSyncAt ? new Date(r.lastGitSyncAt).getTime() : 0;
        return !last || Date.now() - last > 60 * 60 * 1000;
      });

      if (forceSync || isStale) {
        try {
          await githubService.fetchMetrics(projectData.id);
        } catch {
          // If the live sync fails, still show whatever is cached in DB
        }
      }

      const [metricsData, commitsData] = await Promise.all([
        githubService.getMetrics(projectData.id),
        githubService.getCommits(projectData.id),
      ]);

      if (metricsData?.success) setGitMetrics(metricsData.metrics || []);
      if (commitsData?.success) setGitCommits(commitsData.commits || []);
    } catch {
      // Silently fail for git metrics
    } finally {
      setIsLoadingGit(false);
    }
  };

  const refreshTrackingData = async () => {
    if (!projectId || !currentOrganization || !session) return;

    try {
      const trackingData = await projectService.getTrackingData(projectId);

      const allPhases: ProjectPhase[] = trackingData.phases || [];
      const allTasks: ProjectTask[] = [...(trackingData.unassignedTasks || [])];
      for (const phase of allPhases) {
        if (phase.tasks) {
          allTasks.push(...phase.tasks);
        }
      }

      setPhases(allPhases);
      setTasks(allTasks);
    } catch (error) {
      // Silently handle refresh errors
    }
  };

  if (orgLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <>
        <BreadcrumbNav />
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          {error && (
            <Alert variant="destructive" className="mb-6 mx-auto max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load project data
              </AlertDescription>
            </Alert>
          )}
          <Button onClick={() => navigate("/project-dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </>
    );
  }

  const breadcrumbItems = [
    { label: 'Projects', href: '/project-dashboard' },
    { label: project?.name || 'Project' },
    { label: 'Tracking' }
  ];

  return (
    <>
      <BreadcrumbNav items={breadcrumbItems} />

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/project-dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{project?.name}</h1>
              <p className="text-muted-foreground">{project?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button onClick={() => setShareOpen(true)} size="sm" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Invite Client
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setActiveTab("setup")} size="sm" variant={activeTab === "setup" ? "default" : "outline"}>
                <FileText className="h-4 w-4 mr-2" />
                PRD / Setup
              </Button>
            )}
            {canEdit && project?.prd && phases?.length > 0 && (
              <Button
                onClick={async () => {
                  setIsGeneratingFromPrd(true);
                  try {
                    await aiService.generateTasks(projectId!, phases.map(p => ({ id: p.id, name: p.name, description: p.description, status: p.status })));
                    toast({ title: "Tasks generated from PRD!" });
                    refreshTrackingData();
                  } catch {
                    toast({ title: "Error generating tasks", variant: "destructive" });
                  } finally {
                    setIsGeneratingFromPrd(false);
                  }
                }}
                size="sm"
                disabled={isGeneratingFromPrd}
              >
                {isGeneratingFromPrd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
                {isGeneratingFromPrd ? "Generating..." : "Generate AI Tasks"}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue={needsSetup && canEdit ? "setup" : "kanban"} value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            {canEdit && (
              <TabsTrigger value="setup">PRD / AI Setup</TabsTrigger>
            )}
            <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            <TabsTrigger value="repos">Repositories</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          {canEdit && (
            <TabsContent value="setup" className="mt-0">
              <ProjectPRDPanel
                project={project}
                onSetupComplete={() => {
                  refreshTrackingData();
                  setActiveTab("kanban");
                }}
              />
            </TabsContent>
          )}

          <TabsContent value="kanban" className="mt-0">
            {needsSetup && canEdit ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-muted-foreground">
                  <h3 className="text-lg font-medium mb-2">Project Setup Required</h3>
                  <p>Please complete the project setup to start working with phases and tasks.</p>
                </div>
                <Button onClick={() => setActiveTab("setup")}>
                  Complete Setup
                </Button>
              </div>
            ) : (
              <ProjectKanbanBoard
                projectId={projectId || ''}
                phases={phases}
                tasks={tasks}
                onTasksChange={setTasks}
                onPhasesChange={setPhases}
                onRefresh={refreshTrackingData}
                userRole={userRole}
                initialViewingTaskId={initialTaskId}
              />
            )}
          </TabsContent>

          <TabsContent value="gantt" className="mt-0">
            <ProjectGanttChart
              projectId={projectId || ''}
              phases={phases}
              tasks={tasks}
              onTasksChange={setTasks}
              onPhasesChange={setPhases}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="repos" className="mt-0">
            <ProjectReposManager
              projectId={project.id}
              metrics={gitMetrics}
              commits={gitCommits}
              isLoading={isLoadingGit}
              onSyncComplete={() => fetchGitMetrics(project, false)}
            />
          </TabsContent>

          <TabsContent value="links" className="mt-0">
            <ProjectLinksManager projectId={project.id} canEdit={canEdit} />
          </TabsContent>
        </Tabs>

      {/* Panel de importación — entra desde la derecha */}
      {importOpen && (
        <div className="fixed top-0 right-0 h-full w-[400px] bg-card border-l shadow-xl z-40 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Importar tareas desde archivo</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setImportOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <TaskFileImport
            projectId={projectId || ''}
            phases={phases}
            onTasksImported={refreshTrackingData}
          />
        </div>
      )}

      {/* Botón flotante de importación */}
      {!importOpen && !needsSetup && canEdit && (
        <Button
          onClick={() => setImportOpen(true)}
          className="fixed bottom-6 right-6 h-auto rounded-full shadow-lg z-40 px-4 py-3 gap-2"
        >
          <Upload className="h-5 w-5" />
          <span className="text-sm font-medium">Importar tareas</span>
        </Button>
      )}

      <ShareProjectDialog
        projectId={projectId || ''}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

    </>
  );
};

export default ProjectTracking;
