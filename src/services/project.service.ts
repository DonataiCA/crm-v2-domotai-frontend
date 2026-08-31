import api from '@/lib/api-client';
import {
  Project,
  ProjectPhase,
  ProjectTask,
  ProjectTeamMember,
  ProjectPayload,
  ProjectTaskPayload,
  ProjectPhasePayload,
  PaginatedResponse,
  TaskComment,
  ImportTasksResponse,
  TaskDeliverable,
  ProjectLink,
} from '@/types/api';

export const projectService = {
  getProjects: async (
    page = 1,
    limit = 20,
    filters?: Record<string, string>,
  ): Promise<PaginatedResponse<Project>> => {
    const { data } = await api.get<PaginatedResponse<Project>>('/projects', {
      params: { page, limit, ...filters },
    });
    return data;
  },

  getMyProjects: async (
    page = 1,
    limit = 200,
  ): Promise<PaginatedResponse<Project>> => {
    const { data } = await api.get<PaginatedResponse<Project>>('/projects', {
      params: { page, limit, mine: 'true' },
    });
    return data;
  },

  getProject: async (id: string): Promise<Project> => {
    const { data } = await api.get<Project>(`/projects/${id}`);
    return data;
  },

  createProject: async (projectData: ProjectPayload): Promise<Project> => {
    const { data } = await api.post<Project>('/projects', projectData);
    return data;
  },

  updateProject: async (id: string, projectData: ProjectPayload): Promise<Project> => {
    const { data } = await api.put<Project>(`/projects/${id}`, projectData);
    return data;
  },

  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  archiveProject: async (id: string): Promise<void> => {
    await api.patch(`/projects/${id}/archive`);
  },

  restoreProject: async (id: string): Promise<void> => {
    await api.patch(`/projects/${id}/restore`);
  },

  getArchivedProjects: async (): Promise<{ data: { id: string; name: string; status: string | null; deletedAt: string }[] }> => {
    const { data } = await api.get('/projects/archived');
    return data;
  },

  getTrackingData: async (id: string): Promise<{ phases: ProjectPhase[] }> => {
    const { data } = await api.get<{ phases: ProjectPhase[] }>(`/projects/${id}/tracking`);
    return data;
  },

  // ─── Phases ──────────────────────────────────────────────────────────────

  createPhase: async (projectId: string, phaseData: ProjectPhasePayload): Promise<ProjectPhase> => {
    const { data } = await api.post<ProjectPhase>(`/projects/${projectId}/phases`, phaseData);
    return data;
  },

  updatePhase: async (phaseId: string, phaseData: ProjectPhasePayload): Promise<ProjectPhase> => {
    const { data } = await api.put<ProjectPhase>(`/projects/phases/${phaseId}`, phaseData);
    return data;
  },

  deletePhase: async (phaseId: string): Promise<void> => {
    await api.delete(`/projects/phases/${phaseId}`);
  },

  // ─── Project Tasks ──────────────────────────────────────────────────────

  createProjectTask: async (projectId: string, taskData: ProjectTaskPayload): Promise<ProjectTask> => {
    const { data } = await api.post<ProjectTask>(`/projects/${projectId}/tasks`, taskData);
    return data;
  },

  updateProjectTask: async (taskId: string, taskData: ProjectTaskPayload): Promise<ProjectTask> => {
    const { data } = await api.put<ProjectTask>(`/projects/project-tasks/${taskId}`, taskData);
    return data;
  },

  deleteProjectTask: async (taskId: string): Promise<void> => {
    await api.delete(`/projects/project-tasks/${taskId}`);
  },

  /**
   * Alta de tareas desde la plantilla Markdown. El archivo se lee en el navegador
   * (`readAttachment`) y viaja como texto: no se sube a ningún sitio.
   *
   * El backend responde 422 con `{ issues }` cuando algo del archivo no se entiende, y no
   * crea nada en ese caso. Ese 422 **no es un fallo de red**: lo captura el panel y lo
   * pinta como una lista de problemas con su línea, así que aquí se deja pasar tal cual.
   */
  importTasks: async (
    projectId: string,
    document: { fileName: string; content: string },
  ): Promise<ImportTasksResponse> => {
    const { data } = await api.post<ImportTasksResponse>(
      `/projects/${projectId}/import-tasks`,
      { document },
    );
    return data;
  },

  // ─── Project Task Comments ─────────────────────────────────────────────

  addTaskComment: async (taskId: string, content: string, imageUrls?: string[]): Promise<TaskComment> => {
    const { data } = await api.post<TaskComment>(`/projects/project-tasks/${taskId}/comments`, { content, imageUrls });
    return data;
  },

  deleteTaskComment: async (commentId: string): Promise<void> => {
    await api.delete(`/projects/project-tasks/comments/${commentId}`);
  },

  // ─── Task Deliverables ─────────────────────────────────────────────────

  createDeliverable: async (taskId: string, title: string): Promise<TaskDeliverable> => {
    const { data } = await api.post<TaskDeliverable>(`/projects/project-tasks/${taskId}/deliverables`, { title });
    return data;
  },

  updateDeliverable: async (deliverableId: string, payload: { title?: string; done?: boolean }): Promise<TaskDeliverable> => {
    const { data } = await api.put<TaskDeliverable>(`/projects/project-tasks/deliverables/${deliverableId}`, payload);
    return data;
  },

  deleteDeliverable: async (deliverableId: string): Promise<void> => {
    await api.delete(`/projects/project-tasks/deliverables/${deliverableId}`);
  },

  // ─── Project Links ─────────────────────────────────────────────────────

  getLinks: async (projectId: string): Promise<ProjectLink[]> => {
    const { data } = await api.get<ProjectLink[]>(`/projects/${projectId}/links`);
    return data;
  },

  createLink: async (
    projectId: string,
    payload: { title: string; url: string; description?: string | null },
  ): Promise<ProjectLink> => {
    const { data } = await api.post<ProjectLink>(`/projects/${projectId}/links`, payload);
    return data;
  },

  updateLink: async (
    projectId: string,
    linkId: string,
    payload: { title?: string; url?: string; description?: string | null },
  ): Promise<ProjectLink> => {
    const { data } = await api.put<ProjectLink>(`/projects/${projectId}/links/${linkId}`, payload);
    return data;
  },

  deleteLink: async (projectId: string, linkId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/links/${linkId}`);
  },

  reorderLinks: async (projectId: string, orderedIds: string[]): Promise<void> => {
    await api.put(`/projects/${projectId}/links/reorder`, { orderedIds });
  },

  // ─── Contacts ────────────────────────────────────────────────────────────

  setContacts: async (projectId: string, contactIds: string[]): Promise<void> => {
    await api.put(`/projects/${projectId}/contacts`, { contactIds });
  },

  // ─── Team Members ───────────────────────────────────────────────────────

  getMembers: async (projectId: string): Promise<ProjectTeamMember[]> => {
    const { data } = await api.get<ProjectTeamMember[]>(`/projects/${projectId}/members`);
    return data;
  },

  addMember: async (projectId: string, userId: string): Promise<ProjectTeamMember> => {
    const { data } = await api.post<ProjectTeamMember>(`/projects/${projectId}/members`, { userId });
    return data;
  },

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },
};
