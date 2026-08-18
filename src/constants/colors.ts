import {
  TaskPriority,
  TaskStatus,
  StageCategory,
  UserRole,
  ProjectStatus,
  normalizeRole,
  normalizeProjectStatus,
} from './enums';

// ─── Task Priority Colors ───────────────────────────────────────────────────

const PRIORITY_BG_COLORS: Record<string, string> = {
  [TaskPriority.URGENT]: 'bg-red-500 hover:bg-red-600',
  [TaskPriority.HIGH]: 'bg-orange-500 hover:bg-orange-600',
  [TaskPriority.MEDIUM]: 'bg-yellow-500 hover:bg-yellow-600',
  [TaskPriority.LOW]: 'bg-green-500 hover:bg-green-600',
};

export function getPriorityBgColor(priority: string): string {
  return PRIORITY_BG_COLORS[priority.toUpperCase()] ?? 'bg-gray-500 hover:bg-gray-600';
}

const PRIORITY_BADGE_VARIANT: Record<string, string> = {
  [TaskPriority.URGENT]: 'destructive',
  [TaskPriority.HIGH]: 'destructive',
  [TaskPriority.MEDIUM]: 'default',
  [TaskPriority.LOW]: 'secondary',
};

export function getPriorityBadgeVariant(priority: string): string {
  return PRIORITY_BADGE_VARIANT[priority.toUpperCase()] ?? 'outline';
}

// ─── Task Status Colors ────────────────────────────────────────────────────

const STATUS_BADGE_VARIANT: Record<string, string> = {
  [TaskStatus.COMPLETED]: 'default',
  [TaskStatus.IN_PROGRESS]: 'secondary',
  [TaskStatus.ON_HOLD]: 'outline',
  [TaskStatus.TODO]: 'secondary',
};

export function getStatusBadgeVariant(status: string): string {
  return STATUS_BADGE_VARIANT[status.toUpperCase()] ?? 'secondary';
}

// ─── Lead Stage Colors ─────────────────────────────────────────────────────
// Se decide por la CATEGORÍA de la etapa, no por su slug: las etapas son
// configurables por organización, así que "ganado" en un pipeline puede
// llamarse "closed_won" en otro. `category` es el único campo estable.

export function getLeadStageBadgeVariant(category: string | null | undefined): string {
  if (category === StageCategory.WON) return 'default';
  if (category === StageCategory.LOST) return 'destructive';
  return 'outline';
}

// ─── Project Status Colors ─────────────────────────────────────────────────

const PROJECT_STATUS_COLORS: Record<string, string> = {
  [ProjectStatus.COMPLETED]: 'bg-green-500',
  [ProjectStatus.IN_PROGRESS]: 'bg-blue-500',
  [ProjectStatus.ON_HOLD]: 'bg-yellow-500',
  [ProjectStatus.NOT_STARTED]: 'bg-gray-500',
  [ProjectStatus.ARCHIVED]: 'bg-slate-400',
};

export function getProjectStatusColor(status: string | null | undefined): string {
  const canonical = normalizeProjectStatus(status);
  return (canonical && PROJECT_STATUS_COLORS[canonical]) ?? 'bg-gray-500';
}

// ─── User Role Colors ──────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  [UserRole.SALESMAN]: 'bg-blue-500 hover:bg-blue-600',
  [UserRole.ADMIN]: 'bg-purple-500 hover:bg-purple-600',
  [UserRole.FREELANCER]: 'bg-green-500 hover:bg-green-600',
};

export function getUserRoleBgColor(role: string): string {
  return ROLE_COLORS[normalizeRole(role)] ?? 'bg-gray-500 hover:bg-gray-600';
}
