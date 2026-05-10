import { Project, Episode, Call, BranchSummary, ExplainDiffResult } from '@/lib/types';

// Base URL for API - in production, this would be your backend URL
// For development, we'll use a relative URL assuming same origin
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for auth
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || `API error: ${response.status}`
    );
  }

  return response.json();
}

// Project APIs
export async function getProjects(): Promise<Project[]> {
  return fetchApi<Project[]>('/api/projects');
}

export async function getProject(projectId: string): Promise<Project> {
  return fetchApi<Project>(`/api/projects/${projectId}`);
}

// Episode APIs
export async function getProjectEpisodes(projectId: string): Promise<Episode[]> {
  return fetchApi<Episode[]>(`/api/projects/${projectId}/episodes`);
}

export async function getEpisode(episodeId: string): Promise<Episode> {
  return fetchApi<Episode>(`/api/episodes/${episodeId}`);
}

export async function getEpisodeCalls(episodeId: string): Promise<Call[]> {
  return fetchApi<Call[]>(`/api/episodes/${episodeId}/calls`);
}

// Explain Diff API
export async function explainEpisodeDiff(episodeId: string): Promise<ExplainDiffResult> {
  return fetchApi<ExplainDiffResult>(`/api/episodes/${episodeId}/explain`, {
    method: 'POST',
  });
}

// Branch Summary API
export async function getBranchSummary(
  projectId: string,
  branchName: string
): Promise<BranchSummary> {
  return fetchApi<BranchSummary>(`/api/branches/${projectId}/${branchName}/summary`);
}

// Search API
export interface SearchParams {
  query?: string;
  branch?: string;
  file?: string;
  startDate?: string;
  endDate?: string;
}

export async function searchEpisodes(params: SearchParams): Promise<Episode[]> {
  return fetchApi<Episode[]>('/api/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}