import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  doc,
  query,
  orderBy,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  limit,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Project, Episode, Call } from '../types'

// Until the backend fully verifies real Firebase ID tokens from the
// VS Code extension, all data is written under this demo UID.
export const DEMO_UID = 'contextlens-demo-user'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDate = (ts: any): Date => ts?.toDate?.() ?? new Date(ts)

// ─── useProjects ─────────────────────────────────────────────────────────────

export function useProjects(uid: string) {
  const [data, setData] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const effectiveUid = uid || DEMO_UID
    setLoading(true)
    let completed = false
    const timeoutId = setTimeout(() => {
      if (!completed) {
        setLoading(false)
      }
    }, 3000)

    const q = query(
      collection(db, `users/${effectiveUid}/projects`),
      orderBy('updatedAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        completed = true
        clearTimeout(timeoutId)
        const projects = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name,
            repoUrl: data.repoUrl ?? '',
            localWorkspaceName: data.localWorkspaceName ?? '',
            defaultBranch: data.defaultBranch ?? 'main',
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            settings: data.settings ?? {
              preferredModel: 'gemini-1.5-pro',
              redactionEnabled: false,
              autoSummariesEnabled: false,
            },
          } as Project
        })
        setData(projects)
        setError(null)
        setLoading(false)
      },
      (err) => {
        completed = true
        clearTimeout(timeoutId)
        setError(err.message)
        setLoading(false)
      },
    )
    return () => {
      unsub()
      completed = true
      clearTimeout(timeoutId)
    }
  }, [uid])

  return { data, loading, error }
}

// ─── useEpisodes ──────────────────────────────────────────────────────────────

export function useEpisodes(uid: string, projectId: string) {
  const [data, setData] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    const effectiveUid = uid || DEMO_UID
    setLoading(true)
    let completed = false
    const timeoutId = setTimeout(() => {
      if (!completed) {
        setLoading(false)
      }
    }, 3000)

    const q = query(
      collection(db, `users/${effectiveUid}/projects/${projectId}/episodes`),
      orderBy('startedAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        completed = true
        clearTimeout(timeoutId)
        const episodes = snap.docs.map((d) => mapEpisode(d))
        setData(episodes)
        setError(null)
        setLoading(false)
      },
      (err) => {
        completed = true
        clearTimeout(timeoutId)
        setError(err.message)
        setLoading(false)
      },
    )
    return () => {
      unsub()
      completed = true
      clearTimeout(timeoutId)
    }
  }, [uid, projectId])

  return { data, loading, error }
}

// ─── useEpisodesByBranch ──────────────────────────────────────────────────────

export function useEpisodesByBranch(uid: string, projectId: string, branchName: string) {
  const [data, setData] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId || !branchName) return
    const effectiveUid = uid || DEMO_UID
    setLoading(true)
    let completed = false
    const timeoutId = setTimeout(() => {
      if (!completed) {
        setLoading(false)
      }
    }, 3000)

    const q = query(
      collection(db, `users/${effectiveUid}/projects/${projectId}/episodes`),
      where('branchName', '==', branchName),
      orderBy('startedAt', 'asc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        completed = true
        clearTimeout(timeoutId)
        const episodes = snap.docs.map((d) => mapEpisode(d))
        setData(episodes)
        setError(null)
        setLoading(false)
      },
      (err) => {
        completed = true
        clearTimeout(timeoutId)
        setError(err.message)
        setLoading(false)
      },
    )
    return () => {
      unsub()
      completed = true
      clearTimeout(timeoutId)
    }
  }, [uid, projectId, branchName])

  return { data, loading, error }
}

// ─── useEpisode ───────────────────────────────────────────────────────────────

export function useEpisode(uid: string, projectId: string, episodeId: string) {
  const [data, setData] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId || !episodeId) return
    const effectiveUid = uid || DEMO_UID
    setLoading(true)
    let completed = false
    const timeoutId = setTimeout(() => {
      if (!completed) {
        setLoading(false)
      }
    }, 3000)

    const ref = doc(db, `users/${effectiveUid}/projects/${projectId}/episodes/${episodeId}`)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        completed = true
        clearTimeout(timeoutId)
        if (snap.exists()) {
          setData(mapEpisode(snap))
        } else {
          setData(null)
        }
        setError(null)
        setLoading(false)
      },
      (err) => {
        completed = true
        clearTimeout(timeoutId)
        setError(err.message)
        setLoading(false)
      },
    )
    return () => {
      unsub()
      completed = true
      clearTimeout(timeoutId)
    }
  }, [uid, projectId, episodeId])

  return { data, loading, error }
}

// ─── useCalls ─────────────────────────────────────────────────────────────────

