import { TaskPriority, TaskStatus, LeadStage, UserRole } from './enums';

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

export function getLeadStageBadgeVariant(stage: string): string {
  if (stage === LeadStage.CLOSED_WON) return 'default';
  if (stage === LeadStage.CLOSED_LOST) return 'destructive';
  return 'outline';
}

// ─── Project Status Colors ─────────────────────────────────────────────────

const PROJECT_STATUS_COLORS: Record<string, string> = {
  'Completed': 'bg-green-500',
  'In Progress': 'bg-blue-500',
  'On Hold': 'bg-yellow-500',
  'Not Started': 'bg-gray-500',
};

export function getProjectStatusColor(status: string): string {
  return PROJECT_STATUS_COLORS[status] ?? 'bg-gray-500';
}

// ─── User Role Colors ──────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  [UserRole.SALESMAN]: 'bg-blue-500 hover:bg-blue-600',
  [UserRole.ADMIN]: 'bg-purple-500 hover:bg-purple-600',
  [UserRole.FREELANCER]: 'bg-green-500 hover:bg-green-600',
};

export function getUserRoleBgColor(role: string): string {
  return ROLE_COLORS[role.toUpperCase()] ?? 'bg-gray-500 hover:bg-gray-600';
}
