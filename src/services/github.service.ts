import api from '@/lib/api-client';
import { GitCommit, GitMetric, ProjectRepo } from '@/types/api';

interface FetchMetricsResponse {
  success: boolean;
  syncedMetrics: number;
  syncedCommits: number;
  repos?: number;
  errors?: Array<{ repo: string; message: string }>;
  lastSync?: string;
}

interface GetMetricsResponse {
  success: boolean;
  metrics: GitMetric[];
}

interface GetCommitsResponse {
  success: boolean;
  commits: GitCommit[];
}

interface ListReposResponse {
  success: boolean;
  repos: ProjectRepo[];
}

export const githubService = {
  // Aggregate sync (all repos for the project)
  fetchMetrics: async (
    projectId: string,
    options?: { owner?: string; repo?: string; branch?: string },
  ): Promise<FetchMetricsResponse> => {
    const { data } = await api.post<FetchMetricsResponse>(
      `/projects/${projectId}/github/fetch`,
      options ?? {},
    );
    return data;
  },

  getMetrics: async (projectId: string): Promise<GetMetricsResponse> => {
    const { data } = await api.get<GetMetricsResponse>(`/projects/${projectId}/github/metrics`);
    return data;
  },

  getCommits: async (
    projectId: string,
    opts?: { branch?: string; repoId?: string },
  ): Promise<GetCommitsResponse> => {
    const params: Record<string, string> = {};
    if (opts?.branch) params.branch = opts.branch;
    if (opts?.repoId) params.repoId = opts.repoId;
    const { data } = await api.get<GetCommitsResponse>(`/projects/${projectId}/github/commits`, {
      params: Object.keys(params).length ? params : undefined,
    });
    return data;
  },

  // Multi-repo CRUD
  listRepos: async (projectId: string): Promise<ProjectRepo[]> => {
    const { data } = await api.get<ListReposResponse>(`/projects/${projectId}/repos`);
    return data.repos || [];
  },

  addRepo: async (
    projectId: string,
    payload: { owner: string; repo: string; label?: string; defaultBranch?: string },
  ): Promise<ProjectRepo> => {
    const { data } = await api.post<ProjectRepo>(`/projects/${projectId}/repos`, payload);
    return data;
  },

  updateRepo: async (
    projectId: string,
    repoId: string,
    payload: { label?: string; defaultBranch?: string; owner?: string; repo?: string },
  ): Promise<ProjectRepo> => {
    const { data } = await api.put<ProjectRepo>(`/projects/${projectId}/repos/${repoId}`, payload);
    return data;
  },

  deleteRepo: async (projectId: string, repoId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/repos/${repoId}`);
  },

  syncRepo: async (
    projectId: string,
    repoId: string,
  ): Promise<{ success: boolean; syncedMetrics: number; syncedCommits: number }> => {
    const { data } = await api.post(`/projects/${projectId}/repos/${repoId}/sync`);
    return data;
  },
};
