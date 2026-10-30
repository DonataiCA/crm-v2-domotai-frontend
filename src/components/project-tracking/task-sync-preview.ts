import { getTaskPriorityLabel, getTaskStatusLabel } from "@/constants";
import type { TaskSyncFieldChange, TaskSyncSummary } from "@/types/api";

/**
 * Textos de la vista previa del import JSON. Puro, para probarlo sin montar el panel.
 */

const LABELS: Record<string, string> = {
  title: "Título",
  description: "Descripción",
  conclusion: "Conclusión",
  status: "Estado",
  priority: "Prioridad",
  phase: "Área",
  assignee: "Responsable",
  startDate: "Inicio",
  dueDate: "Vencimiento",
  progress: "Progreso",
  tags: "Etiquetas",
  deliverables: "Entregables",
};

const MAX_SHOWN = 120;

function shown(field: string, value: string | number | null): string {
  if (value === null || value === "") return "—";
  if (field === "status") return getTaskStatusLabel(String(value));
  if (field === "priority") return getTaskPriorityLabel(String(value));
  if (field === "progress") return `${value}%`;
  const text = String(value);
  return text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}…` : text;
}

export function describeChange(change: TaskSyncFieldChange): { label: string; before: string; after: string } {
  return {
    label: LABELS[change.field] ?? change.field,
    before: shown(change.field, change.before),
    after: shown(change.field, change.after),
  };
}

/** `['1 nueva', '3 modificadas', …]`, sólo lo que no es cero. Los conflictos van aparte. */
export function summaryParts(summary: TaskSyncSummary): string[] {
  const part = (n: number, one: string, many: string) => (n > 0 ? [`${n} ${n === 1 ? one : many}`] : []);
  return [
    ...part(summary.creates, "nueva", "nuevas"),
    ...part(summary.updates, "modificada", "modificadas"),
    ...part(summary.deletes, "eliminada", "eliminadas"),
    ...part(summary.moves, "movida", "movidas"),
    ...part(summary.tagsToCreate, "etiqueta nueva", "etiquetas nuevas"),
  ];
}
