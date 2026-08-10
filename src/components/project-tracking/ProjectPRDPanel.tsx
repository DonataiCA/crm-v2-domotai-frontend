import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { projectService } from "@/services/project.service";
import { aiService } from "@/services/ai.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { organizationService } from "@/services/organization.service";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Layers,
  Plus,
  Trash2,
  Wand2,
  Loader2,
  Save,
  Check,
  GripVertical,
  ChevronRight,
} from "lucide-react";
import type { Project } from "@/types/api";

interface WorkArea {
  name: string;
  description: string;
  assigneeId: string;
}

interface ProjectPRDPanelProps {
  project: Project;
  onSetupComplete: () => void;
}

const DEFAULT_WORK_AREAS: WorkArea[] = [
  { name: "Planning & Design", description: "Requirements, wireframes, architecture", assigneeId: "" },
  { name: "Backend Development", description: "API, database, business logic", assigneeId: "" },
  { name: "Frontend Development", description: "UI components, pages, integrations", assigneeId: "" },
  { name: "Testing & QA", description: "Unit tests, integration tests, bug fixes", assigneeId: "" },
  { name: "DevOps & Deploy", description: "CI/CD, hosting, monitoring, security", assigneeId: "" },
];

export const ProjectPRDPanel = ({ project, onSetupComplete }: ProjectPRDPanelProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const [prd, setPrd] = useState(project.prd || "");
  const [workAreas, setWorkAreas] = useState<WorkArea[]>(DEFAULT_WORK_AREAS);
  const [isSavingPrd, setIsSavingPrd] = useState(false);
  const [prdSaved, setPrdSaved] = useState(!!project.prd);
  const [isCreatingAreas, setIsCreatingAreas] = useState(false);
  const [areasCreated, setAreasCreated] = useState(false);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["org-members", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      return await organizationService.getMembers(currentOrganization.id);
    },
    enabled: !!currentOrganization,
  });

  // ─── Step 1: Save PRD ─────────────────────────────────────────────────────

  const handleSavePrd = async () => {
    if (!prd.trim()) {
      toast({ title: "PRD is empty", description: "Please describe your project requirements", variant: "destructive" });
      return;
    }
    setIsSavingPrd(true);
    try {
      await projectService.updateProject(project.id, { prd });
      setPrdSaved(true);
      toast({ title: "PRD saved" });
    } catch {
      toast({ title: "Error saving PRD", variant: "destructive" });
    } finally {
      setIsSavingPrd(false);
    }
  };

  // ─── Step 2: Create Work Areas ────────────────────────────────────────────

  const addArea = () => {
    setWorkAreas([...workAreas, { name: "", description: "", assigneeId: "" }]);
  };

  const removeArea = (index: number) => {
    setWorkAreas(workAreas.filter((_, i) => i !== index));
  };

  const updateArea = (index: number, field: keyof WorkArea, value: string) => {
    setWorkAreas(workAreas.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleCreateAreas = async () => {
    const validAreas = workAreas.filter(a => a.name.trim());
    if (validAreas.length === 0) {
      toast({ title: "Add at least one work area", variant: "destructive" });
      return;
    }

    setIsCreatingAreas(true);
    try {
      for (let i = 0; i < validAreas.length; i++) {
        await projectService.createPhase(project.id, {
          name: validAreas[i].name,
          description: validAreas[i].description || undefined,
          orderIndex: i,
          status: "Active",
        });
      }
      setAreasCreated(true);
      toast({ title: `${validAreas.length} work areas created` });
    } catch {
      toast({ title: "Error creating work areas", variant: "destructive" });
    } finally {
      setIsCreatingAreas(false);
    }
  };

  // ─── Step 3: Generate Tasks with AI ───────────────────────────────────────

  const handleGenerateTasks = async () => {
    setIsGeneratingTasks(true);
    try {
      const trackingData = await projectService.getTrackingData(project.id);
      const projectPhases = trackingData.phases || [];

      if (projectPhases.length === 0) {
        toast({ title: "No work areas found", description: "Create work areas first", variant: "destructive" });
        setIsGeneratingTasks(false);
        return;
      }

      await aiService.generateTasks(project.id, projectPhases);
      toast({ title: "Tasks generated!", description: "Your project is ready" });
      onSetupComplete();
    } catch (error) {
      toast({
        title: "Error generating tasks",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────

  const currentStep = areasCreated ? 3 : prdSaved ? 2 : 1;

  const steps = [
    { num: 1, label: "Define Requirements", done: prdSaved },
    { num: 2, label: "Work Areas", done: areasCreated },
    { num: 3, label: "Generate Tasks", done: false },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step.done
                  ? 'bg-emerald-500 text-white'
                  : currentStep === step.num
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {step.done ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${
                currentStep === step.num ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-3 ${step.done ? 'bg-emerald-500' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: PRD */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Product Requirements (PRD)</CardTitle>
          </div>
          <CardDescription>Describe what this project needs to accomplish</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Describe the project goals, features, technical requirements, and any constraints..."
            value={prd}
            onChange={(e) => { setPrd(e.target.value); if (prdSaved) setPrdSaved(false); }}
            rows={6}
            className="resize-none"
          />
          <Button onClick={handleSavePrd} disabled={isSavingPrd || !prd.trim()} className="w-full">
            {isSavingPrd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : prdSaved ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {prdSaved ? "PRD Saved — Click to update" : "Save PRD & Continue"}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Work Areas */}
      <Card className={!prdSaved ? 'opacity-40 pointer-events-none' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Work Areas</CardTitle>
                <CardDescription className="mt-0.5">Parallel streams of work for the project</CardDescription>
              </div>
            </div>
            {!areasCreated && (
              <Button variant="outline" size="sm" onClick={addArea}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {workAreas.map((area, index) => (
            <div
              key={index}
              className="group flex items-start gap-3 p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 pt-2 text-muted-foreground">
                <GripVertical className="h-4 w-4 opacity-30" />
                <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center text-xs">
                  {index + 1}
                </Badge>
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Work area name"
                  value={area.name}
                  onChange={(e) => updateArea(index, "name", e.target.value)}
                  className="h-8 font-medium"
                  disabled={areasCreated}
                />
                <Input
                  placeholder="Brief description (optional)"
                  value={area.description}
                  onChange={(e) => updateArea(index, "description", e.target.value)}
                  className="h-8 text-sm"
                  disabled={areasCreated}
                />
                {members && members.length > 0 && !areasCreated && (
                  <select
                    value={area.assigneeId}
                    onChange={(e) => updateArea(index, "assigneeId", e.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">Default assignee (optional)</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user?.fullName || m.user?.email || "Unknown"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {!areasCreated && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => removeArea(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {!areasCreated ? (
            <Button
              onClick={handleCreateAreas}
              disabled={isCreatingAreas || workAreas.every(a => !a.name.trim())}
              className="w-full"
            >
              {isCreatingAreas ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-2" />}
              Create {workAreas.filter(a => a.name.trim()).length} Work Areas & Continue
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600 justify-center py-2">
              <Check className="h-4 w-4" />
              Work areas created — proceed to generate tasks
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Generate Tasks */}
      <Card className={!areasCreated ? 'opacity-40 pointer-events-none' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Generate Tasks with AI</CardTitle>
          </div>
          <CardDescription>AI will analyze your PRD and create tasks for each work area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4 gap-4">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              AI will analyze your PRD and generate actionable tasks for each work area
              following Domotai's project launch playbook.
            </p>
            <Button onClick={handleGenerateTasks} disabled={isGeneratingTasks} size="lg" className="w-full max-w-sm">
              {isGeneratingTasks ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {isGeneratingTasks ? "Generating tasks..." : "Generate Tasks with AI"}
            </Button>
            <Button variant="link" size="sm" onClick={onSetupComplete} className="text-muted-foreground">
              or add tasks manually
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
