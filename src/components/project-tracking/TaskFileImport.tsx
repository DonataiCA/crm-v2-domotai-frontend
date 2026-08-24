import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { projectService } from "@/services/project.service";
import { readAttachment, type Attachment } from "@/lib/read-attachment";
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  DOCUMENT_ACCEPT_ATTRIBUTE,
  MAX_TEMPLATE_CHARS,
  MAX_TEMPLATE_TASKS,
} from "@/constants/document";
import {
  getPriorityBadgeVariant,
  getStatusBadgeVariant,
  getTaskPriorityLabel,
  getTaskStatusLabel,
} from "@/constants";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ClipboardCopy,
  Download,
  FileText,
  Flag,
  Layers,
  Loader2,
  Upload,
  User,
  X,
} from "lucide-react";
import type { ProjectPhase, ProjectTask, ProjectTeamMember, TemplateIssue } from "@/types/api";
import { buildAiPrompt } from "./task-import-prompt";

/**
 * Alta de tareas subiendo un archivo `.md` o `.txt` con la plantilla del CRM.
 *
 * **No hay caja de texto a propósito.** Es la diferencia con `TaskChat`: allí se escribe
 * una instrucción y un modelo decide qué tareas salen de ella, con lo que el resultado no
 * es reproducible y pierde por el camino los campos que el modelo no devuelve. Aquí el
 * archivo ES la petición, el formato es fijo y lo lee un parser del backend, así que la
 * tarea importada queda exactamente igual que una creada a mano en "Add Task".
 *
 * El archivo no se sube a ningún sitio: se lee en el navegador y su contenido viaja como
 * texto dentro del cuerpo JSON, igual que en el chat.
 */

/** El archivo se sirve como estático desde `public/`. */
const TEMPLATE_URL = "/plantilla-tareas.md";

const extensions = ACCEPTED_DOCUMENT_EXTENSIONS.join(" o ");

type TaskWithPhase = ProjectTask & { phase?: { id: string; name: string } | null };

interface TaskFileImportProps {
  projectId: string;
  /** Las áreas del proyecto; el prompt para la IA se arma con sus nombres. */
  phases: ProjectPhase[];
  onTasksImported: () => void;
}

