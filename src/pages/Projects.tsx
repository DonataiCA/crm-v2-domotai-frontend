
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/projects/ProjectList";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

const Projects = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          {currentOrganization && (
            <p className="text-muted-foreground mt-1">
              {currentOrganization.name}
            </p>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <ProjectForm onSuccess={() => {
              toast({
                title: "Success",
                description: "Project created successfully"
              });
            }} />
          </DialogContent>
        </Dialog>
      </div>
      <ProjectList />
    </>
  );
};

export default Projects;
