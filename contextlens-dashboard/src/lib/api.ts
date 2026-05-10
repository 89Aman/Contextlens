import { auth } from './firebase'
import type { ExplainDiffResult, BranchSummaryResult } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

async function getToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

async function post<T>(path: string, body: object): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)
  return res.json()
}

export async function explainDiff(
  projectId: string,
  episodeId: string,
): Promise<ExplainDiffResult> {
  return post<ExplainDiffResult>('/episodes/explain', { projectId, episodeId })
}

export async function branchSummary(
  projectId: string,
  branch: string,
): Promise<BranchSummaryResult> {
  return post<BranchSummaryResult>('/branches/summarize', { projectId, branch })
}

export interface SearchFilters {
  branchName?: string
  filePath?: string
  dateFrom?: string
  dateTo?: string
}

export interface SearchResult {
  episodes: Array<{
    episodeId: string
    projectId: string
    label: string
    branchName: string
    callCount: number
    startedAt: string
  }>
  calls: Array<{
    callId: string
    episodeId: string
    intentTag: string
    activeFilePath: string
    createdAt: string
  }>
}

export async function search(
  query: string,
  filters: SearchFilters = {},
): Promise<SearchResult> {
  return post<SearchResult>('/search', { query, filters })
}
