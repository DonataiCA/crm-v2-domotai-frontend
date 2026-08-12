// ─── Task Status ────────────────────────────────────────────────────────────

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_OPTIONS: Array<{ value: TaskStatusType; label: string }> = [
  { value: TaskStatus.TODO, label: 'To Do' },
  { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { value: TaskStatus.ON_HOLD, label: 'On Hold' },
  { value: TaskStatus.COMPLETED, label: 'Completed' },
];

export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

// ─── Task Priority ──────────────────────────────────────────────────────────

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TaskPriorityType = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TASK_PRIORITY_OPTIONS: Array<{ value: TaskPriorityType; label: string }> = [
  { value: TaskPriority.LOW, label: 'Low' },
  { value: TaskPriority.MEDIUM, label: 'Medium' },
  { value: TaskPriority.HIGH, label: 'High' },
  { value: TaskPriority.URGENT, label: 'Urgent' },
];

export function getTaskPriorityLabel(priority: string): string {
  return TASK_PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority;
}

// ─── Lead Stages ────────────────────────────────────────────────────────────

export const LeadStage = {
  NEW: 'new',
  CONTACT_ESTABLISHED: 'contact_established',
  FIRST_MEETING: 'first_meeting',
  NEGOTIATING: 'negotiating',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
  ON_HOLD: 'on_hold',
} as const;

export type LeadStageType = (typeof LeadStage)[keyof typeof LeadStage];

export const LEAD_STAGE_OPTIONS: Array<{ value: LeadStageType; label: string }> = [
  { value: LeadStage.NEW, label: 'New' },
  { value: LeadStage.CONTACT_ESTABLISHED, label: 'Contact Established' },
  { value: LeadStage.FIRST_MEETING, label: 'First Meeting' },
  { value: LeadStage.NEGOTIATING, label: 'Negotiating' },
  { value: LeadStage.CLOSED_WON, label: 'Closed Won' },
  { value: LeadStage.CLOSED_LOST, label: 'Closed Lost' },
  { value: LeadStage.ON_HOLD, label: 'On Hold' },
];

export function getLeadStageLabel(stage: string): string {
  return LEAD_STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;
}

// ─── User Roles ─────────────────────────────────────────────────────────────
// La forma canónica es minúscula: es la que guarda Profile.role en la base.
// Los predicados normalizan internamente para que ninguna pantalla tenga que
// acordarse de hacerlo — de ahí venían las comparaciones divergentes.

export const UserRole = {
  ADMIN: 'admin',
  SALESMAN: 'salesman',
  FREELANCER: 'freelancer',
  CLIENT: 'client',
  VIEWER: 'viewer',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_OPTIONS: Array<{ value: UserRoleType; label: string }> = [
  { value: UserRole.ADMIN, label: 'Admin' },
  { value: UserRole.SALESMAN, label: 'Salesman' },
  { value: UserRole.FREELANCER, label: 'Freelancer' },
  { value: UserRole.CLIENT, label: 'Client' },
  { value: UserRole.VIEWER, label: 'Viewer' },
];

/** Roles internos: los que operan el CRM, por oposición a client y viewer. */
export const TEAM_ROLES: UserRoleType[] = [
  UserRole.ADMIN,
  UserRole.SALESMAN,
  UserRole.FREELANCER,
];

/**
 * Lleva cualquier variante a la forma canónica: "Admin", " ADMIN " y "admin"
 * colapsan en "admin". Devuelve '' para valores vacíos.
 */
export function normalizeRole(role: string | null | undefined): string {
  if (!role) return '';
  return String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function getUserRoleLabel(role: string): string {
  const normalized = normalizeRole(role);
  return USER_ROLE_OPTIONS.find((r) => r.value === normalized)?.label ?? role;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === UserRole.ADMIN;
}

export function isClientRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === UserRole.CLIENT;
}

export function isViewerRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === UserRole.VIEWER;
}

/** true para admin, salesman y freelancer. */
export function isTeamMemberRole(role: string | null | undefined): boolean {
  return (TEAM_ROLES as string[]).includes(normalizeRole(role));
}

export function canEditProjects(role: string | null | undefined): boolean {
  return isTeamMemberRole(role);
}

// ─── Organization Roles ─────────────────────────────────────────────────────

export const OrgRole = {
  ADMIN: 'admin',
  MEMBER: 'member',
  CLIENT: 'client',
} as const;

export type OrgRoleType = (typeof OrgRole)[keyof typeof OrgRole];

// ─── Project Status ─────────────────────────────────────────────────────────

export const ProjectStatus = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
} as const;

export type ProjectStatusType = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatusType; label: string }> = [
  { value: ProjectStatus.NOT_STARTED, label: 'Not Started' },
  { value: ProjectStatus.IN_PROGRESS, label: 'In Progress' },
  { value: ProjectStatus.ON_HOLD, label: 'On Hold' },
  { value: ProjectStatus.COMPLETED, label: 'Completed' },
];

// ─── Pricing Types ──────────────────────────────────────────────────────────

export const PricingType = {
  FLAT: 'flat',
  RECURRING: 'recurring',
} as const;

export type PricingTypeType = (typeof PricingType)[keyof typeof PricingType];
