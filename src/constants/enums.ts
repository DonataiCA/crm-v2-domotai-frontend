/**
 * Forma canónica de un valor de catálogo en MAYÚSCULA_SNAKE: "In Progress",
 * "in-progress" e "IN_PROGRESS" colapsan en el mismo valor. Espejo de
 * `canonicalize` en el backend. Los roles tienen el suyo (`normalizeRole`)
 * porque su forma canónica es minúscula, no mayúscula.
 */
function canonicalizeEnumValue(value: string): string {
  return String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');
}

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

/**
 * Variantes históricas que la base todavía puede contener. Espejo de
 * `TASK_STATUS_ALIASES` en el backend.
 */
const TASK_STATUS_ALIASES: Record<string, TaskStatusType> = {
  DONE: TaskStatus.COMPLETED,
  COMPLETE: TaskStatus.COMPLETED,
  PENDING: TaskStatus.TODO,
  NOT_STARTED: TaskStatus.TODO,
  IN_REVIEW: TaskStatus.IN_PROGRESS,
  BLOCKED: TaskStatus.ON_HOLD,
  PAUSED: TaskStatus.ON_HOLD,
};

/** Lleva cualquier grafía al valor canónico, o null si no la reconoce. */
export function normalizeTaskStatus(status: string | null | undefined): TaskStatusType | null {
  if (!status) return null;
  const canonical = canonicalizeEnumValue(status);
  if (TASK_STATUS_OPTIONS.some((o) => o.value === canonical)) return canonical as TaskStatusType;
  return TASK_STATUS_ALIASES[canonical] ?? null;
}

export function getTaskStatusLabel(status: string | null | undefined): string {
  const canonical = normalizeTaskStatus(status);
  return canonical
    ? TASK_STATUS_OPTIONS.find((s) => s.value === canonical)!.label
    : (status ?? '');
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

/** Lleva cualquier grafía al valor canónico, o null si no la reconoce. */
export function normalizeTaskPriority(priority: string | null | undefined): TaskPriorityType | null {
  if (!priority) return null;
  const canonical = canonicalizeEnumValue(priority);
  return TASK_PRIORITY_OPTIONS.some((o) => o.value === canonical)
    ? (canonical as TaskPriorityType)
    : null;
}

export function getTaskPriorityLabel(priority: string | null | undefined): string {
  const canonical = normalizeTaskPriority(priority);
  return canonical
    ? TASK_PRIORITY_OPTIONS.find((p) => p.value === canonical)!.label
    : (priority ?? '');
}

// ─── Lead Stages ────────────────────────────────────────────────────────────
// Aquí NO hay catálogo de etapas: son filas de `pipeline_stages`, configurables
// por organización, y cada pipeline tiene las suyas. El catálogo estático que
// vivía aquí era la causa de que el tablero y el dashboard contaran distinto.
//
// `Lead.stage` guarda el **slug** de la etapa (`negociacion`), que es lo que
// exige el backend (`^[a-z0-9_]+$`) y la restricción `leads_stage_slug_check`.
// El nombre visible y la categoría se resuelven contra `lead.pipeline.stages`,
// que el backend incluye en el payload justo para esto.

/** Categorías de etapa que el backend expone en `PipelineStage.category`. */
export const StageCategory = {
  STANDARD: 'standard',
  WON: 'won',
  LOST: 'lost',
} as const;

export type StageCategoryType = (typeof StageCategory)[keyof typeof StageCategory];

/**
 * Convierte un nombre de etapa en el slug que se persiste. Espejo de
 * `slugifyStage` en el backend: minúsculas, sin tildes y con `_` por separador.
 * Sólo hace falta como red de seguridad cuando una etapa no trae `slug`.
 */
export function slugifyStage(name: string | null | undefined): string {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    // \u0300-\u036f es el bloque de diacríticos combinantes que NFD separa
    // de la letra base. Con escapes y no con los caracteres literales: son
    // invisibles en el editor y se pierden al copiar.
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
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
// El valor que viaja y se guarda es MAYÚSCULA_SNAKE: es lo que hay en la base y
// lo que exige `projects_status_check`. La grafía con espacios ("In Progress")
// era el valor almacenado y por eso las comparaciones fallaban en silencio;
// ahora es sólo etiqueta. El orden importa: un test de paridad en el backend lo
// compara posición por posición con su propio catálogo.

export const ProjectStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProjectStatusType = (typeof ProjectStatus)[keyof typeof ProjectStatus];

const PROJECT_STATUS_LABELS: Record<ProjectStatusType, string> = {
  [ProjectStatus.NOT_STARTED]: 'Not Started',
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.ON_HOLD]: 'On Hold',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.ARCHIVED]: 'Archived',
};

/**
 * Opciones seleccionables en un formulario. `ARCHIVED` queda fuera a propósito:
 * archivar es una acción con su propio endpoint, no un estado que se elige de
 * un desplegable.
 */
export const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatusType; label: string }> = [
  { value: ProjectStatus.NOT_STARTED, label: PROJECT_STATUS_LABELS.NOT_STARTED },
  { value: ProjectStatus.IN_PROGRESS, label: PROJECT_STATUS_LABELS.IN_PROGRESS },
  { value: ProjectStatus.ON_HOLD, label: PROJECT_STATUS_LABELS.ON_HOLD },
  { value: ProjectStatus.COMPLETED, label: PROJECT_STATUS_LABELS.COMPLETED },
];

/**
 * Lleva cualquier grafía histórica al valor canónico: "In Progress", "in-progress"
 * y "IN_PROGRESS" colapsan en `IN_PROGRESS`. Espejo de `normalizeProjectStatus`
 * en el backend, incluidos sus alias. Devuelve null si no reconoce el valor, para
 * que quien llama decida el fallback en vez de inventarse un estado.
 */
export function normalizeProjectStatus(status: string | null | undefined): ProjectStatusType | null {
  if (!status) return null;
  const canonical = canonicalizeEnumValue(status);
  if (canonical in PROJECT_STATUS_LABELS) return canonical as ProjectStatusType;
  const aliases: Record<string, ProjectStatusType> = {
    ACTIVE: ProjectStatus.IN_PROGRESS,
    DONE: ProjectStatus.COMPLETED,
    PAUSED: ProjectStatus.ON_HOLD,
  };
  return aliases[canonical] ?? null;
}

/** Etiqueta legible. Tolera grafías históricas y devuelve el valor tal cual si no lo reconoce. */
export function getProjectStatusLabel(status: string | null | undefined): string {
  const canonical = normalizeProjectStatus(status);
  return canonical ? PROJECT_STATUS_LABELS[canonical] : (status ?? '');
}

/** true si el proyecto está en curso. Evita repetir la comparación en cada pantalla. */
export function isProjectInProgress(status: string | null | undefined): boolean {
  return normalizeProjectStatus(status) === ProjectStatus.IN_PROGRESS;
}

// ─── Pricing Types ──────────────────────────────────────────────────────────

export const PricingType = {
  FLAT: 'flat',
  RECURRING: 'recurring',
} as const;

export type PricingTypeType = (typeof PricingType)[keyof typeof PricingType];
