import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { projectService } from "@/services/project.service";
import { Bot, ChevronRight, Loader2, type LucideIcon } from "lucide-react";

/**
 * "Exportar datos de proyecto": un modal con las formas de exportar. Hoy sólo hay una,
 * "Exportar para IA" (el JSON de tareas que se trabaja con Claude Code y se reimporta);
 * cada forma nueva es una entrada más en `EXPORT_OPTIONS`.
 */

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  run: (projectId: string) => Promise<void>;
  /** Texto del aviso al terminar. */
  doneMessage: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "ai",
    title: "Exportar para IA",
    description:
      "Descarga todas las tareas en un archivo JSON para trabajarlas con Claude Code (u otro agente) y volver a importarlas desde «Importar tareas», con vista previa de los cambios.",
    icon: Bot,
    run: (projectId) => projectService.exportTasks(projectId),
    doneMessage: "Archivo de tareas descargado.",
  },
];

interface ProjectExportDialogProps {
  projectId: string;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectExportDialog = ({ projectId, projectName, open, onOpenChange }: ProjectExportDialogProps) => {
  const [running, setRunning] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRun = async (option: ExportOption) => {
    if (running) return;
    setRunning(option.id);
    try {
      await option.run(projectId);
      toast({ title: option.title, description: option.doneMessage });
      onOpenChange(false);
    } catch {
      toast({ title: "No se pudo exportar", description: "Inténtalo de nuevo en unos segundos.", variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!running) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar datos de proyecto</DialogTitle>
          <DialogDescription>
            Elige cómo quieres exportar {projectName ? <strong>{projectName}</strong> : "el proyecto"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {EXPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isRunning = running === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleRun(option)}
                disabled={running !== null}
                className="w-full text-left rounded-lg border p-4 flex items-start gap-3 transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:pointer-events-none"
              >
                <span className="rounded-md bg-primary/10 p-2 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="block text-xs text-muted-foreground mt-1">{option.description}</span>
                </span>
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
