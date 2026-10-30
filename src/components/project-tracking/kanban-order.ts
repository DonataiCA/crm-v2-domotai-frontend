import type { ProjectTask } from "@/types/api";

/**
 * Orden de las tarjetas en el Kanban del proyecto. Puro y aparte del componente para
 * poder probarlo: el tablero sólo pinta y llama al API.
 *
 * El orden vive en `orderIndex`, por columna (estado). El backend lo guarda con
 * `PUT /projects/:projectId/tasks/reorder` y el export de tareas en JSON usa el mismo
 * criterio, así que lo que se ve aquí es el orden del archivo.
 */

export interface KanbanFilters {
  phaseId: string | null;
  tagIds: string[];
}

export const NO_FILTERS: KanbanFilters = { phaseId: null, tagIds: [] };

/** Algunas respuestas antiguas traían las claves en snake_case. */
type LegacyKeys = { phase_id?: string | null; order_index?: number | null };

const phaseOf = (task: ProjectTask) => (task as ProjectTask & LegacyKeys).phase_id || task.phaseId;
const orderOf = (task: ProjectTask) => (task as ProjectTask & LegacyKeys).order_index ?? task.orderIndex ?? 0;

function matchesFilters(task: ProjectTask, filters: KanbanFilters): boolean {
  if (filters.phaseId && phaseOf(task) !== filters.phaseId) return false;
  if (filters.tagIds.length > 0) {
    const taskTagIds = (task.taskTags || []).map((tt) => tt.tag?.id || tt.tagId);
    if (!filters.tagIds.some((tagId) => taskTagIds.includes(tagId))) return false;
  }
  return true;
}

/**
 * `orderIndex`, luego fecha de creación y luego id: los índices heredados se repiten
 * (la importación Markdown numeraba por área) y sin desempate el orden bailaría entre
 * recargas. Es el mismo criterio que `compareBoardOrder` del backend.
 */
function compareCards(a: ProjectTask, b: ProjectTask): number {
  const byIndex = orderOf(a) - orderOf(b);
  if (byIndex !== 0) return byIndex;
  const byCreated = String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
  if (byCreated !== 0) return byCreated;
  return a.id.localeCompare(b.id);
}

/** Las tarjetas de una columna tal como se ven, filtros incluidos. */
export function columnTasks(tasks: ProjectTask[], status: string, filters: KanbanFilters): ProjectTask[] {
  return tasks.filter((t) => t.status === status && matchesFilters(t, filters)).sort(compareCards);
}

/**
 * Suelta `taskId` en la posición `toIndex` de la columna `toStatus`.
 *
 * `toIndex` es la posición en la lista **visible** (con filtros). Las tarjetas ocultas
 * por el filtro conservan su sitio relativo: la movida se inserta justo antes de la
 * visible que ocupaba ese hueco, o justo después de la última visible.
 *
 * Devuelve el tablero actualizado (mismo orden de array, con el estado, `completedAt`
 * y `orderIndex` nuevos) y la columna destino completa, que es lo que se guarda.
 */
export function moveTask(
  tasks: ProjectTask[],
  move: { taskId: string; toStatus: string; toIndex: number },
  filters: KanbanFilters,
): { tasks: ProjectTask[]; orderedIds: string[] } {
  const moving = tasks.find((t) => t.id === move.taskId);
  if (!moving) return { tasks, orderedIds: [] };

  const column = tasks.filter((t) => t.status === move.toStatus && t.id !== move.taskId).sort(compareCards);
  const visible = column.filter((t) => matchesFilters(t, filters));

  let insertAt: number;
  if (move.toIndex < visible.length) {
    insertAt = column.indexOf(visible[move.toIndex]);
  } else if (visible.length > 0) {
    insertAt = column.indexOf(visible[visible.length - 1]) + 1;
  } else {
    insertAt = column.length;
  }

  const orderedIds = column.map((t) => t.id);
  orderedIds.splice(insertAt, 0, moving.id);
  const position = new Map(orderedIds.map((id, index) => [id, index]));

  const changedStatus = moving.status !== move.toStatus;
  const completedAt =
    move.toStatus === "COMPLETED" ? moving.completedAt ?? new Date().toISOString() : null;

  return {
    tasks: tasks.map((t) => {
      if (!position.has(t.id)) return t;
      const next = { ...t, orderIndex: position.get(t.id)! };
      if (t.id === moving.id && changedStatus) {
        next.status = move.toStatus as ProjectTask["status"];
        next.completedAt = completedAt;
      }
      return next;
    }),
    orderedIds,
  };
}
