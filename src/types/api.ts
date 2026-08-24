import type { TaskStatusType, TaskPriorityType, ProjectStatusType, PricingTypeType } from '@/constants/enums';

// ─── Generic pagination wrapper ───────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── Compact nested refs (returned inside other models) ─────────────────────

export interface UserRef {
  id: string;
  fullName: string | null;
  email: string;
}

export interface ContactRef {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company?: string | null;
}

export interface ProjectRef {
  id: string;
  name: string;
}

export interface LeadRef {
  id: string;
  name: string | null;
}

export interface PhaseRef {
  id: string;
  name: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  providerId: string | null;
  authProvider: string | null;
  role: string;
  commissionRate: number | null;
  shouldChangePassword: boolean;
  currentOrganizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  isNewUser?: boolean;
}

// ─── Organization ────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  colorScheme: string;
  createdBy: string | null;
  createdAt: string;
  role: string | null;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    role: string | null;
    commissionRate: number | null;
  } | null;
}

// ─── Company ─────────────────────────────────────────────────────────────────

export interface CompanyRef {
  id: string;
  name: string;
  domain?: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  assignedTo: UserRef | null;
  createdBy: UserRef | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { contacts: number; leads: number; tasks: number };
  contacts?: ContactRef[];
  leads?: LeadRef[];
  tasks?: Task[];
  fileLinks?: FileLink[];
}

