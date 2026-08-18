import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api-client";
import { readAttachment, type Attachment } from "@/lib/read-attachment";
import { ACCEPTED_DOCUMENT_EXTENSIONS } from "@/constants/document";
import {
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle,
  Pencil,
  Layers,
  Calendar,
  Flag,
  FileText,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import type { ProjectTask } from "@/types/api";

/**
 * El chat corriente responde en segundos, pero interpretar un documento entero puede
 * tardar bastante más. El axios global corta a los 30 s (`api-client.ts`), así que esta
 * petición —y sólo esta— pide más margen.
 */
const CHAT_TASK_TIMEOUT_MS = 120_000;

type TaskWithPhase = ProjectTask & { phase?: { id: string; name: string } | null };

interface ChatResult {
  action: "create" | "update";
  task: TaskWithPhase;
  aiInterpretation?: { workArea: string | null; assignee: string | null };
  changes?: Record<string, unknown>;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: ChatResult[];
  createdCount?: number;
  updatedCount?: number;
  /** Nombre del archivo que acompañaba al mensaje, para que el historial se entienda. */
  attachmentName?: string;
}

interface TaskChatProps {
  projectId: string;
  onTaskCreated: () => void;
}

export const TaskChat = ({ projectId, onTaskCreated }: TaskChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        'Describe lo que necesitas en lenguaje natural. Puedo:\n\n• **Crear tareas**: "Crear endpoint de login con JWT y bcrypt"\n• **Asignar**: "Asigna las tareas en TODO a David Altuve"\n• **Cambiar prioridad**: "Sube a urgente la tarea de la API de pagos"\n• **Cambiar estado**: "Marca como completada la tarea de diseño del dashboard"\n• **Mover de fase**: "Mueve la tarea de tests al área de QA"\n\nTambién puedes arrastrar aquí un archivo .md o .txt y sacar las tareas de su contenido.',
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildSummaryHeader = (createdCount: number, updatedCount: number): string => {
    const parts: string[] = [];
    if (createdCount > 0) parts.push(`${createdCount} ${createdCount === 1 ? "tarea creada" : "tareas creadas"}`);
    if (updatedCount > 0) parts.push(`${updatedCount} ${updatedCount === 1 ? "tarea actualizada" : "tareas actualizadas"}`);
    return parts.length > 0 ? parts.join(" · ") : "Sin cambios";
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachError(null);
  };

  /**
   * `preventDefault` en todos los eventos de arrastre: sin él el navegador abre el
   * archivo en la pestaña y se pierde la sesión del CRM.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading) setIsDragging(true);
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
    if (isLoading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (files.length > 1) {
      setAttachment(null);
      setAttachError("Sólo se puede adjuntar un archivo a la vez.");
      return;
    }

    const result = await readAttachment(files[0]);
    if (!result.ok) {
      setAttachment(null);
      setAttachError(result.error);
      return;
    }

    setAttachment(result.attachment);
    setAttachError(null);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const text = input.trim();
    // Con un documento adjunto no hace falta escribir nada: el archivo es la petición.
    if ((!text && !attachment) || isLoading) return;

    const sentAttachment = attachment;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      attachmentName: sentAttachment?.fileName,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    clearAttachment();
    setIsLoading(true);

    try {
      const { data } = await api.post(
        `/projects/${projectId}/chat-task`,
        {
          message: text,
          document: sentAttachment
            ? { fileName: sentAttachment.fileName, content: sentAttachment.content }
            : undefined,
        },
        { timeout: CHAT_TASK_TIMEOUT_MS },
      );

      // New shape: { results, createdCount, updatedCount, count }
      // Legacy shape: { task, tasks, count } — synthesize results from it
      let results: ChatResult[] = [];
      let createdCount = 0;
      let updatedCount = 0;

      if (Array.isArray(data.results)) {
        results = data.results;
        createdCount = data.createdCount ?? results.filter((r: ChatResult) => r.action === "create").length;
        updatedCount = data.updatedCount ?? results.filter((r: ChatResult) => r.action === "update").length;
      } else if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        results = data.tasks.map((t: any) => ({
          action: "create" as const,
          task: t.task,
          aiInterpretation: t.aiInterpretation,
          summary: `Created "${t.task?.title}"`,
        }));
        createdCount = results.length;
      }

      const headerText = results.length === 0
        ? "No identifiqué ninguna tarea para crear ni actualizar. Reformula tu petición."
        : buildSummaryHeader(createdCount, updatedCount);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: headerText,
        results: results.length > 0 ? results : undefined,
        createdCount,
        updatedCount,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (results.length > 0) onTaskCreated();
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.error || (error instanceof Error ? error.message : "Falló el procesamiento");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${errMsg}. Reformula tu petición.`,
        },
      ]);
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-500 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-yellow-500 text-white";
      default:
        return "bg-green-500 text-white";
    }
  };

  return (
    <div
      className="flex flex-col h-full relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-2 z-10 rounded-lg border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Upload className="h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-primary">Suelta el archivo aquí</p>
          <p className="text-xs text-muted-foreground">
            {ACCEPTED_DOCUMENT_EXTENSIONS.join(" o ")}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.results ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {msg.content}
                  </div>
                  {msg.results.map((r, idx) => {
                    const isUpdate = r.action === "update";
                    return (
                      <div
                        key={idx}
                        className={`space-y-1.5 ${idx > 0 ? "border-t pt-2" : ""}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isUpdate ? (
                            <Pencil className="h-3 w-3 text-blue-600" />
                          ) : (
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                          )}
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {isUpdate ? "Actualizada" : "Creada"}
                          </span>
                        </div>
                        <div className="font-medium text-sm">{r.task?.title}</div>
                        {!isUpdate && r.task?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {r.task.description}
                          </p>
                        )}
                        {isUpdate && r.changes && (
                          <p className="text-xs text-muted-foreground italic">
                            {r.summary.replace(/^"[^"]+"\s*—\s*/, "")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {r.task?.phase && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Layers className="h-2.5 w-2.5" />
                              {r.task.phase.name}
                            </Badge>
                          )}
                          {r.task?.priority && (
                            <Badge
                              className={`text-xs ${getPriorityColor(r.task.priority)}`}
                            >
                              <Flag className="h-2.5 w-2.5 mr-0.5" />
                              {r.task.priority}
                            </Badge>
                          )}
                          {(r.aiInterpretation?.assignee || (r.task as any)?.assignee?.fullName) && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <User className="h-2.5 w-2.5" />
                              {r.aiInterpretation?.assignee || (r.task as any)?.assignee?.fullName}
                            </Badge>
                          )}
                          {r.task?.dueDate && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(r.task.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {msg.content && <p className="whitespace-pre-line">{msg.content}</p>}
                  {msg.attachmentName && (
                    <div className="flex items-center gap-1.5 text-xs opacity-90">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{msg.attachmentName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-lg px-3.5 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Adjunto y su error — en el panel y no como toast: el toast dura unos segundos
          y desaparece, y un error de validación tiene que quedarse mientras se corrige. */}
      {(attachment || attachError) && (
        <div className="border-t px-3 pt-2.5">
          {attachment && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium truncate flex-1">
                {attachment.fileName}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {attachment.characters} car.
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={clearAttachment}
                disabled={isLoading}
                aria-label="Quitar el archivo adjunto"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {attachError && (
            <div className="flex items-start gap-1.5 text-xs text-destructive mt-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span>{attachError}</span>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className={`p-3 flex gap-2 ${attachment || attachError ? "" : "border-t"}`}>
        <Input
          ref={inputRef}
          placeholder={
            attachment
              ? "Instrucción opcional sobre el documento..."
              : "Crear, asignar, cambiar prioridad..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={isLoading}
          className="h-9"
        />
        <Button
          onClick={handleSend}
          disabled={(!input.trim() && !attachment) || isLoading}
          size="sm"
          className="h-9 px-3"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