export const TaskFileImport = ({ projectId, phases, onTasksImported }: TaskFileImportProps) => {
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [issues, setIssues] = useState<TemplateIssue[]>([]);
  const [warnings, setWarnings] = useState<TemplateIssue[]>([]);
  const [members, setMembers] = useState<ProjectTeamMember[]>([]);
  const [imported, setImported] = useState<TaskWithPhase[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Un archivo nuevo invalida el resultado del anterior. */
  const takeFile = async (file: File) => {
    setIssues([]);
    setImported([]);

    const result = await readAttachment(file, MAX_TEMPLATE_CHARS);
    if (!result.ok) {
      setAttachment(null);
      setReadError(result.error);
      return;
    }

    setAttachment(result.attachment);
    setReadError(null);
  };

  const clearAttachment = () => {
    setAttachment(null);
    setReadError(null);
    setIssues([]);
    // Sin esto, volver a elegir el mismo archivo no dispara `change`.
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * `preventDefault` en todos los eventos de arrastre: sin él el navegador abre el
   * archivo en la pestaña y se pierde la sesión del CRM.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isImporting) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Sin esta comprobación el overlay parpadea al pasar por encima de los hijos del
    // panel, porque `dragleave` también se dispara al entrar en cada uno de ellos.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isImporting) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (files.length > 1) {
      setAttachment(null);
      setReadError("Sólo se puede importar un archivo a la vez.");
      return;
    }

    await takeFile(files[0]);
  };

  // Los miembros sólo hacen falta para armar el prompt de la IA, así que se piden una
  // vez al abrir el panel y su fallo no interrumpe nada: sin ellos el prompt sale con la
  // lista de personas vacía, que sigue siendo mejor que no tener prompt.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    projectService
      .getMembers(projectId)
      .then((list) => { if (!cancelled) setMembers(list); })
      .catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  const copyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(phases, members));
      toast({
        title: "Instrucciones copiadas",
        description: "Pégaselas a la IA con la que generes las tareas.",
      });
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Tu navegador ha bloqueado el portapapeles.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!attachment || isImporting) return;

    setIsImporting(true);
    setIssues([]);
    setWarnings([]);
    setImported([]);

    try {
      const data = await projectService.importTasks(projectId, {
        fileName: attachment.fileName,
        content: attachment.content,
      });

      setImported(data.tasks as TaskWithPhase[]);
      setWarnings(data.warnings ?? []);
      clearAttachment();
      toast({
        title: "Tareas importadas",
        description: `${data.created} ${data.created === 1 ? "tarea creada" : "tareas creadas"}.`,
      });
      onTasksImported();
    } catch (error: unknown) {
      // El 422 no es un fallo: es el archivo que hay que corregir. Se queda en el panel
      // con su lista de líneas, y el adjunto sigue cargado para reintentar.
      const response = (error as { response?: { status?: number; data?: { issues?: TemplateIssue[] } } })
        .response;

      if (response?.status === 422 && response.data?.issues?.length) {
        setIssues(response.data.issues);
        return;
      }

      const message = error instanceof Error ? error.message : "No se pudo importar el archivo";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      /* `flex-1 min-h-0` y no `h-full`: el panel que lo contiene es flex-col y ya gasta
         parte de su alto en la cabecera, así que pedir el 100% hacía que el componente
         sobresaliera por abajo justo esa altura y la última tarea quedara cortada fuera
         de la pantalla. `min-h-0` es lo que permite que el hijo con scroll encoja: sin
         él, un hijo flex nunca baja de su alto de contenido y el overflow no llega a
         activarse. */
      className="flex flex-col flex-1 min-h-0 relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-2 z-10 rounded-lg border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Upload className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-primary">Suelta el archivo aquí</p>
          <p className="text-xs text-muted-foreground">{extensions}</p>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Cómo se usa. Sin caja de texto, el panel tiene que explicarse solo. */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            Importar desde plantilla
          </div>
          <p className="text-xs text-muted-foreground">
            Descarga la plantilla, rellénala con tus tareas y súbela. Cada tarea conserva
            área, responsable, estado, prioridad, fechas, descripción y conclusión, igual
            que si la crearas a mano.
          </p>
          {/* `asChild`, y no un <Button> dentro de un <a>: un <button> anidado en un
              enlace es el elemento activable más cercano, así que se queda el clic y el
              enlace no llega a navegar — el botón parece muerto. Con `asChild` el propio
              Button ES el <a>, que es lo que descarga. */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <a href={TEMPLATE_URL} download="plantilla-tareas.md">
                <Download className="h-3.5 w-3.5" />
                Descargar plantilla
              </a>
            </Button>
            {/* El camino real es "se lo pido a una IA y lo subo aquí". Estas
                instrucciones llevan las áreas y las personas de ESTE proyecto, que es lo
                único que la IA no puede adivinar. */}
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={copyAiPrompt}>
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copiar instrucciones para la IA
            </Button>
          </div>
        </div>

        {/* Zona de subida. El arrastre no puede ser la única forma de entrar. */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full rounded-lg border-2 border-dashed p-6 flex flex-col items-center gap-2 text-center transition-colors hover:border-primary/50 hover:bg-muted/30 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Selecciona un archivo</span>
          <span className="text-xs text-muted-foreground">
            o arrástralo aquí — {extensions}, hasta {MAX_TEMPLATE_TASKS} tareas
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={DOCUMENT_ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void takeFile(file);
          }}
        />

        {readError && (
          <div className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
            <span>{readError}</span>
          </div>
        )}

        {/* Problemas del archivo. En el panel y no como toast: un toast dura unos
            segundos y estos hay que tenerlos delante mientras se corrige el archivo. */}
        {issues.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              {issues.length === 1
                ? "Hay un problema en el archivo"
                : `Hay ${issues.length} problemas en el archivo`}
            </div>
            <p className="text-xs text-muted-foreground">
              No se ha creado ninguna tarea. Corrige el archivo y vuelve a subirlo.
            </p>
            <ul className="space-y-1.5">
              {issues.map((issue, index) => (
                <li key={index} className="text-xs">
                  <span className="font-mono text-muted-foreground">línea {issue.line}</span>
                  {issue.taskTitle && (
                    <span className="text-muted-foreground"> · {issue.taskTitle}</span>
                  )}
                  <div>{issue.message}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Avisos: la tarea SÍ se creó, pero no donde decía el archivo. Van en ámbar y
            no en rojo justamente por eso — no hay nada que corregir y volver a subir. */}
        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
              <AlertCircle className="h-4 w-4" />
              {warnings.length === 1
                ? "Se importó con un ajuste"
                : `Se importó con ${warnings.length} ajustes`}
            </div>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-xs text-amber-800">
                  <span className="font-medium">
                    {warning.taskTitle ? `${warning.taskTitle}: ` : `línea ${warning.line}: `}
                  </span>
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {imported.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {imported.length === 1
                ? "1 tarea importada"
                : `${imported.length} tareas importadas`}
            </div>
            {imported.map((task) => (
              <div key={task.id} className="rounded-lg border p-3 space-y-1.5 bg-background">
                <div className="font-medium text-sm">{task.title}</div>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {task.phase && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Layers className="h-2.5 w-2.5" />
                      {task.phase.name}
                    </Badge>
                  )}
                  {task.status && (
                    <Badge
                      variant={getStatusBadgeVariant(task.status) as "default"}
                      className="text-xs"
                    >
                      {getTaskStatusLabel(task.status)}
                    </Badge>
                  )}
                  {task.priority && (
                    <Badge
                      variant={getPriorityBadgeVariant(task.priority) as "default"}
                      className="text-xs gap-1"
                    >
                      <Flag className="h-2.5 w-2.5" />
                      {getTaskPriorityLabel(task.priority)}
                    </Badge>
                  )}
                  {task.assignee?.fullName && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <User className="h-2.5 w-2.5" />
                      {task.assignee.fullName}
                    </Badge>
                  )}
                  {task.dueDate && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Archivo cargado y botón de importar, anclados abajo. */}
      {attachment && (
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium truncate flex-1">{attachment.fileName}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {attachment.characters} car.
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={clearAttachment}
              disabled={isImporting}
              aria-label="Quitar el archivo"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Button onClick={handleImport} disabled={isImporting} className="w-full" size="sm">
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar tareas
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