export interface CompanyPayload {
  name?: string;
  domain?: string | null;
  industry?: string | null;
  size?: string | null;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export interface ContactNote {
  id: string;
  contactId?: string;
  note: string;
  createdBy: UserRef | null;
  createdAt: string;
}

export interface FileLink {
  id: string;
  contactId?: string | null;
  leadId?: string | null;
  companyId?: string | null;
  title: string;
  url: string;
  fileType: string | null;
  createdBy: UserRef | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  companyId?: string | null;
  companyRef?: CompanyRef | null;
  category: string | null;
  role: string | null;
  leadSource: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  totalRevenue: number;
  assignedTo: UserRef | null;
  createdBy: UserRef | null;
  organizationId: string;
  createdAt: string;
  notes?: ContactNote[];
  fileLinks?: FileLink[];
}

// ─── Lead ────────────────────────────────────────────────────────────────────

export interface LeadEvent {
  id: string;
  leadId: string;
  organizationId: string;
  eventType: string;
  description: string;
  createdBy: string | null;
  createdAt: string;
  creator: UserRef | null;
}

export interface LeadStageHistory {
  id: string;
  leadId: string;
  stage: string;
  enteredAt: string;
  exitedAt: string | null;
  durationSeconds: number | null;
  createdBy: string | null;
  creator: UserRef | null;
}

export interface Lead {
  id: string;
  name: string | null;
  details: string | null;
  /** Slug de la etapa dentro de su pipeline, no un catálogo global. */
  stage: string | null;
  pipelineId: string | null;
  price: number | null;
  pricingType: PricingTypeType | string | null;
  paymentDate: string | null;
  recurringStartDate: string | null;
  recurringEndDate: string | null;
  nextFollowUp: string | null;
  converted: boolean;
  convertedAt: string | null;
  contactId: string | null;
  companyId?: string | null;
  projectId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  organizationId: string;
  createdAt: string;
  contact: ContactRef | null;
  company?: CompanyRef | null;
  assignee: UserRef | null;
  creator: UserRef | null;
  project: ProjectRef | null;
  /**
   * El pipeline con sus etapas. El backend lo incluye porque `stage` es un slug:
   * sin el catálogo del pipeline no se puede resolver el nombre visible ni la
   * categoría con la que se decide el color.
   */
  pipeline?: Pipeline | null;
  events?: LeadEvent[];
  stageHistory?: LeadStageHistory[];
  fileLinks?: FileLink[];
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  category: 'standard' | 'won' | 'lost';
  weight: number;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  organizationId: string;
  createdAt: string;
  stages: PipelineStage[];
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface ProjectMilestone {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

export interface ProjectTeamMember {
  id: string;
  projectId?: string;
  userId: string;
  createdAt: string;
  user: UserRef | null;
}

export interface Tag {
  id: string;
  name: string;
  nameLower: string;
  color: string | null;
  organizationId: string;
  createdBy: string | null;
  createdAt: string;
  creator?: UserRef | null;
  _count?: { taskTags: number };
}

export interface ProjectTaskTag {
  projectTaskId: string;
  tagId: string;
  tag: Tag;
}

export interface ProjectTask {
  id: string;
  projectId: string | null;
  phaseId: string | null;
  organizationId: string | null;
  title: string;
  description: string | null;
  conclusion: string | null;
  status: TaskStatusType | string;
  priority: TaskPriorityType | string;
  orderIndex: number | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdByGuest: boolean | null;
  guestEmail: string | null;
  updatedByGuest: boolean | null;
  createdAt: string;
  updatedAt: string;
  assignee: UserRef | null;
  creator: UserRef | null;
  phase: PhaseRef | null;
  taskTags?: ProjectTaskTag[];
  comments?: TaskComment[];
}

export interface ProjectPhase {
  id: string;
  projectId: string | null;
  name: string;
  description: string | null;
  status: string | null;
  orderIndex: number | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string | null;
  createdAt: string;
  tasks: ProjectTask[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatusType | string | null;
  complexity: string | null;
  price: number | null;
  pricingType: PricingTypeType | string | null;
  revenue: number | null;
  paymentDate: string | null;
  recurringStartDate: string | null;
  recurringEndDate: string | null;
  commissionPaid: boolean;
  totalHours: number | null;
  prd: string | null;
  startDate: string | null;
  endDate: string | null;
  repositoryUrl: string | null;
  repositoryName: string | null;
  githubOwner: string | null;
  defaultBranch: string | null;
  productionUrl: string | null;
  monitorApiKey: string | null;
  lastGitSyncAt?: string | null;
  projectLeadId: string | null;
  createdBy: string | null;
  organizationId: string;
  createdAt: string;
  projectLead: UserRef | null;
  creator: UserRef | null;
  milestones?: ProjectMilestone[];
  contacts?: ContactRef[];
  teamMembers?: ProjectTeamMember[];
  phases?: ProjectPhase[];
}

// ─── Task ────────────────────────────────────────────────────────────────────

export interface TaskComment {
  id: string;
  taskId: string | null;
  projectTaskId: string | null;
  organizationId: string | null;
  content: string;
  imageUrls?: string[];
  createdBy: string | null;
  createdByGuest: boolean | null;
  guestEmail: string | null;
  createdAt: string;
  updatedAt: string;
  creator: UserRef | null;
}

export interface TaskLink {
  id: string;
  taskId: string | null;
  projectTaskId: string | null;
  organizationId: string | null;
  title: string;
  url: string;
  linkType: string | null;
  createdBy: string | null;
  createdByGuest: boolean | null;
  guestEmail: string | null;
  createdAt: string;
  creator: UserRef | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatusType | string;
  priority: TaskPriorityType | string;
  progress: number;
  dueDate: string | null;
  reminderDate: string | null;
  assignedTo: string | null;
  contactId: string | null;
  leadId: string | null;
  companyId?: string | null;
  projectId: string | null;
  createdBy: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  assignee: UserRef | null;
  contact: ContactRef | null;
  lead: LeadRef | null;
  company?: CompanyRef | null;
  project: ProjectRef | null;
  creator: UserRef | null;
  comments?: TaskComment[];
  links?: TaskLink[];
}

// ─── GitHub ──────────────────────────────────────────────────────────────────

export interface ProjectRepo {
  id: string;
  projectId: string;
  organizationId: string;
  label: string | null;
  githubOwner: string;
  repositoryName: string;
  repositoryUrl: string | null;
  defaultBranch: string | null;
  lastGitSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRepoRef {
  id: string;
  label: string | null;
  githubOwner: string;
  repositoryName: string;
}

export interface GitCommit {
  id: string;
  projectId: string;
  projectRepoId?: string | null;
  projectRepo?: ProjectRepoRef | null;
  organizationId: string;
  commitSha: string;
  commitMessage: string | null;
  commitAuthor: string | null;
  commitDate: string | null;
  branchName: string | null;
  filesChanged: number | null;
  additions: number | null;
  deletions: number | null;
  repositoryUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitMetric {
  id: string;
  projectId: string;
  projectRepoId?: string | null;
  projectRepo?: ProjectRepoRef | null;
  organizationId: string;
  repositoryUrl: string;
  branchName: string;
  commitsCount: number | null;
  lastCommitSha: string | null;
  lastCommitDate: string | null;
  lastCommitMessage: string | null;
  lastCommitAuthor: string | null;
  pullRequestsCount: number | null;
  openIssuesCount: number | null;
  closedIssuesCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubSyncResponse {
  success: boolean;
  syncedMetrics: number;
  syncedCommits: number;
}

export interface GitHubMetricsResponse {
  success: boolean;
  metrics: GitMetric[];
}

export interface GitHubCommitsResponse {
  success: boolean;
  commits: GitCommit[];
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsDateRange {
  from?: string;
  to?: string;
}

export interface AnalyticsKeyMetrics {
  customersCount: number;
  totalRevenue: number;
  activeDealsCount: number;
  winRate: number;
}

export interface SalesOverviewItem {
  month: string;
  revenue: number;
}

export interface RevenueByClientItem {
  name: string;
  company: string | null;
  total_revenue: number;
}

export interface FreelancerCommissionItem {
  month: string;
  commissions: number;
}

export interface LeadConversionItem {
  name: string;
  value: number;
}

// ─── Media ───────────────────────────────────────────────────────────────────

export interface MediaUploadResponse {
  url: string;
  key: string;
  fileName?: string;
  size?: number;
  mimeType?: string;
}

// ─── AI Task Generation ─────────────────────────────────────────────────────

export interface AIGeneratedTask {
  title: string;
  description: string;
  status: string;
  priority: string;
  phase_id: string;
  assigned_to?: string;
  start_date?: string;
  due_date?: string;
  order_index: number;
}

export interface AIGenerateTasksResponse {
  success: boolean;
  generated: number;
  tasks: ProjectTask[];
}

// ─── Importación de tareas por plantilla ────────────────────────────────────

/**
 * Un problema concreto del archivo subido, con la línea donde está. El backend los
 * devuelve todos de una vez —no sólo el primero— para que se pueda corregir el archivo
 * de una sola pasada.
 */
export interface TemplateIssue {
  line: number;
  taskTitle?: string;
  message: string;
}

/**
 * Respuesta de `POST /projects/:id/import-tasks`. Es todo o nada: con `issues` no vacío
 * llega como 422 y `created` es 0.
 */
export interface ImportTasksResponse {
  created: number;
  tasks: ProjectTask[];
  /** Impiden importar: no se ha creado ninguna tarea. */
  issues: TemplateIssue[];
  /**
   * La tarea se creó, pero colocada de otra forma: un área que no existe cae en la
   * primera fase y un responsable que no es miembro se queda sin asignar. Opcional
   * porque un backend anterior a este cambio no lo devuelve.
   */
  warnings?: TemplateIssue[];
}

// ─── Calendar Event ─────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  color: string | null;
  contactId: string | null;
  leadId: string | null;
  projectId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  contact: ContactRef | null;
  lead: LeadRef | null;
  project: ProjectRef | null;
  creator: UserRef | null;
}

/**
 * Hito derivado de un proyecto o de una fase. No vive en `calendar_events`: el
 * backend lo calcula en cada consulta de `/calendar/overview`, así que es de
 * sólo lectura — se edita desde el proyecto, no desde el calendario.
 */
export interface CalendarMilestone {
  kind: 'project-start' | 'project-end' | 'phase-start' | 'phase-end';
  refId: string;
  projectId: string;
  title: string;
  projectName: string;
  status: string | null;
  date: string;
}

export interface CalendarOverview {
  events: CalendarEvent[];
  projects: CalendarMilestone[];
  phases: CalendarMilestone[];
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: UserRef | null;
}

// ─── Input Payloads (what the frontend sends to the backend) ────────────────

export interface ContactPayload {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  companyId?: string | null;
  category?: string | null;
  role?: string | null;
  leadSource?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  assignedTo?: string | null;
}

export interface LeadPayload {
  name?: string | null;
  details?: string | null;
  stage?: string | null;
  pipelineId?: string | null;
  price?: number | null;
  pricingType?: string | null;
  paymentDate?: string | null;
  recurringStartDate?: string | null;
  recurringEndDate?: string | null;
  nextFollowUp?: string | null;
  converted?: boolean;
  convertedAt?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  assignedTo?: string | null;
}

export interface TaskPayload {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  progress?: number;
  dueDate?: string | null;
  reminderDate?: string | null;
  assignedTo?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  companyId?: string | null;
  projectId?: string | null;
}

export interface ProjectPayload {
  name?: string;
  description?: string | null;
  status?: string | null;
  complexity?: string | null;
  price?: number | null;
  pricingType?: string | null;
  revenue?: number | null;
  paymentDate?: string | null;
  recurringStartDate?: string | null;
  recurringEndDate?: string | null;
  totalHours?: number | null;
  prd?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  repositoryUrl?: string | null;
  repositoryName?: string | null;
  githubOwner?: string | null;
  defaultBranch?: string | null;
  projectLeadId?: string | null;
  contactIds?: string[];
}

export interface ProjectTaskPayload {
  title?: string;
  description?: string | null;
  conclusion?: string | null;
  status?: string;
  priority?: string;
  phaseId?: string | null;
  orderIndex?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  assignedTo?: string | null;
}

export interface ProjectPhasePayload {
  name?: string;
  description?: string | null;
  status?: string | null;
  orderIndex?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

// ─── Invoice ────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  contactId: string | null;
  projectId: string | null;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  contact: ContactRef | null;
  project: ProjectRef | null;
  creator: UserRef | null;
  items: InvoiceItem[];
}

// ─── Time Entry ─────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  organizationId: string;
  userId: string;
  projectId: string | null;
  projectTaskId: string | null;
  taskId: string | null;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  billable: boolean;
  hourlyRate: number | null;
  createdAt: string;
  updatedAt: string;
  user: UserRef | null;
  project: ProjectRef | null;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  emailSent: boolean;
  createdAt: string;
  actor: UserRef | null;
}

export interface NotificationPreference {
  id: string;
  notificationType: string;
  channel: 'IN_APP' | 'EMAIL' | 'BOTH';
  enabled: boolean;
}

export interface NotificationPreferencesResponse {
  data: NotificationPreference[];
  types: Record<string, string>;
  labels: Record<string, string>;
  categories: Record<string, string[]>;
}
