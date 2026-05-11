import { auth } from './firebase'
import type { ExplainDiffResult, BranchSummaryResult } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRIES = 2

// ─── User-friendly error messages ─────────────────────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  NETWORK_ERROR: 'Unable to reach the server. Check your internet connection.',
  TIMEOUT: 'The request took too long. Please try again.',
  API_ERROR_429: 'Too many requests. Please wait a moment and try again.',
  API_ERROR_500: 'Something went wrong on our end. Please try again later.',
  API_ERROR_503: 'The service is temporarily unavailable. Please try again later.',
}

function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] ?? `An unexpected error occurred (${code}).`
}

// ─── Auth token ───────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('UNAUTHORIZED')
  return user.getIdToken()
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function post<T>(path: string, body: object, retries = MAX_RETRIES): Promise<T> {
  const token = await getToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (res.status === 401) throw new Error('UNAUTHORIZED')
    if (res.status === 429) throw new Error('API_ERROR_429')

    if (!res.ok) {
      const code = `API_ERROR_${res.status}`
      // Retry on server errors
      if (res.status >= 500 && retries > 0) {
        await delay(1000 * (MAX_RETRIES - retries + 1))
        return post<T>(path, body, retries - 1)
      }
      throw new Error(code)
    }

    return res.json()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(friendlyError('TIMEOUT'))
    }
    if (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.') {
      throw new Error(friendlyError('NETWORK_ERROR'))
    }
    // Re-throw with friendly message for known codes
    if (err.message in ERROR_MESSAGES) {
      throw new Error(friendlyError(err.message))
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── API endpoints ────────────────────────────────────────────────────────────

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
  projectId: string,
  query: string,
  filters: SearchFilters = {},
): Promise<SearchResult> {
  return post<SearchResult>('/search', { projectId, q: query, filters })
}
