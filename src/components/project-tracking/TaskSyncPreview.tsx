import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getStatusBadgeVariant, getTaskStatusLabel } from "@/constants";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle, Plus, Tag, Trash2 } from "lucide-react";
import type { TaskSyncFieldChange, TaskSyncIssue, TaskSyncPlan } from "@/types/api";
import { describeChange, summaryParts } from "./task-sync-preview";

/**
 * Vista previa del import JSON: qué se crea, cambia, elimina y mueve antes de tocar
 * nada. Los conflictos (tareas que cambiaron en el CRM después de exportar) van
 * primero y apagados: sólo se aplican si el usuario los enciende uno a uno.
 */

interface TaskSyncPreviewProps {
  plan: TaskSyncPlan;
  applyConflicts: string[];
  onToggleConflict: (taskId: string, apply: boolean) => void;
}

const ChangeList = ({ changes }: { changes: TaskSyncFieldChange[] }) => (
  <ul className="mt-1.5 space-y-1">
    {changes.map((change, index) => {
      const { label, before, after } = describeChange(change);
      return (
        <li key={index} className="text-xs grid grid-cols-[88px_1fr] gap-2">
          <span className="text-muted-foreground">{label}</span>
          <span className="min-w-0 break-words">
            <span className="text-muted-foreground line-through decoration-muted-foreground/50">{before}</span>
            <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
            <span className="font-medium">{after}</span>
          </span>
        </li>
      );
    })}
  </ul>
);

export const TaskSyncPreview = ({ plan, applyConflicts, onToggleConflict }: TaskSyncPreviewProps) => {
  const conflicts = [
    ...plan.updates.filter((u) => u.conflict).map((u) => ({ ...u, kind: "update" as const })),
    ...plan.deletes.filter((d) => d.conflict).map((d) => ({ ...d, changes: [], kind: "delete" as const })),
  ];
  const updates = plan.updates.filter((u) => !u.conflict);
  const deletes = plan.deletes.filter((d) => !d.conflict);
  const parts = summaryParts(plan.summary);
  const nothing = parts.length === 0 && conflicts.length === 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <CheckCircle className="h-4 w-4 text-primary" />
          {nothing ? "El archivo no trae cambios" : "Vista previa de los cambios"}
        </div>
        {!nothing && (
          <p className="text-xs text-muted-foreground mt-1">
            {parts.join(" · ")}
            {conflicts.length > 0 && ` · ${conflicts.length} en conflicto`}. Nada se aplica hasta que confirmes.
          </p>
        )}
      </div>

      {plan.warnings.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
          {plan.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-800">
              <span className="font-medium">{w.taskTitle ?? w.path}: </span>
              {w.message}
            </p>
          ))}
        </div>
      )}

      {conflicts.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            Cambiaron en el CRM después de exportar
          </div>
          <p className="text-xs text-muted-foreground">
            Por defecto se conservan como están en el CRM. Activa las que quieras sobrescribir con el archivo.
          </p>
          {conflicts.map((c) => (
            <div key={c.taskId} className="rounded-lg border border-amber-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">
                  {c.kind === "delete" && <Trash2 className="inline h-3.5 w-3.5 mr-1 text-destructive" />}
                  {c.title}
                </span>
                <label className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer">
                  Aplicar igualmente
                  <Switch
                    checked={applyConflicts.includes(c.taskId)}
                    onCheckedChange={(checked) => onToggleConflict(c.taskId, checked)}
                    aria-label={`Aplicar el archivo sobre ${c.title}`}
                  />
                </label>
              </div>
              {c.kind === "delete" ? (
                <p className="text-xs text-muted-foreground mt-1">El archivo la elimina.</p>
              ) : (
                <ChangeList changes={c.changes} />
              )}
            </div>
          ))}
        </section>
      )}

      {plan.creates.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <Plus className="h-4 w-4" />
            Nuevas
          </div>
          {plan.creates.map((c) => (
            <div key={c.ref} className="rounded-lg border p-2.5 flex items-center justify-between gap-2">
              <span className="text-sm min-w-0 truncate">{c.title}</span>
              <Badge variant={getStatusBadgeVariant(c.data.status) as "default"} className="text-xs shrink-0">
                {getTaskStatusLabel(c.data.status)}
              </Badge>
            </div>
          ))}
        </section>
      )}

      {updates.length > 0 && (
        <section className="space-y-2">
          <div className="text-sm font-medium">Modificadas</div>
          {updates.map((u) => (
            <div key={u.taskId} className="rounded-lg border p-3">
              <div className="text-sm font-medium">{u.title}</div>
              <ChangeList changes={u.changes} />
            </div>
          ))}
        </section>
      )}

      {deletes.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <Trash2 className="h-4 w-4" />
            Se eliminan
          </div>
          {deletes.map((d) => (
            <div key={d.taskId} className="rounded-lg border border-destructive/30 p-2.5 text-sm">
              {d.title}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Se borran con sus comentarios y entregables. Las horas registradas se conservan.
          </p>
        </section>
      )}

      {plan.tagsToCreate.length > 0 && (
        <section className="flex flex-wrap items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Etiquetas nuevas:</span>
          {plan.tagsToCreate.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
          ))}
        </section>
      )}
    </div>
  );
};

/** Errores del JSON (422). Sin línea: el JSON se localiza por ruta. */
export const TaskSyncIssues = ({ issues }: { issues: TaskSyncIssue[] }) => (
  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
    <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
      <AlertCircle className="h-4 w-4" />
      {issues.length === 1 ? "Hay un problema en el archivo" : `Hay ${issues.length} problemas en el archivo`}
    </div>
    <p className="text-xs text-muted-foreground">No se ha aplicado nada. Corrige el archivo y vuelve a subirlo.</p>
    <ul className="space-y-1.5">
      {issues.map((issue, index) => (
        <li key={index} className="text-xs">
          {issue.path && <span className="font-mono text-muted-foreground">{issue.path}</span>}
          {issue.taskTitle && <span className="text-muted-foreground"> · {issue.taskTitle}</span>}
          <div>{issue.message}</div>
        </li>
      ))}
    </ul>
  </div>
);
