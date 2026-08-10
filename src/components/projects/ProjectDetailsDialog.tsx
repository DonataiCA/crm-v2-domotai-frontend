
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectForm } from "./ProjectForm";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { DollarSign, Pencil, Kanban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/contexts/OrganizationContext";
import { projectService } from "@/services/project.service";
import { useNavigate } from "react-router-dom";
import type { Project } from '@/types/api';

interface ProjectDetailsDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdate?: (updatedProject: Project) => void;
}

export const ProjectDetailsDialog = ({
  project,
  open,
  onOpenChange,
  onProjectUpdate
}: ProjectDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProject, setCurrentProject] = useState(project);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentProject(project);
  }, [project]);

  // Reset editing state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  const handleEditSuccess = () => {
    setIsEditing(false);
    toast({
      title: "Success",
      description: "Project updated successfully",
    });

    // Refresh the projects query
    if (currentOrganization) {
      queryClient.invalidateQueries({
        queryKey: ["projects", currentOrganization.id]
      });
    }
  };

  const handleGoToProjectTracking = () => {
    onOpenChange(false);
    navigate(`/projects/${currentProject.id}/tracking`);
  };

  if (!currentProject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle>{isEditing ? "Edit Project" : currentProject.name}</DialogTitle>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {isEditing ? (
            <ProjectForm
              initialData={currentProject}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Name</h4>
                  <p className="text-sm">{currentProject.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm">{currentProject.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Status</h4>
                  <Badge variant={currentProject.status === "completed" ? "default" : "outline"}>
                    {currentProject.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Price</h4>
                  <p className="text-sm flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {currentProject.price}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Start Date</h4>
                  <p className="text-sm">
                    {currentProject.startDate ? format(new Date(currentProject.startDate), "PPP") :
                     currentProject.start_date ? format(new Date(currentProject.start_date), "PPP") : "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">End Date</h4>
                  <p className="text-sm">
                    {currentProject.endDate ? format(new Date(currentProject.endDate), "PPP") :
                     currentProject.end_date ? format(new Date(currentProject.end_date), "PPP") : "N/A"}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoToProjectTracking}
                >
                  <Kanban className="h-4 w-4 mr-2" />
                  Project Tracking
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
