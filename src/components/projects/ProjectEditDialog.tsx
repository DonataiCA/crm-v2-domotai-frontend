import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectForm } from "./ProjectForm";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Project } from '@/types/api';

interface ProjectEditDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edición de un proyecto. Antes esto era un `ProjectDetailsDialog` que se abría al
 * hacer click en la fila y mostraba una ficha de solo lectura con un botón para ir
 * al seguimiento. Ese paso intermedio sobraba: la fila ya muestra los mismos datos
 * y el click ahora lleva directo al seguimiento, así que aquí sólo queda editar.
 */
export const ProjectEditDialog = ({ project, open, onOpenChange }: ProjectEditDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  if (!project) return null;

  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "Project updated successfully",
    });

    // Las dos listas del dashboard, no `["projects"]`: esa clave no la consulta
    // nadie, y por eso hasta ahora la tabla seguía mostrando los datos viejos
    // después de guardar.
    if (currentOrganization) {
      queryClient.invalidateQueries({ queryKey: ["all-projects", currentOrganization.id] });
      queryClient.invalidateQueries({ queryKey: ["my-projects", currentOrganization.id] });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <ProjectForm
            initialData={project}
            onSuccess={handleSuccess}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