export function useCalls(
  uid: string,
  projectId: string,
  episodeId: string,
  enabled: boolean,
) {
  const [data, setData] = useState<Call[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !projectId || !episodeId) return
    const effectiveUid = uid || DEMO_UID
    setLoading(true)

    let completed = false
    const timeoutId = setTimeout(() => {
      if (!completed) {
        setLoading(false)
      }
    }, 3000)

    const q = query(
      collection(db, `users/${effectiveUid}/projects/${projectId}/episodes/${episodeId}/calls`),
      orderBy('createdAt', 'asc'),
    )
    getDocs(q)
      .then((snap) => {
        completed = true
        clearTimeout(timeoutId)
        const calls = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            episodeId,
            createdAt: toDate(data.createdAt),
            source: data.source ?? 'extension_chat',
            intentTag: data.intentTag ?? '',
            promptText: data.promptText ?? '',
            modelName: data.modelName ?? '',
            modelResponse: data.modelResponse ?? '',
            branchName: data.branchName ?? '',
            activeFilePath: data.activeFilePath ?? '',
            relatedFiles: data.relatedFiles ?? [],
            diffSnapshot: data.diffSnapshot ?? '',
            diffHash: data.diffHash ?? '',
            todoMatches: data.todoMatches ?? [],
            latencyMs: data.latencyMs ?? 0,
            tokenUsage: data.tokenUsage ?? { input: 0, output: 0 },
            status: data.status ?? 'success',
          } as Call
        })
        setData(calls)
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        completed = true
        clearTimeout(timeoutId)
        setError(err.message)
        setLoading(false)
      })
    
    return () => {
      completed = true
      clearTimeout(timeoutId)
    }
  }, [enabled, uid, projectId, episodeId])

  return { data, loading, error }
}

// ─── useMigrateDemoData ───────────────────────────────────────────────────────

export function useMigrateDemoData() {
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const migrate = useCallback(async (targetUid: string, attempt = 0): Promise<boolean> => {
    const MAX_RETRIES = 2
    if (!targetUid || targetUid === DEMO_UID) return false

    try {
      setMigrating(true)
      setError(null)

      // 1. Check if already migrated
      const userRef = doc(db, 'users', targetUid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists() && userSnap.data()?.migrationComplete) {
        setMigrating(false)
        return false
      }

      console.log(`[ContextLens] Migration attempt ${attempt + 1}/${MAX_RETRIES + 1} from ${DEMO_UID} to ${targetUid}...`)

      // 2. Fetch demo projects
      const projectsSnap = await getDocs(collection(db, `users/${DEMO_UID}/projects`))
      if (projectsSnap.empty) {
        await setDoc(userRef, { migrationComplete: true, migratedAt: serverTimestamp() }, { merge: true })
        setMigrating(false)
        return true
      }

      const batch = writeBatch(db)

      for (const pDoc of projectsSnap.docs) {
        const projectData = pDoc.data()
        const newProjectRef = doc(db, `users/${targetUid}/projects`, pDoc.id)
        batch.set(newProjectRef, {
          ...projectData,
          migratedFromDemo: true,
          updatedAt: serverTimestamp(),
        })

        // 3. Fetch demo episodes for this project
        const episodesSnap = await getDocs(collection(db, `users/${DEMO_UID}/projects/${pDoc.id}/episodes`))
        for (const eDoc of episodesSnap.docs) {
          const episodeData = eDoc.data()
          const newEpisodeRef = doc(db, `users/${targetUid}/projects/${pDoc.id}/episodes`, eDoc.id)
          batch.set(newEpisodeRef, {
            ...episodeData,
            migratedFromDemo: true,
          })

          // 4. Fetch demo calls for this episode (limit to 50 for batch safety if needed, but demo should be small)
          const callsSnap = await getDocs(query(
            collection(db, `users/${DEMO_UID}/projects/${pDoc.id}/episodes/${eDoc.id}/calls`),
            limit(100)
          ))
          for (const cDoc of callsSnap.docs) {
            const callData = cDoc.data()
            const newCallRef = doc(db, `users/${targetUid}/projects/${pDoc.id}/episodes/${eDoc.id}/calls`, cDoc.id)
            batch.set(newCallRef, {
              ...callData,
              migratedFromDemo: true,
            })
          }
        }
      }

      // Mark migration as complete
      batch.set(userRef, { 
        migrationComplete: true, 
        migratedAt: serverTimestamp(),
        displayName: targetUid // Basic placeholder if needed
      }, { merge: true })

      await batch.commit()
      console.log('Migration completed successfully.')
      setMigrating(false)
      return true
    } catch (err: any) {
      console.error(`[ContextLens] Migration attempt ${attempt + 1} failed:`, err)
      if (attempt < MAX_RETRIES) {
        const backoffMs = 1000 * Math.pow(2, attempt)
        console.log(`[ContextLens] Retrying migration in ${backoffMs}ms...`)
        await new Promise(r => setTimeout(r, backoffMs))
        return migrate(targetUid, attempt + 1)
      }
      setError(err.message ?? 'Migration failed after retries')
      setMigrating(false)
      return false
    }
  }, [])

  return { migrate, migrating, error }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEpisode(d: any): Episode {
  const data = d.data()
  return {
    id: d.id,
    projectId: data.projectId ?? '',
    label: data.label ?? 'Untitled Episode',
    branchName: data.branchName ?? 'main',
    status: data.status ?? 'closed',
    startedAt: toDate(data.startedAt),
    endedAt: data.endedAt ? toDate(data.endedAt) : null,
    callCount: data.callCount ?? 0,
    changedFiles: data.changedFiles ?? [],
    latestDiffHash: data.latestDiffHash ?? '',
    manualNotes: data.manualNotes ?? '',
    episodeSummary: data.episodeSummary ?? null,
    explainDiffSummary: data.explainDiffSummary ?? null,
    explainDiffRisks: data.explainDiffRisks ?? [],
    explainDiffChecks: data.explainDiffChecks ?? [],
  }
}
