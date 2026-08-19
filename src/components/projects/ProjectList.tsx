
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/services/project.service";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { ProjectEditDialog } from "./ProjectEditDialog";
import { Button } from "../ui/button";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getProjectStatusColor } from '@/constants';
import type { Project, ProjectMilestone, ContactRef } from '@/types/api';

const ITEMS_PER_PAGE = 10;

export const ProjectList = () => {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", currentOrganization?.id, currentPage],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");
      return await projectService.getProjects(currentPage, ITEMS_PER_PAGE);
    },
    enabled: !!currentOrganization,
  });

  const handleDelete = async () => {
    if (!projectToDelete?.id || isDeleting || !currentOrganization) return;

    try {
      setIsDeleting(true);

      // Archive instead of hard delete to preserve history
      await projectService.archiveProject(projectToDelete.id);

      toast({
        title: "Proyecto archivado",
        description: "El proyecto fue archivado y puede ser restaurado.",
      });

      queryClient.invalidateQueries({ queryKey: ["projects", currentOrganization.id] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  if (!currentOrganization) {
    return <div className="text-center p-4">Please select an organization to view projects.</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Error loading projects. Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2">Loading projects...</p>
      </div>
    );
  }

  const getProgressPercentage = (milestones: ProjectMilestone[] | undefined) => {
    if (!milestones?.length) return 0;
    const completed = milestones.filter(m => m.completed).length;
    return Math.round((completed / milestones.length) * 100);
  };

  const getStatusColor = (status: string) => {
    return getProjectStatusColor(status);
  };

  const handleRowClick = (project: Project) => {
    setSelectedProject(project);
    setIsDetailsOpen(true);
  };

  const projects = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {projects.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Clients</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell
                    className="font-medium"
                    onClick={() => handleRowClick(project)}
                  >
                    {project.name}
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(project)}>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status || 'Not Set'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(project)}>
                    {project.startDate && (
                      <span>
                        {format(new Date(project.startDate), 'MMM d, yyyy')}
                        {project.endDate && ' - '}
                        {project.endDate && format(new Date(project.endDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(project)}>
                    <div className="w-[100px]">
                      <Progress value={getProgressPercentage(project.milestones)} />
                    </div>
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(project)}>
                    {project.contacts?.map((contact: ContactRef) => (
                      <Badge key={contact.id} variant="outline" className="mr-1">
                        {contact.name}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center p-4">
          <p className="text-muted-foreground">No projects found</p>
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total} projects
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={currentPage >= pagination.pages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProjectEditDialog
        project={selectedProject}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      <ConfirmDialog
        open={projectToDelete !== null}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        description={`Are you sure you want to delete ${projectToDelete?.name}? This action cannot be undone and will remove all associated data.`}
      />
    </div>
  );
};
